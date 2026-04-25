# System Memory & Context 🧠

<!--
AGENTS: Update this file after every major milestone, structural change, or resolved bug.
DO NOT delete historical context if it is still relevant. Compress older completed items.
-->

## 🏗️ Active Phase & Goal

**Current Phase:** Phase 2 — KYB onboarding (Feature 1)

**Current Task:** Wizard 3 étapes mobile-first avec Zod + simulation provider 3s → status approved en realtime.

**Next Steps:**

1. `/[locale]/onboarding/page.tsx` — wizard 3 steps (business-info, documents, verification).
2. Schemas Zod : CAC Nigeria format, BVN 11 digits, legal name, country.
3. Simulation provider via Server Action : insert `kyb_applications` pending → setTimeout 3s → approved.
4. Polling/refresh côté client (Supabase realtime indisponible en mode in-memory ; on simule via `revalidatePath` ou `useEffect` polling).
5. Forced 中文 supplier flow : `/[locale]/onboarding?role=supplier` ou route séparée.

**Phase 2 exit criteria:**

- Form passe la validation Zod, status passe pending → approved en live (sans refresh manuel).
- `organizations.kyb_status` modifié en mémoire et reflété dans le dashboard KPIs.

## 📂 Architectural Decisions

_(Log specific choices made during the build here so future agents respect them. Dates are absolute — no relative dates.)_

- **2026-04-25** — Chose **BNB Chain (BSC) mainnet** as primary V1 chain for escrow contracts. Reason: Foundry tooling mature, audit firms familiar with EVM, USDT BEP-20 (`0x55d398326f99059fF775485246999027B3197955`) liquid. Tron parallel deploy is V2 post-audit (~6 months post-launch).
- **2026-04-25** — Chose **Clerk** over Supabase Auth for V1. Reason: prebuilt UI, MFA out-of-box, native organizations (multi-user per importer entity is critical V1.5). Cost is acceptable until 10k+ MAU. Supabase Auth migration kept open as Year-2 option.
- **2026-04-25** — Chose **Safe multi-sig 3-of-5 + custom `TradeEscrowModule`** over a from-scratch escrow contract. Reason: inherit Safe's battle-tested security; smaller custom surface = smaller audit scope.
- **2026-04-25** — SOR bootstrap: train XGBoost on **scraped public P2P data (Binance/Bybit/OKX, NGN/USDT, 6–12 months) + synthetic generator**. Reason: zero internal fill data at launch; need to ship a working solver Day 1.
- **2026-04-25** — SOR safety: **fallback to rule-based allocation if ML prediction diverges >50 bps from baseline**, plus drift monitor (>2σ over 7 days = freeze model). Hard solver constraints (depth, daily limit, max 60% per source) are the ultimate guardrail.
- **2026-04-25** — **Pull payment** pattern in escrow contracts (seller calls `claim()`); never auto-push via `transfer()`.
- **2026-04-25** — **Tether blacklist check** (`IUSDT.isBlackListed(address)`) required before every USDT transfer; trigger emergency redirect path if hit.
- **2026-04-25** — **Hackathon track choice: Option B**. Custom `TradeEscrow.sol` simple (single arbiter EOA, no Safe wrapper) on BSC testnet + real CVXPY solver in `services/sor/` (local FastAPI uvicorn) called from Next.js Server Actions. Skip Modal cloud, multi-sig hardware wallets, Smile ID/Tianyancha/ComplyAdvantage (simulated 3s timeout), audit, Inngest. Reason: 22–30h target for end-to-end demo MVP; Option A too thin for technical pitch defense, Option C exceeds hackathon scope. Path d'upgrade vers V1 prod documenté dans `Yuan-MVP-Plan-Hackathon.pdf`.
- **2026-04-25** — **Next.js bumped 15 → 16.2.4** during scaffold (16 is now latest stable, released after the Tech Design was written). App Router API unchanged; `next-intl@4.9.x` is the version that supports Next 16 as peer.

## 🐛 Known Issues & Quirks

_(Log current bugs or weird workarounds here. Empty at project init.)_

- **Modal cold start** can hit 3–5s on first request. Mitigation plan: warm-pool config in Modal app + Vercel edge function for the hot `quote` endpoint. Re-evaluate post-launch with real latency telemetry.
- **CVXPY** is sensitive to non-DCP formulations — AI-generated solver code often compiles but fails to actually minimize. Validate every problem with numeric tests on known cases (use `quad_over_lin`, not raw `power`, for slippage approximations).
- **WhatsApp Business templates** require Meta approval (1–2 weeks). Submit early; do not block launch on this.

## 📜 Completed Phases (Hackathon track — Option B)

- [x] **Phase 0** — Scaffolding monorepo (pnpm + Next.js 16 + Foundry + Python venv + Husky)
- [x] **Phase 1** — DB schema + fake-user system + dashboard stub (in-memory store)
- [x] **Phase 1.5** — Swap in-memory → **Supabase Postgres** (queries.ts now hits real DB; in-memory store removed)
- [ ] Phase 2 — KYB onboarding (Feature 1)
- [ ] Phase 3 — Document Intake Claude Vision (Feature 2)
- [ ] Phase 4 — Quote Engine + SOR CVXPY (Features 3 + 6)
- [ ] Phase 5 — Smart Contract Escrow on BSC testnet (Feature 4)
- [ ] Phase 6 — Dashboard + transaction detail (Feature 5)
- [ ] Phase 7 — Vue supplier + polish + seed + recording prep

### Phase 1.5 deliverables (reference) — Supabase wiring

