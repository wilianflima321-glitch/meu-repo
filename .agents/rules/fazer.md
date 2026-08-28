---
trigger: always_on
---

# Aethel Engine — Supremacy Roadmap (Canonical)

**Version:** 4.7 (Planning 100% — A.0 Certificate)  
**Status:** **PLANEJAMENTO A.0 100% ENCERRADO.** Execução **A.1** autorizada pelo Chief Architect.  
**Product path:** `cloud-web-app/web/` (Next 14) + `apps/studio-local/` (Tauri/wgpu)  
**Companion:** [Blueprint v4.7](.cursor/plans/blueprint_de_supremacia_aaa_a7b2ca8f.plan.md)  
**Master index (full corpus map):** [AETHEL_STUDIO_SUPREMACY_INDEX.md](AETHEL_STUDIO_SUPREMACY_INDEX.md) **v1.5** — **§ Document Authority**  
**Execution playbook:** [AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md](AETHEL_SUPREMACY_EXECUTION_PLAYBOOK.md) v1.1  
**Completeness:** [AETHEL_PLANNING_COMPLETENESS.md](AETHEL_PLANNING_COMPLETENESS.md) **v1.2** — **100% planning**  
**Executor map (task queue):** [AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md](AETHEL_CLAUDE_EXECUTION_MASTER_MAP.md) **v1.4**  
**Live ledger:** [AETHEL_FOCUS1_EXECUTION_PROGRESS.md](AETHEL_FOCUS1_EXECUTION_PROGRESS.md)  
**Commerce spec:** [AETHEL_NETWORK_COMMERCE_LIVEOPS_SPEC.md](AETHEL_NETWORK_COMMERCE_LIVEOPS_SPEC.md) (Laws XII–XIII)  
**Game Hub spec:** [AETHEL_GAME_HUB_PLATFORM_GROWTH_SPEC.md](AETHEL_GAME_HUB_PLATFORM_GROWTH_SPEC.md) (Law XIV)  
**Hardware scalability:** [AETHEL_HARDWARE_SCALABILITY_SPEC.md](AETHEL_HARDWARE_SCALABILITY_SPEC.md) (Law XV)  
**AI / Creative Fusion:** [AETHEL_AI_FUSION_CREATIVE_SPEC.md](AETHEL_AI_FUSION_CREATIVE_SPEC.md) (Law XVI)  
**AAA Parity Targets (Onda G Bible):** [AETHEL_AAA_PARITY_TARGETS.md](AETHEL_AAA_PARITY_TARGETS.md) (Micro-Poly, Radiance, Entropy)  
**Vanguard Technologies (Onda K Bible):** [AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md](AETHEL_VANGUARD_TECHNOLOGIES_SPEC.md) (Neural, 3DGS, Spatial XR)  
**Universal IDE Forge (Onda L Bible):** [AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md](AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md) (Cursor / v0 / Devin parity class)  
**Runtime Immunity (Onda M Bible):** [AETHEL_RUNTIME_IMMUNITY_SPEC.md](AETHEL_RUNTIME_IMMUNITY_SPEC.md) (PSO Vault, Zero-Copy IO, WASM Shield)  
**Studio Pillars S1→S7:** [AETHEL_STUDIO_SUPREMACY_INDEX.md](AETHEL_STUDIO_SUPREMACY_INDEX.md) — Material, World, Animation, MetaSounds, Gameplay, Netcode, Content  

**Execution order (binding):** **Focus 1** (AI brain + real files) → **Focus 2** (renderer + terrain) → **Block 6** (billing) → then Hub/G marketing. Doctrines **#55–#64** + **#66** bind. **Anti-Hype:** Swarm §0a. No new planning unless new competitor surface. **Theoretical docs closed 2026-07-09** — execute via Master Map. Billing-first only on live payment fire. See [Apex Doctrine](AETHEL_APEX_DOCTRINE_AND_EXECUTION_FOCUS.md).

### Document Authority (this Roadmap is laws — not the task list)

| Need | Open |
|------|------|
| Laws / Ondas / Zero-MVP | **This Roadmap** |
| Find any binding MD | **Studio Index** § Complete specification map |
| What to code next | **Claude Execution Master Map** (current round) |
| What is already shipped | **Focus Execution Progress** |
| Prices / dual-pool | Plans Canonical + PAYG |
| **Do not follow** | `cloud-web-app/CLAUDE_MASTER_EXECUTION_PLAN_V7\|V8` and siblings — **SUPERSEDED** (Index § Historical) |

**Rule:** Do not invent new MDs to “align” Claude. Annotate Index / Master Map / Progress.

