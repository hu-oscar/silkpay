/**
 * Deterministic fake source price generator.
 *
 * Each of the 3 NGN→USDT sources (Yellow Card, OTC Desk #1, OTC Desk #2) and
 * the 1 PSP source (USDT→CNY) returns a quote derived from a base spot rate +
 * per-source spread/depth/alpha + small Gaussian-ish noise seeded by the
 * minute-of-the-hour, so prices look fresh but the demo is reproducible
 * within the same minute.
 *
 * Production swap : replace each generator with a real REST/WebSocket call to
 * the partner (Yellow Card REST, OTC Desk WS RFQ, etc.). The output schema
 * stays the same — the SOR service is decoupled.
 */

export type SourceQuote = {
  source_id: string;
  display_name: string;
  price_ngn_per_usdt: number;
  spread_bps: number;
  depth_ngn: number;
  alpha_slippage: number;
  delay_seconds: number;
  fetched_at: string; // ISO
};

export type PspQuote = {
  source_id: "psp";
  display_name: string;
  price_cny_per_usdt: number;
  spread_bps: number;
  off_ramp_fee_bps: number;
  fetched_at: string;
};

// Live-ish reference rates (April 2026 ballpark — re-tune any time).
const NGN_PER_USDT_BASE = 1573.0;
const CNY_PER_USDT_BASE = 7.196;

/**
 * Deterministic pseudo-random in [-1, 1] from (seed, sourceId).
 * Used to add small per-minute noise so the same source returns slightly
 * different quotes each minute (looks live during a demo).
 */
function noise(seedKey: string): number {
  let h = 2166136261; // FNV-1a init
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // Map to [-1, 1]
  const u = ((h >>> 0) / 0xffffffff) * 2 - 1;
  return u;
}

const NGN_USDT_SOURCES: Array<{
  source_id: string;
  display_name: string;
  spread_bps: number;
  depth_ngn: number;
  alpha_slippage: number;
  delay_seconds: number;
  price_offset_bps: number; // their sticker price relative to base
}> = [
  {
    source_id: "yellow_card",
    display_name: "Yellow Card",
    spread_bps: 50,
    depth_ngn: 30_000_000,
    alpha_slippage: 0.02,
    delay_seconds: 30,
    price_offset_bps: -8, // slightly cheaper sticker, lower depth
  },
  {
    source_id: "otc_desk_1",
    display_name: "OTC Desk #1 (OSL)",
    spread_bps: 35,
    depth_ngn: 50_000_000,
    alpha_slippage: 0.015,
    delay_seconds: 45,
    price_offset_bps: 5, // mid sticker, deepest book
  },
  {
    source_id: "otc_desk_2",
    display_name: "OTC Desk #2 (Hashkey)",
    spread_bps: 60,
    depth_ngn: 20_000_000,
    alpha_slippage: 0.025,
    delay_seconds: 60,
    price_offset_bps: -3, // cheap sticker but shallow + slow
  },
];

function bucketKey(): string {
  // Bucket prices per-minute so a refresh within the same minute returns the
  // same numbers (deterministic for demo + cache-friendly).
  return new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

export function generateNgnUsdtQuote(sourceId: string): SourceQuote {
  const def = NGN_USDT_SOURCES.find((s) => s.source_id === sourceId);
  if (!def) throw new Error(`Unknown NGN/USDT source: ${sourceId}`);

  const minuteSeed = bucketKey();
  const n = noise(`${sourceId}-${minuteSeed}`);
  const stickerBps = def.price_offset_bps + n * 12; // ±12 bps wobble

  return {
    source_id: def.source_id,
    display_name: def.display_name,
    price_ngn_per_usdt: NGN_PER_USDT_BASE * (1 + stickerBps / 10_000),
    spread_bps: def.spread_bps,
    depth_ngn: def.depth_ngn,
    alpha_slippage: def.alpha_slippage,
    delay_seconds: def.delay_seconds,
    fetched_at: new Date().toISOString(),
  };
}

export function generatePspUsdtCnyQuote(): PspQuote {
  const minuteSeed = bucketKey();
  const n = noise(`psp-${minuteSeed}`);
  return {
    source_id: "psp",
    display_name: "LianLian PSP",
    price_cny_per_usdt: CNY_PER_USDT_BASE * (1 + (n * 4) / 10_000),
    spread_bps: 25,
    off_ramp_fee_bps: 18,
    fetched_at: new Date().toISOString(),
  };
}

export const NGN_USDT_SOURCE_IDS = NGN_USDT_SOURCES.map((s) => s.source_id);
