/**
 * Seed data for the Chinedu ↔ Mr. Chen demo scenario.
 *
 * Orgs use deterministic UUIDs so the fake-user system can reference them
 * by name from anywhere in the app.
 */
import type {
  AuditEvent,
  KybApplication,
  Organization,
  SorExecution,
  Tranche,
  Transaction,
} from "./schema";

const NOW = new Date().toISOString();

// ---- Organisations ---------------------------------------------------------

export const ORG_IMPORTER_ID = "00000000-0000-0000-0000-000000000001";
export const ORG_SUPPLIER_ID = "00000000-0000-0000-0000-000000000002";
export const ORG_ARBITER_ID = "00000000-0000-0000-0000-000000000003";

export const seedOrganizations: Organization[] = [
  {
    id: ORG_IMPORTER_ID,
    clerk_org_id: null,
    type: "importer",
    country_code: "NG",
    legal_name: "Chinedu Trading Ltd",
    cac_number: "RC-1284726",
    business_license: null,
    kyb_status: "approved",
    smart_account_address: "0x7a3F7a3F7a3F7a3F7a3F7a3F7a3F7a3F7a3Fe29B",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ORG_SUPPLIER_ID,
    clerk_org_id: null,
    type: "supplier",
    country_code: "CN",
    legal_name: "Yiwu Smart Devices Co. Ltd",
    cac_number: null,
    business_license: "913307825578291X02",
    kyb_status: "approved",
    smart_account_address: "0xCEC0CEC0CEC0CEC0CEC0CEC0CEC0CEC0CEC0c4e9",
    created_at: NOW,
    updated_at: NOW,
  },
  {
    id: ORG_ARBITER_ID,
    clerk_org_id: null,
    type: "arbiter",
    country_code: "MU",
    legal_name: "Silkpay Compliance",
    cac_number: null,
    business_license: null,
    kyb_status: "approved",
    smart_account_address: "0xA8BAA8BAA8BAA8BAA8BAA8BAA8BAA8BAA8BAa8ba",
    created_at: NOW,
    updated_at: NOW,
  },
];

// ---- KYB applications (audit trail of past verification) -------------------

export const seedKybApplications: KybApplication[] = [
  {
    id: "00000000-0000-0000-0000-000000000101",
    org_id: ORG_IMPORTER_ID,
    provider: "smile_id",
    status: "approved",
    response_payload: { match: true, confidence: 0.97 },
    risk_flags: [],
    created_at: NOW,
  },
  {
    id: "00000000-0000-0000-0000-000000000102",
    org_id: ORG_IMPORTER_ID,
    provider: "comply_advantage",
    status: "approved",
    response_payload: { sanctions_hits: 0, pep_hits: 0 },
    risk_flags: [],
    created_at: NOW,
  },
  {
    id: "00000000-0000-0000-0000-000000000103",
    org_id: ORG_SUPPLIER_ID,
    provider: "tianyancha",
    status: "approved",
    response_payload: { found: true, status: "active" },
    risk_flags: [],
    created_at: NOW,
  },
];

// ---- Transactions ----------------------------------------------------------

const dayAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
const dayFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString();

const TX_SETTLED_ID = "00000000-0000-0000-0000-000000000201";
const TX_FUNDED_ID = "00000000-0000-0000-0000-000000000202";
const TX_QUOTED_ID = "00000000-0000-0000-0000-000000000203";

