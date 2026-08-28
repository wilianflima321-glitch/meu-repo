# AI Critique & Technical Debt Registry

**Purpose:** Canonical backlog for external AI critiques (e.g. GLM 5.1) merged with Cursor-session evidence.  
**Audience:** Claude Opus / future agents — validate each item against code + `npm run qa:*` before acting.  
**Post-debt enhancements:** See [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md) — do not implement until `DEBT-*` Tier 1→3 aligned.  
**Executor mega-blocks:** See [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) — **one Wave per session**; supersedes §4 ordering for Claude Opus.  
**Rule:** Do not treat this document as “done.” Every item needs re-verification on the current branch.  
**Last reconciled:** 2026-06-17 (GLM Batch 6 / audit closure — asset loader, terrain, foliage, water, audio reverb, UX hitlist).

---

## How Claude should use this file

1. For each `DEBT-*` item: read cited paths, run relevant gate/test, mark **VALID** / **INVALID** / **PARTIAL**.
2. Prefer implementation order: **Tier 1 → Tier 2 → Tier 3** unless a gate is red.
3. Do not claim market parity (Unreal, Fable, Cursor) without citing held states in code.
4. Cross-check “GLM said” vs “Cursor verified” — several GLM claims are **outdated** after recent splits.

---

## 0. State reconciliation (post-V33, verified in session)

| Area | Status | Evidence |
|------|--------|----------|
| Enterprise QA gate | **GREEN** | `npm run qa:enterprise-gate` exit 0; `v29-total-spine` PASS gates=33 |
| AI tests + typecheck | **GREEN** | 91 tests under `__tests__/ai`; `npm run typecheck` exit 0 |
| PT-BR UI drift (canonical EN) | **Mostly fixed** | Login, studio, compare, IDE triage, apply bridge; gates `qa:i18n-hardcoded-spine`, `qa:hardcoded-copy-ratchet` |
| Monaco diff ghosts | **REAL** | `components/ide/useApplyGhostPreview.ts` — LCS hunks, view zones |
| Scene viewport virtualized outliner | **REAL** | `SceneViewportOutliner.tsx` + `@tanstack/react-virtual` |
| Inspector scrubbing + math | **REAL** | `SceneViewportInspector.tsx`, `ScrubbableInput` |
| Physics canonical path | **REAL** | Rapier WASM; TS physics `@deprecated` |
| Creative AI tools fake success | **FIXED** | `lib/ai-tools-registry.creative.ts` → honest `provider_unavailable` |
| Aethel Fusion router | **REAL (new)** | `lib/ai/intelligent-model-router.ts` + wired in `advanced-ai-provider.ts`, `agent-llm-bridge.ts` |
| Per-model robustness | **REAL (new)** | `lib/ai/model-robustness-profiles.ts` |
| Tool JSON repair | **REAL (new)** | `advanced-ai-provider-normalizers.ts` — `repairJsonLike`, `parseToolArgumentsResult` |
| Self-reflection critic | **REAL (rewired)** | `self-reflection-engine.ts` — LLM verify, fail-closed (was always `passed: true`) |
| Governed tool-bus on registry | **PARTIAL→REAL** | `ai-tools-registry.ts` — enforced for scoped mutating writes in production; legacy unscoped stays observe |
| Admin legacy page fragmentation | **FIXED** | 12 standalone admin pages removed; middleware redirects |
| Desktop terminal PTY | **REVERTED to held** | `desktop_commands.rs` — contract alignment |
| WebSocket god-file | **ALREADY SPLIT** | See DEBT-WS-001 — GLM figure 1443 LoC is **outdated** |

**Uncommitted diff snapshot (2026-06-17):** ~65 files, +813 / −3771 (heavy doc purge + AI/governance layer).

---

## 1. External critique ingest — GLM 5.1 (2026-06-17)

### 1.1 Architecture map (GLM) — largely accurate

| Layer | GLM claim | Cursor validation |
|-------|-----------|-------------------|
| Web `cloud-web-app/web` | Next.js 14, R3F, Monaco+Yjs, Zustand/RQ | **CONFIRMED** (counts vary by gate baseline; use `qa:v29-baseline-inventory`) |
| Desktop `apps/studio-local` | Tauri 2 + Rust probe/sidecars | **CONFIRMED** — UI is Vite React probe, not full IDE |
| Production spine | Evidence ledger + tool bus | **CONFIRMED** — enforcement wiring still **PARTIAL** outside apply path |
| AI | deep-context + tools-registry | **CONFIRMED** — see DEBT-AI-* for gaps |

---

### 1.2 Gargalo 1 — Desktop frontend “void”

**ID:** `DEBT-DESK-001`  
**GLM severity:** Critical  
**Cursor validation:** **PARTIAL 2026-07-11ah** — Studio Local Vite shell + portable-pty + fs emit + honesty surfaces shipped; still **not** a full product-grade local IDE (DESK-001 remains open for depth).

| Field | Value |
|-------|-------|
| Complexity | **L** (4–8 weeks focused) |
| Tier | **2** |
| User impact | High — feels like “website in a frame” vs Zed/Unreal local UX |
| Recommended direction | Vite shell sharing `var(--aethel-*)` tokens: local FS tree, GPU status, sidecar settings, job lane — without duplicating full web IDE |
| Held states | wgpu native renderer, signed installers, full desktop IDE deferred per release manifest |
| Gates to add/run | `qa:studio-local-tauri-hardening`, desktop capability manifest |
| Files | `apps/studio-local/src/StudioLocalApp.tsx`, `lib/studio-local/release-manifest.ts` |

---

### 1.3 Gargalo 2 — WebSocket god-file

**ID:** `DEBT-WS-001`  
**GLM claim:** `websocket-server.ts` ~1443 LoC god-file  
**Cursor validation:** **OUTDATED / PARTIALLY ADDRESSED**

Current layout (2026-06-17):

| File | ~LoC | Role |
|------|------|------|
| `lib/server/websocket-server.ts` | **435** | Entry (under gate max 1120) |
| `websocket-server-lifecycle.ts` | split module | Lifecycle |
| `websocket-server-routing.ts` | split module | Routing |
| `websocket-server-collaboration.ts` | split module | Yjs/collab |
| `websocket-server-file-events.ts` | split module | File events |
| `websocket-server-snapshots.ts` | split module | Snapshots |
| `server/websocket-server.ts` | 45 | Process entry |

| Field | Value |
|-------|-------|
| Complexity | **M** (remaining hardening, not full rewrite) |
| Tier | **3** (monitor; gate already enforces split) |
| Remaining risk | Integration regressions under load; needs soak tests |
| Gate | `npm run qa:websocket-runtime-split` |
| Claude action | Verify GLM claim false; focus on **runtime resilience** tests not re-split |

---

### 1.4 Gargalo 3 — “AAA multimodal bypass” paradox

**ID:** `DEBT-AAA-001`  
**GLM claim:** Line-by-line AI cannot build AAA systems; need Multimodal Bypass / prefabs / Video-to-Mechanic (Frente I70)  
**Cursor validation:** **CONFIRMED** — aligns with held states in engine spine, marketing-claims gate, agent runtime spine.

| Field | Value |
|-------|-------|
| Complexity | **XL** (product strategy + pipeline, not a single PR) |
| Tier | **2** (policy + first real bypass path before promising AAA codegen) |
| What exists | Contracts: asset quality pipeline, governed render, weak-device policy, `releaseReady: false` |
| What’s missing | Executable bypass: prefab inject, WASM asset attach, external provider bridges with receipts |
| Reference | `docs/architecture/audit_backend_spine.md` (verify I70 section exists) |
| Claude action | Map I70 to concrete API routes + one **REAL** bypass demo (e.g. Megascans metadata → scene prefab) |

---

### 1.5 Gargalo 4 — Deep context without AST

**ID:** `DEBT-AI-004`  
**GLM claim:** `deep-context-manager.ts` no real AST; string/shallow search only  
**Cursor validation:** **CLOSED (2026-07-23)** — Native Rust FNV-1a symbol graph & incremental AST indexer implemented in `tree_sitter_ast_indexer.rs`.

| Field | Value |
|-------|-------|
| Complexity | **L** (tree-sitter index + incremental updates) |
| Tier | **1** (blocks multi-file refactor quality) |
| Status | **CLOSED (2026-07-23)** — `tree_sitter_ast_indexer.rs` native AST symbol graph indexer |
| Proposed | web-tree-sitter project index on local/desktop boot; feed Fusion planner with symbol graph |
| Tests needed | Integration: rename propagates to agent context pack |
| Files | `lib/ai/deep-context-manager.ts`, `lib/server/agent-context/assemble-agent-context.ts` |

---

### 1.6 Gargalo 5 — Timeline grammar fragmentation

**ID:** `DEBT-UX-TL-001`  
**GLM claim:** Animation / audio / video timelines use different UX grammars (DOM vs React Flow)  
**Cursor validation:** **PLAUSIBLE** — not re-audited file-by-file in this session; treat as **UNVERIFIED** until Claude scans studio editors.

| Field | Value |
|-------|-------|
| Complexity | **L** |
| Tier | **3** |
| Proposed | Shared canvas timeline primitive (zoom/pan/Bezier/scrub) |
| Claude action | Inventory `studio-registry.ts` editors + film/audio/animation routes; produce convergence RFC |

---

### 1.7 Competitive table (GLM) — Cursor notes

| Competitor | GLM “they win” | Aethel moat (honest) | Validation |
|------------|----------------|----------------------|------------|
| Cursor 3.2 | Multi-file Composer + rollback | 3D/runtime/asset pipeline in one workspace | **PARTIAL** — apply path has rollback; agent loops fragmented |
| Unreal 5.6 | Native viewport Nanite/Lumen | Web collab + agent governance | **CONFIRMED** — render heavy held |
| Zed | GPUI latency | Creative 3D + media orchestration | **CONFIRMED** |
| Figma Dev Mode | Design→code tokens | Design→logic→runtime | **PARTIAL** — tokens enforced; handoff execution incomplete |

**Fable-class agents:** Not in GLM table. Session added **Aethel Fusion** (task-aware router + per-model weakness profiles) — different strategy than single frontier model.

---

## 2. Session-known AI/agent debts (Cursor — not from GLM)

These were found by code audit + gates; GLM may not have listed them.

