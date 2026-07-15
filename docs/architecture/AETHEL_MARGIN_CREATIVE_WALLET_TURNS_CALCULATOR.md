# Aethel Engine — Margin Mix · Creative Wallet · Wallet→Turns Calculator

**Version:** 1.0 (Chief Architect — calculated, binding for Wave 6 UX copy)  
**Status:** **Binding calculations** — does **not** change retail prices ($0 / $9 / $29 / $79) or dual-pool sizes  
**Date:** 2026-07-09  

**Inputs (code / docs — do not invent):**
- Dual pools: `cloud-web-app/web/lib/plan-ai-quotas.ts`
- Packs UI: `cloud-web-app/web/components/billing/CreditWallet.tsx`
- Creative weighted estimates: `cloud-web-app/web/lib/creative-provider-matrix.ts` (`CREATIVE_WEIGHTED_TOKEN_ESTIMATES`)
- Fixed creative credits (legacy): `cloud-web-app/web/lib/credit-wallet-costs.ts`
- Weight floor: `docs/architecture/billing_security_analysis.md` §4.2 / §5
- Credit unit: `AETHEL_PAYG_AND_WALLET_SPEC.md` §3.2 — **1 AI Credit = 1,000 weighted tokens** (Wave 6 unify)

**Related:** [`AETHEL_AI_WORKLOAD_AND_BILLING_ALIGNMENT.md`](./AETHEL_AI_WORKLOAD_AND_BILLING_ALIGNMENT.md) §2b · [`AETHEL_PLANS_CANONICAL_REFERENCE.md`](./AETHEL_PLANS_CANONICAL_REFERENCE.md) · [`AETHEL_PAYG_AND_WALLET_SPEC.md`](./AETHEL_PAYG_AND_WALLET_SPEC.md)

---

## 0. Verdict (one page)

| Question | Answer |
|----------|--------|
| Is Pro $29 safe on AI COGS? | **Yes** — even full burn of Fast+Premium ≈ **~$0.68** API @ canonical floor; net ~$27.5 → **~97%+** AI-line margin |
| Does mix matter? | **Yes for UX, not for survival** — typical Fast-primary ≈ **~$0.40–0.55** API; Sonnet-primary empties Premium fast then falls back to Fast |
| Can 1 video kill Pro? | **Today yes (product feel)** if creative stays on LLM pool; **after Creative Wallet** video never touches Fast/Premium bars |
| What does $10 wallet buy? | **~500 credits** ≈ **~83** normal Fast turns **or** **~2** normal Sonnet turns (overage intentionally expensive) |
| What does $25 wallet buy? | **~1,600 credits** ≈ **~266** Fast turns **or** **~6–7** Sonnet turns **or** **~20** min video jobs |

**Golden rule:** Subscription = everyday Fast + small Premium polish. Wallet/PAYG/BYOK = continuation. Creative = **separate meter**.

---

## 1. Canonical cost floor (do not drift)

From `billing_security_analysis.md` §5:

| Class | Planning $/M tokens | Weight | Examples |
|-------|---------------------|--------|----------|
| **Fast** | **$0.15** | 1× | Gemini Flash, Haiku, nano |
| **Premium** | **$6.00** | 40× | Sonnet, GPT-5 class |
| **Ultra** | **$30+** | 200× | Opus, o1 — **wallet/BYOK/PAYG only** |

$$\text{Weighted} = \text{Raw} \times \frac{\$/M}{0.15}$$

**Pro included:**

| Pool | Raw / mo | Weighted | Max API $ @ floor |
|------|----------|----------|-------------------|
| Fast | 3,000,000 | 3,000,000 | 3M × $0.15/M = **$0.45** |
| Premium | 37,500 | 1,500,000 | 37.5K × $6/M = **$0.225** |
| **Total** | — | **4,500,000** | **~$0.675** |

Studio: 12M Fast + 150K Prem raw → 18M weighted → max API ≈ **$2.70**.