---

## Executive Verdict (Audit-Driven)

Aethel holds **~15,000+ LoC of AAA libraries** (motion matching, spatial audio occlusion, physics worker, Yjs collab, SaveManager, cutscene player, Nanite controllers) that are **not wired** to production paths (`game-loop.ts`, `simulation-tick.ts`, `runtime-main.ts`, viewport).

**Pattern:** excellent scaffolding → zero wiring → honest blockers in code (`native_kernel.rs`, `aaa-renderer-impl.ts`).

This roadmap binds **16 Supremacy Laws** across **Ondas A→M** and **Studio Pillars S1→S7**. No law is aspirational marketing — each cites current gap and target architecture.

**Cross-cutting constraints:**
- **Zero-MVP Doctrine** (below) — governs **all** waves; no reduced-scope shipping.
- **Law VIII** — cloud features are enhancements when online, never hard dependencies for core authoring.
- **Platform Reality Doctrine** (below) — hard ceilings on Web; AAA ceiling on Desktop + **Onda G** console targets.

---

## Zero-MVP Doctrine (Binding — All Waves)

**Philosophy:** Aethel does not ship "good enough" or "for later." If a feature cannot withstand **Onda G** stress and industry parity bars, it is **not done** — it does not ship.

**Rules:**

1. **Expressly forbidden:** MVP, "phase 1 stub," "basic version," "we'll fix in v2," placeholder runtimes presented as production, or any label that defers parity to an unprioritized backlog.
2. **Ondas A→F are not destinations** — they are **sequenced construction** toward **Onda G**, **H**, **I**, **J**, **K**, **L**, **M**, and **Studio S1→S7** (production-tool depth vs UE5). Every wire in A–F must be designed assuming:
   - Onda G **Test Pyramid** (E2E + fuzz + chaos) will hammer it.
   - Onda G **Netcode** (anti-cheat, lag compensation, dedicated authority) will stress it.
   - Onda G **AAA subsystems** (destruction, fluids, foliage, cinematic ACES) will share the same tick budget.
   - Onda G **Omnichannel deploy** (TRC/cert) will audit it.
3. **Definition of Done** for any Onda A–F deliverable requires **G + K + L + M + S-readiness** — see [Studio Index](AETHEL_STUDIO_SUPREMACY_INDEX.md) § S-readiness.
4. **Law III, IV, IX, XI** already forbid MVP language; this doctrine extends that ban to **entire engine surface area**.
5. **Platform Reality Doctrine still applies:** Web published builds never claim console/RT parity; **Onda G console targets = Desktop/Tauri export pipeline only.**

**Executor gate:** PR that introduces `// TODO`, `providerUnavailable` as user-facing success, mock artifacts (`success: true` + empty blob), proxy meshes as shipped characters, or "MVP" in ship docs → **automatic reject** (Law XI Critic + Law XVI + human review).

**Anti-Mock Doctrine (extends Zero-MVP):** Forbidden in ship path — capsule character proxies, MetaSounds play-logs only, empty PCG geometry, agent/API creative split, critic that warns without rejecting.

---

## The Sixteen Supremacy Laws (Binding)

### Law I — Main Thread Liberation (COOP/COEP + SAB)

**Mandate:** The engine MUST run under `crossOriginIsolated === true` with mandatory `SharedArrayBuffer` for simulation state. Zero-copy between ECS transforms and Rapier physics. **CPU culling on the main thread is forbidden** at scale — GPU-driven culling only.

| Today | Target |
|-------|--------|
| COOP/COEP on play/runtime/studio/ide (bk); marketing pages may omit | Headers on all game/studio surfaces (done for play/runtime) |
| SAB layout + playtest bridge + Atomics (bk); fallback-copy without COI | SoA ring buffers: transforms, velocities, GAS attributes |
| Rapier still mainly on main thread (`simulation-tick.ts`) | `physics-worker` + SAB double-buffer (not structured clone) |
| CPU frustum loop in `nanite-streaming-controller.ts:253` | `nanite-worker` or pure GPU indirect draw — **delete CPU hot path** |
| `JobSystem.schedule()` never called | ECS archetype partitions in worker pool |

**Wave ownership:** B (foundation) → C (scale) → D (polish at scale).

---

### Law II — LiveOps Native (God View)

**Mandate:** Published games emit events through a **first-party Telemetry Sink**. Spatial heatmaps (death, dwell time, funnel coordinates) aggregate via **Redis Streams / grid bins**. **Cloud Saves are first-class Prisma citizens** — not a disabled flag on `SaveManager`.