| ID | Debt | Complexity | Tier | Status |
|----|------|------------|------|--------|
| `DEBT-AI-001` | **3 LLM stacks** (`ai-service`, `advanced-ai-provider`, `ai-provider-config`) — duplicate routing | **L** | **1** | Open |
| `DEBT-AI-002` | **4 agent runtimes** — `agent-mode.ts`, `ai-agent-mode.ts`, `ai-enhanced-lsp.ts`, `ai-debug-assistant.ts` (+ heuristic `AgentOrchestrator`, production contracts) | **L** | **1** | Open — GLM Batch 2 confirmed paths |
| `DEBT-AI-003` | `AgentOrchestrator` heuristic streaming — **fake LLM** (`ORCHESTRATOR_EXECUTION_MODE = 'heuristic'`) | **M** | **2** | Open |
| `DEBT-AI-005` | Tool-bus **observe** on legacy unscoped writes — by design for compat; weak in prod | **S** | **2** | Mitigated for scoped writes |
| `DEBT-AI-006` | Registry evidence **seed** (`cartography:manifestId`, `pre-write:path`) satisfies bus but weaker than `evaluateAgentReadinessForApply` | **M** | **2** | Open |
| `DEBT-AI-007` | System prompts **PT-BR** in `advanced-chat-policy.ts`, `agent-mode-prompts.ts`, `ai-service` vs EN canonical UI | **M** | **2** | Open |
| `DEBT-AI-008` | `agent-validation-integration.ts` (ESLint/tsc fix loop) **not wired** into main chat/agent paths | **M** | **1** | Open |
| `DEBT-AI-009` | Creative providers still **stub** — honest failures only | **L** | **2** | Open (needs one real provider) |
| `DEBT-AI-010` | **Zero GA** studio tools in `studio-registry.ts` | **XL** | **2** | Open |
| `DEBT-AI-011` | Fusion not yet on **advanced chat orchestrator** / `ai-agent-system.ts` fixed `gpt-4o` | **M** | **1** | Partial (agent-mode phases wired) |
| `DEBT-AI-012` | `ai-service.chatStream()` bypasses hardening + temp clamp (raw messages, `temperature ?? 0.7`) | **S** | **1** | **CONFIRMED** — `query()` hardened; `chatStream()` not |
| `DEBT-AI-013` | Fusion router misclassification = economic/quality SPOF (heuristic tiers, no feedback loop) | **M** | **1** | **PLAUSIBLE** |
| `DEBT-AI-014` | JSON repair reactive — syntactic fix may diverge from semantic intent | **M** | **2** | **CONFIRMED** — `repairJsonLike` |
| `DEBT-AI-015` | Fail-closed verification may freeze UX (loops / silent give-up on false positives) | **M** | **2** | **PLAUSIBLE** |
| `DEBT-DESK-002` | Desktop terminal **held** — no real PTY/shell spawn (contract by design) | **L** | **2** | **CLOSED 2026-07-11ah** — `portable-pty` spawn in `desktop_commands.rs` + Studio Local `TerminalPanel`; web path remains cloud-container honesty (`DEBT-TERM-001`) |
| `DEBT-DESK-003` | `fs_watch` captures notify events but discards them — WebView never notified | **M** | **3** | **PARTIAL CLOSED 2026-07-11ah** — emits `fs_event` to UI; `<500ms` latency evidence via helper (unsampled = HELD) |
| `DEBT-DESK-004` | `ai_complete` + `notify_native` = static `provider_unavailable` (no ONNX sidecar) | **L** | **2** | **HELD 2026-07-11ah** — sidecar AI health probe module honest HELD until real ping + SIDECAR-001 |
| `DEBT-PERF-001` | Niagara particle loop allocates `.clone()` Vector3 per frame → GC jitter (violates DoD) | **M** | **3** | **CLOSED (2026-07-23)** — `ParticlePoolSoA` zero-alloc 64-byte aligned pool in `async_bvh_ray_tracer.rs` |
| `DEBT-RENDER-001` | `RenderJob` missing in Prisma; export routes fake job IDs → `/api/render/jobs/[id]` 503 | **L** | **2** | **CONFIRMED** |
| `DEBT-STUDIO-001` | Studio film/vfx pages mock UI (deprecated director, static shot list, blocked actions) | **M** | **2** | **PARTIAL** — `film/page.tsx` verified |
| `DEBT-UX-EV-001` | Visual evidence pipe — `task-evidence-ledger` → WebGL/GIF frames for user | **L** | **2** | **UNVERIFIED** — roadmap |
| `DEBT-NANITE-001` | Nanite meshlet LOD is array subsampling — no real geometric decimation | **L** | **2** | **CONFIRMED** — `simplifyMeshlets()` |
| `DEBT-PERF-002` | Ray-tracing BVH `rebuildBVH()` sync on main thread — recursive sort per scene change | **M** | **2** | **CLOSED (2026-07-23)** — `async_bvh_ray_tracer.rs` lock-free double-buffered swap chain BVH rebuild |
| `DEBT-SSE-001` | Fleet agent SSE (`/api/agents/stream/fleet`) — connected + keepalive only, no event source | **M** | **2** | **CONFIRMED** |
| `DEBT-DESK-005` | Web shell ↔ Rust reactor gap — no zero-copy IPC; scene graph isolated (Three.js vs daemon logs) | **XL** | **2** | **HELD 2026-07-11ah** — JSON IPC remains; zero-copy / shared scene graph not Block 9 CORE |
| `DEBT-FIN-001` | `releaseStorageUsage` read-modify-write race — non-atomic under concurrent deletes | **S** | **2** | **CONFIRMED** — `storage-enforcement.ts` |
| `DEBT-FIN-002` | `getCreditBalance` O(N) ledger aggregate — no cached `creditBalance` on `User` | **M** | **2** | **CONFIRMED** — schema has `storageUsed` only |
| `DEBT-FIN-003` | Admin finance `findMany` all ledger rows → Node heap OOM at scale | **M** | **2** | **CONFIRMED** — `admin/finance/metrics/route.ts` |
| `DEBT-SSR-001` | Asset pipeline uses `document`/`URL.createObjectURL` — SSR crash if imported server-side | **M** | **2** | **HELD 2026-07-11ah** — boundary comment exists; enforcement gate not Block 9 CORE |
| `DEBT-DB-001` | `McpServer` Prisma model missing — APIs use `(prisma as any).mcpServer` silent failures | **M** | **2** | **CONFIRMED** — DELETE returns `{ deleted: true }` even when model absent |
| `DEBT-UX-GIT-001` | `WorkbenchSidebar` mounts `<GitIntegration />` with no props — pending placeholder UI | **S** | **3** | **CONFIRMED** |
| `DEBT-NEXUS-001` | `AethelResearch` — `handleSearch` returns static `PRESET_SOURCES`, no live search | **M** | **2** | **CONFIRMED** — honest "held" copy in summary |
| `DEBT-UX-VS-001` | Visual scripting "Save" — clipboard + console only, no DB/FS persist | **S** | **2** | **CONFIRMED** — `VisualScriptEditor.tsx` ~514–516 |
| `DEBT-PLUGIN-001` | Plugin list/install APIs 100% stub; no `PluginInstall` in Prisma | **M** | **2** | **CONFIRMED** — `app/api/plugins/list/route.ts` |
| `DEBT-MKT-FRAG-001` | Marketplace fragmented across 3 incompatible sources → install/browse mismatch | **M** | **8** | **RESOLVED (2026-06-19) — Catálogo Vivo.** Single canonical catalog `lib/marketplace/catalog.ts` (built-ins + curated, keyed by slug) is now the source of truth. New `GET /api/marketplace/catalog` returns the catalog with the caller's real install state merged from Prisma `InstalledExtension`; the public page consumes it (no more static-only list). `POST /api/marketplace/install` now resolves curated slugs (not just `MarketplaceItem.id`), so curated installs persist instead of 404; `POST /api/marketplace/uninstall` is wired to the UI (real, not local-only). Built-in IDs deduped to one list imported from the catalog module. UI now handles 402 (entitlement) in addition to 403. Remaining federation of Open VSX search results into the same catalog is a separate, optional enhancement (`IMPROVE-MKT-VSX-001`). |
| `DEBT-UX-CANVAS-001` | `CanvasViewportSurface` — Nexus canvas shows "deprecated" placeholder | **S** | **3** | **CONFIRMED** |
| `DEBT-YJS-001` | Yjs fallback handler broadcasts updates but never `Y.applyUpdate` on server doc | **M** | **1** | **CLOSED (2026-07-25)** — Server doc update wired in `legacy-collaboration-handler.ts` ~71, while `yjs_netcode_aaa_ready` & `yjs_automerge_aaa_ready` remain PARTIAL (`false`) in Rust code truth. |
| `DEBT-WS-002` | `docs` Map (Y.Doc) not GC'd when legacy rooms empty — stale doc leak | **M** | **3** | **PLAUSIBLE** — rooms cleaned; `docs` persists |
| `DEBT-STREAM-001` | `CloudStreamStudioClient` hardcodes `sessionManagerConfigured/teardownConfigured: false` → held | **M** | **2** | **CONFIRMED** — WebRTC never mounts |
| `DEBT-STREAM-002` | `dynamicResolution` in codec adjusts stats object — canvas resize wiring unverified | **S** | **3** | **PARTIAL** — `pixel-streaming/codec.ts` ~206–216 |
| `DEBT-EXT-001` | Extension host uses `vm` + native `require` — not a security boundary; sync on Next thread | **L** | **1** | **CONFIRMED** — `extension-host-runtime-loader.ts` |
| `DEBT-SEQ-001` | Sequencer assumes sorted keyframes; editor may write out-of-order → bad interpolation | **M** | **2** | **PLAUSIBLE** — linear scan ~63–71, not binary search (GLM mislabel) |
| `DEBT-SEQ-002` | `SequencerRuntime.applyValue` only implements camera `fov` — other tracks ignored | **M** | **2** | **CONFIRMED** — `sequencer-runtime.ts` ~104–115 |
| `DEBT-SEQ-003` | `buildSequencerRenderExportPlan` static held/needs-review gate — no real export | **S** | **2** | **CONFIRMED** — `sequencer/runtime/render-export.ts` |
| `DEBT-DB-002` | Prisma missing `PluginInstall` (with `McpServer`, `RenderJob`) — extension layer on paper | **M** | **2** | **CONFIRMED** |
| `DEBT-DB-003` | MCP POST returns **201** with empty `{}` when model undefined (`undefined !== null`) | **S** | **1** | **CONFIRMED** — `mcp/servers/route.ts` ~93–100 |
| `DEBT-RENDER-002` | GLB POST 202 fake jobId → poll returns **404** `Render job not found` | **M** | **2** | **CONFIRMED** — extends `DEBT-RENDER-001` |
| `DEBT-FIN-004` | `if (!user.storageUsed)` treats `0` as falsy → full storage recalc every check for new users | **S** | **2** | **CONFIRMED** — `storage-enforcement.ts` ~91 |
| `DEBT-AI-016` | `agent-tool-job-runner` defaults enforcement to `observe` outside production | **S** | **2** | **CONFIRMED by design** — dev/prod divergence risk |
| `DEBT-RENDER-003` | `AAARenderSystem` — empty post-FX stubs; HDR/deferred black screen; `useRenderPipeline` forces `aaaRendererRef = null` | **L** | **2** | **CONFIRMED** — `aaa-render-system.ts`, `useRenderPipeline.ts` ~179 |
| `DEBT-SEARCH-001` | Ripgrep path literal `%USERNAME%` in scoop path — spawn ENOENT on Windows | **S** | **2** | **CONFIRMED** — `search-runtime.helpers.ts` ~139 |
| `DEBT-SEARCH-002` | `embedText` is deterministic hash bag — not neural embeddings | **M** | **2** | **CONFIRMED** — `semantic-code-search.ts` ~181–192 |
| `DEBT-SEARCH-003` | `MAX_INDEXED_FILES = 120` — silent truncation of medium/large workspaces | **M** | **2** | **CONFIRMED** — `semantic-code-search.ts` ~58, ~295 |
| `DEBT-SAVE-001` | `CompressedSerializer` = Base64 (+33% size), not compression; default `compressionEnabled: true` | **S** | **2** | **CONFIRMED** — `serializers.ts`, `manager.ts` ~55 |
| `DEBT-LSP-001` | `LSPServerBase.sendRequest` never calls `getMockResponse` — offline mock dead | **M** | **2** | **CONFIRMED** — `lsp-server-base.ts` ~256–307 |
| `DEBT-LSP-002` | `LSPApiClient` uses `/start`, `/stop/*` — catch-all `[...path]` returns 501 | **M** | **2** | **CONFIRMED** — `lsp-api.ts`, `api/lsp/[...path]/route.ts` |
| `DEBT-WS-003` | WS `eventBus.emit` for `lsp:message`, `ai:stream`, `dap:message` — **no** `eventBus.on` subscribers | **M** | **2** | **CONFIRMED** — `legacy-simple-handlers.ts` |
| `DEBT-NIAGARA-002` | Niagara XYFlow node graph cosmetic — simulation driven only by `emitterConfig` side panel | **L** | **2** | **CONFIRMED** — `NiagaraVFX.runtime.tsx` |
| `DEBT-UX-DOCK-001` | Bottom dock Agents/Terminal fixed 55/45; invalid Tailwind `bg-[var(...)]/2` | **S** | **3** | **CONFIRMED** — `ModernIDEShellCenterStack.tsx` |
| `DEBT-SIDECAR-001` | `v29-sidecar-lifecycle` forces `releaseReady: false` + human-review blocker | **S** | **3** | **HELD by design 2026-07-11ah** — health probe module + releaseReady stays false |
| `DEBT-ASSET-001` | `ModelLoader` flattens GLTF/OBJ to single vertex/index buffers — destroys hierarchy, skeleton, materials | **L** | **2** | **PARTIAL CLOSED 2026-07-11ac** + **J.7 USDZ deepen 2026-08-08** — viewport drop preserves hierarchy via `meshUrl` + `ViewportImportedAssetMesh` (GLTF/FBX/OBJ + **USDZ via Three USDZLoader PARTIAL**); USDA/USD/USDC still **HELD**; cook flatten path may remain; OpenUSD/Hydra not claimed |
| `DEBT-TERRAIN-001` | Terrain `sculpt_smooth` brush = identity `(h,_d)=>h` — no separate smooth pass | **S** | **2** | **CLOSED 2026-07-11ac** — 3×3 neighborhood smooth in `TerrainSculptingEditor` (+ authority parity) |
| `DEBT-PERF-003` | Foliage painter — one `<mesh>` per instance, new geometry each; no `InstancedMesh` | **M** | **2** | **CLOSED 2026-07-11ac** — `FoliageInstances3D` InstancedMesh per typeId |
| `DEBT-PERF-004` | Water Gerstner waves on CPU every frame in `useFrame`; clones position attr each tick | **M** | **2** | **CONFIRMED** — `WaterEditor.parts-runtime.tsx` ~123–159 |
| `DEBT-AUDIO-001` | Reverb convolver created but **no source** routed to `reverbNode` input — zones change wet gain only | **M** | **2** | **CLOSED 2026-07-11ag** — Convolver IR + play() wet send + `setReverbPreset` |
| `DEBT-DESK-006` | `native_kernel.rs` manifest drift — `native-pty-contract` state `Available` vs `desktop_commands` held | **S** | **2** | **CLOSED 2026-07-11ah** — portable-pty live; bridge contract + native_kernel Available aligned |
| `DEBT-UX-HITLIST-001` | `audit_frontend_ui_ux.md` — ~50 UX fronts (A4–A50): loading strings, dockview, canvas timelines | **XL** | **3** | **CONFIRMED** — separate doc; partial items already done |
| `DEBT-AUDIT-001` | External `analysis_results.md` cited by GLM — **not present** in repo at audit time | **—** | **—** | **RESOLVED** — `docs/architecture/analysis_results.md` ingested 2026-06-17 |
| `DEBT-FOLIAGE-001` | `removeCluster` calls `instancedMesh.clear()` — erases **all** instances of foliage type; `cluster.visible` never applied to GPU | **M** | **1** | **CLOSED 2026-07-11ac** — surgical erase + index remap + `setInstanceVisible` |
| `DEBT-CLOUD-001` | Volumetric clouds: depth blend + GodRaysPass wired (letter by); blueNoise optional | **M** | **2** | **CLOSED 2026-07-13by** — `VOLUMETRIC_CLOUDS_SHIP_STATUS=CLOSED`; full volumetric AAA marketing still HELD |
| `DEBT-MOTION-001` | Motion matching: pose DB heap-heavy (Maps of Vector3/Quaternion); `poses.find` O(N) playback; foot lock = lerp not IK | **L** | **2** | **CLOSED 2026-07-11ad** — SOA `Float32Array` + O(1) `getPoseIndex`; two-bone IK when leg chain present (lerp fallback HELD-labeled) |
| `DEBT-NET-001` | Netcode hot path uses `JSON.parse/stringify` state clone + serializer JSON/TextEncoder; linear rollback `find` | **L** | **1** | **CLOSED (2026-07-23)** — `binary_netcode_serializer.rs` bit-packed 16-bit float quantization & zero-copy binary state serialization |
| `DEBT-ADMIN-001` | `create-admin-stubs.mjs` auto-generates empty admin pages ("V34 Dominance Wave") | **S** | **3** | **CONFIRMED** — `scripts/create-admin-stubs.mjs` |
| `DEBT-RT-001` | Path tracer `createDataTextures()` packs only `tri.n0` — `n1`/`n2` discarded at upload (~236–238) | **M** | **2** | **CONFIRMED** — flat shading in RT pass; extends `DEBT-PERF-002` |
| `DEBT-VT-001` | VT `FeedbackBuffer.analyze` uses sync `readRenderTargetPixels`; feedback RT **never rendered** before read — no viewport wiring | **M** | **2** | **CONFIRMED** — `virtual-texture-system.ts` ~242–246; zero consumers call feedback pass render |
| `DEBT-DEST-001` | Fracture: 10³ grid pseudo-Voronoi; `cellToGeometry` XZ `atan2` fan; fragments = JS velocity not Rapier | **L** | **2** | **PARTIAL CLOSED 2026-07-11ad** — ConvexGeometry + normals shipped; Rapier fragment session when attached; Fortune 3D + unattached JS preview remain HELD |
| `DEBT-CLOTH-001` | Cloth CPU Verlet + `SelfCollisionHandler` string hash keys per frame; `GPUClothSimulation` has no collision/skeleton wiring | **M** | **2** | **PARTIAL CLOSED 2026-07-11ad** — numeric spatial hash + bone capsule extract for CPU; GPU cloth collision **HELD** |
| `DEBT-AUDIO-002` | `generateVoice()` returns empty `createBuffer` (silence) — lipsync → viseme `sil` | **M** | **2** | **CLOSED 2026-07-11ag** — formant synth + Bridge TTS attempt; lipsync receives energy |
| `DEBT-VR-001` | Foveation shader darkens periphery only; `applyToLayer()` never called in `onXRFrame` | **M** | **2** | **PARTIAL 2026-07-11ag** — `applyToLayer` in frame loop; viewport entry + marketing still HELD |
| `DEBT-TERM-001` | xterm → WS → `node-pty` spawns shell on **Node server host** (cloud container), not user machine; no Tauri/desktop bridge in `components/terminal/*` | **L** | **1** | **PARTIAL CLOSED 2026-07-11ah** — honesty badge + `/api/runtime/desktop-honesty`; cloud path labeled; desktop PTY live in Studio Local |
| `DEBT-UX-DASH-001` | Dashboard first-fold banner stack: `TrialBanner` + `DashboardRoutingNotice` + `DashboardAlertBanners` + `DashboardEntryIntentBanner` — not Linear-minimal | **S** | **2** | **CONFIRMED** — `DashboardShell.tsx` ~113–151 |
| `DEBT-ROUTE-001` | Route surface inflation: registry 62 paths; 13 PROTOTYPE/ASPIRATIONAL hidden; 20 ALPHA partial; gate `check-hidden-route-leak.mjs` PASS but confirms stub routes exist | **M** | **2** | **CONFIRMED** — `route-maturity-registry.ts`; 13/62 = 21% hidden (53% if ALPHA counted as partial) |
| `DEBT-FIN-005` | Stripe `subscription.deleted/updated` does not downgrade `User.plan` to `free` — Pro/Studio persists after cancel | **S** | **1** | **CONFIRMED** — `billing/webhook/route.ts` ~101–111 |
| `DEBT-FIN-006` | Credit transfer race — balance check outside txn; no `SELECT FOR UPDATE` | **M** | **1** | **CONFIRMED** — `credits/transfer/route.ts` ~92–103 |
| `DEBT-FIN-007` | `getCreditBalance` ignores pending reservations → parallel AI spends can double-deduct | **M** | **1** | **CONFIRMED** — `credit-wallet.ts` ~47–62 vs `reserveCredits` |
| `DEBT-FIN-008` | No model token weight multipliers (1×/40×/200×) in `consumeMeteredUsage` | **M** | **1** | **CONFIRMED** — `metering.ts`; Opus exhaust = platform loss |
| `DEBT-FIN-009` | AI chat/stream pre-charge estimated tokens only — no post-call weighted settle | **M** | **1** | **CONFIRMED** — `ai/chat/route.ts` ~145; no `settleCredits` |
| `DEBT-FIN-010` | `plans.ts` vs `plan-limits.ts` vs product spec drift (Starter $20 vs $9, storage, tokens) | **M** | **2** | **CONFIRMED** — see `billing_security_analysis.md` §4.1 |
| `DEBT-BILLING-001` | BYOK (Bring Your Own Key) not implemented — no user API key storage or billing bypass | **L** | **2** | **CONFIRMED** — grep zero BYOK in web |
| `DEBT-INFRA-001` | Cloudflare R2 zero-egress deploy not wired — Aethel Deploy CDN cost model unimplemented | **L** | **2** | **CONFIRMED** — no R2 in codebase |
| `DEBT-FIN-011` | `usageBucket` synchronous increment per AI call → Postgres row lock contention under parallel agents | **M** | **1** | **PLAUSIBLE** — `metering.ts` txn; mitigate Redis buffer + batch flush |
| `DEBT-FIN-012` | Credit transfer without deterministic lock order → mutual transfer deadlock | **M** | **1** | **PLAUSIBLE** — `credits/transfer/route.ts`; fix sorted UUID FOR UPDATE |
| `DEBT-FIN-013` | Plan downgrade relies on webhook only — delayed/failed webhook = free Pro access | **M** | **1** | **CONFIRMED** — add lazy Stripe reconcile in entitlements |
| `DEBT-UX-DASH-002` | Dashboard entry banner tunnels to AI Chat instead of restoring IDE workspace state | **S** | **2** | **CONFIRMED** — `DashboardEntryIntentBanner.tsx` ~58 `Resume in AI Chat` |
| `DEBT-DESK-007` | Parallel Electron templates (`runtime-templates/`) vs canonical Tauri 2 (`apps/studio-local/`) — duplicate packaging, ~100MB vs ~5MB | **M** | **0** | **CLOSED 2026-07-11ah** — `runtime-templates/QUARANTINED.md`; manifest `quarantined-not-ship-path`; sole ship = Tauri |
| `DEBT-ADMIN-002` | **12** admin subdirs have panel components but no `page.tsx` — direct nav → Next 404 (ai-agents, monitoring panels, etc.) | **S** | **2** | **PARTIAL** — user cited 18; filesystem count = 12 orphans |
| `DEBT-CSP-001` | Production CSP `connect-src` omits `localhost` / `127.0.0.1` — blocks hybrid cloud IDE → local MCP / playtest | **S** | **1** | **CONFIRMED** — `middleware.ts` ~41 |
| `DEBT-OPS-001` | Upstash rate-limit failure → global 503 fail-closed; should tier fail-open for authenticated IDE APIs | **M** | **1** | **CONFIRMED** — `middleware.ts` ~329–349; policy in `billing_security_analysis.md` §11 |

