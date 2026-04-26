"use client";

/**
 * Phase 5 wrapper for the escrow flow on the transaction detail page.
 *
 * - If `escrowAddress` is null → render a "Fund the escrow" CTA that calls
 *   `fundEscrow()` Server Action. Shows the create + fund tx hashes once
 *   they land.
 * - Otherwise → render the live `EscrowStatusCard` reading on-chain state.
 */
import { ExternalLink, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

import { AgentActionStream } from "@/components/agent-action-stream";
import { EscrowStatusCard } from "@/components/escrow-status-card";
import { fundEscrow, type FundEscrowResult } from "@/lib/escrow/actions";
import { cn } from "@/lib/utils";

const EXPLORER = "https://sepolia.etherscan.io";

export function EscrowSection({
  transactionId,
  escrowAddress,
  hasQuote,
}: {
  transactionId: string;
  escrowAddress: string | null;
  hasQuote: boolean;
}) {
  const t = useTranslations("escrow");
  const [result, setResult] = useState<FundEscrowResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const liveAddress = result?.ok ? result.escrowAddress : (escrowAddress as `0x${string}` | null);

  function handleFund() {
    startTransition(async () => {
      const r = await fundEscrow(transactionId);
      setResult(r);
    });
  }

  if (!hasQuote) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-200 bg-white p-6 text-center text-sm text-ink-500">
        {t("waitForQuote")}
      </div>
    );
  }

  if (!liveAddress) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-700" />
          <h3 className="text-base font-semibold text-ink-900">{t("fundTitle")}</h3>
        </div>
        <p className="text-sm text-ink-500">{t("fundDescription")}</p>

        <button
          type="button"
          onClick={handleFund}
          disabled={isPending}
          className={cn(
            "w-full inline-flex items-center justify-center gap-2 rounded-md bg-ink-900 px-5 py-3 text-sm font-medium text-white hover:bg-ink-700",
            isPending && "opacity-60 cursor-not-allowed",
          )}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("funding")}
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              {t("fundCta")}
            </>
          )}
        </button>

        {isPending && <DeployStream />}

        {result && !result.ok && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
            <p className="font-semibold">{result.code}</p>
            <p className="text-xs text-rose-900/80 mt-1">{result.message}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {result?.ok && result.fundTxHash && result.fundTxHash !== "0x0" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 space-y-1">
          <p className="font-semibold">✓ {t("fundedSuccess")}</p>
          <a
            href={`${EXPLORER}/tx/${result.fundTxHash}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs underline underline-offset-2"
          >
            {t("viewFundingTx")}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
      <EscrowStatusCard transactionId={transactionId} escrowAddress={liveAddress} />
    </div>
  );
}

function DeployStream() {
  const t = useTranslations("escrow.stream");
  const steps = [
    t("compile"),
    t("deploy"),
    t("mint"),
    t("approve"),
    t("fund"),
    t("persist"),
  ] as const;
  // Real on-chain wait is ~30-50 s on Sepolia (3 sequential txs at ~12 s each).
  return (
    <AgentActionStream
      steps={steps}
      pacing={[1500, 12000, 8000, 8000, 12000, 1500]}
      title={t("title")}
      subtitle={t("subtitle")}
      tone="emerald"
    />
  );
}
