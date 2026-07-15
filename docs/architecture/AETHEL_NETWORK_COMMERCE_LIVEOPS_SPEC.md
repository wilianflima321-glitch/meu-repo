# Aethel Network — Universal Commerce & Immutable LiveOps Specification

**Version:** 1.2 (Chief Architect — + Unit Economics)  
**Status:** Binding architecture for **Law XII** and **Law XIII**  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.7  
**Unit economics:** [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md)  
**Growth spec:** [`AETHEL_GAME_HUB_PLATFORM_GROWTH_SPEC.md`](AETHEL_GAME_HUB_PLATFORM_GROWTH_SPEC.md) (Law XIV)  
**Product path:** `cloud-web-app/web/` + `packages/engine/` + `apps/studio-local/`

This document is **not a backlog sketch**. It is the definitive financial, UX, security, and LiveOps specification for the Aethel Network ecosystem — superior to Epic Games Store + Roblox commerce loops when complete. Every deliverable assumes **Zero-MVP Doctrine** and **G-readiness hooks** from first wire.

---

## Executive Audit — What Exists Today (2026-07-05)

| Capability | Status | Evidence | Gap vs Law XII/XIII |
|------------|--------|----------|---------------------|
| Stripe Connect creator onboarding | **REAL** | `lib/server/stripe-connect.ts`, `/api/marketplace/stripe/onboard` | KYC/W-8BEN UI exists; not wired to **Aethel Coins** wallet |
| Marketplace checkout (fiat) | **REAL** | `app/api/marketplace/checkout/route.ts` | IDE **extension** catalog only — not universal cosmetics |
| Sale ledger + escrow | **REAL** | `lib/marketplace/transactions.ts`, `ESCROW_WINDOW_DAYS=14` | **14-day creator hold** — not 48h **item custody** + backpack revoke |
| Revenue split constant | **CONFLICT** | `payouts.ts` `PLATFORM_TAKE_RATE=0.12`; UI says 70% creator | Law XII mandates **30/70 Universal Store**; 12% remains **IAP server-offset lane** only |
| Credit ledger | **REAL (wrong domain)** | `CreditLedgerEntry`, `lib/credit-wallet.ts` | **AI compute credits** — not Aethel Coins premium currency |
| Marketplace UI | **PARTIAL** | `app/marketplace/*`, `MarketplaceCard.tsx` | Extension cards — no 3D dressing room, no rarity VFX |
| Generic inventory engine | **REAL (unwired)** | `lib/inventory/system/inventory.ts` (~450 LoC) | Local game slots — **no** cross-game Backpack, **no** CAS lazy load |
| Asset cook pipeline (planning) | **PARTIAL** | `studio-local-cook-queue.ts`, `publish-pipeline-orchestrator.ts` | Draco/KTX2/LOD stages planned; **`executionAllowed: false`** — Compression Mandate not enforced |
| Runtime IAP client | **STUB** | `packages/engine/billing/runtime-billing-client.ts` | No `/api/runtime-billing/checkout`; fails closed |
| Monetization publish stage | **REAL (contract)** | `publish-pipeline-orchestrator.ts` stage 5 | Injects Stripe pk only — no `Aethel.Store.PromptPurchase` overlay |
| Player telemetry | **AUSENTE** | `runtime-main.ts` — zero analytics | Law II + XIII need player events + live tuning |
| Blue/green deploy | **AUSENTE** | `DeploymentPipeline` Prisma model — no routes | Schema shell only |
| Live tuning Redis buffer | **AUSENTE** | Redis used for rate limit/matchmaking | No tunable data tables |
| P2P community market | **AUSENTE** | — | CS:GO-style resale |
| Universal identity / Avatar Room | **AUSENTE** | — | No `AllowUniversalAssets` world flag |
| Scarcity / AethelLedger | **AUSENTE** | — | No PostgreSQL cryptographic edition registry |
| Sensory commerce UX | **AUSENTE** | — | No `InteractiveDressingRoom`, haptics, MetaSounds UI audio |

**Pattern (same as engine audit):** strong **IDE marketplace + Stripe Connect** scaffolding → **zero universal player economy** → **zero LiveOps deploy immutability**.

---

## Law XII — Universal Commerce & Aethel Treasury (Binding)

**Mandate:** Aethel is **Merchant of Record** for the closed-loop **Aethel Network**. Creators never process player payments locally. All universal commerce flows through **Aethel Treasury** with auditable ledger, regional pricing, escrow, and circular coin utility.

