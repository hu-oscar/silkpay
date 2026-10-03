# Tech Stack & Tools

## Stack Summary

- **Frontend:** Next.js 15 (App Router) + TypeScript strict + React Server Components
- **Styling / UI:** Tailwind CSS + shadcn/ui (Radix primitives) + `class-variance-authority` + `lucide-react`
- **i18n:** `next-intl` (FR / EN / 中文) — locale-aware `Intl.NumberFormat`, `Intl.DateTimeFormat`
- **Forms:** `react-hook-form` + Zod (schemas at every API boundary)
- **Auth:** Clerk (organizations enabled) — webhooks → Supabase sync
- **Backend (app):** Next.js Server Actions + Route Handlers
- **Backend (services):** FastAPI on Modal (Python 3.11+), Pydantic for I/O
- **Database:** Supabase Postgres (Row Level Security enabled), Supabase Storage (signed URLs), Supabase Realtime, Supabase Vault (encrypted PII at rest)
- **Smart contracts:** Solidity 0.8.24+ with Foundry (`forge`, `cast`, `anvil`)
- **Chain:** BNB Chain mainnet primary V1 — USDT BEP-20 (`0x55d398326f99059fF775485246999027B3197955`); BSC testnet for dev
- **Account abstraction:** Pimlico SDK (ERC-4337) — smart accounts deployed on-demand
- **Multi-sig:** Safe (gnosis-safe) 3-of-5 + custom `TradeEscrowModule`; hardware wallets only on mainnet (Ledger / GridPlus)
- **AI / LLM:** Anthropic SDK (`@anthropic-ai/sdk` for TS, `anthropic` for Py) — Claude Sonnet (vision OCR + agent orchestration). Use prompt caching on long system prompts.
- **ML:** XGBoost (Python) trained offline, served via Modal endpoint
- **Optimization:** CVXPY + ECOS solver
- **Async / events:** Inngest (event-driven pipelines, scheduled jobs, retries)
- **Notifications:** Twilio WhatsApp Business API + Resend (transactional email) + WeChat Work bot (V1 supplier UX)
- **Document parsing fallback:** `pdfplumber` + `Pillow` + Tesseract OCR (only if Claude vision confidence < 0.85)
- **Monitoring:** Tenderly (on-chain), Sentry (app errors), Posthog (product analytics + session replay)
- **Compliance / KYB:** Smile ID (KYC Nigeria + BVN match), ComplyAdvantage (sanctions / PEP), Tianyancha API (China business registry)
- **On/Off-ramp:** Yellow Card B2B + 2 OTC desks (TBD: OSL / Hashkey / Bitget OTC) + 1 PSP partner for USDT→CNY (LianLian or comparable)
- **Hosting:** Vercel Pro (frontend), Modal (Python services), Supabase Pro (DB+Auth+Storage)
- **Tooling:** `pnpm` workspaces + Turborepo, ESLint, Prettier, Husky pre-commit, GitHub Actions CI

## Repo Structure (monorepo, `pnpm` workspaces)

```
silkpay/
├── apps/
│   ├── web/             # Next.js 15 App Router
│   └── contracts/       # Foundry: src/, test/, script/
├── services/
│   ├── intake/          # Modal Python — Claude Vision document parser
│   ├── quote/           # Modal Python — quote orchestrator
│   └── sor/             # Modal Python — XGBoost + CVXPY solver
├── packages/
│   ├── shared/          # cross-package utils
│   └── types/           # shared TS types + Zod schemas mirror
├── agent_docs/          # AI agent instruction set (this folder)
├── AGENTS.md            # universal master plan
├── MEMORY.md            # active state + decisions log
└── CLAUDE.md            # Claude Code pointer file
```

## Setup Commands (Day 2 init — run once)

