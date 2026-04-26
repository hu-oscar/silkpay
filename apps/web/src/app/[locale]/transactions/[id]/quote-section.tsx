"use client";

/**
 * Phase 4 — Quote section on the transaction detail page.
 *
 * The supplier's quote (proforma) fixes the USDT amount the seller wants to
 * receive — there is no user choice to make here. As soon as the page mounts
 * we fire `getQuote` automatically with that amount and stream the agent's
 * actions (Yellow Card, OTC desks, PSP off-ramp, convex SOR solve) so the
 * user sees the system thinking instead of a blind spinner.
 */
import { Loader2, RefreshCw, Zap } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";

import { AgentActionStream } from "@/components/agent-action-stream";
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
  const targetUsdt = defaultTargetUsd ?? DEFAULT_TARGET_USDT;
  const [result, setResult] = useState<GetQuoteResult | null>(initialQuote);
  const [isPending, startTransition] = useTransition();
  const autoFetched = useRef(false);

  function fetchQuote() {
    startTransition(async () => {
      const r = await getQuote({ transactionId, targetUsdt });
      setResult(r);
    });
  }

  // Fire the quote automatically the first time the page is rendered without
  // a cached quote — the user has nothing to type, the proforma already fixed
  // the amount.
  useEffect(() => {
    if (autoFetched.current) return;
    if (initialQuote) return;
    if (targetUsdt < 100) return;
    autoFetched.current = true;
    fetchQuote();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold text-ink-900 inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-brand-700" />
            {t("inputTitle")}
          </h2>
          <span className="text-xs text-ink-500">
            {t("fromProforma", {
              amount: format.number(targetUsdt, {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }),
            })}
          </span>
        </div>

        <p className="text-sm text-ink-500">{t("autoQuoteHint")}</p>

        {result?.ok && (
          <button
            type="button"
            onClick={fetchQuote}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-2 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs font-medium text-ink-700 hover:bg-ink-50",
              isPending && "opacity-60 cursor-not-allowed",
            )}
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t("refresh")}
          </button>
        )}
      </div>

      {isPending && <QuotingStream />}

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

function QuotingStream() {
  const t = useTranslations("quote.stream");
  const steps = [t("yellowCard"), t("otc1"), t("otc2"), t("psp"), t("solve")] as const;
  return (
    <AgentActionStream
      steps={steps}
      pacing={[600, 700, 700, 700, 800]}
      title={t("title")}
      subtitle={t("subtitle")}
    />
  );
}