**Wave ownership:** **Onda H** (primary) — hooks from **Onda F** (CAS depot) and **Onda A.2** (KTX2 cook).

### XII.1 — Dual Currency Model

| Currency | Source | Platform control | Notes |
|----------|--------|------------------|-------|
| **Aethel Coins** (premium) | Fiat via Stripe on Aethel portal; Purchase Parity regional pricing | **Treasury mint/burn** only | Stored in `AethelCoinLedger` (new) — **not** `CreditLedgerEntry` (AI credits) |
| **Soft currency** (local) | Game logic mint/destroy (Gold, Silver, etc.) | Developer infinite local inflation | Never taxed by Aethel; **not** convertible to fiat without game rules |

**Hard rule:** `CreditLedgerEntry` remains **AI Compute Pass** domain. Law XII introduces separate models — no conflation in PRs.

### XII.2 — Revenue Share (Universal Store)

| Lane | Platform take | Creator receive | Settlement |
|------|---------------|-----------------|------------|
| **Universal assets / cosmetics** (Law XII) | **30%** | **70% in Aethel Coins** → Creator Wallet | Circular spend or cash-out |
| **In-game IAP** (dedicated-server offset) | **12%** | 88% + server bill credit | Existing `redis-cost-guard.ts#recordRevenueCreditFromSale` — **separate** from Universal Store |

**Migration:** Replace `PLATFORM_TAKE_RATE` single constant with `RevenueLane.UNIVERSAL_STORE | IN_GAME_IAP` enum in `lib/marketplace/payouts.ts`. UI copy ("Earn 70%") aligns with Law XII; code must match.

### XII.3 — Circular Utility (Treasury Closure)

Creators **must** spend Aethel Coins inside ecosystem before cash-out pressure:

1. **Aethel Pro / Enterprise** subscription (hosting + storage)
2. **Third-party universal asset licenses** (scripts, high-quality meshes)
3. **Store promotion** (featured placement on **Game Hub** — Law XIV Lane C paid boost; organic scaling = Lane B retention score)

Implementation: `TreasurySpendRouter` debits Creator Wallet before Stripe Connect transfer eligibility.

### XII.3.1 — Subscription SKUs (canonical — from `plans.ts`)

**Binding:** Live prices and limits in [`cloud-web-app/web/lib/plans.ts`](../../cloud-web-app/web/lib/plans.ts). Modular Stripe decomposition in [`contracts_planning.md`](./contracts_planning.md) §3.1. Unit economics in [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md) §4.

| SKU | USD/mo | Primary revenue | Offsets COGS |
|-----|--------|-----------------|--------------|
| **Free** | $0 | Acquisition | 200K free-model tokens only |
| **Starter** | $9 | Indie entry | 1M tokens, 2 GB, 8 GB CDN |
| **Pro** (+ optional IA addon) | $15 base / $29 with IA | Professional indie | 14 GB, 100 GB CDN, 4.5M weighted |
| **Studio** (+ optional IA addon) | $45 base / $79 with IA | Teams | 60 GB, 500 GB CDN, 18M weighted |
| **Enterprise** | $199 (Contact Sales) | Compliance / SLA | 1 TB, 100M tokens, custom MP |

**Prisma target (H.1) — mirror `plans.ts`, do not invent parallel tiers:**

```prisma
model SubscriptionEntitlement {
  id                String   @id @default(cuid())
  userId            String
  planId            String   // free | starter | basic | pro | studio | enterprise
  platformSku       String?  // starter | pro_base | studio_base
  iaAddonActive     Boolean  @default(false)
  storageBytesCap   BigInt   // from PlanLimits.storage
  tokensPerMonth    Int      // UsageBucket seed; 0 if BYOK-only platform SKU
  cdnEgressGb       Int      // from extras.cdnEgressGB
  renewsAt          DateTime
  // cloudCookMinutes, sandboxMinutes — add when Wave 6 / Onda L ships; not in plans.ts yet
}
```

**H.0 blocker remains:** fix `payouts.ts` RevenueLane before enabling checkout.

### XII.4 — Cash-Out Pipeline

| Step | Implementation |
|------|----------------|
| Gateway | **Stripe Connect Express** (primary) or Hyperwallet (regional fallback) |
| Threshold | Minimum **$100 USD equivalent** accrued in cleared balance |
| KYC / tax | W-8BEN / W-9 via Connect onboarding — extend `payout-setup/page.tsx` |
| Escrow (creator) | **14 days** pending before withdrawable (chargeback protection — keep existing) |
| Escrow (item custody) | **48 hours** after purchase — item revocable on chargeback (see XII.5) |

