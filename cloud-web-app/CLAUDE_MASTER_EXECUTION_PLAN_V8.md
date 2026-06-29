# Aethel Engine — Master Execution Plan v8 (Grounded)
## Best-in-Market Execution Specification — Web + Desktop, Shared UI, Native Power

**Purpose**: This is the definitive execution plan for the next agent. It is grounded in the *actual* state of the repository (verified file-by-file, not assumed). It delivers a production-ready, market-leading product across **Web** and **Desktop (Aethel Studio)** with one shared high-quality IDE experience, a genuinely native and robust Desktop engine, real billing, and enterprise compliance — with **no partial or simplified implementations**.

**Date**: June 27, 2026
**Status**: Final. Supersedes all previous versions.

> **Honesty clause**: This plan is explicitly **multi-round**. Anyone who claims it can be done in "one round" will produce shallow stubs. Each Round below has its own Definition of Done and gate. Do not start a Round before the previous gate passes.

---

## 0. Verified Ground Truth (Confirmed in Code — Do Not Re-Discover)

These facts were verified directly in the repo on this date by enumerating the source tree: **~1,355 files under `web/lib/`**, **412 API routes under `web/app/api/`**, **69 pages under `web/app/`**, **91 IDE panels under `web/components/ide/`**, and **1 Rust file** (`src-tauri/src/main.rs`). The next agent must trust this inventory, must NOT rebuild any of it, and must only extend/wire/harden as specified in the Rounds.

> **Reality**: The Web is not a prototype — it is a near-complete AAA engine + SaaS platform. The actual gaps are: (a) wiring presentational panels to the real engine, (b) productionizing half-real subsystems (billing, cost guard, moderation), (c) broad infra/security hardening, and (d) the Desktop native engine (greenfield). Do not mistake "needs wiring/hardening" for "needs building from scratch."

### 0.A Rendering & Graphics — EXISTS (extensive, dual-path)
- **Dual renderer**: Three.js path (`lib/aaa-renderer-impl.ts`, `lib/engine/renderer/DeferredRenderer.ts`) **and** a native-WebGPU path (`lib/engine/renderer/WebGPUContext.ts`, `WebGPUDeviceManager.ts`, `ParticleComputeSystem.ts`).
- **Nanite (virtualized geometry)**: `lib/nanite-virtualized-geometry.ts`, `lib/nanite-meshlet-builder.ts`, `lib/nanite-virtualized-geometry-renderers.ts`, `lib/engine/geometry/MeshletBuilder.ts`, `lib/geometry/nanite-streaming-controller.ts`.
- **Lumen-equivalent GI**: `lib/render/lumen-gi.ts`.
- **PBR pipeline (complete)**: `lib/pbr-material-runtime.ts`, `pbr-shader-pipeline.contracts.ts`, `pbr-shader-hot-reload.ts`, `pbr-shadow-runtime.ts`, `pbr-brdf-lut.ts`, `pbr-post-process-pipeline.ts`, `aaa-material-system*.ts`, `lib/material/procedural-material.ts`, `lib/engine/shaders/MaterialCompiler.ts` + `ShaderSecurityParser.ts`.
- **Ray tracing**: `lib/ray-tracing.ts`, `lib/ray-tracing-bvh.ts`.
- **LOD**: `lib/engine/lod/auto-lod-pipeline.ts` (+ analysis/config/types, tests), `lib/engine/graphics/lod-manager.ts`, `lib/engine/scene-graph-instanced-lod.ts`.
- **Post-process / foliage / particles**: `lib/post-process-volume.manager.ts` (+ presets/contracts), `lib/foliage-instancing.ts`, `lib/particle-system-real.ts`, `lib/engine/systems/ParticleSystem.ts`, `lib/engine/NiagaraParticleEmitter.runtime.ts`.

### 0.B Engine Core / ECS / Scene Graph — EXISTS
- **ECS**: `lib/game-engine-core.ts`, `game-engine-systems.ts`, `game-engine-scripting.ts`.
- **Game loop + frame budget**: `lib/game-loop.ts`, `lib/runtime/frame-budget.ts`.
- **Scene graph (full)**: `lib/engine/scene-graph*.ts` (manager, node, scene, components, three bridge, contracts, loading, transform, `useSceneGraph`, `useSceneDigest`).
- **Asset pipeline (full)**: `lib/engine/asset-pipeline-runtime/` (loaders, manifest, manager, importer, cache, types), `lib/asset-import-pipeline.ts`, **content browser** `lib/assets/content-browser-loader.ts`.
- **Blueprint system / decals**: `lib/blueprint-system.ts`, `lib/decal-system-geometry.ts`.
- **File watching + hot reload (web)**: `lib/server/file-watcher-runtime.ts`, `lib/hot-reload/hot-reload-server.ts`.
- **Raycast/picking**: `lib/engine/systems/RaycastSystem.ts`. **WASM runtime**: `lib/wasm-runtime.ts`.

### 0.C Physics & Simulation — EXISTS
- `lib/physics-engine-real.ts` (Rapier WASM), `lib/engine/physics-*` (body, colliders, collision, math, engine, multiverse-manager), `lib/physics/chaos-destruction.ts`, `lib/physics/cloth-hair.ts`, `lib/physics/fluid-simulation-core.ts` + `FluidSimulationEditor.runtime.tsx` (fluid/SPH), `lib/destruction-fragment-runtime.ts` / `-factory.ts` / `destruction-damage-runtime.ts`, `lib/engine/reality-stream-manager.ts`, `lib/engine/chrono-manager.ts`.

