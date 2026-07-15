# Aethel Engine — Runtime Immunity Spec (Onda M)

**Version:** 1.1 (Chief Architect — Deepened)  
**Status:** **Binding** — **Onda M (Aethel Immunity)** — anti-stutter, anti-loading, anti-crash  
**Canonical:** [`AETHEL_SUPREMACY_ROADMAP.md`](AETHEL_SUPREMACY_ROADMAP.md) v4.6  
**Studio cross-links:** M.1 ← S1 PSO fingerprints; M.3 → S5 WASM scripts only
**Targets:** UE5 chronic defects — **shader compilation stutter**, **CPU-bound loading**, **native code crash propagation**  
**Laws:** **VI** (Distributed Cook), **VII** (WASM VM), **XV** (Capability Score tiers), **I** (worker isolation)

---

## Executive mandate

Three runtime plagues destroy UE5-class PC titles today. Onda M addresses them with **Rust/wgpu/WASM-native** architecture — not marketing clones of Epic's pipeline.

| UE5 defect | Aethel answer | Codename |
|------------|---------------|----------|
| **Shader compilation stutter** (PSO JIT on first frame) | Cloud PSO pre-cache keyed by hardware tier | **Aethel PSO Vault** |
| **CPU loading bottleneck** (NVMe → RAM → CPU → GPU) | DirectStorage (Win) + GPU decompress compute + VT streaming (all platforms) | **Aethel Zero-Copy IO** |
| **C++ crash kills entire process** | WASM sandbox + supervisor hot-reload; wgpu/Rapier stay native outside VM | **Aethel WASM Shield** |

