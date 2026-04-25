/**
 * Yuán DB schema — TypeScript types mirroring `supabase/migrations/0001_initial.sql`.
 *
 * The in-memory store at `lib/db/store.ts` uses these types directly.
 * When we wire Supabase post-hackathon, the same types map to generated DB types.
 */

export type OrgType = "importer" | "supplier" | "arbiter";

export type KybStatus = "pending" | "approved" | "rejected" | "review";

export type TxStatus =
  | "drafted"
  | "kyb_pending"
  | "quoted"
  | "awaiting_funding"
  | "funded"
  | "in_transit"
  | "inspected"
  | "delivered"
  | "settling"
  | "settled"
  | "disputed"
  | "refunded"
  | "cancelled";

export type TrancheConditionType = "bl_signed" | "inspection_certified" | "delivery_acknowledged";

export type TrancheStatus = "pending" | "attested" | "released" | "disputed" | "refunded";

export type ActorType = "buyer" | "seller" | "arbiter" | "system";

// ----------------------------------------------------------------------------
// Tables
// ----------------------------------------------------------------------------

export type Organization = {
  id: string;
  clerk_org_id: string | null;
  type: OrgType;
  country_code: string; // ISO 3166-1 alpha-2
  legal_name: string;
  cac_number: string | null;
  business_license: string | null;
  kyb_status: KybStatus;
  smart_account_address: string | null;
  created_at: string; // ISO
  updated_at: string;
};

export type KybApplication = {
  id: string;
  org_id: string;
  provider: "smile_id" | "tianyancha" | "comply_advantage" | null;
  status: KybStatus | null;
  response_payload: Record<string, unknown> | null;
  risk_flags: string[];
  created_at: string;
};

/**
 * Stored as `transactions.parsed_documents.proforma`. Both the seed (sparse,
 * uses `undefined`) and the Claude Vision parse (full shape, uses `null` per
 * structured-output schema) write here, so every field accepts `?: T | null`.
 */
type Party = {
  name?: string | null;
  address?: string | null;
  country?: string | null;
  contact?: string | null;
};

export type ParsedProforma = {
  invoice_number?: string | null;
  issued_date?: string | null;
  seller?: Party | null;
  buyer?: Party | null;
  line_items?: Array<{
    description: string;
    hsc_code?: string | null;
    qty: number;
    unit_price: number;
    total: number;
  }>;
  currency?: "USD" | "CNY" | "NGN" | "EUR" | null;
  total_amount?: number | null;
  incoterms?: "FOB" | "CIF" | "EXW" | "DDP" | "DAP" | "OTHER" | null;
  payment_terms?: string | null;
  confidence_score?: number;
};

export type QuoteBreakdown = {
  ngn_paid: number;
  usdt_received: number;
  cny_delivered: number;
  fx_cost_ngn: number;
  platform_fee_bps: number;
  off_ramp_cost_cny: number;
  network_fees_usd: number;
  total_cost_usd: number;
  swift_estimated_cost_usd: number;
  savings_vs_swift_usd: number;
  eta_seconds: number;
  expires_at: string; // ISO
};

export type SorAllocation = {
  source_id: string;
  ngn_amount: number;
  share: number; // 0–1
  predicted_slippage_bps: number;
  predicted_delay_seconds: number;
};

export type Transaction = {
  id: string;
  buyer_org_id: string;
  seller_org_id: string | null;
  status: TxStatus;
  amount_ngn: number | null;
  amount_cny: number | null;
  amount_usdt: number | null;
  quote_breakdown: QuoteBreakdown | null;
  parsed_documents: { proforma?: ParsedProforma } | null;
  escrow_address: string | null;
  escrow_chain: string;
  sor_allocation: { allocations: SorAllocation[] } | null;
  created_at: string;
  updated_at: string;
};

export type Tranche = {
  id: string;
  transaction_id: string;
  sequence: number; // 1, 2, 3
  percentage: number; // 30 / 50 / 20
  amount_usdt: number;
  condition_type: TrancheConditionType;
  condition_payload: Record<string, unknown> | null;
  status: TrancheStatus;
  deadline: string; // ISO
  released_tx_hash: string | null;
  created_at: string;
};

export type AuditEvent = {
  id: string;
  transaction_id: string;
  actor_id: string | null;
  actor_type: ActorType;
  event_type: string;
  payload: Record<string, unknown> | null;
  on_chain_tx_hash: string | null;
  created_at: string;
};

export type SorExecution = {
  id: string;
  transaction_id: string;
  source_id: string;
  allocated_ngn: number;
  predicted_slippage_bps: number;
  realized_slippage_bps: number | null;
  predicted_delay_seconds: number;
  realized_delay_seconds: number | null;
  features_at_decision: Record<string, unknown> | null;
  fallback_to_rulebased: boolean;
  created_at: string;
};
