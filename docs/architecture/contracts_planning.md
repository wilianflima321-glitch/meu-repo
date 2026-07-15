# Contracts Planning — Aethel Engine Platform

**Status:** Canonical contract spec (2026-06-17)  
**Plan tables (binding):** [`AETHEL_PLANS_CANONICAL_REFERENCE.md`](./AETHEL_PLANS_CANONICAL_REFERENCE.md) — supersedes duplicate matrices in other docs  
**Supersedes fragmented notes in:** `implementation_plan.md` §10–§11 (this doc is authoritative for API/Stripe/BYOK contracts)  
**Iteration close:** [`walkthrough.md`](./walkthrough.md)  
**Execution:** Wave 6 (billing/contracts) → Wave 7 (UX/resilience)  
**Gate prerequisite:** `npm run qa:enterprise-gate` PASS before/after

---

## 1. Scope

Formal data contracts and integration boundaries for:

| Contract | Primary surfaces |
|----------|------------------|
| **Projects** | Cloud Postgres vs Tauri local FS |
| **Stripe** | Modular base + IA addon SKUs |
| **BYOK** | Client-held keys, proxy routing, quota bypass |
| **Resilience** | Tiered fail-open rate limiting |
| **Entitlements** | IDE generosity vs infra monetization |
| **Public vitrines** | Aethel Arcade (playtest) + Marketplace (assets/remix) |

---

## 2. Project contract — Cloud vs Local

### 2.1 Definitions

| Kind | Storage | Quota surface | Create path |
|------|---------|---------------|-------------|
| **Cloud-synced** | Postgres `Project` + blob storage | Counted against `cloudProjectsMax` | `POST /api/projects`, `POST /api/workspace/create` |
| **Local-only** | Tauri app data dir (FS) | **Never** counted in Postgres | Tauri wizard — **no** cloud quota API call |

### 2.2 API — `GET/POST /api/projects`

```typescript
// POST /api/projects — cloud only
Request: { name: string; template?: string; syncMode?: 'cloud' } // syncMode omitted = cloud
Response 201: { id, name, ... }
Response 402: {
  error: 'CLOUD_PROJECT_LIMIT_REACHED',
  cloudProjectsMax: number,
  cloudProjectsUsed: number,
  localProjectsUnlimited: true,
  upgradeUrl: '/billing'
}
```

**Enforcement:** `prisma.project.count({ where: { userId } })` vs `entitlements.limits.cloudProjectsMax` (`-1` = unlimited).

**Profile/settings sync:** Independent resource — never blocked by project quota. Failures must surface UI banner, not silent drop.

### 2.3 API — `GET /api/quotas`

```typescript
Response: {
  cloudProjects: { used, max, unlimited: boolean },
  localProjects: { unlimited: true }, // informational only
  storageBytes: { used, max },
  tokensWeighted: { used, max, billingMode: 'platform' | 'byok' | 'wallet' },
  requestsPerDay: { used, max, bypassed: boolean }, // bypassed when BYOK active
  cdnEgressGB: { used, included, softStopAt, hardStopAt },
  yjsWriteSeats: { used, max },
}
```

### 2.4 UI contract

| Event | UX |
|-------|-----|
| Cloud limit hit | Banner: *"Cloud sync disabled for this project (plan limit). Files remain safe locally."* |
| Tauri create | Chooser: **Save to Computer** (local) vs **Save to Cloud** (quota check) |
| Dashboard | Two sections: **Cloud-Synced Projects** / **Local Projects (Offline)** |

### 2.5 Code validation

| Claim | Status | Evidence |
|-------|--------|----------|
| Cloud count via Postgres | **CONFIRMED** | `api/projects/route.ts`, `api/workspace/create/route.ts` |
| Local bypasses API quota | **POLICY** — not wired | Dashboard uses mock `createProjectEntry()` |
| Rename `projectsMax` → `cloudProjectsMax` | **PENDING** | `plan-limits.ts`, `plans.ts` still `projects` / `projectsMax` |
| quota-middleware `-1` bug | **CONFIRMED** | `Math.max(0, -1 - count)` → 0 remaining |

---

## 3. Stripe contract — Modular subscriptions

### 3.1 SKU matrix

| Product | Stripe Price ID (placeholder) | USD/mo | Entitlement bundle |
|---------|--------------------------------|--------|-------------------|
| Starter | `STRIPE_PRICE_STARTER` | $9 | Starter platform (no BYOK addon line required) |
| Pro Platform | `price_pro_base_15` | $15 | Pro infra + BYOK default; **no** platform IA tokens |
| Pro IA Addon | `price_pro_ia_addon_14` | +$14 | 4.5M weighted tokens/mo → **$29 total** |
| Studio Platform | `price_studio_base_45` | $45 | Studio infra + BYOK default |
| Studio IA Addon | `price_studio_ia_addon_34` | +$34 | 18M weighted tokens/mo → **$79 total** |

**Marketing:** Base price = MP servers, cloud compile/export, agent orchestration — not "disk space".

### 3.2 Checkout session shape

