# Aethel Engine — Vanguard Technologies Spec (Onda K)

**Version:** 1.1 (Chief Architect — Deepened)  
**Status:** **Binding** — **Onda K (The Vanguard)** — post-Onda **G** ship path; **foundation hooks** in Ondas **C–D**  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Studio cross-links:** [`AETHEL_STUDIO_SUPREMACY_INDEX.md`](AETHEL_STUDIO_SUPREMACY_INDEX.md) — S1 materials, S2 world streaming
**Extends:** [`AETHEL_AAA_PARITY_TARGETS.md`](AETHEL_AAA_PARITY_TARGETS.md) (Micro-Poly, Radiance, Entropy must **not** regress)  
**Laws:** **V** (Render Graph), **VI** (Distributed Cook), **XV** (Capability Score + XR downgrade), **I** (input/render thread separation)

---

## Executive mandate

Onda K adds **next-decade rendering** without breaking the Onda G nuclear stack:

| Vanguard system | Target | UE/industry analog |
|-----------------|--------|-------------------|
| **Aethel Neural Upscale & Frame Generation** | ONNX neural upscale + frame gen with motion vectors | DLSS / FSR 3 Frame Gen |
| **Aethel Gaussian Splatting Hybrid (3DGS)** | Hero splats + Micro-Poly depth-aware composite | Hybrid mesh + splat (industry emerging) |
| **Aethel Spatial Computing** | WebXR / PCVR @ 90 FPS with foveation | Meta Quest / PCVR runtimes |