### 0.D Characters & Animation — EXISTS
- `lib/characters/ai-character-generator.ts`, `auto-rigging.ts`, `ai-animation.ts` (CCD-IK), `creature-rigging.ts`, `swarm-system.ts`, `facial-animation.ts`, `clothing-layering.ts`.

### 0.E Gameplay Generation — EXISTS
- `lib/gameplay/` (orchestrator, blueprint, ability-graph-compiler, ability-node-catalog, combat-system-generator, progression-blueprint, ai-behavior-generator (GOAP), gameplay-reflection-loop, narrative-to-mechanic, mechanic-diversity, playtest-agent).
- **GAS (Gameplay Ability System)**: `lib/gameplay-ability-system.ts`, `gameplay-ability-component.ts`, `gameplay-ability-contracts.ts`, `gameplay-attributes.ts`.

### 0.F World Generation & Persistence — EXISTS
- `lib/world/orchestrator.ts`, `world-blueprint.ts`, `lib/memory/world-memory-bank.ts`, `lib/persistence/world-repository.ts`, `lib/collaboration/world-branch.ts`, `lib/agents/reflection-loop.ts`.

### 0.G Audio — EXISTS
- `lib/audio/spatial-audio-system.ts`, `ai-soundscape-generator.ts`, `ai-adaptive-music.ts`, `lib/engine/audio-manager*.ts`, `audio-group.ts`, `audio-source.ts`, `reverb-effect.ts`, `lib/sound/synth.ts`.

### 0.H Cinematic & VFX — EXISTS
- `lib/cinematic/sequencer.ts`, `lib/vfx/vfx-graph.ts`, `lib/engine/NiagaraVFX.types.ts`.

### 0.I Networking & Multiplayer — EXISTS
- `lib/networking-multiplayer.ts`, `networking-netcode.ts`, `networking-config.ts`, `lib/networking/rollback-netcode-manager.ts`, `lib/multiplayer/dynamic-sync-layer.ts`, `lib/engine/network/WebRTCOracle.ts`.

### 0.J IDE UI + Editor Backend — EXISTS (UI presentational, not yet wired)
- **91 panels** in `web/components/ide/` (`ModernIDEShell`, `Outliner3D`, `PropertiesPanel3D`, `AIChatPanelPro`, `FileExplorerPro`, `DebugPanel`, `ConsoleIntegration`, `GitIntegration`, `CommandPalette`, `MonacoChatDiffPanel`, `InlineCompletion`, `PreviewRuntime*`, etc.).
- Panels are **prop-driven presentational components** (e.g. `Outliner3D` takes `nodes`+callbacks, falls back to `defaultNodes` mock). **None import Three.js** → already engine-agnostic, but **not yet bound to the real engine** (fed by mocks).
- **Monaco LSP backend EXISTS**: `lib/monaco-lsp-http.ts` (+ converters), `lib/monaco-lsp-bridge.providers.ts` / `.converters.ts`.
- **Terminal backend EXISTS (web)**: API routes `api/terminal/{create,input,resize,kill,execute,close,action,sandbox}`.
- **Test runner / tasks backend EXISTS**: `api/test/{run,discover}`, `api/tasks/{load,detect}`, `api/studio/tasks/{plan,run-wave,[id]/{run,validate,rollback}}`.
- **App pages (69)** including `app/ide`, `app/studio/{level,film,vfx,animation,quest}`, marketplace, billing, admin, docs, legal, etc.

### 0.K AI Infrastructure — EXISTS
- `lib/ai-service.ts` (+ contracts), `lib/ai/intelligent-model-router.ts`, `advanced-ai-provider.ts` (+ normalizers), `lib/ai/agent-llm-bridge.ts`, `lib/ai-agent-system.ts`, `lib/agent-orchestrator.ts`, `lib/agents/runtime/orchestrator.ts`, `lib/server/ai-director/service.ts`, `lib/ai-trace-store.ts`, `lib/ai-tools-registry*.ts`, `lib/ai-web-tools.ts`, `lib/ai-ledger-redis.ts`.
- **BYOK vault**: `lib/ai/byok-client-proxy.ts` (AES-256-GCM). **Local inference**: `lib/ai/local-inference-manager.ts` (WebLLM, browser WebGPU only).
- **Generative content (CLOUD-dependent)**: `lib/ai-content-generation.ts`, `lib/ai-content-generation-mesh.ts`, `lib/ai/style-fine-tuning-loop.ts`, `lib/geometry/{topology-repair-pass,hero-topology-repair}.ts` — text/image→mesh routes to external models (Meshy/Tripo/Replicate-class). **This is the offline gap (see §6 P0).**
- **Production/orchestration layer**: `lib/production/*` (repository cartography, agent workforce topology, multi-resolution project memory, engine module integration plan, internal runtime governance).
- AI API routes: `api/ai/{chat,stream,complete,query,models/registry,voice/realtime-session}`, `api/agents/stream`.

