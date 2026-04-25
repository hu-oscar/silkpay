import { setRequestLocale } from "next-intl/server";
import { getTranslations } from "next-intl/server";

import { SavingsCalculator } from "@/components/savings-calculator";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  // Value-prop items as a typed tuple from messages
  const propsItems = [
    t("valueProps.items.0.title"),
    t("valueProps.items.0.body"),
    t("valueProps.items.1.title"),
    t("valueProps.items.1.body"),
    t("valueProps.items.2.title"),
    t("valueProps.items.2.body"),
    t("valueProps.items.3.title"),
    t("valueProps.items.3.body"),
  ];

  const items = [
    { title: propsItems[0], body: propsItems[1] },
    { title: propsItems[2], body: propsItems[3] },
    { title: propsItems[4], body: propsItems[5] },
    { title: propsItems[6], body: propsItems[7] },
  ];

  return (
    <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
      <section className="grid gap-12 sm:grid-cols-2 sm:items-center">
        <div className="space-y-6">
          <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-medium text-brand-700">
            Lagos ↔ Yiwu · MVP
          </span>
          <h1 className="text-4xl font-bold leading-tight tracking-tight text-ink-900 sm:text-5xl">
            {t("hero.title")}
          </h1>
          <p className="text-lg text-ink-500 leading-relaxed">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-ink-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-ink-700"
            >
              {t("hero.cta")}
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-ink-200 bg-white px-5 py-3 text-sm font-medium text-ink-700 hover:bg-ink-100"
            >
              {t("hero.ctaSecondary")}
            </button>
          </div>
        </div>
        <SavingsCalculator />
      </section>

      <section className="mt-24">
        <h2 className="text-2xl font-bold tracking-tight text-ink-900">
          {t("valueProps.title")}
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-ink-200 bg-white p-5"
            >
              <h3 className="text-sm font-semibold text-ink-900">
                {item.title}
              </h3>
              <p className="mt-2 text-sm text-ink-500 leading-relaxed">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
