# Claude Opus — Mega Execution Waves

> **Precedence (2026-07-11):** Wave narrative / DEBT bundling only. **Task queue & Focus order** = [`AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md`](./AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md) + [`AETHEL_FOCUS1_EXECUTION_PROGRESS.md`](./AETHEL_FOCUS1_EXECUTION_PROGRESS.md). Conflicts lose to Master Map.

**Purpose:** Single authoritative brief for **maximum work per session**. Claude must execute **one full Wave** end-to-end — not individual `DEBT-*` / `IMPROVE-*` tickets in isolation.  
**Audience:** Claude Opus executor only.  
**Master index:** [`CLAUDE_MASTER_BRIEF.md`](./CLAUDE_MASTER_BRIEF.md) — full inventory + prompts (read first).  
**Evidence registries:** [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md), [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md), [`analysis_results.md`](./analysis_results.md)  
**Rule:** If a Wave is started, finish **all** listed debts + paired improvements + gates before starting the next Wave. No “quick wins” that skip the Wave contract.

---

## Why this file exists (alignment diagnosis)

| Problem | Impact on Claude |
|---------|------------------|
| ~69 `DEBT-*` + ~120 `IMPROVE-*` as atomic tickets | Tempts micro-PRs, stubs, partial fixes |
| **Three conflicting Tier-1 lists** (`AI_CRITIQUE` §4 vs `analysis_results` §5 vs Batch narratives) | Wrong priority order |
| Hard gate “all debts before any `IMPROVE-*`” | Blocks correct **DEBT+IMPROVE in same Wave** (e.g. foliage erase + GPU cull) |
| `docs/master/*EXECUTION*` (2026-02–04) | Stale; **ignore** — use this file + architecture registries only |
| `audit_frontend_ui_ux.md` A4–A50 | Not yet one Wave — folded into **Wave 7** |

**This document supersedes** scattered “Ordem sugerida” sections for **execution order**. Registries remain the evidence catalog.

---

## Global contract (every Wave)

### Preflight (mandatory)

```bash
npm run qa:enterprise-gate   # must PASS before Wave 1; re-run after each Wave
npm run typecheck
npm test -- --runInBand      # or project test script; zero regressions
```

### Quality bar (competitive — not “good enough”)

| Dimension | Bar |
|-----------|-----|
| **Honesty** | No feature rename to hide placebo; held surfaces show manifest + gate |
| **Performance** | Hot paths off main thread or GPU; no sync `readRenderTargetPixels` in frame loop |
| **Data fidelity** | No silent data loss (foliage erase, flat normals, JSON netcode clone) |
| **Physics** | Rapier WASM canonical; no JS fake rigid bodies for destruction/cloth |
| **IDE** | Cursor/Zed-class: dock persistence, virtualized trees, single agent spine |
| **Render** | UE-honest tiering: real BRDF or explicit held; Nanite naming only after QEM LOD |
| **Gates** | Add or extend `qa:*` script when Wave introduces new capability claims |

### Wave completion checklist

- [ ] Every `DEBT-*` in Wave marked **DONE** or **WAIVED** (waiver = gate + doc line)
- [ ] Every paired `IMPROVE-*` acceptance criteria met (not draft)
- [ ] `npm run qa:enterprise-gate` PASS
- [ ] No new `UNVERIFIED` marketing claims in UI copy
- [ ] Changelog row in `AI_CRITIQUE_DEBT_REGISTRY.md` §changelog

### Anti-patterns (reject these outcomes)

- Cosmetic shader darken labeled “foveated rendering”
- Subsample meshlets labeled “Nanite LOD”
- Silent `createBuffer` labeled “AI voice”
- `instancedMesh.clear()` “fix” that still wipes sibling instances
- One-file tweak when Wave scope lists 8+ files

---

## Wave map (execute strictly in order)