### 0.L Marketplace, Billing & Metering — EXISTS (billing half-real)
- `lib/credit-wallet.ts` (+ costs/legacy), `lib/metering.ts`, `lib/plan-limits.ts`, `lib/plans.ts`, `lib/entitlements.ts`, `lib/storage-enforcement.ts`, `lib/marketplace/{payouts,provenance}.ts`, `lib/server/stripe-connect`.
- API: `api/wallet/{summary,transactions,purchase,purchase-intent}`, `api/billing/credits`, `api/marketplace/{stripe/onboard,creator/earnings}`.
- **Half-real**: `payouts.ts#getCreatorEarningsSummary` **simulates** transactions from `item.downloads` (fake `buyerEmail`, derived dates). Stripe account lookup is real.

### 0.M Security, Permissions & Compliance — EXISTS
- `lib/permissions.*` (roles, plans, parsers, types — RBAC), `lib/security/saml-acs.ts` (SAML hardening), `lib/plugins/plugin-sandbox-hardened.ts`, `lib/plugin/plugin-manifest-validator.ts`, `lib/plugin-system.ts`, `lib/plugins/plugin-system-sandbox.ts`.
- **Legal pages EXIST**: `app/(legal)/{terms,privacy,dmca,ai-content-license}`, `app/settings/privacy`, `api/gdpr/delete`, `api/user/{export,delete}`.
- Auth: `api/auth/{me,profile,saml/acs,oauth/*}`.

### 0.N Observability & Ops — EXISTS
- `lib/observability/telemetry.ts`, `lib/observability/cost-guard.ts` (**in-memory** — not Redis), `lib/analytics*.ts`, `lib/redis-cache.ts` (+ decorator), `lib/emergency-mode.ts`, `lib/production/internal-runtime-governance.ts`, `lib/queue-system.ts` (+ runtime/types).
- API: `api/{system/health,system-health,telemetry/event,usage/status,admin/system/kill-switch,admin/moderation/queue}`.

### 0.O Extensibility, XR, Export — EXISTS
- **WebXR/VR**: `lib/webxr-vr-system-core.ts`. **Plugins**: hardened sandbox + manifest validator + extension host loader (`lib/server/extension-host-runtime-loader.ts`).
- **Export**: `lib/export/gltf-exporter.ts`, API `api/exports/{glb,usdz,wav,mp4,project}`.
- **Render farm**: `api/render/jobs/*` (+ cancel/artifact), `lib/render-farm/`.
- **Desktop update endpoint**: `api/desktop/update/route.ts`, `lib/studio-local/release-manifest.ts`.

### 0.P Desktop (Aethel Studio) — EMPTY STUB (the real greenfield)
- `src-tauri/src/main.rs` = **32 lines**: one `wgpu_execute(command_buffer_id)` that only `println!`. No rendering, PTY, FS watcher, job queue, or ML. Exactly **one** `.rs` file exists.
- `src-tauri/tauri.conf.json` security gaps: `security.csp: null`, `fs.scope: ["$APP/*", "**"]` (full FS), `transparent:true`+`decorations:false`, **no updater config**, **no signing**, `distDir: "../web/out"` (static export).
- **Implication**: "Make Desktop more robust than Web" = write a native Rust engine from scratch (Round 3). This is the single largest body of work and is its own multi-phase program.

### 0.Q Cross-cutting facts that drive the Rounds
- **No monorepo**: no `packages/`, `turbo.json`, or `pnpm-workspace.yaml`. "Shared packages" is real setup work, not a rename.
- **Rate limiting** exists only on AI core (`enforceAiCoreRateLimit`); exports/uploads/render/marketplace/publish are unprotected.
- **Cost guard** is in-memory → resets on restart, per-instance (not safe for prod).
- **WebLLM local inference cannot become native** by extension — the native ML path is a separate impl behind the same interface.

---

## 0.R Definitive Remaining-Work Matrix (Per Domain — Nothing Partial)

For every domain that EXISTS above, this is the *exact* remaining work to reach best-in-market production quality. "Wire" = connect existing UI/logic to existing backend. "Harden" = make production-safe. "Build" = does not exist.

