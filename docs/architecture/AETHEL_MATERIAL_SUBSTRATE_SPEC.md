# Aethel Engine — Material Substrate Spec (Studio Pillar S1)

**Version:** 1.2 (Chief Architect — Deepened + node catalog)  
**Status:** **Binding** — **Studio Pillar S1** — Material authoring + Substrate-class shading  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Prerequisites:** Law V (bindless), Onda C Render Graph, [`AETHEL_AAA_PARITY_TARGETS.md`](AETHEL_AAA_PARITY_TARGETS.md) G-buffer  
**Unlocks:** M.1 PSO Vault fingerprints, G.3 Radiance, artist workflow vs UE Material Editor

---

## Mandate

UE5 artists live in **Material Editor** + **Substrate**. Aethel cannot claim render parity with **hardcoded materials** in `aaa-renderer-impl.ts` or hex in TSX. **S1** is the **authoring + compilation** layer above bindless heaps.

**Absolute Manual Supremacy Rule:** The node graph must be fully usable by a human Technical Artist without any AI assistance. They must be able to drag-and-drop math and texture nodes, adjust sliders, and see a deterministic, instant compilation to WGSL. AI may assemble a material graph for the user, but the user must be able to inspect and infinitely tweak it by hand.

**Zero-MVP:** No "material system" marketing until graph → WGSL → viewport compiles and PSO fingerprints register.

---

## State today (honest)

| Item | Status |
|------|--------|
| Bindless heaps (planned) | Onda C |
| Material node graph UI | Partial / scattered |
| WGSL material compiler | **AUSENTE** |
| PSO fingerprint from materials | M.0 hook only |
| Substrate-style layering | **AUSENTE** |
| Decal / mesh painting | **AUSENTE** |

---

## Architecture

```
Material Graph (authoring)
     ↓ compile (cook + live)
WGSL shader modules + bind layout SoA
     ↓
PSO Fingerprint Registry (M.1)
     ↓
Render Graph: GBuffer / Forward+ / Micro-Poly / Radiance inputs
```

### Substrate-class model (simplified — not UE clone)

| Layer | Purpose |
|-------|---------|
| **Slab stack** | Up to 8 slabs: diffuse, specular, normal, coat, fuzz, emission — blend weights |
| **Material functions** | Reusable subgraphs → inlined at compile |
| **Parameter collection** | Scene-wide scalars (wind, wetness) — bindless buffer |
| **Instancing** | Per-instance custom data (SoA) for foliage/HISM |

### Platform paths

| Blueprint | Material feature set |
|-----------|---------------------|
| enthusiast | Full slab + RT-compatible G-buffer |
| discrete | Reduced slabs; baked detail |
| webgl2 | Static shader variants only; max 4 textures |

---

## Contracts

```typescript
// packages/engine/render/material/material-substrate-contracts.ts
export interface MaterialGraphCompileResult {
  wgslModule: string;
  psoFingerprint: string;
  bindLayoutId: string;
  textureSlotCount: number;
  variantMask: number;
}

export interface MaterialParameterCollection {
  id: string;
  scalars: Float32Array;
  vectors: Float32Array;
}
```

| Module | Path |
|--------|------|
| Graph compiler | `packages/engine/render/material/material-graph-compiler.ts` |
| WGSL backend | `packages/engine/render/material/material-wgsl-backend.wgsl` |
| Editor | `packages/ide-ui/MaterialEditor/` |
| Cook stage | `lib/production/material-cook-stage.ts` |

---

## Delivery (S1.0 → S1.3)

| Step | Deliverable | Wave |
|------|-------------|------|
| **S1.0** | Schema + fingerprint hook (M.0) | C |
| **S1.1** | Graph compiler → WGSL + viewport preview | C–D |
| **S1.2** | Slab stack + material functions | D |
| **S1.3** | VT sampling + decal projection | D–G |

---

## Acceptance

- [ ] Hero material: 20-layer graph compiles < 500ms; PSO fingerprint stable across reload
- [ ] Micro-Poly + Radiance consume same G-buffer layout from S1 output
- [ ] `qa:hardcoded-colors` — zero hex materials in shipped scenes
- [ ] CI: golden WGSL hash per fixture material

---

## Prohibitions

- Hex/`style={{color}}` as shipped surface shading — forbidden (Law X)
- Per-draw material bind groups on wgpu — forbidden (Law V)
- "Substrate parity" on webgl2 — forbidden

---

## Authoring node catalog (S1.1+ — binding taxonomy)

