"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/i18n/navigation";
import { type Locale, routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const t = useTranslations("languageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function switchTo(next: Locale) {
    if (next === locale) return;
    startTransition(() => {
      router.replace(pathname, { locale: next });
    });
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-ink-200 bg-white p-1 text-xs",
        pending && "opacity-60",
      )}
      aria-label={t("label")}
    >
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          disabled={pending}
          className={cn(
            "rounded-full px-3 py-1 font-medium transition-colors",
            loc === locale
              ? "bg-ink-900 text-white"
              : "text-ink-500 hover:bg-ink-100 hover:text-ink-900",
          )}
        >
          {t(loc)}
        </button>
      ))}
    </div>
  );
}
