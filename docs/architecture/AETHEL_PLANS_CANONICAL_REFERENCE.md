# Aethel Engine — Plans Canonical Reference

**Version:** 1.1 (Chief Architect — best-in-market UX + competitive plan decisions)  
**Status:** **Binding** — single table for all plan docs; **code owner:** `cloud-web-app/web/lib/plans.ts` + `plan-ai-quotas.ts`  
**Rule:** Any doc that cites prices, quotas, or entitlements **must match this file** or link here. **Implementation = Claude Block 6** (`AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md`) — no drive-by code edits.

**Related:**
- [`AETHEL_PAYG_AND_WALLET_SPEC.md`](./AETHEL_PAYG_AND_WALLET_SPEC.md) — spend ladder, 402 UX, meters
- [`AETHEL_AI_WORKLOAD_AND_BILLING_ALIGNMENT.md`](./AETHEL_AI_WORKLOAD_AND_BILLING_ALIGNMENT.md) — world-gen agents × margin (keep prices; JobBudget)
- [`AETHEL_MARGIN_CREATIVE_WALLET_TURNS_CALCULATOR.md`](./AETHEL_MARGIN_CREATIVE_WALLET_TURNS_CALCULATOR.md) — mix margin · Creative credits · wallet/PAYG→turns
- [`AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md`](./AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md) — rounds 6A–6H
- [`contracts_planning.md`](./contracts_planning.md) §3, §6, §7, §8
- [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](./AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md)

**North star:** Beat **Cursor** on billing fairness + game IDE value; beat **Itch/Roblox** on create→publish→earn clarity; never fake UE render parity. **UX first** — every quota decision must be visible, reversible, and non-blocking for the IDE.

---

## 0. What changed in v1.1 (binding decisions)

| Decision | Was (v1.0) | Now (v1.1 — best-in-market) |
|----------|------------|------------------------------|
| Price anchors | $0 / $9 / $29 / $79 | **Unchanged** |
| Dual-pool math | 3M+37.5K / 12M+150K / 70M+750K | **Unchanged** |
| PAYG default (Pro+) | Off | **Off**, but **one-click enable** in 402 + Usage; spend caps **required** |
| Mental model | Tokens only | **Tokens + $ equivalent** on every meter |
| Studio AI | Per-user pools only | **Org shared pool** + per-member caps (P1) |
| Creative | Same LLM pool | **Creative Wallet separate** (P1 — non-negotiable) |
| Starter Premium | Silent “no pool” | **Explicit pricing copy** + wallet/BYOK path |
| Post-quota UX | Hard stop | Soft stop → 4 CTAs (wallet / PAYG / BYOK / upgrade) |
| Coins for AI | Optional convert | **Hidden from AI path** until H.1; never default |
| Publish wedge | Not on pricing | **Publish Pass** add-on (P2) after H.0 |

---

## 1. Code sources (truth at runtime)

| File | Role |
|------|------|
| `cloud-web-app/web/lib/plans.ts` | Tier definitions, limits, features, allowed models/domains |
| `cloud-web-app/web/lib/plan-ai-quotas.ts` | Dual-pool math, `AI_QUOTA_PRESETS`, `USAGE_WINDOW` keys |
| `cloud-web-app/web/lib/plan-limits.ts` | Quota enforcement (derived from `plans.ts`) |
| `cloud-web-app/web/lib/ai/model-cost-weights.ts` | 1× Fast / 40× Premium / 200× Ultra |
| `lib/ai/spend-resolver.ts` | **NEW Block 6** — single debit path |

**Weight formula:** `tokensPerMonth = tokensFastPerMonth + tokensPremiumRawPerMonth × 40`

**Credit unit:** `1 AI Credit = 1,000 weighted tokens` (after DEBT-FIN-008).

---

## 2. Retail tiers (checkout bundles)

| Tier | USD/mo | BRL/mo | Annual USD | Annual BRL | Checkout | Positioning (UX copy) |
|------|--------|--------|------------|------------|----------|------------------------|
| **Free** | $0 | R$0 | — | — | Open | “Ship locally. Try cloud AI on free models.” |
| **Starter** | $9 | R$47 | $90 | R$470 | Open | “Indie entry — Fast AI + deploy. Premium via wallet/BYOK.” |
| **Pro** | $29 | R$149 | $290 | R$1.490 | Open (**popular**) | “Dual AI pools + collab + CDN. Cursor-class agents in a game IDE.” |
| **Studio** | $79 | R$399 | $790 | R$3.990 | Open | “Teams — shared AI pool, MP servers, custom agents.” |
| **Enterprise** | $199* | R$995 | $1.910 | R$9.552 | **Contact Sales** | “SSO, SLA, custom limits.” |
| **Basic (legacy)** | $29 | R$145 | $278.40 | R$1.392 | **Hidden** | Grandfather → Pro+IA entitlements |