### XII.5 — Item Custody Escrow & Chargeback Shield

When a player buys a universal item:

1. Fiat or Aethel Coins debit → **`PlayerOwnedItem`** row `status: custodial`
2. Item appears in **Aethel Backpack** immediately (UX) but flagged `revocable: true`
3. After **48h** without dispute → `status: owned`, `revocable: false`
4. On chargeback → item **removed from Backpack** (CAS entitlement revoked); creator protected if past creator escrow window; **platform absorbs** dispute if already paid out

**Files to create:**

- `lib/treasury/aethel-coin-ledger.ts`
- `lib/treasury/item-custody-escrow.ts`
- `lib/treasury/chargeback-handler.ts` (webhook extension on `billing/webhook/route.ts`)

### XII.6 — Prisma Models (Target Schema)

```prisma
// New — do not extend CreditLedgerEntry
model AethelCoinLedgerEntry {
  id        String   @id @default(cuid())
  userId    String
  amount    Int      // integer coins; negative = spend
  lane      String   // purchase | creator_earn | treasury_spend | cashout
  reference String?
  metadata  Json?
  createdAt DateTime @default(now())
}

model PlayerOwnedItem {
  id              String   @id @default(cuid())
  userId          String
  marketplaceItemId String
  contentHash     String   // CAS blob ref
  editionNumber   Int?     // scarcity
  status          String   // custodial | owned | revoked
  revocableUntil  DateTime?
  equippedSlot    String?
  createdAt       DateTime @default(now())
}

model AethelEditionRegistry {
  id                String @id @default(cuid())
  marketplaceItemId String @unique
  maxSupply         Int
  mintedCount       Int    @default(0)
  merkleRoot        String // non-blockchain scarcity proof
}
```

---

## Law XIII — Immutable LiveOps (Binding)

**Mandate:** Published online games **never** receive in-place code injection on live player sessions. Balance changes apply through **versioned deploy** or **Redis live-tuning buffers** with tick-safe application boundaries.

**Wave ownership:** **Onda H.6** — prerequisites in **Onda F** (TelemetrySpool) and **Onda C** (deterministic sim for tuning safety).

### XIII.1 — Blue/Green Deployment (End of "Hack Live")

| State | Behavior |
|-------|----------|
| Production fleet | **v1.0** — players finish matches undisturbed |
| IDE laboratory | **v1.1** — new build packaged via publish pipeline |
| Publish action | Spawn **new server fleet** v1.1; matchmaking routes **new** players only |
| Drain | When last v1.0 player disconnects → terminate v1.0 fleet |
| Guarantee | **Zero crash, zero downtime** mid-combat |

**Implementation targets:**

- `lib/liveops/blue-green-orchestrator.ts`
- Extend `DeploymentPipeline` model: `activeVersion`, `drainingVersion`, `fleetId`
- Matchmaking service reads `PublishedGame.activeBuildId`

### XIII.2 — Live Tuning Tables (Redis Buffer)

For numeric changes (damage 10 → 15) **without** full package publish:

1. IDE **LiveOps tab** writes `{ key, value, scope }` → Redis `liveops:tuning:{gameId}`
2. Runtime polls or subscribes on **match boundary only** (respawn / new match)
3. **Never** mutate Rapier state mid-swing — prevents physics desync

**Files:**

- `lib/liveops/tuning-buffer.ts`
- `app/api/liveops/tuning/route.ts`
- IDE panel: `components/liveops/LiveOpsTuningPanel.tsx`

---

## Section 1 — Aethel Treasury (Financial Motor)

Full specification as approved by Chief Architect — see Law XII above for binding rules.

### Purchase Parity

Stripe Price objects per region (PPP tables) — `lib/treasury/purchase-parity.ts` maps geo → price ID. No raw USD display without localized equivalent.

### Creator Wallet UI

| Balance | Color token | Meaning |
|---------|-------------|---------|
| Available | `--aethel-success-light` | Cleared + past escrow |
| Pending | `--aethel-warning-light` | Within 14-day creator hold |
| Aethel Coins | `--aethel-neon-cyan` | Spendable in-ecosystem |

Extend `app/marketplace/creator/earnings/page.tsx` — dual fiat + coins ledger.

---

## Section 2 — UGC Pipeline (Creator Economy)

