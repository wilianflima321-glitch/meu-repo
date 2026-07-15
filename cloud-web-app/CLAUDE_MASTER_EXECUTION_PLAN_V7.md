# Aethel Engine — Master Execution Plan v7

> [!CAUTION]
> **SUPERSEDED (2026-07-11) — DO NOT EXECUTE FROM THIS FILE**  
> Task queue: `docs/architecture/AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md`  
> Live DONE/OPEN: `docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md`  
> Nav: `docs/architecture/AETHEL_STUDIO_SUPREMACY_INDEX.md` § Document Authority  
> Historical archive only. Conflicts lose to Master Map + Roadmap v4.7.

## Complete, Zero-Compromise, Single-Round Execution Specification

**Purpose**: Historical archive. **Not** the single source of truth — see Master Map.

**Date**: June 27, 2026  
**Status**: **SUPERSEDED.** Do not treat as Definitive over Roadmap v4.7 / Master Map.

---

## 1. Ground Truth — What Already Exists (DO NOT TOUCH OR REWRITE)

The following systems are fully implemented, type-safe, and functional. The agent must **not** duplicate, rewrite, or refactor these foundations unless explicitly instructed in later waves.

### Core AAA Engine
- `lib/game-loop.ts` — Fixed-timestep accumulator + frame budget
- `lib/geometry/nanite-streaming-controller.ts` + `nanite-cull.wgsl`
- `lib/render/lumen-gi.ts` — SDF-based real-time GI
- `lib/material/procedural-material.ts` — WGSL shader graph compiler
- `lib/physics/chaos-destruction.ts` + `lib/physics/cloth-hair.ts`
- `lib/characters/` — creature-rigging, swarm-system, facial-animation, clothing-layering, ai-character-generator, auto-rigging, ai-animation (CCD-IK)
- `lib/world/orchestrator.ts` + `world-blueprint.ts`
- `lib/cinematic/sequencer.ts` + `lib/vfx/vfx-graph.ts`
- `lib/audio/ai-adaptive-music.ts`
- `lib/geometry/topology-repair-pass.ts`
- `lib/ai/byok-client-proxy.ts` (AES-256-GCM + usage auditing)
- `lib/plugins/plugin-sandbox-hardened.ts`
- `lib/observability/telemetry.ts`
- `app/api/admin/system/kill-switch/route.ts`
- `components/editor/VisualLoopDebugger.tsx`
- `components/visual-scripting/VisualScriptCompiler.ts` (GeneratorFunction pattern)

### Platform & Legal
- Legal pages: `/terms`, `/privacy`, `/dmca`, `/ai-content-license`
- `app/api/gdpr/delete/route.ts` + `app/settings/privacy/page.tsx`
- `vercel.json`, `Dockerfile`, `render.yaml`, `.github/workflows/ci.yml`
- `scripts/backup-db.sh`, `scripts/restore-db.sh`, `scripts/secrets-vault-sync.sh`
- `lib/moderation/content-moderator.ts` + `lib/moderation/vision-provider.ts`
- `lib/export/gltf-exporter.ts` (basic version)
- `app/marketplace/creator/payout-setup/page.tsx` + Stripe onboarding route
- `lib/gameplay/` — gameplay-orchestrator, gameplay-blueprint, ability-graph-compiler, ability-node-catalog, combat-system-generator, progression-blueprint, ai-behavior-generator, playtest-agent, gameplay-reflection-loop, narrative-to-mechanic, mechanic-diversity
- `lib/ai/style-fine-tuning-loop.ts`
- `lib/geometry/hero-topology-repair.ts` + `lib/geometry/zoom-fidelity-pass.ts`
- `lib/multiplayer/dynamic-sync-layer.ts`

**Rule**: Any file or system not listed above is either missing or incomplete and must be built according to the waves below.

---

## 2. Critical Market & User Constraints (Non-Negotiable)

These constraints come from deep competitive analysis and real user risk. They must be respected in every implementation.

### 2.1 Visual Scripting Offline Merge (Highest Risk)
**Problem**: Yjs CRDT automatic merge on node graphs frequently produces broken states (overlapping nodes, dangling connections, destroyed hierarchies).

