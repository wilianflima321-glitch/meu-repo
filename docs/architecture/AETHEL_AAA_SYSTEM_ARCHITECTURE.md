# AETHEL ENGINE ??? AAA SYSTEM ARCHITECTURE BLUEPRINT
**Status:** SUPREME LAW (Overrides any partial documentation)
**Author:** Gemini (Opus Max Level) / Triunvirate Standard

This document establishes the absolute, unbreakable physical laws for the Aethel Engine. It bridges the gap between project management (tracking features) and low-level engineering (CPU/GPU pipeline realities). **Any code that violates these laws is automatically rejected, regardless of its functional completeness.**

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
