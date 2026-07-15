# Aethel Engine — World Systems Spec (Studio Pillar S2)

**Version:** 1.2 (Chief Architect — Deepened + node catalog)  
**Status:** **Binding** — **Studio Pillar S2** — Landscape, World Partition, PCG, Foliage  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Laws:** VI (cook/stream), I (streaming sim), XV (budgets)  
**Replaces:** one-line "PCG Graph runtime" / "50 km²" roadmap entries

---

## Mandate

UE level designers use **World Partition**, **Landscape**, **PCG**, **Foliage**, **Water**. Aethel **A.1** wires terrain — **S2** defines the **full open-world authoring stack**.

**Zero-MVP:** No empty PCG rooms (Anti-Mock). No "open world" marketing without partition streaming proof.

---

## State today (honest)

| System | Status |
|--------|--------|
| `terrain-engine-runtime` | REAL — wired viewport + LandscapeEditor durable brush (A.1 al/an) |
| Landscape brushes an–bh | **CLOSED** — heightfield / splat / foliage / erosion / seeded noise |
| **World Forge deepen (letter cc)** | **PARTIAL CLOSED** — SDF→heightfield + PCG hybrid InstancedMesh + biome filters + seamless math bake + CPU NavMesh (`lib/world-forge`) |
| **World Forge → Studio IDE (letter cd)** | **CLOSED** — `gen-world` panel + route/bridge; math PCG ready; LoRA/Partition `[HELD]` |
| **GPU NavMesh / Recast soak (letter ch)** | **CLOSED** — WebGPU heightfield→walkable + conveyor; Unreal Recast/Detour parity `[HELD]` |
| World Partition | **AUSENTE** / streaming carve **HELD** |
| PCG graph runtime | **PARTIAL** — hybrid Perlin/WFC-lite scatter CLOSED (cc); full UE PCG compiler / city-from-prompt **HELD** |
| Foliage GPU instancing | bf InstancedMesh CLOSED; wind/indirect draw marketing HELD |
| HLOD / OFPA | **AUSENTE** |
| Water volume | partial |
| NavMesh bake | CPU grid CLOSED (cc); GPU heightfield→walkable CLOSED (ch); Unreal Recast/Detour parity **HELD** |

**Competitor honesty (cc):** We have **NOT** surpassed Unreal/Unity AAA runtime (Nanite/Lumen/World Partition/editor maturity). World Forge is the **worlds** wedge — not “one better chair.” vs Meshy/Tripo: lead game-ready refine (bw/bz/ca); raw clay quality still HELD (`nativeOnnxReady`).

---

## Architecture

```
Landscape heightfields (authoring)
     ↓ cook → chunked height + weight maps
World Partition Grid (cellId, bounds, LOD policy)
     ↓ streaming (Range Fetch + local CAS)
PCG Graph → instances (meshes, foliage, splines)
     ↓
Micro-Poly pages + Foliage indirect draw (G.3a)
     ↓
Entropy / Radiance per cell (budgeted)

### Entropy / Mass deepen (2026-07-13cv/cw)

| System | Status |
|--------|--------|
| GPU-Driven Fracture (cv) | **CLOSED** soak — `gpuFractureReady`; Chaos parity **HELD** |
| GPU Mass ECS (cw) | **CLOSED** soak 1k–10k — `gpuMassEcsReady`; 100k claim **HELD** |
| World Partition streaming | **CLOSED** soak as **ck** — no-loading-screen claim **HELD** |

Per-cell Entropy debris + Mass crowds share CapScore budgets (Law XV GT730 fail-closed Zero-UI).
```

### World Partition contract

```typescript
export interface WorldPartitionCell {
  cellId: string;
  bounds: [number, number, number, number]; // xmin,zmin,xmax,zmax
  hlodLevel: number;
  cookManifestRef: string;
  streamingPriority: number;
}
```

### PCG compiler