export const seedTransactions: Transaction[] = [
  // 1. SETTLED — for the receipt-PDF + savings demo
  {
    id: TX_SETTLED_ID,
    buyer_org_id: ORG_IMPORTER_ID,
    seller_org_id: ORG_SUPPLIER_ID,
    status: "settled",
    amount_ngn: 47_210_000,
    amount_usdt: 30_000,
    amount_cny: 215_800,
    quote_breakdown: {
      ngn_paid: 47_210_000,
      usdt_received: 30_000,
      cny_delivered: 215_800,
      fx_cost_ngn: 378_000,
      platform_fee_bps: 50,
      off_ramp_cost_cny: 1_080,
      network_fees_usd: 2,
      total_cost_usd: 590,
      swift_estimated_cost_usd: 2_295,
      savings_vs_swift_usd: 1_705,
      eta_seconds: 240,
      expires_at: dayAgo(28),
    },
    parsed_documents: {
      proforma: {
        invoice_number: "YSD-2026-0142",
        currency: "USD",
        total_amount: 30_000,
        incoterms: "FOB",
        confidence_score: 0.96,
      },
    },
    escrow_address: "0x7a3F0000000000000000000000000000000Ae29B",
    escrow_chain: "sepolia",
    sor_allocation: {
      allocations: [
        {
          source_id: "yellow_card",
          ngn_amount: 21_244_500,
          share: 0.45,
          predicted_slippage_bps: 12,
          predicted_delay_seconds: 30,
        },
        {
          source_id: "otc_desk_1",
          ngn_amount: 16_523_500,
          share: 0.35,
          predicted_slippage_bps: 8,
          predicted_delay_seconds: 45,
        },
        {
          source_id: "otc_desk_2",
          ngn_amount: 9_442_000,
          share: 0.2,
          predicted_slippage_bps: 18,
          predicted_delay_seconds: 60,
        },
      ],
    },
    created_at: dayAgo(30),
    updated_at: dayAgo(20),
  },

  // 2. FUNDED — for live milestone-attestation demo
  {
    id: TX_FUNDED_ID,
    buyer_org_id: ORG_IMPORTER_ID,
    seller_org_id: ORG_SUPPLIER_ID,
    status: "funded",
    amount_ngn: 31_500_000,
    amount_usdt: 20_000,
    amount_cny: 143_800,
    quote_breakdown: {
      ngn_paid: 31_500_000,
      usdt_received: 20_000,
      cny_delivered: 143_800,
      fx_cost_ngn: 252_000,
      platform_fee_bps: 50,
      off_ramp_cost_cny: 720,
      network_fees_usd: 2,
      total_cost_usd: 395,
      swift_estimated_cost_usd: 1_530,
      savings_vs_swift_usd: 1_135,
      eta_seconds: 240,
      expires_at: dayAgo(2),
    },
    parsed_documents: {
      proforma: {
        invoice_number: "YSD-2026-0167",
        currency: "USD",
        total_amount: 20_000,
        incoterms: "FOB",
        confidence_score: 0.93,
      },
    },
    escrow_address: "0x7a3F0000000000000000000000000000000Bf83C",
    escrow_chain: "sepolia",
    sor_allocation: {
      allocations: [
        {
          source_id: "yellow_card",
          ngn_amount: 14_175_000,
          share: 0.45,
          predicted_slippage_bps: 14,
          predicted_delay_seconds: 30,
        },
        {
          source_id: "otc_desk_1",
          ngn_amount: 11_025_000,
          share: 0.35,
          predicted_slippage_bps: 9,
          predicted_delay_seconds: 45,
        },
        {
          source_id: "otc_desk_2",
          ngn_amount: 6_300_000,
          share: 0.2,
          predicted_slippage_bps: 21,
          predicted_delay_seconds: 60,
        },
      ],
    },
    created_at: dayAgo(3),
    updated_at: dayAgo(1),
  },

  // 3. QUOTED but not funded — for the "Fund" button demo
  {
    id: TX_QUOTED_ID,
    buyer_org_id: ORG_IMPORTER_ID,
    seller_org_id: ORG_SUPPLIER_ID,
    status: "quoted",
    amount_ngn: 78_750_000,
    amount_usdt: 50_000,
    amount_cny: 359_500,
    quote_breakdown: {
      ngn_paid: 78_750_000,
      usdt_received: 50_000,
      cny_delivered: 359_500,
      fx_cost_ngn: 630_000,
      platform_fee_bps: 50,
      off_ramp_cost_cny: 1_800,
      network_fees_usd: 3,
      total_cost_usd: 985,
      swift_estimated_cost_usd: 3_825,
      savings_vs_swift_usd: 2_840,
      eta_seconds: 240,
      expires_at: dayFromNow(0.001), // ~1 min — visible expiry countdown in UI
    },
    parsed_documents: null,
    escrow_address: null,
    escrow_chain: "sepolia",
    sor_allocation: {
      allocations: [
        {
          source_id: "yellow_card",
          ngn_amount: 35_437_500,
          share: 0.45,
          predicted_slippage_bps: 16,
          predicted_delay_seconds: 30,
        },
        {
          source_id: "otc_desk_1",
          ngn_amount: 27_562_500,
          share: 0.35,
          predicted_slippage_bps: 11,
          predicted_delay_seconds: 45,
        },
        {
          source_id: "otc_desk_2",
          ngn_amount: 15_750_000,
          share: 0.2,
          predicted_slippage_bps: 24,
          predicted_delay_seconds: 60,
        },
      ],
    },
    created_at: dayAgo(0.05),
    updated_at: dayAgo(0.05),
  },
];

