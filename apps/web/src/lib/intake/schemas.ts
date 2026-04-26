/**
 * Zod schema for proforma invoice extraction via Claude Vision.
 *
 * Used both as the structured-output contract for Claude (via
 * `zodOutputFormat()`) and as runtime validation for the Server Action result.
 *
 * Optional fields use `.nullable()` (not `.optional()`) to match the
 * structured-outputs JSON-schema requirement that every field is either
 * present-with-value or present-with-null. Avoids ambiguity in the response.
 */
// Zod v4 import is REQUIRED here — `@anthropic-ai/sdk/helpers/zod#zodOutputFormat`
// internally calls `z.toJSONSchema(schema)` from `zod/v4`, which reads `schema.def`
// (Zod v4 API). A Zod v3 schema would crash with "Cannot read properties of
// undefined (reading 'def')". Other lib/*/schemas.ts files can stay on plain v3.
import { z } from "zod/v4";

const PartySchema = z.object({
  name: z.string().nullable(),
  address: z.string().nullable(),
  country: z.string().nullable(),
  contact: z.string().nullable(),
});

const LineItemSchema = z.object({
  description: z.string(),
  hsc_code: z.string().nullable(),
  qty: z.number(),
  unit_price: z.number(),
  total: z.number(),
});

export const ProformaInvoiceSchema = z.object({
  invoice_number: z.string().nullable(),
  issued_date: z.string().nullable(), // ISO 8601 (YYYY-MM-DD)
  seller: PartySchema.nullable(),
  buyer: PartySchema.nullable(),
  line_items: z.array(LineItemSchema),
  currency: z.enum(["USD", "CNY", "NGN", "EUR"]).nullable(),
  total_amount: z.number().nullable(),
  incoterms: z.enum(["FOB", "CIF", "EXW", "DDP", "DAP", "OTHER"]).nullable(),
  payment_terms: z.string().nullable(),
  confidence_score: z.number().min(0).max(1),
});

export type ProformaInvoice = z.infer<typeof ProformaInvoiceSchema>;