| # | Domain | What Exists | Remaining Work | Type | Round |
|---|--------|-------------|----------------|------|-------|
| 1 | IDE panels ↔ engine | 91 presentational panels + real engine in `lib/engine` | Define `IIDEBackend`; implement `WebIDEBackend`; bind Outliner/Properties/Viewport/Files to real scene graph (remove `defaultNodes` mocks) | Wire | R1 |
| 2 | Monaco LSP | HTTP bridge + providers | Wire into the editor panel end-to-end (diagnostics, completion, hover, go-to-def) and verify in `app/ide` | Wire | R1 |
| 3 | Terminal | `api/terminal/*` web backend | Bind to `ConsoleIntegration` via `TerminalService`; on Desktop, back it with native PTY | Wire+Build | R1/R3 |
| 4 | Render farm / jobs | `api/render/jobs/*`, `lib/render-farm` | Bind `RenderQueueDashboard` to `JobService`; add broad rate limiting; Desktop native job queue | Wire+Harden | R1/R3 |
| 5 | Cost guard | in-memory | Replace with Upstash Redis; projected spend, Economy Mode, alerts 50/80/100% | Harden | R1 |
| 6 | Rate limiting | AI core only | Extend to exports, uploads, render, marketplace, publish | Harden | R1 |
| 7 | Local AI co-processor | WebLLM manager | Web Worker + scheduler + VRAM guard + client interface (non-blocking) | Build | R1 |
| 8 | Export (GLB/USD) | basic exporter + routes | Preserve Nanite clusters, material graphs, non-humanoid rigs, facial blendshapes; round-trip test in Unreal/Unity/Godot | Harden | R1 |
| 9 | Visual scripting merge | compiler + Yjs | Side-by-side conflict resolution UI; never auto-merge; `y-indexeddb` | Build | R1 |
| 10 | BYOK management | AES vault | Settings page with real key rotation + usage auditing | Wire+Harden | R1 |
| 11 | Billing/payouts | account real, txns simulated | Real `Transaction` ledger; Stripe webhooks; disputes/chargebacks; royalty split; KYC gate before listing | Harden | R2 |
| 12 | Moderation | local stub + vision adapters | Wire real vision API; DB-backed admin queue with immutable approve/reject reason logs | Harden | R2 |
| 13 | Security/compliance | RBAC, SAML, legal pages, GDPR API | Immutable admin impersonation audit; data residency; session hardening; legal review; CSP set; Tauri `fs` scope tightened | Harden | R2/R3 |
| 14 | Observability | telemetry, kill switch, analytics | Sentry releases+perf+alerts; OpenTelemetry traces; verify backup/restore; secrets via Doppler/Vault | Harden | R2 |
| 15 | Networking/multiplayer | netcode + rollback + WebRTC | Determinism parity (Web vs Desktop); production signaling/relay; load test | Harden | R2/R3 |
| 16 | WebXR/VR | `webxr-vr-system-core` | Export bindings + session entry from viewport; device test | Wire | R2 |
| 17 | Plugins | hardened sandbox + manifest | Registry UI + install/permission consent flow + egress allowlist enforcement | Harden | R2 |
| 18 | Desktop shell | 32-line stub | Tauri hardening + binary IPC channel (replace no-op `wgpu_execute`) | Build | R3 |
| 19 | Desktop renderer | WebGPU TS path exists (web) | Native Rust WGPU renderer with parity (device→render graph→mesh/material→Nanite→Lumen→picking) | Build | R3 |
| 20 | Desktop subsystems | none | Native PTY, FS watcher, persistent job queue, native ML (candle/llama.cpp), toolchain probes | Build | R3 |
| 21 | Desktop distribution | update endpoint exists | Signed auto-update + Windows EV signing + macOS notarization | Build | R3 |
| 22 | Web↔Desktop sync | shared schema (partial) | Proxy assets (`full`+`webProxy`); heavy-compute routing; bidirectional project sync | Build | R3 |

> If a domain is not in this matrix, it is considered **done** and must not be touched except to fix regressions.

---

## 1. Architecture (Locked Decisions)

### 1.1 Shared UI + Pluggable Backends — defined precisely
The "interface" the UI consumes is **not yet written**. Round 1 creates it by *deriving it from the existing prop contracts* of the 91 panels.

```
@aethel/ide-ui  (the 91 presentational panels, moved as-is)
        │  consumes
        ▼
IIDEBackend     (interface derived from existing panel props)
   ├── SceneService     → nodes, selection, transforms, visibility   (feeds Outliner3D, PropertiesPanel3D)
   ├── ViewportService  → render surface, camera, picking            (feeds the viewport)
   ├── FileService      → tree, read/write, watch                    (feeds FileExplorerPro)
   ├── TerminalService  → spawn/write/resize/kill PTY                (feeds ConsoleIntegration)
   ├── JobService       → enqueue/poll heavy jobs                    (feeds RenderQueueDashboard)
   ├── InferenceService → chat/completion/embeddings                 (feeds AIChatPanelPro)
   ├── ScriptService    → compile/run visual scripts                 (feeds visual scripting)
   └── ExportService    → GLB/USDZ/WAV/MP4                            (feeds export UI)

WebIDEBackend     implements IIDEBackend using lib/engine (Three.js DeferredRenderer),
                  WebSockets, lib/ai/local-inference-manager (WebLLM), browser FS shims.

NativeIDEBackend  implements IIDEBackend using Rust: WGPU renderer, portable-pty,
                  native job queue, candle/llama.cpp, real filesystem.
```

**Rule**: The user sees the identical interface; only the backend changes. The Desktop's robustness comes from `NativeIDEBackend`, never from forking the UI.

### 1.2 Web↔Desktop data & asset strategy (was missing — now mandatory)
- **Source of truth**: project/world graph stored as portable JSON in Postgres + object storage; same schema for both platforms.
- **Proxy assets**: heavy native artifacts (full Nanite cluster binaries, 8K bakes) generated on Desktop get a **lightweight Web proxy** (decimated LOD + compressed textures) so the Web viewport can display the same scene without the native payload. Define `AssetVariant { full, webProxy }` and always produce both.
- **Determinism contract**: physics must produce identical results across Rapier-WASM (Web) and Rapier-native (Desktop) for the same seed + fixed timestep. Add a cross-platform determinism test (golden hashes of simulation state).

### 1.3 IPC strategy (was missing — now mandatory)
- Per-frame `invoke()` is forbidden (serialization overhead kills 60fps).
- Viewport state (camera, transforms, visibility) flows over a **binary shared channel**: `SharedArrayBuffer` where the WebView supports it, otherwise a length-prefixed binary IPC ring buffer. The `wgpu_execute` stub's comment already anticipates this — implement it for real.
- Control/RPC (file ops, job enqueue, chat) uses normal Tauri Commands (latency-tolerant).