> **Note:** Real Anthropic/OpenAI list prices move. If blended Premium rises above ~$6/M, **re-run this file** and update `billing_security_analysis.md` §4.2 — **do not** silently change list prices.

---

## 2. Margin × usage mix (Pro $29)

**Assumptions:** net revenue ≈ **$27.50** (after ~5% fees). Ultra never on included path.

### 2.1 Mix scenarios (monthly)

| Mix ID | Behavior (Universal IDE) | Fast raw used | Prem raw used | Est. API $ | AI-line margin |
|--------|--------------------------|---------------|---------------|------------|----------------|
| **T — Typical** | Fast primary; Sonnet ~1–2×/day polish | 2.5M | 20K | $0.375 + $0.12 = **~$0.50** | **~98%** |
| **P — Full burn** | Empties both pools | 3.0M | 37.5K | **~$0.68** | **~97.5%** |
| **S — Sonnet-first** | Pins Sonnet until Premium empty, then Fast | 3.0M | 37.5K | **~$0.68** (same ceiling) | **~97.5%** |
| **L — Light** | Casual weeknights | 0.8M | 5K | **~$0.15** | **~99%** |
| **C — Creative leak** | 10× videoMinJob (80K w each) on **same** LLM pool + rest Fast | see §3 | — | **Understates real video COGS** | **Unsafe until Creative Wallet** |

**Conclusion:** Subscription AI margin is **not** the risk. Risk is (1) **UX shortness** if Sonnet is default, (2) **multimodal COGS** if video/3D stay on the LLM pool, (3) **double debit** (GAP-PAYG-01).

### 2.2 Studio $79 (same logic ×4 Premium)

| Mix | Est. API $ | Notes |
|-----|------------|-------|
| Typical team (shared) | ~$1.5–2.0 | Needs **member caps** (6H) so one seat cannot burn org Premium |
| Full burn | ~$2.70 | Still ~96%+ on AI line |

### 2.3 Free / Starter

| Tier | Included | Max API @ floor | Note |
|------|----------|-----------------|------|
| Free | 200K Fast only | **~$0.03** | Free models only; Premium = wallet/BYOK |
| Starter $9 | 1M Fast | **~$0.15** | No Premium pool |

---

## 3. Creative Wallet calculator (binding target — Wave 6F)

### 3.1 Why separate

Today `CREATIVE_WEIGHTED_TOKEN_ESTIMATES` debit the **same** `UsageBucket` as chat (`GAP-FUSION-02`).  
One `videoMinJob` = **80,000 weighted** ≈ **1.8%** of Pro’s 4.5M — looks “cheap” on the weight floor, but **real video providers** are often **$0.50–$2+ / clip**, so the weight model **under-prices** video vs Flash tokens.

**Binding:** Creative jobs settle on **Creative Wallet** (or BYOK). Fast/Premium bars **do not move**.

### 3.2 Job → credits (unify on weighted estimates)

**Rule (Wave 6):**  
`creativeCredits = ceil(weightedEstimate / 1000)`  
(aligns with **1 credit = 1K weighted**; supersedes ad-hoc `CREDITS_FIXED_COST` for new Creative Wallet UI — keep fixed costs only until migration).

| Job | Weighted (`creative-provider-matrix`) | Credits | vs Pro LLM pool today |
|-----|----------------------------------------|---------|------------------------|
| Image standard | 12,000 | **12** | Burns chat pool |
| Image HD | 20,000 | **20** | Burns chat pool |
| 3D draft | 20,000 | **20** | Burns chat pool |
| 3D standard | 35,000 | **35** | Burns chat pool |
| 3D high | 60,000 | **60** | Burns chat pool |
| Music / minute | 900 (min job 15,000) | **1** / min (**15** min job) | Burns chat pool |
| Video min job | 80,000 | **80** | **Dangerous on Pro feel** |
| Video / s 720p | 38,000 | **38** / s | Escalates fast |
| Voice / 1K chars | 500 | **1** / 1K chars | OK |

