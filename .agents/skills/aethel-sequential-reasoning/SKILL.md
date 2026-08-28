---
name: aethel-sequential-reasoning
description: Deep multi-step reasoning, hypothesis branching, and architectural self-critique engine. Use when designing low-level systems (Rust physics kernel, wgpu render graphs, GAS, SharedArrayBuffer layouts, WebGPU shaders) or complex state synchronizations to eliminate logical flaws before writing code.
---

# Aethel Sequential Reasoning & Architecture Critique

This skill enforces deep, deliberate analytical thinking before executing architectural changes in the Aethel Engine.

## When to Activate
- Low-level data structures (SoA layouts, RingBuffers, ECS archetypes).
- Thread synchronization and SharedArrayBuffer atomics (Law I).
- Complex graphics pipelines (Render Graph, bindless resources, WGSL/wgpu).
- Multi-agent or multiplayer rollback synchronization.

## Methodical Protocol

1. **Problem Decomposition:**
   - Break down the challenge into fundamental constraints (Memory, CPU/GPU latency, Thread safety, Zero-Allocation hot paths).
2. **Hypothesis & Alternative Exploration:**
   - Propose 2-3 architectural approaches (e.g. Double-buffer vs Lock-free RingBuffer; CPU culling vs Indirect Compute culling).
   - Evaluate trade-offs explicitly.
3. **Self-Critique & Failure Mode Analysis:**
   - Where will this design fail under 100,000 entities?
   - Does this cause garbage collection pauses on V8?
   - Does this introduce cache misses in Rust L1/L2 cache?
4. **Final Refinement:**
   - Output the mathematically optimal, cache-friendly implementation plan.
