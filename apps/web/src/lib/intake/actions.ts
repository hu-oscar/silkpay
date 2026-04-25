"use server";

/**
 * Phase 3 — Document intake Server Action.
 *
 * Accepts an uploaded proforma (PDF / image), sends it to Claude Sonnet vision
 * with `messages.parse()` + a Zod-validated structured output schema, persists
 * the result on a new `transactions` row (status = "drafted"), and returns
 * the parsed JSON to the client.
 *
 * Cost containment :
 *   - System prompt is wrapped with `cache_control: ephemeral` → 90% cheaper
 *     on subsequent requests within the 5-min cache window.
 *   - `max_tokens` = 4096 (proforma JSON is ≪ 2k tokens).
 *   - Hard cap on file size (8 MB) so we don't burn tokens on huge images.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { revalidatePath } from "next/cache";

import { ORG_SUPPLIER_ID } from "@/lib/db/seed";
import { getCurrentUser } from "@/lib/auth/current-user";
import { supabaseServer } from "@/lib/supabase/server";

import { anthropic } from "./anthropic";
import { ProformaInvoiceSchema, type ProformaInvoice } from "./schemas";

const MAX_FILE_BYTES = 8 * 1024 * 1024; // 8 MB

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

const SYSTEM_PROMPT = `You are an expert at extracting structured data from international trade documents — specifically proforma invoices for cross-border transactions between African importers and Chinese suppliers.

Extract every field you can find. For ambiguous fields, prefer:
- Currency: detect from symbols ($, ¥, ₦, €) or country context (NG → NGN, CN → CNY, US → USD, EU → EUR)
- Incoterms: look for "FOB", "CIF", "EXW", "DDP", "DAP" near pricing
- Dates: normalize to ISO 8601 (YYYY-MM-DD)
- Numbers: strip thousand separators (commas, spaces) and decimal-as-comma artifacts
- HSC codes: 6–10 digit harmonized system codes near each line item

Return a confidence_score between 0 and 1 reflecting overall extraction quality. Below 0.85 means the document is unclear and should be manually reviewed.

If a field is not present in the document, set it to null. Do not invent values.`;

export type ParseProformaResult =
  | {
      ok: true;
      transactionId: string;
      parsed: ProformaInvoice;
      cost_usd: number | null;
      latency_ms: number;
    }
  | {
      ok: false;
      code:
        | "VALIDATION"
        | "FILE_TOO_LARGE"
        | "UNSUPPORTED_TYPE"
        | "NO_API_KEY"
        | "AUTH_ERROR"
        | "RATE_LIMIT"
        | "PARSE_ERROR"
        | "DB_ERROR";
      message: string;
    };

export async function parseProforma(formData: FormData): Promise<ParseProformaResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, code: "VALIDATION", message: "No file uploaded" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: `File too large (max ${MAX_FILE_BYTES / 1024 / 1024} MB)`,
    };
  }
  const mediaType = (file.type || "application/pdf") as
    | "application/pdf"
    | "image/jpeg"
    | "image/png"
    | "image/webp";
  if (!ALLOWED_MIME.has(mediaType)) {
    return {
      ok: false,
      code: "UNSUPPORTED_TYPE",
      message: `Unsupported file type: ${mediaType}`,
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64Data = Buffer.from(arrayBuffer).toString("base64");

  const { org } = await getCurrentUser();

  const userContent =
    mediaType === "application/pdf"
      ? ([
          {
            type: "document" as const,
            source: {
              type: "base64" as const,
              media_type: "application/pdf" as const,
              data: base64Data,
            },
          },
          {
            type: "text" as const,
            text: "Extract the structured data from this proforma invoice.",
          },
        ] satisfies Anthropic.ContentBlockParam[])
      : ([
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: mediaType,
              data: base64Data,
            },
          },
          {
            type: "text" as const,
            text: "Extract the structured data from this proforma invoice.",
          },
        ] satisfies Anthropic.ContentBlockParam[]);

  const startedAt = Date.now();
  let parsed: ProformaInvoice;
  let costUsd: number | null = null;
  try {
    const client = anthropic();
    const response = await client.messages.parse({
      model: "claude-opus-4-7",
      max_tokens: 4096,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent }],
      output_config: { format: zodOutputFormat(ProformaInvoiceSchema) },
    });

    if (!response.parsed_output) {
      return {
        ok: false,
        code: "PARSE_ERROR",
        message: "Claude returned content but it did not match the expected schema.",
      };
    }
    parsed = response.parsed_output;

    // Opus 4.7 pricing : $5 / M input, $25 / M output, ~10% read price for cached.
    const u = response.usage;
    costUsd =
      (u.input_tokens * 5 +
        u.output_tokens * 25 +
        (u.cache_creation_input_tokens ?? 0) * 6.25 +
        (u.cache_read_input_tokens ?? 0) * 0.5) /
      1_000_000;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return {
        ok: false,
        code: "AUTH_ERROR",
        message: "Anthropic API key invalid",
      };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return {
        ok: false,
        code: "RATE_LIMIT",
        message: "Rate limited — wait a moment and retry",
      };
    }
    if (err instanceof Error && err.message.includes("ANTHROPIC_API_KEY")) {
      return { ok: false, code: "NO_API_KEY", message: err.message };
    }
    return {
      ok: false,
      code: "PARSE_ERROR",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }
  const latencyMs = Date.now() - startedAt;

  // Persist as a new draft transaction. Seller defaults to the seeded Yiwu
  // supplier so the dashboard counterparty link works in the demo.
  const transactionId = crypto.randomUUID();
  const supabase = supabaseServer();
  const { error: insertErr } = await supabase.from("transactions").insert({
    id: transactionId,
    buyer_org_id: org.id,
    seller_org_id: ORG_SUPPLIER_ID,
    status: "drafted",
    amount_ngn: null,
    amount_cny: null,
    amount_usdt: null,
    quote_breakdown: null,
    parsed_documents: { proforma: parsed },
    escrow_address: null,
    escrow_chain: "bsc-testnet",
    sor_allocation: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (insertErr) {
    return { ok: false, code: "DB_ERROR", message: insertErr.message };
  }

  revalidatePath("/", "layout");
  return { ok: true, transactionId, parsed, cost_usd: costUsd, latency_ms: latencyMs };
}