### 2.1 — Asset Minting & Compression Mandate

**Flow:**

```
Creator Hub upload (.glb)
  → Remote Asset Cooker (mandatory gate)
      Draco geometry
      KTX2/BasisU textures
      LOD0 / LOD1 / LOD2
      VRAM + triangle budget report
  → AI Moderation agent
      polygon/VRAM limits
      NSFW + copyright scan (IP registry cross-ref)
  → AethelEditionRegistry (optional scarcity)
  → Universal Store listing
```

**Enforcement:** `app/api/marketplace/universal/publish/route.ts` returns **403** if cook job not `passed`. Wire `studio-local-cook-queue.ts` with `executionAllowed: true` on server workers (Onda H.2).

**Budget limits (initial — tunable via Law XIII):**

| Tier | Triangles (LOD0) | VRAM est. | Max source upload |
|------|------------------|-----------|-------------------|
| Universal cosmetic | 25k | 32 MB | 50 MB raw |
| Universal weapon | 40k | 48 MB | 80 MB raw |
| Reject | >100k post-cook | >128 MB | >200 MB raw |

### 2.2 — Player-to-Player Community Market

| Rule | Value |
|------|-------|
| Eligible items | `AethelEditionRegistry` limited editions + tradable flag |
| Currency | Aethel Coins only |
| Platform fee | **10%** on secondary sale |
| Original creator royalty | **5%** on every resale (configurable per listing) |
| Anti-wash-trading | Velocity limits + anomaly detection (Law XII fraud hooks) |

**Files:**

- `lib/marketplace/community-market.ts`
- `app/api/marketplace/community/listings/route.ts`
- UI: `components/commerce/CommunityMarketPanel.tsx`

---

## Section 3 — Universal Identity & Anti-P2W

### 3.1 — Avatar Room & Dual Inventory

```
┌─────────────────────────────────────────────────────────┐
│  Avatar Room (Hub)                                       │
│  Skeleton base + equip universal items before join       │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────────┐           ┌─────────────────────┐
│ Aethel Backpack      │           │ Game Inventory       │
│ PostgreSQL + CAS     │           │ Per-server SQLite      │
│ Lazy load blobs      │           │ Pickups stay in world  │
│ Cross-game           │           │ Non-portable           │
└─────────────────────┘           └─────────────────────┘
```

**Lazy loading:** `PlayerOwnedItem.contentHash` → R2 CAS fetch on equip only; never preload full backpack into RAM.

**Files:**

- `lib/commerce/aethel-backpack-service.ts`
- `lib/commerce/avatar-room-runtime.ts`
- `packages/engine/commerce/backpack-client.ts` (published runtime)
- UI: `components/commerce/AethelBackpackPanel.tsx`, `AvatarRoomHub.tsx`

### 3.2 — Anti-P2W Shield

World export manifest includes:

```typescript
interface WorldCommercePolicy {
  allowUniversalAssets: boolean  // default false for competitive RPGs
  sanitizeAttributes: true       // always true when allowUniversalAssets
}
```

Runtime component: **`UniversalCosmeticComponent`** — mesh + texture + animation only. Game GAS assigns stats locally (`onUniversalItemEquipped` event).

**Files:**

- `lib/commerce/universal-cosmetic-component.ts`
- `packages/engine/commerce/universal-asset-loader.ts`
- VS node: `UniversalAssetEquipNode` in visual scripting catalog

---

## Section 4 — Sensory Commerce UX (AAA Standard — extends Law X + IV)

Amateur stores show floating meshes. Aethel commerce is **visceral, sonic, tactile**.

### 4.1 — Component Matrix (Mandatory — no stubs)

| Component | Responsibility | Dependencies |
|-----------|----------------|--------------|
| `InteractiveDressingRoom.tsx` | Clone player avatar; equip preview in real-time; orbit camera | R3F viewport + avatar rig |
| `Interactive3DInspector.tsx` | Spin item; cloth capes get Rapier wind sim in 2D panel | Rapier + wind field |
| `RarityVFXContainer.tsx` | Legendary pulse particles; glass refraction on grid slot | WebGL overlay + `--aethel-*` tokens |
| `FluidDragAndDropGrid.tsx` | Spring physics DnD; magnetic snap to equip slots | `@dnd-kit` or custom spring |
| `HoldToConfirmPurchase.tsx` | Destiny 2-style hold bar; glassmorphism freeze | Native kernel overlay |
| `CommerceAudioController.tsx` | MetaSounds procedural UI SFX (Law IV) | `ai-audio-engine-sfx.ts` compiler |

