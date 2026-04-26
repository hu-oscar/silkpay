"use client";

/**
 * Phase 4 — Quote section on the transaction detail page.
 *
 * The supplier's proforma states what THEY want (e.g. $30 000 USDT). The
 * importer's question is "what NGN do I need to fund so the escrow holds
 * exactly that USDT?". So the input is `targetUsdt` (defaulted to the
 * proforma total), and the engine works backwards to compute NGN.
 */
import { ArrowRight, Loader2, RefreshCw, Sparkles, Zap } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { QuoteBreakdownCard } from "@/components/quote-breakdown-card";
import { SorAllocationChart } from "@/components/sor-allocation-chart";
import { getQuote, type GetQuoteResult } from "@/lib/quote/actions";
import { cn } from "@/lib/utils";

const DEFAULT_TARGET_USDT = 30_000;

export function QuoteSection({
  transactionId,
  defaultTargetUsd,
  initialQuote,
}: {
  transactionId: string;
  /** Pulled from `parsed_documents.proforma.total_amount` if present. */
  defaultTargetUsd: number | null;
  /** Hydrated from `transactions.quote_breakdown` if the tx already has a quote. */
  initialQuote: GetQuoteResult | null;
}) {
  const t = useTranslations("quote");
  const format = useFormatter();
  const [targetUsdt, setTargetUsdt] = useState<number>(defaultTargetUsd ?? DEFAULT_TARGET_USDT);
  const [result, setResult] = useState<GetQuoteResult | null>(initialQuote);
  const [isPending, startTransition] = useTransition();

  function fetchQuote() {
    startTransition(async () => {
      const r = await getQuote({ transactionId, targetUsdt });
      setResult(r);
    });
  }

  return (
    <div className="space-y-5">
      {/* Amount input */}
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-900 inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-700" />
            {t("inputTitle")}
          </h2>
          {defaultTargetUsd != null && (
            <span className="text-xs text-ink-500">
              {t("fromProforma", {
                amount: format.number(defaultTargetUsd, {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }),
              })}
            </span>
          )}
        </div>

        <label className="block">
          <span className="text-xs font-medium text-ink-500">{t("amountLabel")}</span>
          <div className="mt-1 relative">
            <input
              type="number"
              inputMode="numeric"
              min={100}
              max={300_000}
              step={500}
              value={targetUsdt}
              onChange={(e) => setTargetUsdt(Number(e.target.value) || 0)}
              disabled={isPending}
              className={cn(
                "w-full rounded-md border border-ink-200 bg-ink-50 px-3 py-3 pr-16 text-xl font-semibold tnum",
                "focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100",
                isPending && "opacity-60",
              )}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-ink-500">
              USD
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-500">{t("amountHint")}</p>
        </label>

        <button
          type="button"
          onClick={fetchQuote}
          disabled={isPending || targetUsdt < 100}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-md bg-ink-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-ink-700",
            (isPending || targetUsdt < 100) && "opacity-60 cursor-not-allowed",
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("fetching")}
            </>
          ) : result?.ok ? (
            <>
              <RefreshCw className="h-4 w-4" />
              {t("refresh")}
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              {t("getQuote")}
            </>
          )}
        </button>
      </div>

      {/* Live progress banner */}
      {isPending && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-brand-700" />
          <div>
            <p className="text-sm font-semibold text-brand-900">{t("orchestrating")}</p>
            <p className="text-xs text-brand-700/80">{t("orchestratingHint")}</p>
          </div>
        </div>
      )}

      {/* Result */}
      {result?.ok && (
        <div className="space-y-4">
          <QuoteBreakdownCard
            breakdown={result.breakdown}
            engine={result.engine}
            latencyMs={result.latency_ms}
          />
          <SorAllocationChart
            allocation={result.sor.allocation}
            totalCostBps={result.sor.total_cost_bps}
            vsBaselineSavingsBps={result.sor.vs_baseline_savings_bps}
            engine={result.engine}
          />
          <p className="text-xs text-ink-500 text-center">{t("escrowSectionHint")}</p>
        </div>
      )}

      {result && !result.ok && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-1">
          <p className="text-sm font-semibold text-rose-900">{result.code}</p>
          <p className="text-sm text-rose-900/80">{result.message}</p>
        </div>
      )}
    </div>
  );
}
