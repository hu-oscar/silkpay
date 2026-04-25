# Product Requirements Document: Yuán MVP

> **Working name :** *Yuán* (元 — "principe / source" en chinois). Final naming TBD.
> **Document owner :** Oscar
> **Status :** Draft v1 — Ready for Technical Design (Part 3)
> **Last updated :** 25 avril 2026

---

## Product Overview

| Field | Value |
|---|---|
| **App Name** | Yuán *(working)* |
| **Tagline** | *"Pay China like it's next door."* |
| **Launch Goal** | Closer un seed **$1–2M en 6 mois** sur la traction d'un MVP Lagos–Yiwu : **50 transactions complétées et $1M+ de TPV cumulé** dans les 90 premiers jours post-launch. |
| **Target Launch** | Beta privée mois 4 (août 2026), launch public mois 6 (octobre 2026) |
| **Primary Market** | Nigeria → Chine, single corridor Lagos–Yiwu/Shenzhen |

---

## Who It's For

### Primary User : "Chinedu" — l'importateur africain

Chinedu, ~32 ans, importateur électronique grand public. Il opère depuis Computer Village à Ikeja, Lagos. Son business : ~$400 000/an de purchases répartis sur 12–15 transactions de $20k à $50k. Il source à Yiwu et Shenzhen, principalement smartphones, accessoires, et plus récemment panneaux solaires.

**Tech profile :**
- Native WhatsApp Business + apps bancaires nigérianes (GTBank, Kuda, Opay).
- Pas crypto-native, mais a déjà entendu parler de USDT — peut-être l'a-t-il déjà utilisé une ou deux fois en désespoir de cause.
- Mobile-first (Android mid-range, 3G/4G), data limitée, pas de fibre maison.

**Pain points actuels :**
- **SWIFT** : 5–7 % de friction totale (FX 4 % + fees correspondants 1–2 % + FX réception 2 %), 3–5 jours de délai, **aucune protection** si le fournisseur expédie la mauvaise marchandise ou triche sur la qualité.
- **Hawala / fei qian** : moins cher mais illégal, pas de recours, et les comptes du fournisseur côté Chine peuvent être gelés sans préavis.
- **USDT P2P sur Binance/Bybit** : il s'y est essayé une fois, UX cassée, peur de se faire scammer, pas adapté aux montants commerciaux.
- **Visibilité zéro** : une fois l'argent parti par SWIFT, il prie. Pas de tracking, pas d'alerte si le fournisseur ne reçoit pas, pas de recours.

**Ce dont il a besoin :**
- Un prix tout-en-un transparent affiché *avant* de payer.
- Un settlement rapide (T+0 idéal, T+1 max).
- Une protection si la marchandise n'arrive pas conforme (escrow programmable).
- Une UX en français ou anglais business, pas crypto-native.

### Secondary User : "Mr. Chen" — le fournisseur chinois

Wholesaler à Yiwu (marché de gros électronique le plus important du monde) ou Shenzhen (composants et électronique haute valeur). Il vend des conteneurs de produits aux importateurs africains depuis 5–10 ans.

**Tech profile :**
- Native WeChat + Alipay. Comptable corporate sur 用友 (Yonyou) ou Kingdee.
- Anglais business très limité.
- Deux préoccupations majeures : recevoir le paiement *vraiment* avant d'expédier, et ne pas se faire geler ses comptes par PBoC à cause d'un flux suspect.

**Pain points actuels :**
- Les importateurs africains paient en retard ou pas du tout (~10–15 % de défaut sur deals informels).
- Hawala route : ses comptes ont déjà été gelés en 2023 pendant 6 semaines, perte de cash flow critique.
- Refuse certains deals à cause du risque, manque-à-gagner significatif.

**Ce dont il a besoin :**
- Une garantie crédible que l'argent est *déjà* sécurisé avant qu'il expédie.
- Un settlement en CNY *clean* sur son compte bancaire chinois domestique.
- Une UI 中文 sur WeChat (Mini Program ou message embed) — pas une nouvelle app à installer.

### Example User Story