### 4.2 — Sensory Design Rules

| Event | Audio (Law IV) | Haptic |
|-------|----------------|--------|
| Item hover | Soft tick + rarity pitch shift | — |
| Purchase success | Chord stinger | Light pulse |
| Equip heavy armor | Metallic `clank` | Strong rumble (Gamepad API) |
| Equip cloth cape | Fabric rustle + wind | Soft rumble |
| Legendary drop to slot | Shimmer + bass thump | Pattern rumble |

**Haptics:** `navigator.getGamepads()` + Vibration API on mobile — `lib/commerce/haptic-feedback.ts`.

### 4.3 — Frictionless Checkout

**`Aethel.Store.PromptPurchase(skuId)`** (published runtime API):

1. Game thread pauses input; glass overlay (`HoldToConfirmPurchase`)
2. **Native Kernel** (Tauri) or **secure iframe** (web) owns transaction — immune to game scripts
3. If Aethel Coins balance sufficient → hold-to-confirm only
4. Else → Stripe one-click (saved payment method)

**Security:** No game Lua/VS can touch Stripe keys — all via `runtime-billing-client.ts` → platform endpoints.

---

## Section 5 — LiveOps Deployment (Law XIII Detail)

See Law XIII. Additional IDE surfaces:

| Surface | Purpose |
|---------|---------|
| **LiveOps tab** | Tuning tables, feature flags, scheduled events |
| **Deploy tab** | Blue/green publish with fleet drain visualization |
| **Ops dashboard** | Active v1.0 vs v1.1 player counts |

**Telemetry prerequisite (Law II):** `packages/engine/runtime-telemetry.ts` must emit `match_start`, `match_end`, `player_disconnect` for drain detection.

---

## Onda H — Aethel Network (Execution Wave)

**Prerequisite:** Onda F (CAS + TelemetrySpool) substantially complete; Onda A.2 (KTX2) for Compression Mandate.

| Step | Deliverable | Laws |
|------|-------------|------|
| **H.1** | `AethelCoinLedger` + Treasury + Purchase Parity + dual revenue lanes | XII |
| **H.2** | Universal publish + Compression Mandate cooker gate + AI moderation | XII |
| **H.3** | `PlayerOwnedItem` + Aethel Backpack + Avatar Room + CAS lazy load | XII |
| **H.4** | Anti-P2W manifest + `UniversalCosmeticComponent` + runtime loader | XII |
| **H.5** | Sensory commerce UX (all 6 components) + `Aethel.Store.PromptPurchase` | X, IV, XII |
| **H.6** | Community market (10% fee) + `AethelEditionRegistry` scarcity | XII |
| **H.7** | Blue/green orchestrator + LiveOps Redis tuning + IDE panels | XIII, II |
| **H.8** | Chargeback backpack revoke + webhook hardening + integration tests | XII, XIII |

**Gate after each step:**

```bash
cd cloud-web-app/web && npm run typecheck && npm run lint && npm run test
```

Plus commerce E2E: Playwright purchase → backpack equip → chargeback simulation (Onda G.1 extends).

---

## G-Readiness Checklist (Every Onda A–H PR touching commerce)

- [ ] Revenue lane explicit (`UNIVERSAL_STORE` vs `IN_GAME_IAP`)
- [ ] No `CreditLedgerEntry` misuse for player coins
- [ ] Escrow windows documented in API responses
- [ ] `allowUniversalAssets` respected in runtime loader
- [ ] Cook gate cannot be bypassed for universal listings
- [ ] Live tuning keys versioned; never applied mid-physics tick
- [ ] Sensory components use `--aethel-*` tokens only
- [ ] `createComponentLogger` — no `console.log`

---

## Canonical File Index (Target)

| Domain | Path | Status today |
|--------|------|--------------|
| Stripe Connect | `web/lib/server/stripe-connect.ts` | REAL |
| Sale transactions | `web/lib/marketplace/transactions.ts` | REAL |
| Payouts split | `web/lib/marketplace/payouts.ts` | REAL (fix lanes) |
| AI credits (separate) | `web/lib/credit-wallet.ts` | REAL |
| Local inventory | `web/lib/inventory/system/inventory.ts` | REAL (orphan) |
| Runtime billing stub | `packages/engine/billing/runtime-billing-client.ts` | STUB |
| Cook queue | `web/lib/production/studio-local-cook-queue.ts` | PARTIAL |
| Marketplace UI | `web/app/marketplace/*` | PARTIAL |
| Treasury (new) | `web/lib/treasury/*` | AUSENTE |
| Backpack (new) | `web/lib/commerce/*` | AUSENTE |
| LiveOps (new) | `web/lib/liveops/*` | AUSENTE |
| Sensory UX (new) | `web/components/commerce/*` | AUSENTE |

