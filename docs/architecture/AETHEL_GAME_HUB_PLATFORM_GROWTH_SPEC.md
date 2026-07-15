# Aethel Game Hub — Platform Growth & Discovery Specification

**Version:** 1.2 (Chief Architect — + Unit Economics CAC)  
**Status:** **APPROVED (Chief Architect 2026-07-05)** — Binding architecture for **Law XIV**  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.7  
**Unit economics:** [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md)    
**Prerequisite specs:** [`AETHEL_NETWORK_COMMERCE_LIVEOPS_SPEC.md`](AETHEL_NETWORK_COMMERCE_LIVEOPS_SPEC.md) (Laws XII–XIII)  
**Product path:** `cloud-web-app/web/app/arcade/` → **`/hub`** (evolution) + `packages/engine/`

Law XII solved **economy** (Treasury, Backpack, transactions). Law XIV solves **discovery and retention** — without it, a perfect economy sits atop a **Cemetery of Indies**. This document is the parallel critique, aligned architecture, and execution wave.

---

## Parallel Critique — Law XIV vs Existing Plans

| XIV Proposal | Verdict | Alignment / Conflict |
|--------------|---------|----------------------|
| **Discovery Feed (TikTok-style)** | **APPROVE with guards** | Complements Law XII §3 (Treasury spend on **paid** promotion). **Organic lane** = retention score; **paid lane** = creator Coins — never merge into one opaque algo |
| **Launch Budget Guaranteed (2k impressions)** | **APPROVE scoped** | = **impression budget**, not compute guarantee. Cap per game/day; anti-bot dedupe via Law II session IDs |
| **Verified Playtime Reviews (2h gate)** | **APPROVE** | **Hard dependency Law II** — `runtime-telemetry.ts` must emit `session_playtime_seconds` per `gameId`. Without F.2, reviews stay disabled (honest) |
| **Instant Web Demo (5 min)** | **APPROVE with Platform Reality** | Publish pipeline adds **`demo-web` artifact** stage — not pixel-streaming every AAA title Day 1. Safari = WebGL2 fallback slice |
| **Unified Social Graph** | **APPROVE** | Builds on **Aethel Account UID** (same as Backpack Law XII). Games opt-in via manifest — not forced on offline single-player |
| **Aethel Gamerscore** | **APPROVE phased** | Platform achievements aggregate cross-game; per-game trophies remain developer-defined |
| **F2P / Free tabs prominence** | **APPROVE** | Hub navigation must surface **Free Games**, **Free Cosmetics**, **Open Source Assets** — traffic driver, not paywall-only store |
| **Zero-latency tag filters (Framer Motion)** | **APPROVE** | Extends Law X — `--aethel-*` dynamic theming per category |
| **Cinematic Showcase page** | **APPROVE** | Evolves `/arcade/[slug]` → **`GameShowcasePage`** — Steam-parity conversion surface |
| **Cross-Save mandatory** | **APPROVE default-on, opt-out** | Uses Onda F `GameSave` + R2 blobs. Export manifest: `crossSavePolicy: required \| optional \| disabled` |
| **Cross-Play Desktop ↔ Web** | **CONDITIONAL** | **Honest gate: Onda G.2 netcode production-ready.** Until then: hub shows badge **Same-platform only** |

**Naming:** Existing **`/arcade`** becomes the **Game Hub** public surface. Route evolution: `/arcade` → `/hub` (301 redirect); internal code namespace `hub/` when migrated.

---

## Executive Audit — Game Hub Today (2026-07-05)

| Capability | Status | Evidence | Gap vs Law XIV |
|------------|--------|----------|----------------|
| Published game listing | **REAL (minimal)** | `app/arcade/page.tsx`, `PublishedGame` Prisma | Sort = `publishedAt desc` only — **cemetery pattern** |
| Game detail + iframe play | **REAL (basic)** | `app/arcade/[slug]/page.tsx` | No cinematic hero, no media carousel, no live player count |
| Play counter | **REAL** | `POST /api/arcade/[slug]` | Not retention-weighted; bot-vulnerable |
| Tags on games | **REAL (schema)** | `PublishedGame.tags[]` | Client filter only — no sidebar taxonomy, no 60fps layout morph |
| Search | **PARTIAL** | Client-side string match | No Elasticsearch/Redis search index at scale |
| Reviews / ratings | **AUSENTE** | — | No verified playtime gate |
| Discovery algorithm | **AUSENTE** | — | Static recency sort |
| Instant demo build | **AUSENTE** | Single `playUrl` web export | No 5-min light slice artifact |
| Friends / Rich Presence | **AUSENTE** | — | Matchmaking party exists (`api/matchmaking`) — **not** cross-game social |
| Deep link join friend | **AUSENTE** | — | — |
| Gamerscore / platform achievements | **AUSENTE** | — | — |
| Cross-save cloud | **PARTIAL** | `SaveManager` `cloudSyncEnabled: false` | No `GameSave` Prisma (Onda F) |
| Cross-play | **AUSENTE** | Netcode partial | Onda G.2 blocker |
| Free/F2P hub tabs | **AUSENTE** | — | — |
| Dynamic category theming | **AUSENTE** | — | — |

