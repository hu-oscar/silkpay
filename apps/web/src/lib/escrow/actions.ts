"use server";

/**
 * Phase 5 — Escrow Server Actions.
 *
 * Three flows :
 *   - `fundEscrow(transactionId)`     : (1) factory.create → new TradeEscrow
 *                                       (2) mint mUSDT to buyer if low
 *                                       (3) approve + fund the escrow
 *                                       (4) persist `escrow_address` + status
 *
 *   - `attestMilestone(transactionId, trancheIndex)` : arbiter signs
 *
 *   - `claimTranche(transactionId, trancheIndex)`    : seller pulls
 *
 * All three use ONE shared deployer/arbiter EOA (`DEPLOYER_PRIVATE_KEY`).
 * In V1 prod the buyer + seller would each have their own wallet (Pimlico
 * smart account) ; the hackathon collapses them into the deployer for demo
 * simplicity. The on-chain LOGIC remains the prod pattern (3-tranche pull
 * payment with arbiter attestation), only the signer is centralised.
 */
import { revalidatePath } from "next/cache";
import { decodeEventLog, parseAbiItem, parseUnits, zeroAddress } from "viem";
import type { Address, Hex } from "viem";

import { supabaseServer } from "@/lib/supabase/server";

import { ESCROW_FACTORY_ABI, MOCK_USDT_ABI, TRADE_ESCROW_ABI } from "./abis";
import {
  FACTORY_ADDRESS,
  HAS_ESCROW_CONTRACTS,
  MOCK_USDT_ADDRESS,
  publicClient,
  walletAccount,
  walletClient,
} from "./client";

const USDT_DECIMALS = 6;
const TRANCHE_DEADLINES_DAYS = [30, 45, 60] as const;
const TRANCHE_PERCENTS = [0.3, 0.5, 0.2] as const;

export type FundEscrowResult =
  | {
      ok: true;
      escrowAddress: Address;
      createTxHash: Hex;
      fundTxHash: Hex;
    }
  | {
      ok: false;
      code:
        | "NOT_CONFIGURED"
        | "NOT_FOUND"
        | "WRONG_STATUS"
        | "MISSING_AMOUNT"
        | "ON_CHAIN_FAILED"
        | "DB_ERROR";
      message: string;
    };

/**
 * Deploy a fresh TradeEscrow via the factory and fund it with the quoted
 * amount. Idempotent in the spirit : if the tx already has an `escrow_address`
 * we return it without re-deploying.
 */
