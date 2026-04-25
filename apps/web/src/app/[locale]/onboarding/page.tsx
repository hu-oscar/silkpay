import { setRequestLocale, getTranslations } from "next-intl/server";

import { OnboardingWizard } from "./onboarding-wizard";
import { getCurrentUser } from "@/lib/auth/current-user";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("onboarding");
  const { org } = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 sm:py-14">
      <header className="space-y-2 mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
          KYB · {org.legal_name}
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-ink-900">{t("title")}</h1>
        <p className="text-sm text-ink-500">{t("subtitle")}</p>
      </header>

      <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm">
        <OnboardingWizard
          orgId={org.id}
          defaultValues={{
            legal_name: org.legal_name,
            country: (org.country_code as "NG" | "CN" | undefined) ?? undefined,
            cac_number: org.cac_number ?? undefined,
            business_license: org.business_license ?? undefined,
          }}
        />
      </div>
    </div>
  );
}
