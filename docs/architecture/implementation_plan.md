# Implementation Plan — Billing Hardening & Plan Sync

**Status:** Ready for Claude Opus execution (Wave 6 block)  
**Prerequisite:** `npm run qa:enterprise-gate` PASS before/after  
**Spec:** [`billing_security_analysis.md`](./billing_security_analysis.md)  
**Plan tables:** [`AETHEL_PLANS_CANONICAL_REFERENCE.md`](./AETHEL_PLANS_CANONICAL_REFERENCE.md) — do not invent prices/quotas  
**Mega-wave:** [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) — **Wave 6** (extend)

**Fusion / MoA Anti-Hype (not this file):** Canonical anchor lives in [`AETHEL_APEX_FAST_SWARM_ORCHESTRATION.md`](./AETHEL_APEX_FAST_SWARM_ORCHESTRATION.md) **§0a** — reliability over stopwatch; Maestro writes nucleus; L.5 ≠ 120 FPS. This document is **billing only**.

---

## Scope (single mega-PR series — do not split micro-fixes)

1. Plan + limits unification (pricing truth v3)
2. Token weight metering + two-phase AI billing
3. **Redis metering buffer** + batch Postgres flush (`DEBT-FIN-011`)
4. Stripe webhook + **lazy reconcile** (`DEBT-FIN-013`)
5. Transfer **sorted FOR UPDATE** (`DEBT-FIN-012`)
6. Schema: `RenderJob` + `McpServer`
7. Tests + gates

**Out of scope this wave:** R2 (`DEBT-INFRA-001`), BYOK UI wiring (`DEBT-BILLING-001`), full workspace profiles (`IMPROVE-STUDIO-012`), P2P (`DEBT-NET-001`).

---

## 1. Plan unification

### [MODIFY] `cloud-web-app/web/lib/plans.ts`

Sync `PLANS` to **billing_security_analysis.md v3**:

- **Local projects:** unlimited all tiers (`extras.localProjectsUnlimited`)
- **Cloud-synced:** Free 1, Starter 3, Pro/Studio ∞ (`extras.cloudSyncedProjects`)
- **BYOK:** enabled all tiers; **$5/mo addon** (`extras.byokAddonUsd`) — not separate $15/$45 plans
- **Collab seats:** `realtimeCollabSeats` = Yjs only; Git unlimited (policy)
- Prices: Starter $9, Pro $29, Studio $79; tokens 1M / 4.5M / 18M weighted

### [MODIFY] `cloud-web-app/web/lib/plan-limits.ts`

- Mirror `PLAN_LIMITS` exactly (storageGB, tokensPerMonth, projectsMax, features)
- Remove stale comments ($3 starter, etc.)
- Add `cdnEgressGB`, `turnTrafficGB`, `dedicatedServers` fields (enforcement can be Phase 2 stub + held gate)

### [MODIFY] Pricing UI

- Grep `pricing` page + `TrialBanner` copy for old prices
- EN canonical strings

### Acceptance

- Single `getPlanLimits()` source; `plans.ts` limits === `plan-limits.ts` caps
- Gate script: `check-plan-limits-parity.mjs` (new) — fail on drift

---

## 2. Token weight metering

### [NEW] `cloud-web-app/web/lib/ai/model-cost-weights.ts`

```ts
// Base: $0.15 per 1M tokens
export function getModelTokenWeight(modelId: string): number
export function applyTokenWeight(rawTokens: number, modelId: string): number
```

Map from OpenRouter pricing table or static tier buckets: budget 1×, premium 40×, ultra 200×.  
Ultra models return `requiresWallet: true` for Starter/Pro subscription path.

### [MODIFY] `cloud-web-app/web/lib/metering.ts`

- `consumeMeteredUsage` accepts optional `modelId` → multiply `tokenCost` by weight before bucket increment
- Export `weightedTokensFromUsage(raw, modelId)` for routes

### Acceptance

- Unit test: 1000 raw Sonnet tokens → 40_000 weighted debit on month bucket
- Studio exhaust 20M weighted budget → max ~$3 API cost at all-premium mix (spreadsheet test)

---

## 3. Two-phase AI billing

### [MODIFY] `cloud-web-app/web/lib/credit-wallet.ts`

**`getCreditBalance(userId)`:**

```text
balance = SUM(settled entries) + SUM(unsettled reservations where expiresAt > now)
```

