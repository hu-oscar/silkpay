# Code Patterns

## Purpose

Implementation patterns the agent should follow for Yuán. Prefer these over inventing new ones.

## Architecture Pattern

- **Primary pattern:** **feature-based folder organization** with hexagonal boundaries.
  - `apps/web/src/features/<feature-name>/` holds UI + Server Actions + feature-local services.
  - `apps/web/src/server/services/` holds shared domain services (escrow, quote, kyb).
  - `services/<name>/` (Python) is its own bounded context per Modal app — no cross-import; all communication via HTTP + Pydantic schemas.
- **Rule:** keep domain logic separate from transport/UI. A Server Action calls a service; the service calls the repository or upstream client.
- **Rule:** reuse existing modules before creating new abstractions. Three similar lines is fine; don't pre-abstract.
- **Rule:** smart contracts have their own boundary — no JS/TS code references contract source; the TS layer talks to deployed addresses + ABIs only.

## Data Fetching

- **Primary approach:** **React Server Components + Server Actions** for mutations (no client-side query library by default).
- For realtime updates (transaction status, KYB status): **Supabase realtime channels** subscribed in client components.
- For Modal service calls from the Next.js app: server-side `fetch` from a Server Action or Route Handler — never from a Client Component.
- **Rule:** do not assume a specific data-fetching library; check `tech_stack.md` first.
- **Rule:** keep fetch logic out of render functions. Compose data in the Server Component then pass it down.

## State Management

- **Server state:** RSC + Supabase realtime; no `tanstack/query` unless a future feature genuinely needs it.
- **Client state:** React `useState` / `useReducer`. Reach for `zustand` only if state spans 3+ unrelated components.
- **Forms:** `react-hook-form` + Zod resolver.
- **Rule:** prefer the simplest working approach for MVP scope. Do not add a state library if RSC + a Server Action covers it.

## Error Handling

- **Normalize at boundaries.** Server Actions return a discriminated union `{ ok: true; data } | { ok: false; code; message }` — never throw to the client.
- **Never swallow errors.** Always log to Sentry with a `tags.surface` context (`"quote"`, `"kyb"`, `"escrow"`, `"intake"`).
- **User-safe messages in UI; developer context server-side.** No stack traces in user-visible copy.
- **Consistent error codes** across all API responses (`VALIDATION`, `UPSTREAM_TIMEOUT`, `QUOTE_INSUFFICIENT_LIQUIDITY`, `KYB_REJECTED`, `ESCROW_BLACKLISTED`, etc.).
- **Solidity:** custom errors only (`error TrancheNotReleasable();`); no `require(... , "string")`. Cheaper gas + better tooling.
- **Python services:** raise typed `modal.exception.Error("CODE")` for caller-facing failures; log structured (`event`, `tx_id`, `latency_ms`, `cost_usd`).

## Validation

- **Zod (TS) at every API boundary** — Server Actions, Route Handlers, form inputs, env-var parsing (use `zod` in `env.ts`).
- **Pydantic v2 (Py) for service I/O** — request + response models on every Modal endpoint.
- **Inside trusted internals (after the boundary):** trust types; do not re-validate.
- **Co-locate** validation rules with the contract: `quote-input.schema.ts` next to `getQuote()`.

## File and Naming Conventions

- **Files:** kebab-case (`quote-card.tsx`, `escrow-factory.sol`, `intake_parser.py`).
- **React components / Solidity contracts:** PascalCase.
- **Functions / variables:** camelCase (TS/JS), snake_case (Python).
- **Constants / env vars:** UPPER_SNAKE_CASE.
- **Test files:** colocated, suffix `.test.ts(x)` (Vitest), `_test.py` or `tests/test_*.py` (pytest), `*.t.sol` (Foundry).
- **Per-feature i18n keys:** `quote.youPay`, `quote.supplierGets`, `kyb.step.businessInfo` — namespaced, not flat.

## Testing Pattern

