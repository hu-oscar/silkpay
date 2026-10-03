# Product Requirements

> AI-agent-facing summary of the Silkpay product requirements.

## Product Overview

| Field              | Value                                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **App name**       | Yuán _(working — final naming TBD)_                                                                                                                             |
| **Tagline**        | _"Pay China like it's next door."_                                                                                                                              |
| **Launch goal**    | Close a seed **$1–2M in 6 months** on the traction of a Lagos–Yiwu MVP: **50 completed transactions and $1M+ cumulative TPV** in the first 90 days post-launch. |
| **Target launch**  | Private beta month 4 (Aug 2026), public launch month 6 (Oct 2026)                                                                                               |
| **Primary market** | Nigeria → China, single corridor Lagos ↔ Yiwu / Shenzhen                                                                                                        |

## Users

### Primary — "Chinedu" (Nigerian importer)

- ~32yo, Computer Village (Ikeja, Lagos), ~$400k/yr in 12–15 tx of $20k–$50k.
- Mobile-first Android, WhatsApp + Nigerian banking apps native; not crypto-native (maybe touched USDT once).
- Pain: SWIFT 5–7% friction + 3–5 days + zero protection; hawala illegal + supplier accounts freezable; USDT P2P broken UX + scam risk; zero visibility post-payment.
- Needs: transparent all-in price _before_ paying, T+0/T+1 settlement, escrow protection, FR or business-EN UX (not crypto-native).

### Secondary — "Mr. Chen" (Chinese supplier)

- Yiwu / Shenzhen wholesaler, 5–10 years selling to African importers.
- Native WeChat + Alipay; corporate accounting on Yonyou or Kingdee. Limited business English.
- Pain: African importers default 10–15% on informal deals; hawala caused 6-week account freeze in 2023.
- Needs: credible guarantee that funds are _secured_ before he ships; clean CNY on his Chinese domestic bank account; 中文 UI on WeChat (not a new app).

## Primary User Story

> Chinedu needs to import 200 smartphones from Yiwu for $30,000. Today he wires via SWIFT — 3-day wait, $2,295 in friction, zero protection if Mr. Chen ships the wrong goods.
>
> He hears about Yuán via a WhatsApp referral from another Computer Village importer. He uploads his proforma — Claude Vision parses it in 10s, verifies the supplier on Tianyancha (Chinese business registry), checks ComplyAdvantage sanctions. The platform shows: **total cost $590 vs $2,295 SWIFT**, escrow-protected delivery with 3 tranches.
>
> He accepts. Pays in NGN via Yellow Card on-ramp from his GTBank account. USDT lands in a Safe multi-sig escrow in 4 minutes. Mr. Chen gets a WeChat notification: "$30,000 USDT secured, ready to release on shipment."
>
> Mr. Chen ships, signs the BL on-platform → tranche 1 (30%) released → USDT→CNY conversion via PSP partner → ¥64,800 on his Chinese bank account same day. CCIC inspection in Lagos → tranche 2 (50%) → container delivery → tranche 3 (20%).
>
> Chinedu saved $1,705 with a complete audit trail. Mr. Chen has clean CNY, no freeze risk. They both know they'll do the next deal here.

## MVP Features (Must-Have for Launch — all P0)

### Feature 1 — Onboarding KYB bilingue (FR/EN/中文)

- 3-step mobile-first wizard. Africa side: Smile ID (BVN match + ID photo) + ComplyAdvantage (sanctions/PEP). China side: Tianyancha API (business registry) + manual review fallback. Wallet: Pimlico account abstraction (smart account on-demand, BNB Chain).
- **User story:** _"As an importer in Lagos, I want to onboard in <15 min with my CAC + BVN, so I can start a transaction the same day."_
- **Success criteria:**
  - [ ] African importer onboarding < 15 min p95.
  - [ ] Chinese supplier onboarding < 30 min p95 (manual review acceptable V1).
  - [ ] False rejection rate < 5%.
  - [ ] Sanctions/PEP screening auto with human-flag review for ambiguous cases.

### Feature 2 — Document Intake AI (Claude Vision)

