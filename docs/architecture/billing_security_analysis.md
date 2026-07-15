# Billing Security & Bootstrapping Economics — Aethel Engine

**Status:** Revised canonical v2 (Cursor, 2026-06-17) — optimized for margin + indie acquisition  
**Executor:** [`implementation_plan.md`](./implementation_plan.md) → **Wave 6**  
**Debt registry:** `DEBT-FIN-*`, `DEBT-BILLING-001`, `DEBT-INFRA-001`

---

## 1. Bootstrapping constraints

| Item | Value |
|------|-------|
| Initial capital | R$ 3.000 (~$600 USD) |
| Monthly ops | R$ 1.500/mês (~$300 USD) |
| Target | Marginal cost ≈ $0/user where possible; **never** negative unit economics on AI |

### 1.1 Monthly runway math (conservative)

| Cost bucket | Est. @ 50 paying users | Notes |
|-------------|------------------------|-------|
| Hosting (Vercel + DB) | $80–120 | Scale with usage |
| OpenRouter API (blended) | $40–80 | **Only if weights + caps enforced** |
| Stripe fees | ~$45 | 2.9% on ~$1,500 MRR |
| Domain / tools | $30 | Fixed |
| **Total** | **~$195–275** | Fits R$1.500/mês with margin |

**Break-even MRR (rough):** ~$280 USD ≈ **32 users** at blended $9 ARPU, or **10 Studio** + **5 Pro**.

---

## 2. Infrastructure pillars (validated)

| Pillar | Status | Action |
|--------|--------|--------|
| Free OpenRouter models | **LIVE** | Keep on Free tier |
| Prepaid Stripe subscription | **PARTIAL** | Fix webhook downgrade (`DEBT-FIN-005`) |
| BYOK | **NOT LIVE** | Wave 6b — unlocks margin on power users |
| R2 zero egress | **NOT LIVE** | Wave post-6 — deploy viability |
| P2P multiplayer | **NOT LIVE** | Default path; TURN capped on paid tiers |

---

## 3. Royalty model (hybrid — unchanged)

| Channel | Rate |
|---------|------|
| Self-export (Steam, itch.io) | **5%** after $100k lifetime revenue |
| Aethel Playground + Aethel Pay | **10%** on IAP |

---

## 4. Canonical plan matrix v2 (REVISED — source of truth)

**Design principles applied:**

1. Keep **$9 / $29 / $79** price anchors (indie-friendly, Brazil-viable BRL).
2. **Weighted tokens** — all quotas are budget-equivalent @ $0.15/M (see §5).
3. **Free tier** tight on cloud, generous on local Tauri (zero marginal cost).
4. **Deprecate `basic`** for new sales — 3-rung ladder: Starter → Pro → Studio.
5. **Ultra models (Opus/o1)** — wallet or BYOK only on every paid tier.
6. **No silent overage** on subscription quota — hard stop + **Credit Wallet / PAYG** upsell (see [`AETHEL_PAYG_AND_WALLET_SPEC.md`](./AETHEL_PAYG_AND_WALLET_SPEC.md)).

### 4.1 Tier table

| Tier | USD/mo | BRL/mo | Annual USD | BYOK USD | Cloud projects | Storage | Weighted AI/mo | CDN egress | Collab | Dedicated MP |
|------|--------|--------|------------|----------|----------------|---------|----------------|------------|--------|--------------|
| **Free** | $0 | R$0 | — | — | **1** | 250 MB | **200K** (free models) | — | 0 | Local only |
| **Starter** | **$9** | **R$47** | $90 | — | 3 | **2 GB** | **1M** | 8 GB | 0 | P2P |
| **Pro** | **$29** | **R$149** | $290 | **$15** | ∞ | **14 GB** | **4.5M** | 100 GB | 2 | P2P + 1×256MB test |
| **Studio** | **$79** | **R$399** | $790 | **$45** | ∞ | **60 GB** | **18M** | 500 GB | 3 (+$12/seat) | 3×512MB |
| **Enterprise** | Custom | Custom | — | — | ∞ | 1 TB | **100M** (70M+750K prem) | Custom | ∞ | Custom |

### 4.2 Max API cost per tier (if quota fully burned on budget models)

| Tier | Revenue (net ~) | Max API @ budget | **Min gross margin** |
|------|-----------------|------------------|----------------------|
| Starter $9 | ~$8.44 | $0.15 | **~98%** |
| Pro $29 | ~$27.5 | $0.68 | **~97%** |
| Studio $79 | ~$76 | $2.70 | **~96%** |

With **40× weight** on Sonnet, a Pro user exhausting 4.5M weighted = 112.5K Sonnet tokens → API ~$0.68 — same ceiling.

With **200× Opus blocked** on subscription path → **no -$521/account scenario**.

### 4.3 Why we adjusted vs first draft