### 1.4 Offline visual-scripting merge
- Automatic Yjs merge on node graphs is **forbidden**. Conflicts must surface a **side-by-side resolution UI**; the user explicitly resolves. Persist offline via `y-indexeddb`.

---

## 2. Rounds, Gates & Definition of Done

> Execute Rounds strictly in order. A Round is "done" only when its gate passes and its results doc is written.

| Round | Theme | Gate (must all pass) |
|-------|-------|----------------------|
| **R1** | Web hardening + Backend abstraction + Monorepo | typecheck, vitest, build green; IDE panels run on `WebIDEBackend` (no mock defaults in app); Redis cost guard live; broad rate limiting live |
| **R2** | Real billing, compliance, infra, security | Real ledger + Stripe webhooks; rate limiting on all sensitive routes; immutable admin audit; backup/restore verified; Sentry releases+perf; CSP set |
| **R3** | Native Desktop engine (multi-phase) | Each sub-phase R3.x has its own gate (below); final: signed auto-update on Win+macOS, PTY, native ML, native viewport parity, Web↔Desktop sync |

---

## Round 1 — Web Excellence + Backend Abstraction + Monorepo

### R1.0 Preparation & Inventory (mandatory, write `WAVE0_INVENTORY.md`)
1. Run `npx prisma migrate deploy`; capture exact output.
2. Inventory shared-extractable logic: `lib/runtime/*`, `components/visual-scripting/*`, `lib/export/*`, `lib/gameplay/*`, `lib/engine/*`, `lib/agents/*`.
3. Confirm `stripeConnectAccountId` field + current earnings path (`payouts.ts`).
4. List every IDE panel and its **prop contract** (this becomes the source for `IIDEBackend`).

### R1.1 Monorepo foundation
- Stand up workspace tooling (pnpm workspaces + Turborepo, or npm workspaces if pnpm is not desired). Create `packages/`.
- Create packages and migrate code **without behavior changes**:
  - `@aethel/runtime` — contracts, frame budget, tool registry, execution spine
  - `@aethel/visual-scripting` — compiler, node catalog, ability graph compiler, ECS interpreter
  - `@aethel/export` — pipeline spine + GLB/USDZ/WAV/MP4 handlers
  - `@aethel/gameplay` — orchestrator, blueprints, combat, progression, reflection, GOAP, diversity, playtest
  - `@aethel/agents` — runtime agents, evaluators, receipts
  - `@aethel/engine` — Web engine core (DeferredRenderer, scene graph, raycast, game-loop) **as the Web backend impl detail**
  - `@aethel/ide-ui` — the 91 presentational panels, moved verbatim
- Gate sub-check: `web` builds consuming the packages; no circular imports; no Next.js-only imports leaking into framework-agnostic packages.

### R1.2 Define `IIDEBackend` + implement `WebIDEBackend` and WIRE the UI
- Derive `IIDEBackend` (the services in §1.1) from the panel prop contracts collected in R1.0.
- Implement `WebIDEBackend`:
  - `SceneService`/`ViewportService` → bind to `lib/engine` (`DeferredRenderer`, `ViewportSceneCanvas.runtime`, scene graph). **Outliner3D/PropertiesPanel3D must show real scene nodes, not `defaultNodes`.**
  - `FileService` → existing `api/workspace/{tree,files,create}` APIs.
  - `TerminalService` → existing `api/terminal/{create,input,resize,kill}` backend (already exists — just bind `ConsoleIntegration` to it).
  - `JobService` → existing render-farm dispatcher (`api/render/jobs/*`).
  - `InferenceService` → `local-inference-manager` (WebLLM) + `intelligent-model-router` cloud path.
  - Editor `ScriptService` also wires `monaco-lsp-http` (LSP bridge already exists) for diagnostics/completion/hover.
  - `ScriptService` → `@aethel/visual-scripting` compiler.
  - `ExportService` → `@aethel/export`.
- **Acceptance**: Launch the Web IDE; every panel reflects real backend state; removing `defaultNodes` mocks does not break the app.

### R1.3 Redis-backed cost guard + broad rate limiting
- Replace in-memory cost guard with Upstash Redis: per-user + global daily caps, projected spend, Economy Mode, proactive alerts at 50/80/100%.
- Apply rate limiting to **all** sensitive routes: AI core, exports (GLB/USDZ/WAV/MP4), uploads, render jobs, marketplace actions, publishing.

### R1.4 Web AAA completion
- Local AI Co-Processor: Web Worker + scheduler + conservative VRAM guard + client interface (build on WebLLM, do not block UI).
- Advanced GLTF/USD exporter: Nanite clusters, material graphs, non-humanoid rigs, facial blendshape data; round-trip tested.
- Playtest Dashboard wired to `@aethel/gameplay` playtest agent.
- Security & BYOK management page with real key rotation (AES-256-GCM vault).
- Mount `VisualLoopDebugger` in the viewport with correct props.

### R1.5 Offline visual-scripting merge
- Visual conflict detection + side-by-side resolution UI for node graphs; never auto-merge; `y-indexeddb` persistence.

**R1 Gate**: `npx prisma migrate deploy` → `npm run typecheck` → `npx vitest run` → `npm run qa:enterprise-gate` → `npm run build` all green; IDE on `WebIDEBackend`; Redis guard + broad rate limiting live. Write `ROUND1_RESULTS.md`.

---