**Audit status (2026-06-17):** Batches 9–14 ingested (billing v3, 26-point UX audit, ops resilience). Total tracked debts: **~89 `DEBT-*`**.

---

## 3. Complexity legend

| Label | Meaning | Typical effort |
|-------|---------|----------------|
| **S** | Small, contained PR | 1–3 days |
| **M** | Medium, few modules | 1–2 weeks |
| **L** | Large cross-cutting | 3–8 weeks |
| **XL** | Strategy + multiple spines | Quarter-scale |

---

## 4. Recommended execution order (for Claude Opus)

> **Canonical executor brief:** [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) — 9 mega-Waves (Agent → Collab → Render → World → Character → Platform → UX → Sensory → Desktop).  
> The numbered list below is the **evidence catalog**; Claude must not cherry-pick single IDs outside a Wave.

### Tier 1 — Robustness & truth (do first)

1. `DEBT-AI-012` — Harden `ai-service.chatStream()` same as `query()` + `advanced-ai-provider.stream()`.
2. `DEBT-YJS-001` — Fix Yjs fallback: `Y.applyUpdate(doc, update)` + sync state for late joiners.
3. `DEBT-DB-003` — Fix MCP POST false 201; honest 503 until model exists.
4. `DEBT-EXT-001` — Replace `vm` extension host with isolated worker/subprocess or disable marketplace.
5. `DEBT-AI-001` — Unify LLM provider/router (Fusion as single entry).
6. `DEBT-AI-002` + `DEBT-AI-011` — Single agent loop; retire fixed models; wire validation loop.
7. `DEBT-AI-004` — AST/symbol index for deep context (biggest quality lift for codegen).
8. `DEBT-AI-008` — Wire code validator into agent execute path.
9. `DEBT-AI-013` — Router misclassification guardrails (feedback / escalation path).

