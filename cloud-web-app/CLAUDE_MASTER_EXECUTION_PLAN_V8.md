# Aethel Engine — Master Execution Plan v8 (Grounded)

> [!CAUTION]
> **SUPERSEDED (2026-07-11) — DO NOT EXECUTE FROM THIS FILE**  
> Task queue: `docs/architecture/AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md`  
> Live DONE/OPEN: `docs/architecture/AETHEL_FOCUS1_EXECUTION_PROGRESS.md`  
> Nav: `docs/architecture/AETHEL_STUDIO_SUPREMACY_INDEX.md` § Document Authority  
> Laws: `docs/architecture/AETHEL_SUPREMACY_ROADMAP.md` v4.7  
> Historical archive only. Conflicts lose to Master Map + Roadmap.

## Best-in-Market Execution Specification — Web + Desktop, Shared UI, Native Power

> [!IMPORTANT]
> **ORDEM DIRETA AO CLAUDE (O EXECUTOR TÉCNICO):**
> Você está **proibido** de iniciar a codificação do Round 1 sem antes ler, absorver e aplicar as regras e correções estritas (*Reality Checks*) definidas nos **5 Documentos de Alinhamento Mestre** abaixo. Junto com este plano V8 (totalizando 6 Arquivos Sagrados), eles formam a resolução final da engine e expurgam todas as alucinações:
> 1. `CLAUDE_MASTER_EXECUTION_PLAN_V7.md` (Para: A raiz Matemática, LWC 64-bit e Core ECS).
> 2. `CLAUDE_CRITICAL_ALIGNMENT_V24.md` (Para: Determinismo Fixed-Point, Atomics/SharedArrayBuffer e OPFS).
> 3. `CLAUDE_ULTIMATE_QA_CRITIQUE_V30.md` (Para: WebGPU PCG, Partículas Indirect Draw, MoCap e SDF Raytracing).
> 4. `CLAUDE_MASTER_ULTIMATE_ARCHITECTURE_SPEC` (Para: Independência Offline/Llama Local, Áudio DSP Sidechain e UX Mobile).
> 5. `CLAUDE_AETHEL_UX_MONETIZATION_ALIGNMENT` (Para: Escrow 14 Dias Stripe, DRM, COPPA e Encriptação B2B AES-256).

> [!IMPORTANT]
> **PROTOCOLO DE ROTEAMENTO DE IA (SONNET vs OPUS):**
> A execução absoluta requer a separação cirúrgica das tarefas baseada na inteligência de cada modelo. A Master Checklist no fim deste documento está marcada com `[SONNET]` e `[OPUS]`. Siga esta regra:
> * **Use o CLAUDE 3.5 SONNET (O Trator de Execução):** Para toda a fundação do Monorepo (Turborepo), interfaces web (React), integração com APIs (Stripe, Cloudflare R2), regras de negócio web (KYC) e ferramentas da IDE de alto nível. O Sonnet garante velocidade extrema e zero falhas de sintaxe na infraestrutura SaaS.
> * **Use o CLAUDE 3 OPUS (O Kernel Matemático):** Escale a tarefa exclusivamente para o Opus ao codificar a Matemática de Baixo Nível. Isso inclui: Compute Shaders em Rust/WebGPU, Motor de Física Determinística, Sandboxing de v8::Isolate, DRM de Criptografia em GPU e Lógicas de Anti-Cheat Server-Side. O Opus resolverá arquiteturas que o Sonnet não suporta raciocinar.

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
- **Half-real**: `payouts.ts#getCreatorEarningsSummary` **simulates** transactions from `item.downloads` (fake `buyerEmail`, derived dates). Stripe account lookup is real. `calculateRevenueSplit()` in the same file hardcodes a **70/30 creator/platform split** — this contradicts the 12% take-rate decision locked in `CLAUDE_AETHEL_UX_MONETIZATION_ALIGNMENT` §14.4. Fixing the mock must also fix the split ratio in the same pass; they are the same function.
- **⚠️ SECOND UNCATALOGUED MOCK (found 2026-07-03)**: `packages/engine/services/RedisLedgerClient.ts` is
  named as if it writes to Redis but does not. `reportTokenUsage()` accumulates `pendingTokens` in a
  static in-memory counter; the Postgres sync path (`startAsyncSync`) has its actual write
  (`prisma.user.update(...)`) **commented out** — it only logs `"[Ledger] Syncing N tokens..."` and
  never persists. No document prior to this correction listed this file. It must be destroyed or
  rewired in the same R1.3/R2.1 pass as `cost-guard.ts` and `payouts.ts` — it is the same class of
  risk (silent financial data loss / fabricated ledger state).