(Reservations are negative — must reduce available balance.)

### [MODIFY] `cloud-web-app/web/app/api/ai/chat/route.ts`

Flow:

1. `reserveCredits(estimatedWeightedTokens)`
2. Call LLM
3. `settleCredits(reservationId, actualWeightedTokens)` in `finally`
4. On error: `cancelReservation`
5. Replace pre-call-only `consumeMeteredUsage` tokens with weighted actuals (keep request/hour limits via separate call)

### [MODIFY] `cloud-web-app/web/app/api/ai/stream/route.ts`

- Accumulate streamed token estimate (or provider usage header)
- `settleCredits` in `finally` of ReadableStream
- Wire stream `cancel()` → `cancelReservation` + abort upstream

### [MODIFY] `cloud-web-app/web/app/api/agents/stream/route.ts`

Same pattern for agent SSE path.

### Acceptance

- Integration test: parallel 2× chat requests with balance=1× cost → one succeeds, one `INSUFFICIENT_CREDITS`
- Stream abort mid-flight → reservation cancelled, balance restored

---

## 3b. Redis metering buffer (`DEBT-FIN-011`)

### [NEW] `cloud-web-app/web/lib/metering-redis-buffer.ts`

- `incrementUsage(userId, weightedTokens, requests)` → Redis INCRBY
- TTL keys to month boundary
- `flushUsageBucketsToPostgres()` — cron/worker every 30s

### [MODIFY] `metering.ts`

- Hot path: Redis first; Postgres flush async
- Fallback: `pg_advisory_xact_lock` + debounced write if Redis unavailable

### Acceptance

- Load test: 50 parallel `/api/ai/chat` → no `usageBucket` row lock timeout in Postgres logs

---

## 4. Stripe webhook, lazy reconcile & transfer locks

### [MODIFY] `cloud-web-app/web/app/api/billing/webhook/route.ts`

On `customer.subscription.deleted` / inactive `updated`:

```ts
await prisma.user.update({ where: { id: userId }, data: { plan: 'free', planVerifiedAt: new Date() } })
```

### [NEW] `cloud-web-app/web/lib/billing/stripe-plan-reconcile.ts`

- Called from `requireEntitlements` / auth middleware
- If `User.plan !== 'free'` and cache stale (>1h): Stripe API `subscriptions.retrieve`
- Downgrade if inactive; cache result

### [MODIFY] `cloud-web-app/web/app/api/credits/transfer/route.ts`

```ts
const [idA, idB] = [senderId, receiverId].sort();
// Lock ledger rows FOR UPDATE in sorted order — never sender-first
```

Single transaction; re-check balance inside lock.

### Acceptance

- Stripe test: cancel sub → `user.plan === 'free'` even if webhook replayed late
- Simulated webhook failure: lazy reconcile downgrades within 1h
- Mutual transfer A↔B concurrent → no deadlock (one succeeds, one retries)

---

## 5. Database schema

### [MODIFY] `cloud-web-app/web/prisma/schema.prisma`

Add models per `IMPROVE-PLATFORM-003`:

- `McpServer` (userId, name, config, createdAt, …)
- `RenderJob` (userId, status, artifactUrl, …)

Run migration; fix MCP/render routes to use Prisma (remove `(prisma as any)` stubs).

**Links:** `DEBT-DB-001`, `DEBT-RENDER-001`

---

## 6. Agent loop cost protection

### [MODIFY] `cloud-web-app/web/lib/ai/agent-mode.ts`

- Default `maxIterations: 10` (not 50) for production governed path
- Emit receipt when cap hit; fail-closed message to user

---

## 7. Verification plan

### Automated

```bash
npm run test -- __tests__/billing
npm run test -- __tests__/api/ai-chat
npm run qa:enterprise-gate
node scripts/check-plan-limits-parity.mjs   # after added
```

### Manual

1. Stripe sandbox: subscribe Pro → cancel → confirm free tier enforcement
2. Long chat → inspect `usageBucket.tokens` vs provider usage
3. Pro model on Starter → 403 `MODEL_NOT_ALLOWED`
4. Opus on Studio subscription → blocked or wallet-only banner

---

## 8. Execution order (within Wave 6)

```
schema.prisma (RenderJob, McpServer)
  → plans.ts + plan-limits.ts sync
  → model-cost-weights.ts + metering.ts
  → credit-wallet.ts balance fix
  → chat/stream/agents routes two-phase
  → webhook downgrade
  → transfer FOR UPDATE
  → agent maxIterations
  → tests + gates
```