### Tier 2 — Product credibility

7. `DEBT-AI-009` — One real creative provider (image or TTS) with receipts.
8. `DEBT-AI-006` — Align registry evidence with read-receipt store (same as apply path).
9. `DEBT-DESK-001` — Desktop workspace shell (not full IDE).
10. `DEBT-AAA-001` — First multimodal bypass vertical slice.
11. `DEBT-RENDER-001` — Prisma `RenderJob` model + real export job pipeline.
12. `DEBT-STUDIO-001` — Replace mock film/vfx studio pages with governed agent actions.
13. `DEBT-UX-EV-001` — Visual evidence pipe (ledger → viewport frames / AST diff).
14. `DEBT-AI-014` — Semantic validation layer on top of JSON repair.
15. `DEBT-SSE-001` — Wire fleet SSE to real agent status source (Prisma poll / pub-sub / Yjs).
16. `DEBT-FIN-002` — Cached atomic `creditBalance` on `User` (eliminate O(N) aggregate).
17. `DEBT-FIN-003` — Admin finance metrics → SQL `GROUP BY` not `findMany` + `.forEach`.
18. `DEBT-DB-001` — Add `McpServer` model or honest 503 on all MCP routes (fix silent DELETE).
19. `DEBT-NANITE-001` — Real LOD decimation or relabel feature (stop "Nanite" naming).
20. `DEBT-PERF-002` — Async BVH build (Worker / WebGPU compute).
21. `DEBT-DESK-005` — Shared scene-graph protocol (zero-copy or binary IPC) web ↔ Tauri.
22. `DEBT-NEXUS-001` — Live research lane or explicit held gate in UI.

### Tier 3 — Polish & convergence

23. `DEBT-UX-TL-001` — Timeline grammar RFC + pilot.
24. `DEBT-AI-003` — Remove or relabel heuristic orchestrator UI.
25. `DEBT-AI-007` — EN canonical prompts audit.
26. `DEBT-WS-001` — Soak/load tests only (split already done).
27. `DEBT-DESK-003` — Bridge `fs_watch` notify events to WebView.
28. `DEBT-PERF-001` — Niagara DOD refactor (SoA buffers, no per-frame `.clone()`).
29. `DEBT-AI-015` — Fail-closed UX: explain freeze states to user.
30. `DEBT-DESK-002` / `DEBT-DESK-004` — Real local PTY + ONNX sidecar (held until manifest allows).
31. `DEBT-FIN-001` — Atomic storage decrement (`UPDATE ... SET storageUsed = GREATEST(0, storageUsed - $n)`).
32. `DEBT-SSR-001` — Enforce `@aethel-heavy-async-boundary` gate; move asset ops to worker/Tauri.
33. `DEBT-UX-GIT-001` — Wire Git panel to `/api/git/*` or Tauri native git.

---

## 5. GLM claims requiring explicit Claude re-check

| Claim | Likely verdict | Command / path |
|-------|----------------|----------------|
| WebSocket 1443 LoC god-file | **FALSE today** | `wc -l lib/server/websocket-server.ts`; `qa:websocket-runtime-split` |
| Desktop UI is static placeholder only | **PARTIAL** | Read `StudioLocalApp.tsx` |
| deep-context 78→319 LoC | **STALE** (~277 now) | `lib/ai/deep-context-manager.ts` |
| Frente I70 in audit_backend_spine | **UNVERIFIED** | `docs/architecture/audit_backend_spine.md` |
| ~114 pages / ~355 API routes | **DRIFT** | `npm run qa:v29-baseline-inventory` |
| Prisma 51 models covered | **LIKELY TRUE** | `qa:v29-prisma-model-coverage` |
| `chatStream` bypasses Fusion hardening | **CONFIRMED** | `lib/ai-service.ts` ~383–409 vs `query()` ~135–139 |
| Desktop terminal spawns real shell | **FALSE (held)** | `desktop_commands.rs` `terminal-held` |
| `fs_watch` forwards to WebView | **FALSE** | `desktop_commands.rs` `Ok(_event) => {}` |
| `RenderJob` in Prisma | **FALSE** | `grep RenderJob schema.prisma` |
| Niagara particles DOD-compliant | **FALSE** | `NiagaraParticleEmitter.runtime.ts` `.clone()` in loop |
| `film/page.tsx` fully functional studio | **FALSE** | "Director Mode (Nexus Deprecated)" placeholder |
| Nanite `simplifyMeshlets` does real decimation | **FALSE** | `nanite-meshlet-builder.ts` — arithmetic subsample only |
| BVH rebuild is async / off main thread | **FALSE** | `ray-tracing.ts` `rebuildBVH()` sync traverse + build |
| Fleet SSE pushes agent status events | **FALSE** | `app/api/agents/stream/fleet/route.ts` — keepalive only |
| `McpServer` exists in Prisma | **FALSE** | `schema.prisma`; list returns `[]` + `schemaPending` (not `null`) |
| MCP DELETE fails when model missing | **FALSE** | Returns `{ deleted: true }` silently |
| `User.creditBalance` cached field | **FALSE** | Only `storageUsed` cached; ledger aggregate |
| `GitIntegration` wired in workbench | **FALSE** | `WorkbenchSidebar.tsx` — no props |
| `AethelResearch` performs live web search | **FALSE** | `PRESET_SOURCES` static pack |
| Visual scripting Save persists to project | **FALSE** | `VisualScriptEditor.tsx` — clipboard only |
| Plugin install API functional | **FALSE** | `plugins/list` + `install` → 503 / empty |
| Nexus Canvas viewport active | **FALSE** | `CanvasViewportSurface.tsx` deprecated text |
| Yjs fallback applies updates to server doc | **FALSE** | `legacy-collaboration-handler.ts` — broadcast only |
| MCP POST fails without Prisma model | **FALSE** | Returns 201 + `{}` when `server === undefined` |
| GLB export poll succeeds after 202 | **FALSE** | `render/jobs/[id]` → 404 not found |
| `storageUsed === 0` uses cache | **FALSE** | `!user.storageUsed` triggers full recalc |
| Extension `vm` sandbox is secure | **FALSE** | native `require` + `process.env` exposed |
| Sequencer moves transforms/lights | **FALSE** | `applyValue` — camera `fov` only |
| AAA render pipeline active in viewport | **FALSE** | `aaaRendererRef.current = null` in hook |
| SSAO/SSR/Bloom methods implemented | **FALSE** | `aaa-render-system.ts` ~260–280 empty stubs |
| Semantic search uses real embeddings | **FALSE** | `embedText` hash bag in `semantic-code-search.ts` |
| Ripgrep works with Scoop on Windows | **FALSE** | Literal `%USERNAME%` path |
| LSP mock mode works offline | **FALSE** | `sendRequest` always fetches `/api/lsp/request` |
| WS lsp/ai/dap channels have handlers | **FALSE** | emit only, no `eventBus.on` in prod code |
| Niagara node graph drives simulation | **FALSE** | Only `emitterConfig` from side panel |
| Save compression reduces size | **FALSE** | Base64 inflates ~33% |
| GLTF import preserves skeleton/hierarchy | **FALSE** | `ModelLoader` flat buffer only |
| Terrain smooth brush works | **FALSE** | `sculpt_smooth` identity function |
| Foliage uses GPU instancing | **FALSE** | Per-instance `<mesh>` |
| Water waves computed on GPU | **FALSE** | Gerstner CPU loop in `useFrame` |
| Spatial reverb audible in zones | **FALSE** | No source → `reverbNode` |
| `analysis_results.md` in repo | **FALSE** | Not found — `DEBT-AUDIT-001` |
| Scene outliner lacks virtualization | **OUTDATED** | `SceneViewportOutliner` has `@tanstack/react-virtual` |

---

## 6. Parallel workflow (user + GLM critic + Cursor registry + Claude executor)

| Role | Responsibility |
|------|----------------|
| **User** | Paste GLM / external critique text into Cursor chat |
| **GLM 5.1** | Read-only critic — architecture verdicts, gap analysis |
| **Cursor** | **Registry maintainer only** — validate claims vs code, append to this file; **do not implement** unless user explicitly asks |
| **Claude Opus** | Validate GLM vs Cursor tags; resolve conflicts; own Tier 1→3 execution |

**Anti-hallucination rule for all AIs:** If an item is not verified by file path + gate/test, tag it `UNVERIFIED` in section 5.

---

## 7. Changelog
### 2026-08-22 engine backend sweep (items 1-8 closed)

Evidence in AETHEL_FOCUS1_EXECUTION_PROGRESS.md rows 2026-08-22:

- MPSC channel closed: substrates consume published params per frame (VSM pool budget clamp, Radiance target intensity, Entropy impulse override, FSR audio-impact shake) — the channel is real, not a contract stub.
- Multi-GPU pin policy: GOLDEN_PIN_HARDWARE_NOTE documents vulkan-rtx-class pins; cross-vendor = re-pin or tolerance band, never fudge.
- Temporal history in the resolve (anti-shimmer; frame 1 raw so goldens hold) + Radiance GI accumulation (alpha 0.15, race-free per-index blend).
- RCAS-class sharpen in FSR (contrast-adaptive cross Laplacian; documented as NOT an AMD bit-port).
- Terminal time-machine backend: ewind_events_to(tick) replays the structured event ring without mutating it.
- Full frame-graph one-shot: all compute passes in ONE encoder/ONE submit with canonical PASS_ORDER (draw pass deferred to PP-02).
### REMAINING INTERNAL BACKLOG (2026-08-22, backend-only - canonical list)

Noted from the 2026-08-22 analysis. Everything below is BACKEND (zero UI); the UI-side blocker (PP-01/02/04 product present) belongs to the Founder/Claude UI domain and is recorded separately in the Master Map.

R-B1. VSM shadow sample is NOT yet wired into the material resolve - the substrate-level sample pass exists and is device-proven (lit > shadowed), but the resolve shader does not consume it yet. Wire: resolve binds VSM atlas + params, computes the shadow factor from the surface world position, multiplies the diffuse term. Needs the raster to write a world-position buffer alongside the vis buffer.
R-B2. VSM and Radiance are fed by SYNTHETIC casters (blob / single occluder), not real scene geometry. Real-scene fixtures: VSM write from actual meshlet depth; Radiance occluders from scene AABBs. Until then every shadow/GI evidence is substrate-scope, not scene-scope.
R-B3. Radiance cascade is proven at substrate level only; product-graph consumption (real frame graph in the product present) is pending PP.
R-B4. Cross-GPU validation: golden pins are vulkan-rtx-class; the tolerance-band policy is documented (GOLDEN_PIN_HARDWARE_NOTE) but NOT validated on AMD/Intel hardware.
R-B5. Real-scene measurement at scale: no large-scene perf budgets measured (draw-call counts, PSO compile stutter, memory at AAA density). The G-ACC ladder needs measured numbers, not substrate numbers.
R-B6. FSR ladder item ">=720 to 1080 with history": substrate is 2x (320-640 / 540-1080); the 1.5x path (720p -> 1080p) is NOT implemented.
R-B7. RCAS has no golden pin (documented as RCAS-class, not AMD bit-port) - parity forbidden until pinned.
R-B8. Temporal history exists for the resolve but NOT for the product draw pass (draw pass joins at PP-02).
R-B9. Entropy is 4k uniform chunks; voronoi-cooked fracture (Chaos-class) is NOT implemented and NOT claimed.
R-B10. HELDs requiring Founder/toolchain decisions: OpenUSD (C++ toolchain), ONNX native, MaterialX, OpenVDB, sqlite-vec, lora weights, sqlite native ABI.
R-B11. World Forge reification: GF-WORLD web fixture exists; the engine-side large-scale population (kernel densification is grid_extent 2 by design) is not yet a product-density path.
R-B12. Audio-render cue is shake-only; per-scenario audio-visual links (reverb-scene tint, muzzle flash timing) are not implemented.
### 2026-08-22 honesty mirrors audit (kernel <-> TS)

Audited all 44 *honesty* mirrors. Conclusion: the mirror system is healthy — mirrors are declarative (letters/doctrine); the only NUMERIC mirrors are kernel-asset-quality-gate-honesty.ts (bw, anti-drift GAP1-3) and kernel-load-scale-honesty.ts (sf). metasounds-compiler.ts (Web Audio, S4.0) and kernel metasounds_dsp_compiler (DSP bake) are documented as DISTINCT LAYERS, not mirrors. Added a cross-layer anti-drift contract: kernel_baked_cascade_constants_are_pinned_through_the_wire pins the kernel's real adiance_cascades_gi constants (3 levels) through its wire against the engine's interactive 2-ring substrate — a kernel refactor now fails a test instead of drifting silently.
### 2026-08-20 GPU terminal substrate (TT-01..TT-06)

Added (evidence in AETHEL_FOCUS1_EXECUTION_PROGRESS.md 2026-08-20 row gpu-terminal-tt):

- Glyph atlas (VRAM) + cell diff + ONE indexed draw call + pixel readback proof — Alacritty-class pipeline architecture, no parity claim.
- Typed object shell (TerminalEvent records with severity/3D anchor/tick_id) — AI workers read raw structs, never parsed text (aligned with the existing binary SAB ring + RollbackJournal, not a duplicate).
- CPU-priority fixes: dirty-list emit O(delta), O(1) scroll ring, measured emit metrics + ingest soak. Honest CPU/GPU split: PTY ingest is CPU-inherent; render is a single GPU draw call; the target is CPU O(delta) + render O(1) — measured, not asserted.
### 2026-08-20 closing pass (engine backend rounds - zero UI)

Struck (evidence in AETHEL_FOCUS1_EXECUTION_PROGRESS.md rows 2026-08-20):

- **CIEDE2000 half-angle bug** (kernel spectral_light_pipeline) - sin(rad(dh/2)) restored; Sharma reference pairs validate (pair1 = 2.0425). Test green 1813/1813.
- **narrative tension fail-closed** - 	ension_at ignores the envelope for NaN/negative time.
- **CostGuard durability (TOCTOU / restart leak)** - append-only JSONL journal with AWAITED flushes on all four transitions, replay field validation + ceiling re-clamp, hasHold adapter confirmation (recovered pool holds fail closed to cancelled), durable derives from write health, incomplete flag on malformed lines, redacted path.
- **WebGPU device-loss recovery** - single-attempt auto-recovery, serialized init, stale-handler identity guard, getHealth().
- **vitest harness repair** - Windows ESM module-identity (3 instances of chunk-artifact proven by tracing); patch direction corrected to uppercase + self-heal; pool: vmThreads on win32 only.
- **Real-device validation class** - CullingFrustum._pad2: array<u32,3> illegal in uniform (naga) -> 3 scalars; VsmStats buffer 16B vs WGSL 20B (5th atomic) fixed; GF-MESH-001 GPU parity PROVEN on RTX 3060/Vulkan (coverage exact 400/400; depth 8-bit <=1 silhouette pixel; FMA drift <=0.02 documented).
- **Hard Gate #72 fixtures** - GF-MESH-001 (Rust golden + Hi-Z win 66.7%), GF-WORLD-001/002/003 (web), GF-AI-001/002/003 (web), GF-INTEGRATED-SCENE-001 (P1+P2+P3+P4 in one tick loop), substrates device validation (VSM/Radiance/FSR/Entropy).
- **PP-01/03 backend** - persistent product-session present consumes GF evidence (golden pin + device parity + substrate validation) in PersistentPresentLiveMetrics; product_present_ready stays false (PP-02/04 pending).
- **Hygiene** - fixer1-5.rs/exe, error.txt, fail logs, .f3/.f4_build, web temp files, one-off scripts deleted; orphan baseline regenerated (kernel 344 documented bin); kernel .cargo/config.toml (weight gate PASS).

| Date | Author | Change |
|------|--------|--------|
| 2026-06-17 | Cursor session | Initial registry: GLM ingest + session debts + reconciliation |
| 2026-06-17 | Cursor session | Marked websocket split OUTDATED; enterprise-gate GREEN noted |
| 2026-06-17 | GLM Batch 2 | Fusion vs Fable verdict; desktop stubs; Niagara DoD; RenderJob 503; chatStream gap |
| 2026-06-17 | Cursor session | Workflow: Cursor = annotate only; Claude = validate + implement |
| 2026-06-17 | GLM Batch 3 | Nanite, BVH, SSE, finance, MCP, SSR, Git/Nexus |
| 2026-06-17 | GLM Batch 4 | Yjs state loss, vm sandbox, visual scripting, plugins, sequencer, MCP 201 |
| 2026-06-17 | GLM Batch 5 | AAA render placebo, fake embeddings, ripgrep scoop, LSP/WS orphans, Niagara graph, save b64 |
| 2026-06-17 | GLM Batch 6 / closure | Asset flatten, terrain smooth, foliage/water perf, reverb routing, UX hitlist; audit complete |
| 2026-06-17 | User Batch 9 / simulation audit | `analysis_results.md` created; `DEBT-FOLIAGE-001`, `DEBT-CLOUD-001`, `DEBT-MOTION-001`, `DEBT-NET-001`, `DEBT-ADMIN-001`; `DEBT-AUDIT-001` resolved |
| 2026-06-17 | User Batch 10 / advanced engine | `DEBT-RT-001`, `DEBT-VT-001`, `DEBT-DEST-001`, `DEBT-CLOTH-001`, `DEBT-AUDIO-002`, `DEBT-VR-001`; reconfirm `DEBT-PERF-002`, `DEBT-NANITE-001` |
| 2026-06-17 | User Batch 11 / terminal, dashboard, routes | `DEBT-TERM-001`, `DEBT-UX-DASH-001`, `DEBT-ROUTE-001`; reconfirm `DEBT-DESK-002` |
| 2026-06-17 | User Batch 12 / billing bootstrap | `DEBT-FIN-005`–`010`, `DEBT-BILLING-001`, `DEBT-INFRA-001`; `billing_security_analysis.md`, `implementation_plan.md` |
| 2026-06-17 | User Batch 13–14 / 26-point UX audit | `DEBT-UX-DASH-002`, `DEBT-DESK-007`, `DEBT-ADMIN-002`, `DEBT-CSP-001`, `DEBT-OPS-001`; `critical_user_experience_audit.md` v2 |
| 2026-07-11ad | Block 5 Character CORE | `DEBT-MOTION-001` CLOSED; `DEBT-DEST-001` / `DEBT-CLOTH-001` PARTIAL (Fortune 3D + GPU cloth collision HELD); GAS IPC HELD |
| 2026-07-11ah | Block 9 Desktop native CORE | `DESK-002/006/007` CLOSED; `DESK-003` PARTIAL (emit live, latency evidence helper); `TERM-001` PARTIAL honesty; `DESK-004/005`, `SIDECAR-001`, `SSR-001` HELD; AgentShellPolicy #48 CI |
| 2026-07-11ai | AI-v1-f J.8 BrowserOperator CORE | Governed allowlist fetch/snapshot + CreativeBridge CostGuard + evidence ledger **CLOSED**; full Chromium CDP/Playwright farm **HELD**; IMPROVE-AI-009 → J.8 CORE (farm depth remains) |
| 2026-07-11aj | AI-v1-g J.10 LiveVoice CORE | PTT/generate→play + CreativeBridge CostGuard + waveform/lipsync + evidence ledger **CLOSED**; full-duplex WebRTC room **HELD**; IMPROVE-AI-011 → J.10 CORE (duplex depth remains) |

---

## 9. GLM Batch 2 — Fusion vs Fable 5 (2026-06-17)

### 9.1 Veredito honesto — dois paradigmas

| Paradigma | Descrição (GLM) | Aethel today |
|-----------|-----------------|--------------|
| **Fable 5** | Monólito frontier — confia que trilhões de parâmetros resolvem planejamento, auto-correção, tool-use | N/A — competidor externo |
| **Aethel Fusion** | Orquestração modular — modelos frágeis + "armadura" externa (grounding, temp clamp, JSON sanitize, fail-closed tool bus) | **REAL** — `intelligent-model-router.ts`, `model-robustness-profiles.ts`, governed `tools-registry.ts` |

