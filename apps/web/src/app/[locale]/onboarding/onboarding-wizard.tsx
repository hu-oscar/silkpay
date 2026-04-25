"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  Loader2,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";

import { useRouter } from "@/i18n/navigation";
import { KybLiveStatus } from "@/components/kyb-live-status";
import { submitKyb, type SubmitKybResult } from "@/lib/kyb/actions";
import { BusinessInfoSchema, type BusinessInfo } from "@/lib/kyb/schemas";
import { cn } from "@/lib/utils";

type Step = 1 | 2 | 3;

const TOTAL_STEPS = 3;

export function OnboardingWizard({
  orgId,
  defaultValues,
}: {
  orgId: string;
  defaultValues: Partial<BusinessInfo>;
}) {
  const t = useTranslations("onboarding");
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [docsAck, setDocsAck] = useState({ cac: false, address: false });
  const [submitState, setSubmitState] = useState<SubmitKybResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<BusinessInfo>({
    resolver: zodResolver(BusinessInfoSchema),
    defaultValues: {
      legal_name: defaultValues.legal_name ?? "",
      country: defaultValues.country ?? "NG",
      cac_number: defaultValues.cac_number ?? "",
      bvn: "",
      business_license: defaultValues.business_license ?? "",
    },
    mode: "onBlur",
  });

  const country = form.watch("country");

  function next() {
    if (step === 1) {
      form.handleSubmit(() => setStep(2))();
      return;
    }
    if (step === 2) {
      // Move to step 3 and trigger submit
      setStep(3);
      const data = form.getValues();
      startTransition(async () => {
        const result = await submitKyb(data);
        setSubmitState(result);
      });
    }
  }

  function previous() {
    if (step === 1) return;
    setStep((step - 1) as Step);
  }

  return (
    <div className="space-y-6">
      <ProgressBar step={step} total={TOTAL_STEPS} />

      {step === 1 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{t("step1.title")}</h2>
            <p className="text-sm text-ink-500">{t("step1.subtitle")}</p>
          </div>

          <Field label={t("step1.legalName")} error={form.formState.errors.legal_name?.message}>
            <input
              type="text"
              {...form.register("legal_name")}
              className={inputCls}
              placeholder="Chinedu Trading Ltd"
            />
          </Field>

          <Field label={t("step1.country")} error={form.formState.errors.country?.message}>
            <Controller
              control={form.control}
              name="country"
              render={({ field }) => (
                <select {...field} className={inputCls}>
                  <option value="NG">{t("step1.countries.NG")}</option>
                  <option value="CN">{t("step1.countries.CN")}</option>
                </select>
              )}
            />
          </Field>

          {country === "NG" && (
            <>
              <Field label={t("step1.cacNumber")} error={form.formState.errors.cac_number?.message}>
                <input
                  type="text"
                  {...form.register("cac_number")}
                  className={inputCls}
                  placeholder="RC-1234567"
                />
              </Field>
              <Field
                label={t("step1.bvn")}
                error={form.formState.errors.bvn?.message}
                hint={t("step1.bvnHint")}
              >
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={11}
                  {...form.register("bvn")}
                  className={inputCls}
                  placeholder="22112233445"
                />
              </Field>
            </>
          )}

          {country === "CN" && (
            <Field
              label={t("step1.businessLicense")}
              error={form.formState.errors.business_license?.message}
            >
              <input
                type="text"
                {...form.register("business_license")}
                className={inputCls}
                placeholder="913307825578291X02"
              />
            </Field>
          )}
        </section>
      )}

      {step === 2 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{t("step2.title")}</h2>
            <p className="text-sm text-ink-500">{t("step2.subtitle")}</p>
          </div>

          <FakeUpload
            label={t("step2.cacCert")}
            uploaded={docsAck.cac}
            onUpload={() => setDocsAck((d) => ({ ...d, cac: true }))}
          />
          <FakeUpload
            label={t("step2.proofOfAddress")}
            uploaded={docsAck.address}
            onUpload={() => setDocsAck((d) => ({ ...d, address: true }))}
          />

          <p className="text-xs text-ink-500">{t("step2.note")}</p>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-900">{t("step3.title")}</h2>
            <p className="text-sm text-ink-500">{t("step3.subtitle")}</p>
          </div>

          <KybLiveStatus orgId={orgId} isSubmitting={isPending} />

          {submitState?.ok === false && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              {submitState.message}
            </div>
          )}

          {submitState?.ok && !isPending && (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-ink-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-ink-700"
            >
              <ShieldCheck className="h-4 w-4" />
              {t("cta.dashboard")}
            </button>
          )}
        </section>
      )}

      {step !== 3 && (
        <div className="flex items-center justify-between border-t border-ink-100 pt-4">
          <button
            type="button"
            onClick={previous}
            disabled={step === 1}
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              step === 1 ? "text-ink-300 cursor-not-allowed" : "text-ink-700 hover:bg-ink-100",
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            {t("cta.previous")}
          </button>
          <button
            type="button"
            onClick={next}
            disabled={step === 2 && !(docsAck.cac && docsAck.address)}
            className={cn(
              "inline-flex items-center gap-1 rounded-md bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700",
              step === 2 && !(docsAck.cac && docsAck.address) && "opacity-50 cursor-not-allowed",
            )}
          >
            {step === 2 ? t("cta.submit") : t("cta.next")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-ink-700">{label}</span>
      {children}
      {hint && !error && <span className="block text-xs text-ink-500">{hint}</span>}
      {error && <span className="block text-xs text-rose-700">{error}</span>}
    </label>
  );
}

function FakeUpload({
  label,
  uploaded,
  onUpload,
}: {
  label: string;
  uploaded: boolean;
  onUpload: () => void;
}) {
  const [busy, setBusy] = useState(false);
  function handle() {
    if (uploaded || busy) return;
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      onUpload();
    }, 700);
  }
  return (
    <button
      type="button"
      onClick={handle}
      disabled={uploaded || busy}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-lg border-2 border-dashed px-4 py-4 text-left transition-colors",
        uploaded
          ? "border-emerald-200 bg-emerald-50"
          : "border-ink-200 hover:border-brand-300 hover:bg-brand-50",
      )}
    >
      <div className="flex items-center gap-3">
        {uploaded ? (
          <FileCheck2 className="h-5 w-5 text-emerald-700" />
        ) : busy ? (
          <Loader2 className="h-5 w-5 animate-spin text-brand-700" />
        ) : (
          <Upload className="h-5 w-5 text-ink-500" />
        )}
        <div>
          <p className="text-sm font-medium text-ink-900">{label}</p>
          <p className="text-xs text-ink-500">
            {uploaded ? "Uploaded ✓" : busy ? "Uploading…" : "Click to upload"}
          </p>
        </div>
      </div>
      {uploaded && <CheckCircle2 className="h-4 w-4 text-emerald-700" />}
    </button>
  );
}

function ProgressBar({ step, total }: { step: Step; total: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < step ? "bg-brand-500" : "bg-ink-200",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-ink-500">
        Step {step} / {total}
      </p>
    </div>
  );
}
