# Technical Audit & Placebo Diagnosis — Aethel Engine

**Status:** Validated against repository (Cursor, 2026-06-17)  
**Canonical backlog:** [`AI_CRITIQUE_DEBT_REGISTRY.md`](./AI_CRITIQUE_DEBT_REGISTRY.md) (`DEBT-*`) + [`FUTURE_IMPROVEMENTS_REGISTRY.md`](./FUTURE_IMPROVEMENTS_REGISTRY.md) (`IMPROVE-*`)  
**UX hitlist:** [`audit_frontend_ui_ux.md`](./audit_frontend_ui_ux.md) (A4–A50)

This document consolidates the user/GLM technical audit (simulation 3D, animation, netcode, atmosphere, foliage) with **code-validated** conclusions. No marketing claims.

---

## 1. Architectural asymmetry (confirmed)

| Layer | Maturity | Evidence |
|-------|----------|----------|
| Governance spine | High | `game-production-spine.ts`, `internal-runtime-governance.ts`, gate scripts |
| Runtime simulation / render / net | Mixed placebos | See §2 severity table |

---

## 2. Audited components — severity map

| Subsystem | File | Diagnosis | Severity | Debt / Improve |
|-----------|------|-----------|----------|----------------|
| Water Gerstner CPU | `lib/environment/WaterEditor.parts-runtime.tsx` | 128×128 plane = **16,641** verts; `useFrame` CPU loop; `geometry.attributes.position.clone()` every tick | 🔴 | `DEBT-PERF-004` → `IMPROVE-ENG-016` |
| Foliage erase | `lib/foliage-system.ts` | `removeCluster` → `instancedMesh.clear()` wipes **all** instances of type | 🔴 | `DEBT-FOLIAGE-001` → `IMPROVE-ENG-012` |
| Foliage culling placebo | `lib/foliage-system.ts` | `cluster.visible` set ~293; **never** read — no matrix/instance count update | 🔴 | `DEBT-FOLIAGE-001` |
| Foliage painter meshes | `lib/environment/FoliagePainterPanels.runtime.tsx` | One `<mesh>` + new `ConeGeometry`/`CylinderGeometry` per instance | 🔴 | `DEBT-PERF-003` → `IMPROVE-STUDIO-011` |
| Volumetric clouds | `lib/volumetric-clouds.ts` | `depthWrite: false`; no scene depth blend; `blueNoise: null`; DOM `querySelector` per frame ~116; `GodRaysPass` constructed ~344 but **not** called in `render()` ~360 | 🔴 | `DEBT-CLOUD-001` → `IMPROVE-ENG-013` |
| Motion matching heap | `lib/motion-matching-soa.ts` | SOA Float32Array strides — CLOSED 2026-07-11ad | 🟢 | `DEBT-MOTION-001` |
| Motion pose lookup | `lib/motion-matching-soa.ts` | O(1) `getPoseIndex` — CLOSED 2026-07-11ad | 🟢 | `DEBT-MOTION-001` → `IMPROVE-ENG-014` |
| Motion search | `lib/motion-matching-system.ts` | `MotionKDTree` exists ~355, ~436 — **only** when `shouldSearch`; not O(1) indexed frame access | 🟡 | Nuance: kd-tree for match, not playback |
| Foot lock | `lib/motion-matching-system.ts` | Two-bone when leg chain; lerp HELD-labeled — CLOSED 2026-07-11ad | 🟢 | `IMPROVE-ENG-014` |
| Rollback netcode | `lib/networking-netcode.ts` | `JSON.parse(JSON.stringify(state))` ~205; `stateHistory.find` ~225 | 🔴 | `DEBT-NET-001` → `IMPROVE-ENG-015` |
| Network serializer | `lib/networking-serializer.ts` | `JSON.stringify` + `TextEncoder` for keys/actions/customData ~8–122 | 🔴 | `DEBT-NET-001` |
| Plugin install API | `app/api/plugins/install/route.ts` | HTTP 503 stub | 🟡 | `DEBT-PLUGIN-001` |
| Model loader flatten | `lib/engine/asset-pipeline-runtime/loaders.ts` | GLTF traverse → single buffer; no skeleton/hierarchy | 🔴 | `DEBT-ASSET-001` |
| Spatial reverb | `lib/audio/spatial-audio-manager-core.ts` | `reverbGain` wired; `play()` → categoryGain → master — **no** `reverbNode` on sources | 🔴 | `DEBT-AUDIO-001` |
| Terrain smooth | `lib/terrain/TerrainSculptingEditor.runtime.tsx` | `sculpt_smooth`: `(h,_d) => h` ~165–166 | 🔴 | `DEBT-TERRAIN-001` |
| Terrain erosion | `lib/terrain/TerrainSculptingEditor.runtime.tsx` | `log.info` only ~231 | 🟡 | Placebo UI |
| Niagara graph | `lib/engine/NiagaraVFX.runtime.tsx` | Graph cosmetic | 🔴 | `DEBT-NIAGARA-002` |
| Yjs collaboration | `lib/server/websocket/legacy-collaboration-handler.ts` | Fallback: broadcast only — no `Y.applyUpdate(doc, update)` ~38–42 | 🔴 | `DEBT-YJS-001` |
| Tauri desktop | `desktop_commands.rs` | held stubs | 🔴 | `DEBT-DESK-002/003/004` |
| Native kernel manifest | `native_kernel.rs` | Blocks native claims | 🔴 | `DEBT-DESK-006` |
| Admin stub generator | `scripts/create-admin-stubs.mjs` | Auto-creates "V34 Dominance Wave" placeholder pages | 🟡 | `DEBT-ADMIN-001` |
| Save compression | `lib/save/save-manager-runtime/serializers.ts` | Base64 only ~37–38 (+~33% size) | 🟡 | `DEBT-SAVE-001` |
| Film audio layout | `FilmStudioClient.tsx` | SoundCue in narrow inspector | 🔴 | `IMPROVE-FILM-001` (prior batch) |
| Studio hub reload | `app/studio/page.tsx` | Route remount destroys WebGL | 🔴 | `IMPROVE-STUDIO-002/006` |
| VS keyboard palette | `VisualScriptEditor.tsx` | Sidebar-only node pick; no pin type validation | 🟡 | `IMPROVE-VS-011` |
| BVH / path trace | `ray-tracing.ts`, `ray-tracing-bvh.ts` | Sync `rebuildBVH`; `createDataTextures` packs only `n0` | 🔴 | `DEBT-PERF-002`, `DEBT-RT-001` |
| Nanite LOD | `nanite-meshlet-builder.ts` | `simplifyMeshlets` subsample — holes at distance | 🔴 | `DEBT-NANITE-001` |
| Virtual texturing | `virtual-texture-system.ts` | Feedback RT never rendered; sync `readRenderTargetPixels` | 🔴 | `DEBT-VT-001` |
| Destruction fracture | `destruction-fracture-generator.ts` | Convex hull + normals; Fortune 3D HELD; Rapier session optional | 🟡 | `DEBT-DEST-001` |
| Cloth simulation | `cloth-simulation*.ts` | Numeric hash + bone capsules; GPU collision HELD | 🟡 | `DEBT-CLOTH-001` |
| AI voice | `ai-audio-engine.ts` | `generateVoice` silent buffer; lipsync → `sil` | 🔴 | `DEBT-AUDIO-002` |
| AI SFX | `ai-audio-engine-sfx.ts` | Procedural footstep/impact/etc. **works** | ✅ | Not debt |
| WebXR foveation | `webxr-vr-foveated-rendering.ts` | Darken shader; `applyToLayer` never in `onXRFrame` | 🔴 | `DEBT-VR-001` |
| Terminal PTY fracture | `terminalWebSocket.ts`, `terminal-pty-runtime.ts` | WS → node-pty on **server** host; Tauri `create_held`; no desktop bridge in xterm | 🔴 | `DEBT-TERM-001`, `DEBT-DESK-002` |
| Dashboard banner stack | `DashboardShell.tsx` | Trial + routing + alerts + entry intent above fold | 🟡 | `DEBT-UX-DASH-001` |
| Route maturity inflation | `route-maturity-registry.ts`, `check-hidden-route-leak.mjs` | 13 hidden; 20 ALPHA partial; gate PASS | 🟡 | `DEBT-ROUTE-001` |
| Billing plan drift | `plans.ts`, `plan-limits.ts` | Prices/storage/tokens ≠ product spec ($9/$29/$79) | 🔴 | `DEBT-FIN-010` |
| Token weight / Opus bleed | `metering.ts`, `ai/chat/route.ts` | No 40×/200× weights; pre-estimate only | 🔴 | `DEBT-FIN-008`, `DEBT-FIN-009` |
| Stripe cancel gap | `billing/webhook/route.ts` | `User.plan` not reset to free | 🔴 | `DEBT-FIN-005` |
| Credit double-spend | `credit-wallet.ts`, `credits/transfer/route.ts` | Reservations ignored; transfer race | 🔴 | `DEBT-FIN-006`, `DEBT-FIN-007` |
| BYOK / R2 / P2P deploy | — | Not in codebase | 🔴 | `DEBT-BILLING-001`, `DEBT-INFRA-001` |
| AI-tunneling dashboard | `DashboardEntryIntentBanner.tsx` | "Resume in AI Chat" ignores IDE workspace state | 🔴 | `DEBT-UX-DASH-002` → `IMPROVE-UX-009` |
| Electron + Tauri duplicate | `runtime-templates/` vs `apps/studio-local/` | Two desktop channels; Electron ~100MB | 🟡 | `DEBT-DESK-007` |
| Admin orphan routes | `app/admin/*` | **12** dirs with panels, no `page.tsx` → 404 | 🔴 | `DEBT-ADMIN-002` |
| CSP loopback block (prod) | `middleware.ts` | `connect-src` excludes localhost when not dev | 🔴 | `DEBT-CSP-001` |
| Rate limit fail-closed | `middleware.ts` | Upstash error → global 503 | 🔴 | `DEBT-OPS-001` |
| RenderJob swallowed error | `api/render/jobs/[jobId]/route.ts` | `.catch(() => null)` masks missing migration | 🔴 | `DEBT-RENDER-001` |