| Wave | Name | Est. effort | Primary competitive leap |
|------|------|-------------|---------------------------|
| **0** | Preflight & debt revalidation | 0.5 day | Truth baseline on branch |
| **1** | Agent & AI spine unification | **L** (2–3 wk) | Cursor-class single LLM + agent loop |
| **2** | Multiplayer & collaboration truth | **L** (2 wk) | Real Yjs + binary netcode |
| **3** | AAA render core (deferred + RT + VT + Nanite) | **XL** (4–6 wk) | UE-honest viewport pipeline |
| **4** | World simulation (foliage, water, clouds, terrain, assets) | **L** (3–4 wk) | Open-world editor credibility |
| **5** | Character simulation (motion, cloth, destruction) | **L** (3–4 wk) | Gameplay physics parity |
| **6** | Platform data & creative pipeline | **L** (2–3 wk) | Real jobs, MCP, exports, plugins |
| **7** | Studio shell & UX dominance | **XL** (4–6 wk) | Blender/UE workbench density |
| **8** | Audio, VR & sensory | **M** (1–2 wk) | Voice TTS + hardware XR |
| **9** | Desktop native & Vision 2030 | **XL** (quarter) | Tauri sidecars + WGSL parity |

**Total:** 9 execution Waves after preflight — designed for **9–12 Claude mega-sessions**, not 189 ticket sessions.

---

## Wave 0 — Preflight

**Goal:** Re-validate every open `DEBT-*` on current branch; resolve `DEBT-AUDIT-001` drift.

**Actions:**

1. Walk `AI_CRITIQUE_DEBT_REGISTRY.md` §5 GLM table — tag VALID/INVALID/PARTIAL with file:line.
2. Confirm `analysis_results.md` §2 rows still match code.
3. Do **not** implement fixes — only update registry status fields if drift found.

**Exit:** Enterprise gate green; executor has Wave 1 brief only.

---

## Wave 1 — Agent & AI spine unification

**Competitive target:** Cursor 3.2 agent runtime — one provider, one loop, enforced tool bus, streaming parity.

### Debts (all in one PR series)

| ID | Fix |
|----|-----|
| `DEBT-AI-012` | `chatStream()` same hardening as `query()` + Fusion |
| `DEBT-AI-001` | Unify LLM provider/router — Fusion single entry |
| `DEBT-AI-002` + `DEBT-AI-011` | Single agent loop; retire parallel runtimes |
| `DEBT-AI-008` | Wire code validator into execute path |
| `DEBT-AI-013` | Router misclassification guardrails |
| `DEBT-AI-003` | Remove or gate heuristic orchestrator UI |
| `DEBT-AI-005` | Production enforce on all scoped mutating writes |
| `DEBT-SEARCH-002` | Real embeddings path (or honest held + block semantic search UI) |

### Paired improvements (same Wave — not later)

| ID | Deliverable |
|----|-------------|
| `IMPROVE-AI-001` | ACP message schema + single bus |
| `IMPROVE-IDE-012` | Unified chat surfaces |
| `IMPROVE-DASH-001` | Isolate streaming re-renders |

### Key files

`lib/ai/advanced-ai-provider.ts`, `lib/ai-service.ts`, `lib/ai/intelligent-model-router.ts`, `lib/ai/self-reflection-engine.ts`, `lib/ai-tools-registry.ts`, `lib/agent-tool-job-runner.ts`, `components/ide/*Chat*`, `components/dashboard/*`

### Acceptance

- One code path for `complete` and `stream` through Fusion + robustness profiles
- Agent execute path runs validator; fail-closed receipts
- `qa:enterprise-gate` PASS; add `qa:ai-spine-unified` if needed

---

## Wave 2 — Multiplayer & collaboration truth

**Competitive target:** Authoritative multiplayer prototype — not JSON theater.

### Debts

| ID | Fix |
|----|-----|
| `DEBT-YJS-001` | `Y.applyUpdate(doc, update)` + late-joiner sync |
| `DEBT-NET-001` | Binary serializer; ring-buffer rollback; ban JSON clone |

### Paired improvements

| ID | Deliverable |
|----|-------------|
| `IMPROVE-ENG-015` | Bitpacked input + struct layout |
| `IMPROVE-COLLAB-002` | Scene CRDT on same Yjs doc |

### Key files

`lib/server/websocket/legacy-collaboration-handler.ts`, `lib/networking-netcode.ts`, `lib/networking-serializer.ts`, `lib/server/websocket-server-collaboration.ts`

### Acceptance

- Rollback hot path: zero `JSON.parse(JSON.stringify)` 
- Two-browser collab test: edit propagates + persists on reconnect
- Optional: micro-benchmark netcode serialize < 0.1ms for 64 entities

---

## Wave 3 — AAA render core

**Competitive target:** UE 5.6 **honest** tier — real deferred + optional RTGI path; no magenta stubs.

### Debts

