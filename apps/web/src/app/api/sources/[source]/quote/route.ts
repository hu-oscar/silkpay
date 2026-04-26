/**
 * Per-source quote endpoint — `GET /api/sources/{source}/quote`.
 *
 * Sources : `yellow_card` | `otc_desk_1` | `otc_desk_2` | `psp`.
 * The first three return NGN→USDT pricing ; `psp` returns USDT→CNY.
 *
 * Production swap : each handler proxies to a real partner API (Yellow Card
 * REST, OTC Desk WS RFQ, LianLian REST). The Server Action `getQuote()`
 * doesn't care about the implementation — it only sees the typed JSON shape.
 */
import { NextResponse } from "next/server";

import {
  generateNgnUsdtQuote,
  generatePspUsdtCnyQuote,
  NGN_USDT_SOURCE_IDS,
} from "@/lib/quote/sources";

export const dynamic = "force-dynamic"; // never cache — quotes are time-sensitive

export async function GET(_req: Request, ctx: { params: Promise<{ source: string }> }) {
  const { source } = await ctx.params;

  if (source === "psp") {
    return NextResponse.json(generatePspUsdtCnyQuote());
  }

  if (NGN_USDT_SOURCE_IDS.includes(source)) {
    return NextResponse.json(generateNgnUsdtQuote(source));
  }

  return NextResponse.json(
    {
      error: "unknown_source",
      message: `Source '${source}' not configured. Known: ${[...NGN_USDT_SOURCE_IDS, "psp"].join(", ")}`,
    },
    { status: 404 },
  );
}
