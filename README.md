# Silkpay

> Cross-border B2B payments for the Africa ↔ China corridor — escrowed in USDT on whichever chain the router picks (cost / liquidity / finality optimised), routed through a CVXPY smart-order-router, and onboarded with KYB + AI document parsing.

---

## What's in this repo

Monorepo (`pnpm` + `turbo`). Three apps, one shared scaffold.

| Path                                  | What it is                                                                                                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`                            | Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + next-intl (FR/EN/zh). All the user-facing flows.                                                                                                               |
| `apps/contracts`                      | Foundry + Solidity 0.8.24. `TradeEscrow.sol` (single-arbiter EOA escrow). Chain-agnostic — currently deployed to Sepolia for the hackathon demo (faucet-friendly); production targets the chain the SOR selects per route. |
| `services/sor`                        | FastAPI + CVXPY (CLARABEL solver) + XGBoost. Smart-order-router that splits a local-currency→USDT order across multiple liquidity sources to minimize slippage. Deployed on Modal.                                         |
| `supabase/`                           | Postgres schema migrations + Realtime publication.                                                                                                                                                                         |
| `samples/`                            | Sample proforma invoices for the document-intake demo (gitignored).                                                                                                                                                        |
| `agent_docs/`                         | Internal docs (tech stack, code patterns, product requirements, testing).                                                                                                                                                  |
| `AGENTS.md`, `MEMORY.md`, `CLAUDE.md` | Source of truth for the AI-assisted build workflow.                                                                                                                                                                        |

---

## What's built

1. **Auth & dashboard** — cookie-based user switcher (Chinedu importer / Mr. Chen supplier / Silkpay arbiter), KPIs (saved vs SWIFT, active, settled), localized nav. Real Supabase Postgres backend.
2. **KYB onboarding** — 3-step wizard with country-conditional Zod validation (African registries — e.g. CAC + BVN for NG — and Chinese business license). **Live verification panel** subscribes via Supabase Realtime — Smile ID / ComplyAdvantage / Tianyancha badges animate from `Idle → Verifying → Approved` as the server flips rows.
3. **Document intake (Claude Vision)** — drag-drop a proforma invoice (PDF/JPEG/PNG/WebP, 8 MB cap), parsed by `claude-opus-4-7` via `messages.parse()` + `zodOutputFormat()`. Cached system prompt (`cache_control: ephemeral`) keeps cost ≈ $0.03–0.06/parse. Confidence-graded result panel + manual-review banner < 0.85.
4. **Quote engine + SOR** — fans out to 4 liquidity sources (Yellow Card, 2 OTC desks, PSP for the USDT→CNY leg) in parallel, hits the FastAPI/CVXPY solver, returns a Wise-style breakdown (local currency paid → USDT held → CNY delivered, fees, savings vs 7.5% SWIFT) + recharts donut of the source allocation. TS greedy fallback when the Python service is unreachable (e.g. Vercel).
5. **Escrow (chain-agnostic, Sepolia for the demo)** — `TradeEscrow.sol` with pull-payment semantics, Tether blacklist guard before every USDT transfer. Tranche state machine: `Quoted → Funded → Attested → Claimed`. `syncTransactionStatus` auto-claims tranches stuck at `Attested`. Sepolia chosen for the demo because faucets are permissive; the contract has no chain-specific assumptions.
6. **Transaction detail + timeline** — proforma summary, quote breakdown, tranche list with status chips, audit-event timeline, terminal-positive states.
7. **SOR ML calibration** — XGBoost slippage model trained on scraped public P2P data (Binance/Bybit/OKX, NGN/USDT, 6–12 mo) + synthetic generator. Predictions feed the CVXPY `quad_over_lin` slippage term. Rule-based fallback when ML diverges > 50 bps from baseline. **Deployed on Modal**, hot endpoint warmed via `keep_warm`.
8. **Agent-style action stream** — auto-quote on amount change, live action log surfaced in the UI for the demo.

---

## Stack

- **Frontend** — Next.js 16 (App Router) · TypeScript strict (no `any`) · Tailwind v4 · shadcn/ui · next-intl 4.x (FR/EN/zh) · react-hook-form + Zod · recharts · lucide-react.
- **Backend (Next.js)** — Server Actions only. No DB calls from route handlers. `@supabase/ssr` + `@supabase/supabase-js`.
- **Database** — Supabase Postgres + Realtime (Storage + Vault deferred to V1 prod).
- **Smart contracts** — Foundry, Solidity 0.8.24, OpenZeppelin. Chain-agnostic; the demo runs on Sepolia (faucet-friendly). The SOR picks the chain per route in production. Single-arbiter EOA for hackathon; Safe 3-of-5 multi-sig is the V1 prod path.
- **SOR service** — Python 3.12 · FastAPI · CVXPY (CLARABEL solver, ECOS fallback) · XGBoost · pydantic · pytest. Local: uvicorn. Prod: Modal.
- **AI** — Anthropic Claude Opus 4.7 vision via `@anthropic-ai/sdk` 0.91.x with structured outputs.
- **Tooling** — pnpm 10 · turbo · Husky + lint-staged · Prettier · ESLint.

---

## Run it locally

### Prerequisites

- Node ≥ 20, pnpm 10
- Python 3.12 (for the SOR service)
- Foundry (`curl -L https://foundry.paradigm.xyz | bash && foundryup`) — only if you want to touch contracts
- A Supabase project (free tier is fine)
- An Anthropic API key with a $5 spend cap (only needed for Phase 3 document intake)