---

## 9. Approval checklist

- [x] User confirms final prices ($9/$29/$79) — **v2 approved 2026-06-17**
- [x] `basic` tier: legacy hidden from checkout; grandfathered in DB
- [ ] BYOK deferred to Wave 6b (adds ~3–5 days)
- [ ] R2 / P2P explicitly deferred (documented)
- [ ] **Token weights + two-phase billing** — mandatory before marketing premium models

**Once approved, prompt Claude:**

```
Execute Wave 6 billing block from implementation_plan.md + billing_security_analysis.md.
Complete entire §1–7 in one series. No micro-PRs.
```

---

## 10. Product alignment brief — consensus decisions (2026-06-17)

Validated against live code. **Do not implement until user says "Execute Wave N".**

### 10.1 Local unlimited vs cloud-capped projects

| Layer | Current state | Required alignment |
|-------|---------------|-------------------|
| **Postgres count** | `prisma.project.count` in `api/projects/route.ts`, `api/workspace/create/route.ts`, `quota-middleware.ts` | **Correct by default** — Tauri-only projects never hit Postgres |
| **Enforcement source** | `entitlements.plan.limits.projects` (`plans.ts`) **and** `PLAN_LIMITS.projectsMax` (`plan-limits.ts`) | **Dual source — must unify**; rename to `cloudProjectsMax` in `plan-limits.ts` + `limits.cloudProjects` in `plans.ts` |
| **Semantics in API errors** | `PROJECT_LIMIT_REACHED` message says "Plan project limit" | Change copy to **"Cloud-synced project limit"**; include `cloudSyncedProjects` from `extras` in 402 body |
| **quota-middleware bug** | `remaining = Math.max(0, limit - count)` when `limit === -1` → always 0 | Treat `-1` as unlimited before compare (same guard as projects route) |
| **Dashboard UI** | `createProjectEntry()` in `aethel-dashboard-project-utils.ts` — **in-memory mock**, no API/Tauri | Split sections: **Cloud-Synced** (POST `/api/projects`) vs **Local (Offline)** (Tauri `fs_*` only, no quota call) |
| **Tauri create flow** | `fs_read/write/list` exist; **no** "New local project" wizard | Add chooser: **Save to Computer** (local manifest under app data dir) vs **Save to Cloud** (invoke cloud API + show quota) |

**Acceptance:** Free user creates 50 local Tauri projects → zero Postgres rows. Cloud create #2 on Free → 402 with clear cloud cap.

### 10.2 BYOK free + modular pricing

| Layer | Current state | Required alignment |
|-------|---------------|-------------------|
| **Plan flags** | `plans.ts` — `byokEnabled: true` all tiers; Free `byokAddonUsd: 0` | **Policy already in `plans.ts`** — UI/checkout must expose toggle |
| **AI quota bypass** | `checkAIQuota` + `recordTokenUsage` in query/complete/action routes; `consumeMeteredUsage` in chat/stream | Add `AuthContext.byokActive` from request header; **skip** token bucket debit when BYOK; keep **anti-abuse** rate limit only |
| **Model access** | `checkModelAccess` still plan-gated | BYOK path: allow user-selected model if provider accepts their key (platform models list optional) |
| **Key storage** | **Not implemented** (`DEBT-BILLING-001`) | **Client-only:** IndexedDB (web) / OS keyring (Tauri). Server proxy receives `X-Aethel-BYOK-*` per request; **no** Postgres persist; **no** log of key material |
| **Stripe prices** | `getStripePriceIdForPlan` — base plans only; no BYOK Price IDs | **Product decision needed** (see §10.2.1) |

#### 10.2.1 BYOK pricing fork (resolve before Stripe)

| Option | Description | Canonical doc |
|--------|-------------|---------------|
| **A (v3)** | Single **$5/mo** BYOK addon all paid tiers | `billing_security_analysis.md`, `implementation_plan.md` §1 |
| **B (user paste)** | **$5 Pro BYOK / $15 Studio BYOK** as separate Stripe Prices | User alignment message 2026-06-17 |

Recommend **Option A** for checkout simplicity unless Studio BYOK includes dedicated infra (support SLA, audit logs). If Option B wins, add `STRIPE_PRICE_BYOK_PRO`, `STRIPE_PRICE_BYOK_STUDIO` + checkout line-item toggle.