---

## 3. Structural decisions (recommended answers)

### 3.1 Foliage (`foliage-system.ts`)

**Yes** — reescrever remoção para erase pontual por instance index + compactação de buffer, não `clear()` por tipo.

**Yes** — integrar LOD/culling na GPU: rebuild `instanceMatrix` buffer com visible instances only, ou per-instance attribute + compute culling (`IMPROVE-ENG-012`).

### 3.2 Volumetric clouds (`volumetric-clouds.ts`)

**Yes** — depth-aware compositing (read scene depth RT), wire `GodRaysPass.render()` no loop, cache canvas size (no DOM query), load real blue-noise texture (`IMPROVE-ENG-013`).

### 3.3 Motion matching (`motion-matching-system.ts`)

**Yes** — migrar poses para SOA `Float32Array` (positions/rotations strides); frame lookup = `base + frameIndex * stride` O(1).

**Yes** — manter `MotionKDTree` para **search**; separar playback index from linear `find`.

**Yes** — foot lock → two-bone IK solver on leg chain (`IMPROVE-ENG-014`).

### 3.4 Netcode (`networking-netcode.ts` / `networking-serializer.ts`)

**Yes** — banir JSON/stringify no hot path; bitpack input keys; struct binary layout; rollback ring buffer indexed by frame mod N (`IMPROVE-ENG-015`).

