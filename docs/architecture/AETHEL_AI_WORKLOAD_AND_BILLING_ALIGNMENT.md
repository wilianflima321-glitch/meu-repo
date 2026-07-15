# Aethel Engine — AI Workload × Billing Alignment

**Version:** 1.0 (Chief Architect — world-gen agents without loss or quality collapse)  
**Status:** **Binding critique** — does **not** change retail prices ($0/$9/$29/$79); aligns **how hard AI may work** with **what users paid**  
**Canonical prices/quotas:** [`AETHEL_PLANS_CANONICAL_REFERENCE.md`](./AETHEL_PLANS_CANONICAL_REFERENCE.md)  
**Margin math:** [`billing_security_analysis.md`](./billing_security_analysis.md) §4–§5  
**Calculated mix · Creative · wallet→turns:** [`AETHEL_MARGIN_CREATIVE_WALLET_TURNS_CALCULATOR.md`](./AETHEL_MARGIN_CREATIVE_WALLET_TURNS_CALCULATOR.md)  
**PAYG:** [`AETHEL_PAYG_AND_WALLET_SPEC.md`](./AETHEL_PAYG_AND_WALLET_SPEC.md)  
**Creative COGS:** `cloud-web-app/web/lib/creative-provider-matrix.ts`

---

## 0. Verdict (one page)

| Question | Answer |
|----------|--------|
| Are subscription **prices** wrong? | **No** — keep $9 / $29 / $79. Margin is safe **if** weights + Ultra-off-sub + Creative Wallet ship. |
| Will “AI generates whole worlds fast + high quality” break us? | **Yes, if** one agent loop burns Premium + video + huge context on the **same** subscription pool without job budgets. |
| What to change? | Not list prices — **workload contracts**: per-job caps, context strategy, Creative Wallet, agent iteration limits, quality tiers that prefer Fast→Premium→Ultra. |
| Quality without loss? | Quality = **better tools + routing + evidence**, not “always Opus + 200K context on platform dime.” |

**Golden rule (extends unit economics):**  
*Every world-gen / long agent run must declare a **JobBudget** (weighted tokens + creative $ + max iterations) **reserved before** the first provider call.*

---

## 1. What the subscription actually buys (API ceiling)

From `billing_security_analysis.md` §4.2 — **budget-equivalent** burn of full weighted quota @ $0.15/M:

| Tier | User pays | Weighted/mo | Max platform API $ | Notes |
|------|-----------|-------------|--------------------|-------|
| Starter | $9 | 1M Fast | ~$0.15 | No Premium pool |
| Pro | $29 | 4.5M (3M Fast + 37.5K Prem raw) | ~$0.68 | 37.5K Sonnet raw ≈ 1.5M weighted |
| Studio | $79 | 18M | ~$2.70 | Org share later |

**Interpretation:** Subscription AI is a **generous Fast allowance** + a **small Premium allowance** — not “unlimited world factory.”  
World-scale quality runs must use: **BYOK**, **wallet**, **PAYG (capped)**, or **many Fast-scaffolded steps** with sparse Premium critic passes.

---

## 2b. How much work is that? (Universal IDE — not games only)

Aethel is a **Universal IDE** (code / research / game / creative). Quotas must be read as **two pools**, not “one Sonnet bucket.”

### 2b.1 Pro monthly pools (canonical)

| Pool | Amount | Weight | User meaning |
|------|--------|--------|--------------|
| **Fast** | **3,000,000** tokens/mo | 1× | **Billing pool** for Fusion Auto specialists (not a single Flash/Nano model) |
| **Premium** | **37,500** tokens/mo **raw** | 40× | Sonnet / GPT-5 class |
| Weighted audit | 4.5M | — | Fast + Premium×40 |

**Critical UX fact:** If the user sets **Sonnet as primary for every message**, they only spend the **Premium** pool (37.5K raw). That feels “short.”  
If the product defaults to **Fast primary + Sonnet on demand** (Cursor Auto-like), the month feels **long**.

When Premium hits 100%: Pro+ **auto-falls back to Fast** (`premiumAutoFallback`) — IDE stays open; quality drops to Fast until reset / wallet / BYOK.

### 2b.2 Approximate Sonnet call counts (Pro Premium 37.5K raw)

Assumptions are **averages** (prompt + completion). Real usage varies with context packing.

| Call size | Tokens / call (raw) | ≈ Calls / month on Premium only | Feels like |
|-----------|---------------------|----------------------------------|------------|
| Light chat / short ask | ~2,000 | **~18–19** | Few days if Sonnet-only |
| Normal IDE turn (file + reply) | ~6,000 | **~6** | Very short if Sonnet-only |
| Agent step (tools + patch) | ~10,000 | **~3–4** | One hard feature |
| Fat context (near 32K window) | ~20,000–32,000 | **~1–2** | One deep session |

