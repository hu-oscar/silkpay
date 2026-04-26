"use client";

import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  ShieldCheck,
  Upload,
  XCircle,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { useRef, useState, useTransition, type DragEvent } from "react";

import { AgentActionStream } from "@/components/agent-action-stream";
import { useRouter } from "@/i18n/navigation";
import { parseProforma, type ParseProformaResult } from "@/lib/intake/actions";
import type { ProformaInvoice } from "@/lib/intake/schemas";
import { cn } from "@/lib/utils";

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/webp";
const ACCEPTED_TYPES = new Set(ACCEPTED.split(","));

export function IntakeUploader() {
  const t = useTranslations("intake");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<ParseProformaResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function startParse(f: File) {
    setFile(f);
    setResult(null);
    const fd = new FormData();
    fd.append("file", f);
    startTransition(async () => {
      const res = await parseProforma(fd);
      setResult(res);
    });
  }

  function handleFileInput(files: FileList | null) {
    if (!files || files.length === 0) return;
    startParse(files[0]);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    handleFileInput(e.dataTransfer.files);
  }

  function reset() {
    setFile(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-6">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
          dragOver
            ? "border-brand-500 bg-brand-50"
            : file
              ? "border-emerald-200 bg-emerald-50"
              : "border-ink-200 bg-white hover:border-brand-300 hover:bg-brand-50",
          isPending && "pointer-events-none",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          onChange={(e) => handleFileInput(e.target.files)}
          className="hidden"
          disabled={isPending}
        />
        <div className="flex flex-col items-center gap-3">
          {isPending ? (
            <Loader2 className="h-10 w-10 text-brand-700 animate-spin" />
          ) : file ? (
            <FileText className="h-10 w-10 text-emerald-700" />
          ) : (
            <Upload className="h-10 w-10 text-ink-400" />
          )}
          <div>
            <p className="text-sm font-semibold text-ink-900">
              {file ? file.name : t("uploader.drop")}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {file && !isPending ? `${(file.size / 1024).toFixed(0)} KB` : t("uploader.formats")}
            </p>
          </div>
        </div>
      </div>

      {isPending && <ParsingStream />}

      {result?.ok && (
        <ParsedResult
          parsed={result.parsed}
          cost={result.cost_usd}
          latencyMs={result.latency_ms}
          onContinue={() => router.push(`/transactions/${result.transactionId}`)}
          onReset={reset}
        />
      )}

      {result && !result.ok && (
        <ErrorPanel code={result.code} message={result.message} onReset={reset} />
      )}
    </div>
  );
}

function ParsingStream() {
  const t = useTranslations("intake.stream");
  const steps = [t("read"), t("parties"), t("hsc"), t("amounts"), t("validate")] as const;
  // Total ~7s for 5 steps — matches typical Claude Vision latency.
  const pacing = [1200, 1500, 1500, 1500, 1500] as const;
  return (
    <AgentActionStream steps={steps} pacing={pacing} title={t("title")} subtitle={t("subtitle")} />
  );
}

function ParsedResult({
  parsed,
  cost,
  latencyMs,
  onContinue,
  onReset,
}: {
  parsed: ProformaInvoice;
  cost: number | null;
  latencyMs: number;
  onContinue: () => void;
  onReset: () => void;
}) {
  const t = useTranslations("intake.result");
  const format = useFormatter();
  const lowConfidence = parsed.confidence_score < 0.85;

  const rows: Array<{ key: string; value: string | null }> = [
    { key: t("invoiceNumber"), value: parsed.invoice_number },
    { key: t("issuedDate"), value: parsed.issued_date },
    { key: t("seller"), value: parsed.seller?.name ?? null },
    { key: t("sellerCountry"), value: parsed.seller?.country ?? null },
    { key: t("buyer"), value: parsed.buyer?.name ?? null },
    { key: t("buyerCountry"), value: parsed.buyer?.country ?? null },
    { key: t("currency"), value: parsed.currency },
    {
      key: t("totalAmount"),
      value:
        parsed.total_amount != null && parsed.currency
          ? format.number(parsed.total_amount, {
              style: "currency",
              currency: parsed.currency,
              maximumFractionDigits: 2,
            })
          : (parsed.total_amount?.toString() ?? null),
    },
    { key: t("incoterms"), value: parsed.incoterms },
    { key: t("paymentTerms"), value: parsed.payment_terms },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-700" />
          <h3 className="text-base font-semibold text-ink-900">{t("title")}</h3>
        </div>
        <ConfidenceBadge score={parsed.confidence_score} />
      </div>

      {lowConfidence && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{t("manualReview")}</span>
        </div>
      )}

      <ul className="rounded-xl border border-ink-200 bg-white divide-y divide-ink-100">
        {rows.map((row, i) => (
          <li
            key={row.key}
            className="grid grid-cols-2 gap-3 px-4 py-2.5 animate-fade-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span className="text-xs uppercase tracking-wide text-ink-500">{row.key}</span>
            <span
              className={cn(
                "text-sm font-medium tnum text-right",
                row.value ? "text-ink-900" : "text-ink-300 italic",
              )}
            >
              {row.value ?? "—"}
            </span>
          </li>
        ))}
      </ul>

      {parsed.line_items.length > 0 && (
        <div
          className="rounded-xl border border-ink-200 bg-white animate-fade-up"
          style={{ animationDelay: `${rows.length * 60}ms` }}
        >
          <p className="px-4 pt-3 text-xs uppercase tracking-wide text-ink-500">
            {t("lineItems", { count: parsed.line_items.length })}
          </p>
          <ul className="px-4 pb-3 pt-2 space-y-1.5">
            {parsed.line_items.slice(0, 6).map((item, i) => (
              <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-ink-700 truncate">
                  {item.qty} × {item.description}
                  {item.hsc_code && (
                    <span className="ml-2 text-xs text-ink-400">HSC {item.hsc_code}</span>
                  )}
                </span>
                <span className="tnum text-ink-900 font-medium">
                  {parsed.currency
                    ? format.number(item.total, {
                        style: "currency",
                        currency: parsed.currency,
                        maximumFractionDigits: 0,
                      })
                    : item.total.toFixed(0)}
                </span>
              </li>
            ))}
            {parsed.line_items.length > 6 && (
              <li className="text-xs text-ink-500 italic">+{parsed.line_items.length - 6} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 text-xs text-ink-500 pt-2">
        <span>
          ⏱ {(latencyMs / 1000).toFixed(1)}s
          {cost != null && (
            <>
              {" · "}💰 ${cost.toFixed(4)}
            </>
          )}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="underline underline-offset-2 hover:text-ink-700"
        >
          {t("uploadAnother")}
        </button>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink-900 px-5 py-3 text-sm font-medium text-white hover:bg-ink-700"
      >
        <ShieldCheck className="h-4 w-4" />
        {t("continueCta")}
      </button>
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  const tone =
    score >= 0.9
      ? "bg-emerald-100 text-emerald-800"
      : score >= 0.85
        ? "bg-brand-100 text-brand-800"
        : "bg-amber-100 text-amber-800";
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold tnum", tone)}>
      {(score * 100).toFixed(0)}%
    </span>
  );
}

const ERROR_HINTS: Record<string, string> = {
  NO_API_KEY: "ANTHROPIC_API_KEY missing in apps/web/.env.local — add it then restart pnpm dev.",
  AUTH_ERROR: "API key rejected. Verify it on console.anthropic.com.",
  RATE_LIMIT: "Anthropic rate-limit hit. Wait 30 s and retry.",
  FILE_TOO_LARGE: "Max 8 MB per file.",
  UNSUPPORTED_TYPE: "PDF, JPEG, PNG, WebP only.",
  PARSE_ERROR: "Claude could not extract structured data from this document.",
  DB_ERROR: "Could not save to Supabase.",
  VALIDATION: "No file selected.",
};

function ErrorPanel({
  code,
  message,
  onReset,
}: {
  code: string;
  message: string;
  onReset: () => void;
}) {
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <XCircle className="h-5 w-5 text-rose-700" />
        <p className="text-sm font-semibold text-rose-900">{code}</p>
      </div>
      <p className="text-sm text-rose-900/80">{message}</p>
      {ERROR_HINTS[code] && <p className="text-xs text-rose-900/60">{ERROR_HINTS[code]}</p>}
      <button
        type="button"
        onClick={onReset}
        className="mt-2 text-xs underline underline-offset-2 text-rose-900 hover:text-rose-700"
      >
        Try another file
      </button>
    </div>
  );
}