- Graph nodes: surface sampler, mesh scatter, spline, density filter, attribute transfer
- Output: **instanced transforms SoA** + HISM batches — not empty arrays
- Cook-time bake for static; runtime regen for dynamic (budget cap)

---

## Delivery (S2.0 → S2.4)

| Step | Deliverable | Wave |
|------|-------------|------|
| **S2.0** | Cell schema + A.1 terrain → partition hook | A.1, C |
| **S2.1** | Streaming loader (desktop 50 km² target) | D |
| **S2.2** | PCG graph compiler + runtime (non-empty output) | C–D |
| **S2.3** | Foliage GPU + wind (parameter collection S1) | D |
| **S2.4** | HLOD + water integration | D–G |

---

## Acceptance

- [ ] 50 km² desktop: fly-through without OOM; cell load < 100ms p95
- [ ] PCG dungeon: ≥ 500 instanced meshes from graph — not empty
- [ ] Web: honest subset — 1–4 km² with strict cell budget (Law XV) — CapScore budgets CLOSED (cg); km² claim HELD
- [x] A.1: LandscapeEditor / viewport drives live `terrain-engine-runtime` + heightfield authority (CORE al viewport; sculpt/smooth/flatten durable **an**; **Landscape paint/splat deepen CLOSED 2026-07-13be**; **Landscape foliage brush deepen CLOSED 2026-07-13bf**; **Landscape erosion hydraulic/thermal CLOSED 2026-07-13bg**; **seeded sculpt-noise CLOSED 2026-07-13bh**)
- [x] World Forge (cc): SDF/fractal → durable heightfield + PCG hybrid scatter into foliage InstancedMesh + biome filter + CPU NavMesh rebuild (full PCG graph ≥500 **[HELD]**)
- [x] GPU Recast (ch): WebGPU compute heightfield→walkable + conveyor soak (`gpuRecastReady` soak-gated; Unreal Recast/Detour parity **[HELD]**)
- [x] World Partition cell API (cg): `WorldPartitionCell` load/unload + view surgical tick + Law XV CapScore budgets (`lib/world-streaming`) — **no-loading-screen / 50km² / UE parity still [HELD]**
- [x] Partition streaming soak (ck): frustum/view fly-through + CapScore contrast + SimulationTick/GameLoop opt-in; `partitionStreamingReady` soak-gated — **no-loading-screen / UE World Partition parity / 50km² still [HELD]**
- [x] Aethel Cosmos volumetric 3D partition deepen (cn): `VolumetricStreamer` Y-cells + CapScore tighter residents; planetary SDF sculpt-at-distance ties World Forge SDF — **UE World Partition 3D / streaming carve parity / MMO space still [HELD]**

---

## Platform Reality

| Platform | World claim |
|----------|-------------|
| Desktop enthusiast | 50 km² partition |
| discrete / integrated | 4–8 km² |
| webgl2 | authored tiles only; no 50 km² marketing |

---

## PCG node catalog (S2.2+ — binding taxonomy)

| Category | Nodes | Output |
|----------|-------|--------|
| **Input** | SurfaceSampler, SplineInput, VolumeSampler | point cloud |
| **Scatter** | MeshScatter, FoliageScatter, PoissonDisk | transforms SoA |
| **Filter** | SlopeFilter, HeightFilter, DensityMask | culled set |
| **Transform** | RandomRotation, ScaleRange, AlignToNormal | modified SoA |
| **Merge** | Union, Subtract (by tag) | combined batch |
| **Output** | StaticMeshInstances, HISMBatch | cook + runtime |

**Anti-Mock rule:** `MeshScatter` output length ≥ `minInstances` (500 desktop / 50 web) or cook **FAIL**.

**Golden fixtures:** **GF-WORLD-001**, **GF-WORLD-002** — see Execution Playbook.

---

## Competitor baseline (UE5 / Unity 6)

