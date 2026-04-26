"use client";

/**
 * Wise-style cross-currency breakdown.
 *
 * 3 currencies on the same line (NGN paid → USDT held → CNY received) with
 * fees decomposed below + the headline savings vs SWIFT.
 *
 * Tabular numbers everywhere — this is the brand rule.
 */
import { ArrowRight, ChevronDown, Sparkles, Timer } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import type { QuoteBreakdown, SolverEngine } from "@/lib/quote/schemas";
import { cn } from "@/lib/utils";

export function QuoteBreakdownCard({
  breakdown,
  engine,
  latencyMs,
}: {
  breakdown: QuoteBreakdown;
  engine: SolverEngine;
  latencyMs: number;
}) {
  const t = useTranslations("quote.breakdown");
  const format = useFormatter();
  const [showDetails, setShowDetails] = useState(false);

  const fmt = (n: number, currency: string, max = 0) =>
    format.number(n, {
      style: "currency",
      currency,
      maximumFractionDigits: max,
    });

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm space-y-5">
      {/* Headline trio — NGN → USDT → CNY */}
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr_auto_1fr] gap-3 sm:gap-2 items-center">
        <Currency label={t("youPay")} amount={fmt(breakdown.ngn_paid, "NGN", 0)} tone="ink" />
        <ArrowRight className="hidden sm:block h-4 w-4 text-ink-300 mx-auto" />
        <Currency
          label={t("usdtHeld")}
          amount={`${format.number(breakdown.usdt_received, { maximumFractionDigits: 2 })} USDT`}
          tone="brand"
        />
        <ArrowRight className="hidden sm:block h-4 w-4 text-ink-300 mx-auto" />
        <Currency
          label={t("supplierGets")}
          amount={fmt(breakdown.cny_delivered, "CNY", 0)}
          tone="emerald"
        />
      </div>

      {/* Savings hero */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-emerald-700 font-semibold">
            {t("savings")}
          </p>
          <p className="text-xs text-emerald-800/80 mt-0.5">
            {t("vsSwift", {
              swiftCost: format.number(breakdown.swift_estimated_cost_usd, {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }),
            })}
          </p>
        </div>
        <p className="text-3xl font-bold tnum text-emerald-700">
          {format.number(breakdown.savings_vs_swift_usd, {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
          })}
        </p>
      </div>

      {/* Total + ETA */}
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-ink-500">{t("totalCost")}</span>
        <span className="font-semibold tnum text-ink-900">
          {fmt(breakdown.total_cost_usd, "USD", 2)}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs text-ink-500">
        <span className="inline-flex items-center gap-1">
          <Timer className="h-3.5 w-3.5" />
          {t("eta", { seconds: Math.round(breakdown.eta_seconds) })}
        </span>
        <span className="inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          {engine === "xgboost+cvxpy"
            ? t("engineXgbCvxpy")
            : engine === "cvxpy"
              ? t("engineCvxpy")
              : t("engineGreedy")}{" "}
          · {(latencyMs / 1000).toFixed(1)}s
        </span>
      </div>

      {/* Collapsible cost breakdown */}
      <button
        type="button"
        onClick={() => setShowDetails((s) => !s)}
        className="w-full flex items-center justify-between gap-2 pt-2 border-t border-ink-100 text-xs text-ink-500 hover:text-ink-700"
      >
        <span>{t("breakdownToggle")}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", showDetails && "rotate-180")} />
      </button>
      {showDetails && (
        <ul className="space-y-1.5 text-xs pt-1">
          <Line label={t("fxCost")} value={fmt(breakdown.fx_cost_ngn, "NGN", 0)} />
          <Line
            label={t("platformFee", { bps: breakdown.platform_fee_bps })}
            value={fmt((breakdown.platform_fee_bps / 10_000) * breakdown.ngn_paid, "NGN", 0)}
          />
          <Line label={t("offRamp")} value={fmt(breakdown.off_ramp_cost_cny, "CNY", 0)} />
          <Line label={t("networkFees")} value={fmt(breakdown.network_fees_usd, "USD", 2)} />
        </ul>
      )}
    </div>
  );
}

function Currency({
  label,
  amount,
  tone,
}: {
  label: string;
  amount: string;
  tone: "ink" | "brand" | "emerald";
}) {
  const toneCls =
    tone === "brand" ? "text-brand-700" : tone === "emerald" ? "text-emerald-700" : "text-ink-900";
  return (
    <div className="text-center sm:text-left">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className={cn("text-lg sm:text-xl font-bold tnum mt-1", toneCls)}>{amount}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-ink-500">{label}</span>
      <span className="text-ink-900 font-medium tnum">{value}</span>
    </li>
  );
}