```typescript
// POST /api/billing/checkout
Request: {
  planId: 'starter' | 'pro' | 'studio',
  interval: 'month' | 'year',
  includeIaAddon?: boolean, // default false for pro/studio base-first UX
}
Response: { url: string, sessionId: string }

// Stripe line_items examples:
// Pro + IA: [{ price: price_pro_base_15 }, { price: price_pro_ia_addon_14 }]
// Pro BYOK-only: [{ price: price_pro_base_15 }]
```

### 3.3 Webhook entitlement mapping

```typescript
// subscription.items → resolve entitlements
interface ResolvedSubscription {
  tier: 'free' | 'starter' | 'pro' | 'studio' | 'enterprise',
  platformSku: 'starter' | 'pro_base' | 'studio_base',
  iaAddonActive: boolean,
  grandfatheredPriceId?: string, // legacy basic $29
}
```

### 3.4 Closed decisions — billing lifecycle

| Decision | Resolution |
|----------|------------|
| **Basic → Pro migration** | **Option A — Stripe grandfathering:** keep existing **$29 Price ID** single line item; Next.js maps to **Pro + IA full entitlements** (`extras.grandfatheredBundle: 'pro_ia_29'`) |
| **Credit packs** | **Discontinued.** Top-up via **Credit Wallet** (flexible amount) + BYOK |
| **Starter trial** | **Eliminated.** New users → `plan: 'free'`. Remove `starter_trial` from register default, Prisma default, fallbacks |
| **CDN bandwidth** | **Soft stop** at included GB (Starter 8GB); banner + email; **hard stop** at **120%** (9.6GB Starter) |
| **Enterprise** | **Internal template** in `plans.ts`; pricing page = **Contact Sales** only |

### 3.5 Code validation

| Claim | Status | Evidence |
|-------|--------|----------|
| Modular Stripe prices | **NOT LIVE** | `getStripePriceIdForPlan` — single price per plan only |
| Register → starter_trial | **CONFIRMED** | `api/auth/register/route.ts` ~127, Prisma `@default("starter_trial")` |
| Credit packs in doc | **POLICY** | `billing_security_analysis.md` §4.4 — mark deprecated |

---

## 4. BYOK contract — IA routing

### 4.1 Key storage (client-only)

| Runtime | Store | Never persisted server-side |
|---------|-------|----------------------------|
| Web IDE | IndexedDB `aethel-byok-v1` | ✓ |
| Tauri | OS keyring (Credential Manager / Keychain) | ✓ |

### 4.2 Request envelope

```typescript
// POST /api/ai/chat (and stream/complete/agent)
Headers: {
  Authorization: 'Bearer <session>',
  'X-Aethel-BYOK-Active': '1',                    // when user enabled BYOK
  'X-Aethel-BYOK-Provider': 'openai' | 'anthropic' | 'openrouter' | 'google',
  'X-Aethel-BYOK-Credential': '<encrypted-blob>', // single-use nonce; decrypted in-memory only
  'X-Aethel-Billing-Mode': 'byok',                // server sets audit; client may omit
}

// Server behavior when BYOK active:
// - SKIP checkAIQuota token debit
// - SKIP consumeMeteredUsage weighted debit
// - SKIP requestsPerDay spam gate (monthly N/A)
// - ENFORCE 10 req/min per user/IP (proxy anti-DDoS)
// - STILL enforce checkModelAccess ONLY if billingMode !== 'byok' (BYOK = user pays provider)
// - auditLog: { billingMode: 'byok', model, estimatedTokens } — NO key fields
```

### 4.3 Free tier BYOK

- **Enabled at $0** — user pays provider directly
- Platform bears proxy cost only (~fractions of cent) — acceptable acquisition cost

### 4.4 Code validation

| Claim | Status | Evidence |
|-------|--------|----------|
| BYOK bypass | **LIVE (6E)** | Header-only; skip quota/metering/wallet; 10 req/min |
| Client key storage | **LIVE (6E)** | IndexedDB `aethel-byok-v1`; server POST 410 |
| plans.ts byokEnabled free | **CONFIRMED** | `extras.byokEnabled: true`, `byokAddonUsd: 0` |

---

## 5. Resilience contract — Fail-open (tiered)

### 5.1 Middleware behavior (`middleware.ts`)

| Route class | Upstash Redis failure |
|-------------|----------------------|
| Authenticated IDE APIs (`/api/projects/*`, `/api/ai/*`, `/api/files/*`, …) | **Fail-open** — in-memory token bucket + log `rate_limit_backend_degraded` |
| Auth / signup / password reset | **Fail-closed** — 503 or strict local cap |
| Billing / webhooks / checkout | **Fail-closed** or queue + retry |
| Public unauthenticated APIs | **Fail-closed** — conservative local cap |

**Not global fail-open** — prevents DDoS on public surface.

### 5.2 CSP production loopback

```text
connect-src ... http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:*
```

Always present in production CSP (hybrid cloud IDE → local MCP/playtest).

### 5.3 Code validation

| Claim | Status | Evidence |
|-------|--------|----------|
| Global fail-closed Upstash | **CONFIRMED** | `middleware.ts` ~329–349 |
| CSP localhost prod block | **CONFIRMED** | `connect-src` localhost only when `isDev` |
| Gate requires 503 string | **CONFIRMED** | `check-v25-market-spine.mjs` |

---

## 6. Entitlements philosophy — IDE generosity vs infra gates

