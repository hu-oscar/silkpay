# Technical Design Document: Yuán MVP

> **Working name :** *Yuán* (元)
> **Document owner :** Oscar
> **Status :** Draft v1 — Ready for Build
> **Last updated :** 25 avril 2026
> **Companion docs :** Research findings (Part 1), PRD-Yuan-MVP (Part 2)

---

## How We'll Build It

### Recommended Approach

Tu vas builder **vibe-code-driven mais sur stack production-grade.** Concrètement : tu pilotes Claude Code (CLI session-aware) et Cursor (IDE inline), tu écris les tests et invariants critiques à la main, et l'AI écrit le bulk du code applicatif sous ta supervision. Pas de no-code, pas de Lovable — ces plateformes ne peuvent pas générer de smart contracts Solidity audités, de solver CVXPY, ni de pipeline ML production. Tu paies cette honnêteté en effort, mais tu obtiens un MVP qui passe un audit Hacken et une due diligence VC sérieuse.

**Time to MVP :** 90 jours solo en heavy AI assistance, conditionné à : (a) co-founder Nigerian onboardé en parallèle pour le path SEC, (b) zéro distraction sur features hors scope.

**Limitations à connaître :**
- L'AI hallucine sur Solidity edge-cases. Tout smart contract code passe par Foundry forge tests + invariants + revue manuelle avant deploy testnet.
- L'AI ne sait pas combien d'energy/bandwidth ton contract consommera sur Tron — tu dois le mesurer toi-même.
- Le solver CVXPY est sensible aux formulations non-DCP — l'AI te proposera souvent du code qui compile mais qui ne minimise pas correctement. Tu valides chaque problème avec des tests numériques sur cas connus.

### Approche choisie vs alternatives

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **Vibe-code production stack (recommandé)** | Vraie ownership du code ; auditable ; scale post-seed sans rewrite ; AI velocity | Effort réel de coding ; bugs possibles si revue lâche | ✅ Match du scope PRD |
| **No-code (Lovable, Bubble, Glide)** | Setup en 1 jour ; UX prebuilt | **Impossible** : pas de Solidity custom, pas de CVXPY, pas de SOR ML | ❌ Rejeté |
| **Low-code intermédiaire (Retool + Supabase + serverless functions)** | Plus rapide UI | Pas de smart contract support ; ML pipeline limité ; vendor lock-in | ❌ Rejeté |
| **Full-custom from-scratch sans AI** | Contrôle total | 6+ mois solo, kill timeline 90j | ❌ Rejeté |
| **Hire dev shop** | Velocity équipe | Coût ($150–300k pour 90j), perte de tech leadership, pas viable pre-seed | ❌ Rejeté |

---

## Project Setup Checklist

### Day 1 — Accounts à créer

- [ ] **GitHub** (repo monorepo `yuan-mvp`) — github.com
- [ ] **Vercel** Pro plan ($20/mois) — vercel.com
- [ ] **Supabase** Pro plan ($25/mois) — supabase.com (Postgres + Auth + Storage + Realtime + Vault)
- [ ] **Modal** account avec credit card — modal.com (compute Python + ML serving)
- [ ] **Anthropic Console** + API key — console.anthropic.com (Claude Sonnet 4.5 vision + agent)
- [ ] **Clerk** dev plan free tier — clerk.com (auth tiered si plus rapide que Supabase Auth, à benchmarker semaine 1)
- [ ] **Inngest** Cloud free tier — inngest.com (async jobs)
- [ ] **Pinecone** Starter $0/mois — pinecone.io (V2 RAG, peut attendre)
- [ ] **Sentry** dev free — sentry.io (error tracking)
- [ ] **Posthog** dev free — posthog.com (product analytics + session replay)
- [ ] **Tenderly** dev free — tenderly.co (smart contract monitoring + simulation)
- [ ] **WalletConnect Cloud** — cloud.walletconnect.com (project ID gratuit)
- [ ] **BNB Chain testnet faucet** + **Tron Nile testnet faucet** — pour deploy tests
- [ ] **Twilio** WhatsApp Business sandbox — twilio.com (notifications dev avant verified business account)
- [ ] **Resend** Pro $20/mois — resend.com (email transactionnel)

**KYB / Compliance providers (négocier avant signature) :**
- [ ] **Smile ID** call commercial — smileidentity.com (KYC Nigeria, BVN match)
- [ ] **ComplyAdvantage** demo + quote — complyadvantage.com (sanctions/PEP)
- [ ] **Tianyancha** API access — tianyancha.com (registre commercial chinois)

**On/Off-ramp partners (négocier early) :**
- [ ] **Yellow Card B2B** API access — yellowcard.io/api
- [ ] **OTC desk #2** : OSL ou Hashkey ou Bitget OTC, première conversation pricing

### Day 1 — AI assistant setup

- [ ] **Claude Code** installé via npm + auth — sessions persistantes pour le travail Solidity et Python ML
- [ ] **Cursor** installé avec abonnement Pro ($20/mois) — IDE pour Next.js + iteration rapide
- [ ] **Cursor rules** custom dans `.cursor/rules/` — ton TDD + PRD injectés en context permanent
- [ ] **Claude Code AGENTS.md** à la racine du repo — convention coding + contexte projet (généré en Part 4)
- [ ] **Test "Hello World"** : `claude code --task "Create a simple Next.js page that says hello"` pour valider l'auth

### Day 2 — Project initialization