\*Ops template only; pricing page = Contact Sales.

**Annual discount:** ~17–20% vs monthly (already in `plans.ts` annual fields) — surface “Save with annual” on pricing cards.

---

## 3. Modular Stripe SKUs (policy — Wave 6)

| SKU | USD/mo | Includes | User-facing name |
|-----|--------|----------|------------------|
| Pro Platform | $15 | Infra, collab, CDN, BYOK default — **0** platform IA | “Pro Platform (BYOK)” |
| Pro IA Addon | +$14 | Dual pool → **$29** | “Pro AI included” |
| Studio Platform | $45 | Infra, team, MP — **0** platform IA | “Studio Platform (BYOK)” |
| Studio IA Addon | +$34 | Dual pool → **$79** | “Studio AI included” |
| BYOK platform addon | +$5 | Webhooks, priority queue | “BYOK convenience” |
| Extra Studio seat | +$12 | Beyond 3 included | “Extra seat” |
| **Publish Pass** (P2) | +$9 | Extra CDN + Hub Promoted Coins starter | After H.0 only |
| **Creative top-up** | wallet | Image/3D/video credits | Creative Wallet UI |

**Free BYOK:** $0 on all tiers.

---

## 4. AI quotas — dual pool (canonical)

| Tier | Pool mode | Fast/mo | Premium raw/mo | Weighted/mo | Premium exhausted |
|------|-----------|---------|----------------|-------------|-------------------|
| Free | single_fast | 200K | — | 200K | N/A (free models only) |
| Starter | single_fast | 1M | — | 1M | No Premium — wallet/BYOK |
| Pro / Basic | dual | **3M** | **37.5K** | **4.5M** | auto Fast fallback |
| Studio | dual | **12M** | **150K** | **18M** | auto Fast fallback + **org pool** |
| Enterprise | dual | **70M** | **750K** | **100M** | auto Fast fallback + org pool |

**Ultra (200×):** never on subscription included path — wallet / PAYG / BYOK only.

**Studio org pool (P1 binding):**
- Default: org shares Studio Fast + Premium budgets.
- Admin sets per-member caps (default = equal split).
- Usage page shows “Org remaining” + “My remaining”.

**UsageBucket windows:** `month`, `month_fast`, `month_premium_raw` (+ `month_creative` after 6F).

---

## 5. Rate limits & concurrency

| Tier | requests/day | tokens/day | concurrent | context window |
|------|--------------|------------|------------|----------------|
| Free | 50 | 5K | 1 | 4K |
| Starter | 720 | 50K | 1 | 8K |
| Pro / Basic | 2,880 | 250K | 5 | 32K |
| Studio | 7,200 | 900K | 10 | 64K |
| Enterprise | unlimited | unlimited | unlimited | 128K |

**Spam gate:** `requestsPerDay` only.  
**BYOK:** bypass monthly pools; **10 req/min** proxy.

---

## 6. Cloud & collaboration

| Tier | Cloud projects | Local Tauri | Storage (cloud) | CDN egress | Collab write | MP cloud |
|------|----------------|-------------|-----------------|------------|--------------|----------|
| Free | 1 | ∞ | 250 MB | 24h deploy links | 0 (spectator OK) | P2P / local |
| Starter | 3 | ∞ | 2 GB | 8 GB → hard 9.6 GB | 0 (spectator OK) | P2P |
| Pro / Basic | ∞ | ∞ | 14 GB | 100 GB | 2 | 1×256MB test |
| Studio | ∞ | ∞ | 60 GB | 500 GB | 3 (+$12/seat) | 3×512MB |
| Enterprise | ∞ | ∞ | 1 TB | Custom | ∞ | Custom |

**Storage scope:** cloud sync / R2 only. Local disk unlimited all tiers.

---

## 7. AI access by tier