## Round 2 — Billing, Compliance, Infra & Security (Production Grade)

### R2.1 Real earnings ledger (remove simulation)
- Replace `getCreatorEarningsSummary` simulation in `payouts.ts` with a real `Transaction` ledger table (Prisma): real sales, integer-cents 70/30 split, statuses (`pending`/`cleared`/`failed`), payout history.
- Stripe Connect: real webhooks (`payment_intent.succeeded`, `payout.*`, `charge.dispute.created`), real payouts, transaction history.
- Dispute/chargeback handling + royalty splitting for collaborative assets.
- Enforce KYC verification before marketplace listing.

### R2.2 Content moderation at scale
- Production vision API hook (Hive / OpenAI / Rekognition behind `vision-provider.ts`).
- Admin review queue (`app/admin/moderation/queue`) backed by a real DB queue with approve/reject reason logging (immutable).

### R2.3 Infra & security (enterprise)
- Comprehensive rate limiting verified across all routes.
- Immutable admin impersonation audit ledger (`AdminAuditLog`).
- Data residency options (region selection); strict session expiry, HTTPS-only, IP-binding.
- Sentry with releases, performance traces, alerts.
- Disaster recovery: run `scripts/backup-db.sh` + `scripts/restore-db.sh` against a staging DB and **verify restore** (document it).
- Secrets via Doppler/Vault in prod (`scripts/secrets-vault-sync.sh`).
- Set a real CSP (replace `csp: null`) and tighten Tauri `fs.scope` away from `"**"`.

**R2 Gate**: All R1 checks still green + ledger has zero simulated data path + webhooks tested (Stripe CLI) + restore verified + CSP set. Write `ROUND2_RESULTS.md`.

---

## Round 3 — Native Desktop Engine (Multi-Phase Program)

> This is its own program. The `main.rs` 32-line stub is the starting point. Each phase has a gate. Do not collapse these into one pass.

### R3.0 Tauri shell hardening + binary IPC
- Fix `tauri.conf.json`: real CSP, scoped `fs`, add `updater` config, code-signing identifiers.
- Implement the binary state channel (`SharedArrayBuffer`/ring buffer) replacing the no-op `wgpu_execute`. Prove round-trip of a camera matrix from JS → Rust → ack.
- **Gate**: app launches, hosts `@aethel/ide-ui`, binary channel benchmarked (target: sub-ms per frame for a camera+transform payload).

### R3.1 WGPU viewport engine (the big one — sub-phased)
- (a) Device/surface/swapchain + clear + present.
- (b) Render graph + forward/deferred pass parity with Web `DeferredRenderer`.
- (c) Mesh + material upload from the shared scene graph; PBR materials matching `procedural-material` output.
- (d) Nanite-equivalent native streaming + GPU culling (`nanite-cull.wgsl`); HLOD.
- (e) Lumen-equivalent SDF GI native path.
- (f) Picking/raycast parity with `RaycastSystem`.
- **Gate per sub-phase**: the same test scene renders on Web (Three.js) and Desktop (WGPU) with visual parity screenshots; Outliner/Properties drive both identically.

### R3.2 Native subsystems
- **PTY/Terminal**: `portable-pty`; spawn/write/resize/kill; wired to `ConsoleIntegration`.
- **FS watcher**: high-performance native watcher feeding `FileExplorerPro` live.
- **Job queue**: persistent native queue for render/bake/simulation; `RenderQueueDashboard` polls it.
- **Native ML**: `candle` or `llama.cpp` bindings behind `InferenceService`; heavy local inference without blocking UI; honors the same model-selection UX.
- **Toolchain probes**: detect/launch Unreal, Unity, Blender; capability report.

### R3.3 NativeIDEBackend binding + sync
- Bind the 91 panels to `NativeIDEBackend`; identical layout, shortcuts, workflow as Web.
- Web↔Desktop project/asset sync with proxy assets (§1.2); heavy compute auto-routes to Desktop when present.
- Determinism test: Rapier-WASM vs Rapier-native golden-hash parity.

### R3.4 Distribution
- Signed auto-update with payload validation; **Windows EV signing** + **macOS notarization** (see §4 — these need external accounts/certs).

**R3 Gate**: signed auto-update works on Win+macOS; PTY, FS watch, native job queue, native ML all functional; native viewport parity; sync verified; determinism test green. Write `ROUND3_RESULTS.md`.

---

## 3. Final Verification (run at each Round gate)

```bash
npx prisma migrate deploy
npm run typecheck
npx vitest run
npm run qa:enterprise-gate
npm run build
# Desktop (R3):
# - signed auto-update Win + macOS
# - PTY spawn/resize/kill
# - native inference non-blocking
# - viewport parity screenshots
# - Web↔Desktop sync + determinism golden hashes
```
Write `FINAL_VERIFICATION_RESULTS.md` at R3 completion with all outputs.

---

## 4. Non-Code Dependencies (Code Alone Cannot Solve — Plan Around Them)

These block launch but are **business/ops**, not code. Surface them early.