```bash
# Structure monorepo (avec pnpm workspaces)
mkdir yuan-mvp && cd yuan-mvp
git init
pnpm init

# Workspace structure
mkdir -p apps/web apps/contracts services/sor services/intake
mkdir -p packages/shared packages/types

# Frontend (Next.js 15 + App Router)
cd apps/web
pnpm create next-app@latest . --typescript --tailwind --app --eslint --src-dir
pnpm add @clerk/nextjs @supabase/supabase-js @supabase/ssr
pnpm add @radix-ui/react-* class-variance-authority lucide-react
pnpm add next-intl
npx shadcn@latest init

# Smart contracts (Foundry)
cd ../contracts
forge init --no-git
forge install OpenZeppelin/openzeppelin-contracts
forge install safe-global/safe-smart-account

# SOR service (Python + Modal)
cd ../../services/sor
python3 -m venv .venv && source .venv/bin/activate
pip install modal cvxpy xgboost numpy pandas fastapi pydantic

# Document intake service (Python + Modal)
cd ../intake
python3 -m venv .venv && source .venv/bin/activate
pip install modal anthropic pdfplumber pillow

# Root tooling
cd ../..
pnpm add -D -w prettier eslint typescript turbo
git add . && git commit -m "Initial monorepo scaffold"
```

### Day 3–5 — Foundry ramp-up (assumant zéro expérience préalable)

Si tu n'as jamais deploy un contract custom audité en Solidity, alloue 3–5 jours focus Foundry avant de toucher la logique escrow :

- [ ] **Foundry Book** complet — book.getfoundry.sh (1–2 jours lecture active)
- [ ] **Tutorial OpenZeppelin Escrow** — déployer `Escrow.sol` sur BNB testnet, écrire 5 forge tests
- [ ] **Tutorial Safe modules** — déployer un Safe + écrire un module custom simple (timelock par exemple)
- [ ] **Forge invariant testing** — comprendre `forge test --match-contract Invariant`
- [ ] **Tenderly debugger** — simuler une tx révertée, debug step-by-step

→ Si tu as déjà cette expérience, skip directement à la semaine 1 build. Ce ramp-up est le différentiel honnête : sans lui, tu écris du code Solidity AI-généré que tu ne peux ni reviewer ni auditer toi-même.

---

## Building Your Features

Pour chaque feature du PRD, voici l'approche concrète. Je te donne les prompts Claude Code copy-pasteable et les checklists test.

### Feature 1 — Onboarding KYB bilingue

**Complexité :** Medium

**Stack :**
- Frontend : Next.js + shadcn `<Form>` + react-hook-form + Zod schemas
- Auth : **Clerk** en V1 (verdict ci-dessous)
- KYB providers : Smile ID (Nigeria) + Tianyancha (Chine) + ComplyAdvantage (sanctions)
- Smart account déploy on-demand : **Pimlico** SDK (account abstraction ERC-4337)

**Décision Auth — Clerk vs Supabase Auth :**

| Provider | Pour | Contre |
|---|---|---|
| **Clerk** ✅ | Onboarding UI prebuilt, MFA out-of-box, organizations native (multi-utilisateur par entreprise importatrice = critical V1.5), webhooks mature | $25/mois + per MAU au-delà de 10k, vendor lock-in |
| **Supabase Auth** | Free, intégré au reste de la stack | UI à builder ; orgs management plus DIY ; less polished |

→ **Recommandation : Clerk en V1**, gain de 1–2 semaines de UI work. Migration vers Supabase Auth possible Year 2 si coût devient material.

**Prompt Claude Code pour le flow d'onboarding :**

```
Tu es expert Next.js 15 App Router. Implémente le flow KYB onboarding pour Yuán.

Specs :
- 3 étapes mobile-first : (1) business info CAC/BVN, (2) document upload (CAC certificate, proof of address), (3) verification status
- Multilingue FR/EN via next-intl, fichiers /messages/{en,fr}.json
- Wizard avec progress bar shadcn `<Progress>` ; validation Zod par step
- Backend : Server Actions Next.js qui appellent Supabase pour storage + Smile ID API pour BVN+ID match
- Status temps réel via Supabase realtime subscription sur table `kyb_applications`
- Si Smile ID renvoie failed_low_confidence, fallback manual review queue (admin dashboard separate)

Stack : Clerk auth, Supabase pour DB+Storage, shadcn/ui, react-hook-form, Zod.

Commence par le schéma Zod et le DB schema Supabase. Ne génère pas le UI avant que je valide les types.
```

**Test plan :**
- [ ] Happy path : 3 importateurs Lagos test (BVN réel, ID réel) → onboarded en <15 min p95
- [ ] Sad path 1 : BVN mismatch → fallback manual review déclenché
- [ ] Sad path 2 : sanctions hit ComplyAdvantage → flag bloque l'onboarding + alert compliance officer
- [ ] Mobile testing : Chrome Android + Safari iOS sur 3G throttled

### Feature 2 — Document Intake Claude Vision

**Complexité :** Easy avec API moderne

**Stack :**
- Modal endpoint Python + Anthropic SDK
- Storage : Supabase Storage bucket `documents/` avec signed URLs
- Trigger : Inngest job déclenché à upload, écrit résultat dans `transactions.parsed_documents` JSONB

**Schémas structured output :**

