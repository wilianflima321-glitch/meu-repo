# AETHEL ENGINE ??? AAA SYSTEM ARCHITECTURE BLUEPRINT
**Status:** SUPREME LAW (Overrides any partial documentation)
**Author:** Gemini (Opus Max Level) / Triunvirate Standard

This document establishes the absolute, unbreakable physical laws for the Aethel Engine. It bridges the gap between project management (tracking features) and low-level engineering (CPU/GPU pipeline realities). **Any code that violates these laws is automatically rejected, regardless of its functional completeness.**

---

## 0. THE ZERO-AI DETERMINISTIC RUNTIME LAW
The Aethel Engine achieves AAA graphic and physics supremacy over Unreal Engine 5 **exclusively through math, deterministic algorithms, and bare-metal compute optimization**. 
*   **Law (Engine Isolation):** No AI (LLM, VLM, Generative Neural Network) shall ever run in the hot-loop of the Engine's rendering, physics, or game logic. The Engine must run offline, on pure Silicon, executing pure WGSL and Rust Data-Oriented structures.
*   **Law (Workflow Only):** Artificial Intelligence (MoA, Swarm Orchestration) is strictly restricted to the **IDE/Studio** layer as a workflow accelerator (design-time generation, AST rewriting, node wiring). If the AI is turned off, the resulting compiled game must still out-perform Unreal.

---
## 1. MEMORY TOPOLOGY (DATA-ORIENTED DESIGN ABSOLUTISM)

### 1.1 Cache-Line Alignment & Struct Sizing
The CPU fetches memory in 64-byte chunks (Cache Lines). Aethel Engine relies on zero-waste memory streaming.
*   **Law:** Every hot struct in the `WorldSoA` MUST be explicitly padded and aligned to 16, 32, or 64 bytes using `#[repr(C, align(X))]`.
*   **Law:** Padding bytes must be explicit or zeroed to prevent poison data during Zero-Copy FFI transfers to WebGPU.
*   **Ban:** Structs that straddle cache lines unpredictably are illegal.

### 1.2 Zero-Copy FFI & Mmap Supremacy
Data must flow from Rust (Kernel) to TypeScript/WebGPU (Shell) without duplication.
*   **Law:** Inter-process and Inter-thread communication uses `memmap2` (Mmap) or SharedArrayBuffer (SAB).
*   **Law:** No Serialization/Deserialization (JSON, Bincode) is allowed in the hot loop. The memory representation in Rust MUST exactly match the layout expected by the WebGPU compute shaders and TS typed arrays (`Float32Array`).
*   **Ban:** `String` or `Vec::new()` instantiation during `SimulationTick` or `GameLoop` is strictly forbidden. 

---

## 2. THE RENDER GRAPH & EXECUTION THREADS

### 2.1 The Two-Hemisphere Model
The engine operates on two strictly separated hemispheres to ensure stable 240Hz/120Hz ticks.
1.  **Game/Physics Thread (The Reator):** Runs purely in Rust. Calculates the Delta State, Physics, Netcode, and Entity Logic.
2.  **Render/UI Thread (The Shell):** Runs on WebGPU/Tauri. Consumes the Memory Mapped state read-only, interpolates between ticks, and pushes command buffers to the GPU.

### 2.2 Synchronization Boundaries (Barrier Protocol)
*   **Law:** The Game Thread never waits for the Render Thread (No GPU-to-CPU stalls).
*   **Law:** Communication is strictly multi-buffered (Double/Triple Buffering). The Render Thread always reads the *previous* completed state buffer while the Game Thread writes the *next* state buffer.

---

## 3. AAA PERFORMANCE BUDGETS (THE MEAT GRINDER)

Features are not "CLOSED" just because they compile and return a result. They must fit the budget.
*   **Target FPS:** 120Hz base tick rate. 
*   **Time Budget per Tick:** ~8.33 milliseconds.
*   **Allocation Budget:** 0 bytes per frame (Zero-Alloc Hot Loop). All memory must be pre-allocated in arenas (`MetabolicMemory`, `LinearFrameAllocator`) during the load screen.
*   **Validation:** Every subsystem marked as "CLOSED" in `AETHEL_FOCUS1_EXECUTION_PROGRESS.md` MUST explicitly declare its conformance to this 0-byte allocation budget and its cache-line efficiency.