**Pattern:** **Arcade = honest MVP listing** (good foundation) → **not yet a growth engine**.

---

## Law XIV — Aethel Game Hub & Platform Growth (Binding)

**Mandate:** The Aethel **Game Hub** is a retention-first discovery network — not a static catalog. Every approved game receives **fair launch visibility**, **quality-weighted scaling**, **verified social proof**, and **frictionless try-before-download**. Platform identity (friends, achievements, saves) is **unified at the Aethel account layer**, not fragmented per title.

**Wave ownership:** **Onda I** — after **Onda F** (telemetry + GameSave) and in parallel with **Onda H** (shared Aethel Account). **Cross-play claims** blocked until **Onda G.2**.

---

### XIV.1 — Discovery Feed (Anti–Cemetery of Indies)

**Problem:** Steam/Google Play static top lists freeze out new creators.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────┐
│  Discovery Feed Engine                                       │
├─────────────────────────────────────────────────────────────┤
│  Lane A: Launch Guarantee                                    │
│    • New approved game → N impressions to niche cohort       │
│    • Default N = 2,000 unique accounts (configurable)        │
│    • Cohort = tag overlap + locale + device tier             │
├─────────────────────────────────────────────────────────────┤
│  Lane B: Retention Score (organic scale)                     │
│    • score = f(median_session_minutes, D1_return, completion)│
│    • High retention → feed rank boost                        │
│    • Low retention after guarantee → graceful decay          │
├─────────────────────────────────────────────────────────────┤
│  Lane C: Paid Boost (Law XII Treasury)                       │
│    • Creator spends Aethel Coins → featured slot             │
│    • Labelled "Promoted" — never disguised as organic        │
└─────────────────────────────────────────────────────────────┘
```

**Anti-abuse:**
- Playtime from Law II telemetry only — client-reported minutes **ignored**
- Bot clusters deduped by `sessionId` + device attestation (web) / client cert (desktop)
- Impression budget **daily cap** per game to prevent burn attacks

**Files:**
- `lib/hub/discovery-feed-engine.ts`
- `lib/hub/retention-scorer.ts`
- `app/api/hub/feed/route.ts`
- Redis: `hub:impressions:{gameId}`, `hub:retention:{gameId}`

**Critique note:** "TikTok infinite scroll" is optional UX — **core requirement** is guaranteed launch + retention-weighted rank, not addictive infinite feed (COPPA/GDPR friendly toggle).

**Unit economics (Decision #71):** Lane A **2k impressions = platform CAC** (~$0.001–0.01/impression target in ops model). Lane C **Promoted = Aethel Coins debit** before serve — never platform-funded promotion.

---

### XIV.2 — Verified Reviews (Anti–Review Bombing)

**Problem:** Competitors and bots destroy games with 1-star floods.

**Architecture:**
- Review button **disabled** until `PlayerGameStats.playtimeSeconds >= 7200` (2 hours) for that `gameId`
- Stats sourced from **Law II TelemetrySpool** — not localStorage
- Reviews store: `GameReview { userId, gameId, rating, body, verifiedPlaytimeAt, createdAt }`
- **Helpful votes** weighted by reviewer playtime tier
- Developer response thread (single level — no Reddit nesting wars)

**Edge case (critique resolution):** Games with `< 2h content` may enable **Early Access Reviews** with badge `Early Access — <2h verified` after **30 min** minimum — creator opt-in only.

**Files:**
- `lib/hub/verified-reviews.ts`
- `app/api/hub/games/[slug]/reviews/route.ts`
- Prisma: `PlayerGameStats`, `GameReview`

---

### XIV.3 — Instant Play Demo (Web Light Build)

**Problem:** 50 GB desktop download before knowing if thumbnail is clickbait.

**Architecture:**
- Publish pipeline stage **`demo-web-slice`** (parallel to full desktop build):
  - First **5 minutes** of scripted experience OR curated demo scene
  - Asset budget: ≤150 MB web bundle (Compression Mandate Law XII)
  - Output: `demoPlayUrl` on `PublishedGame`
- Hub CTA: **[Test Immediately]** → WebGPU path; WebGL2 fallback per Platform Reality
- Secondary CTA: **[Download Full Version]** → Tauri/desktop artifact

**Not MVP shortcuts:**
- No "coming soon demo" button — demo artifact **required** for Hub listing approval (except `early_access` flag)

**Files:**
- Extend `publish-pipeline-orchestrator.ts` with stage `demo-web-slice`
- `PublishedGame.demoPlayUrl`, `demoDurationSeconds`
- `components/hub/InstantDemoLauncher.tsx`

**Critique:** Pixel streaming for full AAA is **out of scope** for Onda I — light compiled slice only.

---

### XIV.4 — Aethel Social Graph (Unified Identity)

**Problem:** Friend in "Sword Game" cannot party with friend in "Space Shooter."

**Architecture:**

| Layer | Owner | Behavior |
|-------|-------|----------|
| **Friends list** | Aethel Platform | `Friendship`, `FriendRequest` — not per-game |
| **Rich Presence** | Aethel Platform | `{ status, gameId, gameTitle, joinable, serverInstanceId }` via heartbeat from runtime |
| **Deep Link** | Aethel Client | `aethel://join?game={slug}&instance={id}` → Tauri/web client resolves assets + matchmaking |
| **Party** | Platform + game | Extend `api/matchmaking` with `inviteToken` from social graph |
| **Gamerscore** | Platform | `PlatformAchievement`, `UserAchievement` — cross-game XP curve |

