/**
 * Supabase `Database` type — provides typed `.from(table)` queries.
 *
 * Mirrors `supabase/migrations/0001_initial.sql`. Manual instead of
 * `supabase gen types typescript` to keep the hackathon toolchain light.
 *
 * For the seed script we accept full rows on Insert; once we start writing
 * partial inserts from Server Actions (Phase 2+) we'll refine per-table.
 */
import type {
  AuditEvent,
  KybApplication,
  Organization,
  SorExecution,
  Transaction,
  Tranche,
} from "./schema";

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization;
        Insert: Organization;
        Update: Partial<Organization>;
      };
      kyb_applications: {
        Row: KybApplication;
        Insert: KybApplication;
        Update: Partial<KybApplication>;
      };
      transactions: {
        Row: Transaction;
        Insert: Transaction;
        Update: Partial<Transaction>;
      };
      tranches: {
        Row: Tranche;
        Insert: Tranche;
        Update: Partial<Tranche>;
      };
      audit_events: {
        Row: AuditEvent;
        Insert: AuditEvent;
        Update: Partial<AuditEvent>;
      };
      sor_executions: {
        Row: SorExecution;
        Insert: SorExecution;
        Update: Partial<SorExecution>;
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