```python
# services/intake/schemas.py
from pydantic import BaseModel
from typing import Literal

class ProformaInvoice(BaseModel):
    invoice_number: str
    issued_date: str  # ISO 8601
    seller: dict  # name, address, country, contact
    buyer: dict
    line_items: list[dict]  # description, hsc_code, qty, unit_price, total
    currency: Literal['USD', 'CNY', 'NGN', 'EUR']
    total_amount: float
    incoterms: Literal['FOB', 'CIF', 'EXW', 'DDP', 'DAP', 'OTHER']
    payment_terms: str
    confidence_score: float  # 0-1, fail si <0.8
```

**Prompt Claude Code pour le service intake :**

```
Tu es expert Python + Anthropic API. Implémente le service intake.

Specs :
- Modal app `intake-service` avec endpoint POST /parse
- Input : signed URL d'un PDF/JPG/PNG depuis Supabase Storage + document_type ('proforma' | 'bl' | 'packing_list' | 'po')
- Output : JSON structuré selon le schéma Pydantic correspondant + confidence_score
- Use Claude Sonnet 4.5 vision avec extended thinking si confidence first-pass <0.85
- Fallback Tesseract OCR + LLM text-extraction si vision fails (rare, mais robust)
- Logging structured (event, doc_id, latency_ms, cost_usd) vers Sentry + Posthog

Garde-fous :
- Hard timeout 30s par document
- Cost cap : raise si transaction dépasse $0.20 (proforma + BL + packing list combinés ne devraient jamais dépasser ça)
- PII redaction : ne logge pas le contenu document, seulement metadata

Commence par : Pydantic schemas pour les 4 doc types, puis le wrapper Anthropic, puis le Modal endpoint.
```

**Test plan :**
- [ ] Dataset de 30 proformas réels (synthétiques + scrapés depuis Alibaba public listings) → accuracy >90 % sur amount, parties, currency
- [ ] Dataset de 10 BL réels → accuracy >85 % (BL ont plus de variabilité de format)
- [ ] Latency p95 <15s par doc
- [ ] Coût moyen <$0.05 pour intake complet 1 transaction (3 docs)

### Feature 3 — Quote Engine Single-Corridor

**Complexité :** Medium

**Stack :**
- Endpoint Modal `/quote` qui orchestre : appel parallèle aux 3 sources → SOR solver → consolidation
- Cache Supabase 60s par paire+amount pour éviter re-quoting trop fréquent
- Frontend : composant `<QuoteCard>` avec breakdown visuel + countdown 60s

**Architecture :**

```text
[Frontend]
   ↓ POST /api/quote {amount_ngn, target_currency: 'CNY'}
[Next.js API Route]
   ↓ POST Modal /quote
[Modal Endpoint - quote service]
   ├─→ Yellow Card API (NGN→USDT pricing)
   ├─→ OTC Desk #1 RFQ (NGN→USDT)
   ├─→ OTC Desk #2 RFQ (NGN→USDT)
   ├─→ PSP partner (USDT→CNY rate, e.g. LianLian or Wise comparable mid)
   ↓ All 4 in parallel (asyncio.gather)
[SOR Solver - CVXPY]
   ↓ Optimal allocation across NGN→USDT sources
[Consolidator]
   ↓ Total cost + ETA + breakdown
[Frontend renders <QuoteCard>]
```

**Prompt Claude Code pour le quote engine :**

```
Tu es expert Python async + FastAPI sur Modal.

Specs :
- Modal app `quote-service` exposant POST /quote
- Input : { amount_ngn: int, target_currency: 'CNY', urgency: 'standard' | 'fast' }
- Sources NGN→USDT : 3 connecteurs (Yellow Card REST, OTC Desk #1 WebSocket RFQ, OTC Desk #2 REST)
- Source USDT→CNY : 1 connecteur PSP partner
- Tous les appels en parallèle via asyncio.gather avec timeout 2.5s par source
- Si une source timeout, l'exclure de la SOR mais ne pas fail le quote
- Sortie : QuoteResponse Pydantic avec breakdown {fx_cost, platform_fee_bps, ngn_paid, usdt_received, cny_delivered, eta_seconds, vs_swift_savings_usd, expires_at}
- Cache Supabase keyed (amount_bucket, target_currency, urgency) avec TTL 60s

Garde-fous :
- Si <2 sources NGN→USDT respondent, fail avec code QUOTE_INSUFFICIENT_LIQUIDITY
- Si total spread >120 bps, flag pour manual review (suspect de mauvaise calibration)

Commence par les Pydantic models et les connector interfaces, puis l'orchestration.
```

**Test plan :**
- [ ] Latency end-to-end <3s p95 (mesurer Modal cold start)
- [ ] Mocker chaque source, tester scénarios : tous up / 1 down / 2 down / tous timeout
- [ ] Vérifier que cache hit ramène à <50ms p95
- [ ] Comparer manuellement 10 quotes générés vs SWIFT estimate, vérifier que le saving affiché est honnête

### Feature 4 — Smart Contract Escrow 3-Tranche

**Complexité :** Hard. C'est *le* module à risque.

**Stack :**
- Solidity 0.8.24+ avec Foundry
- Chain primary V1 : **BNB Chain** (USDT BEP-20, tooling EVM standard, audit firms familiar). Tron en V2 parallel.
- Pattern : **Safe multi-sig 3-of-5 + custom Module** plutôt que escrow contract from-scratch — tu hérites de la sécurité battle-tested du Safe.
- Custom code : **EscrowFactory** (déploie un Safe + Module par transaction) + **TradeEscrowModule** (logique conditionnelle release).

**Architecture contracts :**