- Upload proforma / BL / packing list / PO (PDF/JPG/PNG). Claude Sonnet vision parses to structured JSON (HSC codes, amounts, parties, Incoterms). Tesseract OCR fallback if confidence < 0.80.
- **User story:** _"As an importer, I want to upload my proforma and have the platform extract all data automatically, so I don't re-type 30 fields."_
- **Success criteria:**
  - [ ] Extraction accuracy > 90% on 50 test proformas (amounts, parties, items).
  - [ ] Latency < 15s p95 per document.
  - [ ] Cost < $0.05 per complete transaction (proforma + BL + packing list).

### Feature 3 — Quote Engine Single-Corridor (Lagos↔Yiwu, USDT TRC-20→CNY)

- Takes target amount (e.g., $30k), shows in <3s: all-in cost breakdown, FX rate, fees, ETA, comparison vs. SWIFT estimate.
- **User story:** _"As an importer, I want to see the total cost and ETA before I commit a single naira, so I can decide quickly."_
- **Success criteria:**
  - [ ] Quote latency < 3s p95.
  - [ ] Quote validity window 60s with auto-refresh.
  - [ ] Breakdown: NGN paid, USDT received, CNY delivered, fees per line item.
  - [ ] Aggressive transparency vs. SWIFT estimate.

### Feature 4 — Smart Contract Escrow 3-Tranche

- Per-transaction Safe multi-sig 3-of-5 + custom `TradeEscrowModule`. Tranches: 30% on BL signed, 50% on inspection certificate uploaded, 20% on delivery acknowledgment. V1: manual milestone attestation by Yuán compliance officer (multi-sig signature). V2: CCIC/SGS oracle. Per-tranche timeout: 30 days no action → auto-refund to buyer.
- **Chain:** BNB Chain mainnet primary V1 (USDT BEP-20). Tron parallel deploy V2.
- **User story:** _"As both buyer and supplier, we want funds released progressively as milestones are met, so neither bears full counterparty risk upfront."_
- **Success criteria:**
  - [ ] Pre-mainnet audit by Hacken or Cyfrin ($50–80k).
  - [ ] Code4rena 7-day contest in parallel.
  - [ ] 100% test coverage on happy path + 5 dispute scenarios.
  - [ ] Timelock dispute resolution functional.
  - [ ] Emergency redirect mechanism if Tether blacklist detected.

### Feature 5 — Dashboard Transaction Dual-Side

- Mobile-first FR/EN web dashboard (importer side) + WhatsApp Business notifications. Email + WeChat msg embed (supplier V1). WeChat Mini Program in V2.
- **Stack:** Next.js + Vercel + Supabase realtime + Twilio WhatsApp + Resend + WeChat Work bot.
- **User story:** _"As an importer, I want to see exactly where my transaction is at any moment and get notified at each milestone, without opening the app."_
- **Success criteria:**
  - [ ] Real-time transaction status (drafted → funded → in_transit → inspected → delivered → settled).
  - [ ] Push notifications at each transition with one-click action.
  - [ ] Doc storage (proforma, BL, inspection cert, customs) with dual-side access.
  - [ ] Downloadable PDF receipt post-settlement with savings-vs-SWIFT breakdown.
  - [ ] Page load < 3s on 3G p95, Lighthouse mobile > 90.

### Feature 6 — Smart Order Routing ML-Calibrated (3 sources)

- FX allocation optimizer across 3 NGN→USDT sources (Yellow Card + 2 OTC desks). 4-layer architecture:
  1. **Data:** capture orderbook snapshots + RFQ quotes real-time, log every fill (predicted vs realized slippage).
  2. **ML:** XGBoost per source predicts `(α_slippage, spread, delay, fill_proba)`. **V1 bootstrap:** scraped public Binance/Bybit/OKX P2P (NGN/USDT, 6–12 months) + synthetic generator parameterized on those stats.
  3. **Solver:** CVXPY convex problem — minimize `explicit_cost + slippage + delay_penalty` subject to `sum=target, depth_caps, daily_limits, max_share_per_source`.
  4. **Feedback loop:** log realized fills → dataset → weekly retrain → A/B vs baseline rule-based → deploy if gain.
