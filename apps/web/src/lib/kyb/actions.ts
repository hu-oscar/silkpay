"use server";

/**
 * KYB Server Actions.
 *
 * `submitKyb` :
 *   1. Sets the current org's status to `pending`
 *   2. Inserts 3 `kyb_applications` rows (one per provider) with status `pending`
 *   3. Sequentially flips each provider to `approved` with a 1.2 s delay
 *      between them — total ~3.6 s, well within Vercel's 10 s function budget
 *   4. Sets the org's status to `approved`
 *
 * The client subscribes to `kyb_applications` via Supabase Realtime and
 * animates each provider badge as the rows update.
 */
import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { supabaseServer } from "@/lib/supabase/server";

import { BusinessInfoSchema, PROVIDERS, type BusinessInfo } from "./schemas";

const STAGGER_MS = 1_200;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type SubmitKybResult =
  | { ok: true; orgId: string; appIds: string[] }
  | { ok: false; code: "VALIDATION" | "DB_ERROR"; message: string };

export async function submitKyb(input: BusinessInfo): Promise<SubmitKybResult> {
  const parsed = BusinessInfoSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "VALIDATION",
      message: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { org } = await getCurrentUser();
  const supabase = supabaseServer();

  // 1. Update org with submitted info + flip to pending
  const orgUpdate = await supabase
    .from("organizations")
    .update({
      legal_name: parsed.data.legal_name,
      country_code: parsed.data.country,
      cac_number: parsed.data.cac_number ?? null,
      business_license: parsed.data.business_license ?? null,
      kyb_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", org.id);
  if (orgUpdate.error) {
    return { ok: false, code: "DB_ERROR", message: orgUpdate.error.message };
  }

  // 2. Insert one pending row per provider
  const now = new Date().toISOString();
  const newRows = PROVIDERS.map((provider) => ({
    id: crypto.randomUUID(),
    org_id: org.id,
    provider,
    status: "pending" as const,
    response_payload: null,
    risk_flags: [],
    created_at: now,
  }));
  const insert = await supabase.from("kyb_applications").insert(newRows);
  if (insert.error) {
    return { ok: false, code: "DB_ERROR", message: insert.error.message };
  }

  // 3. Sequentially flip each provider to approved (Realtime delivers each
  //    update to subscribed clients ~immediately).
  for (const row of newRows) {
    await sleep(STAGGER_MS);
    const update = await supabase
      .from("kyb_applications")
      .update({
        status: "approved",
        response_payload: payloadFor(row.provider),
      })
      .eq("id", row.id);
    if (update.error) {
      return { ok: false, code: "DB_ERROR", message: update.error.message };
    }
  }

  // 4. Final org approval
  await sleep(300);
  await supabase
    .from("organizations")
    .update({ kyb_status: "approved", updated_at: new Date().toISOString() })
    .eq("id", org.id);

  revalidatePath("/", "layout");

  return {
    ok: true,
    orgId: org.id,
    appIds: newRows.map((r) => r.id),
  };
}

function payloadFor(provider: (typeof PROVIDERS)[number]) {
  switch (provider) {
    case "smile_id":
      return { match: true, confidence: 0.96 };
    case "comply_advantage":
      return { sanctions_hits: 0, pep_hits: 0 };
    case "tianyancha":
      return { found: true, status: "active" };
  }
}
