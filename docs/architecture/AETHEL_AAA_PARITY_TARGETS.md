# Aethel Engine — AAA Parity Targets (Onda G Nuclear Stack)

**Version:** 1.1 (Chief Architect — Deepened)  
**Status:** **Binding** — **Bíblia da Onda G** (Desktop / Capability Score **enthusiast** blueprint, 75–100)  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Studio cross-links:** [`AETHEL_STUDIO_SUPREMACY_INDEX.md`](AETHEL_STUDIO_SUPREMACY_INDEX.md) — S1 G-buffer, S7 meshlets
**Extends into:** [`AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md`](AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md) (Onda K — must not regress G when K disabled)  
**Laws:** **V** (Render Graph + Bindless + indirect draw), **I** (GPU-driven culling), **XV** (Scalable Fidelity — enthusiast tier only for full nuclear stack)

---

## Mandate

Aethel **does not** concede the **AAA graphics crown** to Unreal Engine by default. Onda G is not a generic “industry hardening” wave — it is the **declared confrontation** with UE5’s three rendering pillars:

| UE5 pillar | Aethel nuclear target | Codename |
|------------|----------------------|----------|
| **Nanite** | Virtualized micro-polygon streaming | **Aethel Micro-Poly** |
| **Lumen** | Real-time global illumination (no lightmap bake) | **Aethel Radiance** |
| **Chaos / Niagara** | GPU-driven destruction + particles | **Aethel Entropy** |

**We do not ship these on Day 1.** **“Unreal 100% today” is a false claim** — code depth remains ~**15% scaffold** until G acceptance suites pass (see §G.% evidence gates). Every Onda **A→F** foundation MUST expose **G-readiness hooks** so bindless heaps, indirect draws, compute queues, and Render Graph nodes can host these systems without rewrite.

**Platform Reality (non-negotiable):**
- **Full nuclear stack:** Desktop **wgpu** export, **enthusiast** blueprint (Law XV score 75+), RT-capable GPU when Radiance HW path enabled.
- **Web / webgl2 / integrated:** **No** Micro-Poly/Radiance/Entropy parity claims — SSGI + baked-light + FSR only (Law XV).
- **Zero-MVP:** No “Nanite” / “Lumen” / “Niagara” marketing labels until the corresponding nuclear module passes its **G acceptance suite**.
- **ZERO-AI ACCEPTANCE GATE (Doutrina Determinística):** Se qualquer um dos pilares de renderização ou simulação de física (Micro-Poly, Radiance, Entropy) depender de uma chamada de rede ou de um modelo neural generativo LLM/VLM no *hot-loop* para resolver frames ou polígonos, o módulo **FALHA** instantaneamente. A Engine Aethel esmaga a Unreal via matemática brutal e Data-Oriented Design (Rust), sem recorrer a muletas de Inteligência Artificial. A IA pertence estritamente ao Workflow da IDE.

**World Forge honesty (letter cc — 2026-07-13):** Planning ~100%; code depth still far behind G/S pillars. World Forge ships SDF→heightfield + PCG InstancedMesh scatter + CPU NavMesh — **not** Micro-Poly/Nanite cinema, **not** World Partition 50 km². Do not market “5M instances + Nanite” from Capability Score budgets.

**Aethel Cosmos honesty (letter cn — 2026-07-13; live soak co — 2026-07-13; PBR sky viewport cp — 2026-07-13; acoustic atmosphere wire cr — 2026-07-13):** Planetary/space scale interfaces CLOSED (`lib/cosmos/` — LWC f64, gravity volumes, nested grids, dual BVH, reversed-Z, CCD, interest, acoustic, PBR sky, floating origin, actor persistence). Soak-gated `cosmosScaleReady` (cn). Multi-frame live soak CLOSED as `cosmosPlaytestSoakReady` (co) — floating-origin rebase + nested island + CCD + dual BVH + CapScore. PBR sky viewport CLOSED as `pbrSkyViewportReady` (cp) — Rayleigh/Mie → AAARenderer `scene.background` visible frame (no painted skybox). Acoustic atmosphere CLOSED as `acousticAtmosphereReady` (cr) — vacuum/hull/atmosphere → playtest audio bus. **Do NOT claim** MMO space shipped / Star-Citizen-solved / painted skybox as planetary sky / Full HRTF AAA — Unreal/Unity also choke at true planetary MMO; we scaffold+wire toward supremacy. Agones fleet / Nanite / Coins / cloud immortal / UE atmosphere·Bruneton LUT maturity / Full HRTF AAA / MetaSounds GPU / DLSS marketing **HELD**.

