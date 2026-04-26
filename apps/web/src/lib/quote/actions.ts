"use server";

/**
 * Phase 4 — Quote engine Server Action.
 *
 * Orchestrates :
 *   1. Parallel fetch of 3 NGN→USDT sources + 1 USDT→CNY PSP via the Next.js
 *      route handlers under `/api/sources/[source]/quote`.
 *   2. Convex SOR solve. Tries the Python CVXPY service at `SOR_SERVICE_URL`
 *      first ; falls back to a TS greedy heuristic if unreachable. The path
 *      that ran is surfaced to the UI as `engine` so the demo can show
 *      "CVXPY" in green vs "Greedy fallback" in amber.
 *   3. Compose the final breakdown (NGN paid → USDT received → CNY delivered)
 *      with platform fee + off-ramp + network gas + SWIFT comparison.
 *   4. Persist `transactions.amount_*` + `quote_breakdown` + `sor_allocation`
 *      and one `sor_executions` row per source for the V1 retraining log.
 *
 * The Server Action returns a discriminated-union result so the client can
 * render typed errors (`SOR_TIMEOUT`, `INSUFFICIENT_LIQUIDITY`, etc.).
 */
import { revalidatePath } from "next/cache";

import { env } from "@/lib/env";
import { supabaseServer } from "@/lib/supabase/server";

import {
  PspQuoteSchema,
  QuoteBreakdownSchema,
  SorOptimizeResponseSchema,
  SourceQuoteSchema,
  type PspQuote,
  type QuoteBreakdown,
  type SolverEngine,
  type SorOptimizeResponse,
  type SourceQuote,
} from "./schemas";
import { solveGreedy } from "./solver-fallback";

const NGN_USDT_SOURCES = ["yellow_card", "otc_desk_1", "otc_desk_2"] as const;
const PLATFORM_FEE_BPS = 50;
const NETWORK_FEES_USD = 2;
const SWIFT_FRICTION = 0.075; // 7.5 % — see Tech Design § Quote engine
const QUOTE_VALIDITY_SECONDS = 60;

export type GetQuoteResult =
  | {
      ok: true;
      transactionId: string;
      breakdown: QuoteBreakdown;
      sor: SorOptimizeResponse;
      engine: SolverEngine;
      latency_ms: number;
    }
  | {
      ok: false;
      code: "VALIDATION" | "INSUFFICIENT_LIQUIDITY" | "SOR_FAILED" | "DB_ERROR" | "NOT_FOUND";
      message: string;
    };

