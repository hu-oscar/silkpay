/**
 * Memoized Anthropic SDK client — server-only.
 *
 * Throws a clear error at first use if `ANTHROPIC_API_KEY` is missing,
 * rather than letting the SDK throw an opaque 401 later.
 */
import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/lib/env";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!_client) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set in apps/web/.env.local — Phase 3 (Claude Vision document intake) is disabled until you add it.",
      );
    }
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}
