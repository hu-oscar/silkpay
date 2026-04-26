/**
 * Chronological audit feed for a transaction. Pulls `audit_events` from DB and
 * renders a vertical event log with i18n labels and Etherscan tx links when
 * `on_chain_tx_hash` is present.
 *
 * Server component (read-only).
 */
import { ExternalLink, FileSearch, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { getFormatter, getTranslations } from "next-intl/server";

import type { AuditEvent } from "@/lib/db/schema";
import { listAuditEventsForTransaction } from "@/lib/db/queries";
import { cn } from "@/lib/utils";

const SEPOLIA_EXPLORER = "https://sepolia.etherscan.io";

const KNOWN_EVENT_TYPES = [
  "proforma_parsed",
  "quote_calculated",
  "escrow_funded",
  "milestone_attested",
  "tranche_claimed",
] as const;

type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number];

function isKnown(type: string): type is KnownEventType {
  return (KNOWN_EVENT_TYPES as readonly string[]).includes(type);
}

const EVENT_ICON: Record<KnownEventType, typeof Sparkles> = {
  proforma_parsed: FileSearch,
  quote_calculated: Sparkles,
  escrow_funded: ShieldCheck,
  milestone_attested: ShieldCheck,
  tranche_claimed: Wallet,
};

const EVENT_TONE: Record<KnownEventType, string> = {
  proforma_parsed: "text-violet-700 bg-violet-50 border-violet-200",
  quote_calculated: "text-indigo-700 bg-indigo-50 border-indigo-200",
  escrow_funded: "text-emerald-700 bg-emerald-50 border-emerald-200",
  milestone_attested: "text-brand-700 bg-brand-50 border-brand-200",
  tranche_claimed: "text-emerald-700 bg-emerald-50 border-emerald-200",
};

export async function AuditLog({ transactionId }: { transactionId: string }) {
  const t = await getTranslations("auditLog");
  const format = await getFormatter();
  const events = await listAuditEventsForTransaction(transactionId);

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
        {t("title")}
      </p>
      {events.length === 0 ? (
        <p className="mt-3 text-sm text-ink-500">{t("empty")}</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {events.map((ev) => (
            <EventRow key={ev.id} event={ev} t={t} formatDate={format.dateTime} />
          ))}
        </ol>
      )}
    </div>
  );
}

type Formatter = Awaited<ReturnType<typeof getFormatter>>;
type Translator = Awaited<ReturnType<typeof getTranslations<"auditLog">>>;

function EventRow({
  event,
  t,
  formatDate,
}: {
  event: AuditEvent;
  t: Translator;
  formatDate: Formatter["dateTime"];
}) {
  const known = isKnown(event.event_type);
  const Icon = known ? EVENT_ICON[event.event_type as KnownEventType] : FileSearch;
  const tone = known
    ? EVENT_TONE[event.event_type as KnownEventType]
    : "text-ink-700 bg-ink-50 border-ink-200";
  const label = known ? t(`event.${event.event_type as KnownEventType}`) : event.event_type;

  return (
    <li className="flex items-start gap-3">
      <span
        className={cn("inline-flex h-7 w-7 items-center justify-center rounded-full border", tone)}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-900">{label}</p>
        <p className="text-xs text-ink-500">
          {formatDate(new Date(event.created_at), {
            dateStyle: "medium",
            timeStyle: "short",
          })}
          {" · "}
          <span className="capitalize">{event.actor_type}</span>
        </p>
        {event.on_chain_tx_hash && (
          <a
            href={`${SEPOLIA_EXPLORER}/tx/${event.on_chain_tx_hash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-brand-700 hover:text-brand-900 underline-offset-2 hover:underline"
          >
            {t("viewOnEtherscan")}
            <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        )}
      </div>
    </li>
  );
}