| Capability | Free | Starter | Pro+ | Studio | Enterprise |
|------------|------|---------|------|--------|------------|
| Free OpenRouter models | ✅ | ✅ | ✅ | ✅ | ✅ |
| Budget / Fast models | ✅ (only) | ✅ | ✅ | ✅ | ✅ |
| Premium models (40×) | ❌ platform | ❌ platform | ✅ pool | ✅ pool | ✅ pool |
| Ultra models (200×) | wallet/BYOK | wallet/BYOK | wallet/BYOK | wallet/BYOK | wallet/BYOK |
| LLM Fusion router | ✅ | ✅ | ✅ | ✅ | ✅ |
| Standard agents | all | all | all | all + custom | all + custom |
| Creative APIs | ❌ | ✅ Creative Wallet | ✅ | ✅ higher | ✅ |
| `premiumAutoFallback` | ❌ | ❌ | ✅ | ✅ | ✅ |
| IDE when AI exhausted | **open** | **open** | **open** | **open** | **open** |
| Org shared AI pool | — | — | — | ✅ | ✅ |

---

## 8. Allowed domains & workspaces

| Tier | Domains | Workspace profiles |
|------|---------|-------------------|
| Free | code, game, research | code, game, research |
| Starter | + creative | code, game, research |
| Pro / Basic | + trading, creative | code, game, research |
| Studio | all | code, game, research |
| Enterprise | all, custom | code, game, research |

---

## 9. Overage & wallet (binding UX)

**Debit order:** subscription Fast → Premium → **Credit Wallet** → **PAYG** (if enabled) → block with CTAs.  
**Never:** Coins as silent AI debit. **Never:** UsageBucket + wallet for same tokens.

| Path | User experience | Code status |
|------|-----------------|-------------|
| Included pools | Meters drain; $ equivalent shown | Dual-pool LIVE |
| Prepaid wallet | Buy pack / custom $5–$500 | Ledger LIVE; Stripe **NOT LIVE** |
| PAYG on card | Toggle + **mandatory spend cap** ($25 / $50 / $100 / custom) | **NOT LIVE** |
| BYOK | Keys client-side; $0 platform AI | **NOT LIVE** |
| Upgrade | Pricing / portal | LIVE |
| Coins → credits | Opt-in Settings only after H.1 | **NOT LIVE** |

Full UX: [`AETHEL_PAYG_AND_WALLET_SPEC.md`](./AETHEL_PAYG_AND_WALLET_SPEC.md) v1.1.

---

## 10. Best-in-market user experience (binding)

### 10.1 Principles (non-negotiable)

| # | Principle | User feels |
|---|-----------|------------|
| 1 | **IDE never dies** | Quota only blocks AI calls — editor, viewport, local Tauri always work |
| 2 | **See before spend** | Every send shows estimated Fast/Premium/$ cost (composer chip) |
| 3 | **No surprise bills** | PAYG requires explicit enable + spend cap; email at 50% and 100% of cap |
| 4 | **One mental model** | Fast bar · Premium bar · Extra ($ wallet / PAYG) — Coins never in AI chrome |
| 5 | **Honest tiers** | Starter says “Fast only”; Pro says “Dual pools”; Ultra says “wallet” |
| 6 | **Graceful degrade** | Premium empty → Fast auto; both empty → 402 with 4 clear actions |
| 7 | **Receipts** | Every AI job: model, raw tokens, weighted, pool vs wallet vs PAYG line |
| 8 | **Undo trust** | Creative Fusion Ctrl+Z (Law XVI) independent of billing |

### 10.2 Surfaces (must ship Block 6 / 6H)

| Surface | Content | Bar |
|---------|---------|-----|
| **Pricing page** | 3 cards Starter/Pro/Studio + Enterprise CTA; dual-pool numbers; “Fast only” on Starter; annual toggle | Cursor clarity + game value bullets |
| **Settings → Usage** | Dual bars + $ remaining + wallet + PAYG toggle + spend cap + Creative meter | Cursor Usage page |
| **IDE status chip** | `Fast 62% · Prem 18% · $4.20 extra` — click → Usage | Always visible in IDE chrome |
| **Composer cost chip** | Before send: `~2.1K Fast` or `~800 Prem (~$0.12)` | Never send blind |
| **402 modal** | Title “AI quota reached”; 4 CTAs; `ideLocked: false` | Calm, not punitive |
| **Agent banner** | Premium exhausted → “Switched to Fast AI” | Non-blocking toast |
| **Billing email** | 80% pool; PAYG 50%/100% cap; monthly summary | Plain language EN |
| **Studio admin** | Org pool + member caps + invite seats | Team fairness |

### 10.3 User journeys (acceptance stories)

