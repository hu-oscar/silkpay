import { ArrowUpRight, Banknote, CheckCircle2, ListChecks } from "lucide-react";
import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getOrgKpis, listTransactionsForOrg } from "@/lib/db/queries";
import type { TxStatus } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<TxStatus, string> = {
  drafted: "bg-ink-100 text-ink-700",
  kyb_pending: "bg-amber-100 text-amber-800",
  quoted: "bg-brand-100 text-brand-700",
  awaiting_funding: "bg-amber-100 text-amber-800",
  funded: "bg-brand-100 text-brand-700",
  in_transit: "bg-brand-100 text-brand-700",
  inspected: "bg-brand-100 text-brand-700",
  delivered: "bg-emerald-100 text-emerald-800",
  settling: "bg-emerald-100 text-emerald-800",
  settled: "bg-emerald-100 text-emerald-800",
  disputed: "bg-rose-100 text-rose-800",
  refunded: "bg-rose-100 text-rose-800",
  cancelled: "bg-ink-100 text-ink-500",
};

export default async function DashboardPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");
  const format = await getFormatter();

  const { user, org } = await getCurrentUser();
  const [transactions, kpis] = await Promise.all([
    listTransactionsForOrg(org.id),
    getOrgKpis(org.id),
  ]);

  const fmtUsd = (n: number) =>
    format.number(n, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
  const fmtUsdt = (n: number | null) =>
    n == null ? "—" : `${format.number(n, { maximumFractionDigits: 0 })} USDT`;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12 space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
          {org.legal_name} · {org.country_code}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">
          {t("greeting", { name: user.display_name })}
        </h1>
        <p className="text-sm text-ink-500">{t("subtitle")}</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <KpiCard
          icon={<Banknote className="h-4 w-4" />}
          label={t("kpis.totalSaved")}
          value={fmtUsd(kpis.total_saved_usd)}
          tone="emerald"
        />
        <KpiCard
          icon={<ListChecks className="h-4 w-4" />}
          label={t("kpis.activeCount")}
          value={kpis.active_count.toString()}
          tone="brand"
        />
        <KpiCard
          icon={<CheckCircle2 className="h-4 w-4" />}
          label={t("kpis.settledCount")}
          value={kpis.settled_count.toString()}
          tone="ink"
        />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold text-ink-900">{t("transactions.title")}</h2>
          <Link
            href="/transactions/new"
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-900"
          >
            {t("transactions.new")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ink-200 bg-white p-10 text-center">
            <p className="text-sm text-ink-500">{t("transactions.empty")}</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white">
            {transactions.map((tx) => {
              const counterparty = tx.buyer_org_id === org.id ? tx.seller : tx.buyer;
              return (
                <li key={tx.id}>
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="grid items-center gap-2 px-4 py-3 transition-colors hover:bg-ink-50 sm:grid-cols-[1fr_auto_auto_auto]"
                  >
                    <div>
                      <p className="text-sm font-medium text-ink-900 truncate">
                        {counterparty?.legal_name ?? t("transactions.unknownCounterparty")}
                      </p>
                      <p className="text-xs text-ink-500">
                        {format.dateTime(new Date(tx.updated_at), {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <span className="text-sm tnum text-ink-700">{fmtUsdt(tx.amount_usdt)}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        STATUS_TONE[tx.status],
                      )}
                    >
                      {t(`status.${tx.status}`)}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-ink-300" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "emerald" | "brand" | "ink";
}) {
  const toneCls =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "brand"
        ? "border-brand-200 bg-brand-50 text-brand-900"
        : "border-ink-200 bg-white text-ink-900";

  return (
    <div className={cn("rounded-lg border p-4", toneCls)}>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide opacity-70">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold tnum">{value}</p>
    </div>
  );
}