- **Unit tests** for pure logic + utilities.
- **Integration tests** for API contracts + critical data flows (esp. KYB → quote → funding pipeline).
- **E2E tests (Playwright)** only for top user journeys the PRD marks as must-have.
- **Foundry tests** for every contract: happy path + each dispute scenario + invariants. 100% branch coverage on `TradeEscrowModule` and `EscrowFactory`.
- **Run after every feature; fix failures before moving on.** See `testing.md`.

## Smart Contract Patterns (Solidity 0.8.24+)

- **Pull payment**, never push. `claim()` ledger pattern; the seller calls in to retrieve their funds.
- **CEI** (Checks-Effects-Interactions) ordering — state mutated before external calls. `ReentrancyGuard` on every state-changing external function.
- **EIP-712 typed signatures** for milestone attestations. Track nonces per arbiter. Bind to `chainId` + contract address.
- **Tether blacklist guard** (`IUSDT.isBlackListed(addr)`) immediately before any USDT transfer; revert with `TetherBlacklisted(account)` if hit; trigger compliance alert.
- **Custom errors only** — no string `require()` messages.
- **Events for every state transition** — `TrancheReleased(bytes32 indexed trancheId, uint256 amount)`, `DisputeRaised`, `DisputeResolved`, `EmergencyPaused`.
- **Factory pattern:** `EscrowFactory` deploys a Safe + attaches `TradeEscrowModule` per transaction. Storage-pack tranche structs.
- **Timelock 24h on admin upgrades** (module replacement, fee changes). No in-flight contract mutation.
- **Emergency pause** by compliance multi-sig (3-of-5), not single founder. Hardware-wallet only on mainnet.

## Python Service Patterns

- **One `modal.App` per service** under `services/<name>/app.py`.
- **`@modal.fastapi_endpoint(method=...)`** for HTTP endpoints; Pydantic models for request + response.
- **Hard timeouts on every endpoint** (`@app.function(timeout=30)`); the service is shorter-lived than the user-facing request.
- **Cost cap per request** — log + raise if a single request goes over budget (e.g., $0.20 for an intake call). Defensive, not predictive.
- **Structured logging** — `event`, `tx_id`, `latency_ms`, `cost_usd`, `source`. Never log document content (PII).
- **Async I/O via `asyncio.gather`** for the 3 sources in the quote engine; per-source `timeout=2.5s`. If <2 sources respond, fail with `QUOTE_INSUFFICIENT_LIQUIDITY`.
- **Secrets via `modal.Secret.from_name(...)`** — never inline.
- **Warm-pool config** (`@app.function(min_containers=1)`) on hot endpoints (quote) to mitigate cold start.

## Frontend Patterns (Next.js 15 App Router)

- **Server Components by default.** Add `"use client"` only when you need interactivity, browser APIs, or realtime subscriptions.
- **Server Actions for mutations.** Validate input with Zod in the action; return discriminated-union result.
- **shadcn/ui + Radix primitives** for all interactive components — accessible by default. Do not roll custom modals/popovers.
- **Tailwind utility classes** — design tokens come from `tailwind.config.ts`. No arbitrary values like `text-[#ff0000]`.
- **`Intl.NumberFormat`** + `font-feature-settings: "tnum"` on every amount.
- **Skeleton loaders** (`shadcn/ui Skeleton`) for any data-fetching surface; PWA offline cache for the transaction list.
- **`next-intl`** with FR / EN / 中文; locale-prefixed routes (`/fr/dashboard`, `/zh/dashboard`).
- **No client-side data fetching libraries** unless a feature can't use RSC. Then justify in `MEMORY.md`.
- **Optimistic UI** on actions like "Acknowledge BL" or "Approve inspection," with rollback if the on-chain confirmation fails.

## Change Discipline

- **Focused, minimal edits** over large rewrites. Three similar lines beats a premature abstraction.
- **No new dependencies** without checking `tech_stack.md` first; prefer native `fetch` over `axios`, native `Intl` over `date-fns`/`numeral`.
- **No DB migrations, infra config, auth flows, or smart contract changes** without explicit approval.
- **One feature at a time.** Commit / checkpoint after each working feature with a conventional commit message.
- **Update `MEMORY.md`** with any new architectural decision in the same session — do not batch.
