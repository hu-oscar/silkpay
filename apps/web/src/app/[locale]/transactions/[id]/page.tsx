/**
 * Phase 4 stub of the transaction detail page.
 *
 * Phase 6 will add the timeline + tranches + audit log + dual-side action
 * buttons. For now : header with parties + parsed proforma summary + quote
 * section.
 */
import { ArrowLeft, FileText } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getTransactionById } from "@/lib/db/queries";

import { QuoteSection } from "./quote-section";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("txDetail");
  const format = await getFormatter();

  const tx = await getTransactionById(id);
  if (!tx) notFound();

  const { org } = await getCurrentUser();
  const isBuyer = tx.buyer_org_id === org.id;
  const counterparty = isBuyer ? tx.seller : tx.buyer;
  const proforma = tx.parsed_documents?.proforma;

  // If a quote was previously persisted, hydrate the client state so the
  // detail page renders the breakdown without forcing the user to re-quote.
  // Phase 6 will add a freshness check + auto-refresh banner.
  const initialQuote: Parameters<typeof QuoteSection>[0]["initialQuote"] = tx.quote_breakdown
    ? {
        ok: true,
        transactionId: tx.id,
        breakdown: tx.quote_breakdown,
        sor: {
          allocation:
            (
              tx.sor_allocation as {
                allocations?: Parameters<typeof QuoteSection>[0]["initialQuote"] extends infer Q
                  ? Q extends { ok: true; sor: { allocation: infer A } }
                    ? A
                    : never
                  : never;
              } | null
            )?.allocations ?? [],
          total_cost_bps: 0,
          vs_baseline_savings_bps: 0,
          solver_status: "persisted",
        },
        engine: "cvxpy",
        latency_ms: 0,
      }
    : null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 sm:py-12 space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-700"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("back")}
      </Link>

      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
          Transaction · {tx.id.slice(0, 8)}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">
          {counterparty?.legal_name ?? t("unknownCounterparty")}
        </h1>
        <p className="text-sm text-ink-500">
          {t("createdAt", {
            date: format.dateTime(new Date(tx.created_at), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </p>
      </header>

      {proforma && (
        <div className="rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-500">
            <FileText className="h-3.5 w-3.5" />
            {t("proformaTitle")}
          </p>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <Stat label={t("invoiceNumber")} value={proforma.invoice_number ?? "—"} />
            <Stat
              label={t("totalAmount")}
              value={
                proforma.total_amount && proforma.currency
                  ? format.number(proforma.total_amount, {
                      style: "currency",
                      currency: proforma.currency,
                      maximumFractionDigits: 0,
                    })
                  : "—"
              }
            />
            <Stat label={t("incoterms")} value={proforma.incoterms ?? "—"} />
            <Stat label={t("issuedDate")} value={proforma.issued_date ?? "—"} />
          </div>
        </div>
      )}

      <QuoteSection
        transactionId={tx.id}
        defaultTargetUsd={proforma?.total_amount ?? null}
        initialQuote={initialQuote}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">{label}</p>
      <p className="text-sm font-medium text-ink-900 tnum mt-0.5">{value}</p>
    </div>
  );
}