- **⚠️ Prisma has no `Transaction` model.** Every reference below and in `CLAUDE_AETHEL_UX_MONETIZATION_ALIGNMENT`
  to "the `Transaction` table" (e.g. §1, §6.1, §7.1) refers to a model that **does not exist** in
  `web/prisma/schema.prisma`. The closest existing models are `Payment` and `CreditLedgerEntry`.
  Before any webhook/ledger wiring in R2.1, an explicit migration step must either (a) create a new
  `Transaction` model with `status: pending|cleared|failed|disputed` fields to support the 14-day
  escrow window, or (b) extend `Payment`/`CreditLedgerEntry` to cover that need and update all 6
  `CLAUDE_*` documents' references accordingly. This is not optional cleanup — code that assumes a
  model exists will fail typecheck immediately.

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

### 0.P Desktop (Aethel Studio) — PARTIAL NATIVE FOUNDATION (corrected 2026-07-03 — was stale)
> **⚠️ CORRECTION**: This section originally described a 32-line, single-file stub. That state no
> longer exists. Verified against the current tree — see `docs/architecture/AUDITORIA_V33_CRITICA_DOS_3_MDS.md`
> §0-S.3 for the full audit trail. **Do not recreate files listed below from scratch.**
- **18 Rust files exist** in `apps/studio-local/src-tauri/src/`: `main.rs`, `lib.rs`, `wgpu_renderer.rs`,
  `sidecars.rs`, `runtime_engine.rs`, `probe.rs`, `policy.rs`, `plugin_sandbox.rs`, `physics_kernel.rs`,
  `physics_commands.rs`, `native_kernel.rs`, `jobs.rs`, `gi_sdf.rs`, `geometry_clusterizer.rs`,
  `desktop_commands.rs`, `daemon.rs`, `contracts.rs`, `build.rs`.
- `Cargo.toml` already declares `wgpu = "0.19"`, `rapier3d = "0.18"`, `portable-pty = "0.8"`,
  `notify = "6.1"`, `winit = "0.29"`, `ort` (ONNX, optional feature `local-ai`), `reqwest` (rustls).
- `wgpu_renderer.rs` already implements `WgpuRenderer::mount_on_window` with a real
  `instance.request_adapter()` → `request_device()` flow mounting a native surface on the Tauri
  window — **this is not a no-op stub**.
- `tauri.conf.json` security is **better than previously documented**: CSP is a real restrictive
  policy (`default-src 'self' customprotocol: asset:`, scoped `connect-src`), not `null`. No
  `capabilities/` folder exists, meaning no broad `fs: ["**"]` allowlist is configured (Tauri v2
  defaults are already restrictive without one). What genuinely remains missing: **updater config**
  and **code-signing identifiers** — those two gaps are real and still block R3.4.