- **V1 guardrails:** if ML prediction diverges > 50 bps from baseline rule-based → fallback rule-based + alert. Drift monitor (>2σ/7 days = freeze model). Hard solver constraints (depth, daily limit, max 60% per source) as ultimate guardrail.
- **User story:** _"As an importer, I want the platform to automatically get me the best execution across multiple sources, so I save 10–30 bps without thinking about it."_
- **Stack:** Python + CVXPY + FastAPI on Modal, XGBoost trained offline + served via Modal endpoint, Postgres for execution_log, Inngest for scheduled retraining.
- **Success criteria:**
  - [ ] Solver in production with 3 signed sources (Yellow Card + 2 OTC desks).
  - [ ] ML model trained + deployed with hold-out validation > baseline.
  - [ ] Fallback rule-based functional and tested.
  - [ ] Drift monitoring + alerting in place.
  - [ ] Realized-slippage tracking transaction-by-transaction for first 50.
  - [ ] Pitch-ready: reproducible notebook + synthetic benchmark vs baseline.

## Nice-to-Have (if time allows)

- Multi-language receipt PDF generator with savings breakdown (boost organic sharing).
- Refer-a-friend program for African importers (Computer Village is WhatsApp-driven).
- Trade history dashboard with persona analytics (monthly volume, top suppliers).

## NOT in MVP (saving for V2+)

| Feature                                         | Why wait                                         | Inclusion trigger                               |
| ----------------------------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Multi-corridor (Kenya, Senegal, Morocco)        | Multi-jurisdiction compliance heavy              | Post-seed, 100+ active Lagos importers          |
| WeChat Mini Program native                      | 3–6 months setup, requires 中文 business account | Phase 2 supplier UX, after 50 supplier traction |
| Trade Finance / Factoring 30–90 days            | Revenue driver but heavy compliance + capital    | Series A, after 500+ tx risk dataset            |
| Multi-objective SOR (slippage + netting + risk) | Not relevant before $50M+ TPV/mo                 | $20M TPV/mo                                     |
| Inspection oracle automation (SGS/CCIC API)     | Too ambitious V1, manual works                   | 200+ tx/mo                                      |
| AI conversational copilot (RAG)                 | Nice-to-have, not must                           | Post-launch user feedback                       |
| Internal netting                                | Not material before scale                        | $50M+ TPV/mo                                    |
| Tron primary chain                              | BSC ships faster V1; parallel deploy later       | Post-audit, 6 months post-launch                |

## Success Metrics

### 90 days post-launch (end Q4 2026)

| Metric                              | Target       |
| ----------------------------------- | ------------ |
| Transactions completed end-to-end   | 50           |
| Cumulative TPV                      | $1M+         |
| Unique active importers             | 20+          |
| Importer NPS                        | > 50         |
| Re-use rate at 60 days              | > 40%        |
| Avg slippage vs baseline rule-based | −10 bps      |
| Settlement time supplier-side       | < T+1 median |

### 12-month (April 2027)

| Metric                         | Target        |
| ------------------------------ | ------------- |
| Monthly TPV                    | $5M+          |
| Active importers / month       | 100+          |
| Net revenue (FX margin + fees) | $50–100k/mo   |
| Avg take rate                  | 1.5–2% of TPV |
| CAC payback                    | < 2 months    |
| Default / dispute rate         | < 2%          |

## UI / UX Requirements

**Design vibe:** _Institutional, transparent, programmable, multilingual, mobile-first._

1. **Radical transparency:** every cost visible, every delay announced, every comparison vs. alternative is a real number — no fuzzy claims.
2. **Tabular numbers everywhere:** all amount displays use `font-feature-settings: "tnum"` for vertical alignment.
3. **Cross-currency clarity:** the 3 conversions (NGN paid → USDT held → CNY received) always on the same line with spread/fee decomposed. Inspiration: Wise breakdown UI.
4. **Mobile-first low-bandwidth:** aggressive skeleton loaders, optimistic UI, lazy WebP/AVIF, payload <50KB per route, PWA offline-capable for tracking.
5. **Bilinguisme natif:** real i18n via `next-intl`, not a "lang" toggle. Locale-aware `Intl.NumberFormat`, date format adapted.

**Key screens:**