**Game manifest opt-in:**
```typescript
interface HubSocialPolicy {
  richPresenceEnabled: boolean
  allowJoinInProgress: boolean
  crossGameParty: boolean  // rare — default false
}
```

**Files:**
- `lib/hub/social-graph.ts`
- `lib/hub/rich-presence-service.ts`
- `packages/engine/hub/presence-client.ts`
- `components/hub/FriendsPanel.tsx`, `RichPresenceBadge.tsx`

---

### XIV.5 — Hub Navigation & F2P Taxonomy

**Problem:** 10,000 titles without fast taxonomy feels like a bank website.

**Architecture:**

**Primary tabs (always visible):**
- **All Games**
- **Free to Play**
- **Free Cosmetics** (Law XII universal listings where `price === 0`)
- **Open Source Assets**
- **New & Rising** (Discovery Feed lane A+B)

**Sidebar micro-tags:** Sci-Fi, Horror, Multiplayer, Lightweight, Co-op, etc.

**Interaction:**
- Tag click → **layout morph** at 60 FPS (Framer Motion `layoutId`) — **no full page reload**
- **Dynamic theming:** filter "Cyberpunk" → `--aethel-accent-*` shifts to neon cyan/magenta subtle background gradient (Law X tokens)

**Files:**
- `components/hub/HubSidebar.tsx`
- `components/hub/HubGameGrid.tsx` (layout animations)
- `lib/hub/taxonomy.ts` — maps tags ↔ theme tokens

---

### XIV.6 — Game Showcase Page (Conversion Vitrine)

**Problem:** Amateur title + download button = no trust, no hype.

**Evolution:** Replace minimal `arcade/[slug]` with **`GameShowcasePage`**:

| Block | Spec |
|-------|------|
| **Cinematic Hero** | Edge-to-edge muted autoplay trailer (WebM/HLS) — 3s hook |
| **Media Strip** | 4K screenshots + hover-play WebM clips — zero lazy-load flash |
| **Rich Description** | MDX-like: embedded GIFs, animated bullet lists, mechanic callouts |
| **Engine Transparency Panel** | Auto badges from publish manifest: `[Universal Backpack]`, `[Full Controller]`, `[Free to Play]`, `[Cross-Save]` |
| **Live Pulse** | Real-time concurrent players (Redis `hub:live:{gameId}`), latest patch note from LiveOps (Law XIII) |
| **Reviews panel** | Verified reviews only (XIV.2) |
| **Commerce strip** | Link to in-game IAP + universal cosmetics (Law XII) |