**Ocean honesty (letter cm — 2026-07-13; mesh bind + explicit buoyancy cq — 2026-07-13):** Viewport FFT mesh + Rapier buoyancy CLOSED as `oceanViewportReady` (cm). AAA `OceanRenderPass` + duck-typed `WaterParams` + PBR sky/Radiance sun·cloud coupling + `OceanBuoyancyVolume` data-driven float CLOSED as `oceanMeshBindReady` (cq). Missing buoyancy metadata → fail-closed Zero-UI (AABB heuristic HELD). **Do NOT claim** UE Water parity / GPU FFT. Coins / Agones / Nanite / DLSS marketing **HELD**.
- **UI discipline:** [`AETHEL_ENGINE_SUPREMACY_CRITIQUE_AND_UI_DISCIPLINE.md`](./AETHEL_ENGINE_SUPREMACY_CRITIQUE_AND_UI_DISCIPLINE.md) — single Fidelity control; **no** new AAA panels/routes; deepen viewport + Project Settings only.

---

## Mathematical & architectural foundation (already binding)

Law V gives the **bindless + indirect** substrate UE built Nanite/Lumen on top of:

```
Cook (Law VI) → Meshlet clusters + BVH
     ↓
Bindless heaps (textures, VB/IB streams, material SoA)
     ↓
Compute culling (Hi-Z / frustum / occlusion) → visibility buffer
     ↓
multiDrawIndirect / mesh shader path (where supported)
     ↓
Scalable Render Graph nodes (Micro-Poly | Radiance | Entropy)
```

| Prerequisite | Onda | Module anchor |
|--------------|------|---------------|
| Scalable Render Graph kernel | **C** | `packages/engine/render/scalable-render-graph/` |
| Bindless resource heaps | **C–D** | wgpu bindless tables |
| GPU culling (no CPU Nanite hot loop) | **C** | Retire `nanite-streaming-controller.ts:253` CPU path |
| Virtual texturing + meshopt cook | **C–D** | Law VI distributed cook |
| Experimental RT graph node | **D** | enthusiast blueprint only |
| Capability Score gating | **B.1–D** | `HardwareDynamicProfile` |

---

## 1. Aethel Micro-Poly — Response to Nanite

**Goal:** Stream **virtualized geometry** at scale — billions of triangles in authored worlds with **zero CPU draw-call bottleneck**.

### Technical architecture

| Layer | Design |
|-------|--------|
| **Asset format** | Meshlet clusters (128–256 tri) + hierarchical LOD DAG; cooked via `nanite-meshlet-builder.ts` → **real QEM decimation** (closes `DEBT-NANITE-001`) |
| **Resident set** | Page table of meshlet groups; **Range Fetch** + local CAS (Law VI/VIII) |
| **Culling** | **Compute shader** pass: frustum + Hi-Z occlusion + LOD selection → visibility buffer |
| **Draw path** | **MultiDrawIndirect** from GPU-generated command buffer; bindless vertex/index streams (Law V) |
| **Mesh shaders** | **Preferred** on Vulkan/DX12 when `wgpu` exposes mesh pipeline; **fallback:** compute culling + indirect indexed draw (same visibility buffer) |
| **Render Graph** | Node: `MicroPolyVisibility` → `MicroPolyDepth` → `GBuffer` (feeds Radiance) |

### Contracts (target paths)