1. Landing page (FR/EN) — hero "Save $1,700 on your next $30k order to China." + inline cost calculator + 3 Computer Village testimonials.
2. KYB onboarding — 3-step wizard mobile-first, progress bar visible.
3. New transaction flow — Upload proforma → AI extraction preview → supplier KYB → Quote (3s loader, then breakdown) → Funding → Confirmation.
4. Transaction detail — visual milestone timeline, doc storage, real-time status, costs vs SWIFT breakdown.
5. Dashboard home — list of active transactions + history + personal KPIs (total saved, avg settlement time).

**Reference dashboards:** Mercury (B2B banking tx list), Wise Business (cross-currency clarity), Stripe Dashboard (settings + product IA), Ramp (workflow/approval).

## Quality Standards (non-negotiable)

- **No placeholder content in production** (Lorem ipsum, sample images, fake testimonials).
- **No half-working features** — ship complete or cut.
- **No skipping mobile testing** before launch — it is _the_ primary device.
- **No skipping smart contract audit** before mainnet.
- **No marketing claims** mentioning "ML" or "AI" without auditable technical backing.
- **No hardcoded colors/spacings** — design tokens via Tailwind config only.

## Technical Considerations (V1 choices)

| Aspect             | V1 choice                                                                               |
| ------------------ | --------------------------------------------------------------------------------------- |
| Platform           | Web responsive (mobile-first PWA) + WhatsApp/email importer + email/WeChat msg supplier |
| Frontend           | Next.js 15 + Vercel + shadcn/ui + Tailwind + next-intl (FR/EN/中文)                     |
| Backend            | FastAPI on Modal (Python) + Supabase Postgres + Pinecone (RAG context V2)               |
| Auth               | Clerk (V1) — Supabase Auth fallback Y2                                                  |
| Smart contracts    | Solidity + Foundry, BNB Chain mainnet primary, Safe multi-sig + custom Module           |
| AI / LLM           | Anthropic Claude Sonnet (vision OCR + agent orchestration)                              |
| SOR / Optimization | Python + CVXPY + XGBoost on Modal endpoints                                             |
| Async / workers    | Inngest event-driven (intake → risk → quote → execute → settle)                         |
| Monitoring         | Tenderly (on-chain) + Sentry (app) + custom alerting                                    |
| Compliance         | Smile ID (KYC/KYB) + ComplyAdvantage (sanctions) + Tianyancha (China)                   |

**Performance targets:** Page load <3s on 3G p95. Quote latency <3s p95. KYB onboarding <15min p95 importer / <30min supplier. Document intake <15s p95.

**Security/Privacy:** Tiered KYC/KYB (light <$10k, full $50k+). Mandatory AML/CFT pre-fund screening. PII encrypted at rest (Supabase Vault) + in-transit (TLS 1.3). Pre-mainnet audit ($50–80k Hacken/Cyfrin) + Code4rena 7-day contest. Continuous Immunefi bug bounty post-launch (5–10% TVL, capped). Multi-sig 3-of-5 admin contracts with hardware wallets only.

## Definition of Done for MVP

- [ ] All P0 features (1–6) functional on mainnet.
- [ ] Smart contract audit Hacken/Cyfrin passed + all high/medium fixed.
- [ ] Code4rena contest finished, no critical findings.
- [ ] Bug bounty Immunefi live.
- [ ] One complete user journey end-to-end tested with 5+ real Lagos→Yiwu transactions.
- [ ] Mobile + desktop tested on Chrome / Safari / Edge latest.
- [ ] Lighthouse score >90 mobile on landing + dashboard.
- [ ] WhatsApp + email notifications tested + monitored.
- [ ] Compliance officer trained + multi-sig keys distributed + procedures documented.
- [ ] Disaster recovery plan: key compromise, stablecoin freeze, RPC outage, partner failure.
- [ ] Analytics tracking complete (Posthog or Mixpanel): funnel, retention, NPS.
- [ ] Privacy policy + ToS drafted FR/EN/中文 by legal counsel.
- [ ] ARIP application Nigeria submitted + AIP in progress or obtained.
- [ ] Mauritius holdco operational.
- [ ] Nigerian co-founder onboarded.