| ID | Fix |
|----|-----|
| `DEBT-RENDER-003` | Wire `AAARenderSystem` or remove AAA toggles |
| `DEBT-PERF-002` | Async BVH (Worker / WebGPU) |
| `DEBT-RT-001` | Pack n0/n1/n2; smooth shading in path tracer |
| `DEBT-VT-001` | Render feedback pass **before** read; async PBO readback |
| `DEBT-NANITE-001` | QEM / meshoptimizer decimation OR rename + gate |

### Paired improvements

| ID | Deliverable |
|----|-------------|
| `IMPROVE-ENG-007` | Live Cook-Torrance BRDF in `aaa-material-system.shaders.ts` |
| `IMPROVE-ENG-008` | SSGI / AO tier (honest held for Lumen-class) |
| `IMPROVE-ENG-009` | GPU Nanite cull path |
| `IMPROVE-ENG-010` | TAA / post stack wired (not preset theater) |
| `IMPROVE-ENG-017` | Full RT normal pipeline |
| `IMPROVE-ENG-018` | Continuous LOD clusters |
| `IMPROVE-ENG-019` | VT wired in viewport |
| `IMPROVE-AI-014` | Shader graph compile path or honest held |

### Key files

`lib/aaa-render-system.ts`, `lib/hooks/useRenderPipeline.ts`, `lib/aaa-material-system*.ts`, `lib/ray-tracing.ts`, `lib/ray-tracing-bvh.ts`, `lib/virtual-texture-system.ts`, `lib/nanite-meshlet-builder.ts`, `lib/nanite-virtualized-geometry-renderers.ts`, `lib/postprocessing/system/*`

### Acceptance

- Viewport screenshot: PBR sphere shows specular highlight (not flat albedo)
- BVH rebuild does not block > 16ms on 10k tris test scene
- VT: visible tile sharpness after camera whip-pan
- Nanite LOD2: no holes on test mesh (watertight or documented crack seal)

---

## Wave 4 — World simulation

**Competitive target:** Editor world tools that survive production scenes.

### Debts

| ID | Fix |
|----|-----|
| `DEBT-FOLIAGE-001` | Per-instance erase + GPU visible instance buffer |
| `DEBT-PERF-003` | Foliage painter instancing (no mesh-per-instance) |
| `DEBT-PERF-004` | GPU Gerstner water |
| `DEBT-CLOUD-001` | Depth blend, blue noise, god rays wired |
| `DEBT-TERRAIN-001` | Real smooth brush + erosion pass |
| `DEBT-ASSET-001` | Preserve GLTF hierarchy/skeleton/materials |

### Paired improvements

| ID | Deliverable |
|----|-------------|
| `IMPROVE-ENG-012` | GPU foliage cull |
| `IMPROVE-ENG-013` | Atmosphere compositing |
| `IMPROVE-ENG-016` | Shader displacement water |
| `IMPROVE-STUDIO-011` | Foliage painter perf |
| `IMPROVE-ENV-001` | Live foliage sliders |
| `IMPROVE-TERRAIN-001` | Viewport-first brush UX |

### Key files

`lib/foliage-system.ts`, `lib/environment/FoliagePainterPanels.runtime.tsx`, `lib/environment/WaterEditor.parts-runtime.tsx`, `lib/volumetric-clouds.ts`, `lib/terrain/TerrainSculptingEditor.runtime.tsx`, `lib/engine/asset-pipeline-runtime/loaders.ts`

### Acceptance

- Remove 1 foliage cluster → others remain
- Water 128×128 plane: CPU vertex loop eliminated
- Import skinned GLB → skeleton animates in viewport

---

## Wave 5 — Character simulation

**Competitive target:** Gameplay-ready animation + physics interaction.

### Debts

| ID | Fix |
|----|-----|
| `DEBT-MOTION-001` | SOA poses; O(1) frame index; two-bone foot IK |
| `DEBT-DEST-001` | Real Voronoi + 3D convex hull triangulation + Rapier fragments |
| `DEBT-CLOTH-001` | Spatial hash collisions; GPU cloth + skinned capsule colliders |

### Paired improvements

| ID | Deliverable |
|----|-------------|
| `IMPROVE-ENG-014` | Motion matching production path |
| `IMPROVE-ENG-020` | Destruction pipeline |
| `IMPROVE-ENG-021` | Cloth on characters |

### Key files

`lib/motion-matching-system.ts`, `lib/destruction-fracture-generator.ts`, `lib/destruction-system.ts`, `lib/destruction-fragment-runtime.ts`, `lib/cloth-simulation.ts`, `lib/cloth-simulation-gpu.ts`, `lib/cloth-simulation-collisions.ts`

