import "../globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { LanguageSwitcher } from "@/components/language-switcher";
import { UserSwitcher } from "@/components/user-switcher";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yuán — Pay China like it's next door",
  description:
    "B2B cross-border payments for the Africa–China trade corridor. T+0 settlement, programmable escrow, transparent FX.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const [{ user }, t] = await Promise.all([getCurrentUser(), getTranslations("nav")]);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-ink-50 text-ink-900 flex flex-col">
        <NextIntlClientProvider>
          <header className="border-b border-ink-200 bg-white">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-baseline gap-2 text-ink-900 hover:opacity-80">
                  <span className="text-xl font-bold tracking-tight">Yuán</span>
                  <span className="text-xs text-ink-500 hidden sm:inline">元</span>
                </Link>
                <nav className="hidden items-center gap-4 sm:flex">
                  <Link
                    href="/dashboard"
                    className="text-sm font-medium text-ink-700 hover:text-ink-900"
                  >
                    {t("dashboard")}
                  </Link>
                  <Link
                    href="/transactions/new"
                    className="text-sm font-medium text-ink-700 hover:text-ink-900"
                  >
                    {t("newTransaction")}
                  </Link>
                </nav>
              </div>
              <div className="flex items-center gap-3">
                <LanguageSwitcher />
                <UserSwitcher activeUserId={user.id} />
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
          <footer className="border-t border-ink-200 bg-white py-6 text-center text-xs text-ink-500">
            © 2026 Yuán · Hackathon MVP · {user.full_name}
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