| Dependency | Needed for | Blocker type |
|-----------|------------|--------------|
| Apple Developer account + notarization cert | macOS signed updates | External account |
| Windows EV code-signing (HSM/token) | Trusted Windows installer/updater | Hardware + vendor |
| Stripe Connect live keys + platform approval | Real payouts/KYC | Account approval |
| Vision moderation API contract (Hive/AWS) | Moderation at scale | Paid contract |
| Upstash Redis (prod) | Cost guard + rate limiting | Provisioned service |
| Object storage + replication (S3) | Asset store + DR | Provisioned service |
| SOC 2 / ISO 27001 audit engagement | Enterprise sales | Auditor + time |
| Legal review of Terms/Privacy/DMCA/AI-License | Compliance validity | Lawyer |

---

## 5. Risk Register

| Risk | Mitigation |
|------|------------|
| "One-round" temptation → shallow stubs | Enforce Round gates; no Round starts before prior gate passes |
| WGPU native engine underestimated | R3.1 sub-phased with per-phase parity gates |
| IDE never wired to real backend (stays mock) | R1.2 acceptance: removing `defaultNodes` must not break app |
| Per-frame IPC kills FPS | Binary shared channel (§1.3), benchmarked in R3.0 |
| Heavy native assets can't show on Web | Proxy assets (`AssetVariant.webProxy`, §1.2) |
| Physics diverges Web vs Desktop | Determinism golden-hash test (§1.2) |
| Visual-script merge destroys work | Mandatory side-by-side resolution (R1.5) |
| Billing data fake | Real ledger + Stripe webhooks (R2.1) |
| Tauri security holes (`csp:null`, `fs:**`) | Hardened in R3.0 |
| Surprise AI bills | Redis cost guard, projected spend, Economy Mode, alerts (R1.3) |
| Monorepo extraction breaks imports | R1.1 no-behavior-change migration + no-circular gate |

---

## 6. Best-in-Market Quality Pillars (Non-Functional — Required for "Best IDE/Platform")

Inventory + wiring is necessary but **not sufficient** to be the best local IDE and platform. These cross-cutting pillars are mandatory and are gated alongside the Rounds. Several leverage existing code (`lib/server/file-watcher-runtime.ts`, `lib/hot-reload/`, `I18N_CANONICAL_AUDIT.md`, `WCAG_CRITICAL_SURFACE_AUDIT.md`, `lib/ai/local-inference-manager.ts`).

### P0 — Offline-First Generative Loop (the decisive strategic gap) — DECIDED: Hybrid
- **Problem**: the core value (generate AAA assets) currently depends on cloud models. `lib/ai-content-generation-mesh.ts` / `ai-content-generation.ts` route to cloud (Meshy/Tripo/Replicate/etc.). A "best **local** IDE" cannot have its core loop die without internet.
- **Locked decision — Hybrid (do both, phased)**:
  1. **Now (launch-blocking)** — **Explicit offline-degradation contract**: a clearly defined feature set that works 100% offline (editing, scene graph, scripting, physics, rendering, local LLM via WebLLM/native ML, cached assets, export) + honest, graceful UI when cloud-only features (cloud mesh gen) are unavailable. Offline must never lose work or corrupt projects. Implemented in R1 (Web) and R3 (Desktop).
  2. **Roadmap (first-class track)** — **Local generative tier**: optional-download local mesh+texture/diffusion models served through the Desktop native ML runtime (R3.2), giving a true offline generation path (lower fidelity acceptable). Sequenced right after R3 core; tracked as `OFFLINE_GEN_ROADMAP.md`.
- **Why hybrid**: #1 makes "local IDE" honest and shippable immediately; #2 delivers the ultimate "fully local AAA" differentiator without blocking launch. An `IGenerationBackend` abstraction (cloud | local) must be introduced in R1 so the local provider drops in later without UI changes.

### P1 — Performance SLOs (budgets, measured & gated)
- Input latency < 16 ms; viewport sustains 60 fps on mid-tier GPU for the reference scene; editor cold start budget; memory ceilings per tier; large-project open time budget.
- Add perf benchmarks to CI; regressions fail the gate. Use existing `frame-budget.ts` + add editor-level perf probes.

### P2 — Crash Resilience, Autosave & Recovery
- Periodic autosave + crash-safe journaling of project state; on restart, offer recovery. No user action loses > N seconds of work. Native (Desktop) and IndexedDB (Web) backed.

### P3 — Hardware Tiering & Graceful Degradation
- Detect GPU/CPU/VRAM tier (extend `local-inference-manager.checkHardwareCapability` + `WebGPUDeviceManager`); auto-select render/sim/AI quality profiles (low/mid/high); user override. Never hard-crash on weak hardware — degrade.

### P4 — Editor Extensibility API (the ecosystem moat)
- Promote the existing `extension-host-runtime-loader` + hardened plugin sandbox into a **documented, versioned public Extension API** (commands, panels, viewport gizmos, asset importers, AI tools) with a manifest + permission consent flow. This is what made VS Code dominant; treat it as Tier-1.

### P5 — Local Data Migration Safety
- Versioned, reversible migrations for **local** project/world data across app updates; migration runs are journaled and recoverable; never silently corrupt older projects.

### P6 — Accessibility (WCAG 2.2 AA) & i18n as Gates
- Convert the existing WCAG + i18n audits into enforced gates (`qa:wcag-critical`, full string externalization, RTL support, keyboard-only operation of all IDE panels). Best-in-market = usable by everyone.

### P7 — In-App Learnability
- First-run onboarding, interactive tutorials, starter templates, sample projects, contextual help, and an always-available command palette (exists) with discoverability. Reduce time-to-first-generated-world to minutes.