> Chinedu doit importer 200 smartphones de Yiwu pour $30 000. Aujourd'hui il wire via SWIFT — 3 jours d'attente, $2 295 de friction totale, et aucune protection si Mr. Chen lui envoie la mauvaise marchandise.
>
> Il découvre Yuán via un référent WhatsApp d'un autre importateur du quartier. Il upload son proforma sur la plateforme — Claude Vision le parse en 10 secondes, vérifie le fournisseur sur Tianyancha (registre commercial chinois), check les sanctions ComplyAdvantage. La plateforme lui montre une quote claire : **coût total $590 vs $2 295 SWIFT**, livraison protégée par escrow 3-tranche.
>
> Il accepte. Paie en NGN via Yellow Card on-ramp depuis son compte GTBank. Les USDT atterrissent dans un smart contract escrow Safe multi-sig en 4 minutes. Mr. Chen reçoit une notification WeChat : "$30 000 USDT sécurisés, prêts à libération sur expédition."
>
> Mr. Chen expédie, signe le BL on-platform → tranche 1 (30 %) released → conversion USDT→CNY via PSP partenaire → ¥64 800 sur son compte bancaire chinois le jour même. Inspection CCIC à Lagos → tranche 2 (50 %) → livraison conteneur → tranche 3 (20 %).
>
> Chinedu a économisé $1 705 et a une trace audit complète. Mr. Chen a ses CNY clean, sans risque de freeze. Les deux savent qu'ils referont le deal.

---

## The Problem We're Solving

Le commerce Chine–Afrique a atteint **$348 milliards en 2025** (+17,7 % vs 2024), avec **$13 Md d'imports Nigeria→Chine en 2025** (+36,7 %). Le segment SME ($5k–$500k/transaction) représente une fraction estimée à **$5,2–7,8 Md/an** sur Nigeria–Chine seul.

Sur ce flux, **5 à 7 % de la valeur est extrait en friction** (FX spreads + correspondent banking fees + opportunity cost du délai). C'est un pool de rente d'environ **$300–500M/an pour le seul corridor Nigeria–Chine SME** — capté aujourd'hui par les banques correspondantes, les hawala dealers, et les middlemen P2P.

**Pourquoi maintenant :**
- Adoption stablecoin massive : Sub-Saharan Africa a traité **$200B+ on-chain** mid-2024 à mid-2025, dont 43 % en stablecoins. Nigeria est #1 mondial sur l'adoption stablecoin par habitant.
- Réglementaire qui se clarifie : Nigeria ISA 2025 + Kenya VASP Act 2025 = path légal possible pour la première fois.
- Bridge × Stripe ($1,1B acquisition février 2025) a normalisé l'infra orchestration stablecoin globale — les rails sont commodity, l'opportunité est sur la couche verticale.
- Tarifs Trump qui re-routent les exports chinois vers l'Afrique (+25,8 % H1 2025) — vent macro porteur pour 5–10 ans.

**Pourquoi les solutions existantes ne suffisent pas :**

| Solution actuelle | Pourquoi elle échoue pour Chinedu |
|---|---|
| **SWIFT** | 5–7 % friction, 3–5 jours, aucune protection commerciale, opacité totale |
| **Hawala / fei qian** | Illégal, pas de recours, comptes Chen gelables, plafonds informels |
| **USDT P2P (Binance, Bybit)** | UX trader, pas adaptée aux SME, pas d'escrow, scams fréquents |
| **XTransfer** *(concurrent direct)* | Pas de stablecoin, pas d'escrow programmable, UX Chinese-first |
| **Yogupay / AZA Finance / Yellow Card B2B** | Orchestrateurs de liquidité, pas de couche escrow + trade finance |

Yuán est la **première plateforme qui combine** : stablecoin rails + escrow programmable + smart routing FX + AI document intake, dédiée au corridor Africa–China SME, avec une UX mobile-first multilingue (FR/EN/中文).

---

## User Journey

### Discovery → First Use → Success