export async function fundEscrow(transactionId: string): Promise<FundEscrowResult> {
  if (!HAS_ESCROW_CONTRACTS) {
    return {
      ok: false,
      code: "NOT_CONFIGURED",
      message:
        "Sepolia contracts not deployed. Run `forge script script/Deploy.s.sol` and set NEXT_PUBLIC_MOCK_USDT_ADDRESS / NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS.",
    };
  }

  const supabase = supabaseServer();
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("id, status, amount_usdt, escrow_address, buyer_org_id, seller_org_id")
    .eq("id", transactionId)
    .maybeSingle();
  if (error) return { ok: false, code: "DB_ERROR", message: error.message };
  if (!tx) {
    return { ok: false, code: "NOT_FOUND", message: "Transaction not found" };
  }
  if (!tx.amount_usdt || Number(tx.amount_usdt) <= 0) {
    return {
      ok: false,
      code: "MISSING_AMOUNT",
      message: "Transaction has no quoted USDT amount yet — run the quote engine first.",
    };
  }
  if (!["quoted", "drafted"].includes(String(tx.status))) {
    return {
      ok: false,
      code: "WRONG_STATUS",
      message: `Transaction is in status '${tx.status}' — fund only allowed from 'quoted' or 'drafted'.`,
    };
  }
  if (tx.escrow_address && tx.escrow_address.length === 42) {
    // Already deployed — assume already funded too.
    return {
      ok: true,
      escrowAddress: tx.escrow_address as Address,
      createTxHash: "0x0" as Hex,
      fundTxHash: "0x0" as Hex,
    };
  }

  const totalAmount = parseUnits(String(tx.amount_usdt), USDT_DECIMALS);
  const t0 = (totalAmount * BigInt(Math.round(TRANCHE_PERCENTS[0] * 100))) / 100n;
  const t1 = (totalAmount * BigInt(Math.round(TRANCHE_PERCENTS[1] * 100))) / 100n;
  const t2 = totalAmount - t0 - t1; // absorbs any rounding remainder
  const amounts = [t0, t1, t2] as const;
  const nowSec = BigInt(Math.floor(Date.now() / 1000));
  const deadlines = TRANCHE_DEADLINES_DAYS.map(
    (d) => nowSec + BigInt(d * 24 * 3600),
  ) as unknown as readonly [bigint, bigint, bigint];

  // Buyer = arbiter EOA in hackathon (single signer for everything).
  const account = walletAccount();
  const buyer = account.address;
  const seller = account.address; // collapsed to same EOA for demo

  // Encode tx ID as bytes32 — strip dashes, pad/truncate to 32 bytes.
  const txRefHex = ("0x" + transactionId.replace(/-/g, "").padEnd(64, "0").slice(0, 64)) as Hex;

  try {
    // 1. Factory.create → new escrow address from event.
    const wallet = walletClient();
    const pub = publicClient();

    const createHash = await wallet.writeContract({
      account,
      chain: wallet.chain,
      address: FACTORY_ADDRESS,
      abi: ESCROW_FACTORY_ABI,
      functionName: "create",
      args: [buyer, seller, MOCK_USDT_ADDRESS, amounts, deadlines, txRefHex],
    });
    const createReceipt = await pub.waitForTransactionReceipt({
      hash: createHash,
    });

    let escrowAddress: Address | null = null;
    for (const log of createReceipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: ESCROW_FACTORY_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "EscrowCreated") {
          escrowAddress = decoded.args.escrow as Address;
          break;
        }
      } catch {
        // Skip unrelated logs (no matching topic).
      }
    }
    if (!escrowAddress || escrowAddress === zeroAddress) {
      return {
        ok: false,
        code: "ON_CHAIN_FAILED",
        message: "EscrowCreated event not found in factory tx receipt.",
      };
    }

    // 2. Mint mUSDT to buyer if balance insufficient (test-only path).
    const balance = (await pub.readContract({
      address: MOCK_USDT_ADDRESS,
      abi: MOCK_USDT_ABI,
      functionName: "balanceOf",
      args: [buyer],
    })) as bigint;
    if (balance < totalAmount) {
      const mintHash = await wallet.writeContract({
        account,
        chain: wallet.chain,
        address: MOCK_USDT_ADDRESS,
        abi: MOCK_USDT_ABI,
        functionName: "mint",
        args: [buyer, totalAmount - balance],
      });
      await pub.waitForTransactionReceipt({ hash: mintHash });
    }

    // 3. Approve the escrow to pull totalAmount, then fund().
    const approveHash = await wallet.writeContract({
      account,
      chain: wallet.chain,
      address: MOCK_USDT_ADDRESS,
      abi: MOCK_USDT_ABI,
      functionName: "approve",
      args: [escrowAddress, totalAmount],
    });
    await pub.waitForTransactionReceipt({ hash: approveHash });

    const fundHash = await wallet.writeContract({
      account,
      chain: wallet.chain,
      address: escrowAddress,
      abi: TRADE_ESCROW_ABI,
      functionName: "fund",
      args: [],
    });
    await pub.waitForTransactionReceipt({ hash: fundHash });

    // 4. Persist DB.
    await supabase
      .from("transactions")
      .update({
        status: "funded",
        escrow_address: escrowAddress,
        escrow_chain: "bsc-testnet",
        updated_at: new Date().toISOString(),
      })
      .eq("id", transactionId);

    await supabase.from("audit_events").insert({
      id: crypto.randomUUID(),
      transaction_id: transactionId,
      actor_id: null,
      actor_type: "buyer",
      event_type: "escrow_funded",
      payload: {
        escrow_address: escrowAddress,
        amount_usdt: String(tx.amount_usdt),
      },
      on_chain_tx_hash: fundHash,
      created_at: new Date().toISOString(),
    });

    revalidatePath("/", "layout");

    return {
      ok: true,
      escrowAddress,
      createTxHash: createHash,
      fundTxHash: fundHash,
    };
  } catch (err) {
    return {
      ok: false,
      code: "ON_CHAIN_FAILED",
      message: err instanceof Error ? err.message : "Unknown on-chain error",
    };
  }
}

// ---------------------------- Attest milestone ---------------------------- //

export type AttestResult =
  | { ok: true; txHash: Hex }
  | { ok: false; code: "NOT_FOUND" | "ON_CHAIN_FAILED" | "DB_ERROR"; message: string };

export async function attestMilestone(
  transactionId: string,
  trancheIndex: 0 | 1 | 2,
): Promise<AttestResult> {
  const supabase = supabaseServer();
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("id, escrow_address")
    .eq("id", transactionId)
    .maybeSingle();
  if (error) return { ok: false, code: "DB_ERROR", message: error.message };
  if (!tx?.escrow_address) {
    return { ok: false, code: "NOT_FOUND", message: "Escrow not deployed" };
  }

  try {
    const wallet = walletClient();
    const account = walletAccount();
    const hash = await wallet.writeContract({
      account,
      chain: wallet.chain,
      address: tx.escrow_address as Address,
      abi: TRADE_ESCROW_ABI,
      functionName: "attestMilestone",
      args: [trancheIndex],
    });
    await publicClient().waitForTransactionReceipt({ hash });

    await supabase.from("audit_events").insert({
      id: crypto.randomUUID(),
      transaction_id: transactionId,
      actor_id: null,
      actor_type: "arbiter",
      event_type: "milestone_attested",
      payload: { tranche_index: trancheIndex },
      on_chain_tx_hash: hash,
      created_at: new Date().toISOString(),
    });

    revalidatePath("/", "layout");
    return { ok: true, txHash: hash };
  } catch (err) {
    return {
      ok: false,
      code: "ON_CHAIN_FAILED",
      message: err instanceof Error ? err.message : "attest failed",
    };
  }
}