```typescript
// packages/engine/render/micro-poly/micro-poly-contracts.ts
export interface MeshletPage {
  pageId: string;
  clusterOffset: number;
  clusterCount: number;
  lodLevel: number;
  bounds: Float32Array; // AABB SoA
}

export interface MicroPolyVisibilityResult {
  drawIndirectBuffer: GPUBuffer;
  visibleClusterCount: number;
  gpuCullingMs: number;
}
```

| Rust (desktop authority) | TypeScript (cook + editor) |
|--------------------------|----------------------------|
| `apps/studio-local/src-tauri/src/render/micro_poly_cull.rs` | `lib/geometry/nanite-meshlet-builder.ts` (real decimation) |
| `gpu_culling.rs` (extend) | `packages/engine/render/micro-poly/` |

### G acceptance (Onda G — not before)

- [ ] 1M+ meshlets scene fixture @ 60 FPS on RTX 3060 class (1080p, enthusiast blueprint)
- [ ] CPU main thread **zero** per-mesh submit in hot path
- [ ] Visibility resolve shows **materials**, not debug meshlet ID colors
- [ ] CI: `cargo test` micro-poly + golden visibility buffer hash

### Prohibitions

- Labeling CPU subsample LOD as “Nanite” — **forbidden** (`DEBT-NANITE-001` must close first)
- Per-object bind groups on wgpu path — **forbidden** (Law V)

---

## 2. Aethel Radiance — Response to Lumen

**Goal:** **Hybrid real-time global illumination** — no static lightmap bake for dynamic GI; bakes remain for **web/low tier** only (Law XV).

### Technical architecture

| Mode | When | Technique |
|------|------|-----------|
| **Software path** | All enthusiast GPUs | **Voxel tracing** (clipmap radiance cache) + screen-space probe filtering; runs without RT cores |
| **Hardware path** | RT-capable (score 75+, RTX/RX) | **Hardware ray tracing** for diffuse GI + reflections; denoised via compute (SVGF-class) |
| **Hybrid scheduler** | Default enthusiast | SW voxel for multi-bounce stability + HW rays for specular/contact; single bindless G-buffer input |
| **Fallback (discrete 45–74)** | Law XV blueprint | SSGI + light probes (Onda D) — **not** full Radiance |
| **Web / integrated** | Law XV | Baked LM + SSGI — **no Radiance node** |

### Render Graph nodes

```
GBuffer (bindless) → RadianceVoxelTrace → RadianceDenoise → [RadianceHWTrace optional] → Combine → Post
```

| Resource | Bindless table |
|----------|----------------|
| Radiance clipmap | 3D texture array in heap |
| G-buffer (albedo, normal, roughness, depth) | Suballocated transient + persistent pools |
| History buffers | TAA + GI temporal accumulation |

### Contracts (target paths)

```typescript
// packages/engine/render/radiance/radiance-contracts.ts
export interface RadianceConfig {
  mode: 'software-voxel' | 'hybrid' | 'hardware-rt';
  clipmapLevels: number;
  voxelSizeMeters: number;
  maxTraceDistance: number;
  denoiser: 'svgf' | 'bmfr-lite';
}

export interface RadianceGraphBindings {
  gbufferBindlessIndex: number;
  clipmapBindlessIndex: number;
  outputIndirectDiffuse: GPUBuffer; // bindless UAV
}
```

| Module | Path |
|--------|------|
| Voxel GI core | `packages/engine/render/radiance/voxel-trace.wgsl` |
| HW RT node | `packages/engine/render/radiance/hw-rt-node.rs` (wgpu) |
| Editor tuning | `useRenderPipeline.presets.ts` — **JSON params only** (Law XVI / IMPROVE-AI-013); no hand-edited WGSL by agents |

### G acceptance

- [ ] Dynamic sun + moving emissives — stable GI without rebake
- [ ] Hybrid mode within **4 ms GPU** budget @ 1080p enthusiast fixture
- [ ] No “black probe” fallbacks in acceptance scene
- [ ] Marketing: **“Radiance GI”** only after acceptance suite green

### Prohibitions

- Claiming Lumen parity on **webgl2** — **forbidden**
- Shipping RT node without software voxel fallback on enthusiast non-RT GPUs — **forbidden**

