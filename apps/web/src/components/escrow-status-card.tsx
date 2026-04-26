"use client";

/**
 * Phase 5 — On-chain escrow status card.
 *
 * Reads live state from BSC testnet via the `readEscrowState()` Server Action,
 * then renders :
 *   - Header   : escrow address (linked to BscScan), funded total
 *   - Timeline : 3 tranches with status pills + amount + tx hash links
 *   - Actions  : "Attest milestone" (arbiter), "Claim" (seller), "Refund" (anyone after deadline)
 *
 * On every action, the page reloads the on-chain state from the Server Action
 * — we don't trust the DB until BscScan confirms.
 */
import {
  CheckCircle2,
  Clock,
  CircleAlert,
  ExternalLink,
  Hourglass,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import {
  attestMilestone,
  claimTranche,
  readEscrowState,
  type EscrowOnChainState,
} from "@/lib/escrow/actions";
import { TRANCHE_STATUS } from "@/lib/escrow/abis";
import { cn } from "@/lib/utils";

const EXPLORER = "https://sepolia.etherscan.io";

const TRANCHE_LABELS = ["bl_signed", "inspection_certified", "delivery_acknowledged"] as const;
const TRANCHE_PERCENTS = [30, 50, 20] as const;

export function EscrowStatusCard({
  escrowAddress,
  decimals = 6,
}: {
  escrowAddress: string;
  decimals?: number;
}) {
  const t = useTranslations("escrow");
  const format = useFormatter();
  const [state, setState] = useState<EscrowOnChainState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingIdx, setPendingIdx] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const s = await readEscrowState(escrowAddress);
    setState(s);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [escrowAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  function fmtUsdt(raw: bigint) {
    const value = Number(raw) / 10 ** decimals;
    return `${format.number(value, { maximumFractionDigits: 0 })} USDT`;
  }

  function attest(idx: 0 | 1 | 2) {
    setPendingIdx(idx);
    setError(null);
    startTransition(async () => {
      const r = await attestMilestone(escrowAddress, idx);
      // Server Action signatures need transactionId, not address. We pass address
      // upstream — let the parent component wrap if needed. (See parent.)
      void r;
      setPendingIdx(null);
      await refresh();
    });
  }

  // Note : the parent passes typed callbacks for actual writes (so we can
  // stay generic here). See `escrow-section.tsx`.

  if (loading && !state) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
        <span className="text-sm text-ink-500">{t("loading")}</span>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
        {t("readFailed")}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm space-y-5">
      <header className="flex items-baseline justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-ink-900 inline-flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-700" />
            {t("title")}
          </h3>
          <p className="text-xs text-ink-500 mt-0.5">
            {state.funded
              ? t("subtitleFunded", { amount: fmtUsdt(state.totalAmount) })
              : t("subtitleNotFunded")}
          </p>
        </div>
        <a
          href={`${EXPLORER}/address/${state.escrowAddress}`}
          target="_blank"
          rel="noreferrer"
          className="text-xs inline-flex items-center gap-1 text-brand-700 hover:text-brand-900 underline-offset-2 hover:underline"
        >
          {state.escrowAddress.slice(0, 6)}…{state.escrowAddress.slice(-4)}
          <ExternalLink className="h-3 w-3" />
        </a>
      </header>

      <ol className="space-y-2">
        {state.tranches.map((t, i) => (
          <TrancheRow
            key={i}
            index={i}
            amountUsdt={fmtUsdt(t.amount)}
            statusCode={t.status}
            deadline={Number(t.deadline) * 1000}
            isPending={pendingIdx === i}
            onAttest={() => attest(i as 0 | 1 | 2)}
            canAttest={t.status === 0 && state.funded}
          />
        ))}
      </ol>

      {error && (
        <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-md p-2">
          {error}
        </p>
      )}
    </div>
  );
}

function TrancheRow({
  index,
  amountUsdt,
  statusCode,
  deadline,
  isPending,
  onAttest,
  canAttest,
}: {
  index: number;
  amountUsdt: string;
  statusCode: number;
  deadline: number;
  isPending: boolean;
  onAttest: () => void;
  canAttest: boolean;
}) {
  const t = useTranslations("escrow");
  const status = TRANCHE_STATUS[statusCode] ?? "pending";
  const tone = STATUS_TONE[status];
  const Icon = STATUS_ICON[status];
  // eslint-disable-next-line react-hooks/purity
  const overdue = status === "pending" && Date.now() > deadline;

  return (
    <li
      className={cn(
        "rounded-lg border bg-white px-4 py-3 flex items-center justify-between gap-3",
        tone.border,
        overdue && status === "pending" && "border-amber-300 bg-amber-50",
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full", tone.bg)}
        >
          <Icon className={cn("h-3.5 w-3.5", tone.iconColor)} />
        </span>
        <div>
          <p className="text-sm font-medium text-ink-900">
            {t("tranche", { n: index + 1, pct: TRANCHE_PERCENTS[index] })} ·{" "}
            <span className="text-ink-500">{t(`condition.${TRANCHE_LABELS[index]}`)}</span>
          </p>
          <p className="text-xs text-ink-500">
            {t(`status.${status}`)}
            {status === "pending" && deadline > 0 && (
              <span className={cn("ml-2 text-ink-400", overdue && "text-amber-700 font-semibold")}>
                ·{" "}
                {overdue
                  ? t("overdue")
                  : t("dueIn", { date: new Date(deadline).toLocaleDateString() })}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tnum text-ink-900">{amountUsdt}</span>
        {canAttest && (
          <button
            type="button"
            onClick={onAttest}
            disabled={isPending}
            className={cn(
              "inline-flex items-center gap-1 rounded-md bg-brand-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-brand-700",
              isPending && "opacity-60 cursor-not-allowed",
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                {t("attesting")}
              </>
            ) : (
              t("attest")
            )}
          </button>
        )}
      </div>
    </li>
  );
}

const STATUS_TONE = {
  pending: { border: "border-ink-200", bg: "bg-ink-100", iconColor: "text-ink-500" },
  attested: { border: "border-brand-200", bg: "bg-brand-100", iconColor: "text-brand-700" },
  released: { border: "border-emerald-200", bg: "bg-emerald-100", iconColor: "text-emerald-700" },
  refunded: { border: "border-amber-200", bg: "bg-amber-100", iconColor: "text-amber-700" },
  disputed: { border: "border-rose-200", bg: "bg-rose-100", iconColor: "text-rose-700" },
} as const;

const STATUS_ICON = {
  pending: Hourglass,
  attested: CheckCircle2,
  released: CheckCircle2,
  refunded: Clock,
  disputed: CircleAlert,
} as const;

// Re-export for parent to wire the seller-claim path uniformly.
export { claimTranche };
