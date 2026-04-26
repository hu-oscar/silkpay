# System Memory & Context 🧠

<!--
AGENTS: Update this file after every major milestone, structural change, or resolved bug.
DO NOT delete historical context if it is still relevant. Compress older completed items.
-->

## 🏗️ Active Phase & Goal

**Current Phase:** Phase 4 — Quote engine + SOR CVXPY (Features 3 + 6)

**Current Task:** Build the multi-source quote orchestrator + real CVXPY convex solver in `services/sor/`.

**Next Steps:**

1. 3 fake source endpoints in Next.js API routes (`/api/sources/{yellow-card,otc-desk-1,otc-desk-2}/quote`) returning realistic NGN/USDT prices (base spot + spread per-source + Gaussian noise).
2. 1 PSP endpoint `/api/sources/psp/usdt-cny` for the leg.
3. `services/sor/app.py` : implement the CVXPY ECOS solver (DCP-compliant, slippage as `quad_over_lin`, constraints `sum=target`, depth caps, max 60% per source). Replace the `/health` stub.
4. `pytest` for the solver: 1-source / 2-source-with-cap / 3-source-stress.
5. Server Action `getQuote({ amount_ngn })` orchestrates parallel fetches → POST to local FastAPI → consolidate → persist `transactions.quote_breakdown` + `sor_executions` rows.
6. UI : `<QuoteBreakdownCard>` Wise-style + `<SORAllocationChart>` recharts pie animated, on the next-transaction flow step 2.

**Phase 4 exit criteria:**

- "Get quote" button → fetches 3 sources in parallel, calls CVXPY solver, returns in < 3s.
- Breakdown shows NGN paid / USDT received / CNY delivered / fees / savings vs SWIFT.
- Pie chart shows source allocation (with `predicted_slippage_bps` tooltip).
- DB persisted (`quote_breakdown` JSONB + 3 `sor_executions` rows).

**Manual setup before Phase 4 testing:**

- Run `pnpm sor:dev` in a second terminal (uvicorn on :8000).
- Install missing solver deps if needed: `services/sor/.venv/bin/pip install scipy ecos`.

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
- [x] **Phase 2** — KYB onboarding wizard with **Supabase Realtime providers panel**
- [x] **Phase 3** — Document intake **Claude Vision** (Anthropic Opus 4.7 + structured outputs)
- [x] **Phase 4** — Quote engine + **real CVXPY SOR** (CLARABEL solver) + Wise-style breakdown + recharts pie
- [ ] Phase 5 — Smart contract escrow on BSC testnet
- [ ] Phase 3 — Document Intake Claude Vision (Feature 2)
- [ ] Phase 4 — Quote Engine + SOR CVXPY (Features 3 + 6)
- [ ] Phase 5 — Smart Contract Escrow on BSC testnet (Feature 4)
- [ ] Phase 6 — Dashboard + transaction detail (Feature 5)
- [ ] Phase 7 — Vue supplier + polish + seed + recording prep

### Phase 4 deliverables (reference) — Quote engine + SOR CVXPY

