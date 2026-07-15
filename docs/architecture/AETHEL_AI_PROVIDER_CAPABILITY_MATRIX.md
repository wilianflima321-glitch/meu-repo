# Aethel Engine — AI Provider Capability Matrix

**Version:** 1.0 (Chief Architect — Binding)  
**Status:** **Binding** — complements `contracts_planning.md` §6.4–§6.7  
**Code:** [`creative-provider-matrix.ts`](../../cloud-web-app/web/lib/creative-provider-matrix.ts)  
**Integrates:** Law IX (Cost Guard), Law XI (Fusion), Onda J (CreativeBridge)

---

## Executive summary

Aethel uses **two routing layers**:

| Layer | Routes | Engine |
|-------|--------|--------|
| **Aethel Fusion** | Text LLM (chat, code, agents, vision analysis) | `intelligent-model-router.ts` |
| **Creative spine** | Image, 3D, video, music, voice | Dedicated `/api/ai/*` providers |

OpenRouter exposes hundreds of models — **only curated IDs** ship in product UI. Multimodal generators are **not** on OpenRouter Auto; each has env keys, rate limits, and weighted-token debits.

---

## 1. Plan × capability matrix

**Storage:** cloud-only caps in `plans.ts`. **Local Tauri:** unlimited projects + disk.

| Capability | Free | Starter | Pro | Studio | Enterprise |
|------------|------|---------|-----|--------|------------|
| **Local projects** | ∞ | ∞ | ∞ | ∞ | ∞ |
| **Cloud storage** | 250 MB | 2 GB | 14 GB | 60 GB | 1 TB |
| **LLM Fusion (platform)** | 200K Fast | 1M Fast | 3M Fast + 37.5K Premium | 12M + 150K Premium | 70M + 750K Premium |
| **Premium auto-fallback** | — | — | ✅ | ✅ | ✅ |
| **Creative domain** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Image / 3D / music / voice APIs** | ❌ | ✅ metered | ✅ metered | ✅ higher limits | ✅ custom |
| **Video API** | ❌ | ✅ (2/hr) | ✅ (10/hr) | ✅ (15/hr) | ✅ |
| **Ultra LLM (Opus/o1)** | BYOK | BYOK | BYOK/wallet | BYOK/wallet | custom |
| **BYOK (LLM)** | $0 | +$5 addon | +$5 addon | +$5 addon | included |
| **Deploy CDN** | 24h links | 8 GB | 100 GB | 500 GB | custom |
| **Collab write seats** | 0 | 0 | 2 | 3 | ∞ |
| **Dedicated MP cloud** | P2P/local | P2P | 1×256MB | 3×512MB | custom |

**Free tier:** full IDE + LLM on free models; **no platform-funded image/3D/video** (402 `GENERATION_PLAN_REQUIRED` without `creative` domain). BYOK for LLM still allowed.

---

## 2. Fusion (LLM) — task → model strategy

| TaskKind | Default route | Budget | Avoid |
|----------|---------------|--------|-------|
| `code` | **Sonnet 4.6** | balanced | Ultra on subscription |
| `planning` | Sonnet 4.6 / o3 | max-quality for architect | Free models |
| `tool-use` | Sonnet / GPT-5 Codex | balanced | Models without tools |
| `vision` | Gemini 2.5 Pro / GPT-5.4 | balanced | Text-only models |
| `critic` | **Different family than Actor** (Haiku / alternate Sonnet) | balanced | Same model as Actor |
| `bulk-cheap` | Flash Lite / Haiku | economy | Premium pool |
| `simple-chat` | Flash Lite | economy | — |
| `deep-reasoning` | o3 / Sonnet | max-quality | Starter tier |
| `mesh-generation` | LLM orchestrates → **Meshy/Tripo API** | — | LLM does not output GLB |
| `texture-generation` | LLM prompt → **Flux/SD API** | — | — |

**Defaults:** `DEFAULT_FAST_IDE_MODEL_ID`, `DEFAULT_PREMIUM_IDE_MODEL_ID` in `openrouter-models.ts`.

---

## 3. Creative spine — provider × best use

### 3.1 Image

| Provider | Status | Best for | Debit (weighted tokens) |
|----------|--------|----------|-------------------------|
| **Flux** | LIVE | Textures, concept art, PBR refs | ~12K–20K/job |
| **DALL-E 3** | LIVE | Key art, marketing | ~12K–20K/job |
| **Stable Diffusion** | LIVE | Sprites, style tests | ~12K–20K/job |

### 3.2 3D

| Provider | Status | Best for | Debit |
|----------|--------|----------|-------|
| **Meshy** | LIVE | Hero assets, image→3D | 20K–60K/job |
| **Tripo3D** | LIVE | Blockout, speed | 20K–60K/job |

**Pipeline rule (S7):** GLB from providers must pass USD/content cook before Hub publish — raw mesh is not a shippable final.

### 3.3 Video

