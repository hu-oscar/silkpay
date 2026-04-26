/**
 * viem clients for BSC testnet.
 *
 * - `publicClient` : reads (no key needed). Used everywhere on the server
 *   for `readContract`, `getLogs`, `waitForTransactionReceipt`.
 * - `walletClient` : writes (key needed). The hackathon uses ONE deployer/
 *   arbiter key for all on-chain actions (buyer fund, arbiter attest, seller
 *   claim) — production would split into per-role wallets and gate via Safe
 *   multi-sig. The key must be set in env (`DEPLOYER_PRIVATE_KEY`).
 */
import "server-only";

import { createPublicClient, createWalletClient, http } from "viem";
import type { Address, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

import { env } from "@/lib/env";

let _publicClient: ReturnType<typeof createPublicClient> | null = null;
let _walletClient: ReturnType<typeof createWalletClient> | null = null;
let _account: ReturnType<typeof privateKeyToAccount> | null = null;

export function publicClient() {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain: sepolia,
      transport: http(env.SEPOLIA_RPC),
    });
  }
  return _publicClient;
}

export function walletAccount() {
  if (!_account) {
    const pk = process.env.DEPLOYER_PRIVATE_KEY as Hex | undefined;
    if (!pk) {
      throw new Error(
        "DEPLOYER_PRIVATE_KEY missing — set it in apps/web/.env.local (and Vercel env vars) before triggering on-chain actions.",
      );
    }
    _account = privateKeyToAccount(pk);
  }
  return _account;
}

export function walletClient() {
  if (!_walletClient) {
    _walletClient = createWalletClient({
      chain: sepolia,
      transport: http(env.SEPOLIA_RPC),
      account: walletAccount(),
    });
  }
  return _walletClient;
}

export const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS ?? "") as Address;
export const MOCK_USDT_ADDRESS = (process.env.NEXT_PUBLIC_MOCK_USDT_ADDRESS ?? "") as Address;

export const HAS_ESCROW_CONTRACTS =
  FACTORY_ADDRESS.length === 42 && MOCK_USDT_ADDRESS.length === 42;

/** Sepolia Etherscan URL helper. */
export function explorerUrl(kind: "tx" | "address", value: string): string {
  return `https://sepolia.etherscan.io/${kind}/${value}`;
}