| UE5 capability | Unity 6 | Aethel S2 target | Surpass vector |
|----------------|-----------|------------------|----------------|
| World Partition | Addressables + scenes | `WorldPartitionCell` schema | Same cell drives S6 replication |
| Landscape / Terrain | Terrain tools | A.1 `terrain-engine-runtime` wire | Web publish of terrain tiles |
| PCG Framework | Procedural | Graph compiler + non-empty output | Anti-Mock CI gate |
| Foliage / HISM | GPU instancing | Indirect draw + S1 wind params | GPU cull Law I |
| HLOD / OFPA | LOD Groups | S2.4 HLOD per cell | Streaming with M.2 zero-copy |
| Water | HDRP Water | Gerstner GPU (`IMPROVE-ENG-016`) | No 16k CPU vertex loop |
| Data Layers | Scene variants | Cell `streamingPriority` + tags S5 | Gameplay tag driven streaming |

---

## Known limitations (honest)

| Limitation | Platform | Mitigation |
|------------|----------|------------|
| 50 km² desktop only | web | 1–4 km² honest cap; tile-based publish |
| PCG runtime regen budget | webgl2 | Cook-time bake only on web |
| One World Partition grid per level | v1 | Multi-grid = vision 2030 |
| LiDAR ingest | — | S7 mobile capture → K.3 splat optional |

---

## Performance budgets

| Metric | enthusiast | discrete | webgl2 |
|--------|------------|----------|--------|
| Cell load p95 | < 100ms | < 200ms | < 300ms |
| Active cells in memory | ≤ 64 | ≤ 32 | ≤ 8 |
| PCG instances (dungeon) | ≥ 500 | ≥ 200 | ≥ 50 (baked) |
| Fly-through OOM | 0 in 30min | 0 in 15min | strict budget |

---

## Failure modes & mitigations

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Empty PCG output | Anti-Mock violation | S2.2 CI min count; cook fail-closed |
| Cell load stall | Hitches | M.2 async IO; priority queue |
| Terrain unwired (A.1) | Editor disconnect | A.1 blocker before S2.1 marketing |
| Foliage `clear()` nuke | `DEBT-FOLIAGE-001` | **CLOSED 2026-07-11ac** — surgical erase `IMPROVE-ENG-012` (GPU visible cull included) |

---

## Extended acceptance suite

- [x] **S2-ACC-01:** A.1 heightfield ↔ terrain-engine / viewport live mesh + physics substrate (CORE 2026-07-11al)
- [ ] **S2-ACC-02:** 50 km² fly-through 30min — memory flat; cell churn logged
- [ ] **S2-ACC-03:** PCG graph → ≥ 500 meshes; golden transform hash
- [ ] **S2-ACC-04:** Foliage wind responds to S1 parameter collection
- [ ] **S2-ACC-05:** HLOD swap at distance — no pop > 1 frame without crossfade

---

## Debt & IMPROVE cross-links

| ID | Maps to |
|----|---------|
| A.1 (roadmap) | S2.0 terrain wire |
| `DEBT-FOLIAGE-001` | S2.3 foliage — **CLOSED 2026-07-11ac** |
| `IMPROVE-ENG-012` | Foliage GPU cull — **CORE shipped 2026-07-11ac** (LOD GPU zero-scale) |
| `IMPROVE-ENG-016` | Water GPU shader |
| `DEBT-NANITE-001` | Meshlet pages from cells → G.3a |
| `DEBT-CLOUD-001` | Volumetric depth/god-rays — **CLOSED** (letter by 2026-07-13; full AAA marketing HELD) |
| World Forge cc | SDF + PCG hybrid + biome + seamless bake + CPU NavMesh — **CLOSED 2026-07-13cc**; Partition/full PCG HELD |
| GPU Recast ch | WebGPU heightfield→walkable soak — **CLOSED 2026-07-13ch**; Unreal Recast/Detour parity HELD |

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_AAA_PARITY_TARGETS.md` | Micro-Poly streams meshlets from cells |
| `AETHEL_RUNTIME_IMMUNITY_SPEC.md` | M.2 streams cell pages |
| `AETHEL_CONTENT_PIPELINE_SPEC.md` | Cook outputs cell manifests |