### P8 — Local Execution Security
- Generated scripts/plugins run in a constrained sandbox on Desktop (process isolation, capability allowlist, resource caps, egress control). Native code execution must not become an attack surface.

### P9 — On-Device Observability
- Local crash reporting (opt-in), on-device perf tracing, and a privacy-respecting telemetry switch. Users own their local data.

**Pillar Gates**: P1 (perf), P2 (recovery), P3 (tiering), P6 (a11y/i18n), P8 (local sandbox) must pass before any public launch. P0 #2 (offline contract) is launch-blocking; P0 #1 (local generation) and P4 (public extension API) are first-class roadmap tracks.

---

## 7. Final Notes
- This plan is grounded in verified code state, not assumptions.
- No partial implementations. Desktop must be *more robust internally* than Web while presenting the *same* IDE.
- Reuse is mandatory (shared packages), but quality is never sacrificed.
- Inventory + wiring (§0) gets parity; the **Quality Pillars (§6)** are what make it *best-in-market*.
- The single biggest strategic decision is **P0 (offline generative loop)** — resolve it explicitly.
- Execute Rounds in order; pass every gate; document every result.

---

## 8. Master Execution Checklist (Ready to Execute)

Tick every box. A Round is not done until all its boxes + its gate pass. Each box maps to §0.R / §6.

### Round 1 — Web Excellence + Abstraction + Monorepo
- [ ] R1.0 `WAVE0_INVENTORY.md` (migrate output, shared-logic inventory, panel prop contracts, billing path)
- [ ] R1.1 Monorepo (workspaces+Turborepo), packages created, no-circular gate, web builds on packages
- [ ] R1.2 `IIDEBackend` defined + `WebIDEBackend` implemented; Outliner/Properties/Viewport/Files on real engine; **mocks removable**
- [ ] R1.2 Monaco LSP wired (diagnostics/completion/hover/go-to-def) in `app/ide`
- [ ] R1.2 Terminal bound to `api/terminal/*`; render queue bound to `api/render/jobs/*`
- [ ] R1.3 Redis cost guard (projected spend, Economy Mode, 50/80/100% alerts)
- [ ] R1.3 Broad rate limiting (exports, uploads, render, marketplace, publish)
- [ ] R1.4 Local AI co-processor (worker+scheduler+VRAM guard); advanced GLB/USD exporter + round-trip; Playtest dashboard; BYOK rotation page; `VisualLoopDebugger` mounted
- [ ] R1.5 Visual-script side-by-side merge (no auto-merge, `y-indexeddb`)
- [ ] R1 P0 `IGenerationBackend` abstraction (cloud|local) + offline-degradation contract (Web)
- [ ] **R1 Gate**: prisma deploy → typecheck → vitest → qa:enterprise-gate → build all green; write `ROUND1_RESULTS.md`

### Round 2 — Billing, Compliance, Infra, Security
- [ ] R2.1 Real `Transaction` ledger (remove `payouts.ts` simulation); Stripe webhooks; disputes/chargebacks; royalty split; KYC gate
- [ ] R2.2 Real vision moderation + DB admin queue with immutable reason logs
- [ ] R2.3 Immutable admin impersonation audit; data residency; session hardening; CSP set; Tauri `fs` scope tightened
- [ ] R2.3 Sentry releases+perf+alerts; OpenTelemetry traces; backup/restore verified; secrets via Doppler/Vault
- [ ] R2 WebXR session entry + export bindings; plugin registry + consent + egress allowlist
- [ ] **R2 Gate**: all R1 checks green + zero simulated billing path + webhooks tested + restore verified; write `ROUND2_RESULTS.md`

### Round 3 — Native Desktop Engine (multi-phase)
- [ ] R3.0 Tauri hardened (CSP, fs scope, updater, signing ids) + binary IPC channel (camera matrix round-trip benchmarked)
- [ ] R3.1 Native WGPU renderer parity: (a) device/swapchain (b) render graph (c) mesh/material (d) Nanite+cull (e) Lumen SDF (f) picking — parity screenshots per sub-phase
- [ ] R3.2 Native PTY, FS watcher, persistent job queue, native ML (candle/llama.cpp), toolchain probes
- [ ] R3.3 `NativeIDEBackend` bound to the 91 panels; Web↔Desktop sync + proxy assets; physics determinism golden-hash test
- [ ] R3.4 Signed auto-update Win+macOS (EV signing + notarization)
- [ ] **R3 Gate**: all desktop verifications pass; write `ROUND3_RESULTS.md` + `FINAL_VERIFICATION_RESULTS.md`

### Quality Pillars (gated alongside; launch-blocking where noted)
- [ ] P0 offline contract (launch-blocking) + `OFFLINE_GEN_ROADMAP.md` for local generation
- [ ] P1 performance SLOs in CI (60fps ref scene, <16ms input, memory ceilings) — launch-blocking
- [ ] P2 autosave + crash recovery — launch-blocking
- [ ] P3 hardware tiering + graceful degradation — launch-blocking
- [ ] P4 public Extension API (roadmap track)
- [ ] P5 local data migration safety
- [ ] P6 WCAG 2.2 AA + i18n gates — launch-blocking
- [ ] P7 in-app onboarding/templates/tutorials
- [ ] P8 local execution sandbox — launch-blocking
- [ ] P9 on-device observability (opt-in)

---

**End of Master Execution Plan v8 (Grounded).**
