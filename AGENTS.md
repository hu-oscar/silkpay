# AGENTS.md — Master Plan for Silkpay

## Project Overview & Stack

**App:** Silkpay — _"Pay China like it's next door."_

**Overview:** B2B cross-border payment platform for the Africa–China trade corridor (single corridor V1: Lagos ↔ Yiwu/Shenzhen). Combines stablecoin rails (USDT BEP-20), 3-tranche programmable escrow, smart order routing across NGN→USDT liquidity sources, and AI document intake (Claude Vision) so SME importers like "Chinedu" can settle a $30k order to China in T+0 with full counterparty protection — vs. 5–7% friction and 3–5 days via SWIFT. Primary users: Nigerian importers (FR/EN, mobile-first PWA + WhatsApp) and Chinese suppliers (中文, email + WeChat msg V1, Mini Program V2).

**Stack:**

- **Frontend:** Next.js 15 (App Router) + TypeScript strict + Tailwind + shadcn/ui + next-intl (FR/EN/中文)
- **Auth:** Clerk (organizations enabled) — Supabase Auth as Year-2 fallback
- **Backend:** Supabase (Postgres + Storage + Realtime + Vault) + FastAPI on Modal (Python services)
- **Smart contracts:** Solidity 0.8.24+ with Foundry, BNB Chain mainnet primary V1 (USDT BEP-20), Safe multi-sig 3-of-5 + custom `TradeEscrowModule`
- **AI / LLM:** Anthropic Claude Sonnet (vision OCR for proforma/BL/packing list/PO + agent orchestration)
- **SOR / Optimization:** Python + CVXPY (ECOS solver) + XGBoost on Modal endpoints
- **Async / workers:** Inngest (event-driven pipelines: intake → risk → quote → execute → settle)
- **Account abstraction:** Pimlico SDK (ERC-4337) — smart accounts deployed on-demand
- **Notifications:** Twilio WhatsApp Business + Resend email + WeChat Work bot (V1)
- **Monitoring:** Tenderly (on-chain) + Sentry (app) + Posthog (product analytics)
- **Compliance:** Smile ID (KYC Nigeria + BVN match) + ComplyAdvantage (sanctions/PEP) + Tianyancha (China business registry)

**Critical Constraints:**

- **Mobile-first low-bandwidth required** (3G Lagos baseline; payload <50KB per route, Lighthouse mobile >90).
- **Strict TypeScript** — no `any` (use `unknown` + type guards); Zod schemas at every API boundary.
- **Bilinguisme natif** (FR/EN/中文) — not a language toggle, real i18n with next-intl + locale-aware `Intl.NumberFormat`.
- **Smart contract audit non-negotiable pre-mainnet** — Hacken or Cyfrin ($50–80k) + Code4rena 7-day contest in parallel.
- **No placeholder content in production** — no Lorem ipsum, no fake testimonials, no half-working features.
- **Single corridor V1** — Lagos ↔ Yiwu/Shenzhen only. No multi-corridor refactor until 100+ active Lagos importers.
- **Solo founder build, 90-day MVP timeline** — every feature must serve the pitch _"single corridor, real transactions, real economics."_

## Setup & Commands

Execute these commands for standard development workflows. The repo is a `pnpm` monorepo (Turborepo) with `apps/web`, `apps/contracts`, `services/sor`, `services/intake`, `services/quote`, `packages/shared`, `packages/types`.

- **Install:** `pnpm install`
- **Frontend dev:** `pnpm --filter web dev` (Next.js on :3000)
- **Frontend build:** `pnpm --filter web build`
- **Lint / format:** `pnpm lint` (ESLint + Prettier)
- **Typecheck:** `pnpm typecheck` (or `tsc --noEmit` per package)
- **Frontend tests:** `pnpm --filter web test` (Vitest unit) / `pnpm --filter web test:e2e` (Playwright)
- **Smart contracts:** `cd apps/contracts && forge test -vvv` / `forge coverage` / `forge script script/Deploy.s.sol --rpc-url $BSC_TESTNET_RPC --broadcast`
- **Python services:** `cd services/<name> && pytest -q` (unit) / `modal serve app.py` (local dev) / `modal deploy app.py` (push)
- **DB migrations:** Supabase CLI (`supabase db push` against staging first, then prod)

## Protected Areas

Do NOT modify these without explicit human approval:

- **Smart contracts in `apps/contracts/src/`** once a tagged audit version exists — any change forces re-audit. Patch via new versioned contract + migration plan.
- **Multi-sig admin keys + Safe configs** (3-of-5 hardware-wallet only). Never propose single-EOA admin paths.
- **Existing Supabase migrations** in `supabase/migrations/` — additive migrations only; never edit historical files.
- **Compliance / KYB provider configs** (Smile ID, ComplyAdvantage, Tianyancha API keys + webhook signatures) — these are regulator-visible.
- **Payment gateway / on-ramp integrations** (Yellow Card, OTC desks, PSP partner) — credentials and rate-limits are contractual.
- **Auth setup (Clerk webhooks + organization sync)** — flag any change for review.
- **`.github/workflows/`** and any deploy/CI infrastructure.
- **Branch `main`** — never force-push. Protected via GitHub branch protection.

## Coding Conventions