export async function getQuote(input: {
  transactionId: string;
  amountNgn: number;
}): Promise<GetQuoteResult> {
  const startedAt = Date.now();

  if (input.amountNgn < 100_000) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Minimum quote amount is 100 000 NGN.",
    };
  }
  if (input.amountNgn > 500_000_000) {
    return {
      ok: false,
      code: "VALIDATION",
      message: "Maximum quote amount is 500 000 000 NGN (above demo cap).",
    };
  }

  const supabase = supabaseServer();

  // Fetch the transaction first — guards against quoting a stranger's tx.
  const { data: txRow, error: txErr } = await supabase
    .from("transactions")
    .select("id")
    .eq("id", input.transactionId)
    .maybeSingle();
  if (txErr) return { ok: false, code: "DB_ERROR", message: txErr.message };
  if (!txRow) {
    return { ok: false, code: "NOT_FOUND", message: "Transaction not found" };
  }

  // 1. Parallel source fetch via Next.js route handlers (in-process — fast).
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const fetchSource = async (id: string) => {
    const res = await fetch(`${baseUrl}/api/sources/${id}/quote`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Source ${id} returned ${res.status}`);
    return res.json();
  };

  let sources: SourceQuote[];
  let psp: PspQuote;
  try {
    const settled = await Promise.allSettled([
      ...NGN_USDT_SOURCES.map((id) => fetchSource(id)),
      fetchSource("psp"),
    ]);
    const ngnUsdt = settled.slice(0, 3);
    const pspRes = settled[3];

    sources = ngnUsdt
      .filter((s): s is PromiseFulfilledResult<unknown> => s.status === "fulfilled")
      .map((s) => SourceQuoteSchema.parse(s.value));
    if (sources.length < 2) {
      return {
        ok: false,
        code: "INSUFFICIENT_LIQUIDITY",
        message: `Only ${sources.length} of 3 NGN→USDT sources responded. Try again in a moment.`,
      };
    }
    if (pspRes.status !== "fulfilled") {
      return {
        ok: false,
        code: "INSUFFICIENT_LIQUIDITY",
        message: "USDT→CNY PSP unreachable — cannot complete the leg.",
      };
    }
    psp = PspQuoteSchema.parse(pspRes.value);
  } catch (err) {
    return {
      ok: false,
      code: "SOR_FAILED",
      message: err instanceof Error ? err.message : "source fetch failed",
    };
  }

  // 2. Solve. Python CVXPY first, TS greedy fallback.
  const { sor, engine } = await runSolver(input.amountNgn, sources);

  // 3. Compose breakdown.
  // Total cost in NGN = explicit FX cost from the solver (already in sor.total_cost_bps)
  //                    + platform fee (50 bps on amount).
  // Then convert to USDT using the volume-weighted price across allocations.
  const fxCostNgn = (sor.total_cost_bps / 10_000) * input.amountNgn;
  const platformFeeNgn = (PLATFORM_FEE_BPS / 10_000) * input.amountNgn;
  const ngnAfterFees = input.amountNgn - fxCostNgn - platformFeeNgn;

  // Volume-weighted USDT received using each source's sticker price.
  const sourceById = new Map(sources.map((s) => [s.source_id, s]));
  let usdtReceivedRaw = 0;
  for (const a of sor.allocation) {
    const src = sourceById.get(a.source_id);
    if (!src) continue;
    usdtReceivedRaw += a.ngn_amount / src.price_ngn_per_usdt;
  }
  // Apply the cost penalty (effectively the spread+slippage already counted).
  // We use ngnAfterFees / vw_avg_price to keep the breakdown internally consistent.
  const vwAvgPrice = input.amountNgn / Math.max(usdtReceivedRaw, 1);
  const usdtReceived = ngnAfterFees / vwAvgPrice;

  // Off-ramp leg
  const offRampCostCny =
    ((psp.spread_bps + psp.off_ramp_fee_bps) / 10_000) * usdtReceived * psp.price_cny_per_usdt;
  const cnyDelivered = usdtReceived * psp.price_cny_per_usdt - offRampCostCny;

  const totalCostUsd =
    (fxCostNgn + platformFeeNgn) / vwAvgPrice +
    offRampCostCny / psp.price_cny_per_usdt +
    NETWORK_FEES_USD;
  const swiftCostUsd = (input.amountNgn / vwAvgPrice) * SWIFT_FRICTION;

  const etaSeconds = Math.max(...sor.allocation.map((a) => a.predicted_delay_seconds));

  const breakdown = QuoteBreakdownSchema.parse({
    ngn_paid: input.amountNgn,
    usdt_received: usdtReceived,
    cny_delivered: cnyDelivered,
    fx_cost_ngn: fxCostNgn,
    platform_fee_bps: PLATFORM_FEE_BPS,
    off_ramp_cost_cny: offRampCostCny,
    network_fees_usd: NETWORK_FEES_USD,
    total_cost_usd: totalCostUsd,
    swift_estimated_cost_usd: swiftCostUsd,
    savings_vs_swift_usd: swiftCostUsd - totalCostUsd,
    eta_seconds: etaSeconds,
    expires_at: new Date(Date.now() + QUOTE_VALIDITY_SECONDS * 1000).toISOString(),
  });

  // 4. Persist.
  const { error: updateErr } = await supabase
    .from("transactions")
    .update({
      status: "quoted",
      amount_ngn: input.amountNgn,
      amount_usdt: usdtReceived,
      amount_cny: cnyDelivered,
      quote_breakdown: breakdown,
      sor_allocation: { allocations: sor.allocation, engine },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.transactionId);
  if (updateErr) {
    return { ok: false, code: "DB_ERROR", message: updateErr.message };
  }

  // SOR execution log (one row per source — feeds the future ML retraining).
  const sorRows = sor.allocation.map((a) => ({
    id: crypto.randomUUID(),
    transaction_id: input.transactionId,
    source_id: a.source_id,
    allocated_ngn: a.ngn_amount,
    predicted_slippage_bps: a.predicted_slippage_bps,
    realized_slippage_bps: null,
    predicted_delay_seconds: a.predicted_delay_seconds,
    realized_delay_seconds: null,
    features_at_decision: { engine, vw_avg_price: vwAvgPrice },
    fallback_to_rulebased: engine === "greedy_fallback",
    created_at: new Date().toISOString(),
  }));
  await supabase.from("sor_executions").insert(sorRows);

  revalidatePath("/", "layout");

  return {
    ok: true,
    transactionId: input.transactionId,
    breakdown,
    sor,
    engine,
    latency_ms: Date.now() - startedAt,
  };
}

async function runSolver(
  targetNgn: number,
  sources: SourceQuote[],
): Promise<{ sor: SorOptimizeResponse; engine: SolverEngine }> {
  const url = env.SOR_SERVICE_URL;
  // Try CVXPY first with a 2 s timeout (we don't want to block the user
  // when the Python service is down or asleep).
  if (url) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 2_000);
      const res = await fetch(`${url}/optimize`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          target_ngn: targetNgn,
          sources: sources.map((s) => ({
            source_id: s.source_id,
            price_ngn_per_usdt: s.price_ngn_per_usdt,
            spread_bps: s.spread_bps,
            depth_ngn: s.depth_ngn,
            alpha_slippage: s.alpha_slippage,
            delay_seconds: s.delay_seconds,
          })),
        }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      clearTimeout(timer);
      if (res.ok) {
        const json = await res.json();
        const parsed = SorOptimizeResponseSchema.parse({
          ...json,
          allocation: json.allocation.map((a: { source_id: string; [k: string]: unknown }) => ({
            ...a,
            display_name: sources.find((s) => s.source_id === a.source_id)?.display_name,
          })),
        });
        return { sor: parsed, engine: "cvxpy" };
      }
    } catch {
      // Swallow and fall back below.
    }
  }
  return { sor: solveGreedy(targetNgn, sources), engine: "greedy_fallback" };
}