**Moat real (GLM + session aligned):** IDE + agentes + governança + Fusion — **não** fidelidade gráfica Unreal/Runway. Held: wgpu nativo, R3F web limitado.

**Quatro peças únicas no mercado (GLM claim):** Monaco collab multiplayer + agentes background + governança local + router de custos Fusion. Cursor lacks 3D scene; Unreal lacks native agent orchestration; Replit lacks heavy-asset local governance. **Cursor note:** marketing claim — validate per release manifest before external copy.

### 9.2 Eixos de comparação — validação Cursor

#### Eixo 1 — Custo e escalabilidade

| | Detail |
|---|--------|
| **Onde estamos** | `intelligent-model-router.ts` — tiers best/budget/free; cheap models for simple tasks |
| **Gargalo** | Heurísticas fixas (custo + complexidade). Misclassification → modelo fraco (cascade failure) ou tokens caros desperdiçados |
| **ID** | `DEBT-AI-013` |
| **Validation** | **PLAUSIBLE** — router uses `TaskComplexity` heuristics; no observed feedback loop |

#### Eixo 2 — Alucinação e robustez de chamada

| | Detail |
|---|--------|
| **Onde estamos** | Per-family profiles + dynamic temp clamp on `advanced-ai-provider` `complete()` / `stream()` |
| **Falha crítica** | `ai-service.chatStream()` ignora hardening — transmite mensagens cruas, `temperature ?? 0.7` |
| **ID** | `DEBT-AI-012` |
| **Validation** | **CONFIRMED** — lines ~383–409 `ai-service.ts`; sync `query()` uses `applyModelRobustnessHardening` + `clampTemperatureForModel` |
| **Impacto** | Chat avançado com streaming na UI roda "desprotegido" enquanto rota síncrona está blindada |

```typescript
// GLM citation — confirmed in ai-service.ts chatStream (~383-409)
messages: params.messages.map(m => ({ role: m.role, content: m.content })),
temperature: params.temperature ?? 0.7,  // no clamp
```

#### Eixo 3 — Tool JSON e governança de escopo

| | Detail |
|---|--------|
| **Onde estamos** | `enforceAgentScope` in `tools-registry.ts` — `TOOL_BUS_BLOCKED` fail-closed for out-of-workspace writes |
| **Gargalo** | JSON repair (`repairJsonLike`) is **reactive** — syntactic recovery may not match semantic intent |
| **ID** | `DEBT-AI-014` |
| **Validation** | **CONFIRMED** |

#### Eixo 4 — Verificação fail-closed vs critério interno

| | Detail |
|---|--------|
| **Onde estamos** | 91 AI tests green; headless deterministic validation before local commit |
| **Gargalo** | Fail-closed safe but may freeze UX — false positive validator / minor compile fail → agent loop or silent give-up |
| **ID** | `DEBT-AI-015` |
| **Validation** | **PLAUSIBLE** — needs UX audit on agent freeze paths |

### 9.3 Crítica do plano de ação GLM — merge com session debts

| GLM priority | Maps to | Cursor validation |
|--------------|---------|-------------------|
| Unificar 3 stacks LLM no Router Fusion | `DEBT-AI-001` | **CONFIRMED** — `ai-service`, `advanced-ai-provider`, `agent-llm-bridge` diverge |
| Unificar 4 runtimes de agente (Plan→Execute→Observe + Zod) | `DEBT-AI-002` | **CONFIRMED** — paths: `agent-mode.ts`, `ai-agent-mode.ts`, `ai-enhanced-lsp.ts`, `ai-debug-assistant.ts` |
| Aposentar stubs / streaming heurístico | `DEBT-AI-003` | **CONFIRMED** — `ORCHESTRATOR_EXECUTION_MODE = 'heuristic'` |
| UI honesta (log cru, arquivos pendentes) | `DEBT-AI-003`, `DEBT-STUDIO-001` | **PARTIAL** |

### 9.4 Arquitetura alvo — loop único (GLM diagram)

```
[Intent do Usuário]
       │
       ▼
┌──────────────┐
│  Aethel UX   │  Monaco / R3F
└──────┬───────┘
       │ Request
       ▼
┌──────────────┐
│ Aethel Fusion│  intelligent-model-router → model + hardening
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Agent Loop   │  Plan → Execute → Observe (Zod state schemas)
└──────┬───────┘
       ├─────────────────────────┐
       ▼ Execute Write           ▼ Observe State
┌──────────────┐          ┌──────────────┐
│  Tool Bus    │          │  Evidences   │  task-evidence-ledger
└──────┬───────┘          └──────┬───────┘
       │ fail-closed             │ bake visuals / AST diff
       ▼                         ▼
  [VFS / File] ────────────► [Commit / Rollback]
```

**Claude action:** Implement as single spine; retire parallel loops in Tier 1.

### 9.5 Próximas frentes de discussão (GLM options — for Claude RFC)

| Option | Topic | Primary DEBT IDs |
|--------|-------|------------------|
| A | Router unificado — assinatura única absorvendo `ai-service` + streaming | `DEBT-AI-001`, `DEBT-AI-012` |
| B | Loop de agente unificado — state machine | `DEBT-AI-002`, `DEBT-AI-011` |
| C | Visual evidence pipe | `DEBT-UX-EV-001` |

---

## 10. GLM Batch 2 — "Reator" local + engine gaps (2026-06-17)

### 10.1 Desktop kernel stubs (`desktop_commands.rs`)

#### A — Terminal "de mentira" (`terminal-held`)

| Field | Value |
|-------|-------|
| **GLM claim** | `terminal_create` / `terminal_write` não instanciam PTY real — grava string em memória, estado `held` |
| **ID** | `DEBT-DESK-002` |
| **Validation** | **CONFIRMED by design** — contract `qa:v29-desktop-bridge-commands`; web uses node-pty, desktop does not |
| **Claude action** | Document held state; implement real PTY only when release manifest promotes |

#### B — Monitor de arquivos cego (`fs_watch`)

| Field | Value |
|-------|-------|
| **GLM claim** | `notify` thread captures events but discards — frontend never updates file tree |
| **ID** | `DEBT-DESK-003` |
| **Validation** | **CONFIRMED** — `Ok(_event) => { /* captured, not forwarded */ }` |
| **Files** | `apps/studio-local/src-tauri/src/desktop_commands.rs` |

#### C — IA local e notificações stub

| Field | Value |
|-------|-------|
| **GLM claim** | `ai_complete`, `notify_native` → hard `provider_unavailable`; no ONNX runtime / sidecar |
| **ID** | `DEBT-DESK-004` |
| **Validation** | **CONFIRMED** — tests assert `provider_unavailable` |
| **Claude action** | Wire sidecar when packaged; until then honest held responses |

### 10.2 Violação "Lei 2" DoD — Niagara VFX

| Field | Value |
|-------|-------|
| **GLM claim** | `NiagaraParticleEmitter.runtime.ts` — per-particle JS object loop with `.clone()` on Vector3 every frame → GC jitter |
| **Philosophy** | `aethel_architecture_philosophy.md` — contiguous memory, loops off main JS scope |
| **ID** | `DEBT-PERF-001` |
| **Validation** | **CONFIRMED** — `p.velocity.add(this.config.gravity.clone()...)`, `p.velocity.clone().multiplyScalar(...)` |
| **Claude action** | SoA particle buffers or WASM worker; gate FPS under 1k particles |

### 10.3 RenderJob inexistente — export pipeline quebrado

| Field | Value |
|-------|-------|
| **GLM claim** | `usdz/route.ts`, `wav/route.ts`, `mp4/route.ts` create fake job IDs; `/api/render/jobs/[jobId]` returns 503 `schemaPending` |
| **ID** | `DEBT-RENDER-001` |
| **Validation** | **CONFIRMED** — no `model RenderJob` in Prisma schema; route catches query error |
| **Files** | `app/api/render/jobs/[jobId]/route.ts`, export routes under `app/api/` |

### 10.4 Vazamento de governança no chat avançado (streaming)

Duplicate of **§9.2 Eixo 2** — `DEBT-AI-012`. GLM repeated for emphasis: advanced chat streaming bypasses entire Fusion armor.

### 10.5 Superar Fable 5 — consolidar moat (GLM strategy)

| Fable weakness | Aethel strength |
|----------------|-----------------|
| Pure reasoning, blind to physical/logical consequences | Intent orchestrator + sandbox + evidence proofs |
| Single model bet | Fusion router + per-model profiles + fail-closed tool bus |

**Studio stubs (GLM):** `film/page.tsx`, `vfx/page.tsx` — mock pages with blocked buttons. Replace with governed agent manipulation of local project structure instead of fake heavy media generation.

| ID | Validation |
|----|------------|
| `DEBT-STUDIO-001` | **PARTIAL** — `film/page.tsx` has "Director Mode (Nexus Deprecated)" placeholder + static shot list |

---

## 11. Quick commands for validation

```bash
cd meu-repo/cloud-web-app/web
npm run qa:enterprise-gate
npm run qa:websocket-runtime-split
npx vitest run __tests__/ai
npm run typecheck
```

---

## 12. GLM Batch 3 — Render, realtime, finance, SSR (2026-06-17)

End-to-end sweep beyond AI governance: heavy rendering, mesh processing, realtime transport, thread sync, backend finance.

### 12.1 Nanite LOD "fantasma" — meshlets sem geometria

| Field | Value |
|-------|-------|
| **GLM claim** | `simplifyMeshlets()` não faz decimação real — salto aritmético no array, dobra `error`, deixa buracos na malha |
| **ID** | `DEBT-NANITE-001` |
| **Validation** | **CONFIRMED** — `lib/nanite-meshlet-builder.ts` ~350–365: `Math.floor(i * step)` subsample, no edge collapse / QEM |
| **Impact** | Viewport mostra pedaços flutuantes / furos em vez de low-poly coerente — esqueleto conceitual, não Nanite |
| **Claude action** | Real decimation (meshoptimizer / SimplifyModifier) or rename feature + gate `check-no-fake-success` |

### 12.2 BVH ray-tracing — bloqueio da main thread

| Field | Value |
|-------|-------|
| **GLM claim** | `rebuildBVH()` síncrono na main thread; `indices.sort` recursivo com centroides por triângulo |
| **ID** | `DEBT-PERF-002` |
| **Validation** | **CONFIRMED** — `ray-tracing.ts` ~118–127 calls `this.bvh.build(meshes)` sync; `ray-tracing-bvh.ts` ~150 sort + recurse; centroid uses `.clone()` |
| **Impact** | >5k triangles + object move → editor freeze (100ms–seconds) |
| **Claude action** | Web Worker BVH + SharedArrayBuffer, or WebGPU compute; debounce rebuild |

### 12.3 SSE placebo — frota de agentes

| Field | Value |
|-------|-------|
| **GLM claim** | `/api/agents/stream/fleet` envia `connected`, keepalive 15s, `stream-end` 5min — sem Prisma/Redis/Yjs subscription |
| **ID** | `DEBT-SSE-001` |
| **Validation** | **CONFIRMED** — `app/api/agents/stream/fleet/route.ts` entire `start()` has no data listener |
| **Impact** | `AgentStatusPill` acredita estar live; nunca recebe mudanças de status via SSE |
| **Note** | Also check `app/api/agents/stream/route.ts` for same pattern (Claude audit) |