| Item | First draft | **v2 decision** | Reason |
|------|-------------|-----------------|--------|
| Free cloud projects | 10 in code | **1** | Storage/sync cost; local Tauri unlimited |
| Free tokens | 100K | **200K** | Enough for real trial; still free-model-only |
| Starter tokens | 1M | **1M** ✓ | Math safe at $9 with weights |
| Starter storage | 500MB in code | **2 GB** ✓ | User spec; R2 cheap |
| Pro tokens | 8M in code | **4.5M** | Was **loss risk** without weights; still generous vs Cursor |
| Pro storage | 10 GB | **14 GB** | Competitive with asset-heavy indies |
| Studio tokens | 25M in code | **18M** | Closer to spec; safer pre-weight implementation |
| Studio storage | 50 GB | **60 GB** ✓ | User spec |
| `basic` tier | $29 duplicate | **Legacy only** | Checkout shows Starter/Pro/Studio only |
| Extra seat | $15 | **$12** | More competitive; still profitable |
| Pro BYOK | $15 | **$15** ✓ | ~100% margin on AI line item |

### 4.4 Credit packs (profit center — post Wave 6)

**Status:** **DEPRECATED 2026-06-17** — replaced by **Credit Wallet** (flexible top-up) + BYOK. See [`contracts_planning.md`](./contracts_planning.md) §3.4.

| Pack | Price | Weighted tokens | Max API cost | Margin |
|------|-------|-----------------|--------------|--------|
| ~~Boost~~ | ~~$10~~ | ~~2.5M~~ | — | — |
| ~~Builder~~ | ~~$25~~ | ~~7M~~ | — | — |

### 4.5 CDN overage (when R2 live)

| Tier | Included | Overage |
|------|----------|---------|
| Starter | 8 GB | Hard stop (upgrade to Pro) |
| Pro | 100 GB | $0.10/GB |
| Studio | 500 GB | $0.08/GB |

R2 storage ~$0.015/GB-mo; egress $0 — overage is almost pure margin.

---

## 5. Token weight formula (mandatory before scale)

$$\text{WeightedTokens} = \text{RawTokens} \times \frac{\text{ModelCostPerM}}{0.15}$$

| Class | Examples | $/M | Weight |
|-------|----------|-----|--------|
| Budget | Gemini Flash, Haiku, GPT-nano | $0.15 | **1.0×** |
| Premium | Sonnet, GPT-5, o3-mini | $6.00 | **40.0×** |
| Ultra | Opus, o1, video-gen | $30.00+ | **200.0×** — **wallet/BYOK only** |

---

## 6. UX / ops risks (mitigations)

| Risk | Mitigation |
|------|------------|
| NAT P2P failure | TURN budget; Pro+ dedicated test server |
| BYOK friction | **Free BYOK enabled**; $5/mo addon = webhooks/queue — not $15 gate | `IMPROVE-BILLING-003` |
| Small storage | Marketplace refs; USDZ/GLB links; not full mesh duplication |
| Royalty audit | 5% off-platform honor system + Playground 10% with Aethel Pay |

---

## 7. Legacy `basic` tier

- **Existing subscribers:** grandfathered at $29; limits map to **Pro−** (2M weighted, 10GB, 2 seats).
- **New checkout:** hidden; upsell path Starter → Pro.
- **Code:** keep `PlanId` type; `extras.legacy: true` on `basic` in `plans.ts`.

---

## 8. Financial bugs (must fix Wave 6)

| ID | Issue |
|----|-------|
| `DEBT-FIN-005` | Stripe cancel → `User.plan` not `free` |
| `DEBT-FIN-006` | Transfer race |
| `DEBT-FIN-007` | Reservations ignored in balance |
| `DEBT-FIN-008` | No token weights |
| `DEBT-FIN-009` | No two-phase settle |
| `DEBT-FIN-010` | Plan drift (resolved by v2 sync) |
| `DEBT-FIN-011` | UsageBucket row lock contention under parallel agents |
| `DEBT-FIN-012` | Transfer deadlock without lock ordering |
| `DEBT-FIN-013` | Webhook-only plan downgrade — no lazy Stripe reconcile |

---

## 9. Concurrency mitigations (v3 — adopt in Wave 6)

### 9.1 Metering hot path (`DEBT-FIN-009` / `DEBT-FIN-011`)

**Problem:** Synchronous `usageBucket` increment per AI call → single row lock per user/month.

**Architecture:**

```
AI route → INCR Redis key usage:{userId}:{month} (weighted tokens)
         → return immediately
Background worker (30s) → FLUSH batch to Postgres usageBucket UPSERT
         → on Redis miss, fall back to Postgres with advisory lock
```

**Acceptance:** 50 parallel agent streams → p95 API latency unchanged; no Postgres row lock waits in hot path.

**Held if no Redis:** Use Postgres `pg_advisory_xact_lock(hashtext(userId))` + in-process debounce 5s — document as tier-1 fallback.

### 9.2 Credit transfer (`DEBT-FIN-006` / `DEBT-FIN-012`)

**Rule:** Always lock ledger rows in **ascending `userId` order** (UUID compare):

```ts
const [first, second] = [senderId, receiverId].sort();
await tx.$executeRaw`SELECT ... FROM credit_ledger WHERE user_id IN (...) ORDER BY user_id FOR UPDATE`;
```

Eliminates A→B / B→A deadlock cycles.