**Studio Premium 150K raw** ≈ **4× Pro** → ~75 light Sonnet chats, or ~15 normal turns, or ~15 agent steps.

**Starter / Free:** **0** Premium — Sonnet only via **wallet / BYOK**.

### 2b.3 Fast pool call counts (Pro 3M) — the real “long” experience

| Call size | Tokens / call | ≈ Calls / month Fast |
|-----------|---------------|----------------------|
| Light | ~2,000 | **~1,500** |
| Normal IDE | ~6,000 | **~500** |
| Agent step | ~10,000 | **~300** |

**Daily spam gate:** Pro `tokensPerDay` 250K + `requestsPerDay` 2,880 — stops abuse, not normal IDE days.

### 2b.4 “Whole game” vs “whole product” (honest)

| Goal | Realistic path | Fits Pro included? |
|------|-----------------|-------------------|
| **Ship a small web game demo** | Fast scaffold + few Premium critic passes + local playtest | **Yes** (Draft-heavy) |
| **Ship a polished indie game** | Weeks of Fast + Premium polish + Creative Wallet for art/video + maybe PAYG | **Partial** — assets/video not “free on Pro AI” |
| **AAA-sized world** | BYOK / Studio / Enterprise + Creative + cook | **No** on Pro alone — correct |
| **Universal IDE month (code app)** | Fast primary, Sonnet for hard refactors | **Yes** — hundreds of Fast turns |
| **Research / docs / agents** | Fast + RAG; Premium for hard synthesis | **Yes** if not Sonnet-every-turn |
| **Creative studio month** | Creative Wallet separate (after 6F) | LLM pools stay for chat/code |

**User experience length:**  
- **Short** only if UI forces Sonnet-as-default for everything.  
- **Long** if default = Fast (like Cursor Auto) + Premium badge “Use Sonnet for this” + wallet when empty.

### 2b.5 Product rule (binding for Universal IDE UX)

1. **Default model = Fast** (Flash-class) on Pro/Studio — not Sonnet.  
2. User may pin Sonnet; show remaining **Premium calls estimate** on chip (`~12 Sonnet turns left`).  
3. At Premium empty → toast: “Switched to Fast AI” + CTA wallet — **never** “you’re done for the month.”  
4. World / large agent jobs use **JobBudget** + Draft mode by default.  
5. Copy: “Pro includes everyday Fast AI + a Premium polish budget” — not “Sonnet unlimited.”

**Numbers (margin mix, Creative credits, $10/$25 → turns):** see [`AETHEL_MARGIN_CREATIVE_WALLET_TURNS_CALCULATOR.md`](./AETHEL_MARGIN_CREATIVE_WALLET_TURNS_CALCULATOR.md).

---

## 2. Workload reality — “generate a whole world”

### 2.1 Cost drivers (platform COGS)