```solidity
// EscrowFactory.sol — singleton, déploie un Safe par transaction
contract EscrowFactory {
    function createEscrow(
        address buyer,
        address seller,
        address[] memory arbiters,  // 3 arbitres : Yuán + 2 indépendants
        Tranche[] memory tranches,
        IERC20 token  // USDT BEP-20
    ) external returns (address safeAddress);
}

// TradeEscrowModule.sol — module Safe qui exécute la logique
contract TradeEscrowModule is GuardManager {
    enum TrancheStatus { Pending, Released, Disputed, Refunded }

    struct Tranche {
        uint256 amount;
        bytes32 conditionHash;  // hash(milestone_type + milestone_id)
        uint256 deadline;
        TrancheStatus status;
    }

    function attestMilestone(
        bytes32 trancheId,
        bytes calldata oracleSignature
    ) external;  // Multi-sig threshold 2-of-3 arbiters

    function disputeRaise(bytes32 trancheId) external;  // Buyer or seller
    function disputeResolve(bytes32 trancheId, bool releaseToSeller) external;  // Arbiters
    function timeoutRefund(bytes32 trancheId) external;  // Anyone, après deadline
}
```

**Patterns critiques :**
- **Pull payment** (pas push) — le seller appelle `claim()` pour récupérer ses USDT, on n'envoie jamais en `transfer()` automatique
- **ReentrancyGuard** sur toutes les state-changing functions
- **EIP-712 typed signatures** pour les attestations milestones (avec nonce + chain ID)
- **Emergency pause** par le compliance officer multi-sig (pas le single founder)
- **Tether blacklist detection** : check `IUSDT.isBlackListed(address)` avant transfer ; si blacklist détecté sur un escrow, freeze + alerte compliance + manuel migration

**Prompt Claude Code pour Foundry build :**

```
Tu es expert Solidity 0.8.24 + Foundry. Implémente le système escrow 3-tranche pour Yuán.

Architecture :
- EscrowFactory.sol : factory déployant des Safe (via SafeProxyFactory) avec TradeEscrowModule attaché
- TradeEscrowModule.sol : Safe Module exposant attestMilestone, disputeRaise, disputeResolve, timeoutRefund
- Token : USDT BEP-20 (USDT BSC contract: 0x55d398326f99059fF775485246999027B3197955)

Sécurité requise :
- ReentrancyGuard partout
- Pull payment, jamais push
- EIP-712 typed sigs pour attestMilestone, nonces tracked per arbiter
- Tether blacklist detection avant tout transfer
- Emergency pause via Safe owner threshold 3-of-5
- Timelock 24h sur upgrades du module

Tests Foundry requis (forge test) :
- Happy path : 3 tranches release séquentielle
- Dispute path : seller dispute après attestation buyer, arbiters résolvent
- Timeout path : aucune action 30 jours, anyone peut trigger refund
- Reentrancy attack simulé sur claim() — doit fail
- Blacklist scenario : USDT blacklist seller mid-flow → escrow freeze + emergency redirect path
- Invariant : sum(tranche.amount where status=Released) + sum(where status=Refunded) <= total deposited

Ne génère pas de code avant que je valide l'architecture et les invariants.
```

**Test plan :**
- [ ] 100 % branch coverage Foundry forge
- [ ] Invariant tests 10k runs sans break
- [ ] Slither static analysis : zéro high/medium findings non-justifiés
- [ ] Mythril symbolic execution sur les state-changing fns
- [ ] Tenderly fork mainnet test : simuler 5 transactions complètes sur BSC fork
- [ ] **Audit Hacken ou Cyfrin pre-mainnet** ($50–80k, 3 sem)
- [ ] **Code4rena contest 7 jours** en parallèle ($40–60k pool, 96 % refund si rien trouvé)
- [ ] Bug bounty Immunefi live au launch, 5–10 % du TVL capped à $50k V1

### Feature 5 — Dashboard Transaction Dual-Side

**Complexité :** Medium

**Stack :**
- Frontend Next.js + Supabase realtime subscriptions
- Notifications : Twilio WhatsApp Business API (côté importateur) + Resend email + WeChat Work bot (côté supplier en V1, Mini Program V2)
- Design system : shadcn/ui + Tailwind + custom design tokens

**Décisions UX :**
- Status timeline visuelle (drafted → funded → in_transit → inspected → delivered → settled)
- Optimistic UI sur les actions (acknowledge BL, accept inspection cert) avec rollback si chain confirmation fail
- PWA manifest + service worker pour offline transaction list (sans détails sensibles cachés)

**Prompt Claude Code :**

```
Tu es expert Next.js 15 App Router + Supabase realtime + shadcn/ui.

Specs :
- Page /transactions/[id] côté importateur (FR/EN via next-intl)
- Sections : status timeline, parties (buyer + seller card), tranches breakdown, documents, audit log
- Realtime updates via supabase.channel('tx_id').on(...) — aucun polling
- Action buttons context-aware : "Acknowledge BL", "Approve inspection", "Raise dispute"
- Mobile-first : tab navigation pour les sections sur <md, side-by-side desktop
- Loading skeletons agressifs avec shadcn Skeleton
- Receipt PDF download post-settlement avec breakdown vs SWIFT

Performance :
- Lighthouse mobile >90
- Page payload <50KB initial (route handler streams le rest)
- Image lazy WebP + AVIF

Notification triggers (background via Inngest) :
- Tranche released → WhatsApp template à buyer + email + WeChat msg à seller
- Dispute raised → all parties + compliance officer
- Timeout warning J-3 → buyer + seller

Commence par le DB schema (transactions, tranches, audit_events tables Supabase) puis l'app router structure.
```