- **Formatting:** ESLint + Prettier strict; no warnings allowed in new code. Commit hooks enforce.
- **TypeScript:** strict mode; `any` is forbidden — use `unknown` with type guards or precise interfaces. All function params + returns typed.
- **Validation:** Zod schemas at every boundary (API routes, Server Actions, form inputs, env vars). Pydantic for Python service I/O.
- **Architecture:** feature-based folder organization. Hexagonal boundaries — domain logic must not depend on transport/UI frameworks.
  - Routes / Server Actions handle request/response only; business logic lives in `services/` or `core/`.
  - No DB calls from route handlers — go through a repository or service layer.
- **Solidity:** `ReentrancyGuard` everywhere; pull-payment (never auto-push); EIP-712 typed signatures for state-changing actions; NatSpec docstrings on every public/external function; Tether blacklist check before any USDT transfer.
- **Testing expectations:**
  - All new utilities → unit tests (Vitest / pytest).
  - Core user flows → integration / E2E tests (Playwright).
  - Smart contracts → 100% branch coverage Foundry + invariant tests + Slither + Mythril.
- **Naming:** files kebab-case; React components PascalCase; functions/vars camelCase; constants/env UPPER_SNAKE_CASE.
- **i18n:** every user-facing string lives in `apps/web/messages/{en,fr,zh}.json`. No hardcoded copy.
- **Numbers:** all amount displays use `font-feature-settings: "tnum"`; format via `Intl.NumberFormat` with locale + currency.

## Agent Behaviors

These rules apply across all AI coding assistants (Claude Code, Cursor, Copilot, Gemini):

1. **Plan Before Execution:** ALWAYS propose a brief step-by-step plan before changing more than one file. For Solidity / SOR / ML code, propose architecture + invariants and wait for human approval before generating implementation.
2. **Refactor Over Rewrite:** Prefer incremental refactors of existing functions over wholesale rewrites of large blocks.
3. **Context Compaction:** Persist state to `MEMORY.md` (or a `spec.md` per feature) instead of filling chat history during long sessions.
4. **Iterative Verification:** Run lint + typecheck + relevant tests after each logical change. Fix failures before proceeding.
5. **Read First:** Always read `AGENTS.md` and `agent_docs/` before starting a task. Refer to `agent_docs/tech_stack.md` for dependencies before suggesting a new library.
6. **No Hallucinated Solidity:** AI-generated Solidity edge cases must pass Foundry tests + invariants + Slither + manual review before any testnet deploy. Never deploy to mainnet without a completed audit.
7. **Cite Files + Reasons:** When editing, name the file and the reason. Flag security implications proactively.
8. **One Feature at a Time:** Commit / checkpoint after each working feature. Don't bundle unrelated changes.

## How I Should Think

1. **Understand intent first** — identify what the user actually needs before answering.
2. **Ask if unsure** — if critical info is missing, ask one specific question before proceeding.
3. **Plan before coding** — propose a plan, get approval, then implement.
4. **Verify after changes** — run tests/linters or manual checks; report what passed/failed.
5. **Explain trade-offs** — when recommending an approach, mention the alternative and why this one wins.

## Plan → Execute → Verify (required)

- **Plan:** outline a brief approach and ask for approval before coding.
- **Plan Mode:** if the tool supports it (Claude Code plan mode, Cursor reflect), use it.
- **Execute:** implement one feature at a time.
- **Verify:** run tests / linters / Foundry / forge invariants / mobile lighthouse after each feature; fix before moving on.

## What NOT To Do

- Do **NOT** delete files without explicit confirmation.
- Do **NOT** modify database schemas without a backup + rollback plan.
- Do **NOT** add features outside the current phase scope (V1 = single corridor Lagos↔Yiwu, P0 features 1–6 only).
- Do **NOT** skip tests for "simple" changes — Solidity especially.
- Do **NOT** bypass failing pre-commit hooks (`--no-verify`) without asking the human.
- Do **NOT** introduce deprecated libraries; check `agent_docs/tech_stack.md` first.
- Do **NOT** put marketing copy mentioning "AI" or "ML" without auditable backing.
- Do **NOT** hardcode colors / spacings — design tokens via Tailwind config only.
- Do **NOT** push secrets; rotate dev keys weekly.

## Engineering Constraints (Anti-Vibe)

### Type Safety (no compromises)

- `any` is **forbidden** — use `unknown` with type guards.
- All function parameters and returns typed.
- Zod (TS) / Pydantic (Py) for runtime validation at every boundary.

### Architectural Sovereignty

- Routes / controllers handle request/response only.
- All business logic in `services/` or `core/`.
- No DB calls from route handlers.

### Library Governance

- Check `package.json` / `pyproject.toml` before suggesting new dependencies.
- Prefer native APIs over libraries (`fetch` over `axios`).
- Use the project's standard data-fetching approach as specified in `agent_docs/tech_stack.md` (RSC + Server Actions, Supabase realtime subscriptions for live data — no extra query lib).

### Workflow Discipline

- Pre-commit hooks must pass (or ask if they should be bypassed).
- If verification fails, fix issues before continuing.
- One specific clarifying question if context is missing — then proceed.

## Active Phase

See `MEMORY.md` for the current task and next steps. Update `MEMORY.md` after every milestone, structural change, or resolved bug.

## Documentation Index

- `agent_docs/project_brief.md` — vision, conventions, key principles
- `agent_docs/tech_stack.md` — full dependency list + setup commands + canonical examples
- `agent_docs/code_patterns.md` — architecture / data-fetching / state / error handling / validation patterns
- `agent_docs/product_requirements.md` — full PRD distilled (features, user stories, success metrics)
- `agent_docs/testing.md` — test frameworks, coverage rules, verification loop