### Acceptance

- Motion DB 10k frames: playback lookup < 0.05ms
- Fracture mesh: no inverted normals on Y-axis extruded shard
- Cloth cape: does not intersect skinned arm (capsule test)

---

## Wave 6 — Platform data & creative pipeline

**Competitive target:** Backend truth — jobs persist, MCP honest, exports real, **billing cannot bleed cash**.

### Debts

| ID | Fix |
|----|-----|
| `DEBT-DB-001` + `DEBT-DB-003` | Prisma `McpServer`; honest MCP routes |
| `DEBT-RENDER-001` | `RenderJob` model + worker pipeline |
| `DEBT-PLUGIN-001` | Plugin install or 503 UI |
| `DEBT-EXT-001` | Extension host isolation |
| `DEBT-SEQ-003` | Real sequencer export |
| `DEBT-FIN-002` + `DEBT-FIN-003` | Cached balance + SQL aggregates |
| **`DEBT-FIN-005`–`010`** | **Stripe downgrade, transfer lock, credit reservations, token weights, plan sync, two-phase AI** |
| `DEBT-BILLING-001` | BYOK path (Phase 6b if deferred) |

### Paired improvements

| ID | Deliverable |
|----|-------------|
| `IMPROVE-PLATFORM-003` | Live Prisma models |
| `IMPROVE-PLATFORM-006` | Cancel kills child process |
| `IMPROVE-PLATFORM-007` | GLB export receipt |
| `IMPROVE-STUDIO-008` | Slot bridge API |
| `IMPROVE-UX-003` | Honest export UI |
| **`IMPROVE-BILLING-001`** | **Model weight metering + wallet two-phase (see implementation_plan.md)** |

### Key files

`prisma/schema.prisma`, `lib/plans.ts`, `lib/plan-limits.ts`, `lib/metering.ts`, `lib/credit-wallet.ts`, `lib/ai/model-cost-weights.ts` (new), `app/api/billing/webhook/route.ts`, `app/api/credits/transfer/route.ts`, `app/api/ai/chat/route.ts`, `app/api/ai/stream/route.ts`, `docs/architecture/implementation_plan.md`

### Acceptance

- GLB 202 → poll → downloadable artifact
- MCP POST without model → 503 not 201
- Render job row in DB survives server restart
- Stripe cancel → `user.plan === 'free'`
- 1000 Sonnet tokens debits 40_000 weighted quota; parallel spend cannot double-charge
- `plans.ts` limits match `plan-limits.ts` (parity gate PASS)

---

## Wave 7 — Studio shell & UX dominance

**Competitive target:** UE/Blender workbench — one shell, no WebGL remount, A4–A50 hitlist closed.

### Debts

| ID | Fix |
|----|-----|
| `DEBT-STUDIO-001` | Film/VFX mock → governed actions |
| `DEBT-UX-DOCK-001` | Bottom dock honor `activeBottomPanel` |
| `DEBT-UX-VS-001` | Visual script persist + validation |
| `DEBT-NIAGARA-002` | Graph compile or held |
| `DEBT-ADMIN-001` | Stop stub page generator |
| `DEBT-TERM-001` | Terminal transport: no cloud server PTY masquerading as user shell |
| `DEBT-DESK-002` | Tauri `create_held` → real portable-pty |
| `DEBT-UX-DASH-001` | Collapse dashboard banner stack |
| `DEBT-ROUTE-001` | Prune ASPIRATIONAL routes; hub `isRouteVisible` |

### UX hitlist (promote as Wave scope — not optional)

`audit_frontend_ui_ux.md` **A3–A11, A14, A17, A21, A36, A40** minimum:

| Area | Deliverable |
|------|-------------|
| Loading | `IMPROVE-UX-001` shimmer system |
| VS | `IMPROVE-VS-001`–`011` tokens, palette, pin safety |
| IDE dock | `IMPROVE-IDE-007`–`009`, `IMPROVE-STUDIO-002`–`004` |
| Trees | `IMPROVE-IDE-003`, `IMPROVE-IDE-016` virtualize all |
| Film/Quest | `IMPROVE-FILM-001`–`005`, `IMPROVE-QUEST-001`, `IMPROVE-STUDIO-005`–`009` |
| Timelines | `IMPROVE-TIMELINE-001` canvas dope sheet pilot |
| Terminal | `IMPROVE-TERM-001`, `IMPROVE-DESK-002`, `IMPROVE-IDE-008` — xterm routes to local PTY |
| Dashboard | `IMPROVE-DASH-002` Linear density; `IMPROVE-DASH-001` isolate streaming |
| Routes | `IMPROVE-ROUTE-001`, `IMPROVE-STUDIO-007` hub maturity gating |