| Today | Target |
|-------|--------|
| Creator analytics → `AuditLog` only | Separate `PlayerEvent` ingest (or correct use of `AnalyticsEvent`) |
| `runtime-main.ts` — zero telemetry | `packages/engine/runtime-telemetry.ts` (IDE-free bundle) |
| Death heatmaps — zero impl | `{ event, x, y, z, sessionId }` → Redis → IDE 3D overlay |
| `cloudSyncEnabled: false`, no `CloudProvider` impl | `GameSave` model + R2 blob + cross-device sync API |
| In-memory funnel buffers | Durable queue (Redis Streams or Postgres OLAP) |

**Wave ownership:** F (full LiveOps) with **F.0 wiring fixes** in Onda A scope only for broken telemetry routes (no player pipeline yet).

---

### Law III — Physical Animation (Active Ragdoll + Euphoria Parity)

**Mandate:** Animation and Rapier forces blend in real time through **Active Ragdoll** with **Active Muscle Simulation** and **Dynamic Balance** — full parity with Euphoria-class engines. Characters recover from impacts, adjust posture under force, and maintain equilibrium while animating. Ragdoll spawn/despawn with continuous muscle-driven correction — **not** inert ragdolls, **not** additive pose overlays, **not** a separate physics-only or animation-only path.

| Today | Target |
|-------|--------|
| Zero ragdoll / active ragdoll matches | Per-bone Rapier capsules + spherical/revolute joints + muscle actuators |
| `physics-engine-real.ts` — no joint API | Joint builders mirrored in Rust `physics_kernel.rs` |
| `simulation-tick.ts:183` — rigid props only | Bone pose sync + active ragdoll ↔ `MotionMatchingSystem` blend |
| Euphoria / muscle sim — missing | **Muscle torque model** per joint group (tension, rest length, activation) |
| Hit reaction — missing | **Impulse → muscle activation → balance recovery** (not pose additive) |
| Dynamic balance — missing | **Balance controller** (CoM tracking, foot placement correction, fall recovery) |

**Technical targets (Onda E — full parity, no deferred scope):**
- **MuscleSimulationSystem:** PD/actuator layers driving joint targets against Rapier constraints each tick.
- **BalanceController:** inverted-pendulum / capture-point style equilibrium on uneven terrain (feeds IK + motion matching).
- **ActiveRagdollBlend:** continuous weight field ragdoll ↔ animation driven by impact magnitude and muscle fatigue — never binary snap.
- **HitReactionPipeline:** collision impulse → localized muscle flinch → global balance correction → motion-matching re-entry.
- **Desktop authority:** muscle + balance solvers in Rust (`physics_kernel` + dedicated module); TS/web receives SAB pose buffers (Law I).

**Prohibitions:**
- Shipping **inert ragdolls** (physics-only corpses with no muscle response) is **forbidden**.
- **Additive pose-only hit reaction** without muscle/balance simulation is **forbidden**.
- Labeling animation physics as "good enough" or deferring Euphoria parity to a later wave is **forbidden**.

**Wave ownership:** B (joint API + actuator hooks) → E (**full** muscle sim + balance + active ragdoll) → D (motion matching + terrain integration at scale).

---

### Law IV — Procedural Audio (MetaSounds Parity)

**Mandate:** **One** spatial audio authority based on **pure Web Audio API** with HRTF for 3D. End fragmentation across Howler, package `AudioManager`, and AI stacks. MetaSounds = compiled graph → `AudioNode` chain, not UI mockup.

| Today | Target |
|-------|--------|
| 4 parallel stacks unwired | Single `SpatialAudioSystem` authority + sample bridge |
| HRTF REAL but occlusão unwired (`spatial-audio-occlusion.ts`) | Rapier `castRay` batch @ 100ms + LPF |
| `SoundCueEditor.tsx` — play logs only | MetaSounds compiler (pattern: `ability-graph-compiler.ts`) |
| `game-loop.ts` — no audio | Listener + emitter tick in sim clock |
| No Rust desktop audio | `cpal` + `symphonia` for Tauri exports (Onda E+) |

**Wave ownership:** E (unification + MetaSounds runtime + occlusion wire). **Complements Law IX** (generative authoring feeds the same runtime).

---

### Law IX — Generative Audio Studio (Hybrid)

**Mandate:** Infinite audio diversity through a **hybrid pipeline** — never a single mode. **Classic** high-fidelity import coexists with **Generative** IDE integrations. All generated audio lands in the **same runtime** as Law IV (`SpatialAudioSystem` + MetaSounds compiler). **Financial protection is absolute:** Aethel never absorbs third-party generative API cost.
