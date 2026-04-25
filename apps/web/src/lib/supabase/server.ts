/**
 * Server-side Supabase client using the `service_role` key.
 *
 * Bypasses RLS — safe to use anywhere on the server. Never expose to client.
 * (When Clerk lands post-hackathon, switch most reads to an authed `anon`
 *  client that respects the JWT-based RLS policies.)
 */
import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

import type { Database } from "../db/database";

let _client: ReturnType<typeof createClient<Database>> | null = null;

export function supabaseServer() {
  if (!_client) {
    _client = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}