**Test plan :**
- [ ] Lighthouse score mobile >90 sur landing + dashboard
- [ ] Load test 100 concurrent users tracking (Vercel preview deployment)
- [ ] WhatsApp template approval Twilio (peut prendre 1–2 sem côté Meta, à anticiper)
- [ ] PDF receipt rendering test sur 10 transactions variées

### Feature 6 — Smart Order Routing ML-Calibrated

**Complexité :** Hard

**Stack :**
- Modal Python service `sor-solver`
- CVXPY pour le solver convexe (ECOS)
- XGBoost trained offline, served via Modal endpoint
- Feature store : Supabase table `sor_features_log` indexée
- Re-training nightly via Inngest scheduled job

**Architecture rappel (4 couches détaillées dans le PRD section Feature 6) :**
1. Data capture : every fill logged
2. ML predict : XGBoost par source → `(α_slippage, spread, delay, fill_proba)`
3. Solver convexe : CVXPY minimise coût total sous contraintes
4. Feedback loop : log realized vs predicted, weekly retrain

**Bootstrap V1 (avant data réelle) :**
- Scraping data publique : Binance P2P + Bybit P2P + OKX P2P pour la paire NGN/USDT sur 6–12 mois (cron via Modal)
- Generator synthétique paramétré sur ces stats : augmente coverage des cas rares (fin de mois, holidays chinois, CBN events)
- Train XGBoost sur dataset hybride réel-public + synthétique
- Déploiement avec garde-fou : si prédiction s'écarte >50 bps du baseline rule-based → fallback rule-based + log

**Prompt Claude Code pour le SOR — Phase 1 (data ingestion) :**

```
Tu es expert Python + Modal. Phase 1 du SOR : data ingestion publique.

Specs :
- Modal scheduled job daily : scrape Binance P2P, Bybit P2P, OKX P2P pour pair NGN/USDT
- Endpoints publics (pas d'API key) ; respecter rate limits
- Capture : timestamp, source, side (buy/sell), price, depth, size_buckets
- Storage : Supabase table `public_p2p_snapshots` avec partition daily
- 6 mois historique disponible via API ; backfill au premier run

Commence par le schema Supabase puis le scraper.
```

**Prompt Claude Code pour le SOR — Phase 2 (synthetic + training) :**

```
Tu es expert ML + XGBoost.

Specs :
- À partir de `public_p2p_snapshots`, calibrer un générateur synthétique :
  - Mean/std du slippage par bucket (size, hour_of_day, day_of_week, is_month_end)
  - Distribution paramétrée pour augmenter cas rares
- Génère 100k synthetic data points
- Train XGBoost regressor predict realized_slippage_bps from features [size_ngn, hour, day, is_month_end, ngn_volatility_24h, orderbook_depth_top5]
- Validation hold-out 20 % avec MAE
- Compare vs baseline rule-based : split 50/50 deux meilleures sources

Output : modèle pickled dans Modal volume + benchmark report

Commence par le synthetic data generator avec validation que distribution match les vraies stats.
```

**Prompt Claude Code pour le SOR — Phase 3 (solver + serving) :**

```
Tu es expert CVXPY + production ML serving.

Specs :
- Modal app `sor-solver` exposant POST /optimize
- Input : { target_ngn, current_features (dict), source_quotes (list) }
- Steps :
  1. Pour chaque source, charger XGBoost model et prédire (alpha, spread, delay)
  2. Construire CVXPY problem : minimize explicit_cost + slippage_quadratic_approx + delay_penalty
     subject to sum(x) == target, x_i <= depth_caps[i], x_i <= max_share * target
  3. Solve avec ECOS, retourner allocation + breakdown
- Garde-fou :
  - Calculer baseline rule-based (allocate to best 2 sources by quoted price)
  - Si abs(ml_total_cost - baseline_total_cost) > 50 bps × target_ngn, fallback baseline + log
- Logging structured chaque decision

Tests requis :
- Cas trivial 1 source full → vérifier x_1 = target
- Cas 2 sources avec depth caps → vérifier répartition correcte
- Cas synthétique benchmark : tirer 100 cases aléatoires, vérifier ML solver beat baseline en moyenne (mais pas pire en pire-cas)

Commence par les Pydantic models et la formulation CVXPY (DCP-compliant — slippage en quad_over_lin pas en power).
```

**Test plan :**
- [ ] Solver tournant en prod avec 3 sources réelles sur testnet
- [ ] Drift monitoring en place (Posthog dashboard sur features distribution shift)
- [ ] Fallback rule-based testé bout-en-bout
- [ ] Notebook reproducible avec benchmark synthétique : ML beat baseline >X bps, X mesurable
- [ ] Slippage realized tracking-able sur les 50 premières vraies transactions

---

## Database Schema

Supabase Postgres avec Row Level Security activée. Les tables critiques :