| Category | Nodes (phase 1) | WGSL output |
|----------|-----------------|-------------|
| **Constants** | Float, Vector2/3/4, Color (token-only) | Uniform buffer |
| **Textures** | Sample2D, SampleVT, NormalFromMap | bindless index |
| **Math** | Add, Mul, Lerp, Fresnel, Noise | inlined |
| **Slabs** | DiffuseSlab, SpecularSlab, CoatSlab, EmissiveSlab | slab stack |
| **Utility** | WorldPosition, VertexNormal, CameraVector | varyings |
| **Functions** | MaterialFunctionCall (subgraph) | inlined at cook |
| **Params** | ScalarParam, VectorParam, TextureParam | instance + collection |
| **Phase 2** | DecalProject, MeshPaintBlend | S1.3 |

**Golden fixture:** **GF-MAT-001** — 20-layer graph exercising all phase-1 nodes.

---

## Implementation file touch list (executor)

| Phase | Files to create/modify |
|-------|-------------------------|
| S1.0 | `material-substrate-contracts.ts`, cook manifest hook |
| S1.1 | `material-graph-compiler.ts`, `MaterialEditor/` UI, `material-wgsl-backend.wgsl` |
| S1.2 | Slab stack in compiler; material function inliner |
| S1.3 | VT sample node; decal projection pass hook |

---

## Competitor baseline (UE5 / Unity 6)

| UE5 capability | Unity 6 | Aethel S1 target | Surpass vector |
|----------------|-----------|------------------|----------------|
| Material Editor node graph | Shader Graph | `MaterialEditor/` + compiler | Same graph → web + desktop WGSL |
| Substrate slab blending | HDRP Stack | 8-slab simplified model | Fewer permutations → faster PSO vault |
| Material Functions | Sub Graphs | Inlined subgraphs | Cook-time inline; no runtime overhead |
| Parameter Collections | Global properties | Bindless scene buffer | Wind/wetness shared with S2 foliage |
| Material Instances | Variants | `variantMask` + instancing | PSO fingerprint stable per instance class |
| Decal / mesh paint | Decal projectors | S1.3 decal projection | VT-aware decals on Micro-Poly |

**Unity gap:** Shader Graph does not share WGSL with desktop wgpu — Aethel **single compiler** is structural advantage.

---

## Known limitations (honest)

| Limitation | Platform | Mitigation |
|------------|----------|------------|
| Max 4 textures on webgl2 | webgl2 | Static variants; bake atlases at cook |
| No runtime slab recompile at 60 Hz | all | Cook on edit; live preview uses reduced set |
| Substrate != UE slab count | all | Document artist migration guide; import converter S7 |
| RT-compatible G-buffer cost | integrated | Law XV: drop coat/fuzz slabs on integrated tier |

---

## Performance budgets

| Metric | enthusiast | discrete | webgl2 |
|--------|------------|----------|--------|
| Graph compile (hero 20-layer) | < 500ms | < 800ms | < 2s (static) |
| Live preview recompile | < 200ms | < 400ms | cook-only |
| PSO fingerprints per project | ≤ 512 tier bundle | ≤ 256 | ≤ 64 variants |
| Texture slots per draw | bindless heap | bindless | 4 hard cap |

---

## Failure modes & mitigations

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Variant explosion | M.1 vault OOM | `variantMask` cap; CI combinatorics audit |
| WGSL compile error | Black viewport | Fail-closed editor banner; Critic cannot approve without green compile |
| G-buffer layout drift | Radiance break | Versioned `GBufferLayoutId` in compile result; migration table |
| Hex in TSX materials | QA gate fail | `qa:hardcoded-colors` + prohibition #52 |

---

## Extended acceptance suite

- [ ] **S1-ACC-01:** Import USD material → S1 graph → viewport matches reference screenshot (ΔE < 5)
- [ ] **S1-ACC-02:** 100 material instances share 1 PSO fingerprint class
- [ ] **S1-ACC-03:** Parameter collection update propagates to 10k foliage instances in 1 frame
- [ ] **S1-ACC-04:** Decal on Micro-Poly surface — no z-fighting; VT page correct
- [ ] **S1-ACC-05:** M.1 vault loads tier bundle; first-run JIT < 16ms p95 after warm

---

## Debt & IMPROVE cross-links

| ID | Maps to |
|----|---------|
| `DEBT-RENDER-003` | Blocks S1.1 viewport preview |
| `IMPROVE-ENG-007` | Dead Cook-Torrance → S1 compiler must wire PBR |
| `IMPROVE-ENG-011` | VT decode feeds S1.3 |
| `IMPROVE-ENG-019` | VT feedback async |

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_RUNTIME_IMMUNITY_SPEC.md` | PSO Vault consumes S1 fingerprints |
| `AETHEL_AAA_PARITY_TARGETS.md` | Radiance reads S1 G-buffer |
| `AETHEL_CONTENT_PIPELINE_SPEC.md` | USD materials → S1 graph import |
