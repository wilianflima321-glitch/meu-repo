# Aethel Engine — Hardware Scalability & Dynamic Render Graph Spec

**Version:** 1.4 (Law XV — + Unit Economics alignment + **Absolute Supremacy Elevation, doctrine #73**)
**Status:** **Binding** — extends **Law V**; formalized as **Law XV — Scalable Fidelity**  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.7  
**Unit economics:** [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md) — **cloud quotas × subscription**
**Studio cross-links:** Law XV gates all S1–S7 platform tiers
**XR downgrade policy:** [`AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md`](AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md) §3 (K.4)  
**Target Audience:** Aethel Fusion AI (Claude) — architectural investigation and implementation contracts

## Objetivo
O motor Aethel não pode ser excludente. Ele deve atingir a **Paridade AAA no Desktop** para entusiastas, mas escalar de forma inteligente e implacável para baixo, cobrindo o mercado de PCs sem placa de vídeo dedicada (Gráficos Integrados) e dispositivos Web. 

Esta especificação define o **Capability Score (0–100)**, contratos de runtime, **Scalable Render Graph blueprints**, sinergia **Aethel Cloud**, e **Lei XV**.

> **Nota de arquitetura:** As seções Tier 1–3 abaixo são **rótulos de blueprint** derivados do score contínuo — não caixas rígidas. Uma GTX 1060 3GB com score ~42 usa blueprint `integrated`/`discrete` híbrido + FSR agressivo, nunca “cai no limbo”.

---

## 1. Matriz de Referência (Blueprint Labels ← Capability Score)

O `Render Graph` detecta hardware no startup e **recalcula em runtime** via `HardwareDynamicProfile`. Não há pipeline hardcoded.

| Score | Blueprint label | Exemplos |
|-------|-----------------|----------|
| **75–100** | `enthusiast` | RTX 30/40+, RX 6000/7000+, 8GB+ VRAM |
| **45–74** | `discrete` | GTX 1060/1660, RX 500/5000, 4–6GB VRAM |
| **20–44** | `integrated` | Intel Xe, Ryzen APU, iGPU + CPU forte |
| **0–19** | `webgl2` | Safari/WebGL2 fallback, tab browser |

### Blueprint `enthusiast` (score 75–100)
* **Hardware:** GPU com núcleos de Ray Tracing (RT Cores), 8GB+ VRAM dedicada.
* **API:** Desktop `wgpu` (Vulkan / DX12).
* **Render Graph:** 
  - **Hardware Ray Tracing** habilitado (Sombras, Reflexos, GI).
  - **Bindless Architecture** completa (megabuffers). Zero overhead de CPU no envio de comandos (`multiDrawIndirect`).
  - **Física:** Simulação de GPU fluída/partículas.

### Blueprint `discrete` (score 45–74)
* **Hardware:** GPU robusta, mas **sem** núcleos de Ray Tracing. 4GB - 6GB VRAM.
* **API:** Desktop `wgpu` ou WebGPU (quando suportado nativamente).
* **Render Graph (O Fallback):**
  - **RTX Desativado.**
  - **Compute Shaders** assumem o controle: **SSGI** (Screen Space Global Illumination) e Light Probes.
  - **Bindless:** Mantido sempre que a API permitir, garantindo que o CPU não seja o gargalo.

### Blueprint `integrated` (score 20–44) — PC de Escritório / iGPU
**O Desafio:** Usuários que têm um "Bom PC" (Processador Core i7 / Ryzen 7 moderno, 16GB de RAM), mas **NÃO possuem Placa de Vídeo Dedicada.**
* **Hardware:** iGPU (Gráficos Integrados). A RAM do sistema é compartilhada com a GPU.
* **API:** WebGL2 (Browser) ou `wgpu` em modo low-power.
* **Render Graph (Sobrevivência):**
  - **Desativação de Compute Shaders** complexos.
  - **Forward Rendering Clássico:** PBR básico, mapas de sombra em baixa resolução, iluminação pré-assada (Baked).
* **A Vantagem do Bom CPU:** CPU forte compensa GPU fraca — Rapier via SAB + worker threads (Lei I) + IA local; visual simplificado, simulação rica.

### Blueprint `webgl2` (score 0–19) — Web / Safari

* **API:** WebGL2 oficial (Safari/Apple) — **sem bindless** (Lei XV carve-out vs Lei V wgpu).
* **Render Graph:** `ForwardPBR` + `BakedLM` + `Present` — compatibilidade total; não exclui ecossistema Apple.

---

## 2. Aethel Cloud e Planos do Usuário (Sinergia)

**Binding economics:** Cloud services are **not unlimited**. Quotas per subscription tier — see [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md) §4.1.

Como a **Aethel Cloud** (Serviços de Nuvem vinculados à Conta/Plano do usuário) ajuda a compensar hardware fraco **sem prejuízo**:

1. **Cloud Cooker (Mandato de Compressão - Lei XII):** 
   - Usuários sem VRAM (Tier 3) são salvos porque a nuvem da Aethel já comprimiu todas as texturas em **KTX2** e malhas em **Draco/Meshopt**. A VRAM compartilhada não explode.
2. **Baked Lighting (Publish Pipeline — OBRIGATÓRIO):**
   - **Aprovado:** todo publish gera lightmaps estáticos automaticamente (stage `baked-lighting` no publish pipeline).
   - Tier 3 / iGPU não depende de plano cloud pago do criador — bake é infraestrutura de export, não SKU premium.
   - Cloud acelera fila; Tauri fallback local quando offline (Lei VIII).
3. **Telemetria de Hardware (Lei II):**
   - A Aethel coleta o hardware da base de jogadores. Se 60% do público de um jogo joga em Intel HD, o desenvolvedor sabe que não deve focar em assets de 4K, e a própria loja destaca o jogo para usuários com hardware similar.

4. **Cloud cook quota (binding — Decision #68):**
   - **Free:** 30 cook-minutes/mo OR 3 publishes — then **local Tauri cook only** (Law VIII).
   - **Pro/Enterprise:** priority cloud queue per unit economics §4.1.
   - **Never:** unlimited cloud cook on Free — UE-02 risk.

5. **Player render stays local:**
   - Cloud does **not** scale cost with GPU model count — Capability Score is client-side only (Decision #69).

---

## 3. Contratos de Código (Aprovado — Implementation Targets)

### 3.1. HardwareDetector & Dynamic Profiler

Detecção em dois estágios: **Static** (<50ms startup, Rust/Tauri + Web adapter probe) + **Dynamic** (contínuo via `FrameBudgetMonitor` + telemetria Lei II).

**Target files:**
- `packages/engine/render/hardware-profile.ts`
- `apps/studio-local/src-tauri/src/hardware_detector.rs` (extend `hardware_profiler.rs`)
- Feed: existing `packages/runtime/frame-budget.ts`

```typescript
// packages/engine/render/hardware-profile.ts
export type RenderTier = 'enthusiast' | 'discrete' | 'integrated' | 'webgl2';

export interface HardwareStaticProfile {
  tier: RenderTier;              // blueprint label from score bands
  capabilityScore: number;       // 0–100 continuous — source of truth
  api: 'wgpu-vulkan' | 'wgpu-dx12' | 'webgpu' | 'webgl2';
  adapterName: string;
  isIntegrated: boolean;
  isUMA: boolean;
  dedicatedVramMb: number | null;
  supportsBindless: boolean;     // false on webgl2 blueprint
  supportsRayTracing: boolean;
  supportsCompute: boolean;
  cpuCoreCount: number;
  cpuTier: 'high' | 'mid' | 'low';
  confidence: 'high' | 'medium' | 'low';
}

export interface HardwareDynamicProfile {
  gpuFrameMsP95: number;
  cpuFrameMsP95: number;
  vramPressureScore: number;
  bottleneck: 'gpu' | 'cpu' | 'memory' | 'balanced';
  recommendedInternalScale: number; // FSR input 0.5–1.0
}
```

**Score mapping:** micro-benchmark optional (200ms once) + adapter limits + runtime telemetry adjusts score ±10 with hysteresis.

### 3.2. UMABudgetPolicy

`LocalAssetDepot` + chunk streaming consultam antes de resident data. **UMA = ~25–30% system RAM cap for GPU-visible assets.**

```typescript
export interface UMABudgetPolicy {
  maxResidentTextureMb: number;
  maxResidentMeshMb: number;
  maxConcurrentChunks: number;
  evictionAggression: 'aggressive' | 'normal';
}

export function deriveUMABudget(profile: HardwareStaticProfile): UMABudgetPolicy;
```

**Target:** `lib/engine/asset-depot/uma-budget.ts` + wire OOM sentinel (R65).

### 3.3. CullingPolicy (CPU ↔ GPU)

```typescript
export type CullingBackend = 'gpu_compute' | 'cpu_workers' | 'hybrid';

export interface CullingPolicy {
  backend: CullingBackend;
  cpuWorkerCount: number;
  gpuCullingMaxObjects: number;
}

export function resolveCullingPolicy(
  static: HardwareStaticProfile,
  dynamic: HardwareDynamicProfile,
): CullingPolicy;
```

**Rule:** GPU bottleneck or `integrated`/`webgl2` → prefer `cpu_workers` (Lei I SAB). GPU path uses existing `gpu_culling.rs`. **Indirect draw batch preserved** — never per-object CPU submit.

### 3.4. Scalable Render Graph (Blueprints + FSR Node)

Nodes register requirements (`vramMbMin`, `requiresBindless`, `requiresCompute`). Failed probe → node skipped, not crash.

```typescript
const BLUEPRINTS: Record<RenderTier, RenderGraphBlueprint> = {
  enthusiast: { nodes: ['GBuffer', 'RT_GI', 'SSR', 'Bloom', 'FSR', 'Present'] },
  discrete:   { nodes: ['GBuffer', 'SSGI', 'Probes', 'Bloom', 'FSR', 'Present'] },
  integrated: { nodes: ['ForwardPBR', 'BakedLM', 'SimpleShadow', 'FSR', 'Present'] },
  webgl2:     { nodes: ['ForwardPBR', 'BakedLM', 'Present'] },
};
```

**FSR node:** open-source first (Tier 2/3); DLSS optional Tier 1 NVIDIA desktop only — never blocks FSR path.

**Target module:** `packages/engine/render/scalable-render-graph/` (Onda C–D).

---

## 4. Lei XV — Fidelidade Escalável (Scalable Fidelity)

**Mandato irrevogável:** *Nenhum jogo exportado pela Aethel Engine pode assumir que o jogador possui GPU dedicada. O Render Graph adapta fidelidade visual pelo **Capability Score (0–100)**. Marketing claims seguem tier detectado.*

**Absolute Supremacy Elevation (doctrine #73, binding 2026-08-12 — hardware-first):**
- Law XV is a **supremacy vector**, not a limitation. Aethel does not merely *scale down* to user hardware — it **over-delivers on every tier**. Enthusiast blueprint = full nuclear stack (RT, bindless, G.% 50+); discrete/entry = rich simulation + baked light + FSR; integrated GPU = rich simulation + baked lightmaps; webgl2/Safari is **never excluded** (Diretoria Decision 2).
- **Supremacy is measured on the LOWEST supported tier, not the highest.** "Works on my 4090" = **failure** (Index § Absolute Supremacy Mandate #73 + AAA Parity §0.1). A parity-50% UE5 scene must hold **stable** on entry/discrete hardware — not only on enthusiast silicon.
- **Cloud assist compensates weak local hardware** (§9 cloud quotas): heavy neural/baked passes may degrade to cloud cook **only** when entitlement exists — local-first always, Law VIII airgapped respected.
- **Supremacy KPI:** the same scene rises in fidelity ceiling with Capability Score across every tier; **no tier ships below "rich + stable"**.

**Rust-first engine supremacy + AI-optimal constraints (binding — Chief Architect directive 2026-08-12):**
- **The engine IS Rust.** Core identity = the **Rust kernel** (`apps/studio-local/src-tauri/`: wgpu renderer, `physics_kernel`, GPU culling, GAS native) — compiled, memory-safe, zero-GC, fastest-and-best-quality target. Web/webgl2 is a **distribution tier**, never the engine's core identity; no web-demo-first engineering.
- **Zero demo / zero MVP:** no demo-grade scaffolding, proxy capsules, or play-log placeholders are accepted as engine work. Every engine PR ships **G-readiness + J-readiness** graded (AGENTS.md quality gates), or it is rejected (Law XI).
- **AI-optimal constraints = quality rails:** the "ideal limitations" are *designed* so the agentic workforce operates at maximum quality — Law XI dual-stack validation gates (TS + Rust), Anti-Laziness protocol (truncation ban, chunk ≤ 300, `settle: 0` on lazy reject), evidence-ledger discipline (no hallucinated claims), S-01 Rust Kernel reachability (76/88 unreachable wires), and the Deepen & Robustify register S-01..S-10. These rails are **features**, not friction — they are what make supreme (not placebo) code the only possible output.

**Wave ownership:** **B.1** (HardwareDetector static) → **C** (ScalableRenderGraph + CullingPolicy) → **D** (FSR + RT enthusiast) → publish **`baked-lighting`** stage (mandatory).

**Prohibitions:**
- Export assuming dedicated GPU only — **forbidden**.
- Hardcoded render pipeline ignoring capability score — **forbidden**.
- Marketing RT/bindless on webgl2 blueprint — **forbidden**.
- Tier 3 listing without baked lightmaps post-publish — **forbidden** (Hub quality gate).

**Decisões da Diretoria (aprovadas):**

| # | Decisão | Resolução |
|---|---------|-----------|
| 1 | Tier contínuo 0–100 | **Aprovado** — blueprint labels derived from score bands |
| 2 | Safari WebGL2 | **Aprovado** — official fallback; no Apple exclusion |
| 3 | Baked lighting | **Aprovado** — mandatory publish pipeline stage; not paid cloud SKU |

---

## 5. Onda Alignment

| Deliverable | Onda | Depends |
|-------------|------|---------|
| `hardware-profile.ts` + Rust probe | **B.1** | wgpu surface |
| `UMABudgetPolicy` + depot wire | **B** + **F** CAS | OOM sentinel |
| `ScalableRenderGraph` kernel | **C** | Law V |
| `CullingPolicy` CPU/GPU switch | **C** | Law I SAB |
| FSR graph node | **D** | Frame graph |
| `baked-lighting` publish stage | **A.2+ publish** | Law VI cook |
| Hardware telemetry dashboard | **F.2** + **I** | Law II |

**Quality gate:** `capabilityScore` + active blueprint logged in export manifest for honest Hub badges (`[Desktop Exclusive]`, `[Cross-Save]`, etc.).

---

## 6. Feature × Blueprint matrix (binding — gates all specs)

Every spec must declare which blueprints enable each feature. **Forbidden:** shipping enthusiast-only feature without downgrade path or honest badge.

| Feature / Spec | enthusiast 75+ | discrete 45–74 | integrated 20–44 | webgl2 0–19 |
|----------------|----------------|----------------|------------------|-------------|
| **S1** full slab stack | ✅ | reduced slabs | static variants | 4 tex max |
| **S2** 50 km² world | ✅ | 4–8 km² | 1–2 km² | authored tiles |
| **G.3a** Micro-Poly | ✅ full | reduced LOD | ❌ | ❌ |
| **G.3b–c** Radiance | ✅ SW+HW | SSGI+probes | baked | baked only |
| **G.3d–e** Entropy GPU | ✅ | reduced count | CPU fallback banned at G | ❌ |
| **K.1** Neural upscale | ✅ ONNX | FSR only | ❌ | ❌ |
| **K.3** 3DGS hero | ✅ subset | hero only | ❌ | ❌ |
| **K.4** WebXR | discrete forced | ✅ primary | ❌ | ❌ |
| **M.1** PSO Vault | ✅ tier bundle | ✅ | web cache | web cache |
| **M.2** DirectStorage | ✅ Win | compute fallback | VT only | Range Fetch |
| **M.3** WASM Shield | ✅ | ✅ | ✅ | ✅ |
| **S6** competitive net | ✅ dedicated | listen server | P2P badge | WebRTC demo |
| **H** full sensory store | ✅ | reduced VFX | simplified UI | coins subset |
| **I** instant demo | WebGPU | WebGPU/WebGL2 | WebGL2 | WebGL2 |

---

## 7. Reference GPU → score examples (planning)

| GPU class | Example | Typical score | Blueprint |
|-----------|---------|---------------|-----------|
| RTX 4090 / RX 7900 | Enthusiast | 90–100 | enthusiast |
| RTX 3060 12GB | Mid discrete | 65–75 | discrete / enthusiast edge |
| GTX 1060 6GB | Legacy discrete | 48–55 | discrete |
| Intel Arc A770 | Modern discrete | 60–70 | discrete |
| Ryzen 780M iGPU | Strong iGPU | 35–42 | integrated |
| Intel UHD 620 | Office iGPU | 15–22 | integrated / webgl2 edge |
| Safari WebGL2 | Browser | 5–15 | webgl2 |
| Quest 3 (XR) | Mobile VR | forced discrete policy | discrete (K.4) |

**Dynamic adjustment:** `HardwareDynamicProfile` may downgrade blueprint ±1 band after 300 frames of budget violation (hysteresis 10s).

---

## 8. Extended acceptance (Law XV)

- [ ] **XV-ACC-01:** Export manifest includes `capabilityScore` + `blueprint`
- [ ] **XV-ACC-02:** Integrated GPU runs dogfood scene @ 30 FPS min
- [ ] **XV-ACC-03:** WebGL2 Safari publishes with baked lighting only
- [ ] **XV-ACC-04:** XR session forces downgrade (K.4 + score policy)
- [ ] **XV-ACC-05:** FSR node activates when internal scale < 1.0
- [x] **XV-ACC-06 (cn/co/cp/cr):** Cosmos CapScore budgets degrade interest/CCD/fine-BVH/`skyAtmosphereSamples`/`acousticRaySteps` on GT730 (`resolveCosmosCapabilityBudget`); reverse-Z + floating-origin remain allowed; letter **co** multi-frame live soak proves CapScore contrast; letter **cp** PBR sky viewport applies Rayleigh/Mie with GT730 sample degrade; letter **cr** acoustic atmosphere applies vacuum/hull/atmosphere bus gain with GT730 ray-step degrade — **MMO space / Nanite / painted-skybox / UE atmosphere / Full HRTF AAA claims still [HELD]**

See [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md) and [`AETHEL_UE5_ARTIST_MIGRATION_GUIDE.md`](AETHEL_UE5_ARTIST_MIGRATION_GUIDE.md).

---

## Cross-links

| Doc | Link |
|-----|------|
| `AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md` | XR downgrade K.4 |
| `AETHEL_STUDIO_SUPREMACY_INDEX.md` | S1–S7 tier gates |
| `AETHEL_PLANNING_COMPLETENESS.md` | Planning 100% |

---

## 9. Subscription × Cloud Cost Boundary (Law XV + Unit Economics)

**Rule:** Every cloud service that scales with usage MUST map to a field in [`plans.ts`](../../cloud-web-app/web/lib/plans.ts), [`contracts_planning.md`](./contracts_planning.md) §8, or **UsageBucket/Coins** at dispatch — never unlimited on Free.

**Canonical tier limits (from `plans.ts` — do not invent alternate numbers):**

| Cloud service | Free | Starter | Pro | Studio | Enterprise | Who pays |
|---------------|------|---------|-----|--------|------------|----------|
| R2 storage | 250 MB | 2 GB | 14 GB | 60 GB | 1 TB | Creator subscription |
| Weighted AI/mo | 200K fast | 1M fast | 4.5M (3M+37.5K prem) | 18M (12M+150K prem) | 100M (70M+750K prem) | Creator; dual pool Pro+ |
| CDN deploy egress | 24h links | 8→9.6 GB | 100 GB | 500 GB | Custom | Creator |
| Collab write seats | 0 | 0 | 2 | 3 | ∞ | Creator |
| Dedicated MP cloud | ❌ P2P/local | P2P | 1×256MB | 3×512MB | Custom | Creator tier |
| Cloud asset cook | local default | paid infra | paid infra | paid infra | paid infra | UsageBucket when queue live |
| Forge sandbox | ❌ | ❌ | UsageBucket | UsageBucket | UsageBucket | UsageBucket when L ships |
| PSO Vault bake | JIT client | JIT + tier bundle | JIT + tier bundle | JIT + tier bundle | JIT + tier bundle | M.1 policy TBD |
| Cross-save R2 | ❌ | ❌ | Pro+ policy TBD | Pro+ policy TBD | Pro+ policy TBD | I.7 when live |
| Hub launch impressions | 2k (platform CAC) | same | same | same | same | Platform marketing |
| Hub Promoted | Coins | Coins | Coins | Coins | Coins | Creator Coins |

**Render / Capability Score / FSR / blueprint downgrade:** **$0 platform COGS** — runs on player device.

Full COGS/REV matrix: [`AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md`](./AETHEL_UNIT_ECONOMICS_AND_SUBSCRIPTION_ALIGNMENT.md) v1.4.  
Plan tables: [`AETHEL_PLANS_CANONICAL_REFERENCE.md`](./AETHEL_PLANS_CANONICAL_REFERENCE.md).