```sql
-- Users / Organizations (via Clerk metadata sync)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_org_id TEXT UNIQUE NOT NULL,
    type TEXT CHECK (type IN ('importer', 'supplier')) NOT NULL,
    country_code CHAR(2) NOT NULL,
    legal_name TEXT NOT NULL,
    cac_number TEXT,        -- Nigeria importers
    business_license TEXT,  -- China suppliers
    kyb_status TEXT CHECK (kyb_status IN ('pending', 'approved', 'rejected', 'review')) DEFAULT 'pending',
    smart_account_address TEXT,  -- Pimlico-deployed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_org_clerk ON organizations(clerk_org_id);
CREATE INDEX idx_org_type_status ON organizations(type, kyb_status);

-- KYB applications + verification trail
CREATE TABLE kyb_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT,  -- 'smile_id', 'tianyancha', 'comply_advantage'
    status TEXT,
    response_payload JSONB,  -- raw provider response, encrypted via Supabase Vault
    risk_flags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions (la table centrale)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_org_id UUID REFERENCES organizations(id),
    seller_org_id UUID REFERENCES organizations(id),
    status TEXT CHECK (status IN (
        'drafted', 'kyb_pending', 'quoted', 'awaiting_funding',
        'funded', 'in_transit', 'inspected', 'delivered', 'settling',
        'settled', 'disputed', 'refunded', 'cancelled'
    )) NOT NULL DEFAULT 'drafted',
    amount_ngn NUMERIC(20,2),
    amount_cny NUMERIC(20,2),
    amount_usdt NUMERIC(20,6),
    quote_breakdown JSONB,
    parsed_documents JSONB,  -- proforma, BL, packing list, PO outputs
    escrow_address TEXT,
    escrow_chain TEXT DEFAULT 'bsc',
    sor_allocation JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tx_buyer ON transactions(buyer_org_id, status);
CREATE INDEX idx_tx_seller ON transactions(seller_org_id, status);
CREATE INDEX idx_tx_status ON transactions(status) WHERE status NOT IN ('settled', 'cancelled');

-- Tranches (3 par transaction typiquement)
CREATE TABLE tranches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    sequence INT,
    percentage NUMERIC(5,2),
    amount_usdt NUMERIC(20,6),
    condition_type TEXT,  -- 'bl_signed', 'inspection_certified', 'delivery_acknowledged'
    condition_payload JSONB,
    status TEXT CHECK (status IN ('pending', 'attested', 'released', 'disputed', 'refunded')),
    deadline TIMESTAMPTZ,
    released_tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log immutable
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    actor_id UUID,
    actor_type TEXT,
    event_type TEXT,
    payload JSONB,
    on_chain_tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_tx ON audit_events(transaction_id, created_at DESC);

-- SOR feature log (pour ML retraining)
CREATE TABLE sor_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    source_id TEXT,
    allocated_ngn NUMERIC(20,2),
    predicted_slippage_bps NUMERIC(8,2),
    realized_slippage_bps NUMERIC(8,2),
    predicted_delay_seconds INT,
    realized_delay_seconds INT,
    features_at_decision JSONB,
    fallback_to_rulebased BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sor_source_time ON sor_executions(source_id, created_at DESC);

-- RLS policies (exemple pour transactions)
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their org's transactions"
    ON transactions FOR SELECT
    USING (
        buyer_org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')
        OR seller_org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')
    );
```

---

## AI Assistance Strategy

| Task | Best AI Tool | Pourquoi |
|---|---|---|
| **Architecture deep dives** | Claude Sonnet 4.5 (chat) | Long context, nuance, pas de rush vers le code |
| **Solidity smart contracts** | Claude Code (CLI session-aware) | Sessions persistantes, peut runner forge test entre prompts, lit les error logs |
| **Python ML / SOR / CVXPY** | Claude Code | Idem ; CVXPY syntax tricky à maintenir cohérent en multi-fichier |
| **Next.js components** | Cursor (inline edit + composer) | Plus rapide en iteration UI, voit le DOM rendered |
| **Bug debugging** | Claude Sonnet (chat) | Stack traces lisibles, hypothèses ranked |
| **Tests Foundry / pytest** | Claude Code | Peut runner les tests en boucle jusqu'à passing |
| **Database queries / RLS** | Cursor + Supabase MCP | MCP-aware, peut introspecter le schema |
| **Documentation** | Claude (chat) | Bon prose, ton ajustable |

### Prompt template universel pour ce projet

À mettre dans ton `.cursor/rules/yuan.mdc` ou `AGENTS.md` (généré en Part 4) :

```
You are working on Yuán, a B2B payment platform for Africa-China trade corridor.

Stack reference :
- Frontend : Next.js 15 App Router, TypeScript strict, shadcn/ui, Tailwind, next-intl (FR/EN/中文)
- Auth : Clerk (organizations enabled)
- Backend : Supabase Postgres + Storage + Realtime + Vault, Modal Python services
- Smart contracts : Solidity 0.8.24, Foundry, BNB Chain primary, Safe multi-sig + custom Module
- AI : Anthropic Claude Sonnet 4.5 (vision OCR + agent orchestration)
- ML : XGBoost trained on Modal, served via Modal endpoint
- Optim : CVXPY + ECOS solver
- Async : Inngest for event-driven jobs

Coding standards :
- TypeScript strict, no `any`. Zod schemas for all API boundaries.
- Solidity : ReentrancyGuard everywhere, pull-payment, EIP-712 sigs for state-changing actions, NatSpec docstrings on every public/external fn.
- Python : Pydantic for all I/O, type hints strict, mypy clean.
- Tests required : Vitest unit + Playwright E2E (frontend), pytest (Python services), forge test 100 % branch coverage (contracts).
- No placeholder content in production. No half-working features. No skipped mobile testing.

Always :
- Propose architecture before coding when scope is unclear.
- Write tests alongside implementation, not after.
- Cite which file you're editing and why.
- Flag security implications proactively.
```

---

## Deployment

### Frontend (Next.js)

**Vercel** Pro plan, Git push to `main` = production deploy. Preview deploys par branch.

