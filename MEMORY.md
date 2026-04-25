# System Memory & Context 🧠

<!--
AGENTS: Update this file after every major milestone, structural change, or resolved bug.
DO NOT delete historical context if it is still relevant. Compress older completed items.
-->

## 🏗️ Active Phase & Goal

**Current Phase:** Phase 1 — DB Supabase + auth Clerk (hackathon plan, Option B)

**Current Task:** Wire Supabase project + Clerk org sync + RLS policies before touching feature code.

**Next Steps:**
1. Create Supabase project (free tier) — capture URL + anon key + service role key into `.env.local`.
2. Create Clerk dev app with organizations enabled — capture publishable + secret + webhook signing keys.
3. Push Supabase migration with full schema from Tech Design (`organizations`, `kyb_applications`, `transactions`, `tranches`, `audit_events`, `sor_executions`) + RLS policies.
4. Implement Clerk webhook `/api/webhooks/clerk` that upserts `organizations` row on user/org sign-up.
5. Add layout chrome (nav top + UserButton) and wire RLS-protected query that lists current user's transactions.

**Phase 1 exit criteria:**
- Sign-up Clerk creates an `organizations` row (with `clerk_org_id`).
- `select * from transactions` is RLS-filtered (returns empty for fresh user).
- Landing now renders inside the authenticated layout with user menu.

## 📂 Architectural Decisions

*(Log specific choices made during the build here so future agents respect them. Dates are absolute — no relative dates.)*

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

*(Log current bugs or weird workarounds here. Empty at project init.)*

- **Modal cold start** can hit 3–5s on first request. Mitigation plan: warm-pool config in Modal app + Vercel edge function for the hot `quote` endpoint. Re-evaluate post-launch with real latency telemetry.
- **CVXPY** is sensitive to non-DCP formulations — AI-generated solver code often compiles but fails to actually minimize. Validate every problem with numeric tests on known cases (use `quad_over_lin`, not raw `power`, for slippage approximations).
- **WhatsApp Business templates** require Meta approval (1–2 weeks). Submit early; do not block launch on this.

## 📜 Completed Phases (Hackathon track — Option B)

- [x] **Phase 0** — Scaffolding monorepo (pnpm + Next.js 16 + Foundry + Python venv + Husky)
- [ ] Phase 1 — DB Supabase + auth Clerk
- [ ] Phase 2 — KYB onboarding (Feature 1)
- [ ] Phase 3 — Document Intake Claude Vision (Feature 2)
- [ ] Phase 4 — Quote Engine + SOR CVXPY (Features 3 + 6)
- [ ] Phase 5 — Smart Contract Escrow on BSC testnet (Feature 4)
- [ ] Phase 6 — Dashboard + transaction detail (Feature 5)
- [ ] Phase 7 — Vue supplier + polish + seed + recording prep

### Phase 0 deliverables (reference)
- Monorepo: `pnpm-workspace.yaml`, `turbo.json`, root `package.json` with scripts.
- `apps/web` — Next.js **16.2.4** (note: bumped from "Next.js 15" in original Tech Design — 16 is now latest stable, App Router unchanged) + Tailwind v4 + TS strict + next-intl 4.x with FR/EN/zh locales (locale-prefixed routes), Anthropic SDK, Zod, react-hook-form, lucide-react, tailwind-merge.
- `apps/contracts` — Foundry + OpenZeppelin; `solc 0.8.24`; sanity test passes.
- `services/sor` — Python 3.12 venv with `cvxpy + fastapi + uvicorn + pydantic + numpy + pytest`; `/health` endpoint + pytest passing.
- Pre-commit hook (`.husky/pre-commit`): lint-staged + conditional typecheck/lint/forge/pytest based on changed paths.