**Files:**
- `components/hub/GameShowcasePage.tsx`
- `components/hub/CinematicHeroBanner.tsx`
- `components/hub/MediaStripCarousel.tsx`
- `components/hub/EngineTransparencyPanel.tsx`

---

### XIV.7 — Unified State (Cross-Save & Cross-Play)

**Cross-Save (Onda F + I):**
- `GameSave` Prisma: `{ userId, gameId, slotId, blobHash, clientPlatform, updatedAt }`
- Blob in R2 CAS — **not** local SQLite/IndexedDB as source of truth when `crossSavePolicy: required`
- SaveManager wires `CloudProvider` implementation (today disabled)

**Cross-Play (Onda G.2 + I):**
- Matchmaking accepts `{ platform: 'web' \| 'desktop', buildId }` — same `LobbySession`
- Netcode transport: WebRTC + WebSocket universal stack (existing replication client)
- **Until G.2 ready:** Showcase displays **Platform badge** — no false cross-play marketing

**Critique:** Mandatory cross-save increases cloud cost — offset via **Pro subscription** (1 GB/player cap) or **IAP 12% server credit lane** — see unit economics §4.1.

---

## Integration with Law XII (Commerce)

| XII Surface | XIV Surface | Integration |
|-------------|-------------|-------------|
| Universal Store | Hub **Free Cosmetics** tab | Same catalog API, filtered |
| Treasury paid promotion | Discovery **Lane C** | Coins debit → featured impressions |
| Avatar Room | Hub friend panel entry | Equip before join-via-deep-link |
| Backpack | Engine transparency badge | `[Allows Universal Backpack]` from manifest |
| Sensory store UX | Showcase commerce strip | Shared `HoldToConfirmPurchase` component |

**Single account graph:** `User.id` → Backpack + Friends + Gamerscore + GameSave + Reviews.

---

## Onda I — Game Hub & Platform Growth (Execution Wave)

**Prerequisite:** Onda **F.2** (player telemetry), **F.1** (GameSave), **H.3** (Aethel account identity). Cross-play step gated on **G.2**.

| Step | Deliverable | Law |
|------|-------------|-----|
| **I.1** | Discovery Feed engine (launch guarantee + retention score + promoted lane) | XIV.1 |
| **I.2** | Verified reviews + `PlayerGameStats` + anti-bombing | XIV.2, II |
| **I.3** | Publish `demo-web-slice` + Instant Demo launcher | XIV.3, VI |
| **I.4** | Social graph + Rich Presence + deep link join | XIV.4 |
| **I.5** | Hub navigation (F2P tabs, tag morph, dynamic theming) | XIV.5, X |
| **I.6** | Game Showcase Page (cinematic vitrine) | XIV.6 |
| **I.7** | Cross-save wired (`GameSave` + SaveManager cloud) | XIV.7, II, VIII |
| **I.8** | Cross-play matchmaking (post G.2) + platform honesty badges | XIV.7, G.2 |

**Gate after each step:**

```bash
cd cloud-web-app/web && npm run typecheck && npm run lint && npm run test
```

---

## Prisma Models (Target — Onda I)

```prisma
model PlayerGameStats {
  userId           String
  gameId           String
  playtimeSeconds  Int      @default(0)
  lastPlayedAt     DateTime?
  sessionsCount    Int      @default(0)
  @@id([userId, gameId])
}

model GameReview {
  id               String   @id @default(cuid())
  userId           String
  gameId           String
  rating           Int      // 1-5
  body             String   @db.Text
  verifiedPlaytime Int      // seconds at post time
  isEarlyAccess    Boolean  @default(false)
  createdAt        DateTime @default(now())
  @@unique([userId, gameId])
}

model Friendship {
  id        String   @id @default(cuid())
  userId    String
  friendId  String
  status    String   // pending | accepted | blocked
  createdAt DateTime @default(now())
  @@unique([userId, friendId])
}

model PlatformAchievement {
  id          String @id @default(cuid())
  key         String @unique
  title       String
  tier        String // bronze | silver | gold | platinum
  xpValue     Int
}

model UserAchievement {
  userId        String
  achievementId String
  unlockedAt    DateTime @default(now())
  @@id([userId, achievementId])
}

// Extend PublishedGame:
//   demoPlayUrl String?
//   demoDurationSeconds Int?
//   crossSavePolicy String @default("optional")
//   hubSocialPolicy Json?
//   retentionScore Float @default(0)
//   launchImpressionsRemaining Int @default(2000)
```

