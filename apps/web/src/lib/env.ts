import { z } from "zod";

/**
 * Yuán env vars.
 *
 * Supabase keys are REQUIRED (the app reads/writes Postgres).
 * Anthropic key is optional until Phase 3 (Claude Vision document intake).
 *
 * Server-only — do NOT import in client components.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Supabase — required
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),

  // Anthropic — needed for Phase 3 (Claude Vision document intake).
  // Empty string treated as "not provided" so a half-filled .env.local doesn't crash.
  ANTHROPIC_API_KEY: z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional()),

  // SOR Python service — Phase 4
  SOR_SERVICE_URL: z.string().url().default("http://localhost:8000"),

  // BSC testnet — Phase 5
  BSC_TESTNET_RPC: z.string().url().default("https://data-seed-prebsc-1-s1.binance.org:8545"),
  NEXT_PUBLIC_MOCK_USDT_ADDRESS: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
  NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().optional(),
  ),
});

export const env = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  SOR_SERVICE_URL: process.env.SOR_SERVICE_URL,
  BSC_TESTNET_RPC: process.env.BSC_TESTNET_RPC,
  NEXT_PUBLIC_MOCK_USDT_ADDRESS: process.env.NEXT_PUBLIC_MOCK_USDT_ADDRESS,
  NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_ESCROW_FACTORY_ADDRESS,
});

export const HAS_ANTHROPIC_KEY = Boolean(env.ANTHROPIC_API_KEY);
