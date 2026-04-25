"use client";

/**
 * Browser-side Supabase client using the `anon` key.
 *
 * Used by client components for Realtime channel subscriptions
 * (`supabase.channel('tx_id').on('postgres_changes', ...)`).
 * Subject to RLS — only public reads allowed.
 */
import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "../db/database";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function supabaseBrowser() {
  if (!_client) {
    _client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
  }
  return _client;
}