**1. Discovery Phase**
- Channels : référent WhatsApp d'un autre importateur, Computer Village agent (commission), LinkedIn outbound, partenariat avec une chambre de commerce Lagos.
- Hook : *"Save $1 700 on your next $30k order to China."*
- Decision trigger : un échec récent avec SWIFT (paiement bloqué 7 jours) ou hawala (compte fournisseur gelé).

**2. Onboarding (15 minutes max)**
- Landing page mobile-first FR/EN.
- KYB en 3 étapes : CAC business reg upload + BVN + 1 facture proforma récente comme proof-of-trade.
- Smile ID vérification photo + ID nigérian.
- Wallet pré-créé (account abstraction via Pimlico) — Chinedu n'a aucune notion de seed phrase, c'est custodial-feeling.
- Premier "trial quote" en simulation sur une transaction fictive pour qu'il voie la valeur sans engager d'argent.

**3. Core Usage Loop**
- Trigger : nouvelle commande chez un fournisseur Yiwu, Chinedu ouvre l'app.
- Action : upload proforma → KYB fournisseur (auto via Tianyancha si l'EIN est trouvable, sinon manuel + flag) → quote → fund → escrow.
- Reward : settlement T+0 côté Chen, audit trail complet, 70 %+ d'économie vs SWIFT.
- Investment : historique de transactions accumulé = trust score interne, qui débloque des features V2 (trade finance, factoring, lignes de crédit).

**4. Success Moment ("Aha!")**
- Mr. Chen confirme la réception en CNY *avant* d'expédier — Chinedu réalise que l'escrow lui donne un levier qu'il n'avait jamais eu avec SWIFT.
- Trigger de partage : "How much did you save on your last China deal?" — chaque transaction génère un receipt téléchargeable avec breakdown des économies, partageable WhatsApp.

---

## MVP Features

### Must Have for Launch

#### 1. Onboarding KYB bilingue (FR/EN/中文)
- **What** : flow d'inscription tiered KYC/KYB avec providers African + Chinese.
- **User Story** : *"As an importer in Lagos, I want to onboard in <15 minutes with my CAC + BVN, so that I can start a transaction the same day."*
- **Stack** :
  - Côté Africa : Smile ID (BVN match + ID photo) + ComplyAdvantage (sanctions/PEP).
  - Côté Chine : Tianyancha API (registre commercial) + manual review fallback.
  - Wallet : Pimlico account abstraction, smart account déployé on-demand sur Tron + EVM mirror.
- **Success Criteria** :
  - [ ] Onboarding African importer complet en <15 min p95.
  - [ ] Onboarding Chinese supplier en <30 min p95 (manual review acceptable en V1).
  - [ ] False rejection rate <5 %.
  - [ ] Sanctions/PEP screening auto avec flag review humain pour cases ambigus.
- **Priority** : P0 (Critical)

#### 2. Document Intake AI (Claude Vision)
- **What** : upload proforma invoice, Bill of Lading, packing list, PO en PDF/JPG/PNG. Claude Sonnet 4.5 vision parse en JSON structuré (HSC codes, montants, parties, conditions Incoterms).
- **User Story** : *"As an importer, I want to upload my proforma and have the platform extract all data automatically, so that I don't re-type 30 fields."*
- **Stack** : Anthropic API Claude Sonnet 4.5 vision + structured outputs schema + fallback Tesseract OCR si confidence <80 %.
- **Success Criteria** :
  - [ ] Extraction accuracy >90 % sur 50 proformas test (montants, parties, items).
  - [ ] Latency <15s p95 par document.
  - [ ] Coût <$0,05 par transaction complète (proforma + BL + packing list).
- **Priority** : P0

#### 3. Quote Engine Single-Corridor (Lagos–Yiwu USDT TRC-20)
- **What** : interface qui prend un montant cible (ex: $30k) et affiche en <3s : tout-in cost breakdown, FX rate, fees, ETA, comparaison vs SWIFT estimée.
- **User Story** : *"As an importer, I want to see the total cost and ETA before I commit a single naira, so that I can decide quickly."*
- **Logic** : appel parallèle aux 3 sources on-ramp (Yellow Card + 2 OTC desks) → SOR ML-calibrated (voir feature #6) → quote consolidée.
- **Success Criteria** :
  - [ ] Quote latency <3s p95.
  - [ ] Quote validity window 60s, refresh auto.
  - [ ] Affichage breakdown : NGN payé, USDT received, CNY delivered, fees totaux par poste.
  - [ ] Comparaison estimative vs SWIFT (transparence agressive).
- **Priority** : P0

#### 4. Smart Contract Escrow 3-Tranche
- **What** : escrow contract déployé par transaction, multi-tranche conditionnel sur milestones logistiques.
- **User Story** : *"As both buyer and supplier, we want funds released progressively as milestones are met, so that nobody bears the full counterparty risk upfront."*
- **Stack** :
  - Primary chain : EVM mirror sur **BNB Chain** pour V1 (tooling Foundry mature, audit firms familiar, USDT BEP-20 disponible). Migration ou parallel deploy Tron en V2.
  - Pattern : Safe multi-sig (3-of-5) tient les fonds, custom Module exécute la logique de release.
  - Tranches : 30 % à BL signé, 50 % à inspection certificate uploadé, 20 % à acknowledgment livraison.
  - V1 : attestation milestones manuelle par compliance officer Yuán (multi-sig signature). V2 : oracle CCIC/SGS direct.
  - Timeout par tranche : 30 jours sans action → auto-refund vers buyer.
- **Success Criteria** :
  - [ ] Audit pre-mainnet par Hacken ou Cyfrin (~$50–80k).
  - [ ] Code4rena contest 7 jours en parallèle.
  - [ ] 100 % test coverage sur le happy path + 5 dispute scenarios.
  - [ ] Timelock dispute resolution functional.
  - [ ] Emergency redirect mechanism si Tether blacklist détecté.
- **Priority** : P0

#### 5. Dashboard Transaction Dual-Side
- **What** : interface web mobile-first FR/EN (côté importer) + équivalent fonctionnel via WhatsApp Business notifications (côté importer) et email + WeChat message embed (côté supplier — full WeChat Mini Program en V2).
- **User Story** : *"As an importer, I want to see exactly where my transaction is at any moment and get notified at each milestone, without opening the app."*
- **Stack** : Next.js + Vercel + Supabase realtime, Twilio WhatsApp Business API + Resend email + WeChat Work bot pour Chen.
- **Success Criteria** :
  - [ ] Statut transaction temps réel (drafted → funded → in transit → inspected → delivered → settled).
  - [ ] Notifications push à chaque transition avec one-click action.
  - [ ] Storage docs (proforma, BL, inspection cert, customs) avec accès dual-side.
  - [ ] Receipt PDF téléchargeable post-settlement avec breakdown des économies vs SWIFT.
  - [ ] Page load <3s sur 3G p95, lighthouse score >90.
- **Priority** : P0

#### 6. Smart Order Routing ML-Calibrated (3 sources)
- **What** : optimiseur d'allocation FX qui décide combien router à chaque on-ramp/OTC desk pour minimiser coût total (FX + slippage + délai).
- **User Story** : *"As a platform, I want to extract the maximum margin while delivering the best price to importers, so that unit economics support trade finance expansion."*
- **Architecture en 4 couches** :
  - **Couche 1 (Data)** : capture orderbook snapshots + RFQ quotes en temps réel sur 3 sources, log de chaque fill réel (predicted vs realized slippage).
  - **Couche 2 (ML)** : XGBoost par source, prédit `(α_slippage, spread, delay, fill_proba)` à partir de features contextuelles. **Bootstrap V1** : entraîné sur (a) données publiques scraped Binance P2P / Bybit P2P / OKX P2P sur 6–12 mois, (b) générateur synthétique paramétré sur ces stats pour augmenter la couverture des cas rares (fin de mois, holidays, CBN events).
  - **Couche 3 (Solver)** : CVXPY problem convexe minimisant `explicit_cost + slippage + delay_penalty` sous contraintes `sum=target, depth_caps, daily_limits, max_share_per_source`.
  - **Couche 4 (Feedback loop)** : log fill réel → dataset → re-training hebdo → A/B test contre baseline rule-based → deploy si gain.
- **Garde-fous V1** :
  - Si prédiction ML s'écarte >50 bps du baseline rule-based → fallback rule-based + log alerte.
  - Drift monitor sur features distribution → freeze model si drift >2σ sur 7 jours.
  - Hard contraintes solver (depth, daily limit, max 60 % par source) garantissent résilience même si ML déraille.
- **User Story** : *"As an importer, I want the platform to automatically get me the best execution across multiple sources, so that I save 10–30 bps without thinking about it."*
- **Stack** : Python + CVXPY + FastAPI on Modal, XGBoost trained offline + served via Modal endpoint, Postgres pour execution_log, Inngest pour scheduled re-training jobs.
- **Success Criteria** :
  - [ ] Solver tournant en prod avec 3 sources (Yellow Card + 2 OTC desks signed).
  - [ ] ML model trained + déployé avec validation hold-out >baseline.
  - [ ] Fallback rule-based fonctionnel testé.
  - [ ] Drift monitoring + alerting en place.
  - [ ] Slippage réalisé tracking-able transaction par transaction pour les 50 premières.
  - [ ] Pitch-ready : notebook reproducible + benchmark synthetique vs baseline.
- **Priority** : P0

### Nice to Have (If Time Allows)
- Receipt PDF generator multi-langue avec breakdown économies (boost partage organique).
- Refer-a-friend program côté African importer (Computer Village est très WhatsApp-driven).
- Trade history dashboard avec analytics persona (volume mensuel, top fournisseurs).

### NOT in MVP (Saving for V2+)

| Feature | Why Wait | Trigger d'inclusion |
|---|---|---|
| **Multi-corridor (Kenya, Senegal, Morocco)** | Compliance multi-juridiction lourd, focus first | Post-seed, 100+ importateurs Lagos actifs |
| **WeChat Mini Program native** | Setup 3–6 mois, requiert business account 中文 | Phase 2 supplier UX, après 50 fournisseurs traction |
| **Trade Finance / Factoring 30–90 jours** | Le revenue driver mais lourd à compliance + capital requirement | Series A, après dataset risk de 500+ tx |
| **SOR multi-objectif (slippage + netting + risk)** | Pas pertinent avant $50M+ TPV/mois | $20M TPV/mois |
| **Inspection oracle automatisé (SGS/CCIC API)** | Trop ambitieux V1, manual review fonctionne | 200+ tx/mois |
| **AI conversational copilot RAG** | Nice-to-have, pas un must | Post-launch, feedback users |
| **Internal netting** | Pas matériel avant scale | $50M+ TPV/mois |
| **Tron primary chain** | BNB Chain plus rapide à shipper V1, on parallel deploy | Post-audit, 6 mois post-launch |

*Why we're waiting* : Le MVP doit être shippable en 90 jours, auditable en 30 jours, et compréhensible par un non-technical investisseur. Tout ce qui ne renforce pas le pitch *"single corridor, real transactions, real economics"* reste dehors.

---

## How We'll Know It's Working

### Launch Success Metrics (90 jours post-launch — fin Q4 2026)

| Metric | Target | Measurement |
|---|---|---|
| **Transactions complétées end-to-end** | 50 | DB count, status=settled |
| **TPV cumulé** | $1M+ | Sum(USDT amount × USD spot) |
| **Importateurs actifs uniques** | 20+ | Count distinct buyer_kyb_id |
| **NPS importateur** | >50 | Survey post-transaction |
| **Re-utilisation rate** | >40 % à 60 jours | % of users with 2+ tx |
| **Slippage moyen vs baseline rule-based** | -10 bps | Comparison ML vs baseline log |
| **Settlement time côté Chen** | <T+1 médiane | Timestamp delta tranche release → CNY received |

### Growth Metrics (12 mois — avril 2027)

| Metric | Target | Measurement |
|---|---|---|
| **TPV mensuel** | $5M+ | Monthly aggregation |
| **Importateurs actifs/mois** | 100+ | Distinct users with 1+ tx in month |
| **Net revenue (FX margin + fees)** | $50–100k/mois | All revenue streams aggregated |
| **Take rate moyen** | 1,5–2 % du TPV | Net revenue / TPV |
| **CAC payback** | <2 mois | (CAC) / (LTV monthly amortized) |
| **Default / dispute rate** | <2 % | Disputes / total tx |

---

## Look & Feel

**Design Vibe :** *Institutional, transparent, programmable, multilingue, mobile-first.*

**Visual Principles :**
1. **Transparence radicale** : chaque coût visible, chaque délai annoncé, chaque comparaison vs alternative chiffrée. Aucun chiffre flou.
2. **Tabular numbers everywhere** : tout amount en `font-feature-settings: "tnum"` pour alignment vertical impeccable.
3. **Cross-currency clarity** : les 3 conversions (NGN payé → USDT held → CNY received) toujours visualisées sur la même ligne avec spread/fee décomposé. Inspiration directe : Wise breakdown UI.
4. **Mobile-first low-bandwidth** : skeleton loaders agressifs, optimistic UI, image lazy WebP/AVIF, hard cap response payload <50KB par route, PWA offline-capable pour le tracking.
5. **Bilinguisme natif** : pas un toggle "lang", mais une vraie I18n avec next-intl, currency formatting locale-aware (`Intl.NumberFormat`), date format adapté.

**Key Screens :**
1. **Landing page (FR/EN)** — hero "Save $1,700 on your next $30k order to China." + cost calculator inline + 3 testimonials Computer Village.
2. **KYB onboarding** — 3-step wizard mobile-first, progress bar visible.
3. **New transaction flow** — Upload proforma → AI extraction preview → KYB fournisseur → Quote (3s loader puis breakdown) → Funding step → Confirmation.
4. **Transaction detail** — timeline visuelle des milestones, docs storage, status temps réel, breakdown coûts vs SWIFT.
5. **Dashboard home** — list transactions actives + historique + KPIs personnels (total saved, avg settlement time).

### Simple Wireframe — New Transaction Quote Screen

```
┌──────────────────────────────────────────┐
│ [← Back]   New Transaction      [Help ?] │
├──────────────────────────────────────────┤
│                                          │
│  Quote ready in 2.4s                     │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │  You pay        ₦47,210,000  NGN   │  │
│  │  Supplier gets  ¥215,800     CNY   │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Breakdown                               │
│  ─ FX (USDT/NGN, 0.8% spread)  ₦378,000  │
│  ─ Platform fee (0.5%)         ₦236,000  │
│  ─ Off-ramp (USDT→CNY)         ¥1,080    │
│  ─ Network fees                 $2 USD   │
│                                          │
│  Total cost  $590                        │
│  vs SWIFT estimated $2,295 — Save $1,705 │
│                                          │
│  Settlement ETA  Same day (T+0)          │
│  Quote valid for 0:58                    │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │   Continue to escrow setup    →    │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

**Reference dashboards à étudier :**
- **Mercury** — B2B banking transaction list patterns.
- **Wise Business** — cross-currency clarity et fee breakdown.
- **Stripe Dashboard** — settings + product information architecture.
- **Ramp** — workflow + approval flows.

---

## Technical Considerations

| Aspect | Choix V1 |
|---|---|
| **Platform** | Web responsive (mobile-first PWA) + WhatsApp/email côté importer + email/WeChat msg côté supplier |
| **Frontend** | Next.js 15 + Vercel + shadcn/ui + Tailwind + next-intl (FR/EN/中文) |
| **Backend** | FastAPI on Modal (Python) + Supabase Postgres + Pinecone (RAG context V2) |
| **Auth** | Clerk (rapide à shipper) ou Supabase Auth + custom JWT |
| **Smart contracts** | Solidity + Foundry, BNB Chain mainnet primary V1, Safe multi-sig + custom Module |
| **AI / LLM** | Anthropic Claude Sonnet 4.5 (vision OCR + agent orchestration) |
| **SOR / Optimization** | Python + CVXPY + XGBoost on Modal endpoints |
| **Async / workers** | Inngest pour pipelines event-driven (intake → risk → quote → execute → settle) |
| **Monitoring** | Tenderly (on-chain) + Sentry (app) + custom alerting |
| **Compliance** | Sumsub or Smile ID (KYC/KYB) + ComplyAdvantage (sanctions) + Tianyancha (Chine) |

**Performance targets :**
- Page load <3s sur 3G p95.
- Quote latency <3s p95.
- KYB onboarding <15 min p95 importer / <30 min supplier.
- Document intake <15s p95.

**Security / Privacy :**
- KYC/KYB tiered (light pour <$10k tickets, full pour $50k+).
- AML/CFT screening obligatoire pre-fund.
- PII chiffré at-rest (Supabase Vault) + in-transit (TLS 1.3).
- Smart contract audit pre-mainnet ($50–80k Hacken or Cyfrin) + Code4rena contest 7 jours.
- Bug bounty Immunefi continu post-launch (5–10 % du TVL, capped).
- Multi-sig 3-of-5 sur les contracts admin avec hardware wallets obligatoires (Ledger/GridPlus).

**Scalability :**
- Architecture stateless backend → horizontal scale Modal.
- DB read replicas Supabase Pro à $5M+ TPV/mois.
- Smart contract gas-optimisé : factory pattern, storage packing, pas de loops sur user input.

---

## Quality Standards

**Ce que ce projet n'acceptera pas :**
- Placeholder content en production ("Lorem ipsum", sample images, fake testimonials).
- Features qui half-work : on ship complete, ou on cut.
- Skipping mobile testing avant launch — c'est *le* device principal.
- Skipping smart contract audit avant mainnet — non-négociable, le coût de la confiance.
- Communication marketing qui mention "ML" ou "AI" sans backing technique réel auditable.
- Hardcoding des couleurs / spacings — design tokens only via Tailwind config.

*Ces standards seront enforced via le code review process et l'audit pre-launch.*

---

## Budget & Constraints

### Solo founder pre-seed phase (jusqu'au seed close)

| Poste | Budget cible |
|---|---|
| Infrastructure (Vercel, Supabase, Modal, Pinecone, Anthropic) | $300–800/mois |
| Compliance tools (Sumsub, ComplyAdvantage, Tianyancha) | $1 500–3 000/mois |
| Legal counsel (cabinet Maurice + cabinet Nigeria) | $30–80k one-time setup |
| Smart contract audit | $50–80k pre-mainnet |
| Marketing pre-launch (Computer Village outreach, agents) | $5–15k |
| **Total avant seed close** | **<$200k cash burn** |

### Post-seed runway target

- **Seed $1–2M** raised mois 4–6.
- 18 mois runway = $80–110k/mois OPEX cible.
- Hire mois 6–8 : 2 ingés (smart contract + backend), 1 compliance/ops Lagos-based, 1 BD Lagos.

### Timeline serré

| Mois | Milestone |
|---|---|
| **0–1** | Recruter co-founder Nigerian senior P0, setup holdco Maurice, sign 5 LOI design partners |
| **1–3** | MVP technique build, sign API access Yellow Card + 2 OTC desks, apply ARIP Nigeria |
| **3–4** | Audit Hacken + Code4rena contest, beta privée 10 importateurs |
| **4–6** | Mainnet deploy, soft launch 50 importateurs, fundraising seed |
| **6–12** | Scale Lagos, prep Phase 2 (Kenya entity setup) |

### Team

- Solo founder (Oscar) — full-stack + smart contract + quant background + Mandarin.
- Co-founder Nigerian senior **P0 dans 90 jours** (ex-Flutterwave, Onafriq, Yellow Card, Cauridor) — sans ça, blocage SEC Nigeria et risque distribution majeur.
- Premiers hires post-seed : 2 ingés, 1 compliance/ops Lagos, 1 BD Lagos.

---

## Open Questions & Assumptions

**Open questions :**
- Le co-founder Nigerian se trouve-t-il dans 90 jours ? (Si non, pivot Kenya-first.)
- Quel OTC desk #2 sign en plus de Yellow Card ? (OSL, Hashkey, Bitget OTC ? À sequencer.)
- BNB Chain primary V1 ou Tron ? (Tradeoff tooling vs liquidité USDT — décidé BNB pour V1, Tron en V2.)
- Sumsub vs Smile ID en V1 ? (Smile ID a meilleur match rate BVN Nigeria, à benchmarker.)
- Path Nigeria : ARIP direct ou warehousing avec un VASP existant ? (Dépend du co-founder + cabinet legal advice.)

**Key assumptions :**
- L'adoption stablecoin chez les importateurs Computer Village va monter de 15 % à 30 %+ d'ici 2027.
- XTransfer ne pivotera pas vers escrow programmable + UX African importer-first dans les 12 prochains mois (window of execution).
- Le réglementaire Nigeria reste sur sa trajectoire actuelle (ARIP fonctionnel, CBN pro-banking VASPs).
- Tether ne blacklist pas massivement les flows commerciaux Africa-China.
- Les VCs (Adaverse, Rally Cap, Castle Island) restent thesis-aligned sur Africa stablecoin infra.

---

## Launch Strategy (Brief)

**Soft launch (mois 4) :**
- 10 importateurs handpicked depuis Computer Village + Alaba International.
- Onboarding manual, hand-holding par Oscar + co-founder.
- Cap volume <$200k/jour pour limiter exposure pendant la stabilisation.

**Public launch (mois 6) :**
- 50 importateurs cible.
- WhatsApp referral program activé.
- LinkedIn outbound + chambre de commerce Lagos.
- PR : pitch TechCabal, Rest of World, The Generalist sur l'angle "first AI-native trade finance for Africa-China."

**Feedback collection :**
- Post-transaction NPS survey en WhatsApp (1-tap response).
- Weekly user calls avec 5 power users.
- Telemetry instrumentée sur tous les funnel drop-offs.

**Iteration cycle :**
- Sprint 2 semaines.
- Hot-fix < 24h pour bugs critiques.
- Feature releases mensuelles avec changelog public.

---

## Definition of Done for MVP

Le MVP est ready to launch quand :

- [ ] Tous les P0 features (1–6) sont fonctionnels en mainnet.
- [ ] Smart contract audit Hacken/Cyfrin passé + findings high/medium tous fixés.
- [ ] Code4rena contest fini, pas de findings critical.
- [ ] Bug bounty Immunefi live.
- [ ] One complete user journey end-to-end testée avec 5+ vraies transactions Lagos→Yiwu.
- [ ] Mobile + desktop testés sur Chrome / Safari / Edge dernières versions.
- [ ] Lighthouse score >90 mobile sur landing + dashboard.
- [ ] WhatsApp + email notifications testées + monitorées.
- [ ] Compliance officer trained + multi-sig keys distribués + procedures documentées.
- [ ] Disaster recovery plan : key compromise, stablecoin freeze, RPC outage, partner failure.
- [ ] Analytics tracking complet (Posthog ou Mixpanel) : funnel, retention, NPS.
- [ ] Privacy policy + ToS rédigés FR/EN/中文 par cabinet legal.
- [ ] ARIP application Nigeria submitted + AIP en cours ou obtenu.
- [ ] Holdco Maurice opérationnelle.
- [ ] Co-founder Nigerian onboardé.

---

## Next Steps

Après approval de ce PRD :

1. **Part 3 — Technical Design Document** : architecture détaillée, schémas DB, smart contract spec, AI agent prompts, deployment topology.
2. **Setup development environment** : repo monorepo, CI/CD, staging env, test wallet topology.
3. **Build MVP avec AI assistance** : Claude Code + Cursor sur les 90 jours, milestones bi-weekly.
4. **Beta tests** : 5–10 design partners, then 50 importateurs.
5. **Launch** : public, mois 6, fundraising seed en parallèle.

---

*Document created : 25 avril 2026*
*Status : Draft v1 — Ready for Technical Design (Part 3)*
*Owner : Oscar*
*Stakeholders : co-founder Nigerian (TBD), legal counsel Maurice + Nigeria, lead audit firm (Hacken or Cyfrin)*