- **Manual setup once**: `cd services/sor && .venv/bin/pip install ecos clarabel` (CLARABEL ships with cvxpy now, ECOS as fallback). Run with `pnpm sor:dev` in a 2nd terminal during local dev.
- `services/sor/app.py` — full CVXPY solver. Switched from ECOS to **CLARABEL** because ECOS hits `user_limit` / `optimal_inaccurate` on 50M+ NGN targets due to the large-NGN × small-bps conditioning. CLARABEL is more numerically robust on this problem shape.
- Solver formulation: `minimize x@spreads + sum(alpha_i * quad_over_lin(x_i, depth_i))` s.t. `sum(x)=target, x<=depth, x<=max_share*target`. The cap is dropped when n=1 (else infeasible).
- `services/sor/tests/test_optimize.py` — 5 tests (health + 1-source + 2-source-cap + 3-source-beats-baseline + cap-only-when-multi). All pass in 0.8s.
- `apps/web/src/app/api/sources/[source]/quote/route.ts` — Route Handler serving 4 fake sources (`yellow_card`, `otc_desk_1`, `otc_desk_2`, `psp`). Deterministic per-minute seeded prices via FNV hash so demo is reproducible within the same minute.
- `apps/web/src/lib/quote/sources.ts` — generator with realistic NGN/USDT base + per-source spread/depth/alpha + small Gaussian-like noise.
- `apps/web/src/lib/quote/solver-fallback.ts` — TS greedy heuristic for when SOR Python service is unreachable (typically Vercel deploys, no Python runtime). Always feasible, deterministic, < 1ms.
- `apps/web/src/lib/quote/actions.ts#getQuote` — Server Action that orchestrates: parallel fetch of 4 sources → tries CVXPY (2s timeout) → falls back to TS greedy → composes breakdown (NGN paid → USDT held → CNY delivered with PSP rate, platform fee 50bps, off-ramp, network fees, savings vs SWIFT 7.5%) → persists `transactions.{amount_*, quote_breakdown, sor_allocation}` + 1 `sor_executions` row per source. The chosen engine (`cvxpy` or `greedy_fallback`) is surfaced to the UI.
- `apps/web/src/components/quote-breakdown-card.tsx` — Wise-style trio (NGN→USDT→CNY) with savings hero card, total cost, ETA, engine badge, collapsible cost breakdown. Tabular nums everywhere.
- `apps/web/src/components/sor-allocation-chart.tsx` — recharts donut + per-source legend with predicted slippage (bps) + delay (s). Engine badge (CVXPY emerald / Greedy amber). Total cost vs baseline shown.
- `apps/web/src/app/[locale]/transactions/[id]/page.tsx` — new transaction detail page (Phase 4 stub): header + parsed proforma summary + QuoteSection. Phase 6 will add timeline + tranches + audit log.
- `apps/web/src/app/[locale]/transactions/[id]/quote-section.tsx` — Client Component: NGN amount input pre-filled from proforma USD × spot, "Get quote" button, animated parsing state, hydrates initial state from persisted DB if present, "Continue to escrow" disabled (Phase 5).
- IntakeUploader CTA now redirects to `/transactions/[id]` instead of `/dashboard` so the flow is continuous.
- Recharts (`recharts@3.8.1`) added as dep.
- Full i18n FR/EN/zh under `quote` + `quote.breakdown` + `quote.sor` + `txDetail` namespaces.
- Validation: typecheck ✓, build ✓ (now 18 routes including `/{fr,en,zh}/transactions/[id]` and `/api/sources/[source]/quote`), end-to-end smoke test :
  - 4 source endpoints serve valid JSON with realistic prices
  - SOR `/optimize` returns optimal allocation (60% to deepest source as expected)
  - `/fr/transactions/[id]` renders Quote engine + Proforma extraite + counterparty card
  - vs-baseline savings 135 bps on a 47M NGN test allocation

### Phase 3 deliverables (reference) — Document intake Claude Vision

- **Manual user setup needed once**: add `ANTHROPIC_API_KEY` to `apps/web/.env.local` (and to Vercel env vars for prod). Set a $5 spend cap on console.anthropic.com → Settings → Limits.
- Stack: `@anthropic-ai/sdk@0.91.1` + `messages.parse()` + `zodOutputFormat()` for structured outputs (recommended path per the claude-api skill — auto-validates the response against the Zod schema, no manual JSON parsing).
- Model: **claude-opus-4-7** (skill default, non-negotiable). Cost ≈ $0.03–$0.06 per proforma parse (input $5/M + output $25/M, ~3-5k input + ~500-1.5k output).
- Cost containment: system prompt wrapped with `cache_control: { type: "ephemeral" }` (90% read price after first request); `max_tokens=4096` cap (proforma JSON is ≪ 2k tokens); 8 MB hard limit on file size; explicit MIME allowlist.
- Files :
  - `apps/web/src/lib/intake/schemas.ts` — Zod `ProformaInvoiceSchema` (`.nullable()` not `.optional()` to match structured-output strict shape).
  - `apps/web/src/lib/intake/anthropic.ts` — memoized server-only client; throws clear error if key missing.
  - `apps/web/src/lib/intake/actions.ts` — Server Action `parseProforma(formData)` : reads file → base64 → calls Claude → typed result on success, typed error union on failure (`NO_API_KEY` / `AUTH_ERROR` / `RATE_LIMIT` / `FILE_TOO_LARGE` / `UNSUPPORTED_TYPE` / `PARSE_ERROR` / `DB_ERROR` / `VALIDATION`). Returns parsed JSON + cost in USD + latency in ms.
  - `apps/web/src/app/[locale]/transactions/new/page.tsx` — Server Component, shows banner if no API key.
  - `apps/web/src/app/[locale]/transactions/new/intake-uploader.tsx` — Client Component, drag-drop zone + parsing state + animated result panel + error panel with hint per error code.