| Provider | Status | Best for | Debit |
|----------|--------|----------|-------|
| **Runway** | PARTIAL | Cinematic b-roll | ~80K+ (duration-based) |
| **Sora** | PARTIAL | High-quality shorts | ~80K+ |
| **Pika** | PARTIAL | Social clips | ~80K+ |
| **Custom webhook** | LIVE | **Veo / Luma / Kling** when wired | configurable |
| **Google Veo** | PLANNED | Photoreal motion | TBD |

**VideoToMechanic (J.6):** uses **LLM vision** on clips — not Veo generation.

### 3.4 Music & voice

| Provider | Modality | Best for |
|----------|----------|----------|
| **Suno** | Music | Full tracks, vocals |
| **MusicGen** | Music | ≤30s loops |
| **ElevenLabs** | Voice | NPC dialogue |
| **OpenAI TTS** | Voice | Draft VO (`fable` = voice name) |
| **Azure Speech** | Voice | Enterprise SSML |
| **MetaSounds / procedural** | SFX | Local, $0 platform — preferred for gameplay SFX |

---

## 4. Billing — how creative jobs debit today

Multimodal jobs use `enforceExpensiveAiGenerationUsage` → **`consumeMeteredUsage`** on the **same weighted token pool** as chat.

| Job type | Approx. weighted debit |
|----------|------------------------|
| Image (standard) | 12,000 |
| Image (HD) | 20,000 |
| 3D (standard) | 35,000 |
| 3D (high) | 60,000 |
| Music (1 min) | ~15,000+ |
| Video (5s @ 720p) | ~80,000+ |
| Voice (1K chars) | ~3,000+ |

**Critique GAP-FUSION-02:** One 5s video can consume **~2× entire Pro Premium pool** if debited naively — **improvement:** separate **Creative Wallet** lane (Wave 6b) with USD-priced packs; until then, hourly rate limits + single-job `tokensPerDay` cap protect platform.

---

## 5. Rate limits (hourly, all tiers)

From `ai-core-rate-limit.ts` — Starter uses reduced subset in `PLAN_CREATIVE_ENTITLEMENTS`:

| Modality | Pro default/hr | Starter/hr | Studio/hr |
|----------|----------------|------------|-----------|
| Image | 20 | 10 | 30 |
| 3D | 20 | 5 | 30 |
| Music | 30 | 10 | 45 |
| Video | 10 | 2 | 15 |
| Voice | 50 | 20 | 80 |

Plus `requestsPerDay` spam gate on LLM.

---

## 6. Fusion maturity — honest score

| Component | Architecture | Implementation |
|-----------|--------------|----------------|
| LLM task router | 9/10 | 7/10 (wired, orchestrator off) |
| Dual-pool billing | 8/10 | 6/10 (metering live, UI partial) |
| Creative provider spine | 8/10 | 5/10 (HTTP live, agents fail-closed) |
| End-to-end creative loop | 9/10 on paper | **3/10** (Fusion spec audit) |
| Actor→Critic reject | Spec'd | **Missing** |

---

## 7. Gap register & improvements (binding backlog)

| ID | Severity | Gap | Target fix |
|----|----------|-----|------------|
| GAP-FUSION-01 | 🔴 | Fusion does not route image/3D/video providers | J.1 CreativeBridge + creative task router |
| GAP-FUSION-02 | 🔴 | Creative + chat share one token pool | IMPROVE-BILLING-004 Creative Wallet |
| GAP-FUSION-03 | 🔴 | Orchestrator `disabled` in prod | J.12 |
| GAP-FUSION-04 | 🔴 | Agent creative tools fail-closed | Wire registry → HTTP APIs |
| GAP-FUSION-05 | 🟡 | No first-class Veo/Luma | Add to video spine + webhook |
| GAP-FUSION-06 | 🟡 | Critic/Actor same model family | Router policy: force critic family ≠ actor |
| GAP-FUSION-07 | 🟡 | 3D skip USD cook | Publish gate + S7 receipt |
| GAP-FUSION-08 | 🟢 | Manual OpenRouter catalog | Weekly diff CI |
| GAP-FUSION-09 | 🟡 | Premium exhausted UX in agents | Auto Fast fallback in `/api/ai/*` routes |
| GAP-FUSION-10 | 🟡 | `allowedDomains` drift vs matrix | Single source: `getCreativeEntitlements()` |

---

## 8. New model / provider onboarding

**LLM (OpenRouter):** `contracts_planning.md` §6.4.4 — 6 steps.

**Creative provider:**

1. Add to `creative-provider-matrix.ts` provider array + env keys  
2. Implement or extend `/api/ai/{modality}/generate`  
3. Set `estimateExpensiveAiGenerationCost` weights from vendor pricing  
4. Add hourly rate limit if needed  
5. Document in this matrix §3  
6. CostGuard reserve/settle before dispatch (Trava I)

---

## Cross-links

| Document | Role |
|----------|------|
| `contracts_planning.md` §6.4–§6.7 | Contract summary |
| `AETHEL_AI_FUSION_CREATIVE_SPEC.md` | Onda J delivery + Travas |
| `AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md` | COGS / pools |
| `plans.ts` | Live entitlements |
| `plan-ai-quotas.ts` | Dual-pool math |