**Principle:** Token caps + BYOK already protect AI margin. **Do not** gate IDE intelligence (agents, workspaces) on lower tiers.

### 6.1 Unlock on ALL tiers (Free included)

| Capability | Rationale | Code today |
|------------|-----------|------------|
| **All standard agents** (Universal, Coder, Architect, Researcher) | Same token cost per prompt | **GATED** — Free: `universal` only; Starter: `coder, universal` |
| **All workspace profiles** (Code, Game, Research) | Viewport runs on client GPU | **GATED** — Free/Starter: `allowedDomains: ['code']` only |
| **Marketplace extensions/themes install** | Runs client-side; 10% transaction fee on paid extensions | **GATED** — Free `upgradeRequiredFor: ['marketplace', 'extensions']`; install API **503 stub** |
| **Yjs spectator** in Pro/Studio rooms | Viral acquisition; read-only cursor traffic negligible | **NOT LIVE** — no spectator role in `legacy-collaboration-handler.ts` |
| **P2P LAN multiplayer** | WebRTC direct — zero cloud MP cost | **VERIFY** — netcode not plan-gated in grep; cloud dedicated servers = paid |
| **Local offline AI (WebGPU/ONNX)** | $0 platform cost | **HELD** — `ai_complete` → `provider_unavailable`; `native_kernel.rs` ONNX **Held** |

### 6.2 Keep as upgrade barriers (infra / commercial)

| Barrier | Free | Starter | Pro+ | Studio+ |
|---------|------|---------|------|---------|
| Cloud storage | 250 MB | 2 GB | 14 GB | 60 GB |
| Cloud projects | 1 | 3 | ∞ | ∞ |
| Deploy CDN | 24h links | 8 GB soft / 9.6 GB hard | 100 GB | 500 GB |
| Yjs **write** seats | 0 (spectator OK) | 0 | 2 | 3 |
| Platform premium models | Free models only | Budget set | 4.5M weighted (w/ IA addon) | 18M weighted |
| Ultra models (200×) | BYOK/Wallet | BYOK/Wallet | BYOK/Wallet | Subscription + BYOK/Wallet |
| Cloud dedicated MP servers | ❌ | P2P only | 1×256MB | 3×512MB |
| Custom agents | ❌ | ❌ | ❌ | ✅ |

### 6.3 Entitlement schema change (executor)

```typescript
// Replace allowedAgents / allowedDomains gating for standard fleet:
extras: {
  standardAgentsUnlocked: true,      // all tiers
  workspaceProfiles: ['code', 'game', 'research'], // all tiers
  marketplaceInstall: true,          // all tiers
  yjsSpectatorAllowed: true,         // Free/Starter can join as read-only
  yjsWriteSeats: number,             // 0 / 0 / 2 / 3
  localAiSidecar: 'available' | 'held', // Tauri only; honest manifest
}
```

---

## 6.4 AI Model Catalog — Free / Fast / Premium / Ultra

**Status:** Living registry — **not** a frozen allowlist. New OpenRouter models ship via catalog update + weight classification; plan gates updated in the same PR.

**Canonical code:**

| Concern | File |
|---------|------|
| Model registry + tiers | `cloud-web-app/web/lib/ai/openrouter-models.ts` |
| Billing weight (1× / 40× / 200×) | `cloud-web-app/web/lib/ai/model-cost-weights.ts` |
| Plan allowlists + dual pools | `cloud-web-app/web/lib/plans.ts` |
| Task-aware routing | `cloud-web-app/web/lib/ai/intelligent-model-router.ts` |

### 6.4.1 Billing classes (dual-pool)

| Class | OpenRouter `tier` | Token weight | Debits pool | Plan access |
|-------|-------------------|-------------|-------------|-------------|
| **Free** | `free` | 1× | Fast | Free only |
| **Fast** | `budget` (+ free router) | 1× | Fast | Starter+ (subset on Starter) |
| **Premium** | `best` (non-ultra) | 40× | Premium raw | Pro+ (`PRO_BEST_MODEL_IDS` subset on Pro) |
| **Ultra** | `best` (Opus/o1/5.4-pro/$5+ input) | 200× | Wallet / BYOK only | Never on subscription path |

Formula (mandatory): `WeightedTokens = RawTokens × (ModelCostPerM / 0.15)` — see `billing_security_analysis.md` §5.

### 6.4.2 IDE defaults (binding recommendation)

| Role | Model ID | Rationale |
|------|----------|-----------|
| **Fast default** | `google/gemini-2.5-flash-lite` | Lowest COGS; bulk chat, fallback when Premium exhausted |
| **Premium default** | `anthropic/claude-sonnet-4.6` | Best **cost × intelligence × tools** for IDE work (code, refactor, planning) — cheaper than Opus/GPT-5 Pro with strong tool use |
| **Emergency fallback** | `google/gemini-2.5-flash-lite` | Provider outage cross-family |

Constants: `DEFAULT_FAST_IDE_MODEL_ID`, `DEFAULT_PREMIUM_IDE_MODEL_ID` in `openrouter-models.ts`.

**Product rule:** Router + agent default on Pro+ should prefer **Sonnet-class** for `code` / `planning` / `tool-use` unless user picks another allowed Premium model. Opus/GPT-5.4-pro remain opt-in via wallet/BYOK.