**J1 — Free trial delight**  
New user → Free → chat on free models → local project unlimited → soft CTA “Unlock deploy + Fast 1M” at first publish attempt.

**J2 — Starter indie**  
Pays $9 → sees single Fast meter → tries Sonnet → clear modal “Premium needs Pro, wallet, or BYOK” → can buy wallet credits without upgrading.

**J3 — Pro daily (Cursor parity)**  
Pays $29 → Fast + Premium bars → Premium hits 100% → auto Fast + toast → at 100% both → 402 → enables PAYG with $50 cap in 2 clicks → keeps working → bill at $25 accrued or month-end.

**J4 — Studio team**  
Admin buys Studio → 3 seats → shared 12M/150K → sets member A 40% / B 30% / C 30% → member A hits cap → only A blocked; org pool may still have remainder.

**J5 — Creative without burning LLM**  
Pro generates video → Creative Wallet debits → Fast/Premium bars unchanged → if Creative empty → same 402 pattern on creative CTAs.

**J6 — BYOK power user**  
Connects OpenRouter key → platform tokens stay 0 → still pays Pro Platform $15 (or Starter) for cloud/CDN → AI unlimited by their provider bill.

**J7 — Quota anxiety zero**  
User never sees “Account suspended”. Always: remaining %, $ estimate, next action.

### 10.4 Pricing page copy rules (EN only)

- Lead with **what you can ship**, not token jargon.
- Show dual pool as: `3M Fast + 37.5K Premium AI / mo` (Pro).
- Starter badge: `Fast AI only`.
- Pro badge: `Most popular`.
- Never claim “unlimited AI” or “UE Nanite included”.
- Footer: “IDE stays open when AI quota ends.”

### 10.5 402 modal CTAs (order)

1. **Buy credits** (prepaid — best value)  
2. **Enable pay-as-you-go** (set spend cap)  
3. **Connect BYOK**  
4. **Upgrade plan**  

Secondary: “View usage” · “Remind me at reset”.

---

## 11. Competitive positioning (honest)

| Competitor | They win | We beat them with plans+UX |
|------------|----------|----------------------------|
| **Cursor** | Auto unlimited Fast; simple $ credits; on-demand | Game IDE + publish + dual pool transparency + BYOK Free + local ∞ |
| **UE / Unity** | Editor depth | Price + AI-native loop + web demo (not render claims) |
| **Itch / Roblox** | Distribution / economy | Create+AI in same product; revenue lanes after H.0 |
| **Replit / Lovable** | Instant web apps | Real game runtime + Tauri offline |

**Do not change anchors** to chase Cursor $20 — Pro $29 is justified by CDN + collab + MP + dual pool. Justify in UX, not by cutting tokens.

---

## 12. Legacy & migration

| Item | Policy | Code today |
|------|--------|------------|
| `basic` @ $29 | Grandfather → Pro+IA | Hidden checkout |
| `starter_trial` | Eliminated → `free` | Still on register (**debt 6D**) |
| Credit packs | Presets + flexible top-up | UI packs; Stripe pending |
| Modular Stripe | Wave 6 | Single price per plan |

---

## 13. Doc alignment checklist

- [ ] Prices match §2  
- [ ] Weighted AI = §4  
- [ ] Dual pool Pro+ = 3M+37.5K / Studio 12M+150K / Ent 70M+750K  
- [ ] Ultra = wallet/BYOK all tiers  
- [ ] Free creative blocked; Starter+ Creative Wallet  
- [ ] IDE never locked  
- [ ] $ equivalent on meters  
- [ ] Studio org pool documented  
- [ ] PAYG requires spend cap  
- [ ] Coins hidden from AI chrome  

---

## 14. Implementation owner

| Work | Owner | Block |
|------|-------|-------|
| This plan + UX spec | Chief Architect | ✅ v1.1 |
| Code: spend-resolver, wallet, PAYG, Usage UI, 402 | **Claude** | 6A–6H |
| Org pool + Creative Wallet | Claude | 6F + 6H |
| Publish Pass / Hub | Claude | after H.0 |

---

## Changelog

| Date | Ver | Change |
|------|-----|--------|
| 2026-07-07 | 1.0 | Initial from `plans.ts` + dual-pool |
| 2026-07-09 | 1.1 | Best-in-market UX: $ meters, journeys J1–J7, Studio org pool, Creative Wallet, PAYG spend caps, Publish Pass P2, pricing copy rules |
