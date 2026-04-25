# Testing Strategy

## Frameworks

| Layer | Framework | Where |
|---|---|---|
| **Unit (frontend)** | Vitest + `@testing-library/react` | `apps/web/**/*.test.ts(x)` |
| **E2E (frontend)** | Playwright | `apps/web/e2e/*.spec.ts` |
| **Smart contracts** | Foundry (`forge test`) — unit + invariant + fuzz | `apps/contracts/test/**/*.t.sol` |
| **Static analysis (Solidity)** | Slither + Mythril | CI on every PR touching `apps/contracts/` |
| **Python services** | `pytest` + `pytest-asyncio` | `services/<name>/tests/*.py` |
| **Pydantic / Zod schemas** | Property-based via `hypothesis` (Py) / fuzz inputs (TS) | service-local |
| **Manual** | Mobile Lighthouse + 3G throttle in Chrome DevTools | pre-merge for any UI change |

## Coverage Targets

- **Smart contracts:** **100% branch coverage** on `TradeEscrowModule` + `EscrowFactory`. Invariant suite ≥ 10k runs without break. Anything less = blocker for testnet deploy.
- **SOR solver (CVXPY):** 100% on the optimization formulation; numeric tests against known closed-form cases. ML model: hold-out MAE reported in every retraining PR.
- **Frontend critical paths:** ≥ 80% on KYB onboarding, transaction creation, quote, dashboard. E2E covers the top 5 user journeys from the PRD.
- **Python services:** ≥ 80% on parsing + orchestration logic.

## Rules & Requirements

- **NEVER skip tests or mock out assertions** to make a pipeline pass without explicit human approval. If an agent breaks a test, the agent must fix it (or escalate).
- **No `any` types in test code either** — type your fixtures.
- **Pre-commit hooks** (Husky + lint-staged) run lint + typecheck + targeted unit tests on staged files. Do not bypass with `--no-verify` without asking.
- **Foundry invariants** must include at minimum:
  - `sum(tranche.amount where status=Released) + sum(where status=Refunded) <= total deposited`
  - No reentrancy on `claim()` (simulated reentrant token).
  - Tether blacklist freeze path is reachable and reversible only by compliance multi-sig.
  - Timeout refund cannot be triggered before deadline.
- **Synthetic data tests for SOR:** generate 100 random scenarios; assert ML solver beats baseline rule-based on average AND is no worse than baseline at the worst case.
- **Mobile testing (manual):** every PR with UI changes verified on Chrome Android + Safari iOS, 3G throttled, before merge. Lighthouse mobile ≥ 90 on landing + dashboard.
- **WhatsApp / Resend / WeChat notification flows:** integration-tested against sandbox accounts before each milestone deploy.

## Verification Loop (Plan → Execute → Verify)

After every feature or logical change, run in this order; do not advance until each is green:

1. `pnpm lint`
2. `pnpm typecheck`
3. Targeted unit tests (`pnpm --filter <pkg> test` or `pytest -q` or `forge test --match-contract X`)
4. If contracts changed: `forge coverage` + `slither .` + Mythril spot-check
5. If UI changed: open the page in dev, walk the golden path + at least one edge case
6. Update `MEMORY.md` (decisions, known issues)
7. Commit (pre-commit hooks re-validate the above on staged files)

## Execution

| Goal | Command |
|---|---|
| All TS unit tests | `pnpm test` |
| Single TS test file | `pnpm --filter web test src/components/quote-card.test.tsx` |
| All E2E | `pnpm --filter web test:e2e` |
| Single E2E spec | `pnpm --filter web test:e2e e2e/onboarding.spec.ts` |
| All Foundry tests | `cd apps/contracts && forge test -vvv` |
| One Foundry contract | `cd apps/contracts && forge test --match-contract TradeEscrowModuleTest -vvv` |
| Foundry invariants | `cd apps/contracts && forge test --match-contract Invariant -vvv` |
| Foundry coverage | `cd apps/contracts && forge coverage` |
| Slither | `cd apps/contracts && slither . --filter-paths "lib/"` |
| All Python unit tests (one service) | `cd services/intake && pytest -q` |
| One pytest file | `cd services/intake && pytest tests/test_parser.py -q` |
| Mobile Lighthouse (CI) | `pnpm --filter web lighthouse:mobile` |

## Pre-Commit Hooks (`.husky/pre-commit`)

```sh
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

pnpm lint-staged          # lint + format staged files
pnpm typecheck            # block any TS error
pnpm --filter web test --run --changed   # run only tests touching changed files
```

If a hook fails, **fix the issue, re-stage, create a NEW commit** — never `--amend` past a hook failure (the prior commit didn't happen).

## CI (GitHub Actions)

- `pr.yml` — lint + typecheck + unit tests + Vercel preview deploy on every PR.
- `main.yml` — full E2E + Vercel prod deploy + `modal deploy` for each service.
- `contracts.yml` — `forge test`, coverage, Slither, Mythril on PRs touching `apps/contracts/`. Blocks merge on any high/medium finding.

## What NOT To Do

- Do not delete or skip an unrelated failing test to ship your feature. Surface it; fix it or open a bug.
- Do not use mocks for the on-chain integration tests on the audit-critical path — fork BSC mainnet via Foundry instead.
- Do not mark a feature complete without a green run of the verification loop AND a `MEMORY.md` update.