### 6.4.3 Current catalog snapshot (2026-07-07)

**Free (`OPENROUTER_FREE_MODELS`):**

| Model ID |
|----------|
| `openrouter/free` |

**Fast / Budget (`OPENROUTER_BUDGET_MODELS`) — 15 models, weight 1×:**

`openai/gpt-5.4-nano`, `gpt-5-nano`, `gpt-4.1-nano`, `google/gemini-2.5-flash-lite`, `google/gemini-3.1-flash-lite-preview`, `openai/gpt-5.4-mini`, `gpt-5-mini`, `gpt-4.1-mini`, `google/gemini-2.5-flash`, `anthropic/claude-3.5-haiku`, `openai/o3-mini`, `o4-mini`, `o4-mini-high`, `openai/gpt-5.1-codex`, `openai/gpt-5.2-codex`

**Premium (`OPENROUTER_BEST_MODELS`, non-ultra) — weight 40×:**

| Model ID | On Pro allowlist? |
|----------|-------------------|
| `anthropic/claude-sonnet-4.6` | ✅ **IDE default** |
| `anthropic/claude-sonnet-4.5` | ✅ |
| `anthropic/claude-3.7-sonnet` | ✅ |
| `openai/gpt-5` | ✅ |
| `openai/gpt-5.4` | ✅ |
| `openai/gpt-5-codex` | ✅ |
| `openai/o3` | ✅ |
| `google/gemini-2.5-pro` | ✅ |
| `openai/gpt-4.1` | ✅ |
| `openai/gpt-5-pro` | Studio+ |
| `openai/gpt-5.3-codex` | Studio+ |
| `google/gemini-3.1-pro-preview` | Studio+ |

**Ultra — weight 200×, wallet/BYOK only:**

`openai/gpt-5.4-pro`, `anthropic/claude-opus-4.6`, `anthropic/claude-opus-4.5`, plus heuristic match on `opus`, `o1` in `model-cost-weights.ts`.

**Starter** uses an explicit **subset** of Fast models (nano/mini/flash/haiku) — not the full budget catalog.

### 6.4.4 New model onboarding (every release)

When OpenRouter (or BYOK provider) adds a model — e.g. **Claude Sonnet 5**, new GPT, Gemini:

1. **Register** in `openrouter-models.ts` with `tier: 'free' | 'budget' | 'best'` and real `inputCost` / `outputCost`.
2. **Classify weight** in `model-cost-weights.ts`:
   - `budget` or `free` → 1× Fast
   - `best` + input ≥ $5/M or Opus/o1/5.4-pro pattern → 200× Ultra
   - other `best` → 40× Premium
3. **Plan gate:** add ID to `STARTER_ALLOWED_MODELS`, `PRO_BEST_MODEL_IDS`, or Studio-only as margin review dictates.
4. **IDE default review:** if new model beats Sonnet on cost×quality for code/tools, update `DEFAULT_PREMIUM_IDE_MODEL_ID` in one PR with margin note.
5. **Router:** `intelligent-model-router.ts` picks up new IDs automatically from `OPENROUTER_MODEL_MAP` — no duplicate list.
6. **QA:** `npm run typecheck` + one golden agent run on `code` + `tool-use` task kinds.

**Sonnet 5 (future):** When Anthropic publishes on OpenRouter, expect `anthropic/claude-sonnet-5*` at ~Sonnet pricing → **40× Premium**. Add to `PRO_BEST_MODEL_IDS`; evaluate replacing `DEFAULT_PREMIUM_IDE_MODEL_ID` after 1 week of cost/quality telemetry.

**Not LLMs:** OpenAI **`fable`** is a **TTS voice name** (speech API), not a chat model — do not add to `OPENROUTER_*` catalogs. If a future **Fable** LLM appears on OpenRouter, onboard via step 1–6 with its real provider ID.

### 6.4.5 Unknown model IDs (fail-safe)

If a model ID is **not** in `OPENROUTER_MODEL_MAP`, `model-cost-weights.ts` uses keyword heuristics (`sonnet` → 40×, `opus` → 200×). Unknown IDs default to **1× Fast** until registered — prevents silent Ultra spend but may under-charge; register within 48h of first production use.

---

## 6.5 Creative provider matrix (multimodal — not OpenRouter)

**Full matrix:** [`AETHEL_AI_PROVIDER_CAPABILITY_MATRIX.md`](./AETHEL_AI_PROVIDER_CAPABILITY_MATRIX.md)  
**Code:** `cloud-web-app/web/lib/creative-provider-matrix.ts`

| Modality | Live providers | Planned | Billing today |
|----------|----------------|---------|---------------|
| **Image** | Flux, DALL-E 3, SD | — | Weighted tokens via `enforceExpensiveAiGenerationUsage` |
| **3D** | Meshy, Tripo3D | — | Same |
| **Video** | Runway, Sora, Pika, webhook | **Veo**, Luma (via webhook) | Same — high debit |
| **Music** | Suno, MusicGen | — | Same |
| **Voice** | ElevenLabs, OpenAI TTS, Azure | — | Same |

