# Project Brief (Persistent)

- **Product vision:** Yuán is the first AI-native, escrow-protected stablecoin payment rail purpose-built for the Africa–China SME trade corridor — *"Pay China like it's next door."* V1 collapses 5–7% SWIFT friction and 3–5 day delays into a transparent, T+0, programmable settlement (USDT BEP-20 + 3-tranche Safe escrow), starting with the single Lagos↔Yiwu/Shenzhen corridor.
- **Target audience:**
  - Primary — *Chinedu*, ~32yo Nigerian importer in Computer Village (Ikeja, Lagos), ~$400k/yr in 12–15 transactions of $20k–$50k. Mobile-first Android, WhatsApp-native, not crypto-native.
  - Secondary — *Mr. Chen*, Yiwu/Shenzhen wholesaler, WeChat + Alipay native, limited business English, needs CNY clean settlement on a domestic Chinese bank account before he ships.
- **Core value pitch:** *"Save $1,700 on your next $30k order to China — with escrow protection your supplier respects."*

## Conventions

- **Files:** kebab-case (`quote-card.tsx`, `escrow-factory.sol`, `intake_parser.py`).
- **React components / Solidity contracts:** PascalCase.
- **Functions / variables:** camelCase (TS/JS), snake_case (Python).
- **Constants / env vars:** UPPER_SNAKE_CASE.
- **File structure:** colocate tests with implementation (`Button.tsx` next to `Button.test.tsx`); one feature = one folder under `apps/web/src/features/<feature-name>/`.
- **Imports:** absolute via `@/` alias in `apps/web`; relative in services.
- **Numbers in UI:** `Intl.NumberFormat` with the user's locale + `font-feature-settings: "tnum"` always on amount displays.
- **Strings:** every user-facing string in `messages/{en,fr,zh}.json`; no inline copy.
- **Solidity:** NatSpec docstrings on every public/external function; one contract per file; tests in `apps/contracts/test/<Contract>.t.sol`.
- **Python:** type hints strict, `mypy --strict` clean; Pydantic v2 models for all I/O; `ruff` for lint+format.
- **Commits:** conventional commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`); one logical change per commit.

## Quality Gates

- ESLint + Prettier + Vitest (frontend) — zero warnings in new code.
- `tsc --noEmit` — zero errors; `any` is forbidden.
- `forge test` 100% branch coverage on escrow contracts; invariants ≥10k runs; Slither + Mythril clean.
- Pre-commit hooks: lint + typecheck + targeted unit tests must pass.
- Lighthouse mobile ≥ 90 on landing + dashboard.
- Code review: even solo, auto-review own PRs 24h after writing before merging non-trivial changes.

## Key Commands

| Purpose | Command |
|---|---|
| Install | `pnpm install` |
| Dev (web) | `pnpm --filter web dev` |
| Build (web) | `pnpm --filter web build` |
| Lint | `pnpm lint` |
| Typecheck | `pnpm typecheck` |
| Unit tests (web) | `pnpm --filter web test` |
| E2E tests | `pnpm --filter web test:e2e` |
| Foundry tests | `cd apps/contracts && forge test -vvv` |
| Foundry coverage | `cd apps/contracts && forge coverage` |
| Python tests | `cd services/<name> && pytest -q` |
| Modal deploy | `cd services/<name> && modal deploy app.py` |
| DB migration push | `supabase db push` |

## Key Principles

- **Ship the simplest thing that solves the user story.** If a low-code integration covers it (e.g., Stripe Checkout instead of a custom form), use it. Yuán's exception: anything that touches funds movement is custom + audited.
- **Transparence radicale.** Every cost line item visible in the UI; every comparison vs. SWIFT is real, not marketing.
- **Mobile-first low-bandwidth.** 3G Lagos is the baseline device, not a "later" optimization. Skeleton loaders, optimistic UI, lazy WebP/AVIF, payload <50KB per route.
- **Tests live with code, not after.** Especially Solidity: `forge test` runs as you write the contract.
- **One feature complete > five half-features.** Cut scope before cutting quality.
- **Audit-grade discipline on smart contracts.** No mainnet without Hacken/Cyfrin sign-off + Code4rena contest. Multi-sig 3-of-5 hardware-wallets only on admin keys.
- **AI does the bulk; you own the architecture.** Plan invariants and architecture by hand; let Claude/Cursor write the code; review it like a senior reviewer would.

## Update Cadence

- Refresh this brief whenever a phase advances, a tool changes, or a convention is overruled.
- Refresh `MEMORY.md` after every milestone, new architectural decision, or resolved bug — same session, do not batch.
- The original PRD and Tech Design in `docs/` are immutable references; if reality drifts, write a follow-up doc rather than editing them.
