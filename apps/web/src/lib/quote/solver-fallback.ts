/**
 * TS greedy fallback for the SOR solver.
 *
 * Used when the Python CVXPY service (`SOR_SERVICE_URL`) is unreachable —
 * typically on Vercel deploys where there's no Python runtime.
 *
 * Heuristic :
 *   1. Allocate as much as possible to the cheapest source up to its cap
 *      (min(depth, max_share × target)).
 *   2. Move to the next cheapest, repeat.
 *   3. Adjust the last source to make sum equal target exactly.
 *
 * NOT optimal in general (the convex solver beats it slightly when slippage
 * dominates spread). But always feasible, deterministic, and < 1 ms.
 *
 * Cost per source : explicit (spread × x) + slippage (alpha × x² / depth).
 */
import "server-only";

import type { SorAllocation, SorOptimizeResponse, SourceQuote } from "./schemas";

const MAX_SHARE = 0.6;

export function solveGreedy(targetNgn: number, sources: SourceQuote[]): SorOptimizeResponse {
  const cap = (s: SourceQuote) => Math.min(s.depth_ngn, MAX_SHARE * targetNgn);

  // Sort by sticker price (cheapest first).
  const sorted = [...sources].sort((a, b) => a.price_ngn_per_usdt - b.price_ngn_per_usdt);

  const allocs = new Map<string, number>(sources.map((s) => [s.source_id, 0]));
  let remaining = targetNgn;
  for (const s of sorted) {
    if (remaining <= 0) break;
    const fill = Math.min(remaining, cap(s));
    allocs.set(s.source_id, fill);
    remaining -= fill;
  }
  // If we couldn't allocate everything (shallow market), force-fill the last
  // source over its cap rather than fail. Honest tradeoff for the demo.
  if (remaining > 0 && sorted.length > 0) {
    const last = sorted[sorted.length - 1];
    allocs.set(last.source_id, (allocs.get(last.source_id) ?? 0) + remaining);
  }

  // Compute total cost + per-source predicted slippage.
  let totalCostNgn = 0;
  const allocation: SorAllocation[] = [];
  for (const s of sources) {
    const x = allocs.get(s.source_id) ?? 0;
    const explicit = (x * s.spread_bps) / 10_000;
    const slippage = (s.alpha_slippage * x * x) / s.depth_ngn;
    totalCostNgn += explicit + slippage;
    allocation.push({
      source_id: s.source_id,
      display_name: s.display_name,
      ngn_amount: x,
      share: targetNgn > 0 ? x / targetNgn : 0,
      predicted_slippage_bps: s.depth_ngn > 0 ? ((s.alpha_slippage * x) / s.depth_ngn) * 10_000 : 0,
      predicted_delay_seconds: s.delay_seconds,
    });
  }

  // Baseline = same algorithm but capped to top-2 — vs the full greedy this
  // is what prod would compare against. For the fallback path, savings is
  // necessarily zero or negative against itself, so we report `0`.
  return {
    allocation,
    total_cost_bps: targetNgn > 0 ? (totalCostNgn / targetNgn) * 10_000 : 0,
    vs_baseline_savings_bps: 0,
    solver_status: "fallback_greedy",
  };
}