**Domain gate:** `creative` in `allowedDomains` — **Free ❌**, **Starter+ ✅** (`plans.ts`).

**Fusion does NOT pick Flux/Veo/Meshy** — CreativeBridge (J.1) orchestrates LLM intent → provider HTTP.

---

## 6.6 Plan × AI limitations (binding)

| Limit | Value | Rationale |
|-------|-------|-----------|
| Free creative APIs | Blocked | COGS — LLM trial only |
| Creative debits | Same pool as LLM (today) | **GAP-FUSION-02** — split wallet Wave 6b |
| Single video job | Can exceed Starter `tokensPerDay` | 413 `GENERATION_TOO_EXPENSIVE_FOR_PLAN` |
| Ultra LLM on subscription | Blocked | Margin — wallet/BYOK |
| OpenRouter catalog in UI | Curated only | No infinite marketplace |
| 3D without S7 cook | Blocked at publish | Quality + Law VI |
| VideoToMechanic | Scaffold only | Trava III — no fake GTA clone |
| IDE when AI exhausted | **Stays open** | Only AI calls block; Fast fallback on Pro+ |

---

## 6.8 Overage, Credit Wallet & pay-as-you-go (Cursor-like)

**Full spec:** [`AETHEL_PAYG_AND_WALLET_SPEC.md`](./AETHEL_PAYG_AND_WALLET_SPEC.md)

### 6.8.1 Spend ladder (binding)

1. **Subscription included** — Fast pool → Premium pool (dual on Pro+); weighted audit on `UsageBucket`
2. **Premium exhausted** — auto Fast fallback (`premiumAutoFallback`) when Fast remaining
3. **Pools exhausted** — **Credit Wallet** (prepaid) if balance > 0
4. **Wallet empty** — **on-demand card** if user enabled PAYG (+10% vs prepaid)
5. **Optional** — **Aethel Coins** convert-to-credits (Treasury parity; separate ledger H.1)
6. **Parallel** — **BYOK** bypasses 1–5 when header-active (**6E CLOSED**)
7. **Ultra (200×)** — steps 3–6 only; never subscription included

**Prohibition:** debit **both** `UsageBucket` and `CreditLedgerEntry` for the same request (`GAP-PAYG-01`).

### 6.8.2 UX mandates

| Rule | Detail |
|------|--------|
| IDE never locked | 402 on AI routes only; 4 CTAs; never “suspended” |
| Visible pools | Fast + Premium + **$ equivalent**; Creative separate meter |
| Composer cost chip | Pre-send estimate on platform path |
| PAYG default | **Off** — opt-in requires **spend cap** ($25/$50/$100/custom) + $25 bill threshold |
| Credit definition | 1 credit = 1,000 **weighted** tokens (after DEBT-FIN-008) |
| Pack UI | Presets + flexible $5–$500 top-up |
| Creative | Separate Creative Wallet — do not drain LLM pools |
| Studio | Org shared pool + per-member caps |
| Coins | Hidden from AI chrome until H.1 opt-in |
| Journeys | J1–J7 in `AETHEL_PLANS_CANONICAL_REFERENCE.md` §10.3 |

**Full UX:** [`AETHEL_PAYG_AND_WALLET_SPEC.md`](./AETHEL_PAYG_AND_WALLET_SPEC.md) v1.1 · Round **6H** in Execution Master Map.

### 6.8.3 Code reality (2026-07-07)

| Capability | Status |
|------------|--------|
| Dual-pool enforcement | **LIVE** — `plan-limits.ts`, `metering.ts` |
| Wallet reserve/settle | **LIVE** — `credit-wallet.ts`; wired on chat/stream only |
| Wallet fallback on quota empty | **NOT LIVE** |
| Stripe wallet purchase | **PARTIAL** — intent only, `checkoutUrl: null` |
| PAYG metered card | **NOT LIVE** |
| Aethel Coins for AI | **NOT LIVE** — planned H.1 |
| BYOK bypass | **LIVE (6E)** |

---

## 6.7 Fusion router — task coverage

| TaskKind | Fusion routes LLM? | Creative API? |
|----------|-------------------|---------------|
| `code`, `planning`, `tool-use`, `critic`, `vision` | ✅ | — |
| `mesh-generation` | ✅ (orchestration) | → Meshy/Tripo |
| `texture-generation` | ✅ (prompt) | → Flux/SD |
| `creative-writing` | ✅ | optional Suno for lyrics |
| Video generation | — | → video spine (not LLM) |

**Maturity:** LLM router **7/10** implemented; end-to-end creative loop **3/10** — see gap register §6.5 matrix doc §7.

---

## 7. Rate limits — single axis (final)

| Layer | Rule |
|-------|------|
| Primary | Monthly **Fast** + **Premium raw** pools (`plan-ai-quotas.ts`); weighted `month` bucket for audit |
| Spam gate | `requestsPerDay` only — **remove** `requestsPerHour` |
| BYOK | Bypass daily + monthly caps; **10 req/min** proxy only |