### 3.3 How many creative jobs per pack?

Packs from `CreditWallet.tsx` (settlement **not live** — prices are canonical UI):

| Pack | USD | Credits (w/ bonus) | Images std | 3D std | Video min jobs |
|------|-----|--------------------|------------|--------|----------------|
| Starter `pack-500` | $9.99 | **500** | **~41** | **~14** | **~6** |
| Creator `pack-1500` | $24.99 | **1,600** | **~133** | **~45** | **~20** |
| Pro `pack-5000` | $74.99 | **5,500** | **~458** | **~157** | **~68** |
| Studio `pack-15000` | $199.99 | **17,000** | **~1,416** | **~485** | **~212** |

**UX copy (EN):**  
“Creative credits are separate from Fast/Premium AI. A short video uses ~80 creative credits — your coding quota stays intact.”

### 3.4 Margin floor on creative (planning)

Until live provider invoices exist, treat pack retail as **prepaid Creative**:

| Pack | Credits | Implied $/credit | If video COGS = $1.00 / min-job (80 cr) | Gross on that job |
|------|---------|------------------|------------------------------------------|-------------------|
| Creator | 1600 | ~$0.0156 | Retail ≈ **$1.25** | **~20%** if COGS $1 — **tight** |
| Starter | 500 | ~$0.020 | Retail ≈ **$1.60** | **~37%** if COGS $1 |

**Action if real video COGS > ~$1.20:** raise video credit cost (e.g. 120–150 cr) or add **Creative-only packs** with higher $/credit — **do not** steal from Fast pool. Re-run this § when providers are contracted.

### 3.5 “Whole game art” rough budget (honest)

| Scope | Images | 3D | Short videos | Credits ≈ | Pack hint |
|-------|--------|-----|--------------|-----------|-----------|
| Web demo polish | 20 | 5 | 0 | 20×12 + 5×35 = **415** | ~$10 |
| Indie vertical slice | 80 | 25 | 2 | 960 + 875 + 160 = **~2,000** | ~$25–75 |
| Trailer-heavy launch | 200 | 60 | 10 | 2400 + 2100 + 800 = **~5,300** | ~$75 |

LLM scaffold for the same game still comes from **Fast/Premium** (see workload §2b) — not from Creative.

---

## 4. Wallet → turns calculator (chat / code path)

### 4.1 Formulas

$$
\begin{align}
\text{credits} &= \lceil \text{rawTokens} \times \text{weight} / 1000 \rceil \\
\text{Fast weight} &= 1,\quad \text{Premium} = 40,\quad \text{Ultra} = 200
\end{align}
$$

| Call type | Raw tokens | Fast credits | Premium credits | Ultra credits |
|-----------|------------|--------------|-----------------|---------------|
| Light chat | 2,000 | **2** | **80** | **400** |
| Normal IDE turn | 6,000 | **6** | **240** | **1,200** |
| Agent step + tools | 10,000 | **10** | **400** | **2,000** |
| Fat context | 24,000 | **24** | **960** | **4,800** |

### 4.2 Turns per pack (Premium / Sonnet)

| Pack | Credits | Light Sonnet (80 cr) | Normal (240) | Agent (400) | Fat (960) |
|------|---------|----------------------|--------------|-------------|-----------|
| $9.99 / 500 | 500 | **~6** | **~2** | **~1** | **0** |
| $24.99 / 1,600 | 1,600 | **~20** | **~6–7** | **~4** | **~1** |
| $74.99 / 5,500 | 5,500 | **~68** | **~22** | **~13** | **~5** |
| $199.99 / 17,000 | 17,000 | **~212** | **~70** | **~42** | **~17** |

### 4.3 Turns per pack (Fast)