| Driver | Typical scale | Hits which ledger today | Risk |
|--------|---------------|-------------------------|------|
| Agent planning (LLM) | 5–50 turns × 4–32K ctx | Fast/Premium pool | Context bloat |
| Code / VS / GAS scaffolds | Multi-file patches | Fast/Premium | OK if Fast-first |
| Scene layout / PCG prompts | Many small LLM calls | Fast | OK |
| Image / texture batches | N × image $ | Creative Wallet (after 6F) | OK if separated |
| Foley / world SFX | Library fetch + MetaSounds | **$0 gen** (#64) | Prefer over music/voice APIs |
| Music OST / speech VO | Suno / ElevenLabs | Creative Wallet — Plan B | Cheap vs video |
| 3D mesh jobs | Meshy/Tripo $ | Same pool | **Burns Pro** |
| Video / trailer | ≥80K weighted / job (`videoMinJob`) if pixel-gen | Same pool today | **Avoid** — use [Director doctrine #63](./AETHEL_CINEMATIC_DIRECTOR_DOCTRINE.md): LLM directs + **engine capture $0 API** |
| Forge sandbox (future) | $/min | Not metered yet | Future loss |
| Cloud cook (future) | CPU minutes | Not metered yet | Future loss |

### 2.2 Illustrative Pro burn (order-of-magnitude — not new prices)

Assume Pro: **3M Fast + 37.5K Premium raw**.

| Scenario | Rough consumption | Fits in Pro month? |
|----------|-------------------|--------------------|
| A. Indie week: chat + code agents on Flash/Haiku | ~200–800K Fast | **Yes** |
| B. Premium critic 20× (2K in / 2K out Sonnet) | 80K raw Premium | **No** — only 37.5K Premium raw included |
| C. One 4s **pixel-gen** video @ videoMinJob | ≥80K weighted | Bad default — prefer engine capture (#63) |
| C′. Director cinematic (script+camera LLM + local capture) | Fast LLM only + **$0 video API** | **Pro-safe** |
| D. “Full world” = 10 meshes + 40 textures + 2 videos + 100 Premium turns | Multimodal + Premium | **No on subscription alone** — needs Creative Wallet + PAYG/BYOK |
| E. 200K context stuffed every turn on Sonnet | Weighted explosion | **Forbidden pattern** — see §3 |

**Critique:** Marketing “AI builds entire worlds” is fine **as product vision**; billing must say **“scaffold on Fast, polish with Premium/wallet, assets on Creative Wallet.”**

---

## 3. Context & quality without burning the bank

### 3.1 Context window vs plan (`plans.ts` today)

| Tier | `contextWindow` | Enough for world-gen? |
|------|-----------------|------------------------|
| Free | 4K | Trial chat only |
| Starter | 8K | Small tasks |
| Pro | 32K | **One** focused pack — not whole repo+scene every turn |
| Studio | 64K | Better; still need RAG |
| Enterprise | 128K | Still need RAG at world scale |

**Do not “fix” quality by raising everyone’s context to 200K on platform path** — that multiplies COGS linearly.

### 3.2 Binding context strategy (internal tools — deepen, don’t new UI)

| Tool (existing / planned) | Role | Billing effect |
|---------------------------|------|----------------|
| **SceneContext pack (J.3)** | Compact scene summary, not full JSON every turn | −80–95% tokens |
| **Vector index (J.4)** | Retrieve only relevant assets/code | Stops haystack.includes “RAG” |
| **Game production spine graphs** | Structured multi-agent steps | Predictable JobBudget |
| **Actor-Critic max 3** (Law XI) | Caps reject loops | Hard stop burn |
| **Agent `maxIterations`** | Default ≤10 prod (implementation_plan) | Caps runaway |
| **Fusion router Fast-first** | Flash/Haiku scaffold; Sonnet for hard steps | Protects Premium pool |
| **Fusion Auto Apex (v1.2)** | LMSYS/bench elite per domain; Premium empty → elite open-weights | [`AETHEL_APEX_DOCTRINE_AND_EXECUTION_FOCUS.md`](./AETHEL_APEX_DOCTRINE_AND_EXECUTION_FOCUS.md) |
| **Apex MoA + Auto-Heal (#60)** | ≤3 gens → Synthesizer → L.5 heal; ~150–250 jobs/mo on Pro if scoped | [`AETHEL_APEX_FAST_SWARM_ORCHESTRATION.md`](./AETHEL_APEX_FAST_SWARM_ORCHESTRATION.md) §5 |
| **VisualEvidence (J.9)** | Screenshot/hash proof instead of re-prompting | Fewer turns |
| **CreativeBridge + CostGuard** | Reserve before provider | No free bleed |

**Quality thesis:** Best worlds come from **deep tools + short precise context**, not from dumping the universe into Opus.

### 3.3 Quality tiers (routing — user sees Fidelity/AI mode, not 12 toggles)

| Mode | Models | When | Debit |
|------|--------|------|-------|
| **Draft** | Fast only | Blockout, PCG params, code stubs | Fast pool |
| **Polish** | Premium (sparse) | Architecture, hard bugs, critic | Premium pool |
| **Hero** | Ultra / best creative | Trailer, hero mesh | Wallet / BYOK / PAYG only |
| **BYOK** | User keys | Power users | $0 platform AI |

Default for “Generate world” wizard: **Draft → optional Polish pass** — never Hero on subscription included.

---

## 4. Critiques of current payment plans (keep prices)

| # | Critique | Severity | Align how |
|---|----------|----------|-----------|
| **W1** | Creative multimodal on **same** LLM pool | **Critical** | Creative Wallet (6F) — non-negotiable before world-gen marketing |
| **W2** | Premium raw 37.5K is small for “always Sonnet agents” | **High** (by design) | UX honesty + Fast-first router; wallet for more Premium |
| **W3** | `contextWindow` 32K Pro insufficient if naive full-scene prompts | **High** | SceneContext + RAG mandatory for world jobs |
| **W4** | No **JobBudget** object in code | **High** | Reserve weighted+creative+$ before squad dispatch |
| **W5** | Agent loops can iterate until quota death | **High** | maxIterations + CostGuard settle per turn |
| **W6** | Video ≥80K weighted / job under-explained on pricing | **Med** | Pricing/Usage copy: “Video uses Creative credits” |
| **W7** | Cook / Forge minutes unmetered when live | **Med** | UsageBucket at ship — don’t invent numbers now |
| **W8** | Double debit chat/wallet (GAP-PAYG-01) | **Critical** | spend-resolver 6A |
| **W9** | Margin §4.2 assumes budget burn — **not** “all Premium” | **Info** | Docs OK; UI must not imply unlimited Sonnet |
| **W10** | Studio org pool without per-job caps | **Med** | Member caps + JobBudget |

**Do not raise Pro to $60** to chase Cursor Pro+ — modular Platform+IA and wallet already cover power users.

---

## 5. JobBudget contract (binding for J / world-gen)

```typescript
// Target: lib/production/ai-job-budget.ts (Claude Block 1 + 6)
interface AiJobBudget {
  jobId: string;
  jobKind: 'chat' | 'agent' | 'world-scaffold' | 'creative-batch' | 'forge';
  maxWeightedTokens: number;      // from remaining Fast+Premium or wallet
  maxPremiumRawTokens: number;    // hard slice of Premium pool
  maxCreativeUsd: number;         // Creative Wallet
  maxIterations: number;          // default 10
  maxContextTokensPerTurn: number; // e.g. Pro 8–16K pack, not full 32K dump
  qualityMode: 'draft' | 'polish' | 'hero';
  billingPath: 'subscription' | 'wallet' | 'payg' | 'byok';
}
```

**Rules:**
1. World-scaffold default: `qualityMode: 'draft'`, Premium raw ≤ 20% of remaining Premium, iterations ≤ 10.  
2. `hero` requires wallet/PAYG/BYOK — cannot start on subscription-only.  
3. Each turn: estimate → reserve → call → settle; abort if budget exhausted (calm UX, IDE open).  
4. Creative batch (N images) reserves Creative Wallet **before** queue.

---

## 6. What “good internal tools” means for margin + quality

| Depth investment | Cuts COGS | Raises quality |
|------------------|-----------|----------------|
| SceneContext pack | ✓ | ✓ focused prompts |
| Real vector RAG | ✓ | ✓ fewer wrong edits |
| Fusion Fast→Premium router | ✓ | ✓ right model |
| VS / PCG / Landscape tools (S2) | ✓ less generative redo | ✓ controllable worlds |
| Evidence ledger + critic | ✓ fewer retries | ✓ shipable output |
| Local Tauri + BYOK | ✓ $0 platform AI | ✓ unlimited user-paid |
| Capability Score (local render) | ✓ no cloud GPU | ✓ honest fidelity |

**Anti-pattern:** Buying quality only with Ultra + huge context on platform subscription.

---

## 7. Pricing / Usage copy (align marketing)

| Say | Don’t say |
|-----|-----------|
| “Draft worlds on Fast AI; polish with Premium” | “Unlimited Sonnet world gen” |
| “Images/3D/video use Creative credits” | “Included in Pro AI pool” (after 6F) |
| “Hero assets: wallet or BYOK” | “Ultra included on Studio” |
| “Agents use a job budget you can see” | “AI builds GTA for you” (Trava III) |

VideoToMechanic remains **scaffold only** (Trava III) — billing must not imply auto-GTA.

---

## 8. Implementation map (no new retail SKUs)

| Work | Block | Closes |
|------|-------|--------|
| spend-resolver | 6A | W8 |
| Creative Wallet | 6F | W1, W6 |
| Usage $ meters + composer chip | 6H | W9 honesty |
| JobBudget + maxIterations | 1 + 6 | W4, W5 |
| SceneContext + Vector index | J.3 / J.4 | W3 |
| Fast-first fusion defaults | 1 | W2 |
| Maestro/Worker + Fusion Auto + pack budgets | 1 + J/L | [`AETHEL_INTELLIGENT_ROUTING_AND_CONTEXT_COMPRESSION.md`](./AETHEL_INTELLIGENT_ROUTING_AND_CONTEXT_COMPRESSION.md) v1.1 |
| Cook/Forge metering when live | 6 / L | W7 |
| Org + job caps | 6H | W10 |

**Prices stay.** Quotas stay unless margin re-run with new provider $ — then update `billing_security_analysis.md` §4.2 and Plans Canonical together.

---

## 9. Decision checklist (Chief Architect)

- [x] Keep $0 / $9 / $29 / $79  
- [x] Keep dual-pool math  
- [x] Ultra never on subscription included  
- [ ] Ship Creative Wallet before world-gen ads  
- [ ] Require JobBudget on agent/world jobs  
- [ ] Mandate SceneContext/RAG for world-scale prompts  
- [ ] Default Draft quality mode for world wizard  
- [ ] Document Premium 37.5K as **polish budget**, not all-day Sonnet  

---

## 10. Changelog

| Date | Ver | Change |
|------|-----|--------|
| 2026-07-09 | 1.0 | Workload×billing critique; JobBudget; context strategy; keep prices; world-gen scenarios |
| 2026-07-09 | 1.0a | Link margin/Creative/wallet→turns calculator; §2b Universal IDE call counts |