---

## Honest Market Claim Timeline

| Milestone | Claim |
|-----------|-------|
| Today | IDE extension marketplace + Stripe Connect scaffold |
| After Onda H | Universal cross-game cosmetics + Treasury + sensory store + immutable LiveOps |
| After Onda G + H | Industry-standard commerce loop competitive with Epic/Roblox **on desktop/console exports** |

Web published games: commerce subset (Aethel Coins, hold-to-confirm) with Platform Reality Doctrine ceilings.

---

## Competitor baseline (Epic / Roblox / Steam)

| Capability | Epic Store | Roblox | Steam | Aethel H target | Surpass vector |
|------------|------------|--------|-------|-----------------|----------------|
| Creator revenue share | 88/12 dev | ~30% platform | 70/30 | **70/30 Universal Store** | Circular Coins utility |
| Cross-game cosmetics | Limited | Avatar items | Per-game | **Aethel Backpack** | CAS lazy load |
| UGC moderation | Manual + AI | AI + human | Workshop | **AI moderation + cook gate** | Compression Mandate |
| LiveOps deploy | Patch downloads | Server config | Developer | **Blue/green + Redis tuning** | Zero mid-combat inject |
| Secondary market | — | Limited | Community market | **10% fee + 5% royalty** | Edition registry |
| Player chargeback | Platform | Platform | Platform | **48h item custody revoke** | Creator + platform shield |
| In-game IAP | Epic overlay | Robux | Steam microtxn | **`Aethel.Store.PromptPurchase`** | Kernel-isolated checkout |

---

## Known limitations (honest)

| Limitation | Mitigation |
|------------|------------|
| Not Epic payment ecosystem | Stripe Connect + Treasury |
| Roblox-class UGC volume Day 1 | Cook gate + moderation queue |
| Crypto/NFT editions | Merkle scarcity only — no chain marketing |
| Global tax complexity | Stripe Connect KYC regions |
| Web full sensory haptics | Gamepad API subset |

---

## Performance & fraud budgets

| Metric | Target |
|--------|--------|
| Purchase confirm latency | < 3s p95 |
| Backpack equip lazy load | < 500ms first CAS fetch |
| Chargeback revoke | < 60s from webhook |
| Community market wash detection | velocity limits + anomaly score |
| Cook moderation queue | < 15min p95 for 50MB asset |

---

## Failure modes & mitigations

| Failure | Mitigation |
|---------|------------|
| `payouts.ts` 12% vs 30% conflict | H.0 **blocker** — RevenueLane enum |
| CreditLedger conflated with Coins | Separate Prisma models — prohibition |
| Bypass cook gate | 403 on publish route |
| Live tuning mid-physics | Match boundary apply only |
| Game script touches Stripe | Kernel overlay only |

---

## Extended acceptance + golden fixtures

| ID | Suite | Fixture |
|----|-------|---------|
| **H-ACC-01** | Purchase → Backpack → equip | **GF-COMMERCE-001** |
| **H-ACC-02** | Chargeback revokes custodial item | **GF-COMMERCE-002** |
| **H-ACC-03** | Universal cosmetic no stat change | **GF-COMMERCE-003** |
| **H-ACC-04** | Blue/green drain — zero mid-match crash | **GF-COMMERCE-004** |
| **H-ACC-05** | Compression Mandate rejects oversize | **GF-COMMERCE-005** |
| **H-ACC-06** | Hold-to-confirm sensory UX + MetaSounds | Law IV + X |

See [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md).

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_GAME_HUB_PLATFORM_GROWTH_SPEC.md` | Discovery Lane C paid boost |
| `AETHEL_CONTENT_PIPELINE_SPEC.md` | S7.4 marketplace validation |
| `AETHEL_PLANNING_COMPLETENESS.md` | A.0 100% certificate |
| `AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md` | COGS/REV matrix, quotas |

---

**Zero-MVP:** No "basic store", "v2 backpack", or "placeholder dressing room". Ship Law XII/XIII complete or block the wave.