| Tier | requestsPerDay | Fast AI/mo | Premium AI/mo (raw) | Weighted total |
|------|----------------|------------|---------------------|----------------|
| Free | 50 | 200K | — | 200K |
| Starter | 720 | 1M | — | 1M |
| Pro + IA | 2,880 | 3M | 37.5K | 4.5M |
| Pro Platform (BYOK) | 2,880 | 0 | 0 | 0 (BYOK) |
| Studio + IA | 7,200 | 12M | 150K | 18M |
| Studio Platform (BYOK) | 7,200 | 0 | 0 | 0 (BYOK) |
| Enterprise | unlimited | 70M | 750K | 100M |

---

## 8. Section 10 — Reference matrix (integrated)

| Resource / Limit | Free | Starter | Pro Platform | Pro +IA | Studio Platform | Studio +IA |
|------------------|------|---------|--------------|---------|-----------------|------------|
| **USD/mo** | $0 | $9 | $15 | $29 | $45 | $79 |
| **Cloud projects** | 1 | 3 | ∞ | ∞ | ∞ | ∞ |
| **Local Tauri projects** | ∞ | ∞ | ∞ | ∞ | ∞ | ∞ |
| **Storage (cloud)** | 250 MB | 2 GB | 14 GB | 14 GB | 60 GB | 60 GB |
| **Workspace profiles** | All | All | All | All | All | All |
| **Standard agents** | All | All | All | All | All + Custom | All + Custom |
| **AI weighted/mo** | 200K fast | 1M fast | — (BYOK) | 4.5M (3M+37.5K) | — (BYOK) | 18M (12M+150K) |
| **BYOK** | ✅ $0 | ✅ | ✅ default | optional | ✅ default | optional |
| **Ultra via platform** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **requests/day** | 50 | 720 | 2,880 | 2,880 | 7,200 | 7,200 |
| **BYOK req limit** | 10/min | 10/min | 10/min | 10/min | 10/min | 10/min |
| **Yjs write seats** | 0* | 0* | 2 | 2 | 3 | 3 |
| **Yjs spectator** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **CDN deploy** | 24h links | 8GB→9.6GB | 100 GB | 100 GB | 500 GB | 500 GB |
| **MP cloud servers** | ❌ | P2P/LAN | 1×256MB | 1×256MB | 3×512MB | 3×512MB |
| **P2P LAN playtest** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Marketplace install** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Local offline AI** | ✅ (Tauri, when sidecar live) | ✅ | ✅ | ✅ | ✅ | ✅ |

\*Write seats 0 = can host spectator only unless invited to Pro/Studio room.

---

## 9. Migration & deprecation checklist

| Item | Action |
|------|--------|
| `starter_trial` plan | Remove from register, Prisma default → `free`, delete `PLAN_LIMITS.starter_trial` after DB backfill |
| `basic` subscribers | Keep Stripe $29 Price ID; map entitlements → Pro+IA in `requireEntitlementsForUser` |
| `basic` in checkout | Hidden (already) |
| Credit packs SKUs | Remove from pricing UI; wallet only |
| `runtime-templates/` (Electron) | Delete — Tauri 2 sole desktop target |
| `projectsMax` | Rename `cloudProjectsMax` everywhere |
| `requestsPerHour` | Delete from `plans.ts`, `metering.ts` hour bucket |

---

## 10. Wave mapping

| Wave | Contracts |
|------|-----------|
| **6** | §3 Stripe modular + §4 BYOK proxy + §7 rate axis + §9 migrations + Credit Wallet |
| **7** | §2 local/cloud UI + §5 CSP/fail-open + §6 IDE generosity + spectator + Electron delete |
| **8** | §11 Arcade deploy + playtest feedback → tasks + Aethel Pay hooks |
| **8b** | §12 Marketplace remix + `aethel://` deep links + §13 asset gateway |
| **9** | §6 local AI sidecar (ONNX/WebGPU) — `IMPROVE-DESK-004` |

---

## 11. Aethel Arcade & Playtest Portal

**Purpose:** Public hub (Itch.io / Roblox Portal style) for **finished games** and **playtest builds** deployed via **Aethel Deploy**. Distinct from Marketplace (dev resources).

### 11.1 Architecture

```
Secure Sandbox (private) ──Publish/Deploy──► Arcade Catalog (public)
                                                    │
                    iframe WebGL/WebGPU ◄─────────────┘
                    ratings + feedback
                    Aethel Pay (IAP / paid games)
```

| Surface | Route (target) | Maturity today |
|---------|----------------|----------------|
| Arcade catalog | `/arcade` or `/play` | **NOT LIVE** — `/playground` is PROTOTYPE redirect to IDE |
| Game play URL | `https://play.aethel.dev/{slug}` or `/play/{slug}` | **NOT LIVE** — deploy stubs (`DEBT-INFRA-001`) |
| Developer deploy panel | IDE → Publish to Portal | **NOT LIVE** |

### 11.2 Publish contract

```typescript
// POST /api/arcade/publish
Request: {
  projectId: string,
  buildId: string,           // from cloud compile pipeline
  visibility: 'public' | 'unlisted',
  monetization?: 'free' | 'paid' | 'iap',
  playtestMode?: boolean,    // shorter TTL on Free tier CDN
}
Response 202: {
  jobId: string,
  portalUrl: string,         // when ready
  iframeEmbedUrl: string,
  expiresAt?: string,        // Free: 24h TTL on deploy link
}
```

**Privacy:** Publish copies **build artifact only** — never exposes private project tree or source unless creator opts in.

