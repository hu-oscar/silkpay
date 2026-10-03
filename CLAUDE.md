# CLAUDE.md — Claude Code Configuration for Silkpay

## Project Context

- **App:** Silkpay — _"Pay China like it's next door."_
- **Stack:** Next.js 15 (App Router) + TypeScript strict + shadcn/ui + Tailwind + next-intl (FR/EN/中文); Clerk auth; Supabase Postgres + Storage + Realtime + Vault; FastAPI on Modal (Python); Solidity 0.8.24+ with Foundry on BNB Chain; Anthropic Claude Sonnet (vision); CVXPY + XGBoost on Modal; Inngest for events; Tenderly + Sentry + Posthog.
- **Stage:** MVP development — Phase 1 (project setup + Foundry ramp-up). 90-day solo build with heavy AI assistance.
- **User level:** B (Developer) — Oscar has full-stack + smart contract + quant background. Skip beginner-level explanations; assume Solidity / CVXPY / Modal / Next.js 15 fluency.

## Directives

1. **Master plan:** ALWAYS read `AGENTS.md` first for current phase, conventions, protected areas, and agent behaviors. Then check `MEMORY.md` for active task and recent decisions.
2. **Documentation:** Refer to `agent_docs/` for tech stack details (`tech_stack.md`), implementation patterns (`code_patterns.md`), product scope (`product_requirements.md`), and the verification loop (`testing.md`).
3. **Plan-first:** For any change touching > 1 file (or any Solidity / SOR / ML code regardless of file count), propose a brief plan + invariants and wait for approval before generating implementation. Use Plan Mode.
4. **Incremental build:** One small feature at a time. Commit after each working feature with a conventional message. Test frequently — see `testing.md`.
5. **Verification loop (mandatory):** After each logical change run, in order: `pnpm lint` → `pnpm typecheck` → targeted unit tests → (if contracts touched) `forge test` + `forge coverage` + `slither .` → (if UI touched) walk the golden path in dev. Update `MEMORY.md` if a new architectural decision was made.
6. **Pre-commit:** Hooks enforce lint + typecheck + targeted tests. If a hook fails, fix the issue, re-stage, create a NEW commit. Never `--amend` past a hook failure.
7. **No linting commentary:** do not act as a linter — run `pnpm lint` and report failures.
8. **Communication:** be concise. Cite the file you're editing and why. Flag security implications proactively (especially Solidity, USDT blacklist, Tether freeze paths, multi-sig admin actions).
9. **Read before recommending:** before suggesting a library, check `agent_docs/tech_stack.md`. Before suggesting a pattern, check `agent_docs/code_patterns.md`. Before adding a feature, check `agent_docs/product_requirements.md` (V1 = features 1–6 only; everything else is V2+).

## Hard Constraints

- **`any` is forbidden** in TypeScript — use `unknown` + type guards.
- **No DB calls from route handlers** — go through a service layer.
- **No mainnet smart-contract deploy** without a completed Hacken/Cyfrin audit + Code4rena contest.
- **No marketing copy** referencing "AI" or "ML" without auditable backing.
- **No bypassing pre-commit hooks** with `--no-verify` without explicit human approval.
- **No editing of `apps/contracts/src/`** once a tagged audit version exists; patch via new versioned contract.
- **No adding features outside V1 scope** (single corridor Lagos↔Yiwu, P0 features 1–6).
- **No placeholder content** (Lorem ipsum, fake testimonials, sample images) in any code that ships.

## Useful Subagents

This codebase benefits from delegating to subagents for:

- **Explore (codebase search)** — when you need to find files / patterns across the monorepo.
- **Plan (architecture design)** — when designing the architecture for a complex feature (escrow refactor, SOR formulation change).
- **general-purpose (multi-step research)** — when investigating an unfamiliar library or upstream API.

Trust-but-verify subagent results: an agent's summary describes intent, not necessarily what it did — read the diff before reporting.

## Commands

| Purpose           | Command                                                |
| ----------------- | ------------------------------------------------------ |
| Install           | `pnpm install`                                         |
| Dev (web)         | `pnpm --filter web dev`                                |
| Build (web)       | `pnpm --filter web build`                              |
| Lint              | `pnpm lint`                                            |
| Typecheck         | `pnpm typecheck`                                       |
| Unit tests (web)  | `pnpm --filter web test`                               |
| E2E (Playwright)  | `pnpm --filter web test:e2e`                           |
| Foundry tests     | `cd apps/contracts && forge test -vvv`                 |
| Foundry coverage  | `cd apps/contracts && forge coverage`                  |
| Slither           | `cd apps/contracts && slither . --filter-paths "lib/"` |
| Python tests      | `cd services/<name> && pytest -q`                      |
| Modal local dev   | `cd services/<name> && modal serve app.py`             |
| Modal deploy      | `cd services/<name> && modal deploy app.py`            |
| DB migration push | `supabase db push`                                     |

## Pointers

- `AGENTS.md` — universal master plan (read first).
- `MEMORY.md` — active phase, decisions log, known issues (update after milestones).
- `agent_docs/project_brief.md` — vision + conventions + key principles.
- `agent_docs/tech_stack.md` — full deps + setup commands + canonical examples.
- `agent_docs/code_patterns.md` — architecture / data fetching / state / errors / Solidity / Python / Next.js patterns.
- `agent_docs/product_requirements.md` — distilled PRD (features, user stories, success metrics, V1 scope boundary).
- `agent_docs/testing.md` — frameworks, coverage, verification loop.