### 1. Install

```bash
pnpm install
```

### 2. Configure env

Copy [`apps/web/.env.example`](apps/web/.env.example) → `apps/web/.env.local` and fill in your keys :

```bash
cp apps/web/.env.example apps/web/.env.local
```

`apps/web/src/lib/env.ts` validates these at boot via Zod — missing required keys fail fast, blank strings are coerced to `undefined`.

### 3. Database

Run the migrations in the Supabase SQL Editor (no CLI dependency) :

```sql
-- supabase/migrations/0001_initial.sql       (schema + RLS)
-- supabase/migrations/0002_enable_realtime.sql  (REQUIRED — Realtime publication for KYB / tranches)
```

Seed the Chinedu↔Chen demo scenario :

```bash
pnpm --filter @silkpay/web db:seed
```

### 4. Start the SOR service (terminal 1)

```bash
cd services/sor
python -m venv .venv && source .venv/bin/activate   # first time only
pip install -r requirements.txt                      # cvxpy, fastapi, clarabel, ecos, xgboost…

# from repo root, in a dedicated terminal:
pnpm sor:dev    # uvicorn on :8000
```

### 5. Start the web app (terminal 2)

```bash
pnpm --filter @silkpay/web dev    # Next.js on :3000 (or :3001 if 3000 is taken)
```

Open <http://localhost:3000/fr/dashboard>. Use the user-switcher in the nav to flip between Chinedu (importer), Chen (supplier), and Silkpay (arbiter).

---

## Common scripts

| Command                              | What                           |
| ------------------------------------ | ------------------------------ |
| `pnpm dev`                           | Run all apps via turbo         |
| `pnpm --filter @silkpay/web dev`     | Web only                       |
| `pnpm sor:dev`                       | FastAPI SOR (uvicorn :8000)    |
| `pnpm build`                         | Full monorepo build            |
| `pnpm lint`                          | ESLint across the workspace    |
| `pnpm typecheck`                     | `tsc --noEmit` everywhere      |
| `pnpm test`                          | Web unit tests                 |
| `pnpm test:contracts`                | `forge test -vvv`              |
| `pnpm test:sor`                      | `pytest -q` against the solver |
| `pnpm --filter @silkpay/web db:seed` | Reseed the demo scenario       |

Pre-commit hook runs lint-staged + conditional typecheck / forge / pytest based on changed paths. Don't `--no-verify` past a hook failure — fix and re-stage.

---

## Deploy

- **Web** — Vercel. See [`DEPLOY.md`](DEPLOY.md) (root directory `apps/web`, install command walks up to monorepo root via `apps/web/vercel.json`).
- **SOR** — Modal. `cd services/sor && modal deploy app.py`.
- **Contracts** — `forge script` against the target chain RPC (Sepolia for the demo; chain selected by SOR in production). Mainnet deploy is gated on a completed Hacken/Cyfrin audit + Code4rena contest (see CLAUDE.md hard constraints).

---

## License

MIT — see [`LICENSE`](LICENSE).