// ---- Tranches --------------------------------------------------------------

export const seedTranches: Tranche[] = [
  // Settled tx — all 3 released. UUIDs end in 211/212/213.
  ...buildTranches(TX_SETTLED_ID, "211", 30_000, "released", dayAgo(28)),
  // Funded tx — funded but no milestone yet. UUIDs end in 221/222/223.
  ...buildTranches(TX_FUNDED_ID, "221", 20_000, "pending", dayAgo(2)),
];

/**
 * `txId` is a deterministic seed UUID like "00000000-0000-0000-0000-000000000201".
 * `tranchePrefix` replaces the last 3 digits of that UUID's tail (e.g. "211" → tranche IDs
 * "00000000-0000-0000-0000-000000000211" / 212 / 213). Keeps everything UUID-valid
 * for Postgres while staying deterministic.
 */
function buildTranches(
  txId: string,
  tranchePrefix: string,
  totalUsdt: number,
  status: Tranche["status"],
  fundedAt: string,
): Tranche[] {
  const baseUuid = (suffix: string) => txId.slice(0, -3) + tranchePrefix.slice(0, 2) + suffix;

  return [
    {
      id: baseUuid("1"),
      transaction_id: txId,
      sequence: 1,
      percentage: 30,
      amount_usdt: totalUsdt * 0.3,
      condition_type: "bl_signed",
      condition_payload: null,
      status,
      deadline: addDays(fundedAt, 30),
      released_tx_hash: status === "released" ? mockHash(txId, 1) : null,
      created_at: fundedAt,
    },
    {
      id: baseUuid("2"),
      transaction_id: txId,
      sequence: 2,
      percentage: 50,
      amount_usdt: totalUsdt * 0.5,
      condition_type: "inspection_certified",
      condition_payload: null,
      status,
      deadline: addDays(fundedAt, 45),
      released_tx_hash: status === "released" ? mockHash(txId, 2) : null,
      created_at: fundedAt,
    },
    {
      id: baseUuid("3"),
      transaction_id: txId,
      sequence: 3,
      percentage: 20,
      amount_usdt: totalUsdt * 0.2,
      condition_type: "delivery_acknowledged",
      condition_payload: null,
      status,
      deadline: addDays(fundedAt, 60),
      released_tx_hash: status === "released" ? mockHash(txId, 3) : null,
      created_at: fundedAt,
    },
  ];
}

function addDays(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 86400 * 1000).toISOString();
}

function mockHash(txId: string, seq: number): string {
  // Deterministic-looking 0x… hash for stable demo links.
  return `0x${txId.replace(/-/g, "")}${seq.toString().padStart(2, "0")}cafe`
    .padEnd(66, "0")
    .slice(0, 66);
}

// ---- Audit log + SOR executions (lightweight for now) ----------------------

export const seedAuditEvents: AuditEvent[] = [];
export const seedSorExecutions: SorExecution[] = [];
