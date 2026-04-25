"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { cn } from "@/lib/utils";

const SWIFT_RATE = 0.075;
const YUAN_RATE = 0.018;

export function SavingsCalculator() {
  const t = useTranslations("landing.calculator");
  const locale = useLocale();
  const format = useFormatter();
  const [amount, setAmount] = useState<number>(30_000);

  const swiftCost = amount * SWIFT_RATE;
  const yuanCost = amount * YUAN_RATE;
  const savings = swiftCost - yuanCost;

  const fmtUsd = (n: number) =>
    format.number(n, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

  return (
    <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
      <h2 className="text-base font-semibold text-ink-900">{t("title")}</h2>

      <label className="mt-4 block text-xs font-medium text-ink-500">
        {t("amountLabel")}
      </label>
      <div className="mt-1 relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-sm text-ink-500">
          $
        </span>
        <input
          type="number"
          inputMode="numeric"
          min={1000}
          max={1_000_000}
          step={1000}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value) || 0)}
          className={cn(
            "w-full rounded-md border border-ink-200 bg-ink-50 px-7 py-2 text-lg font-semibold tnum",
            "focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-100",
          )}
          aria-label={t("amountLabel")}
          placeholder={t("amountPlaceholder")}
          lang={locale}
        />
      </div>

      <div className="mt-6 space-y-3">
        <Row
          label={t("swiftLabel")}
          sub={t("swiftRate")}
          value={fmtUsd(swiftCost)}
          tone="muted"
        />
        <Row
          label={t("yuanLabel")}
          sub={t("yuanRate")}
          value={fmtUsd(yuanCost)}
          tone="brand"
        />
      </div>

      <div className="mt-6 rounded-xl bg-emerald-50 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-sm font-medium text-emerald-900">
            {t("savingsLabel")}
          </span>
          <span className="text-2xl font-bold tnum text-emerald-700">
            {fmtUsd(savings)}
          </span>
        </div>
        <p className="mt-1 text-xs text-emerald-800/80">
          {t("perTransaction")}
        </p>
      </div>
    </div>
  );
}

function Row({
  label,
  sub,
  value,
  tone,
}: {
  label: string;
  sub: string;
  value: string;
  tone: "muted" | "brand";
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-ink-100 pb-3 last:border-0 last:pb-0">
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            tone === "brand" ? "text-brand-700" : "text-ink-700",
          )}
        >
          {label}
        </p>
        <p className="text-xs text-ink-500">{sub}</p>
      </div>
      <span
        className={cn(
          "text-base font-semibold tnum",
          tone === "brand" ? "text-brand-700" : "text-ink-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}