---

## 3. Aethel Entropy — Response to Chaos / Niagara

**Goal:** **100% GPU-driven** destruction, fracture, and particle simulation — **zero CPU hot loops** for mass particles or debris.

### Technical architecture

| Subsystem | Design |
|-----------|--------|
| **Particles** | Niagara-style **visual graph compiles to compute shader**; SoA buffers (`position`, `velocity`, `life`, `attributes`); **no** `Vector3.clone()` per frame (`DEBT-PERF-001`) |
| **Destruction** | Voronoi/chunk fracture precomputed at cook; runtime **GPU impulse field** activates chunks; Rapier compound colliders synced via **SAB** (Law I) — physics on worker, transforms GPU-authored |
| **Fluids / smoke** | Optional Entropy pass: 3D grid advection compute → bindless volume render in graph |
| **Render Graph** | Node: `EntropySimulate` (compute) → `EntropyRender` (bindless instanced/indirect) |
| **Editor** | `NiagaraVFX` graph **must compile** to compute (closes `DEBT-NIAGARA-002`); cosmetic-only graph **forbidden** at G |

### Contracts (target paths)

```typescript
// packages/engine/render/entropy/entropy-contracts.ts
export interface EntropyEmitterSoA {
  capacity: number;
  position: Float32Array;
  velocity: Float32Array;
  life: Float32Array;
  attributes: Float32Array; // packed lanes
}

export interface EntropyDestroyEvent {
  chunkIds: Uint32Array;
  impulse: Float32Array; // xyz + magnitude
  gpuOnly: true; // CPU may schedule, not integrate particles
}
```

| Module | Path |
|--------|------|
| Compute sim | `packages/engine/render/entropy/entropy-sim.wgsl` |
| Graph compiler | `lib/vfx/entropy-graph-compiler.ts` |
| Rust sync | `apps/studio-local/src-tauri/src/render/entropy_sync.rs` |
| Legacy CPU path | `NiagaraParticleEmitter.runtime.ts` — **deprecate** at G |

### G acceptance

- [ ] 100k+ GPU particles @ 60 FPS with **0 GC** in sim hot path
- [ ] Destruction fixture: fractured mesh + debris without main-thread stall
- [ ] VFX graph edit → recompile → viewport update **without** IDE reload
- [ ] CI: particle SoA integrity fuzz test

### Execution deepen (2026-07-13cv — Colossal Gaps)

| Probe | Status | Path |
|-------|--------|------|
| Hierarchical Voronoi fragment plan | **CLOSED** | `cloud-web-app/web/lib/destruction/hierarchical-voronoi-plan.ts` |
| WebGPU debris integrate (`entropy-fracture-debris-v1`) | **CLOSED** soak-gated `gpuFractureReady` | `lib/destruction/gpu-fracture.ts` |
| CapScore hero Rapier budget (GT730 → 0 heroes) | **CLOSED** | `lib/destruction/hero-fragment-rapier-budget.ts` |
| DEST-001 convex hull cells | **CLOSED** (prior Block 5) | `destruction-fracture-generator.ts` |
| Fortune 3D Voronoi | **HELD** | — |
| Chaos / Niagara full parity | **HELD** (`chaosParityReady: false`) | honesty never flips marketing |

**Honest competitor:** Unreal Chaos remains more mature for production destruction. Aethel ships max-real GPU debris path + CapScore degrade; do not claim Chaos parity.

### Prohibitions

- CPU particle arrays in shipped **enthusiast** builds — **forbidden** at G
- Niagara UI that does not compile to GPU — **forbidden** at G (`DEBT-NIAGARA-002`)

---

## Onda G delivery map (nuclear stack)

| Phase | Deliverable | Depends |
|-------|-------------|---------|
| **G.3a** | Micro-Poly MVP — visibility + indirect draw in dogfood scene | C bindless, C culling |
| **G.3b** | Radiance software voxel path in graph | G.3a G-buffer |
| **G.3c** | Radiance HW RT hybrid (enthusiast + RT) | G.3b, D RT node |
| **G.3d** | Entropy particles compute + graph compiler | C compute queue |
| **G.3e** | Entropy destruction + Rapier compound sync | B joints, I SAB |
| **G.8** | Parity matrix + public benchmark scenes vs UE5 reference | All G.3* |