```bash
# Monorepo scaffold
mkdir silkpay && cd silkpay
git init && pnpm init
mkdir -p apps/web apps/contracts services/sor services/intake services/quote
mkdir -p packages/shared packages/types

# Frontend
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --app --eslint --src-dir
pnpm add @clerk/nextjs @supabase/supabase-js @supabase/ssr
pnpm add @radix-ui/react-* class-variance-authority lucide-react
pnpm add next-intl react-hook-form zod
pnpm add -D vitest @vitest/coverage-v8 @testing-library/react @playwright/test
npx shadcn@latest init

# Smart contracts
cd ../contracts
forge init --no-git
forge install OpenZeppelin/openzeppelin-contracts
forge install safe-global/safe-smart-account

# SOR service
cd ../../services/sor
python3 -m venv .venv && source .venv/bin/activate
pip install modal cvxpy xgboost numpy pandas fastapi pydantic pytest

# Intake service
cd ../intake
python3 -m venv .venv && source .venv/bin/activate
pip install modal anthropic pdfplumber pillow pytest

# Quote service
cd ../quote
python3 -m venv .venv && source .venv/bin/activate
pip install modal fastapi pydantic httpx pytest

# Root tooling
cd ../..
pnpm add -D -w prettier eslint typescript turbo husky lint-staged
git add . && git commit -m "Initial monorepo scaffold"
```

## Daily Commands

| Command                                     | Purpose                            |
| ------------------------------------------- | ---------------------------------- |
| `pnpm install`                              | Install all workspaces             |
| `pnpm --filter web dev`                     | Next.js dev server (`:3000`)       |
| `pnpm --filter web build`                   | Production build                   |
| `pnpm lint`                                 | ESLint across all packages         |
| `pnpm typecheck`                            | `tsc --noEmit` across all packages |
| `pnpm --filter web test`                    | Vitest unit tests                  |
| `pnpm --filter web test:e2e`                | Playwright E2E                     |
| `cd apps/contracts && forge test -vvv`      | Foundry tests                      |
| `cd apps/contracts && forge coverage`       | Coverage report                    |
| `cd services/<name> && pytest -q`           | Python unit tests                  |
| `cd services/<name> && modal serve app.py`  | Local Modal dev                    |
| `cd services/<name> && modal deploy app.py` | Push to Modal                      |
| `supabase db push`                          | Apply migrations to staging        |

## Environment Variables (production — set in Vercel + Modal secrets)

```bash
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx          # server-only

# AI / LLM
ANTHROPIC_API_KEY=sk-ant-xxx

# Modal
MODAL_TOKEN_ID=ak-xxx
MODAL_TOKEN_SECRET=as-xxx

# Async / events
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx

# Notifications
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
RESEND_API_KEY=re_xxx

# Monitoring
SENTRY_DSN=https://xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx

# Web3
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx
BSC_TESTNET_RPC=https://...
BSC_MAINNET_RPC=https://...
BSCSCAN_API_KEY=xxx

# Compliance providers
SMILE_ID_PARTNER_ID=xxx
SMILE_ID_API_KEY=xxx
COMPLY_ADVANTAGE_API_KEY=xxx
TIANYANCHA_API_TOKEN=xxx

# On/off-ramp
YELLOW_CARD_API_KEY=xxx
OTC_DESK_1_API_KEY=xxx
OTC_DESK_2_API_KEY=xxx
PSP_PARTNER_API_KEY=xxx
```

## Canonical Examples

### Error Handling (TS — Server Action)

```ts
// apps/web/src/server/actions/quote.ts
import { z } from "zod";

const QuoteInput = z.object({
  amountNgn: z.number().int().positive(),
  targetCurrency: z.literal("CNY"),
  urgency: z.enum(["standard", "fast"]).default("standard"),
});

export type QuoteResult =
  | { ok: true; data: QuoteBreakdown }
  | {
      ok: false;
      code: "VALIDATION" | "QUOTE_INSUFFICIENT_LIQUIDITY" | "UPSTREAM_TIMEOUT";
      message: string;
    };

export async function getQuote(raw: unknown): Promise<QuoteResult> {
  const parsed = QuoteInput.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, code: "VALIDATION", message: parsed.error.issues[0].message };
  }

  try {
    const data = await callQuoteService(parsed.data);
    return { ok: true, data };
  } catch (err) {
    // Normalize errors at the boundary — never leak stack traces to UI.
    Sentry.captureException(err, { tags: { surface: "quote" } });
    if (err instanceof QuoteUpstreamTimeout) {
      return {
        ok: false,
        code: "UPSTREAM_TIMEOUT",
        message: "One or more sources timed out. Retry shortly.",
      };
    }
    if (err instanceof QuoteInsufficientLiquidity) {
      return {
        ok: false,
        code: "QUOTE_INSUFFICIENT_LIQUIDITY",
        message: "Not enough live liquidity to quote this size.",
      };
    }
    throw err;
  }
}
```