**Mandatory Rule**:
- Never apply automatic Yjs merge when visual conflicts are detected.
- Implement a **visual conflict detector + side-by-side resolution UI**.
- User must explicitly choose which version of each node/edge to keep.
- Default Yjs merge is only allowed on non-visual data (comments, metadata).

**Prejudice if ignored**: Users lose hours of work silently. This is one of the fastest ways to destroy trust in the collaboration feature.

### 2.2 Local AI Co-Processor Scope (Massively Underestimated)
**Reality**: Building a stable WebLLM co-processor with VRAM Guard, priority scheduler with cancellation, KV cache management, weekly fine-tuning pipeline, and CDN weight sync is **not** a feature — it is a 4–6 week project.

**Mandatory Rule**:
- Treat Phase 6 (Local AI) as a first-class major subsystem.
- Do not cut corners on VRAM Guard or task cancellation.
- If time is limited, implement the worker + scheduler + VRAM Guard first, and leave the fine-tuning pipeline as a documented stub with clear TODOs.

**Prejudice if ignored**: Aethel loses its biggest potential differentiator against Cursor and other AI-native tools.

### 2.3 Cost Transparency & User Protection
**Mandatory Features**:
- Cost Guard must show **projected spend** before generation starts.
- Must have "Economy Mode" that automatically routes to cheaper models when approaching daily limit.
- Must have email + in-app alerts at 50%, 80%, and 100% of daily budget.

**Prejudice if ignored**: Users receive surprise bills. This has already destroyed multiple AI tools in the market.

### 2.4 Export Fidelity for Real AAA Production
**Mandatory**:
- GLTF/USD exporter must preserve:
  - Nanite cluster hierarchy + LOD error metrics
  - Procedural material graphs mapped to USD shading nodes
  - Non-humanoid rigs with custom IK chains
  - Facial blendshapes + viseme data
- Exported assets must open in Unreal 5.5 and Unity 6 with materials and rigs intact (zero manual fix required for basic cases).

**Prejudice if ignored**: Studios will treat Aethel as "prototyping only" and never adopt it for final production.

### 2.5 Performance on Mid-Range Hardware
**Mandatory**:
- All heavy systems (Nanite + Lumen + Cloth + Swarm + Local AI) must gracefully degrade.
- VRAM Guard must be conservative by default (trigger at 35 FPS sustained for 5 seconds).
- User must have a "Performance Profile" setting: Quality / Balanced / Performance.

---

## 3. Master Execution Waves (Execute in This Exact Order)

### Wave 0 — Preparation & Baselining (Mandatory First Step)

1. Run `npx prisma migrate deploy` and capture the exact error.
2. Query the `_prisma_migrations` table and list all applied migrations.
3. Confirm the `User` model contains `stripeConnectAccountId`.
4. Document results in a temporary file `WAVE0_RESULTS.md`.

Only proceed after this step is complete.

---

### Wave 1 — Production Hardening (Non-Negotiable for Launch)

#### 1.1 Redis-Backed Cost Guard

**File**: `lib/observability/cost-guard.ts`

> **⚠️ CORRECTION (2026-07-03)**: this task is smaller than it reads. `@upstash/redis@^1.34.3` is
> **already a declared dependency** in `web/package.json` — nothing to install. `lib/redis-cache.ts`
> **already exists** as a mature Redis-with-fallback abstraction (`ioredis` lazy-loaded via
> `loadIORedis()`, `MemoryCache` fallback, `createCachedDecorator`) sitting unused by this file.
> There is also a second, previously uncatalogued fake-Redis component at
> `packages/engine/services/RedisLedgerClient.ts` (`RedisLedgerClient.reportTokenUsage` accumulates
> in a static in-memory counter; its Postgres sync path has the actual `prisma.user.update(...)`
> call **commented out**, so it never persists) — fix both in the same pass, they are the same bug.