### 11.3 Player experience

| Feature | Contract |
|---------|----------|
| Play | Sandboxed iframe; CSP isolated; WebGL/WebGPU runtime |
| Rating | 1–5 stars + optional text; stored per `arcadeListingId` + `playerSessionId` |
| Feedback / bug report | Structured form → **developer task backlog** (see §11.4) |
| Paid / IAP | **Aethel Pay** — platform fee **10%** Playground IAP (`billing_security_analysis.md` §3); **5%** off-platform export royalty after $100k |

### 11.4 Playtest feedback → developer tasks

```typescript
// POST /api/arcade/listings/{listingId}/feedback
Request: {
  type: 'bug' | 'balance' | 'crash' | 'general',
  message: string,
  sessionReplayRef?: string,  // optional telemetry blob ref
  buildVersion: string,
}
// Server side-effect:
// 1. Create Task in project owner's backlog (linked to projectId)
// 2. Notify dev (in-app + optional email)
// 3. Dedupe by hash(message + buildVersion) within 24h

Response 201: { taskId: string, feedbackId: string }
```

**IDE integration:** Tasks appear in project **Tasks panel** with badge `from-arcade` and deep link to feedback detail.

### 11.5 Tier entitlements (deploy to Arcade)

| Tier | Arcade publish | CDN / TTL |
|------|----------------|-----------|
| Free | ✅ playtest | 24h link expiry |
| Starter | ✅ | 8 GB soft / 9.6 GB hard |
| Pro+ | ✅ | 100 GB+ |

### 11.6 Code validation

| Claim | Status | Evidence |
|-------|--------|----------|
| Public arcade route | **NOT LIVE** | No `/arcade`; `/playground` → IDE (`route-maturity-registry.ts`) |
| Deploy pipeline | **NOT LIVE** | `DEBT-INFRA-001` R2/CDN |
| Aethel Pay | **NOT LIVE** | Policy in billing doc only |
| Feedback → tasks | **NOT LIVE** | No API |

---

## 12. Aethel Marketplace & Remix Protocol

**Purpose:** Public repository of **dev resources** (assets, templates, VS blueprints, plugins) — distinct from Arcade **games**.

### 12.1 Catalog types

| Type | Examples | Listing surface |
|------|----------|-----------------|
| **Assets** | Textures, GLB, VFX, audio | `/marketplace` |
| **Templates** | VS graphs, TS scaffolds | `/marketplace` |
| **Plugins** | IDE extensions | `/marketplace` |

**Today:** `marketplace/page.tsx` — **curated static data** (`CURATED_EXTENSIONS`); install review UI exists; **no backend catalog**.

### 12.2 Publish contract (private → public)

```typescript
// POST /api/marketplace/listings
Request: {
  sourceProjectId: string,
  sourcePath: string,        // asset or subtree in secure sandbox
  listingType: 'asset' | 'template' | 'plugin' | 'blueprint',
  title, description, tags,
  priceCents?: number,       // 0 = free; platform fee 10% on paid
  license: 'MIT' | 'CC-BY' | 'commercial',
}
Response 202: { listingId, ingestJobId }

// Async: pack → §13 asset gateway → public blob + listing row
```

**Rule:** Publisher retains original in private sandbox; public listing is a **published snapshot**, not a live mount.

### 12.3 Remix / Install contract (public → private clone)

```typescript
// POST /api/marketplace/listings/{listingId}/remix
Request: {
  targetProjectId: string,   // user's secure sandbox project
  targetPath?: string,       // default: /imports/{listingId}/
}
Response 202: {
  cloneJobId: string,
  estimatedBytes: number,
}

// On complete:
Response 200: {
  clonedPaths: string[],
  attribution: { listingId, authorId, license, originalUrl },
}
```

**Invariant:** Remix creates an **async deep copy** into the requester's private project. **Never** mutates the publisher's original. Attribution metadata embedded in `aethel.manifest.json` at clone root.

### 12.4 Deep linking — `aethel://` protocol

Integrates web Marketplace with Tauri Studio Local:

| URI | Handler | Action |
|-----|---------|--------|
| `aethel://marketplace/listing/{id}` | Web + Tauri | Open listing detail |
| `aethel://marketplace/remix/{id}?project={projectId}` | Tauri preferred | Trigger remix into local/cloud project |
| `aethel://studio/open?project={id}&path={path}` | Tauri | Open file after remix |
| `aethel://arcade/play/{slug}` | Web | Launch iframe player |

**Tauri registration:** `tauri.conf.json` + `single-instance` plugin to focus existing window on deep link.

**Web fallback:** Universal links / custom protocol prompt → "Open in Aethel Studio Local".

### 12.5 UI flows

| Action | IDE location | Result |
|--------|--------------|--------|
| **Publish to Marketplace** | Context menu on asset / VS graph | §12.2 ingest |
| **Deploy to Portal** | Project menu → Publish | §11.2 arcade publish |
| **Install / Remix** | Marketplace card → `MarketplaceInstallReview` | §12.3 clone to selected project |
| **Open in Studio** | Listing detail CTA | `aethel://` deep link |

### 12.6 Monetization

