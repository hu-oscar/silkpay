import { getTranslations, setRequestLocale } from "next-intl/server";

import { HAS_ANTHROPIC_KEY } from "@/lib/env";

import { IntakeUploader } from "./intake-uploader";

export default async function NewTransactionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("intake");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
      <header className="space-y-2 mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">{t("step")}</p>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">{t("title")}</h1>
        <p className="text-sm text-ink-500">{t("subtitle")}</p>
      </header>

      {!HAS_ANTHROPIC_KEY && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">{t("noKeyTitle")}</p>
          <p className="mt-1 text-amber-900/80">{t("noKeyBody")}</p>
        </div>
      )}

      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        <IntakeUploader />
      </div>
    </div>
  );
}