**Engineering cost vs Wedge (binding decision #56):**  
- **Now (Ondas C–D):** **M.0 foundation hooks** — cook manifest slots, async IO interfaces, WASM worker boundary — **no cloud PSO ship, no DirectStorage ship**.  
- **Onda M (parallel post-C):** full implementation — **does NOT delay** Wedge #1, A.1, J, L, or K.  
- **Web path:** PSO Vault + WASM Shield apply; **DirectStorage is desktop-only** (Law XV / Platform Reality).

**Zero-MVP:** No "zero stutter," "instant load," or "uncrashable engine" marketing until M acceptance suites pass.

---

## State today (audit — honest)

| Capability | Status | Evidence |
|------------|--------|----------|
| Render Graph / bindless (PSO source) | **PLANNED** | Onda C — hardcoded WebGL2 today |
| wgpu pipeline cache API usage | **AUSENTE** | No PSO serialization |
| Distributed Cook (Law VI) | **PARTIAL** | JS AethelPack writer + Zstd WASM + publish cook (**bn**/**bo**); BC7/ASTC/VT **HELD** |
| Cloud PSO pre-compile | **AUSENTE** | Vision 2030 §6 docs only |
| DirectStorage / GPU decompress | **AUSENTE** | `IMPROVE-ENG-003` draft |
| wgpu native DS binding | **N/A** | wgpu does not expose DirectStorage — **Rust sidecar required** |
| VT + R2 Range Fetch | **PARTIAL** | Law VI A.2 foundation |
| VS → WASM (Law VII) | **PLANNED** | `visual-script-transpile-stage.ts` emits TS only |
| WASM runtime supervisor | **AUSENTE** | — |
| Hot-reload (IDE web assets) | **PARTIAL** | `hot-reload-server.ts` — CSS/JS HMR, not game logic WASM |
| Physics/Rapier native | **REAL** | Stays **outside** WASM sandbox |
| Crash isolation / panic hook | **PARTIAL** | R64 planned; no WASM trap recovery |

---

## 1. Aethel PSO Vault — Cloud PSO Pre-Caching

### 1.1 Problem (cold truth)

UE stutters because **Pipeline State Objects** compile on first draw when materials/shaders permutations are unseen. Cloud pre-cache **cannot** mean one binary for all GPUs — PSO/native pipeline caches are **vendor and driver specific**.

### 1.2 Viable Aethel design (honest)

| Layer | Design |
|-------|--------|
| **Cook (publish)** | Enumerate all render-graph material permutations → stable **PSO fingerprint** (WGSL hash + bind layout + blend/depth/raster state) |
| **Cloud compile farm** | Workers compile to **tier bundles**: `nvidia-ampere+`, `nvidia-turing`, `amd-rdna2+`, `intel-xe`, `generic-vulkan` — NOT per exact device ID |
| **Delivery** | R2 CAS blobs keyed by `{gameBuildId, psoFingerprint, tierId}`; player downloads matching **`HardwareDynamicProfile.gpuTier`** (Law XV) |
| **Runtime** | Load cache blob → `wgpu` pipeline cache restore (where API supports) → fallback JIT with **async compile queue** (stutter budget < 2ms/frame) |
| **Web** | WebGPU pipeline cache + pre-warmed permutations from cook; no DX12 PSO |

**Foundation wave:** **C** (Render Graph must expose PSO fingerprint registry) + **F** (publish cook stage `pso-vault-bake`).

### 1.3 Contracts

```typescript
// packages/engine/render/pso-vault/pso-vault-contracts.ts
export interface PsoFingerprint {
  id: string;                    // sha256(wgslModules + layout + fixed function)
  materialPermutationId: string;
  renderGraphNodeId: string;
}

export interface PsoTierBundle {
  tierId: 'nvidia-ampere' | 'nvidia-turing' | 'amd-rdna2' | 'intel-xe' | 'generic-vulkan' | 'webgpu';
  buildId: string;
  blobCasHash: string;           // R2 CAS
  wgpuCacheFormatVersion: number;
}
```

| Module | Path |
|--------|------|
| Fingerprint registry | `packages/engine/render/pso-vault/pso-fingerprint-registry.ts` |
| Cloud bake worker | `workers/pso-vault-bake-worker.ts` |
| Runtime loader | `apps/studio-local/src-tauri/src/pso_vault_loader.rs` |
| Tier resolver | `lib/hardware/gpu-tier-resolver.ts` (extends Law XV) |

### 1.4 Acceptance (M.1)

- [ ] Entering new biome in golden scene: **≤ 1 frame spike > 8ms** (p95) on RTX 4070 with vault enabled vs **≥ 5 spikes** without
- [ ] Offline mode: local vault cache from prior session — Law VIII satisfied
- [ ] Wrong-tier blob never applied — fingerprint mismatch fails closed to JIT

### 1.5 Prohibitions

- Claiming **zero** stutter on unknown future GPU — forbidden
- Shipping PSO vault without Render Graph fingerprint registry — forbidden

---

## 2. Aethel Zero-Copy IO — DirectStorage & GPU Decompression

### 2.1 Problem (cold truth)

Classic path: NVMe → CPU decompress → staging buffer → GPU. CPU becomes loading-screen bottleneck. **wgpu has no DirectStorage API** — integration is **native Rust beside wgpu**, not inside abstraction.

### 2.2 Viable Aethel design (honest)

| Platform | Path |
|----------|------|
| **Windows 11 + DX12** | Tauri Rust module: `DirectStorage` + optional **GPU decompression** (GDeflate/BCn via D3D12) → committed resource → import to wgpu buffer/texture |
| **macOS** | Metal sparse textures + `IOKit` async read — **different implementation**, same manifest |
| **Linux** | `io_uring` + compute decompress — best-effort; document held gaps |
| **Web** | **No DirectStorage** — Law VI **VT + R2 Range Fetch** + KTX2/Basis GPU transcode (already canonical) |

**GPU decompression (cross-platform fallback):** wgpu **compute shaders** decompress KTX2/Basis/BCn on GPU when DS unavailable — viable everywhere wgpu runs.

**Foundation wave:** **B** (Tauri IO sidecar) + **C–D** (VT page loader async) + **VI** (cooked asset pages).

### 2.3 Contracts

```typescript
// packages/engine/io/zero-copy-io-contracts.ts
export interface AssetPageDescriptor {
  pageId: string;
  casHash: string;
  byteOffset: number;
  byteLength: number;
  compression: 'none' | 'gdeflate' | 'ktx2-etc1s' | 'meshopt';
  gpuReady: boolean;             // true if DS path can skip CPU decode
}

export interface ZeroCopyLoadRequest {
  pages: AssetPageDescriptor[];
  target: 'vram-texture' | 'vram-buffer' | 'mapped-staging';
  priority: 'blocking' | 'streaming';
}
```

| Module | Path |
|--------|------|
| DS native (Windows) | `apps/studio-local/src-tauri/src/direct_storage_loader.rs` |
| GPU decompress WGSL | `packages/engine/render/compute/gpu-decompress.wgsl` |
| VT page scheduler | `packages/engine/io/vt-page-scheduler.ts` |
| Manifest extension | Law VI cook output `asset-pages.json` |

### 2.4 Acceptance (M.2)

- [ ] Windows: 4K KTX2 page load **CPU time < 5%** of baseline sync read on golden fixture
- [ ] Web: VT Range Fetch path unchanged — no regression
- [ ] Graceful degrade: DS unavailable → compute decompress path (no hard crash)

### 2.5 Prohibitions

- Marketing "DirectStorage" on **web** builds — forbidden
- Blocking Wedge on Linux DS parity — forbidden (best-effort tier)

---

## 3. Aethel WASM Shield — Sandboxed Hot-Reload

### 3.1 Problem (cold truth)

UE gameplay C++/Blueprint native code crashes the whole editor/player. **Our moat:** gameplay logic in **WASM workers**; wgpu/Rapier/ECS native cores stay outside; infinite loop = **trap + module reload**, not process exit.

### 3.2 Viable Aethel design (aligns with Law VII)

| Layer | Design |
|-------|--------|
| **Compile** | Onda C: VS → WASM (wasmtime/wasmer) or flat bytecode; publish cook emits `.wasm` + schema |
| **Runtime** | Dedicated **Worker** per world shard / entity batch — **not main thread** (Law I) |
| **Supervisor** | Epoch interruption / fuel limits; trap on hang → reload module from last good CAS hash |
| **Hot-reload** | Authoring: swap WASM module without tearing wgpu device; published builds: optional dev-only |
| **Host API** | Narrow syscalls: spawn VFX, apply impulse, play sound — **no raw pointers to GPU** |
| **Native stays native** | Rapier, wgpu, Micro-Poly — **never** inside guest WASM |

**Foundation wave:** **C** (Law VII WASM compiler) + **B** (COOP/COEP + SAB) + **G.5** (crash overlay shows WASM trap vs native panic).

### 3.3 Contracts

```typescript
// packages/engine/script/wasm-shield-contracts.ts
export interface WasmModuleSlot {
  moduleId: string;
  casHash: string;
  fuelLimit: number;
  epochDeadlineMs: number;
  allowedSyscalls: WasmSyscallId[];
}

export interface WasmTrapRecovery {
  trapKind: 'fuel-exhausted' | 'stack-overflow' | 'unreachable' | 'host-abort';
  moduleId: string;
  rollbackToCasHash: string;
  evidenceLedgerId: string;
}
```

| Module | Path |
|--------|------|
| VS → WASM compiler stage | `lib/production/visual-script-wasm-stage.ts` |
| Worker executor | `workers/wasm-script-executor.worker.ts` |
| Supervisor Rust | `apps/studio-local/src-tauri/src/wasm_supervisor.rs` |
| Syscall host | `packages/engine/script/wasm-host-syscalls.ts` |

### 3.4 Acceptance (M.3)

- [ ] Infinite loop in guest WASM: supervisor kills within **100ms**; wgpu frame loop continues
- [ ] Hot-reload new `.wasm` in editor: **≤ 200ms** swap; no GPU device lost
- [ ] 10k entity target: single VM + SoA indices — not 10k WASM instances (Law VII)

### 3.5 Prohibitions

- Running wgpu/Rapier **inside** guest WASM — forbidden
- 10k separate WASM instances on main thread — forbidden (Law I + VII)
- Marketing "uncrashable" — use **"isolated script failure recovery"** until M.3 passes

---

## Onda M delivery map

| Step | Deliverable | Depends | Ship |
|------|-------------|---------|------|
| **M.0** | Foundation hooks: PSO fingerprint slot in cook, async IO interface, WASM worker boundary in VS pipeline; **ambient_sensor_kernel** isolated thread + CSI ring (no-op without driver) | **C–D** (+ K.5 ambient) | Contracts; ambient scaffold **ax** |
| **M.1** | **PSO Vault** — cloud bake + tier delivery + runtime restore | C Render Graph, F publish, XV tier | M |
| **M.2** | **Zero-Copy IO** — DirectStorage Win + GPU decompress compute + VT integration | B Tauri, VI cook, D VT | M |
| **M.3** | **WASM Shield** — supervisor, hot-reload, trap recovery | C Law VII, B SAB, G.5 overlay | M |

**Parallel to Wedge:** M does **not** block A.1, J, L, K. **Blocks:** anti-stutter/loading/crash marketing only.

---

## Wave integration matrix (A→L)

| Onda | M integration |
|------|----------------|
| **A.2** | Range Fetch — same R2 path PSO vault blobs use |
| **B** | Tauri IO sidecar; COOP/COEP for WASM workers |
| **C** | Render Graph PSO fingerprints; Law VII WASM compiler; async IO hooks |
| **D** | VT at scale; PSO async compile queue in graph |
| **F** | Publish cook stages: `pso-vault-bake`, `wasm-pack`, `asset-pages` |
| **G.5** | Crash overlay distinguishes WASM trap vs native panic |
| **G.3** | Micro-Poly/Radiance PSO permutations feed vault enumeration |
| **K** | Neural nodes add PSO fingerprints — vault must include K permutations when K enabled; **K.5 ambient** uses M.0 `ambient_sensor_kernel` (never hitch sim tick) |
| **L** | Forge sandbox ≠ WASM Shield — Forge = dev engineering; M.3 = shipped game logic |
| **XV** | `gpuTier` drives PSO bundle selection |

---

## M-readiness checklist (Onda C–D PRs)

- [ ] Render Graph node registers **PSO fingerprint** export
- [ ] Cook manifest schema reserves `pso-vault` and `wasm-module` slots
- [ ] Asset loader uses async IO interface — no new sync read hot paths on streaming thread
- [ ] VS transpile output documents path to WASM (even if Phase 1 still TS)
- [ ] **G + K + L-readiness** unchanged

---

## Parity & honesty matrix

| Claim | Allowed after | Forbidden until |
|-------|---------------|-----------------|
| Zero shader stutter | **M.1** soak on tiered GPUs | "No stutter ever" |
| DirectStorage loading | **M.2** Windows acceptance | Web/desktop parity claim |
| Script crash isolation | **M.3** trap recovery suite | "Uncrashable engine" |
| Runtime immunity (combined) | **M.1 + M.2 + M.3** | Partial M ship |

**vs UE5 (honest):** M targets **class-leading** mitigation of three known UE pain points — Day 1 M ship may still JIT fallback on exotic GPUs; we document it (Law XV honesty).

---

## Cross-links

| Document | Relationship |
|----------|--------------|
| `AETHEL_AAA_PARITY_TARGETS.md` | G.3 permutations → PSO vault enumeration |
| `AETHEL_HARDWARE_SCALABILITY_SPEC.md` | `gpuTier` selects PSO bundle |
| `AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md` | K nodes add optional PSO set |
| `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` | L sandbox ≠ M WASM Shield (different trust domain) |
| `FUTURE_IMPROVEMENTS_REGISTRY.md` | `IMPROVE-ENG-003` → M.2 |
| `aethel_vision_2030.md` | §6 PSO, §2 DirectStorage — M implements tempered version |

---

## Approved decisions (#53–58, v4.6)

| # | Decision |
|---|----------|
| 53 | **Onda M — Aethel Immunity** — PSO Vault, Zero-Copy IO, WASM Shield |
| 54 | **PSO tier bundles** — not per-GPU magic; keyed by Law XV `gpuTier` |
| 55 | **DirectStorage desktop-only** — web uses VT + Range Fetch; no DS marketing on web |
| 56 | **Onda M parallel post-C** — M.0 hooks C–D; does not delay Wedge or A.1 |
| 57 | **wgpu stays outside WASM** — Rapier/Micro-Poly native; scripts in WASM Shield only |
| 58 | **GPU decompress compute** — cross-platform fallback when DS unavailable |

---

## UE5 defect deep dive (why M matters)

| UE5 pain | Root cause | Player impact | Aethel M answer |
|----------|------------|---------------|-----------------|
| Shader stutter entering biome | PSO JIT on new permutations | Frame spikes 50–200ms | M.1 tier bundles + async JIT budget |
| Open world load hitches | Sync decompress on game thread | Long stalls | M.2 DS + GPU decompress |
| Mod/script crash | Native code in process | Full exit | M.3 WASM trap + reload |
| Editor crash on BP compile | Same native process | Lost work | M.3 dev hot-reload + Yjs undo (L) |

**vs Unity:** IL2CPP crashes still kill process — WASM Shield is **structural** differentiator for user-generated logic (Roblox-class vision).

---

## Platform matrix (M.1 / M.2 / M.3 applicability)

| Subsystem | Web | Win desktop | macOS | Linux |
|-----------|-----|-------------|-------|-------|
| M.1 PSO Vault | WebGPU cache | wgpu + tier blobs | Same | Same |
| M.2 DirectStorage | **N/A** | **Primary** | Metal sparse | io_uring best-effort |
| M.2 GPU decompress | KTX2 transcode | Compute fallback | Compute | Compute |
| M.3 WASM Shield | **Primary** | Worker + supervisor | Same | Same |

---

## Failure modes & mitigations

| Failure | Mitigation |
|---------|------------|
| Wrong PSO tier blob applied | Fingerprint mismatch → JIT fail-closed |
| DS driver missing | Graceful compute decompress path |
| WASM fuel too high | Hang >100ms → supervisor kill |
| 10k WASM instances | Single VM + SoA — Law VII |
| Forge sandbox confused with M.3 | Trust domain docs; separate prohibitions |

---

## Extended acceptance + golden fixtures

| ID | Suite | Fixture |
|----|-------|---------|
| **M-ACC-01** | Biome entry spike ≤1 frame >8ms p95 | **GF-PSO-001** |
| **M-ACC-02** | Win 4K page CPU <5% baseline | GF-WORLD-002 |
| **M-ACC-03** | WASM infinite loop recovery 100ms | GF-MASS-001 + trap script |
| **M-ACC-04** | Hot-reload WASM ≤200ms no device lost | Editor dev path |
| **M-ACC-05** | Offline vault cache Law VIII | Airgapped session test |

See [`AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md`](AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md).

---

## M.0 Ambient Sensor Kernel (deepened 2026-07-13ax)

Isolated **ambient sensing** thread for Onda K.5 Wi-Fi CSI / TinyML — Immunity ownership because it is a **runtime hitch plague** if naively placed on `simulation-tick`.

| Mandate | Detail |
|---------|--------|
| Thread | Dedicated `aethel-ambient-sensor` — **never** joined from `physics_kernel::step` / render submit |
| Ring | Bounded CSI frame ring (`AMBIENT_CSI_RING_CAPACITY`) — drop oldest |
| No driver | **HELD no-op** — empty ring; TS uses gameplay-heuristic emotion |
| IPC | Status + ring snapshot for TS; `blocks_simulation_tick: false` always in contract |
| Code | `apps/studio-local/src-tauri/src/ambient_sensor_kernel.rs` (registered in `lib.rs`) |
| Rust gates | `cargo check/clippy/test` **[HELD]** when toolchain absent on executor host |

**Critique cross-link:** CSI OS support, false BPM, CostGuard, LLM lag, privacy — see Vanguard §4.3.

---

## M.0b — 7 Critical AAA Production Gaps (deepened 2026-07-13bi; Law I production 2026-07-13bk; fixed-point 2026-07-13bl; physics-worker 2026-07-13bm; AethelPack cook 2026-07-13bn; Zstd WASM 2026-07-13bo; ObjectPool/FrameArena soak 2026-07-13bp; Editor≠Runtime isolation 2026-07-13bq; WASM ABI+sandbox 2026-07-13br; Console HAL wgpu desktop 2026-07-13bs)

Founder dossier mapped onto Immunity / Law I / Law VI without inventing a parallel wave. **Scaffold CLOSED; ship claims HELD until proven.**

| # | Gap | Code | Scaffold | Ship |
|---|-----|------|----------|------|
| 1 | Asset Cooking `.aethelpack` (BC7/ASTC/Zstd/VT) | `aethel-pack-manifest.ts` + `aethel-pack-writer.ts` + `aethel-pack-compress.ts` + `cook-publish-stage.ts` + publish `evaluatePublishAssetCookStage` | CLOSED (bn+bo) | JS pack path `cookPackReady` when non-empty bytes; Zstd WASM `zstdEncoderReady` when encode/decode proven; BC7/ASTC/VT/Rust-worker **HELD** |
| 2 | Console HAL (WebGPU/Vulkan/DX12 via wgpu; PS5 GNM) | `console-hal.ts` + studio-local `wgpu_renderer.rs` | CLOSED (bi+bs) | `consoleHalReady` when documented desktop backends negotiate; `ps5GnmReady` always **false**; live present/submit soak **HELD** |
| 3 | Editor ≠ Runtime (strip IDE/React from shipped game) | `editor-runtime-boundary.ts` + `editor-runtime-honesty.ts` + export-format-worker.publish | CLOSED (bi+bq) | `editorRuntimeIsolated` when deny-list + `assertRuntimeExportClean` prove no Next/IDE leaks; `v8WinitHostReady` **HELD** |
| 4 | SAB zero-copy transforms JS↔Rapier | `shared-transform-buffer.ts` + `coop-coep-headers.ts` + `shared-transform-physics-bridge.ts` + `physics-worker-*` + SimulationTick | CLOSED (bk+bm) | `sabTransformsReady` only with COOP/COEP + bridge + allocation + COI + SAB; `physicsWorkerReady` when shared step proven; fallback-copy Zero-UI; zero-stutter **HELD** |
| 5 | GC stutter / Object Pool / Frame Arena | `object-pool.ts` + `frame-arena.ts` + `gameplay-pool-bus.ts` + `object-pool-honesty.ts` + SimulationTick | CLOSED (bi+bp) | `objectPoolEnforced` when soak proves stable pool stats; `zeroStutterMarketingAllowed` **HELD** until Founder M.1 |
| 6 | Fixed-point + GGPO rollback | `lib/netcode/` (Q16.16 + `FixedPointPhysicsAdapter` + `FixedPointRollbackSession` + competitive mode) | CLOSED (bl) | `fixedPointNetcodeReady` when path wired; `ggpoLive` / desync-free marketing **HELD** |
| 7 | WASM Plugin ABI + sandbox (with L) | `aethel-wasm-abi.ts` + `aethel-wasm-sandbox-injector.ts` + `aethel-wasm-abi-honesty.ts` | CLOSED (bi+br) | `wasmPluginAbiReady` when negotiate + sandboxed instantiate proven; marketplace / store UI **HELD** |

**Honesty aggregate:** `lib/immunity/aaa-production-capability.ts` + `GET /api/runtime/aaa-production-honesty` (letter **bs**).

**Law VI cook deepen (bn):** JS writer packs multiple assets into `.aethelpack` (SHA-256 casHashes). Publish packaging includes `assets/cooked.aethelpack` or fails closed. Rust cook worker HELD when rustc/cargo absent. Never emit fake BC7/ASTC bytes.

**Law VI Zstd WASM (bo):** `@bokuweb/zstd-wasm` encode/decode via `ensureZstdEncoder`; cook prefers Zstd when proven, else honest pako deflate. `zstdEncoderReady` flips only after round-trip prove. BC7/ASTC/VT remain HELD.

**Object Pool / Frame Arena deepen (bp):** `GameplayPoolBus` pools projectiles + entity scratch; `FrameArena.beginFrame` on SimulationTick; `assertNoHotPathAlloc` soak. `objectPoolEnforced` flips when soak stable. `zeroStutterMarketingAllowed` stays **false** until Founder M.1 — pool soak alone is not zero-stutter marketing.

**Editor ≠ Runtime isolation deepen (bq):** IDE/Next deny-list + `assertRuntimeExportClean` on publish/export cook path. Runtime pack must not include Next/IDE entrypoints — fail-closed on leak. `editorRuntimeIsolated` flips when gate clean. `v8WinitHostReady` stays **false** until desktop V8 isolate + winit host ships — strip alone is not a desktop host.

**WASM Plugin ABI + sandbox deepen (br):** ABI negotiate + sandboxed `WebAssembly.Module`/`Instance` with restricted syscall stubs (no WASI/FS/PTY). `wasmPluginAbiReady` flips when negotiate + fixture instantiate proven. AgentShellPolicy #48 — sandbox only. Plugin marketplace / store injection UI stays **HELD**.

**Console HAL / wgpu desktop deepen (bs):** Backend enum WebGPU / Vulkan / DX12 / PS5_HELD + `negotiateConsoleHal`. `consoleHalReady` flips only for documented desktop backends that exist in code (TS trait + studio-local wgpu). `ps5GnmReady` always **false**. Live present/submit soak + certification stay **HELD**. No Coins / Agones / BC7 marketing from HAL.

**Law I production (bk):** middleware + `next.config.js` set COOP `same-origin` / COEP `credentialless` / CORP `same-origin` on ide/studio/play/runtime surfaces. Browser: Chromium 96+ for credentialless COI; no zero-stutter marketing from headers alone.

**Physics-worker deepen (bm):** `PhysicsWorkerManager` + `physics-sim.worker` bind bk SAB/fallback; main posts `step`; worker writes transforms + epoch (no body-map clone). Opt-in via `physicsWorkerRequested`. Unavailable Worker/COI → silent main-thread Rapier (Zero-UI). Zero-stutter / Rapier-in-worker soak remain **HELD**.

**Fixed-point deepen (bl):** Rapier float remains default playtest/runtime. Competitive mode flag selects `FixedPointPhysicsAdapter` + rollback snapshot/restore. Never claim GGPO-live / desync-free without soak.

**vs Unreal/Unity (honest):** UE has decades of cook/UAsset + console certifications; Unity IL2CPP still process-kills on native faults. Aethel scaffolds the **contracts** (pack format, SAB layout, pool rules, WASM ABI) now; claiming cook/PSO/zero-stutter/GGPO parity before bakers + soak is marketing fraud under Zero-MVP.

**Prohibitions:** `success: true` with empty AethelPack; `cookPackReady` without non-empty pack bytes; BC7/ASTC claim without native encoder; `consoleHalReady` true for PS5; `ps5GnmReady` true without proprietary SDK; `fixedPointNetcodeReady` without fixed-point physics path evidence; GGPO-live without soak; stutter-free / `zeroStutterMarketingAllowed` without Founder M.1 soak; `objectPoolEnforced` without soak evidence; `sabTransformsReady` without COOP/COEP + proven allocation; `physicsWorkerReady` without shared-transform step proof; zero-stutter from worker spawn or pool alone; `editorRuntimeIsolated` without deny-list + clean export gate; `v8WinitHostReady` true without desktop V8+winit host; `wasmPluginAbiReady` without negotiate + sandboxed instantiate proof; plugin marketplace claim without Founder store unlock.

