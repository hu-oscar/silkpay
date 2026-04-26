/**
 * Quote engine schemas — shared between the SOR client, Server Action, and UI.
 */
import { z } from "zod";

export const SourceQuoteSchema = z.object({
  source_id: z.string(),
  display_name: z.string(),
  price_ngn_per_usdt: z.number().positive(),
  spread_bps: z.number().nonnegative(),
  depth_ngn: z.number().positive(),
  alpha_slippage: z.number().nonnegative(),
  delay_seconds: z.number().nonnegative(),
  fetched_at: z.string(),
});
export type SourceQuote = z.infer<typeof SourceQuoteSchema>;

export const PspQuoteSchema = z.object({
  source_id: z.literal("psp"),
  display_name: z.string(),
  price_cny_per_usdt: z.number().positive(),
  spread_bps: z.number().nonnegative(),
  off_ramp_fee_bps: z.number().nonnegative(),
  fetched_at: z.string(),
});
export type PspQuote = z.infer<typeof PspQuoteSchema>;

export const SorAllocationSchema = z.object({
  source_id: z.string(),
  display_name: z.string().optional(), // hydrated by orchestrator
  ngn_amount: z.number().nonnegative(),
  share: z.number().min(0).max(1),
  predicted_slippage_bps: z.number().nonnegative(),
  predicted_delay_seconds: z.number().nonnegative(),
});
export type SorAllocation = z.infer<typeof SorAllocationSchema>;

export const SorOptimizeResponseSchema = z.object({
  allocation: z.array(SorAllocationSchema),
  total_cost_bps: z.number(),
  vs_baseline_savings_bps: z.number(),
  solver_status: z.string(),
});
export type SorOptimizeResponse = z.infer<typeof SorOptimizeResponseSchema>;

/** Engine that produced the allocation — surfaced in the UI for transparency. */
export type SolverEngine = "cvxpy" | "greedy_fallback";

export const QuoteBreakdownSchema = z.object({
  ngn_paid: z.number().positive(),
  usdt_received: z.number().positive(),
  cny_delivered: z.number().positive(),
  fx_cost_ngn: z.number().nonnegative(),
  platform_fee_bps: z.number().nonnegative(),
  off_ramp_cost_cny: z.number().nonnegative(),
  network_fees_usd: z.number().nonnegative(),
  total_cost_usd: z.number().nonnegative(),
  swift_estimated_cost_usd: z.number().nonnegative(),
  savings_vs_swift_usd: z.number(),
  eta_seconds: z.number().nonnegative(),
  expires_at: z.string(),
});
export type QuoteBreakdown = z.infer<typeof QuoteBreakdownSchema>;