**Pilares G.1–G.2, G.4–G.9** remain as in Supremacy Roadmap (tests, netcode, cert, LiveOps, ecosystem). **This document is the rendering/nuclear bible for G.3.**

---

## G-readiness checklist (every Onda A–F PR touching render/sim)

- [ ] Uses bindless/indirect interfaces — no new per-draw bind groups on wgpu
- [ ] Registers pass as future Render Graph node — no hardcoded pass chain extension
- [ ] Capability Score aware — feature flags for enthusiast vs discrete vs webgl2
- [ ] Cook output compatible with meshlet page table (Micro-Poly)
- [ ] G-buffer layouts documented for Radiance injection **+ velocity MRT slot reserved (K.0)**
- [ ] Sim data SoA-friendly for Entropy compute migration
- [ ] Async compute queue slots documented (Micro-Poly cull ↔ splat radix sort barrier — K.0)
- [ ] **PSO fingerprint export** documented for cook vault (M.0)
- [ ] **WASM script boundary** documented — native wgpu/Rapier outside guest (M.0)
- [ ] **Law XI Rust gates** if touching `.rs`: `cargo check` + `cargo clippy -- -D warnings` + `cargo test`

---

## Parity matrix (UE5.4 — explicit targets)

| Capability | UE5 reference | Aethel nuclear target | Ship gate |
|------------|---------------|----------------------|-----------|
| Virtualized geometry | Nanite | **Micro-Poly** | G.3a |
| Dynamic GI | Lumen | **Radiance** (SW voxel + HW hybrid) | G.3b–c |
| GPU particles + destruction | Niagara / Chaos | **Entropy** | G.3d–e |
| Bindless + indirect | Yes | Law V — **Onda C** foundation | C |
| Web GI | N/A | Baked + SSGI only | XV |

**Honest claim after G.3 complete:** Desktop enthusiast exports **competitive with UE5.4** on geometry streaming, real-time GI, and GPU VFX/destruction — not “better in every dimension,” but **no free crown to Epic on graphics AAA**.

### G.% code-depth evidence gates (2026-08-10 — binding; anti-hype)

**FALSE CLAIM (forbidden in Progress / Index / marketing / scorecards):** “Unreal 100% today”, “UE parity shipped”, “G.3 CLOSED”, “Nanite/Lumen/Chaos ready”, or lifting Onda G from **~15% scaffold** without the gates below.

| Claimed uplift | Minimum evidence (all required) | Until then |
|----------------|---------------------------------|------------|
| **G.3a ≥25%** (Micro-Poly first light) | Dogfood meshlet scene + soak-gated visibility (not debug ID colors) + `cargo test` micro-poly + golden visibility hash; **no** Nanite marketing label | Stay **~15% scaffold / DEFERRED** |
| **G.3a acceptance** | AAA Parity §G acceptance checklist for Micro-Poly (1M+ meshlets @60 FPS RTX 3060 class; zero per-mesh CPU submit) | `nanite_*_ready` / marketing **false** |
| **G.3b–c Radiance** | SW voxel path in Render Graph + Law XV enthusiast-only; HW RT optional with RT score gate; webgl2 **excluded** | `lumen_*_ready` / Radiance GI marketing **false** |
| **G.3d–e Entropy** | GPU particles + destruction in graph; `chaosParityReady` stays false until Chaos-class soak | Niagara/Chaos parity marketing **false** |
| **G.8 “competitive with UE5.4”** | Published GF-MESH/RAD/ENT JSON + Law XV hardware profile vs UE5.4 reference scenes — no anonymous “up to 2x” | No public AAA crown claim |
| **Any Progress % bump** (e.g. 15%→30%) | Cite fixture IDs + commit + failing→passing soak in Changelog; Critic rejects % without evidence | Leave prior % |

