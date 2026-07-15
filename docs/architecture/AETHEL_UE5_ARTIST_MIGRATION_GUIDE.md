# Aethel Engine — UE5 Artist & Technical Artist Migration Guide

**Version:** 1.0 (Chief Architect — Approved)  
**Status:** Binding companion — **not** marketing; honest feature mapping  
**Canonical:** [`AETHEL_STUDIO_SUPREMACY_INDEX.md`](AETHEL_STUDIO_SUPREMACY_INDEX.md)  
**Audience:** Artists, animators, level designers, technical artists migrating from Unreal Engine 5

---

## Philosophy

Aethel is **not** a UE5 clone. Workflows are **familiar** where possible; architecture differs where Aethel wins (web publish, Capability Score, governed AI, WASM scripts).

---

## Quick mapping table

| UE5 | Aethel | Spec | Day-1 parity |
|-----|--------|------|--------------|
| Material Editor + Substrate | Material Graph → WGSL | **S1** | High (simplified slabs) |
| Nanite | Micro-Poly | **G.3a** | Desktop enthusiast only |
| Lumen | Radiance | **G.3b–c** | Desktop; baked on web |
| Niagara | Entropy | **G.3d–e** | GPU graph required |
| World Partition | World Partition cells | **S2** | Desktop 50 km² |
| PCG Framework | PCG graph compiler | **S2** | Anti-Mock enforced |
| Landscape | terrain-engine-runtime | **S2** + A.1 | Wire in progress |
| Control Rig | Control Rig nodes | **S3** | Phase E |
| Sequencer | Sequencer tracks | **S3** | Schema D |
| MetaHuman | USD facial rig | **S3.4 + J.7** | No neural deformer |
| MetaSounds | MetaSounds compiler | **S4** | Web Audio DAG |
| GAS | GAS Rust + VS frontend | **S5** | IPC binary |
| Iris / replication | Replication Graph | **S6** | Post G.2 |
| Interchange / USD | Content pipeline | **S7** | J.7 integrator |
| Fab / Quixel | Hub + Treasury ingest | **H + S7** | Not Epic Fab lock-in |

---

## Material workflow (S1)

### UE5 habit
- Substrate slabs in Material Editor
- Material Instances for variants
- Parameter Collections for wind/wetness

### Aethel equivalent
1. Author in **Material Editor** (`packages/ide-ui/MaterialEditor/`)
2. Compile to **WGSL** (same path web + desktop)
3. Use **Parameter Collections** → bindless scene buffer (shared with S2 foliage)
4. **Material Instances** → `variantMask` + PSO fingerprint class

### What we do not ship Day 1
- Full Substrate slab count parity
- ML-driven material synthesis in-editor

### Migration tip
Export USD materials via **S7** → auto-convert graph or manual fallback. Golden test: **GF-MAT-001**.

---

## World & level design (S2)

### UE5 habit
- World Partition + Data Layers
- PCG graphs for dungeons/biomes
- Foliage paint + HISM

### Aethel equivalent
1. **LandscapeEditor** → `terrain-engine-runtime` (A.1)
2. **WorldPartitionCell** schema for streaming
3. **PCG graph** — must output ≥500 instances (desktop) or cook fails
4. Foliage → GPU indirect + S1 wind params

### Platform honesty
- **Do not** author 50 km² expecting web publish — use Law XV tiers
- Web: 1–4 km² authored tiles

### Migration tip
Bake static PCG for web builds; runtime regen on desktop only.

---

## Animation & cinematics (S3)

### UE5 habit
- Control Rig + IK Rig
- Sequencer for cutscenes
- MetaHuman for faces

### Aethel equivalent
1. **Sequencer** full track schema (not fov-only)
2. **Control Rig** FK/IK + foot lock to terrain
3. **MetaHuman-class** = USD import (**GF-USD-001**), not capsule proxy
4. **Law III** muscle sim on Rapier (native, not WASM)

### Not available
- ML Deformer (vision 2030)
- Epic MetaHuman license dependency

---

## Audio (S4)

### UE5 habit
- MetaSounds graph → runtime
- Quartz for rhythm
- Submix buses

### Aethel equivalent
- Same graph metaphor → **Web Audio DAG**
- **Play-log forbidden** at ship — must compile
- Generative stems (Law IX) use same runtime nodes

---

## Gameplay & multiplayer (S5–S6)

### UE5 habit
- Gameplay Tags + Data Assets
- GAS for abilities
- Iris replication

### Aethel equivalent
- Tags + data assets in cook manifest
- **GAS authority in Rust** — VS/WASM is frontend only
- **Replication Graph** with spatial cells from S2

### Surpass vector
- **WASM Shield (M.3)** — gameplay scripts cannot crash native engine

---

## Content import (S7)

### Recommended path
```
DCC export (USD preferred)
  → S7 validate-source
  → meshlet-build (G.3a)
  → material-convert (S1)
  → skeleton-retarget (S3)
  → manifest-v2 → viewport
```

**Time target:** Hero asset < 60s cook (**GF-USD-001**).

---

## AI-assisted authoring (J + L)

| Task | Tool | Guard |
|------|------|-------|
| Mesh from prompt | J.7 UsdIntegrator | No capsule proxy |
| Graph wiring | J.5 GraphOperator | Yjs undo (Trava II) |
| Code/engineering | L Forge sandbox | Validation gate |
| Cost | CreativeCostGuard | Trava I |

Agents **never** replace artist approval for shipped assets.

---

## Capability Score (Law XV) — artist-facing

| Blueprint | What artists should expect |
|-----------|---------------------------|
| enthusiast | Full Micro-Poly, Radiance, Entropy |
| discrete | SSGI + probes; reduced effects |
| integrated | Baked lighting; forward PBR |
| webgl2 | Baked only; 4 texture materials |

Export manifest logs tier — Hub badges stay honest.

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Hardcoded hex materials in TSX | S1 compiler + qa:hardcoded-colors |
| Empty PCG room | S2 Anti-Mock CI |
| Capsule character | S7 + J.7 USD path |
| MetaSounds play-log | S4 compiler |
| Assuming dedicated GPU for players | Law XV baked publish |

---

## Cross-links

| Doc | Purpose |
|-----|---------|
| `AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md` | GF fixtures for QA |
| `AETHEL_HARDWARE_SCALABILITY_SPEC.md` | Tier tables |
| `AETHEL_AI_FUSION_CREATIVE_SPEC.md` | AI custody chain |
