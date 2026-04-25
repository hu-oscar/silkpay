/**
 * Typed DB query layer — backed by Supabase Postgres.
 *
 * All Server Components / Server Actions go through these functions.
 * Signatures kept identical to the previous in-memory implementation so
 * call sites in dashboard/page.tsx etc. didn't have to change.
 */
import "server-only";

import { supabaseServer } from "@/lib/supabase/server";

import type {
  AuditEvent,
  KybApplication,
  Organization,
  Transaction,
  Tranche,
  TxStatus,
} from "./schema";

// ---- Organizations ---------------------------------------------------------

export async function getOrganizationById(id: string): Promise<Organization | null> {
  const { data, error } = await supabaseServer()
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Organization | null) ?? null;
}

export async function listOrganizationsByType(type: Organization["type"]): Promise<Organization[]> {
  const { data, error } = await supabaseServer().from("organizations").select("*").eq("type", type);
  if (error) throw error;
  return (data ?? []) as Organization[];
}

// ---- KYB applications ------------------------------------------------------

export async function listKybApplicationsForOrg(orgId: string): Promise<KybApplication[]> {
  const { data, error } = await supabaseServer()
    .from("kyb_applications")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KybApplication[];
}

// ---- Transactions ----------------------------------------------------------

export type TransactionWithCounterparty = Transaction & {
  buyer: Organization | null;
  seller: Organization | null;
};

export async function listTransactionsForOrg(
  orgId: string,
): Promise<TransactionWithCounterparty[]> {
  const { data, error } = await supabaseServer()
    .from("transactions")
    .select(
      "*, buyer:organizations!transactions_buyer_org_id_fkey(*), seller:organizations!transactions_seller_org_id_fkey(*)",
    )
    .or(`buyer_org_id.eq.${orgId},seller_org_id.eq.${orgId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransactionWithCounterparty[];
}

export async function getTransactionById(id: string): Promise<TransactionWithCounterparty | null> {
  const { data, error } = await supabaseServer()
    .from("transactions")
    .select(
      "*, buyer:organizations!transactions_buyer_org_id_fkey(*), seller:organizations!transactions_seller_org_id_fkey(*)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as TransactionWithCounterparty | null) ?? null;
}

export async function listTranchesForTransaction(txId: string): Promise<Tranche[]> {
  const { data, error } = await supabaseServer()
    .from("tranches")
    .select("*")
    .eq("transaction_id", txId)
    .order("sequence", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Tranche[];
}

export async function listAuditEventsForTransaction(txId: string): Promise<AuditEvent[]> {
  const { data, error } = await supabaseServer()
    .from("audit_events")
    .select("*")
    .eq("transaction_id", txId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AuditEvent[];
}

// ---- Aggregates for the dashboard KPIs -------------------------------------

export type OrgKpis = {
  total_saved_usd: number;
  total_tpv_usdt: number;
  active_count: number;
  settled_count: number;
};

const TERMINAL_STATUSES: ReadonlyArray<TxStatus> = ["settled", "cancelled", "refunded"];

export async function getOrgKpis(orgId: string): Promise<OrgKpis> {
  const txs = await listTransactionsForOrg(orgId);
  const settled = txs.filter((t) => t.status === "settled");
  const active = txs.filter((t) => !TERMINAL_STATUSES.includes(t.status));
  return {
    total_saved_usd: settled.reduce(
      (sum, t) => sum + (t.quote_breakdown?.savings_vs_swift_usd ?? 0),
      0,
    ),
    total_tpv_usdt: txs.reduce((sum, t) => sum + (t.amount_usdt ?? 0), 0),
    active_count: active.length,
    settled_count: settled.length,
  };
}

export async function countTransactionsByStatus(
  orgId: string,
  statuses: TxStatus[],
): Promise<number> {
  const txs = await listTransactionsForOrg(orgId);
  return txs.filter((t) => statuses.includes(t.status)).length;
}