| Pack | Light (2 cr) | Normal (6) | Agent (10) |
|------|--------------|------------|------------|
| $9.99 / 500 | **~250** | **~83** | **~50** |
| $24.99 / 1,600 | **~800** | **~266** | **~160** |
| $74.99 / 5,500 | **~2,750** | **~916** | **~550** |

### 4.4 vs Pro included (value story)

| Source | Normal Fast turns | Normal Sonnet turns |
|--------|-------------------|---------------------|
| **Pro included** | **~500** (3M Fast) | **~6** (37.5K Prem) |
| Wallet $10 | ~83 Fast **or** ~2 Sonnet | — |
| Wallet $25 | ~266 Fast **or** ~6–7 Sonnet | — |

**UX copy:**  
“Pro already includes ~500 everyday AI turns and ~6 Premium polish turns. Credits are for when you want more — Premium overage costs more per turn by design.”

### 4.5 PAYG spend cap → turns

On-demand = prepaid × **1.10** (`AETHEL_PAYG_AND_WALLET_SPEC.md` §3.3).  
Approx at Creator density (~$15.62/M weighted prepaid → ~$17.18/M on-demand):

| Spend cap | ≈ Weighted tokens | ≈ Normal Fast | ≈ Normal Sonnet |
|-----------|-------------------|---------------|-----------------|
| **$25** | ~1.45M | **~240** | **~6** |
| **$50** | ~2.9M | **~480** | **~12** |
| **$100** | ~5.8M | **~960** | **~24** |

Email alerts at **50%** and **100%** of cap (binding).

### 4.6 BYOK

Platform AI COGS = **$0**. User still pays Platform SKU if modular ($15 Pro / $45 Studio).  
Turns = limited only by their provider bill + **10 req/min** proxy.

---

## 5. Composer / Usage chip formulas (for Claude 6H)

Show before send (EN):

```
Est. 6.2K tokens · Fast pool · $0.00 included
Est. 6.2K tokens · Premium · ~1 of ~6 polish turns left
Est. 6.2K tokens · Wallet · 240 credits (~$3.75 at Creator rate)
```

Premium turns remaining (approx):

$$
\text{turnsLeft} \approx \left\lfloor \frac{\text{premiumRawRemaining}}{\text{avgRawPerTurn}} \right\rfloor
$$

Use **avgRawPerTurn = 6,000** for chip until telemetry exists; then replace with p50 from UsageBucket.

Creative chip:

```
Video ~80 creative credits · Fast/Premium unchanged
```

---

## 6. What this unlocks / still open

| Done in this doc | Still needs live data later |
|------------------|-----------------------------|
| Mix margin proof for $29/$79 | Real provider invoices vs $0.15 / $6 floor |
| Creative job ↔ credit table | Raise video credits if COGS > ~$1.20 |
| Wallet/PAYG → turn tables | Telemetry: p50 tokens/turn, % Sonnet-pinned |
| UX copy anchors | Stripe settlement (packs still `checkoutUrl: null`) |

**Do not change:** list prices, dual-pool sizes, Ultra-off-sub, IDE-stays-open.

---

## 7. Decision checklist

- [x] Pro full-burn AI COGS ≈ $0.68 — prices stay  
- [x] Document typical vs Sonnet-first mix  
- [x] Creative credits from `CREATIVE_WEIGHTED_TOKEN_ESTIMATES`  
- [x] Pack → Sonnet / Fast / creative job counts  
- [x] PAYG cap → turns  
- [ ] Claude 6F: Creative Wallet ledger (stop GAP-FUSION-02)  
- [ ] Claude 6A: spend-resolver (stop GAP-PAYG-01)  
- [ ] Claude 6H: Usage + composer chips using §5 formulas  
- [ ] Re-run §3.4 when video provider contract signed  

---

## 8. Changelog

| Date | Ver | Change |
|------|-----|--------|
| 2026-07-09 | 1.0 | Margin mix + Creative Wallet job table + wallet/PAYG→turns; keep prices |