---

## G-Readiness Checklist (Hub PRs)

- [ ] Telemetry events documented for any new ranking signal
- [ ] Promoted content labelled — never organic disguise
- [ ] Review gate fails closed without playtime data
- [ ] Demo bundle size within web budget (Platform Reality)
- [ ] Cross-play claims match G.2 readiness snapshot
- [ ] `--aethel-*` tokens only (Law X)
- [ ] Zero-MVP: no static "coming soon" discovery

---

## Honest Market Claim Timeline

| Milestone | Claim |
|-----------|-------|
| Today | Community **Arcade** — publish + basic play |
| After Onda I (minus I.8) | Discovery + verified reviews + showcase + social + cross-save |
| After Onda I.8 + G.2 | Cross-play Desktop ↔ Web with honesty badges |
| After Onda H + I | Full **Aethel Network** — economy + growth loop vs Epic/Roblox |

---

## Competitor baseline (Steam / Epic / Roblox / itch.io)

| Capability | Steam | Epic | Roblox | itch.io | Aethel I target | Surpass vector |
|------------|-------|------|--------|---------|-----------------|----------------|
| Discovery algo | Opaque | Curated + sales | Algorithm + social | Tags only | **3-lane transparent** | Launch guarantee 2k |
| Reviews | Open | Limited | — | Comments | **2h verified playtime** | Anti-bombing |
| Instant try | Demo downloads | — | Play in client | Browser | **5min web slice** | Zero install |
| Social graph | Friends + overlay | Epic friends | Platform native | — | **Unified Aethel account** | Cross-game presence |
| Creator fairness | Cemetery risk | Exclusivity deals | Algo bias | Direct | **Lane A guarantee** | Honest Promoted label |
| F2P surfacing | Mixed | — | Primary | Pay what you want | **Dedicated Hub tabs** | Free cosmetics tab |
| Cross-save | Cloud varies | — | Platform | — | **GameSave R2 CAS** | Manifest policy |

---

## Known limitations (honest)

| Limitation | Mitigation |
|------------|------------|
| Full AAA pixel streaming demo | Light web slice only (150 MB) |
| TikTok infinite scroll addiction UX | Optional; COPPA/GDPR toggle |
| Cross-play before G.2 | Honesty badge "same-platform" |
| Elasticsearch at 10k titles | Redis + Postgres phased; search index I.5+ |
| Roblox UGC volume | Indie-first; quality gates |

---

## Performance budgets

| Metric | Target |
|--------|--------|
| Discovery feed load | < 800ms p95 |
| Tag filter morph | 60 FPS layout (Framer Motion) |
| Demo launch cold start | < 5s web |
| Rich presence heartbeat | 30s interval; stale after 90s |
| Review post gate check | < 200ms telemetry lookup |

---

## Failure modes & mitigations

| Failure | Mitigation |
|---------|------------|
| Static recency sort (today) | I.1 Discovery engine |
| Bot playtime inflation | Law II session IDs only |
| Promoted disguised as organic | Lane C label mandatory |
| Demo button without artifact | Hub listing reject |
| False cross-play badge | G.2 gate + prohibition #25 |

---

## Extended acceptance + golden fixtures

| ID | Suite | Fixture |
|----|-------|---------|
| **I-ACC-01** | New game receives 2k impression guarantee | **GF-HUB-001** |
| **I-ACC-02** | Review blocked until 7200s playtime | **GF-HUB-002** |
| **I-ACC-03** | Demo slice ≤150 MB plays in browser | **GF-HUB-003** |
| **I-ACC-04** | Deep link join friend session | **GF-HUB-004** |
| **I-ACC-05** | Cross-save round-trip web ↔ desktop | **GF-HUB-005** |
| **I-ACC-06** | Showcase page conversion elements present | **GF-HUB-006** |

See [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md).

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_NETWORK_COMMERCE_LIVEOPS_SPEC.md` | Treasury + promotion Lane C |
| `AETHEL_NETCODE_PRODUCTION_SPEC.md` | I.8 cross-play |
| `AETHEL_PLANNING_COMPLETENESS.md` | A.0 100% certificate |

---

**Zero-MVP:** Hub is not "Arcade with search." Ship Law XIV complete or block the wave.