**Stale code:** `plan-limits.ts` comments still say "BYOK $15/$45" — remove on sync.

### 10.3 Platform resilience (Wave 7 ops)

| Item | File | Alignment |
|------|------|-----------|
| CSP loopback | `middleware.ts` ~41 | Add `http://127.0.0.1:*`, `ws://127.0.0.1:*`, `http://localhost:*`, `ws://localhost:*` to `connect-src` **in production** | `DEBT-CSP-001` |
| Rate limit | `middleware.ts` ~329 | **Tiered fail-open** (not global): IDE authenticated APIs → in-memory fallback + alert; auth/billing → fail-closed | `DEBT-OPS-001`, `billing_security_analysis.md` §11 |
| Electron removal | `runtime-templates/` | Delete tree; update docs/CI references; Tauri 2 sole desktop target | `DEBT-DESK-007` |

### 10.4 Execution wave map

```
Wave 6  → §10.2 BYOK proxy + quota bypass + Stripe (after pricing fork)
Wave 6  → §10.1 rename cloudProjectsMax + quota -1 fix + API copy
Wave 7  → §10.1 dashboard split + Tauri local project wizard
Wave 7  → §10.3 CSP + tiered fail-open + Electron delete
```

### 10.5 Integrity guards (do not break)

1. **Single plan source** — after rename, gate `check-plan-limits-parity.mjs` must compare `cloudProjectsMax` across `plans.ts` ↔ `plan-limits.ts` ↔ `entitlements`.
2. **Metering honesty** — BYOK requests log `billingMode: 'byok'` in audit trail without token debit (for support, not billing).
3. **Gate update** — tiered fail-open requires updating `check-v25-market-spine.mjs` (no longer assert global 503 as only behavior).
4. **Local evidence fallback** — `shouldUseLocalEvidenceFallback` in projects GET must remain for offline Tauri shell.

**Canonical contracts:** [`contracts_planning.md`](./contracts_planning.md) — authoritative for API/Stripe/BYOK/resilience payloads.

---

## 11. Plan canonical matrix — user decisions (2026-06-17)

**Status:** **CLOSED** — see `contracts_planning.md` §8 for integrated matrix. Summary below retained for quick reference.

### 11.1 Stripe architecture — Base platform + optional IA addon

| SKU | Stripe Price ID (placeholder) | USD/mo | Includes |
|-----|-------------------------------|--------|----------|
| **Pro Platform (BYOK default)** | `price_pro_base_15` | **$15** | IDE cloud, 14GB, MP test server, cloud builds, agent orchestration, 2 Yjs **write** seats |
| **Pro IA Addon** | `price_pro_ia_addon_14` | **+$14** | Platform AI tokens (4.5M weighted/mo) — total **$29** |
| **Studio Platform (BYOK default)** | `price_studio_base_45` | **$45** | Studio infra, 60GB, 3×512MB MP, webhooks, 3 Yjs write seats (+$12/extra) |
| **Studio IA Addon** | `price_studio_ia_addon_34` | **+$34** | Platform AI tokens (18M weighted/mo) — total **$79** |

**Marketing rule:** Base price sells **infra** (MP servers, cloud compile/export, deep agent orchestration) — **not** "15GB of disk". Storage/sync is secondary bullet.

**Free tier:** BYOK enabled at **$0**; no IA addon available (user brings key or uses 200K weighted free models).

### 11.2 Rate limits — single axis

| Layer | Rule |
|-------|------|
| **Primary cap** | Monthly **weighted tokens** via `credit-wallet.ts` / `usageBucket` |
| **Spam gate** | **requestsPerDay** only (remove `requestsPerHour` everywhere) |
| **BYOK active** | **Bypass** monthly + daily token/request caps; enforce **10 req/min** proxy anti-DDoS only |
| **Remove** | `requestsPerHour` from `plans.ts`, `metering.ts` hour bucket, `IMPROVE-BILLING-005` hourly caps |

Daily spam gate values (keep aligned `plans.ts` ↔ `plan-limits.ts`):

| Tier | requestsPerDay |
|------|----------------|
| Free | 50 |
| Starter | 720 |
| Pro | 2,880 |
| Studio | 7,200 |
| Enterprise | unlimited (-1) |

### 11.3 Ultra models (200× weight)