// ---------------------------- Claim tranche ------------------------------- //

export type ClaimResult =
  | { ok: true; txHash: Hex; amountUsdt: string }
  | { ok: false; code: "NOT_FOUND" | "ON_CHAIN_FAILED" | "DB_ERROR"; message: string };

export async function claimTranche(
  transactionId: string,
  trancheIndex: 0 | 1 | 2,
): Promise<ClaimResult> {
  const supabase = supabaseServer();
  const { data: tx, error } = await supabase
    .from("transactions")
    .select("id, escrow_address")
    .eq("id", transactionId)
    .maybeSingle();
  if (error) return { ok: false, code: "DB_ERROR", message: error.message };
  if (!tx?.escrow_address) {
    return { ok: false, code: "NOT_FOUND", message: "Escrow not deployed" };
  }

  try {
    const wallet = walletClient();
    const account = walletAccount();
    const hash = await wallet.writeContract({
      account,
      chain: wallet.chain,
      address: tx.escrow_address as Address,
      abi: TRADE_ESCROW_ABI,
      functionName: "claim",
      args: [trancheIndex],
    });
    const receipt = await publicClient().waitForTransactionReceipt({ hash });

    // Pull the released amount from the Claimed event.
    let amountUsdt = "0";
    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: TRADE_ESCROW_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === "Claimed") {
          amountUsdt = String(decoded.args.amount);
          break;
        }
      } catch {
        /* skip */
      }
    }

    await supabase.from("audit_events").insert({
      id: crypto.randomUUID(),
      transaction_id: transactionId,
      actor_id: null,
      actor_type: "seller",
      event_type: "tranche_claimed",
      payload: { tranche_index: trancheIndex, amount_raw: amountUsdt },
      on_chain_tx_hash: hash,
      created_at: new Date().toISOString(),
    });

    revalidatePath("/", "layout");
    return { ok: true, txHash: hash, amountUsdt };
  } catch (err) {
    return {
      ok: false,
      code: "ON_CHAIN_FAILED",
      message: err instanceof Error ? err.message : "claim failed",
    };
  }
}

// ---------------------------- Read on-chain state ------------------------ //

export type EscrowOnChainState = {
  escrowAddress: Address;
  buyer: Address;
  seller: Address;
  arbiter: Address;
  totalAmount: bigint;
  funded: boolean;
  tranches: ReadonlyArray<{
    amount: bigint;
    deadline: bigint;
    status: number; // 0..4 = TrancheStatus
  }>;
};

/**
 * Read live state from the escrow on BSC testnet. Used by the detail page
 * to render the timeline + tranche statuses without trusting the DB.
 */
export async function readEscrowState(escrowAddress: string): Promise<EscrowOnChainState | null> {
  if (!escrowAddress || escrowAddress.length !== 42) return null;
  const pub = publicClient();
  const addr = escrowAddress as Address;
  try {
    const [buyer, seller, arbiter, totalAmount, funded, tranches] = await Promise.all([
      pub.readContract({ address: addr, abi: TRADE_ESCROW_ABI, functionName: "buyer" }),
      pub.readContract({ address: addr, abi: TRADE_ESCROW_ABI, functionName: "seller" }),
      pub.readContract({ address: addr, abi: TRADE_ESCROW_ABI, functionName: "arbiter" }),
      pub.readContract({ address: addr, abi: TRADE_ESCROW_ABI, functionName: "totalAmount" }),
      pub.readContract({ address: addr, abi: TRADE_ESCROW_ABI, functionName: "funded" }),
      pub.readContract({
        address: addr,
        abi: TRADE_ESCROW_ABI,
        functionName: "getTranches",
      }),
    ]);
    return {
      escrowAddress: addr,
      buyer: buyer as Address,
      seller: seller as Address,
      arbiter: arbiter as Address,
      totalAmount: totalAmount as bigint,
      funded: funded as boolean,
      tranches: (
        tranches as ReadonlyArray<{
          amount: bigint;
          deadline: bigint;
          status: number;
        }>
      ).map((t) => ({
        amount: t.amount,
        deadline: t.deadline,
        status: t.status,
      })),
    };
  } catch {
    return null;
  }
}

// Silence unused warning on `parseAbiItem` import — keep it available for
// future log-fetching use cases (e.g. EscrowCreated lookup by txRef).
void parseAbiItem;