---

## 4. UX/UI gaps (cross-ref)

See `audit_frontend_ui_ux.md`: PremiumLoadingState (~1300 "Carregando…"), VS inline styles (A4), outliner virtualization (A8), canvas timelines (A10), xterm console (A11).

Promoted improvements: `IMPROVE-UX-004`, `IMPROVE-IDE-016`, `IMPROVE-VS-011`, `IMPROVE-FILM-001`, `IMPROVE-STUDIO-002`.

---

## 5. Execution order (for Claude Opus)

> **Use [`CLAUDE_MEGA_WAVES.md`](./CLAUDE_MEGA_WAVES.md)** — not this section — for session planning.  
> Summary map: Wave 1 Agent → 2 Collab → 3 Render → 4 World → 5 Character → 6 Platform → 7 UX → 8 Sensory → 9 Desktop.

**Legacy tier tags (evidence only):**

**Tier 1 (truth / data loss):** `DEBT-FOLIAGE-001`, `DEBT-YJS-001`, `DEBT-NET-001`  
**Tier 2 (simulation credibility):** `DEBT-CLOUD-001`, `DEBT-MOTION-001`, `DEBT-PERF-004`, `DEBT-PERF-003`, `DEBT-PERF-002`, `DEBT-RT-001`, `DEBT-VT-001`, `DEBT-NANITE-001`  
**Tier 2b (physics/audio/VR):** `DEBT-DEST-001`, `DEBT-CLOTH-001`, `DEBT-AUDIO-002`, `DEBT-VR-001`  
**Tier 3 (post-debt quality):** `IMPROVE-ENG-012`–`022`, `IMPROVE-AI-015`, `IMPROVE-VS-011`, `IMPROVE-UX-004`

**Gate:** `npm run qa:enterprise-gate` PASS before each Wave and before declaring Wave complete.

---

## 6. Changelog

| Date | Change |
|------|--------|
| 2026-06-17 | Initial ingest from user audit paste; all rows validated in Cursor session |
| 2026-06-17 | Linked to `DEBT-*` / `IMPROVE-*` registries; resolves `DEBT-AUDIT-001` |
| 2026-06-17 | Batch 10: RT/BVH, Nanite, VT, destruction, cloth, AI voice, WebXR |
| 2026-06-17 | Batch 11: terminal PTY fracture, dashboard banners, route maturity gate |