**Kernel letter CLOSED ≠ G.% uplift.** Soak probes (ga–hn, etc.) are lab evidence, not nuclear acceptance. Progress Top-1 Matrix + Index scorecard must stay aligned.

---

## Approved decisions (#40–42, v4.2)

| # | Decision |
|---|----------|
| 40 | **Aethel Micro-Poly** — explicit Nanite-class target; compute cull + MultiDrawIndirect + mesh shader preferred |
| 41 | **Aethel Radiance** — hybrid SW voxel trace + HW RT; no bake on enthusiast; web excluded |
| 42 | **Aethel Entropy** — GPU compute particles + destruction; Niagara graph must compile; CPU sim forbidden at G |

---

## Studio pillar dependencies (G.3 consumes S outputs)

| G.3 module | Requires from Studio | Contract |
|------------|---------------------|----------|
| **Micro-Poly G.3a** | S7 meshlets, S2 cell pages | `MeshletPage` from cook |
| **Radiance G.3b–c** | S1 G-buffer + velocity MRT (K.0) | `GBufferLayoutId` |
| **Entropy G.3d–e** | S4 ability cues, S5 GAS events | MetaSounds + destroy events |
| **G.8** | Cinematic export / benchmark | Aligns **Decision #63** — engine capture primary; see [`AETHEL_CINEMATIC_DIRECTOR_DOCTRINE.md`](./AETHEL_CINEMATIC_DIRECTOR_DOCTRINE.md) |

---

## Competitor benchmark methodology (G.8)

**Goal:** Reproducible comparison vs UE5.4 reference scenes — not cherry-picked marketing.

| Scene | UE5 reference | Aethel fixture | Metrics |
|-------|---------------|----------------|---------|
| Geometry stress | City sample Nanite | **GF-MESH-001** | FPS, CPU main thread ms, draw calls |
| Dynamic GI | Lumen default scene | **GF-RAD-001** | GPU ms, probe stability score |
| Destruction + VFX | Chaos demo class | **GF-ENT-001** | Particle count, GC pauses |
| Combined | — | Dogfood G.8 scene | Weighted scorecard |

**Publish:** Benchmark JSON + hardware profile (Law XV) — no anonymous "up to 2x" claims.

---

## Extended acceptance + golden fixtures

| ID | Module | Fixture | Gate |
|----|--------|---------|------|
| **G-ACC-01** | Micro-Poly | GF-MESH-001 | 60 FPS RTX 3060 |
| **G-ACC-02** | Radiance SW | GF-RAD-001 | 4ms GPU, no black probes |
| **G-ACC-03** | Radiance HW hybrid | GF-RAD-001 + RT GPU | Optional enthusiast |
| **G-ACC-04** | Entropy particles | GF-ENT-001 | 100k @ 60 FPS, 0 GC |
| **G-ACC-05** | Entropy destruction | GF-ENT-001 | No main-thread stall |
| **G-ACC-06** | K off regression | GF-RAD-001 | Pixel hash vs G-only baseline |

See [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md).

---

## Cross-links

| Document | Relationship |
|----------|--------------|
| `AETHEL_RUNTIME_IMMUNITY_SPEC.md` | M extends runtime; S5 WASM for scripts only |
| `AETHEL_STUDIO_SUPREMACY_INDEX.md` | S1 Material fingerprints feed M.1 PSO Vault |
| `AETHEL_MATERIAL_SUBSTRATE_SPEC.md` | G-buffer layout for Radiance |
| `AETHEL_AI_FUSION_CREATIVE_SPEC.md` | Agents tune presets JSON — never raw WGSL (IMPROVE-AI-013) |
| `AI_CRITIQUE_DEBT_REGISTRY.md` | `DEBT-NANITE-001`, `DEBT-NIAGARA-002`, `DEBT-PERF-001` block G.3 marketing |
| `FUTURE_IMPROVEMENTS_REGISTRY.md` | `IMPROVE-ENG-008/009`, `IMPROVE-VFX-005` absorbed into G.3 nuclear map |