| Channel | Fee |
|---------|-----|
| Paid marketplace listing | **10%** platform (`IMPROVE-BILLING` / billing §3) |
| Free listing | $0 — drives ecosystem |
| Install on Free tier | **Allowed** (§6) — fee only on paid transactions |

### 12.7 Code validation

| Claim | Status | Evidence |
|-------|--------|----------|
| Marketplace UI | **PARTIAL** | `marketplace/page.tsx` — static curated extensions |
| Install API | **STUB** | `api/plugins/install/route.ts` → 503 |
| `PluginInstall` Prisma | **MISSING** | `DEBT-DB-002`, `DEBT-PLUGIN-001` |
| Remix clone API | **NOT LIVE** | — |
| `aethel://marketplace/*` | **NOT LIVE** | `aethel://` used for FS events only |

---

## 13. Asset Security Gateway (publish pipeline)

**Purpose:** Every object entering public Arcade or Marketplace passes automated gate — no raw upload to CDN without scan/optimize.

### 13.1 Pipeline stages

```
Upload (private) → Queue → [Scan] → [Optimize] → [Format normalize] → Public blob + listing
```

| Stage | Action | Fail behavior |
|-------|--------|---------------|
| **Scan** | Static analysis on scripts (TS/Lua/VS JSON); malware heuristics; size caps | Reject + notify publisher |
| **Optimize** | GLB Draco/meshopt; texture ASTC/WebP; audio normalize | Auto-fix or reject if irreparable |
| **Normalize** | Target formats: GLB, PNG/WebP, OGG, `.aethel-blueprint.json` | Convert or reject |
| **Provenance** | Sign listing with publisherId, sha256, license | Required for verified badge |

### 13.2 API

```typescript
// Internal worker — triggered by ingestJobId
POST /api/internal/asset-gateway/process
Request: { ingestJobId, sourceBlobUrl, listingType }
Response: {
  status: 'approved' | 'rejected' | 'needs_review',
  publicBlobUrl?: string,
  rejectionReasons?: string[],
  optimizedMetrics?: { bytesBefore, bytesAfter, polyCount },
}
```

### 13.3 Trust UI

| Badge | Meaning |
|-------|---------|
| **Verified** | Passed gateway + signed publisher |
| **Community** | Passed scan; unsigned or new publisher |
| **Held** | Pending review — not installable |

Aligns with existing `MarketplaceInstallReview` + `trustFilter: 'verified'`.

### 13.4 Code validation

| Claim | Status | Evidence |
|-------|--------|----------|
| Asset gateway worker | **NOT LIVE** | No route |
| GLB optimize pipeline | **PARTIAL** | Export stubs (`IMPROVE-UX-007`); loaders flatten rig (`DEBT-ASSET-001`) |

---

## 14. Review verdict (Cursor validation)

| Area | Ready for execution? | Blocker |
|------|---------------------|---------|
| Project cloud/local split | **Spec ready** | UI + rename not implemented |
| Stripe modular | **Spec ready** | New Price IDs + checkout line items |
| BYOK routing | **LIVE (6E)** | `byok-request.ts` + IDB client |
| Fail-open tiered | **Spec ready** | Gate script update required |
| IDE generosity | **Spec ready** | `allowedAgents`, `allowedDomains`, `upgradeRequiredFor` must change |
| Local AI / spectator / marketplace | **Spec ready** | Features held/stub — honest `[HELD]` until Wave 7/9 |
| Arcade + remix + asset gateway | **Spec ready** | Wave 8 — no routes; marketplace static; deploy held |

**Overall:** Business rules **100% defined**. Implementation remains Wave 6→7→8→9 per mega-waves.

### 14.1 Prior conversation map

| Topic | Discussed before? | Where |
|-------|-----------------|-------|
| Marketplace stubs / install 503 | **Yes** | `DEBT-PLUGIN-001`, audit #16, `critical_user_experience_audit.md` |
| Aethel Pay / 10% IAP royalty | **Yes** | `billing_security_analysis.md` §3 |
| Free marketplace install unlock | **Yes** | `contracts_planning.md` §6 |
| **Arcade portal + iframe play** | **No** — first formalized §11 |
| **Remix clone private ← public** | **No** — first formalized §12 |
| **Playtest feedback → tasks** | **No** — first formalized §11.4 |
| **`aethel://` marketplace deep links** | **Partial** — FS events only (`IMPROVE-DESK-003`) |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | v1 — full contract spec from alignment sessions + IDE generosity unlock |
| 2026-06-17 | **v2** — §11 Arcade/Portal, §12 Marketplace/Remix, §13 Asset Security Gateway |
| 2026-07-07 | **v3** — §6.4 AI model catalog (Free/Fast/Premium/Ultra), Sonnet IDE default, new-model onboarding |
| 2026-07-07 | **v4** — §6.5–§6.7 creative provider matrix, plan limitations, Fusion task coverage |
| 2026-07-07 | **v5** — §6.8 PAYG/wallet overage; §8 Ultra row corrected (wallet/BYOK all tiers); link `AETHEL_PLANS_CANONICAL_REFERENCE.md` |
| 2026-07-09 | **v6** — §6.8.2 UX: spend caps, $ meters, composer chip, Studio org pool, Coins hidden from AI, journeys J1–J7 |