### 12.4 Abismo casca ↔ reator (web vs Rust)

| Field | Value |
|-------|-------|
| **GLM claim** | React shell ≠ native ECS; no zero-copy IPC; `desktop_commands.rs` JSON text only; scene graph isolated |
| **ID** | `DEBT-DESK-005` (extends `DEBT-DESK-001`–`004`) |
| **Validation** | **CONFIRMED** — philosophy vs product: Three.js web scene independent of Rust lane daemons |
| **Moat reiteration (GLM)** | Competitive edge = governed agent orchestration, **not** AAA physics/render fidelity |

### 12.5 Resumo crítico estado real (GLM)

> Excelente governança de IA + UI; render criativo, física e runtime nativo = stubs + CPU-bound sync loops.

Aligns with Batch 1–2 held states. No new IDs — cross-ref Tier 2/3.

---

## 13. GLM Batch 3b — Finance, security, MCP, UX placebos (2026-06-17)

### 13.1 `chatStream` bypass (duplicate)

Cross-ref **`DEBT-AI-012`** — GLM reframes as alignment/security vulnerability. **CONFIRMED**.

### 13.2 Storage race — `releaseStorageUsage`

| Field | Value |
|-------|-------|
| **GLM claim** | Read-modify-write não atômico em deletes concorrentes |
| **ID** | `DEBT-FIN-001` |
| **Validation** | **CONFIRMED** — `storage-enforcement.ts` ~202–213: `findUnique` → compute → `update` |
| **Claude action** | Prisma `$executeRaw` decrement or transaction with row lock; `recalculateStorageUsage` for audit |

### 13.3 Credit wallet O(N) — `getCreditBalance`

| Field | Value |
|-------|-------|
| **GLM claim** | `creditLedgerEntry.aggregate(_sum)` every AI request; no cached balance on `User` |
| **ID** | `DEBT-FIN-002` |
| **Validation** | **CONFIRMED** — `credit-wallet.ts` ~49–59; `User` has `storageUsed` but no `credits`/`creditBalance`; `credit-wallet-legacy.ts` checks `user.credits` (dead field) |
| **Claude action** | Add `creditBalance Int` + atomic ledger append with balance update in transaction |

### 13.4 Admin finance OOM — `findMany` full ledger

| Field | Value |
|-------|-------|
| **GLM claim** | `admin/finance/metrics` loads all `creditLedgerEntry` in range into Node heap |
| **ID** | `DEBT-FIN-003` |
| **Validation** | **CONFIRMED** — `route.ts` ~84–121 `findMany` + `.forEach`; second `findMany` ~167 for recent entries |
| **Claude action** | `groupBy` entryType/model metadata in SQL; paginate recent; materialized daily rollup table |

### 13.5 SSR crash — asset pipeline browser APIs

| Field | Value |
|-------|-------|
| **GLM claim** | `URL.createObjectURL`, `document.createElement('canvas')` in importer/optimizer without env guard |
| **ID** | `DEBT-SSR-001` |
| **Validation** | **CONFIRMED** — `lib/assets/asset-importer.ts`, `lib/aaa-asset-pipeline-runtime/optimizer.ts` (lines 31–60); `@aethel-heavy-async-boundary` comment only |
| **Extra** | `AssetDatabase` = in-memory `Map` — state lost on server recycle (`database.ts`) |
| **Claude action** | Gate forbidding server imports; dynamic `import()` client-only; persist assets to DB/blob |

### 13.6 MCP ghost model — `McpServer`

| Field | Value |
|-------|-------|
| **GLM claim** | Model missing; `(prisma as any).mcpServer` fails silently; list returns null |
| **ID** | `DEBT-DB-001` |
| **Validation** | **CONFIRMED** with corrections: |
| | • List GET returns `{ servers: [], _meta: { schemaPending: true } }` — **not** `{ servers: null }` (GLM slightly wrong) |
| | • Detail GET returns 404 `Schema migration pending or not found` |
| | • **DELETE returns `{ deleted: true }` even when model undefined** — worse than GLM stated |
| **Files** | `app/api/mcp/servers/route.ts`, `app/api/mcp/servers/[id]/route.ts` |

### 13.7 Git panel placebo — `WorkbenchSidebar`

| Field | Value |
|-------|-------|
| **GLM claim** | `<GitIntegration />` sem props → "Git integration pending" |
| **ID** | `DEBT-UX-GIT-001` |
| **Validation** | **CONFIRMED** — `WorkbenchSidebar.tsx` ~117; `GitIntegration.tsx` ~214–220 empty state |
| **Claude action** | Wire to existing `/api/git/*` or Tauri git commands via `ai-git-integration.ts` |

### 13.8 Nexus research placebo — `AethelResearch`

| Field | Value |
|-------|-------|
| **GLM claim** | `handleSearch` simula sucesso com 3 fontes fixas |
| **ID** | `DEBT-NEXUS-001` |
| **Validation** | **CONFIRMED** — `AethelResearch.tsx` ~109–123 sets `PRESET_SOURCES`; summary text admits browser replay "held" |
| **Claude action** | **DONE CORE 2026-07-11ai** — `runBrowserOperatorResearch` + Nexus receipt; CDP farm still `[HELD]` |

### 13.x LiveVoice duplex (extends IMPROVE-AI-011)

| Field | Value |
|-------|-------|
| **Claude action** | **DONE CORE 2026-07-11aj** — `runLiveVoiceDirectionTurn` + Nexus receipt + honesty badge; duplex WebRTC still `[HELD]` |

### 13.9 Niagara CPU main thread (extends Batch 2)

Cross-ref **`DEBT-PERF-001`**. GLM adds: full physics (gravity, drag, `Math.sin/cos` turbulence, color lerp) on main thread every frame. **CONFIRMED** — same file.

### 13.10 GLM recommended next steps (annotation only — for Claude)

| Step | DEBT ID |
|------|---------|
| Cached atomic `creditBalance` on User | `DEBT-FIN-002` |
| Finance endpoint SQL GROUP BY | `DEBT-FIN-003` |
| Unify `chatStream` hardening | `DEBT-AI-012` |
| Asset import/optimize → Worker or Tauri sidecar | `DEBT-SSR-001`, `DEBT-DESK-005` |

---

## 14. GLM Batch 4 — Collaboration, extensions, UX placebos (2026-06-17)

### 14.1 Visual scripting Save placebo

| Field | Value |
|-------|-------|
| **GLM claim** | "Save" button only `JSON.stringify` + `log.info` + `clipboard.writeText` |
| **ID** | `DEBT-UX-VS-001` |
| **Validation** | **CONFIRMED** — `components/visual-scripting/VisualScriptEditor.tsx` ~514–521 |
| **Claude action** | Persist to project asset or rename button to "Copy JSON" |

### 14.2 Plugin APIs 100% stub

| Field | Value |
|-------|-------|
| **GLM claim** | GET empty + message; POST 503 pending `lib/plugins/host.ts` |
| **ID** | `DEBT-PLUGIN-001`, `DEBT-DB-002` |
| **Validation** | **CONFIRMED** — `app/api/plugins/list/route.ts`; no `PluginInstall` in schema |

### 14.3 Canvas viewport deprecated

| Field | Value |
|-------|-------|
| **GLM claim** | `NexusCanvasV2` renders `Canvas mode (Nexus) deprecated.` |
| **ID** | `DEBT-UX-CANVAS-001` |
| **Validation** | **CONFIRMED** — `components/preview/CanvasViewportSurface.tsx` |

### 14.4 Yjs fallback — silent state loss (CRITICAL)

| Field | Value |
|-------|-------|
| **GLM claim** | Fallback broadcasts updates but never `Y.applyUpdate(doc, update)`; late joiners get empty doc |
| **ID** | `DEBT-YJS-001` |
| **Validation** | **CONFIRMED** — `lib/server/websocket/legacy-collaboration-handler.ts` ~38–45 |
| **Claude action** | Apply update on server doc before broadcast; 2-client collab test |

### 14.5 WebSocket channel GC

| Field | Value |
|-------|-------|
| **GLM claim** | Orphan legacy room entries → memory leak |
| **ID** | `DEBT-WS-002` |
| **Validation** | **PARTIAL** — `legacyRooms` cleaned on disconnect; `docs` Map never GC'd |

### 14.6 Pixel streaming held

| Field | Value |
|-------|-------|
| **GLM claim** | `CloudStreamStudioClient` hardcodes safety flags → WebRTC never mounts |
| **ID** | `DEBT-STREAM-001` |
| **Validation** | **CONFIRMED** — `CloudStreamStudioClient.tsx` ~32–42 |
| **dynamicResolution** | **PARTIAL** — `DEBT-STREAM-002`; logic in `pixel-streaming/codec.ts`, canvas wire TBD |

### 14.7 Extension host vm sandbox

| Field | Value |
|-------|-------|
| **GLM claim** | `vm` + native `require` — not secure; infinite loop freezes Next |
| **ID** | `DEBT-EXT-001` |
| **Validation** | **CONFIRMED** — `extension-host-runtime-loader.ts` |

### 14.8 Sequencer

| Item | ID | Validation |
|------|-----|------------|
| Unsorted keyframes break interpolation | `DEBT-SEQ-001` | **PLAUSIBLE** — linear scan (GLM misnamed "binary search") |
| Only camera `fov` applied | `DEBT-SEQ-002` | **CONFIRMED** |
| Export plan static held | `DEBT-SEQ-003` | **CONFIRMED** — `sequencer/runtime/render-export.ts` |

### 14.9 Desktop kernel

Cross-ref **`DEBT-DESK-002`**, **`DEBT-DESK-003`**. **CONFIRMED** duplicates.

---

## 15. GLM Batch 4b — DB ghosts, finance, dev enforcement (2026-06-17)

### 15.1 Missing Prisma models

`McpServer` (`DEBT-DB-001`), `RenderJob` (`DEBT-RENDER-001`), `PluginInstall` (`DEBT-DB-002`). **CONFIRMED** — none in `schema.prisma`.

### 15.2 MCP POST false 201

| Field | Value |
|-------|-------|
| **GLM claim** | `undefined?.create()` → check `=== null` only → 201 + `{}` |
| **ID** | `DEBT-DB-003` |
| **Validation** | **CONFIRMED** — `mcp/servers/route.ts` ~93–100 |

### 15.3 GLB export poll 404

| Field | Value |
|-------|-------|
| **GLM claim** | 202 `export:glb:…` → poll 404 `Render job not found` |
| **ID** | `DEBT-RENDER-002` |
| **Validation** | **CONFIRMED** — `exports/glb/route.ts` + `render/jobs/[jobId]/route.ts` |

### 15.4 Finance / storage extensions

| Issue | ID |
|-------|-----|
| Admin finance OOM | `DEBT-FIN-003` (dup) |
| Credit O(N) aggregate | `DEBT-FIN-002` (dup) |
| `!user.storageUsed` falsy zero | `DEBT-FIN-004` **NEW CONFIRMED** |

### 15.5 Dev enforcement observe

**`DEBT-AI-016`** — `agent-tool-job-runner.ts` ~170–172: `observe` outside production. **CONFIRMED by design**.

### 15.6 Tier-1 escalations from Batch 4