### Key files

`app/studio/page.tsx`, `components/studio/CreativeWorkbenchShell.tsx`, `components/ide/ModernIDEShell*.tsx`, `components/visual-script/VisualScriptEditor.tsx`, `components/terminal/*`, `components/dashboard/DashboardShell.tsx`, `lib/routes/route-maturity-registry.ts`, `scripts/check-hidden-route-leak.mjs`, `docs/architecture/audit_frontend_ui_ux.md`

### Acceptance

- Switch terrain ↔ level ↔ film **without** canvas remount (WebGL context preserved)
- File tree 10k nodes: scroll 60fps
- Visual script Save → reload restores graph from project file
- Zero `style={{` in VisualScriptEditor (grep gate)
- `npm run build` in xterm: cwd = user project dir when Tauri/desktop; cloud shows held CTA not fake shell
- Dashboard: zero stacked hero banners on default load (dismissed state persisted)
- `check-hidden-route-leak.mjs` PASS; ASPIRATIONAL count reduced or 301'd

---

## Wave 8 — Audio, VR & sensory

**Competitive target:** Meta Quest / PSVR2-class foveation; voiced characters.

### Debts

| ID | Fix |
|----|-----|
| `DEBT-AUDIO-002` | Real TTS provider + `generateVoice` |
| `DEBT-AUDIO-001` | Spatial reverb on source graph |
| `DEBT-VR-001` | `applyToLayer()` in `onXRFrame`; reduce cosmetic darken |

### Paired improvements

| ID | Deliverable |
|----|-------------|
| `IMPROVE-AI-015` | Voice + lipsync viseme pipeline |
| `IMPROVE-ENG-022` | Hardware foveation + variable rate shading where available |

### Key files

`lib/ai-audio-engine.ts`, `lib/audio/spatial-audio-manager-core.ts`, `lib/webxr-vr-system-core.ts`, `lib/webxr-vr-foveated-rendering.ts`

### Acceptance

- `generateVoice("test")` → non-zero RMS waveform
- Lip sync: viseme changes on plosives in test clip
- WebXR: foveation API called when `supportsFoveatedRendering`

---

## Wave 9 — Desktop native & Vision 2030

**Competitive target:** Local-first power user — PTY, fs watch, wgpu sidecar, bridge IPC.

### Debts

| ID | Fix |
|----|-----|
| `DEBT-DESK-001`–`006` | Workspace shell, PTY, fs emit, scene IPC |
| `DEBT-SIDECAR-001` | Lifecycle gates green for chosen sidecars |
| `DEBT-SSR-001` | Heavy async boundary enforcement |

### Paired improvements

| ID | Deliverable |
|----|-------------|
| `IMPROVE-DESK-001`–`004` | Sidecars active |
| `IMPROVE-BRIDGE-001` | Loopback WSS IPC |
| `IMPROVE-ENG-001`–`003` | WGSL parity, splat, DirectStorage held path |
| `IMPROVE-COLLAB-001` | Spatial P2P pilot |
| `IMPROVE-GEN-002` | Neural audio/VFX held manifest |

### Key files

`apps/studio-local/`, `native_kernel.rs`, `desktop_commands.rs`, `lib/studio-local/release-manifest.ts`, `lib/v29-sidecar-lifecycle.ts`

### Acceptance

- xterm receives live PTY stdout
- File save on disk → asset tree refreshes < 500ms
- wgpu sidecar renders same frame graph ID as web (screenshot parity gate)

---

## Executor prompt template (copy for Claude)

```
Execute Wave N from meu-repo/docs/architecture/CLAUDE_MEGA_WAVES.md.

Rules:
- Complete the entire Wave (all DEBT + paired IMPROVE + acceptance).
- No micro-tasks outside Wave scope.
- Re-run npm run qa:enterprise-gate before declaring done.
- Update AI_CRITIQUE_DEBT_REGISTRY changelog with Wave N completion.
- Competitive bar: [paste Quality bar table from this file].
```

---

## Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | Initial mega-wave consolidation; supersedes fragmented Tier lists for execution |