| Tier | Platform subscription path |
|------|---------------------------|
| Free, Starter, Pro | **Blocked** — BYOK or Credit Wallet only |
| Studio, Enterprise | **Allowed** — debits 200× from monthly weighted pool; hard stop when exhausted → BYOK/Wallet |

### 11.4 Collaboration (Yjs)

| Rule | Detail |
|------|--------|
| Git | **Unlimited** all tiers (no seat count on Git remotes) |
| Yjs write seats | Pro=2, Studio=3 (+$12/extra); Free/Starter=0 write seats |
| Overflow UX | N+1 user joins **read-only spectator** (see cursors, no edit until write slot frees) — **never** hard 403 |
| Field unification | `limits.yjsWriteSeats` (rename from `collaborators` / `realtimeCollabSeats`) |

### 11.5 Local vs cloud projects

| Rule | Detail |
|------|--------|
| Local (Tauri) | **Unlimited** all tiers — never hits Postgres quota |
| Cloud-synced | Free=1, Starter=3, Pro/Studio=∞ — enforce on POST only |
| Profile/settings sync | **Separate** from project quota — never fails silently |
| Limit UX | Banner: *"Cloud sync disabled for this project (Free limit). Files safe locally."* |

### 11.6 Decisions closed (2026-06-17 session 2–3)

| # | Decision |
|---|----------|
| **O1 Basic** | **Option A — Stripe grandfathering:** keep **$29 Price ID**; Next.js grants **Pro + IA** entitlements (`extras.grandfatheredBundle: 'pro_ia_29'`) |
| **O2 Enterprise** | Internal template; **Contact Sales** only |
| **O3 Free web** | 1 cloud + full editor; BYOK client-side |
| **O4 Credit packs** | Discontinued → Credit Wallet + BYOK |
| **O5 Starter trial** | Eliminated → `free` as entry; migrate Prisma/register defaults |
| **O6 CDN** | Soft stop at included GB; hard at **120%** (Starter 8→9.6 GB) |
| **O7 IDE generosity** | All agents + all workspace profiles + marketplace install + Yjs spectator + P2P LAN on **all tiers** — see `contracts_planning.md` §6 |

### 11.7 Enterprise product surface (O2 — partial)

**Checkout:** Sales-led / custom quote (no self-serve $199 on pricing page). Remove fixed public price from checkout; keep internal template in code for ops.

**UI when org has Enterprise entitlements:**

| Surface | Behavior |
|---------|----------|
| Badging | Header/sidebar: `Enterprise` or `Org: {companyName}` |
| Org admin tab | **Organization Settings** — audit logs, SAML/SSO config, team access, unified billing |
| Quota display | "Unlimited" or corporate capacity (e.g. `14 GB / 1,000 GB`) — not consumer-style bars |

**OPEN micro-decision:** Keep `enterprise` row in `plans.ts` as **internal template only** (hidden from checkout) — confirm before Wave 6.

### 11.8 Code/doc drift to fix on execution

| Drift | Fix |
|-------|-----|
| `plans.ts` `byokAddonUsd: 5` | Replace with `platformBaseUsd` + `iaAddonUsd` per §11.1 |
| `billing_security_analysis.md` §4.1 vs §10 BYOK | Unify to §11.1 base+addon |
| `plan-limits.ts` `requestsPerDay` vs `plans.ts` `requestsPerHour` | Single `requestsPerDay`; delete hour axis |
| `plan-limits.ts` `projectsMax` | Rename `cloudProjectsMax` |
| Pro feature copy "Unlimited projects" | → "Unlimited **cloud** projects" |
| Basic doc §7 says 10GB | **N/A** — basic tier removed; run migration script |
| `PlanId` includes `basic` | Keep for Stripe grandfather map; hidden checkout; entitlements → Pro+IA |
| IDE agent/domain gates | Remove tier locks — `contracts_planning.md` §6 |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | Created from user paste; validated against live code gaps |
| 2026-06-17 | **§10** — product alignment brief (local/cloud, BYOK, ops) |
| 2026-06-17 | **§11** — canonical plan matrix from user alignment session |
| 2026-06-17 | **§11.6–11.7** — basic→pro migration; Enterprise sales-led UI; Free web confirmed |
| 2026-06-17 | **`contracts_planning.md`** — canonical API/Stripe/BYOK contracts; IDE generosity §6 |