- Decision: ditched the in-memory store and wired real Supabase Postgres. Migration `supabase/migrations/0001_initial.sql` pushed via SQL Editor (not via Supabase CLI — kept toolchain light).
- Packages: `@supabase/supabase-js`, `@supabase/ssr` in `apps/web`; `tsx` at the root for the seed script.
- `apps/web/src/lib/supabase/server.ts` — server client using `service_role` key (bypasses RLS, safe server-only). Memoized singleton.
- `apps/web/src/lib/supabase/client.ts` — browser client using `anon` key for future Realtime channel subscriptions (Phase 2 + 6).
- `apps/web/src/lib/db/database.ts` — manual `Database<Schema>` type for typed `.from(table)` queries (mirrors the SQL migration). Uses the canonical `{ [_ in never]: never }` shape for Views/Functions/Enums/CompositeTypes that supabase-js v2 expects.
- `apps/web/src/lib/db/queries.ts` — fully rewritten to call Supabase. Uses FK-aliased joins (`organizations!transactions_buyer_org_id_fkey`) for buyer/seller hydration. Same signatures as before — call sites unchanged.
- `apps/web/scripts/seed-db.ts` — idempotent seed script (UPSERT on `id`) for the Chinedu↔Chen scenario. Runnable via `pnpm --filter @yuan/web db:seed` (uses Node's native `--env-file=.env.local`).
- Seed UUIDs fixed: tranche IDs are now valid UUIDs (e.g. `00000000-0000-0000-0000-000000000211`) — Postgres `id UUID` enforces this.
- `lib/db/store.ts` (in-memory) **deleted** — Supabase is now the only source of truth.
- `lib/env.ts` upgraded: required Supabase keys (URL + anon + service_role) validated at boot via Zod; optional vars (`ANTHROPIC_API_KEY` etc.) use a `preprocess` step to coalesce `""` → `undefined` so a half-filled `.env.local` doesn't crash boot.
- Validation: typecheck ✓, build ✓ (3 locales × 2 routes), `db:seed` ✓ (3 orgs / 3 KYB / 3 tx / 6 tranches), dashboard renders correct values from Supabase: `Total saved 1 705 $US`, `2 active`, `1 settled`, user switcher (Chinedu / Chen / Yuán) toggles perspective.

### Phase 1 deliverables (reference)

- **Decision: skipped Clerk + Supabase setup for hackathon speed.** Replaced with:
  - Hardcoded "fake users" in `apps/web/src/lib/auth/fake-users.ts` (Chinedu importer, Mr. Chen supplier, Yuán arbiter), each bound to a seeded org.
  - Cookie-based user switcher (`yuan_user`) with Server Action in `lib/auth/actions.ts` and `<UserSwitcher>` dropdown in the nav. Lets the demo flip perspective on-camera.
  - In-memory store (`lib/db/store.ts`) keyed under a global symbol to survive Next.js dev hot-reloads.
- `supabase/migrations/0001_initial.sql` — full schema from Tech Design (organizations, kyb_applications, transactions, tranches, audit_events, sor_executions) + RLS-enabled, **kept as documentation/future migration only**. Not pushed to any DB.
- `apps/web/src/lib/db/schema.ts` — full TS types mirroring the SQL (incl. `Transaction`, `Tranche`, `ParsedProforma`, `QuoteBreakdown`, `SorAllocation`, `AuditEvent`).
- `apps/web/src/lib/db/seed.ts` — Chinedu↔Chen scenario : 3 orgs + 3 transactions (1 settled, 1 funded in-progress, 1 quoted-not-funded with ~1min expiry countdown for the demo) + 6 tranches.
- `apps/web/src/lib/db/queries.ts` — `getCurrentUser`-friendly query layer (`listTransactionsForOrg`, `getOrgKpis`, `listTranchesForTransaction`, etc.) with `server-only` guard.
- `apps/web/src/app/[locale]/dashboard/page.tsx` — dashboard with 3 KPIs (saved vs SWIFT, active count, settled count) + scrollable tx list with status chips.
- Layout updated : nav with Dashboard/New transaction links + LanguageSwitcher + UserSwitcher (with role badge).
- 3 locale files updated with full `dashboard` namespace including 13 status labels.
- `next.config.ts`: moved `typedRoutes` out of `experimental` (Next 16 update).
- `middleware.ts` → `proxy.ts` (Next 16 convention).
- Validation: `pnpm typecheck` ✓, `pnpm build` ✓ (3 locales × 2 routes), dev server smoke test on `:3001` returns 200 on `/fr`, `/fr/dashboard`, `/zh/dashboard`, dashboard renders Chinedu greeting + seeded transactions + KPIs.

### Phase 0 deliverables (reference)

- Monorepo: `pnpm-workspace.yaml`, `turbo.json`, root `package.json` with scripts.
- `apps/web` — Next.js **16.2.4** (note: bumped from "Next.js 15" in original Tech Design — 16 is now latest stable, App Router unchanged) + Tailwind v4 + TS strict + next-intl 4.x with FR/EN/zh locales (locale-prefixed routes), Anthropic SDK, Zod, react-hook-form, lucide-react, tailwind-merge.
- `apps/contracts` — Foundry + OpenZeppelin; `solc 0.8.24`; sanity test passes.
- `services/sor` — Python 3.12 venv with `cvxpy + fastapi + uvicorn + pydantic + numpy + pytest`; `/health` endpoint + pytest passing.
- Pre-commit hook (`.husky/pre-commit`): lint-staged + conditional typecheck/lint/forge/pytest based on changed paths.
