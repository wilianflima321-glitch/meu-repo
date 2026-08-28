# Aethel Engine — Content Pipeline Spec (Studio Pillar S7)

**Version:** 1.2 (Chief Architect — Deepened + cook stage registry)  
**Status:** **Binding** — **Studio Pillar S7** — Law VI + Fab/USD/Quixel-class ingest  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Extends:** Law VI, Onda J.7 UsdIntegrator

---

## Mandate

UE content = **Interchange + Fab + Quixel + Nanite-ready cook**. Law VI covers distributed cook — **S7** defines **DCC → engine-ready asset** stages that feed S1, S2, S3, G.3.

---

## State today (honest)

| Stage | Status |
|-------|--------|
| KTX2/meshopt cook | planned |
| USD import | J.7 planned |
| Meshlet / Nanite cook | `DEBT-NANITE-001` |
| Material from USD | **AUSENTE** |
| Fab marketplace authoring | H commerce — not DCC |
| AI mesh cleanup (Meshy) | HTTP REAL |

---

## Cook pipeline stages (binding)

```
Source (USD, FBX, glTF, AI mesh)
     ↓ validate + audit
Geometry → meshlet builder (G.3a) + LOD DAG
Materials → S1 graph or auto-convert
Textures → KTX2 + VT pages (M.2)
Skeleton → S3 retarget target
     ↓
CAS manifest (Law VI/VIII)
     ↓
Cloud Cooker workers + local fallback
```

### Compression mandate (extends H.2)

| Asset type | Required |
|------------|----------|
| Mesh | meshopt + meshlets |
| Texture | KTX2 Basis |
| Audio | Vorbis/Opus stems |
| USD | Draco optional |

---

## Cook stage registry (S7.0+ — ordered pipeline)

| Stage ID | Input | Output | Blocks |
|----------|-------|--------|--------|
| `validate-source` | raw file | audit report | all |
| `geometry-meshopt` | mesh | meshopt buffer | S7.2 |
| `meshlet-build` | mesh | MeshletPage[] | G.3a |
| `mesh-micro-deformation` | meshlet + seed | Stochastic displacement buffer | S7.2 |
| `weathering-strain-map` | meshlet + SDF context | Rain/Sun/Contact wear maps | S1, S7.3 |
| `usd-modular-grammar` | USD kit + WFC rules | Assembled architectural blocks | S2, S7.1 |
| `material-convert` | USD/usdPreviewSurface | S1 graph | S1 |
| `texture-ktx2` | png/exr | KTX2 pages | S1.3, M.2 |
| `skeleton-retarget` | skeleton | retarget map | S3 |
| `wasm-pack-vs` | VS graph | .wasm module | M.3, S5 |
| `pso-vault-bake` | materials | PsoFingerprint[] | M.1 |
| `splat-quantize` | ply | SplatPage[] | K.3 |
| `manifest-v2` | all | CAS manifest | publish |

### Procedural Micro-Deformation & Asset Uniqueness Doctrine (Binding)

To prevent repetitive or empty scenes without incurring human modeling bottlenecks:
1. **GPU Micro-Displacement:** Every instantiated meshlet receives an instance-specific stochastic noise seed evaluated in the vertex/mesh shader, introducing organic surface imperfection (e.g. hand-laid brick curvature, warped wood grain).
2. **Dynamic Weathering & Contact Maps:** Shaders compute real-time weathering masks from SDF ambient occlusion and surface normal orientation (accumulating rust on upward-facing edges, grime/moisture in ground crevices, and vertex strain deformation on physical impact).
3. **Modular USD Shape Grammars:** Buildings and urban structures are procedurally assembled from high-fidelity 4K PBR USD modular components using Wave Function Collapse (WFC) rules, yielding tens of thousands of architecturally distinct buildings from a compact modular kit.

**Golden fixture:** **GF-USD-001** — hero character end-to-end.

---

## Delivery (S7.0 → S7.4)

| Step | Deliverable | Wave |
|------|-------------|------|
| **S7.0** | Cook manifest schema v2 | A.2, C |
| **S7.1** | USD stage: geometry + materials | J.7 |
| **S7.2** | Meshlet + Nanite-ready path | C–G |
| **S7.3** | AI mesh cleanup pipeline (CreativeBridge) | J.7 |
| **S7.4** | Marketplace publish validation (H.2) | H |

---

## Acceptance

- [ ] Hero asset: USD → viewport with materials in < 60s cook
- [ ] 500 MB import offline via LocalAssetDepot (Law VIII)
- [ ] No proxy capsule after S7.1 character path

---

---

## Competitor baseline (UE5 / Unity 6)

| UE5 capability | Unity 6 | Aethel S7 target | Surpass vector |
|----------------|-----------|------------------|----------------|
| Interchange (USD) | Asset pipeline | J.7 + S7.1 | AI cleanup CreativeBridge |
| Quixel / Fab | Asset Store | H marketplace + S7 cook | Publish validation H.2 |
| Nanite cook | — | Meshlet builder G.3a | `DEBT-NANITE-001` close |
| Distributed cook | UBA | Law VI cloud workers | Local fallback Law VIII |
| AI mesh (Meshy) | — | J.7 HTTP REAL path | Evidence ledger |

---

## Known limitations (honest)

| Limitation | Platform | Mitigation |
|------------|----------|------------|
| Not Epic Fab clone | all | Ingest + H publish; no exclusivity |
| Full USD feature set | v1 | Geometry + materials + skeleton priority |
| Draco optional | large assets | Config flag per project |
| 500 MB offline | desktop | LocalAssetDepot Law VIII |

---

## Performance budgets

| Metric | Target |
|--------|--------|
| Hero USD → viewport | < 60s cook |
| Meshlet build | < 120s per hero mesh enthusiast |
| KTX2 transcode | GPU-friendly Basis |
| Offline import queue | durable spool; no silent loss |

---

## Failure modes & mitigations

| Failure | Symptom | Mitigation |
|---------|---------|------------|
| Proxy capsule after import | J.7 fail | S7.1 skeleton path blocks publish |
| Material loss USD | Flat grey | S1 auto-convert + manual graph fallback |
| `DEBT-NANITE-001` | No meshlets | S7.2 blocks Micro-Poly marketing |
| Cook OOM cloud | Failed publish | Chunked cook Law VI |

---

## Extended acceptance suite

- [ ] **S7-ACC-01:** USD hero → viewport materials < 60s
- [ ] **S7-ACC-02:** 500 MB glTF offline → LocalAssetDepot → viewport
- [ ] **S7-ACC-03:** AI mesh cleanup → manifold → meshlets → G.3a
- [ ] **S7-ACC-04:** Marketplace publish rejects capsule proxy
- [ ] **S7-ACC-05:** Cook manifest v2 hash stable across cloud/local

---

## Debt & IMPROVE cross-links

| ID | Maps to |
|----|---------|
| `DEBT-NANITE-001` | S7.2 meshlets |
| `DEBT-ASSET-001` | Import foundation |
| J.7 | UsdIntegrator |
| H.2 | S7.4 marketplace validation |
| `IMPROVE-ENG-018` | Meshlet QEM WASM |

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_MATERIAL_SUBSTRATE_SPEC.md` | material import |
| `AETHEL_WORLD_SYSTEMS_SPEC.md` | landscape height cook |
| `AETHEL_AI_FUSION_CREATIVE_SPEC.md` | J.7 UsdIntegrator |
