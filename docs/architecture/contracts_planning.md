# Contracts Planning — Aethel Engine Platform

**Status:** Canonical contract spec (2026-06-17)  
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
| BYOK bypass | **NOT LIVE** | All AI routes call `checkAIQuota` / `consumeMeteredUsage` |
| Client key storage | **NOT LIVE** | `DEBT-BILLING-001` |
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

## 7. Rate limits — single axis (final)

| Layer | Rule |
|-------|------|
| Primary | Monthly **weighted tokens** (`usageBucket` / Credit Wallet) |
| Spam gate | `requestsPerDay` only — **remove** `requestsPerHour` |
| BYOK | Bypass daily + monthly caps; **10 req/min** proxy only |

| Tier | requestsPerDay | tokensWeighted/mo (platform) |
|------|----------------|------------------------------|
| Free | 50 | 200K (free models) |
| Starter | 720 | 1M |
| Pro + IA | 2,880 | 4.5M |
| Pro Platform (BYOK) | 2,880 | 0 (BYOK) |
| Studio + IA | 7,200 | 18M |
| Studio Platform (BYOK) | 7,200 | 0 (BYOK) |
| Enterprise | unlimited | 50M+ (custom) |

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
| **AI weighted/mo** | 200K | 1M | — (BYOK) | 4.5M | — (BYOK) | 18M |
| **BYOK** | ✅ $0 | ✅ | ✅ default | optional | ✅ default | optional |
| **Ultra via platform** | ❌ | ❌ | ❌ | ❌ | ✅ 200× | ✅ 200× |
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
| BYOK routing | **Spec ready** | Zero server code |
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