### Error Handling (Solidity — pull-payment + reentrancy)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IUSDT {
    function isBlackListed(address) external view returns (bool);
}

contract TradeEscrowModule is ReentrancyGuard {
    using SafeERC20 for IERC20;

    error TrancheNotReleasable();
    error TetherBlacklisted(address account);

    mapping(bytes32 => uint256) public claimable; // pull-payment ledger

    /// @notice Seller pulls released funds. Reverts on Tether blacklist.
    function claim(bytes32 trancheId, IERC20 token) external nonReentrant {
        uint256 amount = claimable[trancheId];
        if (amount == 0) revert TrancheNotReleasable();
        if (IUSDT(address(token)).isBlackListed(msg.sender)) revert TetherBlacklisted(msg.sender);

        claimable[trancheId] = 0; // CEI: state before transfer
        token.safeTransfer(msg.sender, amount);
    }
}
```

### Error Handling (Python — Modal endpoint)

```python
# services/intake/app.py
from pydantic import BaseModel, ValidationError
from anthropic import Anthropic, APIError, APITimeoutError
import modal
import logging

log = logging.getLogger("intake")

app = modal.App("intake-service")

class ParseRequest(BaseModel):
    signed_url: str
    document_type: str  # 'proforma' | 'bl' | 'packing_list' | 'po'

class ParseResponse(BaseModel):
    data: dict
    confidence_score: float
    cost_usd: float
    latency_ms: int

@app.function(timeout=30, secrets=[modal.Secret.from_name("anthropic")])
@modal.fastapi_endpoint(method="POST")
def parse(req: ParseRequest) -> ParseResponse:
    try:
        # ... call Anthropic vision, return structured output
        ...
    except ValidationError as e:
        log.warning("validation_failed", extra={"errors": e.errors()})
        raise modal.exception.Error("VALIDATION_FAILED")
    except APITimeoutError:
        log.warning("anthropic_timeout")
        # fallback path: Tesseract + LLM text extraction
        ...
    except APIError as e:
        log.error("anthropic_api_error", extra={"status": e.status_code})
        raise
```

### Styling / Component Example (shadcn + Tailwind + tabular nums)

```tsx
// apps/web/src/components/quote-card.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslations, useFormatter } from "next-intl";

type QuoteCardProps = {
  amountNgn: number;
  amountCny: number;
  totalCostUsd: number;
  swiftCostUsd: number;
  expiresAt: Date;
};

export function QuoteCard({
  amountNgn,
  amountCny,
  totalCostUsd,
  swiftCostUsd,
  expiresAt,
}: QuoteCardProps) {
  const t = useTranslations("quote");
  const format = useFormatter();
  const savingsUsd = swiftCostUsd - totalCostUsd;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base">{t("ready")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 [font-feature-settings:'tnum']">
          <span className="text-muted-foreground">{t("youPay")}</span>
          <span className="text-right">
            {format.number(amountNgn, { style: "currency", currency: "NGN" })}
          </span>
          <span className="text-muted-foreground">{t("supplierGets")}</span>
          <span className="text-right">
            {format.number(amountCny, { style: "currency", currency: "CNY" })}
          </span>
        </div>
        <div className="rounded-md bg-emerald-50 p-3 text-sm text-emerald-900 [font-feature-settings:'tnum']">
          {t("vsSwiftSavings", {
            savings: format.number(savingsUsd, { style: "currency", currency: "USD" }),
          })}
        </div>
        <Button className="w-full">{t("continue")}</Button>
      </CardContent>
    </Card>
  );
}
```