**Engineering cost vs the parallel dev trains (doctrine #72):**
- **Now (Ondas C–D):** design contracts + G-buffer motion vectors + async compute slots + cook pipeline hooks — **no heavy ONNX / radix sort / XR ship**.  
- **Onda K (post-G):** native implementation of neural cores, GPU radix sort, stereoscopic instancing.  
- **The parallel dev trains (public launch gated by #72) are NOT delayed** by K — K is a parallel long pole **after** G acceptance.

**Zero-MVP:** No “Frame Gen native” or “3DGS production” marketing until K acceptance suites pass.

---

## Non-regression rule (Onda G stack)

```
Scalable Render Graph
├── Micro-Poly (G.3a)     ─┐
├── Radiance (G.3b–c)     ─┼─ MUST remain functional when K nodes disabled
├── Entropy (G.3d–e)      ─┘
└── K nodes (optional flags):
    ├── NeuralUpscale     (after Post/UI)
    ├── GaussianSplatPass (async compute → composite)
    └── SpatialXRPass     (stereo + foveated; downgrades Radiance)
```

**K disabled = identical to G.** K enabled = additive graph nodes + capability policy — **never** rewrite Micro-Poly cull or Radiance G-buffer layout without versioned migration.

---

## State today (audit — honest)

| Capability | Status | Evidence |
|------------|--------|----------|
| Motion velocity buffer | **MISSING** | `setupMotionBlur` / SSR stubs empty; TAA preset without velocity MRT |
| FSR (non-neural) | **PLANNED** | Law XV Onda D — not neural |
| ONNX inference desktop | **PARTIAL** | `ai_complete` → `provider_unavailable`; `DEBT-DESK-004` |
| 3DGS render | **AUSENTE** | `IMPROVE-ENG-002` draft only; vision 2030 hybrid doc |
| GPU radix sort | **AUSENTE** | — |
| WebXR core | **PARTIAL** | `webxr-vr-system-core.ts`; foveation not wired (`DEBT-VR-001`) |
| Input/render thread split | **MISSING** | Main thread sim + render |
| Spherical splat cook | **AUSENTE** | Law VI cook has no splat quant stage |

---

## 1. Aethel Neural Upscale & Frame Generation

### 1.1 Sub-requirements (architectural)

| Requirement | Mandate | Foundation wave |
|-------------|---------|-----------------|
| **Motion vectors (velocity buffer)** | Every Micro-Poly / standard material pass exports **per-pixel velocity** (clip-space Δ) into G-buffer MRT | **Onda C** — shader contract |
| **Depth + color for upscale** | NeuralUpscale node inputs: `Color`, `Depth`, `Velocity`, optional `MotionVectors jitter history` | **Onda D** graph |
| **ONNX Runtime in Rust** | Desktop Tauri embeds **ONNX Runtime** (feature flag); wgpu **shared buffer** / zero-copy path to inference | **Onda B** sidecar manifest; **K.1** ship |
| **Latency control (Reflex parity)** | Input thread samples camera/controller **last ms before GPU submit**; render thread never blocks input | **Onda B** threading; **K.2** ship |
| **Graph topology** | Node `NeuralUpscale` **strictly after** Post + UI compositor; before present/FSR fallback | **Onda K.1** |

### 1.2 Contracts

```typescript
// packages/engine/render/vanguard/neural-upscale-contracts.ts
export interface VelocityGBufferSlot {
  format: 'rg16float';           // clip-space velocity
  motionVectorJitter: boolean;   // TAA jitter compensation
}

export interface NeuralUpscaleBindings {
  colorTexture: number;          // bindless index
  depthTexture: number;
  velocityTexture: number;
  outputTexture: number;
  onnxModelId: 'upscale-x2' | 'frame-gen-interp';
}

export interface InputSamplingPolicy {
  sampleCameraAtGpuSubmit: true;
  maxInputLatencyMs: number;     // Reflex-class budget
}
```

| Module | Path |
|--------|------|
| Velocity MRT spec | `packages/engine/render/gbuffer-velocity.wgsl` |
| ONNX bridge Rust | `apps/studio-local/src-tauri/src/inference/onnx_runtime.rs` |
| Neural graph node | `packages/engine/render/vanguard/neural-upscale-node.rs` |

### 1.3 K acceptance (ship gate)

- [ ] Velocity buffer validated vs ground-truth camera motion (golden scene)
- [ ] ONNX upscale x2 @ 1080p → 4K within **2 ms** GPU+infer budget (RTX 4070 class)
- [ ] Frame gen **disabled by default** until input sampling policy green
- [ ] **No frame gen marketing** until K.2 latency suite passes (Zero-MVP)

### 1.4 Prohibitions

- Neural upscale **replacing** Law XV FSR on webgl2/discrete — **forbidden** (FSR remains fallback)
- Frame gen without isolated input sampling — **forbidden**

---

## 2. Aethel Gaussian Splatting Hybrid (3DGS)

Aligns with [`aethel_vision_2030.md`](aethel_vision_2030.md): **hybrid** — Micro-Poly for world static geometry; **3DGS for hero props, organic characters, photogrammetry foliage** — not splat-only worlds (VRAM reality).

### 2.1 Sub-requirements (architectural)

| Requirement | Mandate | Foundation wave |
|-------------|---------|-----------------|
| **Depth-aware blending** | Splats **write depth** (alpha-tested / weighted blended surface) into shared scene depth | **Onda C** depth format contract |
| **GPU radix sort** | Per-frame **back-to-front** splat order via **compute radix sort** on GPU — CPU sort **forbidden** at K | **Onda K.3** |
| **Async compute scheduling** | Radix sort + Micro-Poly cull **must not** contend same sync point — **async compute queue** + graph barriers | **Onda C** graph scheduler |
| **Spherical quantization cook** | Cloud Cooker (Law VI) stage: `.ply` → quantized splat pages streamable (Range Fetch + CAS) | **Onda C** cook orchestrator hook |
| **Hybrid composite** | Splats respect Micro-Poly occlusion (character behind splat tree) | **K.3** |
| **Splat→Mesh extract (Native Gen ca)** | Density Marching Cubes → animatable mesh for auto-rig / MM / DQ; Poisson commercial **HELD**; VRAM pager around ONNX Text-to-3D | **K.3a CLOSED 2026-07-13ca** (TS); ORT weights HELD |

### 2.2 Contracts

```typescript
// packages/engine/render/vanguard/gaussian-splat-contracts.ts
export interface SplatPage {
  pageId: string;
  gaussianCount: number;
  sphericalHarmonicsBands: 0 | 1 | 2 | 3;
  quantizedBlobRef: string;      // CAS hash
  bounds: Float32Array;
}

export interface GaussianSplatPassConfig {
  maxSplatsPerFrame: number;
  radixSortBits: 32;
  depthWrite: true;
  asyncComputeQueue: 'secondary';
}
```

| Module | Path |
|--------|------|
| Radix sort compute | `packages/engine/render/vanguard/splat-radix-sort.wgsl` |
| Native Gen travas (ca) | `cloud-web-app/web/lib/native-gen/*` + `apps/studio-local/src-tauri/src/onnx_native_gen.rs` |
| Native Gen IDE wire (cb) | `lib/native-gen/native-gen-ide-*.ts` + `GenerateGameReadyCharacterPanel` + studio-registry `gen-character` |
| Splat raster | `packages/engine/render/vanguard/splat-raster.wgsl` |
| Cook stage | `lib/production/splat-quantize-cook-stage.ts` |
| Hybrid composite | `packages/engine/render/vanguard/splat-depth-composite.wgsl` |

### 2.3 Architectural QA (async compute conflict)

**Q:** Radix Sort (Splats) vs Compute Culling (Micro-Poly) fight for CUs?  
**A:** Yes — **graph scheduler** runs them on **async compute queue** with explicit barriers:

```
MicroPolyVisibility (compute) → barrier → GaussianRadixSort (async compute) → barrier → Composite → GBuffer
```

Never parallelize without barrier — **forbidden** (race on visibility buffers).

### 2.4 K acceptance

- [ ] 1M splats @ 60 FPS desktop (1080p) with Micro-Poly scene active
- [ ] Occlusion test: polygon character hidden behind splat foliage (depth correct)
- [ ] Cook: 10 GB `.ply` → streamable pages < 500 MB on wire (quantized)
- [ ] Web: splat **subset** only (hero prop), not full world — Law XV budget

### 2.5 Prohibitions

- Splat-only open world (no Micro-Poly) on enthusiast — **forbidden** (VRAM + vision 2030)
- CPU splat sort in ship path — **forbidden** at K

---

## 3. Aethel Spatial Computing (WebXR / PCVR)

### 3.1 Sub-requirements (architectural)

| Requirement | Mandate | Foundation wave |
|-------------|---------|-----------------|
| **Single-pass stereo** | One `drawIndirect` issues **instanced stereo** (left/right eye) — matrix push per eye in shader | **Onda K.4** |
| **Foveated rendering (VRS)** | Graph node `FoveatedPass` — peripheral lower rate, center high; wgpu **VRS** when API exposes | **Onda K.4** |
| **Capability Score downgrade** | `XR_SESSION_ACTIVE` → auto downgrade **enthusiast → discrete** (Radiance HW RT **off**; baked/SSGI) | **Law XV** extension |
| **90 FPS floor** | Motion sickness guard — frame budget **11.1 ms**; Entropy particle cap reduced in XR | **K.4** |
| **WebXR + desktop PCVR** | Web: WebXR session; Desktop: OpenXR via Tauri sidecar (future Platform HAL G.4) | **K.4** |

### 3.2 Contracts

```typescript
// packages/engine/render/vanguard/spatial-xr-contracts.ts
export interface XRSessionPolicy {
  xrSessionActive: boolean;
  forcedBlueprint: 'discrete' | 'integrated';  // never enthusiast RT in XR
  targetFps: 90 | 120;
  foveationLevel: 0 | 1 | 2;
  stereoMode: 'single-pass-instanced' | 'multi-pass'; // only single-pass at K ship
}

export interface StereoscopicDrawIndirect {
  eyeCount: 2;
  viewProjMatrices: Float32Array; // 2 × 16 floats
  instanceMultiplier: 2;
}
```

| Module | Path |
|--------|------|
| XR policy | `packages/engine/render/hardware-profile.ts` (extend DynamicProfile) |
| Foveated node | `packages/engine/render/vanguard/foveated-pass.wgsl` |
| WebXR bridge | `lib/webxr-vr-system-core.ts` (wire foveation — closes `DEBT-VR-001`) |

### 3.3 K acceptance

- [ ] Quest 3 / PCVR class: 90 FPS in discrete blueprint test scene
- [ ] Automatic downgrade verified when `XR_SESSION_ACTIVE`
- [ ] Foveation uses **hardware** path when available — not darken-shader fake (`DEBT-VR-001`)

### 3.4 Prohibitions

- Radiance HW RT during active XR session — **forbidden**
- Dual full-cost render passes (non-instanced stereo) at K ship — **forbidden**

---

## Onda K delivery map

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **K.0** | Foundation hooks (velocity MRT, async compute slots, splat cook contract, XR policy enum) | **C–D** | Contracts only |
| **K.1** | Neural Upscale ONNX node + wgpu zero-copy | G graph stable, B sidecar | K |
| **K.2** | Input sampling isolation + optional frame gen | K.1, B threading | K |
| **K.3** | 3DGS radix sort + depth hybrid + cook pipeline | G Micro-Poly depth, VI cook | K |
| **K.3a** | **Native Gen Travas (letter ca)** — VRAM pager + splat→mesh MC + V-HACD + heat skin + ONNX protocol; consume bz semantic/delight; bw LOD | Law XV, Law XVI FusionTx, bw/bz | **CLOSED 2026-07-13ca** (TS path); ORT weights / commercial V-HACD / Poisson / Instant Meshes **HELD** |
| **K.3b** | **Native Gen → Studio IDE + CreativeBridge (letter cb)** — Generate game-ready character tool; route native→BYOK; honesty badges | ca, bx, bw, Law XVI | **CLOSED 2026-07-13cb**; `nativeOnnxReady` / ORT / Coins / Agones **HELD** |
| **K.4** | Spatial XR single-pass stereo + foveated + score downgrade | G.3, Law XV | K |
| **K.5** | **Ambient / Wi-Fi Sensing + Affective Computing** — CSI edge TinyML, `AmbientEmotionDelta` → NPC BT, CostGuard-gated MoA, physics posture ports | M.0 ambient kernel, Law XVI | K (post-G); **K.0 ax + az + physics ba + Law III apply bb CLOSED**; CSI hardware / Euphoria AAA **HELD**; enhancement-only / Zero-UI |

**Parallel to the dev trains:** K does **not** block RTv1 Hub, H, I, or J. **Blocks:** marketing “next-gen neural/spatial” claims only (and public launch waits for #72).

---

## K-readiness checklist (Onda C–D PRs — foundation now)

- [ ] G-buffer layout reserves **velocity MRT** slot (even if initially zero-filled)
- [ ] Render graph documents **async compute queue** insertion points
- [ ] Depth buffer format documented for splat + mesh sharing
- [ ] `HardwareDynamicProfile` reserves `xrSessionActive` + forced blueprint downgrade
- [ ] Cook pipeline registry accepts future `splat-quantize` stage (Law VI)
- [ ] **G-readiness** + **K-readiness** both satisfied — no rewrite at K
- [ ] Law XI Rust gates if touching `.rs`

---

## Parity & honesty matrix

| Claim | Allowed after | Forbidden until |
|-------|---------------|-----------------|
| Neural upscale (ONNX) | **K.1** acceptance | K.0 hooks only |
| Frame generation | **K.2** + latency suite | Always (Zero-MVP) |
| 3DGS hero assets in viewport | **K.3** | “Splat world” marketing |
| WebXR / PCVR shipping | **K.4** | Full Radiance in headset |
| Hybrid mesh + splat (vision 2030) | **K.3** | Splat-only MMO world |
| Wi-Fi CSI BPM / ambient emotion as production truth | **K.5** acceptance + NIC soak | K.0 scaffold / heuristic fallback only |
| Always-on cloud LLM emotion | Never (CostGuard + suppressor) | Edge/$0 TinyML first; critical deltas only |

---

## 4. Ambient / Wi-Fi Sensing + Affective Computing (K.5) — deepened 2026-07-13ba

### 4.1 Executive posture (Zero-MVP)

Founder dossier (CSI 60Hz edge TinyML, camera lock-on, `AmbientEmotionDelta` → NPC BT, `aethel/ambient` API) is **aligned as Vanguard K.5**, not a fake ship today.

**Founder golden rule (az/ba):** Ambient is **enhancement-only / Automatic Enhancement** — silent background probe; if CSI unsupported → **Zero-UI** (no modal/toast/settings nag); classic NPC BT + classic physics/motion continue. Never market “requires Wi-Fi Sensing router”.

| Layer | Path | Status |
|-------|------|--------|
| TS contracts + `aethel/ambient` API | `cloud-web-app/web/lib/ambient/` | **CLOSED** scaffold (letter **ax**) |
| CostGuard suppressor (critical-only LLM) | `lib/ambient/cost-guard-suppressor.ts` | **CLOSED** — settle:0 on reject |
| Gameplay-heuristic fallback | `lib/ambient/fallback-provider.ts` | **CLOSED** — Ethernet / no CSI |
| Camera+CSI focus lock | `lib/ambient/camera-csi-lock.ts` | Types + capability; **live fusion [HELD]** |
| Apex MoA / MultiSurface / BT live wire | `lib/ambient/live-wire.ts` + MoA/BT/MultiSurface | **CLOSED** listen (letter **az**); CSI hardware still **[HELD]** |
| World/Character physics subscribe | `AmbientPhysicsPort` + `subscribeAmbientEmotionForPhysics` | **CLOSED** typed ports (letter **ba**); classic no-op when `csiReady` false; `autoApplyForces: false` |
| Law III Active Ragdoll muscle/balance apply | `lib/physics/active-ragdoll-apply.ts` | **CLOSED** CORE (letter **bb**) — PD + balance → Rapier/web forces; ambient optional; `activeRagdollHeld` flips ready when substrate+apply real |
| Desktop CSI kernel | `apps/studio-local/src-tauri/src/ambient_sensor_kernel.rs` | **M.0 scaffold** — isolated thread, no-op without driver |
| Real CSI NIC driver / TinyML weights / BPM truth | — | **[HELD]** |
| Euphoria AAA parity / desktop Rust muscle authority | — | **[HELD]** — web CORE apply is real forces, not NaturalMotion-class claim |
| Always-on cloud emotion | — | **Forbidden** (COGS + latency) |

### 4.2 Pipeline (honest)

```
Wi-Fi NIC CSI (if any) → ambient_sensor_kernel thread (≠ simulation-tick)
  → ring buffer → edge TinyML / WebGPU ($0) → AmbientEmotionDelta
  → NPC BT blackboard (local)
  → World/Character physics port (posture/priority hint; consumer-wired; no auto Rapier impulse)
  → ONLY critical deltas → CostGuard suppressor → CreativeBridge/MoA (paid)
Ethernet / no CSI → gameplay-heuristic emotion (calm|stressed|panicked|absent)
  → physics subscribe = classic no-op unless enhancement opt-in
Camera+CSI topology lock-on → [HELD] until camera pipeline
```

### 4.3 Critique — bottlenecks vs dossier claims (no mercy)

| Claim / hope | Reality bottleneck | Aethel posture |
|--------------|-------------------|----------------|
| CSI 60Hz on consumer Wi-Fi | Most consumer NICs **do not expose CSI** to userland (Intel/Qualcomm CSI often research/firmware-locked; Windows/macOS lack stable public CSI APIs; **Ethernet has zero CSI**) | `csiReady: false` + heuristic fallback; never market CSI BPM |
| TinyML → accurate BPM / breath | Multipath noise, motion artifact, cross-user variance; published Wi-Fi sensing papers ≠ shipped consumer accuracy | `heartRateHeld: true` until soak + medical-grade disclaimer ban in game UX |
| Camera + CSI fusion privacy | Always-on camera + RF sensing = consent, COPPA, jurisdiction landmines | Capability + lock types only; fusionClaimAllowed false; privacy review before any ship |
| Cloud LLM “feels breath” | Round-trip 200–2000ms+ vs breath ~3–5s cycle; MoA multi-cell worse | Edge emotion for BT; cloud only on **critical** label transitions; debounce + rate limit |
| CostGuard leak paths | 60Hz events → naive MoA = bankruptcy; suppress-then-reserve race | Suppressor **before** reserve; reject → `settle: 0`; max N escalations / window |
| “Best-in-market ambient” Day 1 | No vendor CSI SDK in tree; no validated weights | Scaffold + honesty probe; marketingAmbientSensingAllowed: **false** |

### 4.4 Contracts (code)

| Module | Path |
|--------|------|
| Types / deltas | `lib/ambient/types.ts` |
| Capability / honesty | `lib/ambient/capability.ts` |
| Developer API | `lib/ambient/developer-api.ts` (`createAethelAmbientApi`) |
| Barrel | `lib/ambient/index.ts` |

### 4.5 Prohibitions

- Marketing “Wi-Fi heart-rate sensing” or CSI BPM as production truth before K.5 acceptance — **forbidden**
- Feeding 60Hz ambient into MultiSurfaceContextPack / MoA — **forbidden**
- Blocking `simulation-tick` / `physics_kernel::step` for CSI capture — **forbidden** (M.0)
- Bypassing CostGuard suppressor for ambient → paid LLM — **forbidden** (Law XVI Trava I)
- Auto-applying Rapier impulses / joint torques from AmbientEmotionDelta — **forbidden** (ba: `autoApplyForces: false`; consumer-wired only)
- Claiming Euphoria AAA / NaturalMotion-class parity from web CORE apply — **forbidden** (`canClaimEuphoriaParity: false`; desktop Rust authority **HELD**)
- Claiming Law III Active Ragdoll live without Rapier substrate + apply path — **forbidden** (`activeRagdollHeld` stays true until honesty flip)

### 4.6 Acceptance (future K.5)

- [ ] Proven CSI NIC path on ≥1 supported desktop SKU with evidence ledger
- [ ] TinyML weights validated; false-BPM rate documented; `heartRateHeld` flip criteria written
- [ ] Camera fusion consent UX + privacy review
- [ ] Suppressor soak: zero unpaid cloud legs on reject; COGS within JobBudget
- [ ] `marketingAmbientSensingAllowed` remains false until suite green
- [x] Optional: consumer-wired Rapier / Active Ragdoll apply of posture hints (letter **bb** CORE; Euphoria AAA still HELD)

See Progress letters **ax** (scaffold) + **az** (live wire) + **ba** (physics subscribe) + **bb** (Law III apply) · Immunity **M.0 ambient kernel**.


---

## Cross-links

| Document | Relationship |
|----------|--------------|
| `AETHEL_AAA_PARITY_TARGETS.md` | G stack must pass before K nodes enable |
| `AETHEL_HARDWARE_SCALABILITY_SPEC.md` | XR forces blueprint downgrade |
| `aethel_vision_2030.md` | 3DGS hybrid philosophy — K implements |
| `FUTURE_IMPROVEMENTS_REGISTRY.md` | `IMPROVE-ENG-002`, `IMPROVE-ENG-010`, `IMPROVE-ENG-022`, `IMPROVE-DESK-004` → Onda K |
| `AI_CRITIQUE_DEBT_REGISTRY.md` | `DEBT-VR-001`, `DEBT-DESK-004` K blockers |

---

## Approved decisions (#43–46, v4.3)

| # | Decision |
|---|----------|
| 43 | **Onda K — The Vanguard** — Neural Upscale, 3DGS Hybrid, Spatial XR (post-G ship) |
| 44 | **Foundation now, heavy cores in K** — velocity MRT + async compute + cook hooks in C–D |
| 45 | **3DGS hybrid only** — hero splats + Micro-Poly world; not splat-only open world |
| 46 | **XR_SESSION_ACTIVE** forces enthusiast → discrete blueprint (no HW RT in headset) |

**Note:** Decisions #40–42 (Micro-Poly, Radiance, Entropy) remain; K **extends** G without replacing it.

---

## Competitor baseline (DLSS / FSR / Gaussian / XR)

| Competitor | Capability | Aethel K target | Honest Day-1 K |
|------------|------------|-----------------|----------------|
| **NVIDIA DLSS 3** | ONNX upscale + frame gen + Reflex | K.1 + K.2 | Parity class on RTX 40xx; not superior |
| **AMD FSR 3** | Spatial upscale + frame gen | Law XV FSR fallback always | FSR remains when ONNX off |
| **Luma / Polycam splats** | Mobile capture → splat | K.3 + S7 mobile ingest | Hero props only |
| **SuperSplat / gsplat** | Web splat viewers | K.3 hybrid composite | Not splat-only world |
| **Meta Quest compositor** | Fixed foveated + ASW | K.4 foveation | 90 FPS discrete; not AAA RT in headset |
| **Apple Vision Pro** | High-res micro-OLED | Not Day 1 target | WebXR subset only |

**Surpass vector:** K + **M.1 PSO vault** + **Law XV downgrade** = smoother experience on mid-tier hardware vs UE "4090 demo" culture.

---

## Known limitations (honest)

| Limitation | Mitigation |
|------------|------------|
| ONNX not on web | K desktop-only; FSR on web |
| Frame gen adds latency | K.2 input sampling policy; disabled by default |
| 1M splats VRAM | Hero subset + Micro-Poly world |
| wgpu VRS immature | Shader foveation fallback documented |
| OpenXR sidecar not Day 1 | WebXR first; PCVR via Tauri phase 2 |

---

## K.0b — Console / Platform HAL (deepened 2026-07-13bi)

Founder AAA gap #2. Portable **HAL trait** for wgpu → DX12/Vulkan/Metal; **PS5 GNM = commercial HELD** (no proprietary SDK in repo, no fake ready probe).

| Contract | Path | Status |
|----------|------|--------|
| `ConsoleHalTrait` + wgpu portable scaffold | `cloud-web-app/web/lib/immunity/console-hal.ts` | Scaffold **CLOSED** |
| PS5 GNM module | same — `createPs5GnmHalHeld()` | Always **HELD** |
| Honesty | `consoleHalReady: false`, `ps5GnmReady: false` | Binding |

**vs Unreal (honest):** UE ships certified console RHIs after years of first-party deals. Aethel’s Day-1 claim is **desktop wgpu + portable HAL interfaces**, not console ship. Marketing “PS5 ready” before GNM license + certification is forbidden.

**Cross-link:** G.4 Platform HAL long pole; M.0b AAA gaps honesty API.

---

## Failure modes & mitigations

| Failure | Mitigation |
|---------|------------|
| K nodes break G buffer | Non-regression CI: K off = G golden hash match |
| Radix sort race with Micro-Poly | Explicit graph barriers (§2.3) |
| ONNX OOM | Model quant + tier disable on <8GB VRAM |
| Fake foveation (darken shader) | `DEBT-VR-001` must close before K.4 ship |
| Velocity buffer wrong | GF-MESH-001 + camera motion golden test |

---

## Extended acceptance + golden fixtures

| ID | Suite | Fixture |
|----|-------|---------|
| **K-ACC-01** | Velocity MRT vs ground truth | GF-MESH-001 |
| **K-ACC-02** | ONNX x2 < 2ms @ 1080p→4K | GF-MESH-001 post |
| **K-ACC-03** | 1M splats + mesh occlusion | **GF-SPLAT-001** |
| **K-ACC-04** | 90 FPS XR discrete | **GF-XR-001** |
| **K-ACC-05** | K disabled = G pixel hash identical | GF-RAD-001 |

See [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md) for fixture definitions.

---

## Latent Audio & AV-Sync Vanguard (binding — 3 Leis da Adaptação Universal + Roo-Loop Agêntico)

**Doctrine:** audio is not a post-process. The AV sync is a **Vanguard surface** (Law IV MetaSounds + Law I SAB + Law XV LOD) with its own acceptance ladder, on the **Sólido vs Metamorfo** spectrum (Zero Imposição). Applies to every Rust kernel, not just this spec.

### The Sólido vs Metamorfo spectrum (Zero Imposição)

| Pole | Semantics | Kernel behavior |
|------|-----------|-----------------|
| **Sólido** | Pure fidelity baking — deterministic substrate passthrough, bit-stable, no morphing | Compiled graph renders the exact intended timbre/footprint; replay bit-identical |
| **Fluido / Metamorfo** | Reactive morphing — the same node reacts to physics, stamina, geometry, player intent | One audio node derives foley + resonance + voice + diffraction + synesthesia |

The spectrum is a **parameter, never a toggle**: every Phase 2 kernel reports which pole it ran in and why. Zero Imposição = the engine never forces a morph; the physics/geometry data decides it, measured and honest.

### The 3 Leis da Adaptação Universal (binding spine of ALL Rust code)

| Lei | Name | Mandate | Substrate (real, closed) |
|-----|------|---------|--------------------------|
| **Lei 1** | **Automação Semântica (Cérebro Passivo)** | The engine adapts to the scene/data **passively** — no authorial intervention required; the semantics of the physics/geometry/context drive every adaptive decision | soak-gated substrate-composition doctrine (kb..kh); `svo_depth_lod`, `gaze_foveated_reprojection` (gt) |
| **Lei 2** | **Amortecedor Poético (Portão de Sanidade)** | Every SDF/geometry anomaly fails closed through the poetic dampener — NaN/Inf SDF becomes a volumetric fog boundary, never a crash or a mock | [`poetic_error_handler.rs`](../../packages/aethel-kernel-rust/src/poetic_error_handler.rs) — `intercept_sdf_anomaly(raw_distance, p)` (23 lines, REAL) |
| **Lei 3** | **Parallax de Performance-LODs Dinâmicos** | Per-band cost LODs — audio/fidelity detail scales with Capability Score (Law XV) and distance/perception, never a flat "high/medium/low" | `svo_depth_lod`, `infinite_anti_aliasing` (gi), `spatio_temporal_denoiser` (kg) |

### Roo-Loop Agêntico (Actor-Critic closed loop — silent, master-grade-only)

Workforce / Maestro agents run an **internal** generate → test → criticize → regenerate loop. They **never pollute the developer context** with intermediate attempts: only the master-grade result surfaces to the developer/ledger. This is the Law XI Actor-Critic discipline applied to the audio/AV surface — see [`AETHEL_AI_FUSION_CREATIVE_SPEC.md`](AETHEL_AI_FUSION_CREATIVE_SPEC.md).

### Phase 2 kernel charter (round ki — latent audio adaptation, real kernels)

Honest SUBSTRATE-REAL vs TRUE-GAP matrix (data-grounded, byte-verified 2026-08-14):

| System | SUBSTRATE-REAL (existing, closed) | TRUE-GAP (round ki injects) |
|--------|----------------------------------|-----------------------------|
| **S1 Foley Biomecânico** | `procedural_muscle_locomotion` (jw) `LocomotionMetrics` (foot_plant_events, tendon_work), `muscle_sim_rig` PD, `fm_additive_synthesis` (ej) Treasury, jx `GranularSynthesizer` + `ModalSynthesizer` | **The coupling kernel** — gait cadence/foot-plant force modulates granular density/pitch + modal foot-strike impact |
| **S2 Ressonância de Cavidade Helmholtz** | `aerodynamic_navier_stokes` (gv) `FluidGrid2D` (u/v/p), jx `AeroAcoustic::lighthill_source_strength`, jx `ModalSynthesizer`, `acoustic_reverb_geometry` RT60 | **The cavity resonator** — f_helm = (c/2π)·√(A/(V·L_eff)) from geometry + NS neck-flow excitation → modal ring |
| **S3 Trato Vocal Kelly-Lochbaum** | jx `KellyLochbaumVocalTract` + `PhonemeParams` (breathiness, glottal_area_cm2, f0) **ALREADY REAL** (formant shift measured /i/ vs /a/) | **Partial** — stamina/effort model → breathiness↑ + f0 droop + glottal leakage ("breathless NPC") |
| **S4 Difração Acústica SDF** | `sdf_audio_raymarching` (ex) `march_occlusion` (transmission + lowpass_gain, pure path-length attenuation) | **Frequency-dependent corner diffraction** — low freqs bend around edges (Keller/Huygens), highs blocked |
| **S5 Matriz Sinestésica** | `synesthetic_sensory_remap` (dx) density→acoustic/radiation/tremor; `aethel_synapse_link_haptics` impact→haptics | **One audio node → haptics + screen-shake + chromatic aberration simultaneously** |

**9-concept map (audio/AV blueprint → substrate/gap):** microfracture acoustic degradation (voronoi `ip2` + jx modal — gap: acoustic event coupling), Helmholtz cavities (→ S2), SDF diffraction (→ S4), psicoacústica (→ S5 + dx), biomechanical foley (→ S1), Kelly-Lochbaum (→ S3), subsurface acoustic scattering (kd/`strand_hair_subsurface_skin` + S4 analog), Mach-1 sonic booms (gv NS + jx Lighthill — gap: shock signature generator), spectral AI hearing (jx `spectral_peak_in_band` real — feeds S5).

**Zero-MVP (binding):** no round ki `*_ready` flips without a measured physical invariant; `latent_audio_aaa_ready` / `physically_based_audio_aaa_ready` / `hrtf_aaa_ready` stay **false (HELD)**. J.11/J.12 STOPPED; strictly backend — no UI.

---

## 5. The 5 Post-Launch Frontiers (O Futuro Pós-Lançamento da Aethel Engine)

Following the completion of the Launch Hard Gate #72 (100%+ Parity & Supremacy) and public launch (R6/R7), the Aethel Engine's long-term expansion evolves across **5 Specialized Vanguard Frontiers**:

```
                                    ┌───────────────────────────────────────────────────────────┐
                                    │         O FUTURO PÓS-LANÇAMENTO: AS 5 FRONTEIRAS          │
                                    └─────────────────────────────┬─────────────────────────────┘
                                                                  │
         ┌──────────────────────────────┬─────────────────────────┴─────────────────────────┬──────────────────────────────┐
         ▼                              ▼                                                   ▼                              ▼
┌──────────────────┐           ┌──────────────────┐                                ┌──────────────────┐           ┌──────────────────┐
│ 1. NEURAL & 3DGS │           │ 2. REALIDADE     │                                │ 3. ESCALA        │           │ 4. SIMULADORES   │
│ (Gaussian        │           │    ESPACIAL (XR) │                                │    PLANETÁRIA    │           │    PESADOS       │
│  Splatting)      │           │ (Vision Pro/VR)  │                                │ (MMOs Cosmos)    │           │ (Voo e Corrida)  │
└──────────────────┘           └──────────────────┘                                └──────────────────┘           └──────────────────┘
                                                                  ▼
                                                       ┌──────────────────┐
                                                       │ 5. CONSOLES      │
                                                       │ (PS5, Xbox,      │
                                                       │  Switch 2)       │
                                                       └──────────────────┘
```

### 1. Fronteira 1: Renderização Neural & 3D Gaussian Splatting (3DGS)
- **Day 1:** Rasterização tradicional de micropolígonos e texturas PBR.
- **Evolução 3DGS:** Reconstrução fotorrealista instantânea de ambientes e objetos a partir de vídeos de 30 segundos capturados via smartphone, integrados ao depth-buffer do Render Graph sem modelagem poligonal manual.

### 2. Fronteira 2: Realidade Virtual e Espacial (XR / VR / AR)
- **Day 1:** Telas planas desktop e web.
- **Evolução XR:** Suporte nativo para Apple Vision Pro, Meta Quest 3 e Valve Index com Foveated Rendering guiado por rastreamento ocular (Eye-Tracking Foveation) e cinemática de dedos com resposta háptica.

### 3. Fronteira 3: Escala Planetária Contínua (Cosmos & MMOs de 64 bits)
- **Day 1:** Mapas e cidades de 50 km² com relevo contínuo (World Forge).
- **Evolução Cosmos:** Coordenadas Largas em 64 bits (Large World Coordinates - LWC) para planetas esféricos contínuos sem telas de carregamento entre superfície e órbita espacial.

### 4. Fronteira 4: Gêneros Ultra-Especializados (Simuladores Pesados e RTS Massivo)
- **Simuladores de Corrida:** Termodinâmica de pneus em tempo real (Pacejka Magic Formula avançada) e deformação de chassi de alta precisão (*iRacing/Assetto Corsa* class).
- **Simuladores de Voo:** Aerodinâmica com túnel de vento computacional em GPU e meteorologia termodinâmica real (*MSFS* class).
- **Estratégia em Tempo Real (RTS Massivo):** Campos de fluxo vetorial (*Flowfields*) para controlar 100.000+ unidades simultâneas (*Total War/StarCraft* class).
- **MMORPGs com Economia Viva:** NPCs com memória de longo prazo (RAG neural) gerindo mercados e guildas autonomamente.

### 5. Fronteira 5: Certificação Nativa de Consoles (PlayStation 5, Xbox Series e Nintendo Switch 2)
- **Day 1:** Exportação nativa para Windows, Linux e Web (WebGPU/WASM).
- **Evolução Consoles:** Pipelines de conformidade automática com TRC (Sony) e TCR (Microsoft) para publicação direta em 1 clique nas lojas dos consoles.

### O Ecossistema Aberto de Plugins (Rust / WASM)
- **Extensibilidade Infinita:** Desenvolvedores e estúdios globais criam e comercializam módulos matemáticos e solvers especializados no Marketplace da Aethel.
- **Efeito de Rede:** Cada novo asset, shader e comportamento criado pela comunidade retroalimenta a base de conhecimento da IA, tornando o motor continuamente mais poderoso.
