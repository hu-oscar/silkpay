/**
 * Seed the Supabase Postgres with the Chinedu ↔ Mr. Chen demo scenario.
 *
 * Idempotent — uses UPSERT on (id) so re-running is safe.
 *
 * Usage:
 *   pnpm --filter @yuan/web db:seed
 *
 * Requires `apps/web/.env.local` with `SUPABASE_SERVICE_ROLE_KEY`.
 */
import { createClient } from "@supabase/supabase-js";

import {
  seedAuditEvents,
  seedKybApplications,
  seedOrganizations,
  seedSorExecutions,
  seedTranches,
  seedTransactions,
} from "../src/lib/db/seed";

function need(key: string): string {
  const v = process.env[key];
  if (!v) {
    console.error(`✖ Missing env var ${key} (load .env.local)`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const url = need("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = need("SUPABASE_SERVICE_ROLE_KEY");

  console.log(`→ Seeding ${url}`);
  // Untyped client in the bootstrap script — typed client is used at runtime
  // in queries.ts. Avoids fragile generic inference on per-table Insert types.
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  // Order matters: parent rows before children (FK constraints).
  const steps: Array<[string, () => Promise<void>]> = [
    [
      `organizations (${seedOrganizations.length})`,
      async () => {
        const { error } = await supabase
          .from("organizations")
          .upsert(seedOrganizations, { onConflict: "id" });
        if (error) throw error;
      },
    ],
    [
      `kyb_applications (${seedKybApplications.length})`,
      async () => {
        const { error } = await supabase
          .from("kyb_applications")
          .upsert(seedKybApplications, { onConflict: "id" });
        if (error) throw error;
      },
    ],
    [
      `transactions (${seedTransactions.length})`,
      async () => {
        const { error } = await supabase
          .from("transactions")
          .upsert(seedTransactions, { onConflict: "id" });
        if (error) throw error;
      },
    ],
    [
      `tranches (${seedTranches.length})`,
      async () => {
        if (seedTranches.length === 0) return;
        const { error } = await supabase
          .from("tranches")
          .upsert(seedTranches, { onConflict: "id" });
        if (error) throw error;
      },
    ],
    [
      `audit_events (${seedAuditEvents.length})`,
      async () => {
        if (seedAuditEvents.length === 0) return;
        const { error } = await supabase
          .from("audit_events")
          .upsert(seedAuditEvents, { onConflict: "id" });
        if (error) throw error;
      },
    ],
    [
      `sor_executions (${seedSorExecutions.length})`,
      async () => {
        if (seedSorExecutions.length === 0) return;
        const { error } = await supabase
          .from("sor_executions")
          .upsert(seedSorExecutions, { onConflict: "id" });
        if (error) throw error;
      },
    ],
  ];

  for (const [label, run] of steps) {
    process.stdout.write(`  • ${label}…`);
    try {
      await run();
      process.stdout.write(" ✓\n");
    } catch (e) {
      process.stdout.write(" ✖\n");
      console.error(e);
      process.exit(1);
    }
  }

  console.log("\n✓ Seed complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