### 9.3 Stripe plan consistency (`DEBT-FIN-005` / `DEBT-FIN-013`)

**Hybrid:**

1. Webhook still sets `plan: 'free'` on `subscription.deleted` / `past_due`
2. **Lazy reconcile:** middleware / `requireEntitlements` — if `User.plan !== 'free'`, check `Subscription.status` + Stripe API (cache 1h in Redis or `User.planVerifiedAt`)
3. Fail closed to free if Stripe says inactive

---

## 10. Plan semantics v3 (UX audit)

| Dimension | Rule |
|-----------|------|
| Local Tauri projects | **Unlimited all tiers** |
| Cloud-synced projects | Free 1, Starter 3, Pro/Studio ∞ |
| Realtime collab seats | Yjs only — **Git collaborators unlimited** |
| Rate limits | Replace hourly hard caps with **token bucket** burst (monthly cap authoritative) |
| BYOK | All tiers; optional **$5/mo** platform addon |
| MP test servers | Pro: local tunnel default; cloud 512MB optional |

See [`user_experience_criticism.md`](./user_experience_criticism.md).

---

## 11. Ops resilience — rate limit fail-open policy (`DEBT-OPS-001`)

**Problem:** Today `middleware.ts` returns **503 `RATE_LIMIT_BACKEND_UNAVAILABLE`** when Upstash Redis REST fails in production. A third-party blip becomes a **platform-wide outage** — worse UX than briefly running without distributed limits.

**Recommended posture: tiered hybrid (not binary fail-open/fail-closed)**

| Route class | On Upstash failure | Rationale |
|-------------|-------------------|-----------|
| Authenticated IDE APIs (`/api/projects/*`, `/api/ai/*`, `/api/files/*`, …) | **Fail-open** with per-IP in-memory token bucket (same limits as Upstash config) | Preserve paying user workflow; abuse risk bounded by auth + monthly metering |
| Auth / signup / password reset | **Fail-closed** (503 or strict in-process cap) | Prevents credential stuffing when Redis is down |
| Billing webhooks / checkout | **Fail-closed** or queue + retry | Financial integrity |
| Public unauthenticated APIs | **Fail-closed** with conservative in-process cap | DDoS surface |

**Observability (mandatory if fail-open):**

- Log `rate_limit_backend_degraded` with `requestId`, route class, IP hash
- Increment metric / alert when degradation > 60s
- Optional env `AETHEL_RATE_LIMIT_FALLBACK=local` already wired for dev — extend to prod **only** for authenticated IDE lane

**Gate reconciliation:** `scripts/check-v25-market-spine.mjs` currently **requires** the string `RATE_LIMIT_BACKEND_UNAVAILABLE`. Implementation must either:

1. Keep the error code for **fail-closed routes only**, or  
2. Update the gate to assert tiered behavior + structured log line instead of global 503

**Verdict:** Fail-open for the **authenticated IDE spine** is the correct product call — it prevents 3am support fires from Upstash latency. Global fail-closed is appropriate for **security/finance** endpoints only.

See [`critical_user_experience_audit.md`](./critical_user_experience_audit.md) #25.

---

## 12. BYOK architecture — client-held keys (`DEBT-BILLING-001`)

**Principle:** Developer API keys never touch Postgres or server logs.

### 12.1 Storage

| Runtime | Store | Encryption |
|---------|-------|------------|
| Web IDE | IndexedDB (`aethel-byok-v1`) | Web Crypto AES-GCM; key derived from session + user gesture |
| Tauri | OS keyring (`keyring` crate) | Platform secure enclave |

### 12.2 Request flow

```
Client → POST /api/ai/chat
  Headers: X-Aethel-BYOK-Provider, X-Aethel-BYOK-Credential (encrypted blob, single-use nonce)
Server → decrypt in memory → forward to OpenAI/Anthropic/OpenRouter
       → discard credential before response return
       → skip consumeMeteredUsage / checkAIQuota token debit
       → still enforce enforceAiCoreRateLimit (abuse)
       → auditLog: { billingMode: 'byok', model, tokensEstimate } — no key fields
```

### 12.3 Free tier BYOK

- `plans.ts` `extras.byokEnabled: true`, `byokAddonUsd: 0` on Free — **allowed**
- Platform still bills **zero** tokens; user pays provider directly
- Optional `$5/mo` addon on paid tiers unlocks platform features (collab relay, MCP proxy bandwidth) — not the key itself

### 12.4 Stripe

- Base checkout unchanged (`STRIPE_PRICE_PRO`, etc.)
- Optional second line item: `STRIPE_PRICE_BYOK_ADDON` ($5/mo unified per v3) **or** tiered prices if product chooses Option B in `implementation_plan.md` §10.2.1

---

## 13. Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | v1 ingest from user paste |
| 2026-06-17 | v2 revised — unit economics, 4.5M/18M caps |
| 2026-06-17 | **v3** — Redis metering, lock ordering, lazy Stripe, local/BYOK UX, modular pricing |
| 2026-06-17 | **§11** — tiered fail-open rate-limit policy for IDE vs auth/billing |
| 2026-06-17 | **§12** — BYOK client-held key + proxy architecture |