```bash
# .env.production (set via Vercel dashboard)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
CLERK_SECRET_KEY=sk_live_xxx
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx  # server-only
ANTHROPIC_API_KEY=sk-ant-xxx
MODAL_TOKEN_ID=ak-xxx
MODAL_TOKEN_SECRET=as-xxx
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
RESEND_API_KEY=re_xxx
SENTRY_DSN=https://xxx
NEXT_PUBLIC_POSTHOG_KEY=phc_xxx
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=xxx
```

### Backend services (Modal)

Deploy via `modal deploy` per service :
```bash
cd services/intake && modal deploy app.py
cd services/sor && modal deploy app.py
cd services/quote && modal deploy app.py
```

Modal handles auto-scale + cold start mitigation (warm pool config in code).

### Smart contracts

```bash
# Testnet (BSC testnet)
cd apps/contracts
forge script script/Deploy.s.sol --rpc-url $BSC_TESTNET_RPC --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY

# Mainnet (POST audit + Code4rena)
forge script script/Deploy.s.sol --rpc-url $BSC_MAINNET_RPC --broadcast --verify --etherscan-api-key $BSCSCAN_API_KEY --slow
```

Verify contracts sur BscScan automatique. Multi-sig (Safe 3-of-5) deploye le factory et tient les admin keys — jamais d'EOA single-key sur mainnet.

### CI/CD

GitHub Actions workflows :
- `pr.yml` : lint + typecheck + unit tests + Vercel preview deploy
- `main.yml` : full E2E + Vercel prod deploy + Modal deploy
- `contracts.yml` : forge test + slither + Mythril sur PR touchant `apps/contracts/`

---

## Cost Breakdown

> **Note pricing :** vérifier directement sur les sites vendeurs avant budgétisation. Tarifs de référence avril 2026.

### Phase Build (mois 0–3, pre-launch)

| Service | Tier | Coût/mois |
|---|---|---|
| Vercel Pro | per seat | $20 |
| Supabase Pro | with vault | $25 |
| Modal | usage-based | $50–150 |
| Anthropic API | dev volume | $50–200 |
| Clerk | dev free | $0 |
| Inngest | free tier | $0 |
| Pinecone | starter | $0 |
| Sentry | dev | $0 |
| Posthog | dev free | $0 |
| Tenderly | free | $0 |
| Cursor Pro | per seat | $20 |
| Claude Code | usage-based | $50–150 |
| **Subtotal infra+tooling** | | **$215–565/mois** |
| Smile ID | per check | $0,30–1,50 × dev volume = ~$50 |
| ComplyAdvantage | subscription | $1 500 |
| Tianyancha | subscription | $200–500 |
| **Subtotal compliance** | | **$1 750–2 050/mois** |
| **TOTAL Build phase** | | **~$2k–2,6k/mois** |

### One-time costs Year 1

| Item | Coût |
|---|---|
| Holdco Maurice setup (BLC Robert / Conyers) | $30–50k |
| Cabinet Nigeria SEC ARIP application (Goldsmiths / Templars) | $40–80k |
| Smart contract audit Hacken ou Cyfrin | $50–80k |
| Code4rena contest 7 jours | $40–60k |
| Bug bounty initial deposit Immunefi | $20k |
| Domain + branding | $1–3k |
| **TOTAL one-time Year 1** | **$181–293k** |

### Phase Launch (mois 4+, scaling)

À 10k tx/mois : ~$3–5k/mois infra+tooling.
À 100k tx/mois : ~$8–12k/mois.

C'est du fixed-cost relativement faible — le revenue à take rate 1,5–2 % sur $5M TPV/mois ($75–100k/mois) couvre largement.

---

## Scaling Path

### 0–500 users / <$1M TPV cumulé
- Stack actuelle tient parfaitement.
- Single Modal region (us-east).
- Single Supabase region (eu-west).
- Monitoring focus : error rate, p95 latency, smart contract events.

### 500–5 000 users / $1–10M TPV/mois
- Activer Supabase read replicas.
- Modal multi-region (us-east + eu-west).
- Caching layer Redis (Upstash) pour quotes + KYB results.
- Hire ingé #2 (smart contract specialist).
- Audit refresh annuel.

### 5 000+ users / $10M+ TPV/mois
- Tron primary deployment en parallèle de BNB Chain (réduire fees pour les supplier-side flows).
- Multi-corridor (Kenya, Senegal, Morocco actifs).
- Trade finance product live (Series A signal).
- Internal netting infrastructure.
- Compliance team dédiée 3+ ETP.

---

## Limitations connues

**Ce que cette stack ne fera pas bien en V1 :**

1. **Latence côté Lagos en cold-start** — Modal cold start peut atteindre 3–5s sur le premier hit. Mitigation : warm pool config + edge function Vercel pour les routes hot (quote endpoint specifically). À surveiller post-launch.
2. **Volumes >$50M TPV/mois** — l'architecture actuelle tient, mais le solver CVXPY single-process n'est pas parallélisé. Si tu dépasses 1 quote/seconde sustained, refactor vers un worker pool ou un solver custom Rust.
3. **Multi-corridor en V1** — la modélisation DB et le SOR sont optimisés pour 1 paire (NGN/USDT/CNY). Ajouter KES, XOF, MAD demande refactor non-trivial — d'où le scope V1 single corridor.
4. **WeChat Mini Program native** — pas en V1, supplier UX en V1 = email + WeChat Work bot uniquement. Friction pour les fournisseurs chinois sophistiqués qui voudront app native.
5. **Inspection oracle automatique** — V1 = manual attestation par compliance officer Yuán. Pour scaler au-delà de 200 tx/mois, il faut intégration directe SGS ou CCIC API.