- **What this changes for R3**: the phase is not "write a native Rust engine from scratch." It is
  "inventory the 18 existing files function-by-function, establish parity gates against what
  already exists (device/swapchain, physics kernel, SDF/GI, job queue primitives), then build the
  genuinely missing pieces (`NativeIDEBackend` binding to the 89 `ide-ui` panels, PTY wiring to
  `ConsoleIntegration`, signed distribution)." This is still the single largest remaining program —
  just not a greenfield one. **R3.0 must start with a Rust code-reading pass, not a scaffold.**

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
| 5 | Cost guard | in-memory `Map()`, but `@upstash/redis` **already installed** (`web/package.json`) and `lib/redis-cache.ts` (mature ioredis+fallback+decorator class) **already exists unused** | ~~Replace with Upstash Redis~~ **Wire existing `@upstash/redis` client / `redis-cache.ts` into `cost-guard.ts`**; projected spend, Economy Mode, alerts 50/80/100% | **Wire** (reclassified from Build — corrected 2026-07-03, was overestimated) | R1 |
| 5b | **NEW** — `RedisLedgerClient` fake | `packages/engine/services/RedisLedgerClient.ts` — in-memory counter, Postgres write commented out, never persists | Destroy or rewire to real Redis + Prisma write in the same pass as row 5 and row 11 | Harden | R1 |
| 6 | Rate limiting | AI core only (confirmed 2026-07-03: zero hits for `enforceAiCoreRateLimit`/`rateLimit` in `app/api/exports/**` or `app/api/marketplace/**`) | Extend to exports, uploads, render, marketplace, publish | Harden | R1 |
| 7 | Local AI co-processor | WebLLM manager | Web Worker + scheduler + VRAM guard + client interface (non-blocking) | Build | R1 |
| 8 | Export (GLB/USD) | basic exporter + routes | Preserve Nanite clusters, material graphs, non-humanoid rigs, facial blendshapes; round-trip test in Unreal/Unity/Godot | Harden | R1 |
| 9 | Visual scripting merge | compiler + Yjs; `y-indexeddb` **already installed** (`web/package.json` — corrected 2026-07-03, was listed as work to add) | Side-by-side conflict resolution UI; never auto-merge; wire the already-available `y-indexeddb` | Build | R1 |
| 10 | BYOK management | AES vault | Settings page with real key rotation + usage auditing | Wire+Harden | R1 |
| 11 | Billing/payouts | account real, txns simulated, **split hardcoded 70/30 not 12% take rate**, **no `Transaction` Prisma model exists** | Create/extend ledger model (see §0.L correction); real Stripe webhooks; disputes/chargebacks; fix `calculateRevenueSplit` to 88/12; KYC gate before listing | Harden | R2 |
| 12 | Moderation | local stub + vision adapters | Wire real vision API; DB-backed admin queue with immutable approve/reject reason logs | Harden | R2 |
| 13 | Security/compliance | RBAC, SAML, legal pages, GDPR API | Immutable admin impersonation audit; data residency; session hardening; legal review; CSP set; Tauri `fs` scope tightened | Harden | R2/R3 |
| 14 | Observability | telemetry, kill switch, analytics | Sentry releases+perf+alerts; OpenTelemetry traces; verify backup/restore; secrets via Doppler/Vault | Harden | R2 |
| 15 | Networking/multiplayer | netcode + rollback + WebRTC | Determinism parity (Web vs Desktop); production signaling/relay; load test | Harden | R2/R3 |
| 16 | WebXR/VR | `webxr-vr-system-core` | Export bindings + session entry from viewport; device test | Wire | R2 |
| 17 | Plugins | hardened sandbox + manifest | Registry UI + install/permission consent flow + egress allowlist enforcement | Harden | R2 |
| 18 | Desktop shell | **18 Rust files already exist** (see §0.P correction), CSP already restrictive | Read/inventory existing files function-by-function; add updater config + code-signing identifiers; binary IPC channel | **Wire+Build** (reclassified — was "32-line stub") | R3 |
| 19 | Desktop renderer | WebGPU TS path exists (web); **`wgpu_renderer.rs` already mounts a real device/surface/swapchain on the Tauri window** | Extend existing `WgpuRenderer` to render graph parity (mesh/material→Nanite→Lumen→picking) — not a from-scratch build | **Build** (foundation exists — do not recreate `wgpu_renderer.rs`) | R3 |
| 20 | Desktop subsystems | `portable-pty`, `notify`, `ort` (ONNX) already in `Cargo.toml`; `jobs.rs`, `physics_kernel.rs`, `gi_sdf.rs`, `geometry_clusterizer.rs` already exist as files (contents not function-audited in this pass) | Verify existing files' actual completeness first; wire PTY to `ConsoleIntegration`, FS watcher to `FileExplorerPro`, job queue to `RenderQueueDashboard`; toolchain probes | Build (verify-then-build, not build-from-zero) | R3 |
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
> **⚠️ CORRECTION (2026-07-03): this section assumed `packages/` does not exist. It does.**
> `cloud-web-app/packages/` already contains all 7 packages listed below, each with its own
> `package.json` (`"name": "@aethel/ide-ui"`, etc.) and `tsconfig.json`. `@aethel/ide-ui` already
> has **89 panel `.tsx` files** (not 91 — close enough, not a hallucination flag, just noting the
> exact count) moved out of `web/components/ide/`. **Do not recreate these packages or re-move the
> panels — that work is done.** What remains is real and was NOT previously documented:
>
> 1. **No workspaces config exists anywhere.** Verified: no `workspaces` field in `web/package.json`,
>    no root `package.json` workspaces field, **no `cloud-web-app/package.json` at all**. The
>    packages are physically separate folders with zero npm-level linkage to `web/`.
> 2. **The dependency direction is inverted.** Files inside `packages/` (e.g.
>    `packages/ide-ui/FileExplorerView.tsx`, `packages/visual-scripting/VisualScriptEditor.tsx`,
>    `packages/visual-scripting/VisualScriptCompiler.ts`) still `import from '@/lib/...'` —
>    the Next.js path alias that only resolves inside `web/`. This means the "extracted" packages
>    are **not actually framework-agnostic** today; they are `web/` source files that were copied
>    to a new folder but never had their imports rewritten. A real monorepo has `web` depend on
>    `@aethel/ide-ui`; today `@aethel/ide-ui` silently depends on `web`'s alias resolution, which
>    only works if `web`'s bundler is configured to resolve `packages/*` through the same alias
>    map (needs explicit verification — do not assume it works without testing an actual isolated
>    build of one package).
>
> **Revised R1.1 scope** (smaller than originally written, because extraction already happened):
> 1. Add `workspaces` field to a new root-level `cloud-web-app/package.json` (or extend
>    `web/package.json` if kept flat) pointing at `packages/*`.
> 2. Pick ONE package (`@aethel/runtime` — smallest surface) and rewrite its `@/lib/*` imports to
>    real relative/package imports as a proof of concept. Verify it builds **standalone**
>    (`tsc --noEmit` inside the package folder, zero reliance on `web`'s path alias config).
> 3. Only after the proof-of-concept passes, repeat for the other 6 packages in order of increasing
>    size: `@aethel/agents` → `@aethel/export` → `@aethel/gameplay` → `@aethel/visual-scripting` →
>    `@aethel/engine` → `@aethel/ide-ui` (largest, highest blast radius — do last).
> 4. Turborepo is still optional (V8 originally left it as a choice) — with only 7 small packages,
>    plain npm workspaces is enough; do not add Turborepo purely for its own sake in R1.
- Gate sub-check: `web` builds consuming the packages via real workspace resolution (not path
  aliases pointing back into `web/`); no circular imports; `tsc --noEmit` passes standalone inside
  each package folder with zero `@/` imports remaining.

> **🔴 CRITICAL ESCALATION (verified 2026-07-03, execution pass): `npm run typecheck` and `npm run
> build` FAIL TODAY, right now, on `main`.** `next.config.js` has `typescript: { ignoreBuildErrors:
> false }` — this is not a lint nicety, it is a hard production build blocker. Ran
> `npm run typecheck` in `cloud-web-app/web` and got **exit code 2, 152 `error TS2307: Cannot find
> module` / related errors**, not the handful implied by the R1.1 text above. Full accounting:
>
> - **`@/components/ide/*` — 13 distinct missing specifiers**, imported from `app/layout.tsx`
>   (`GlobalCommandSurface` — this is in the root layout, so it is on **every single page's**
>   render path), `app/ide/page.tsx` (`FullscreenIDE`), `app/pricing/_components/*` (`Codicon`),
>   and ~9 files under `components/agents/chat/**` (`AIChatPanelPro`, `AIChatPanelPro.types`,
>   `AIChatPanelChrome`, `AIChatContextPanels`, `ActiveContextBadge`, `ApprovalCard`, `MemoryPanel`,
>   `TaskOpsPanel`, `MonacoChatDiffPanel`, `EditorApplyBridgeContext`, `InlineAIChat`,
>   `PreviewPanel`, `fullscreen/types`).
> - **`@/lib/runtime/*` — 16 distinct missing specifiers** (`v29-internal-spine`,
>   `runtime-mode-view-model`, `runtime-engine-spine`, `runtime-renderer-adapter`,
>   `runtime-resilience-ledger`, `runtime-toolchain-readiness-snapshot`,
>   `runtime-failure-smoke-pack`, `runtime-failure-smoke-runner-report`, `frame-budget`,
>   `playtest-job-policy`, `best-market-internal-spine`, `webgpu-compute-readiness`,
>   `webgpu-performance-trace`, `v29-sidecar-install-manifest`, `v29-sidecar-lifecycle`), imported
>   from `app/studio/**`, `components/viewport/**`, `lib/ai-ondevice/**`, `lib/assets/**`,
>   `lib/physics/rapier-driver.ts`, `lib/i18n/single-source-contract.ts`,
>   `lib/production/**`, `lib/render/webgpu/**`, `lib/workers/viewport-render-worker.ts`,
>   `app/api/runtime/**`, `tests/world-determinism.test.ts`.
> - **`@/lib/export/*` — 2 specifiers** (`enqueue-export-job`, `export-pipeline-spine`), imported
>   from **all five** `app/api/exports/{glb,mp4,wav,usdz,project}/route.ts` handlers and
>   `components/preview/useViewportExport.ts` — i.e. the entire export feature enqueues jobs
>   against a module that TypeScript cannot see today.
> - **`components/visual-scripting/VisualScriptEditor` / `VisualScriptRuntime` — 2 specifiers**,
>   imported from `lib/visual-script-integration.ts` and `components/preview/*` — contradicts the
>   `.cursorrules`/`CLAUDE.md` canonical-files table, which states
>   `components/visual-scripting/VisualScriptEditor.tsx` (689 LoC) exists in `web/`. It does not,
>   at `web/components/visual-scripting/`.
> - **`lib/engine/*.runtime` and misc — ~8 more specifiers** (`GameViewport.runtime`,
>   `LandscapeEditor.runtime`, `LandscapeEditor.types`, `LevelEditor.viewport-runtime`,
>   `NiagaraVFX.runtime`, `NiagaraVFXPanels.runtime`, `audio-manager-contracts`, `useSceneDigest`,
>   `scene-graph-node`, `scene-graph-manager`, `auto-lod-pipeline`).
> - Remaining ~15 errors are `TS7006` implicit-`any` (unrelated, cheap to fix once `strict` is
>   satisfied) and 2 `TS2322` prop-shape mismatches in `AgentsWorkspaceContainer.tsx` and
>   `SceneViewportWorkflowDrawer.tsx` (likely a symptom of consuming the wrong/stale type from the
>   same broken `AIChatPanelPro.types` / `VisualScriptEditor` imports above).
>
> **The critical, verified-good news: none of these ~50 missing specifiers are actually lost.**
> Spot-checked every category above with `Glob` against `cloud-web-app/packages/**` — every single
> one physically exists, just relocated:
> `@/components/ide/FullscreenIDE` → `packages/ide-ui/FullscreenIDE.tsx` (and
> `packages/ide-ui/GlobalCommandSurface.tsx`, etc. — all 13 present in `packages/ide-ui/`),
> `@/lib/runtime/v29-internal-spine` → `packages/runtime/v29-internal-spine.ts` (all 16 present in
> `packages/runtime/`), `@/lib/export/enqueue-export-job` → `packages/export/enqueue-export-job.ts`,
> `components/visual-scripting/VisualScriptEditor` → `packages/visual-scripting/VisualScriptEditor.tsx`.
> This is the **exact same "inverted extraction, consumer side never updated" defect** already
> described above for `packages/`'s own internal imports — except it turns out `web/`'s ~50 call
> sites into `packages/` were *also* never repointed after the extraction, which is strictly worse
> than previously documented: it means the build is broken today, not just architecturally impure.
>
> **Proof-of-concept fix executed and verified this pass** (see `CLAUDE_EXECUTION_LOG_2026-07-03.md`
> for the session that did this): fixed `web/components/preview/CanvasViewportSurface.tsx`'s three
> broken imports (`Outliner3D`, `PropertiesPanel3D`, `Timeline3D`) by (1) pointing them at
> `../../../packages/ide-ui/*` via **relative path, not a new `@aethel/ide-ui` tsconfig alias** —
> the existing `@aethel/runtime-contracts` alias in `web/tsconfig.json` is unused anywhere and its
> webpack-level resolution was never proven to actually work, so do not trust it as a template
> without testing; and (2) discovering that `packages/ide-ui/*.tsx` files import bare specifiers
> (`lucide-react`) that cannot resolve via Node's ancestor-directory `node_modules` lookup because
> `packages/ide-ui` is a *sibling* of `web`, not a descendant — fixed by adding `lucide-react` to
> `packages/ide-ui/package.json` (version-matched to `web/package.json`'s `^0.294.0`) and running
> `npm install --no-save --no-audit --no-fund` **scoped inside `packages/ide-ui/` only** (10s,
> added 4 packages, zero effect on `web/node_modules`). Result: typecheck error count went
> 156 → 152 with **zero new errors introduced anywhere else** (verified via targeted `Select-String`
> diff of the full typecheck output before/after). This is the repeatable, low-risk pattern for the
> remaining ~140 errors: fix import path + locally `npm install --no-save` whatever bare specifiers
> that package's `.tsx`/`.ts` files need, per-package, before attempting the bigger `workspaces`
> field migration.
>
> **Why the full workspaces-field migration (steps 1–3 above) was NOT attempted in this pass**:
> this machine has **no `git` installed/on `PATH`** (`git : O termo 'git' não é reconhecido...`) —
> there is no verified way to snapshot or roll back a repo-wide `npm install` under a `workspaces`
> field, which reorganizes hoisting for the entire `node_modules` tree and is exactly the kind of
> change that needs an undo button. **Action item for next round: install/verify `git` in this
> environment and commit a checkpoint before touching `workspaces`.** Until then, keep using the
> proven per-package `npm install --no-save` + relative-import-path pattern above — it is slower
> per package but has zero blast radius on the rest of the monorepo.
>
> **Severity reclassification**: R1.1 is not "architecture hygiene to get to eventually" — it is a
> **P0 blocker**. `npm run build` cannot produce a deployable artifact today. Whatever else the next
> round prioritizes, budget dedicated time to walk all ~50 specifiers to green using the proven
> pattern above; `app/layout.tsx`'s `GlobalCommandSurface` import alone means this is not confined
> to one feature — it is upstream of every route in the app at the type-check level.

### R1.2 Define `IIDEBackend` + implement `WebIDEBackend` and WIRE the UI
> **⚠️ CORRECTION (2026-07-03)**: panels are no longer in `web/components/ide/` — they were already
> moved to `cloud-web-app/packages/ide-ui/` (89 `.tsx` panel files). Also, a partial adapter already
> exists at `packages/aethel-ide-shared/src/runtime-adapter/` with a `RuntimeAdapter` type
> (`fs`, `terminal`, `runtime`, `ai`, `notifications`, `window`) and a `createWebRuntimeAdapter()`
> implementation — **this is a smaller, different shape than `IIDEBackend`** (no `SceneService`/
> `ViewportService`/`JobService`/`ScriptService`/`ExportService`). Do not treat it as already
> satisfying this task; it covers roughly 2 of the 8 planned services, and its `terminal` methods
> are stubs (`createSession` returns a hardcoded `{ id: 'web-terminal' }`, `write`/`close` are
> no-ops that resolve immediately without touching `api/terminal/*`). Decide explicitly whether to
> extend `RuntimeAdapter` into the full `IIDEBackend` shape or replace it — do not run both
> abstractions in parallel.
- Derive `IIDEBackend` (the services in §1.1) from the panel prop contracts collected in R1.0.
- Implement `WebIDEBackend`:
  - `SceneService`/`ViewportService` → bind to `lib/engine` (`DeferredRenderer`, `ViewportSceneCanvas.runtime`, scene graph). **Outliner3D/PropertiesPanel3D must show real scene nodes, not `defaultNodes`** (confirmed still present in `packages/ide-ui/Outliner3D.tsx` line 25 as of 2026-07-03).
  - `FileService` → existing `api/workspace/{tree,files,create}` APIs (note: `createWebRuntimeAdapter().fs` already calls `api/files/fs` — reconcile which route is canonical before wiring, do not leave two file APIs half-wired).
  - `TerminalService` → existing `api/terminal/{create,input,resize,kill}` backend — **replace the stub `createWebRuntimeAdapter().terminal` implementation**, do not just bind `ConsoleIntegration` to the stub and call it done.
  - `JobService` → existing render-farm dispatcher (`api/render/jobs/*`).
  - `InferenceService` → `local-inference-manager` (WebLLM) + `intelligent-model-router` cloud path.
  - Editor `ScriptService` also wires `monaco-lsp-http` (LSP bridge already exists) for diagnostics/completion/hover.
  - `ScriptService` → `@aethel/visual-scripting` compiler.
  - `ExportService` → `@aethel/export`.
- **Acceptance**: Launch the Web IDE; every panel reflects real backend state; removing `defaultNodes` mocks does not break the app.

### R1.3 Redis-backed cost guard + broad rate limiting
> **⚠️ CORRECTION (2026-07-03)**: this is a **wiring task, not an infrastructure build**.
> `@upstash/redis@^1.34.3` is already an installed dependency and `lib/redis-cache.ts` already
> implements ioredis-with-fallback + a caching decorator. Re-estimate effort down accordingly —
> do not scaffold new Redis client code from scratch.
- Wire `lib/observability/cost-guard.ts`'s `memStore` `Map()` to the existing `@upstash/redis` client (or `RedisCache` from `lib/redis-cache.ts` if its interface fits the atomic-increment need — verify it exposes `incrby`/Lua-script support first, extend it if not): per-user + global daily caps, projected spend, Economy Mode, proactive alerts at 50/80/100%.
- **In the same pass**, fix or delete `packages/engine/services/RedisLedgerClient.ts` — it has the identical bug (fake Redis usage, commented-out Postgres write) and was not previously catalogued in any plan.
- Apply rate limiting to **all** sensitive routes: AI core, exports (GLB/USDZ/WAV/MP4), uploads, render jobs, marketplace actions, publishing. **Confirmed 2026-07-03: zero rate-limiting calls exist today in `app/api/exports/**` or `app/api/marketplace/**`** — this part of the task is fully open, not partially done.

### R1.4 Web AAA completion & AI Mesh Supremacy
- **AI Mesh Supremacy (Mandatory):** Implement `Cognitive Streaming` (Gaussian Splat/Greybox loading instead of progress bars), `AI Forge` semantic polish panel (1-click Retopology + UV mask painting), and `Hybrid Model Router` (Neural for organics + CSG/SDF for hardsurface to guarantee 100% mesh coverage).
- **Zero-Friction UX:** Implement Drag-and-Drop Multimodal PBR (drag JPG to viewport -> auto-extract Normal/Roughness) and Micro-Contextual Dual Quaternion Rigging (right-click bones to fix skin weights).
- Local AI Co-Processor: Web Worker + scheduler + conservative VRAM guard + client interface (build on WebLLM, do not block UI).
- Advanced GLTF/USD exporter: Nanite clusters, material graphs, non-humanoid rigs, facial blendshape data; round-trip tested.
- Playtest Dashboard wired to `@aethel/gameplay` playtest agent.
- Security & BYOK management page with real key rotation (AES-256-GCM vault).
- Mount `VisualLoopDebugger` in the viewport with correct props.

### R1.5 Offline visual-scripting merge
- Visual conflict detection + side-by-side resolution UI for node graphs; never auto-merge.
  `y-indexeddb@^9.0.12` is **already an installed dependency** (corrected 2026-07-03 — treat as
  available, not as work to add) — wire it for persistence; `lib/collaboration/visual-merge.ts`
  and `components/collaboration/VisualMergeConflictModal.tsx` genuinely do not exist yet and are
  the real remaining work.

> **⚠️ EDITORIAL FIX (2026-07-03)**: the line below was truncated in the source document — the gate
> steps had been accidentally merged into the Round 2 header with no actual verification commands
> listed. Restored below.

**R1 Gate**:
```bash
npx prisma migrate deploy
npm run typecheck
npx vitest run
npm run qa:enterprise-gate
npm run build
```
All five must pass. Write `ROUND1_RESULTS.md` with the output of each command before starting Round 2. **As of 2026-07-03, no `WAVE0_INVENTORY.md` or `ROUND1_RESULTS.md` exists in the repo** — R1 has not been formally started under this plan's gating discipline, regardless of how much of its underlying work has organically happened.

---

## Round 2 — Billing, Compliance, Infra, Security (O Fundo do Poço Financeiro)

### R2.1 Plataforma de Publicação (IAP) e Real Earnings Ledger
- **Pré-requisito não documentado até 2026-07-03**: criar (ou mapear explicitamente para `Payment`/`CreditLedgerEntry`) um model `Transaction` no `web/prisma/schema.prisma` — **ele não existe hoje**. Toda referência abaixo e nos outros 5 documentos `CLAUDE_*` a "a tabela `Transaction`" pressupõe um schema que ainda precisa ser migrado.
- Substituir a simulação em `payouts.ts` pela tabela `Transaction` do Prisma (ou modelo equivalente escolhido acima). Zero dados falsos. **Na mesma tarefa**, corrigir `calculateRevenueSplit()` de 70/30 (valor atual no código) para 88/12, e destruir/rewire `packages/engine/services/RedisLedgerClient.ts` (mesmo defeito estrutural, não catalogado anteriormente).
- **1-Click Publish:** Habilitar roteamento para publicar jogos diretamente na web (`aethel.gg`) com nós de *In-App Purchase* nativos no Visual Scripting. A engine é a *Merchant of Record*.
- **Stripe Connect e Impostos:** Webhooks reais, repasses automáticos com taxa de plataforma de 12%. Implementar obrigatoriamente a API do **Stripe Tax** para recolher VAT europeu/global via IP, impedindo falência legal.
- **Escudo de Chargeback (Escrow):** Retenção mandatória de 14 dias para todos os saldos de vendas. O criador vê "Saldo Pendente", mas não saca até passar a janela de fraude de cartão de crédito.
- KYC (Know Your Customer) obrigatório para listagem no marketplace.

### R2.2 Content moderation at scale
- Production vision API hook (Hive / OpenAI / Rekognition behind `vision-provider.ts`).
- Admin review queue (`app/admin/moderation/queue`) backed by a real DB queue com logs imutáveis de aprovação/rejeição.

### R2.3 Infraestrutura Anti-Falência (Enterprise)
- **Zero-Egress Fee Asset Streaming:** Toda hospedagem de Nuvem de Pontos e `.fbx` (Marketplace e Jogos Publicados) deve ser movida da AWS S3 para a **Cloudflare R2**. A Aethel não pode pagar taxa de download. 
- **Cost Guard Real:** O `cost-guard.ts` deve usar `@upstash/redis` (Token Bucket atômico) para travar IA. Fim do `Map()` em memória que vaza em Serverless.
- **Roteamento de IA Híbrido:** O Agent-LSP do editor rodará em APIs ultra-baratas (Groq/LPU) ou localmente em WASM. O modelo Premium (Claude 3.5 Sonnet) é restrito à Geração Arquitetônica Pesada, cortando nosso gasto de API em 90%.
- **Dedução Automática de Server Meshing:** Jogos hospedados na Aethel que usem Backend Multiplayer pagarão o servidor deduzindo direto das vendas de IAP. Jogos gratuitos rodam em P2P (WebRTC).
- Immutable admin impersonation audit ledger (`AdminAuditLog`).
- Disaster recovery verificado, Sentry, CSP restrito e variáveis no Doppler/Vault.

**R2 Gate**: All R1 checks still green + ledger real implementado + Stripe Tax/Escrow ativos + Cloudflare R2 ancorada + webhooks testados. Write `ROUND2_RESULTS.md`.i `fs.scope` away from `"**"`.

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

### R3.3 NativeIDEBackend binding e Ecossistema (A Apple-ização da Engine)
- Bind the 91 panels to `NativeIDEBackend`; identical layout, shortcuts, workflow as Web.
- **Web↔Desktop Asset Sync:** Heavy compute auto-routes to Desktop. Geração de `Proxy Assets` para garantir que projetos criados no Desktop consigam abrir em iPads (Web) sem travar o navegador.
- **Workspace Continuity (Handoff):** Sincronização em nuvem do Estado do Editor (Câmera, Abas Abertas, Layout de Janelas). Se o usuário estiver trabalhando no App Desktop, fechar o PC e abrir o navegador (Web) no celular, a câmera 3D e os painéis estarão **exatamente na mesma posição**. Continuidade total de contexto.
- **Local Live-Link (Mobile Playtest):** Para testar jogos de Desktop no celular sem precisar publicar na nuvem, o App Desktop (Rust) rodará um servidor local. A UI do Desktop gerará um **QR Code**. O desenvolvedor aponta a câmera do celular, e o celular abre o jogo na Web conectando via Wi-Fi Local (WebSockets/WebRTC) direto na placa de vídeo do PC, com 0ms de latência.
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
- [ ] **[SONNET]** R1.0 `WAVE0_INVENTORY.md` (migrate output, shared-logic inventory, panel prop contracts, billing path)
- [ ] **[SONNET]** R1.1 Monorepo — packages **already exist** (`cloud-web-app/packages/*`, 7 packages, `@aethel/ide-ui` has 89 panels); real remaining work is **workspaces config (does not exist anywhere) + rewriting `@/lib/*` imports inside packages so dependency direction is package→consumed-by-web, not the current inverted state**; no-circular gate, web builds on packages via real resolution
- [ ] **[SONNET]** R1.3b Destroy/rewire `packages/engine/services/RedisLedgerClient.ts` (uncatalogued fake financial ledger — commented-out Postgres write) in the same pass as the cost guard
- [ ] **[SONNET]** R1.2 `IIDEBackend` defined + `WebIDEBackend` implemented; Outliner/Properties/Viewport/Files on real engine; **mocks removable**
- [ ] **[SONNET]** R1.2 Monaco LSP wired (diagnostics/completion/hover/go-to-def) in `app/ide`
- [ ] **[SONNET]** R1.2 Terminal bound to `api/terminal/*`; render queue bound to `api/render/jobs/*`
- [ ] **[SONNET]** R1.3 Redis cost guard (projected spend, Economy Mode, 50/80/100% alerts); **Roteamento Híbrido Estrito:** WASM/Groq LPU ($0.05/1M) local vs Sonnet Pago via Compute Battery.
- [ ] **[SONNET]** R1.3 Broad rate limiting (exports, uploads, render, marketplace, publish); **Escudo Anti-DDoS Flat-Rate:** Integração forçada via Cloudflare Enterprise (Zero falência por Botnet).
- [ ] **[SONNET]** R1.4 Local AI co-processor (worker+scheduler+VRAM guard); advanced GLB/USD exporter + round-trip; Playtest dashboard; **Aethel Native Workshop:** Suporte nativo a Mods (UGC) dentro dos jogos publicados.
- [ ] **[OPUS]** R1.5 Visual-script side-by-side merge (no auto-merge, `y-indexeddb`); **IOPS Saving:** Sincronização de mutações via CRDTs (Redis/RAM) e Snapshots a cada 15 min no Postgres. **Zero-Downtime LiveOps:** WASM Hot-Swapping para atualizações sem derrubar o servidor.
- [ ] **[SONNET]** R1 P0 `IGenerationBackend` abstraction (cloud|local) + offline-degradation contract (Web)
- [ ] **R1 Gate**: prisma deploy → typecheck → vitest → qa:enterprise-gate → build all green; write `ROUND1_RESULTS.md`

### Round 2 — Billing, Compliance, Infra, Security
- [ ] **[SONNET]** R2.1 Real `Transaction` ledger (remove `payouts.ts` simulation); Stripe webhooks; disputas/chargebacks; **Royalty Split nativo (12% Take Rate)**.
- [ ] **[SONNET]** R2.1 **KYC e Compliance Governamental:** Bloqueio do Publisher Portal, Stripe Identity (Biometria) e coleta W-8BEN/W-9 para prevenir retenção IRS de 30%.
- [ ] **[SONNET]** R2.2 **Infraestrutura Zero-Egress:** Roteamento massivo do Asset Streaming 3D para Cloudflare R2 (Custos Egress $0.00).
- [ ] **[SONNET]** R2.2 Real vision moderation + DB admin queue with immutable reason logs
- [ ] **[SONNET]** R2.3 Immutable admin impersonation audit; data residency; session hardening; CSP set; Tauri `fs` scope tightened
- [ ] **[SONNET]** R2.3 Sentry releases+perf+alerts; OpenTelemetry traces; backup/restore verified; secrets via Doppler/Vault; **Cloud Garbage Collection:** Limpeza de assets órfãos (30 dias) na R2.
- [ ] **[OPUS]** R2.4 WebXR session entry + export bindings; plugin registry + consent + egress allowlist; **DRM de Memória WebGPU:** Descriptografia de malhas no Kernel da GPU (Anti-Pirataria).
- [ ] **[OPUS]** R2.5 **Server-Side Authority (Anti-Cheat Nativo):** Física validada no Backend contra Speedhacks/Wallhacks.
- [ ] **[OPUS]** R2.5 **Edge Matchmaking & WAL Saves:** Roteamento BGP de jogadores (<80ms de ping) e proteção Write-Ahead Logging para nunca corromper Saves.
- [ ] **R2 Gate**: all R1 checks green + zero simulated billing path + webhooks tested + restore verified; write `ROUND2_RESULTS.md`

### Round 3 — Native Desktop Engine (multi-phase)
- [ ] **[SONNET]** R3.0 Rust code-reading pass over the **18 existing `.rs` files** first (do not scaffold blind); Tauri hardening — CSP is already restrictive, real gaps are **updater config + code-signing identifiers** (not `csp`/`fs.scope`, which were stale claims); binary IPC channel (camera matrix round-trip benchmarked)
- [ ] **[OPUS]** R3.1 Native WGPU renderer parity: (a) device/swapchain (b) render graph (c) mesh/material (d) Nanite+cull (e) Lumen SDF (f) picking — parity screenshots per sub-phase
- [ ] **[OPUS]** R3.2 Native PTY, FS watcher, persistent job queue, native ML (candle/llama.cpp), toolchain probes; **Sandbox v8::Isolate Estrito:** Prevenção absoluta contra Cryptojacking/Malware em jogos exportados.
- [ ] **[OPUS]** R3.3 `NativeIDEBackend` bound to the 91 panels; Web↔Desktop sync + proxy assets; physics determinism golden-hash test
- [ ] **[SONNET]** R3.4 Signed auto-update Win+macOS (EV signing + notarization)
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