---

## 4. TRIUMVIRATE SYNERGY (CLAUDE, GROK, GEMINI)
*   **Amnesia Prevention:** Do not assume the context of the previous agent.
*   **Code Locality:** Write code assuming the other AIs will read it. Document unsafe blocks exhaustively with proofs of why the borrow checker was bypassed.
*   **Panic-First:** If a memory budget is exceeded, trigger a controlled `panic!()`. Do not attempt to dynamically allocate memory to save a crashed state. Let the Orchestrator (Yjs snapshot) recover it.

**BY ORDER OF THE ARCHITECT. NO EXCEPTIONS.**

---

## 5. PHASE QUALITY GATES (PRODUCT SCALE — NOT MVP)

**Binding 2026-08-16.** A module is not "production-grade" because it compiles, passes a unit test, or earns a kernel letter CLOSED. **Product scale** means the subsystem survives the gates below on **user hardware** (Law XV lowest tier for supremacy claims; enthusiast tier for nuclear G.3).

### 5.1 Per-subsystem minimum bar (before `CLOSED` sticks)

| Subsystem | Zero-AI runtime | Memory law | Product wire | Acceptance fixture |
|-----------|-------------------|------------|--------------|-------------------|
| **Render pass** | WGSL/Rust math only | 0 alloc in present loop | Product present frame, not secondary_winit only | GF-* or G-ACC-* |
| **Physics tick** | Deterministic Rust | SoA 64-byte align; no Vec in tick | PhysicsWorld single authority (S-17) | GF-NET-001 / soak fingerprint |
| **GAS tick** | No JSON/reflection | Binary SAB layout fixed | 60Hz product duplex | GF-GAS-001/002 |
| **PCG / World** | Cook-time or sim deterministic | No empty output | Viewport-visible density | GF-WORLD-* |
| **IA / workflow** | **Never** in sim/render tick | CostGuard reserve/settle | CreativeBridge + FusionTx | GF-AI-* |

**Retroactive HELD:** Any prior `CLOSED` entry that violates §1–§3 or lacks the Product wire column is **voided** until re-proven (Progress AAA Performance Budget Law).

### 5.2 Toy-resolution ban (lab ≠ shippable)

These resolutions are **band-15% ceiling** until scaled in **product present** (Progress §G.% Anti-theater):

- Micro-poly soft-raster **64²**
- Radiance probes **4³**
- Entropy chunks **64**
- FSR upsample **32→64** as sole temporal path
- VSM **32px pages** / 8×8 virtual atlas toy

Executors (DeepSeek) **must not** flip `*_aaa_ready` or marketing flags while running at toy resolution.

### 5.3 Two-hemisphere enforcement (§2 — product gap today)

**Current violation (honest):** Frame graph runs on secondary_winit; Studio viewport remains Chromium-composited; `product_present_ready=false`. This breaks §2.1 until TICKET-PP-01/03 closes the Shell reading mmap state from the **product** present loop every frame.

---

## 6. EXECUTOR MANDATE (DEEPSEEK + ALL AGENTS)

**Binding 2026-08-16.** Complements Index §Deep Executor Critique and AAA Parity §7.

1. **Quality over velocity:** One product-present milestone beats ten kernel letter probes.
2. **Phase order:** A (stop treadmill) → B (G.% 15→30) → C (30→50 + GAS) → D (World + nuclear G-ACC) → G (#72 composite). **No skipping.**
3. **Fail-closed flags:** `*_aaa_ready`, `product_present_ready`, `GAS_60HZ_BINARY_IPC_READY`, `chaosParityReady`, `nativeOnnxReady` flip **only** on measured fixture soak — never on compile.
4. **Critic loop (Law XI):** Actor ships patch → Critic runs dual-stack gates → reject if phase gate skipped or toy resolution presented as AAA.
5. **Desired level may fail:** If executors keep adding lab substrates without product wire, the platform **will not** reach Unreal-class or market-best — not because plans are wrong, but because **phase discipline was violated**.

**Boot chain:** `AETHEL_FOCUS1_EXECUTION_PROGRESS.md` §Deep Executor Critique → Index §Deep Executor Critique → Master Map §0.3 → this §5–§6 → **one** execution round.

**Cross-links:** Progress §G.% Evidence Ladder · AAA Parity §7 · Index doctrine #72/#73.