**When you'll need to upgrade :**
- Trigger : $20M+ TPV/mois → consider multi-region active-active Supabase + Modal.
- Trigger : 50+ inspections/jour → automatiser oracle SGS/CCIC.
- Trigger : Phase 2 corridor (Kenya) → refactor SOR multi-pair + DB schema multi-currency-aware.

---

## Learning Resources

### Foundry + Solidity (si zéro expérience)
- **Foundry Book** — book.getfoundry.sh (lecture active, ~1 jour)
- **Cyfrin Updraft** — updraft.cyfrin.io (free, focus security)
- **Smart Contract Programmer YouTube** — channel solide pour patterns OZ
- **OpenZeppelin Forum** — forum.openzeppelin.com (recherche d'erreurs spécifiques)
- **Damn Vulnerable DeFi** — exercises de hacking pour comprendre les attack vectors

### CVXPY + optimisation convexe
- **CVXPY official tutorials** — cvxpy.org/tutorial
- **Stephen Boyd Convex Optimization** (livre + Stanford lectures YouTube) — la référence
- **Cont & Kukanov 2014** (PDF dans la recherche) — base théorique du SOR

### Anthropic Claude API
- **Anthropic docs** — docs.anthropic.com
- **Cookbook** — github.com/anthropics/anthropic-cookbook (vision examples specific)
- **Tool use guide** — pour les agents multi-step

### Modal
- **Modal docs** — modal.com/docs (excellent quickstart)
- **Modal cookbook GitHub** — examples ML serving + scheduled jobs

### Communautés
- **Anthropic Discord** — pour Claude API + Code questions
- **Foundry Telegram** — invite via Foundry Book
- **Africa Tech Twitter** — suivre @TechCabal, @nestcoinHQ, @yellowcardapp

---

## Success Checklist

### Avant de commencer le build
- [ ] Tous les comptes créés et configurés (Day 1 checklist)
- [ ] AI tooling testé end-to-end (Claude Code + Cursor + repo init)
- [ ] PRD relu une dernière fois pour confirmer aucun changement de scope
- [ ] Budget mensuel approuvé personnellement (~$2,5k/mois confortable)
- [ ] Co-founder Nigerian search lancé en parallèle (P0)
- [ ] Foundry ramp-up fait (3–5 jours si zéro expérience)

### Pendant le build
- [ ] Sprints 2 semaines, demo bi-hebdomadaire à toi-même + 1 design partner
- [ ] Tests écrits avant ou pendant l'impl, jamais après
- [ ] Tous les PRs reviewed même solo (auto-review 24h après écriture)
- [ ] Pre-commit hooks : lint + typecheck + unit tests
- [ ] Aucun secret committé ; rotation hebdo des keys dev
- [ ] Sentry + Posthog activés dès la première feature

### Avant le launch (mainnet deploy)
- [ ] Audit Hacken ou Cyfrin passé, all high/medium fixed
- [ ] Code4rena contest fini, aucun critical
- [ ] 100 % des E2E tests Playwright passent
- [ ] 5 transactions complètes testnet end-to-end avec 5 vrais design partners
- [ ] WhatsApp Business template approved par Meta
- [ ] Multi-sig 3-of-5 distribué, hardware wallets uniquement
- [ ] Disaster recovery doc écrit et répété (key compromise, RPC outage, partner failure)
- [ ] Privacy policy + ToS cabinet legal validated FR/EN/中文
- [ ] Monitoring + alerting on-call rotation set (toi en V1, +1 post-hire)

---

## Definition of Technical Success

Le build technique est successful quand :

1. **Tous les P0 features du PRD sont fonctionnels en mainnet** avec audit propre.
2. **5+ vraies transactions Lagos→Yiwu complétées end-to-end** par des design partners non-Oscar.
3. **Lighthouse mobile score >90** sur landing + dashboard.
4. **NPS post-transaction >50** sur les 5 premières.
5. **Coût infra <$3k/mois** à 10k tx/mois projeté.
6. **Tu peux maintenir et étendre le code seul** (pas de dépendance critique sur du code AI-généré que tu ne comprends pas).
7. **Le pitch deck VC peut montrer un slide architecture** que tu défends sans cligner.

---

## Next Steps

Après approval de ce TDD :

1. **Part 4 — AGENTS.md + tool configs** : générer les fichiers de configuration AI (Claude Code AGENTS.md, Cursor rules, prompt templates par module) qui guident l'AI pendant le build.
2. **Day 1 setup** : exécuter la checklist accounts + tooling.
3. **Foundry ramp-up** : 3–5 jours focus si zéro expérience préalable.
4. **Week 1 sprint** : KYB onboarding (Feature 1) end-to-end sur testnet.
5. **Bi-weekly cadence** : sprints 2 semaines, 1 feature complète par sprint.
6. **Mois 3** : MVP feature-complete, audit kickoff.
7. **Mois 4** : audit + Code4rena, beta privée 10 utilisateurs.
8. **Mois 5–6** : mainnet, soft launch 50, fundraising en parallèle.

---

*Document created : 25 avril 2026*
*Status : Draft v1 — Ready for AI tooling setup (Part 4)*
*Owner : Oscar*
*Estimated time to MVP : 90 jours solo (avec AI heavy + Foundry ramp-up inclus)*
*Estimated cost build phase : ~$2,5k/mois infra + $180–290k one-time Year 1*
