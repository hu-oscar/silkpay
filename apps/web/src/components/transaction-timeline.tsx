/**
 * Vertical journey of a transaction. Shows the 5 milestone phases of the V1
 * Lagos↔Yiwu corridor — past phases checked, current phase highlighted, future
 * phases muted. Status is derived from `tx.status` only ; no DB call.
 *
 * Server component (read-only).
 */
import { CheckCircle2, Circle, FileText, Loader2, ShieldCheck, Truck, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import type { TxStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type Phase = {
  id: "drafted" | "quoted" | "funded" | "in_transit" | "settled";
  icon: typeof FileText;
  statuses: TxStatus[];
};

const PHASES: readonly Phase[] = [
  { id: "drafted", icon: FileText, statuses: ["drafted", "kyb_pending"] },
  { id: "quoted", icon: Wallet, statuses: ["quoted", "awaiting_funding"] },
  { id: "funded", icon: ShieldCheck, statuses: ["funded"] },
  {
    id: "in_transit",
    icon: Truck,
    statuses: ["in_transit", "inspected", "delivered", "settling"],
  },
  { id: "settled", icon: CheckCircle2, statuses: ["settled"] },
] as const;

const TERMINAL_NEGATIVE: ReadonlyArray<TxStatus> = ["disputed", "refunded", "cancelled"];

function phaseStateForIndex(
  index: number,
  status: TxStatus,
): "done" | "current" | "upcoming" | "halted" {
  if (TERMINAL_NEGATIVE.includes(status)) return "halted";
  // "settled" is the terminal-positive state — every phase is done, no spinner
  // hanging on the last one.
  if (status === "settled") return "done";
  const currentIdx = PHASES.findIndex((p) => p.statuses.includes(status));
  if (currentIdx < 0) return "upcoming";
  if (index < currentIdx) return "done";
  if (index === currentIdx) return "current";
  return "upcoming";
}

export async function TransactionTimeline({ status }: { status: TxStatus }) {
  const t = await getTranslations("timeline");
  const halted = TERMINAL_NEGATIVE.includes(status);

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {t("title")}
      </p>
      <ol className="mt-4 space-y-3">
        {PHASES.map((phase, i) => {
          const state = phaseStateForIndex(i, status);
          const Icon = state === "current" ? Loader2 : state === "done" ? CheckCircle2 : phase.icon;
          const tone =
            state === "done"
              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
              : state === "current"
                ? "text-brand-700 bg-brand-50 border-brand-200"
                : state === "halted"
                  ? "text-rose-700 bg-rose-50 border-rose-200"
                  : "text-ink-400 bg-ink-50 border-ink-200";
          return (
            <li key={phase.id} className="flex items-center gap-3">
              <span
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-full border",
                  tone,
                )}
              >
                <Icon
                  className={cn("h-4 w-4", state === "current" && "animate-spin")}
                  aria-hidden
                />
              </span>
              <div className="flex-1">
                <p
                  className={cn(
                    "text-sm font-medium",
                    state === "upcoming" ? "text-ink-400" : "text-ink-900",
                  )}
                >
                  {t(`phase.${phase.id}`)}
                </p>
                <p className="text-xs text-ink-500">{t(`phaseHint.${phase.id}`)}</p>
              </div>
              {state === "current" && (
                <span className="rounded-full bg-brand-700 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                  {t("current")}
                </span>
              )}
              {state === "done" && (
                <Circle className="h-3 w-3 fill-emerald-500 text-emerald-500" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      {halted && (
        <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
          {t(`halted.${status}`)}
        </p>
      )}
    </div>
  );
}