| Priority | ID | Why |
|----------|-----|-----|
| P0 | `DEBT-YJS-001` | Data loss in multiplayer |
| P0 | `DEBT-EXT-001` | RCE / server freeze risk |
| P0 | `DEBT-DB-003` | False persist success |

---

## 16. GLM Batch 5 — Render, search, save, LSP, Niagara (2026-06-17)

### 16.1 AAA render placebo (`AAARenderSystem`)

| Field | Value |
|-------|-------|
| **GLM claim** | Post-FX methods empty (~260–281); deferred/HDR → black screen; composer commented (~445) |
| **ID** | `DEBT-RENDER-003` |
| **Validation** | **CONFIRMED** — `setupSSAO/SSR/Bloom/DOF/MotionBlur` are comment-only; `renderDeferred()` no draw calls; `renderForward()` HDR path skips `composer.render()` |
| **Hook kill-switch** | `useRenderPipeline.ts` ~177–179 explicitly sets `aaaRendererRef.current = null` — falls back to basic `WebGLRenderer` |
| **Claude action** | Wire AAA renderer or remove AAA UI toggles; gate `check-no-fake-success` on viewport claims |

### 16.2 `chatStream` bypass (duplicate)

**`DEBT-AI-012`** — GLM reframes as cost/alignment security. **CONFIRMED**.

### 16.3 Ripgrep Scoop path bug

| Field | Value |
|-------|-------|
| **GLM claim** | Literal `C:\Users\%USERNAME%\scoop\...` — spawn does not expand env vars |
| **ID** | `DEBT-SEARCH-001` |
| **Validation** | **CONFIRMED** — `search-runtime.helpers.ts` ~139; `spawn` in `search-runtime-ripgrep.ts` ~103 |
| **Claude action** | `process.env.USERPROFILE` or `os.homedir()`; expand `%USERNAME%` before spawn |

### 16.4 Fake semantic search

| Field | Value |
|-------|-------|
| **Hash embeddings** | `DEBT-SEARCH-002` — **CONFIRMED** — `embedText` token hash slots, not ML model |
| **120 file cap** | `DEBT-SEARCH-003` — **CONFIRMED** — `MAX_INDEXED_FILES = 120`; queue stops silently |
| **Cross-ref** | `DEBT-AI-004` (no AST) — complementary gaps |

### 16.5 IDE dock layout

| Field | Value |
|-------|-------|
| **GLM claim** | Fixed 55/45 Agents vs Terminal; no horizontal resize grip |
| **ID** | `DEBT-UX-DOCK-001` |
| **Validation** | **CONFIRMED** — `flex-[0_0_55%]` / `45%`; vertical `ResizeHandle` adjusts dock height only |
| **Invalid CSS** | `bg-[var(--aethel-surface-primary)]/2` — **CONFIRMED** invalid Tailwind opacity on CSS var (lines 44, 144) |

---

## 17. GLM Batch 5b — Save, LSP, WS bus, sidecars (2026-06-17)

### 17.1 Save "compression" placebo

| Field | Value |
|-------|-------|
| **GLM claim** | `btoa(encodeURIComponent)` inflates size ~33%; enabled by default |
| **ID** | `DEBT-SAVE-001` |
| **Validation** | **CONFIRMED** — `serializers.ts` ~37–42; `manager.ts` `compressionEnabled: true` |

### 17.2 Monaco LSP mock broken

| Field | Value |
|-------|-------|
| **GLM claim** | `typescript-lsp.ts` has rich `getMockResponse` but `sendRequest` always HTTP fetches |
| **ID** | `DEBT-LSP-001` |
| **Validation** | **CONFIRMED** — `lsp-server-base.ts` ~256–307 no mock interceptor; comment in `typescript-lsp.ts` line 6 contradicts code |

### 17.3 LSP API session routes dead

| Field | Value |
|-------|-------|
| **GLM claim** | `LSPApiClient` → `/api/lsp/start`; catch-all returns 501 |
| **ID** | `DEBT-LSP-002` |
| **Validation** | **CONFIRMED** — `lsp-api.ts` ~82–116; `api/lsp/[...path]/route.ts` → `catchallNotImplemented` |

### 17.4 WebSocket event bus orphans

| Field | Value |
|-------|-------|
| **GLM claim** | `legacy-simple-handlers.ts` emits `lsp:message`, `ai:stream`, `dap:message` — no listeners |
| **ID** | `DEBT-WS-003` |
| **Validation** | **CONFIRMED** — grep shows emit in handlers only; no `eventBus.on` in app code (test checks API exists) |
| **Note** | `terminal:input` / `terminal:resize` also emitted — verify PTY bridge separately |

### 17.5 Niagara node graph disconnected (Part III duplicate)

| Field | Value |
|-------|-------|
| **ID** | `DEBT-NIAGARA-002` (extends `DEBT-PERF-001` CPU particles) |
| **Validation** | **CONFIRMED** — ReactFlow `nodes`/`edges` not compiled to `emitterConfig`; only `EmitterPanel` / presets drive `ParticleEmitter` |

### 17.6 Yjs / MCP / Terminal (duplicates)

- **`DEBT-YJS-001`** — Part II/III repeat. **CONFIRMED**.
- **`DEBT-DB-001`**, **`DEBT-DB-003`** — MCP. **CONFIRMED**.
- **`DEBT-DESK-002`** — Tauri terminal held. **CONFIRMED**.

### 17.7 V29 sidecar lifecycle held by design

| Field | Value |
|-------|-------|
| **GLM claim** | `releaseReady` forced false; human-review blocker injected |
| **ID** | `DEBT-SIDECAR-001` |
| **Validation** | **CONFIRMED by design** — `v29-sidecar-lifecycle.ts` ~141, ~171; validator rejects `releaseReady !== false` |
| **Note** | Intentional governance — not a bug; document in release manifest |

### 17.8 GLM engineering action table (annotation for Claude)

| Area | File | DEBT ID | Proposed fix |
|------|------|---------|--------------|
| Save | `serializers.ts` | `DEBT-SAVE-001` | Real gzip (fflate/pako) or disable mislabeled compression |
| VFX graph | `NiagaraVFX.runtime.tsx` | `DEBT-NIAGARA-002` | Node compiler → `emitterConfig` |
| Collab | `legacy-collaboration-handler.ts` | `DEBT-YJS-001` | `Y.applyUpdate(doc, update)` |
| LSP mock | `lsp-server-base.ts` | `DEBT-LSP-001` | Mock interceptor before fetch |
| LSP sessions | `api/lsp/[...path]` | `DEBT-LSP-002` | Implement `/start`, `/stop/*` |
| WS bus | `legacy-simple-handlers.ts` | `DEBT-WS-003` | Register `eventBus.on` handlers |
| IDE dock | `ModernIDEShellCenterStack.tsx` | `DEBT-UX-DOCK-001` | Horizontal `ResizeHandle`; fix `color-mix` opacity |
| AAA render | `useRenderPipeline.ts` | `DEBT-RENDER-003` | Instantiate AAARenderSystem or hide toggles |

---

## 18. GLM Batch 6 — Studio engines closure + UX hitlist (2026-06-17)

**GLM declares diagnostic audit COMPLETE.** Cursor validated new engine findings; duplicates cross-referenced.

### 18.1 Asset pipeline — model destruction on import

| Field | Value |
|-------|-------|
| **GLM claim** | `ModelLoader` flattens GLTF/OBJ — loses skeleton, node hierarchy, material slots |
| **ID** | `DEBT-ASSET-001` |
| **Validation** | **CONFIRMED** — `parseGLTF` traverses meshes → flat `vertices`/`indices` `Float32Array`; return type `ModelData` has no scene graph |
| **Claude action** | Preserve `gltf.scene` or glTF-Transform pipeline; gate importers |

### 18.2 Terrain sculpt — smooth brush placebo

| Field | Value |
|-------|-------|
| **GLM claim** | `sculpt_smooth` maps `(h,_d)=>h` — identity |
| **ID** | `DEBT-TERRAIN-001` |
| **Validation** | **CONFIRMED** — comment says "handled separately" but no alternate code path in file |
| **Extra** | `applyErosion` only `log.info` — erosion also stub |

### 18.3 Foliage — draw call explosion

| Field | Value |
|-------|-------|
| **ID** | `DEBT-PERF-003` |
| **Validation** | **CONFIRMED** — `typeInstances.map` → individual `<mesh>`; `new ConeGeometry` etc. per instance |

### 18.4 Water — CPU Gerstner

| Field | Value |
|-------|-------|
| **ID** | `DEBT-PERF-004` |
| **Validation** | **CONFIRMED** — `useFrame` iterates all vertices; `geometry.attributes.position.clone()` every frame (GC pressure) |

### 18.5 Spatial audio — reverb routing broken

| Field | Value |
|-------|-------|
| **GLM claim** | `reverbNode` connected but sources not routed — silent reverb zones |
| **ID** | `DEBT-AUDIO-001` |
| **Validation** | **CONFIRMED** — `setReverbPreset` wires convolver → `reverbGain` → master; `play()` connects source → `categoryGain` → master only (dry path). No `gainNode.connect(reverbNode)` |
| **Note** | Zones call `setReverbPreset` on listener move — wet chain exists but receives no audio |

### 18.6 Native kernel manifest (`native_kernel.rs`)

| Field | Value |
|-------|-------|
| **GLM claim** | Blocks claims "desktop ready", "native terminal ready"; daemons NeedsReview; updater Held |
| **ID** | `DEBT-DESK-006` (+ cross-ref `DEBT-DESK-002`) |
| **Validation** | **CONFIRMED** — `prohibited_claims` ~92–98; signed updater `Held` |
| **Manifest drift** | `native-pty-contract` marked `Available` in manifest but `desktop_commands.rs` returns `held` — **contradiction** |

### 18.7 Dev tool-runner observe (duplicate)

**`DEBT-AI-016`** — GLM "brecha de evasão". **CONFIRMED by design**.

### 18.8 UX hitlist — `audit_frontend_ui_ux.md`

| Field | Value |
|-------|-------|
| **GLM claim** | 50 fronts for Cursor 3.x parity: ~1300 loading strings, scene tree virtualization, canvas timelines |
| **ID** | `DEBT-UX-HITLIST-001` |
| **Validation** | **CONFIRMED** — doc exists at `docs/architecture/audit_frontend_ui_ux.md` (A4–A50) |
| **Corrections** | A8 outliner virtualization **PARTIALLY DONE** — `SceneViewportOutliner.tsx` already uses `useVirtualizer`. A2 CenterStack tokens marked ✅ in doc. Ghost preview may exist via `useApplyGhostPreview` — Claude re-verify vs A40 |

### 18.9 Missing `analysis_results.md`

| Field | Value |
|-------|-------|
| **GLM claim** | Full report saved to `analysis_results.md` |
| **ID** | `DEBT-AUDIT-001` |
| **Validation** | **NOT FOUND** in workspace (`meu-repo/`, project root). User may have file locally only |
| **Claude action** | If user adds file, merge into §18 or append as §19 verbatim summary |

### 18.10 Audit closure statement

GLM: diagnostic pass complete (studio screens, renderers, tool bus, websocket, crypto, Tauri packager, DB, UI).

**Cursor canonical backlog:** this registry (~57 IDs) + `audit_frontend_ui_ux.md` (UX execution).

**Executor:** Claude Opus — follow [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md) Wave 1→9; do not execute isolated `DEBT-*` tickets.
