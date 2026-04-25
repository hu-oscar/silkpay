"use client";

/**
 * Live KYB verification panel.
 *
 * Subscribes to `kyb_applications` for the given org via Supabase Realtime
 * and animates each provider badge as its row flips from `pending` to
 * `approved`. The Server Action `submitKyb` triggers the underlying inserts
 * and updates with a 1.2 s stagger.
 */
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

import { PROVIDERS, type ProviderId } from "@/lib/kyb/schemas";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { KybApplication } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type ProviderState = "idle" | "pending" | "approved";

export function KybLiveStatus({ orgId, isSubmitting }: { orgId: string; isSubmitting: boolean }) {
  const t = useTranslations("onboarding.providers");
  const [byProvider, setByProvider] = useState<Record<ProviderId, ProviderState>>({
    smile_id: "idle",
    comply_advantage: "idle",
    tianyancha: "idle",
  });

  // Realtime subscription on this org's KYB applications.
  useEffect(() => {
    const supabase = supabaseBrowser();
    const channel = supabase
      .channel(`kyb_org_${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "kyb_applications",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const row =
            (payload.new as KybApplication | undefined) ??
            (payload.old as KybApplication | undefined);
          if (!row || !PROVIDERS.includes(row.provider as ProviderId)) return;
          const status: ProviderState =
            row.status === "approved" ? "approved" : row.status === "pending" ? "pending" : "idle";
          setByProvider((prev) => ({
            ...prev,
            [row.provider as ProviderId]: status,
          }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId]);

  // Derive the displayed state. While the Server Action is running, any
  // provider still showing `idle` is shown as `pending` (gives an instant
  // visual cue before the first Realtime event arrives).
  const displayed = useMemo(() => {
    return PROVIDERS.reduce(
      (acc, p) => {
        const current = byProvider[p];
        acc[p] = isSubmitting && current === "idle" ? "pending" : current;
        return acc;
      },
      {} as Record<ProviderId, ProviderState>,
    );
  }, [byProvider, isSubmitting]);

  const allApproved = useMemo(
    () => PROVIDERS.every((p) => displayed[p] === "approved"),
    [displayed],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium text-ink-900">
        <ShieldCheck className="h-4 w-4 text-brand-700" />
        {t("title")}
      </div>

      <ul className="space-y-2">
        {PROVIDERS.map((provider) => (
          <li
            key={provider}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border bg-white px-4 py-3 transition-colors",
              displayed[provider] === "approved"
                ? "border-emerald-200 bg-emerald-50"
                : displayed[provider] === "pending"
                  ? "border-brand-200 bg-brand-50"
                  : "border-ink-200",
            )}
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-ink-900">{t(`${provider}.label`)}</span>
              <span className="text-xs text-ink-500">{t(`${provider}.description`)}</span>
            </div>
            <ProviderBadge state={displayed[provider]} />
          </li>
        ))}
      </ul>

      {allApproved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-900">
          {t("allApproved")}
        </div>
      )}
    </div>
  );
}

function ProviderBadge({ state }: { state: ProviderState }) {
  if (state === "approved") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Approved
      </span>
    );
  }
  if (state === "pending") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-800">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Verifying…
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-500">
      Idle
    </span>
  );
}