**Requirements**:
- Replace `memStore` with `@upstash/redis` (preferred) or the existing `lib/redis-cache.ts` if its interface can be extended with atomic increment support.
- Use atomic `hincrby` + `expire` for daily spend keys (or a Lua script for the token-bucket check, since a plain `hincrby` doesn't enforce the "never exceed" invariant under concurrent requests — decide explicitly and document the choice).
- Add method `getProjectedSpend(estimatedCost: number): Promise<{allowed: boolean, remaining: number, willExceed: boolean}>`.
- Add "Economy Mode" flag that routes to cheaper models.
- Add alert thresholds (50/80/100%) that call a new `alertUser` function (stub for now).
- Keep in-memory fallback only when `REDIS_URL` is not set.
- **New sub-task not in the original scope**: destroy or rewire `packages/engine/services/RedisLedgerClient.ts` — do not leave a second, differently-broken financial ledger component unaddressed while fixing this one.

#### 1.2 Mount VisualLoopDebugger in Viewport

**File**: `components/viewport/AethelViewport3D.tsx` (or the main viewport component)

- Import and render `<VisualLoopDebugger />` as an overlay in the top-right corner.
- Pass correct props: `sceneStats`, `frameBudget`, `entityCount`, `drawCalls`.

#### 1.3 Prisma Migration Baselining & Deploy

- Execute the correct `prisma migrate resolve --applied` commands based on Wave 0 results.
- Run `npx prisma migrate deploy`.
- Verify no data loss and that all new tables (if any) were created.

---

### Wave 2 — Offline Visual Scripting Merge (Critical User Protection)

**New Files**:
- `lib/collaboration/visual-merge.ts`
- `components/collaboration/VisualMergeConflictModal.tsx`

**Requirements**:
- Create a visual conflict detector that compares node positions, edge connections, and group hierarchies between local (IndexedDB) and remote Yjs documents.
- If any conflict is detected, **block automatic merge**.
- Show a modal with two side-by-side visual script editors (local vs remote).
- Allow per-node and per-edge selection.
- Generate a merged document only after user confirmation.
- Log all merge decisions to telemetry.

**Integration**:
- Modify the collaboration hook / `websocket-server.ts` client logic to use `y-indexeddb`
  (**correction 2026-07-03**: `y-indexeddb@^9.0.12` is already an installed dependency — this is a
  wiring task, not a new-dependency task. Also note `lib/server/websocket-server.ts` itself is
  already split into 10 sub-modules — `websocket-server-collaboration.ts` is almost certainly the
  correct integration point, verify before assuming the monolithic file still holds this logic).
- Call the visual merge function before applying remote state on reconnection.

---

### Wave 3 — ECS Interpreter with Generator Flattening

**New File**: `lib/engine/ecs-interpreter.ts`

**Requirements**:
- Accept a `GeneratorFunction` produced by `VisualScriptCompiler`.
- Execute the generator **once** at compile time and convert the yielded instructions into a static, flat array of executable steps.
- Register this array as a system in the main game loop.
- The system must execute without creating new generator frames every tick (zero GC pressure).

**Constraint**: Do not run live generators inside the 60 FPS tick loop.

---

### Wave 4 — UI Dashboards

#### 4.1 Playtest Dashboard

**New File**: `app/admin/playtest/page.tsx`

**Requirements**:
- Display list of `PlaytestAgent` runs with:
  - Average TTK, deaths, economy health, balance issues, reachable vs unreachable areas
- Simple charts (use recharts or similar) for TTK over time and gold economy.
- Allow triggering a new playtest run from the UI.

#### 4.2 Security & BYOK Management Page

**New File**: `app/settings/security/page.tsx`

**Requirements**:
- List all BYOK keys with last rotation date and usage stats.
- "Rotate Key" button that invalidates the old key and generates a new one (call new backend route).
- Display cryptographic signature verification status.
- Show cost ledger for the last 30 days.

**New Route**: `app/api/user/byok/rotate/route.ts` (implement key rotation logic).

---

### Wave 5 — Advanced GLTF/USD Exporter

**File**: `lib/export/gltf-exporter.ts`

**Requirements**:
- Extend exporter to include in `extras`:
  - `aethel_nanite_clusters` (array of cluster metadata)
  - `aethel_material_graph` (serialized WGSL node graph)
- Generate `.usda` file with proper USD shading node mapping for procedural materials.
- Ensure non-humanoid rigs and facial blendshapes are correctly exported.
- Test that exported assets open cleanly in Unreal 5.5 and Unity 6.

---

### Wave 6 — Local AI Co-Processor (WebLLM) — Full Implementation

This wave is intentionally placed late because it is the heaviest. Execute with full attention.

#### 6.1 Web Worker

**New File**: `lib/workers/coprocessor.worker.ts`

- Initialize `@mlc-ai/web-llm` engine inside the worker.
- Support messages: `init`, `generate`, `clearKVCache`, `unload`.
- Never block the main thread.

#### 6.2 Priority Scheduler + Cancellation

**New File**: `lib/ai/coprocessor-scheduler.ts`

- Implement a priority queue:
  - Priority 1: Linter / self-correction (highest)
  - Priority 2: CLI error diagnostics
  - Priority 3: Visual script node suggestions
  - Priority 4: Inline autocomplete (lowest)
- When a higher priority task arrives, **cancel** any running lower priority generation.
- After every stateless generation, call `clearKVCache()`.

#### 6.3 VRAM Guard

**New File**: `lib/ai/vram-guard.ts`

- Monitor viewport FPS via `requestAnimationFrame`.
- If average FPS over last 30 frames < 35 for 5+ seconds → send `unload` to worker.
- Provide conservative default. Allow user override via settings.
- Auto-reload model when FPS stabilizes above 45 for 10 seconds (only if user is in code tab).

#### 6.4 Client Interface

**New File**: `lib/ai/local-coprocessor.ts`

- Boot the worker.
- Query `/api/ai/model-registry` for latest weights.
- Download and apply weight updates asynchronously.
- Expose clean API: `suggestNode`, `explainError`, `compressPrompt`.

#### 6.5 Model Registry Route (Stub)

**New File**: `app/api/ai/model-registry/route.ts`

- Return current model version + CDN URL for weights.
- For now, return a static response (real pipeline can be added later).

#### 6.6 Dataset Aggregator & Model Tuner (Documented Stubs)

**New Files** (with clear TODO comments):
- `lib/ai/training/dataset-aggregator.ts`
- `lib/ai/training/model-tuner.ts`

Include detailed comments explaining the weekly cron flow, PII stripping, 4-bit quantization, and CDN publishing.

---

### Wave 7 — Final Verification Protocol (Mandatory)

Execute **exactly** in this order and document every result:

```bash
# 1. Database
npx prisma migrate deploy

# 2. Type Safety
npm run typecheck

# 3. Tests
npx vitest run

# 4. Enterprise Quality Gate
npm run qa:enterprise-gate

# 5. Production Build
npm run build
```

Create a file `FINAL_VERIFICATION_RESULTS.md` with the output of each command.

Only after all five commands succeed without critical errors is the round considered complete.

---

## 4. Explicit Risk Mitigations (Must Be Implemented)

| Risk | Mitigation (Must Code) |
|------|------------------------|
| VRAM Guard false positive | Add `performanceProfile` setting with "Conservative / Balanced / Aggressive" modes |
| Visual script merge destroying work | Never auto-merge on visual conflict. Always show side-by-side UI |
| Local AI blocking main thread | Everything runs in Web Worker. Main thread only sends/receives messages |
| User surprise bills | Projected spend + Economy Mode + 50/80/100% alerts |
| Export breaking in Unreal/Unity | Test with actual Unreal 5.5 and Unity 6 projects before considering done |
| Generator GC pressure in 60 FPS loop | Always flatten to static arrays at compile time |

---

## 5. Final Notes for the Executing Agent

- This document is exhaustive. Do not ask for clarification.
- When in doubt between two approaches, choose the one that protects user data, time, and money first.
- Performance and stability on mid-range hardware is more important than maximum visual quality.
- Every new file must be type-safe and pass `npm run typecheck`.
- All user-facing features must include telemetry events.

**End of Master Execution Plan v7**

This is the complete, single-round specification. Execute in the order defined. No shortcuts. No partial implementations.