- UI : results panel uses `animate-fade-up` CSS animation (in `globals.css`, honors `prefers-reduced-motion`) to stagger field reveal. Confidence badge tone scales by score (≥ 0.9 emerald, ≥ 0.85 brand, < 0.85 amber + manual-review banner).
- DB : new transaction row inserted with `status='drafted'`, `seller_org_id` defaulted to seeded Yiwu supplier, `parsed_documents.proforma` hydrated. After parse, "Continue to quote engine" CTA pushes to `/dashboard` (no `/transactions/[id]` page yet — Phase 6).
- `db/schema.ts#ParsedProforma` relaxed to `?: T | null` to accept both seed style (sparse `undefined`) and Claude-parse style (full shape with `null` per structured-output spec).
- `samples/` directory created with a README; PDFs/JPEGs/PNGs/WebPs gitignored.
- Full i18n FR/EN/zh under `intake` + `intake.uploader` + `intake.result` namespaces.
- Validation: typecheck ✓, build ✓ (15 routes including `/{fr,en,zh}/transactions/new`), `/fr/transactions/new` returns 200 with all UI elements rendered (drop zone, formats, demo-mode banner since key not yet provided in `.env.local`).

### Phase 2 deliverables (reference) — KYB onboarding wizard

- **Manual user setup needed once**: run `supabase/migrations/0002_enable_realtime.sql` in the Supabase SQL Editor — `ALTER PUBLICATION supabase_realtime ADD TABLE kyb_applications, organizations, transactions, tranches;`. Without this, realtime subscriptions silently no-op.
- Pages :
  - `apps/web/src/app/[locale]/onboarding/page.tsx` — Server Component, hydrates wizard with current org's seeded values.
  - `apps/web/src/app/[locale]/onboarding/onboarding-wizard.tsx` — Client Component, 3-step wizard with progress bar, react-hook-form + Zod resolver.
- Form validation : `lib/kyb/schemas.ts` — `BusinessInfoSchema` with country-conditional rules (NG → CAC `RC-XXXXXXX` + BVN 11 digits ; CN → business license 15-18 chars).
- Server Action : `lib/kyb/actions.ts#submitKyb` — sets org `kyb_status='pending'`, inserts 3 `kyb_applications` rows (one per provider: smile_id, comply_advantage, tianyancha), then sequentially flips each to `approved` with a 1.2 s stagger (~3.6 s total, well under Vercel's 10 s function budget). Final org status = `approved`.
- Live verification panel : `components/kyb-live-status.tsx` — Client Component subscribes to `kyb_applications` via Supabase Realtime channel `kyb_org_${orgId}`, animates each provider badge from `Idle` → `Verifying…` → `Approved` as rows update.
- Step 2 docs upload is **simulated visually** (no Supabase Storage wiring) — fake `<FakeUpload>` button with 700 ms timeout. Production wiring deferred.
- Full i18n FR/EN/zh under `onboarding` namespace + `onboarding.providers` sub-namespace for the live panel.
- Validation: typecheck ✓, build ✓ (12 routes including `/{fr,en,zh}/onboarding`), `/fr/onboarding` returns 200 with all wizard step-1 fields rendered.

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
