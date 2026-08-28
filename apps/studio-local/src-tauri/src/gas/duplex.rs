//! S-27 Physics ↔ GAS product duplex — letter **gj** (doctrine #72/#73 P2 — GAS & Física).
//!
//! Application-layer coordinator coupling the kernel [`PhysicsWorld`] (Rapier,
//! [`UnifiedEntityId`] physics domain) with the GAS [`GasRollbackWorld`] (bare
//! u32 entities, gas domain). S-20d built the identity bridge; this module adds
//! the coupling *authority* — deterministic cross-domain binding plus two real,
//! measured coupling directions:
//!
//! - **GAS → Physics** ([`PhysicsGasDuplex::apply_knockback`]): records a
//!   `GasCommand::ApplyEffect` (Knockback status tag) AND buffers a
//!   `PhysicsWorld::record_input(InputCommand::SetVelocity)` — one call drives
//!   both domains. `SetVelocity` is mass-independent (hard-set linvel), so the
//!   kick is deterministic regardless of the torso's mass (unlike `Impulse`).
//! - **Physics → GAS** ([`PhysicsGasDuplex::resolve_physics_events`]): reads
//!   live body poses from the physics rollback journal (the journal is the
//!   position-readback authority — zero kernel edits, `BodyState` /
//!   `WorldCheckpoint` / `RollbackJournal` fields are all `pub`) and converts a
//!   kill-plane crossing into a `GasCommand::Damage`, deduplicated exactly once
//!   per crossing via the `fallen` bitmap.
//!
//! Contract / Zero-MVP / Law XI:
//! - The binding is a direct-index `Vec<UnifiedEntityId>` indexed by GAS Entity
//!   (lockstep spawn) — O(1) forward, no HashMap on the hot path. Reverse lookup
//!   is a fail-closed linear scan that rejects any non-Physics domain id.
//! - No JSON in the 60 Hz tick path: the coupled `step` is pure binary state.
//! - `PHYSICS_GAS_DUPLEX_READY` stays `false` (HELD) — this proves the coupling
//!   substrate and physics-side rollback convergence, NOT a product certificate.
//! - The joint cross-domain dual-world rollback (S-27) IS implemented via
//!   [`PhysicsGasDuplex::rollback_to`] (GAS + physics rewound to the same frame,
//!   GAS re-simulated forward) — the former "physics+GAS input-replay" slice
//!   (1.4al) is now closed by [`run_physics_gas_joint_replay_soak`], which also
//!   measures the coupled 60 Hz step budget (GAS_60HZ gate evidence).
//! - JSON appears only at the Tauri RPC boundary (probe / soak report).

use aethel_kernel_rust::physics_world::{
    EntityDomain, InputCommand, PhysicsWorld, PhysicsWorldConfig, SimulationClockConfig,
    SubstepMode, UnifiedEntityId,
};
use serde::Serialize;

use super::attributes::Entity;
use super::effects::{GameplayEffectDefinition, GameplayEffectDurationPolicy};
use super::rollback::{f32_to_q16, GasCommand, GasRollbackWorld};
use super::unified_id::GAS_UNIFIED_ID_READY;

/// Fail-closed product flag — coupling substrate proven, product duplex HELD.
pub const PHYSICS_GAS_DUPLEX_READY: bool = false;

/// Evidence identifier for the binding + fall-damage soak / probe.
pub const PHYSICS_GAS_DUPLEX_EVIDENCE_KIND: &str = "physics_gas_duplex_binding_and_fall_damage";

/// Spawn height (m) of every bound torso above the kill plane.
pub const SPAWN_Y: f32 = 3.0;
/// Kill plane height (m): a torso center below this takes fall damage.
pub const KILL_PLANE_Y: f32 = 0.0;
/// Fall damage dealt exactly once per crossing (Health 100 → 75 in the soak).
pub const FALL_DAMAGE: f32 = 25.0;
/// Coupled fixed step (seconds) used by the soak (60 Hz). Prefixed to avoid a
/// glob-re-export clash with `binary_ipc_tick::SOAK_DT` in `gas::*`.
pub const DUPLEX_SOAK_DT: f32 = 1.0 / 60.0;
/// Horizontal spacing (m) between bound torsos — distinct spawn positions so
/// overlapping capsule colliders can never corrupt the measured trajectories
/// with degenerate contact resolution at the spawn point.
pub const DUPLEX_SPAWN_STRIDE: f32 = 2.0;
/// Number of coupled duplex steps in the soak.
pub const SOAK_FRAMES: u32 = 40;
/// Physics journal frame the soak rolls back to for convergence evidence.
pub const ROLLBACK_FRAME: u64 = 20;
/// Status tag granted by the Knockback effect (GAS side).
pub const KNOCKBACK_TAG: &str = "Status.Knockback";
/// Effect id registered for the Knockback effect.
pub const KNOCKBACK_EFFECT_ID: &str = "Knockback";
/// Core attribute initialized for every bound entity.
pub const HEALTH_ATTRIBUTE: &str = "Health";

/// Physics fixed dt for the joint-replay soak's 1:1 lockstep clock (60 Hz × 1).
pub const JOINT_PHYSICS_FIXED_DT: f32 = 1.0 / 60.0;
/// Physics journal capacity (fixed-tick frames) for the 1:1 lockstep clock —
/// retains the full 120-frame soak plus rollback headroom (matches GAS's 256).
pub const JOINT_PHYSICS_JOURNAL_CAPACITY: usize = 256;
/// Number of coupled steps in the joint-replay soak (2 s @ 60 Hz).
pub const JOINT_REPLAY_FRAMES: u32 = 120;
/// Physics+GAS frame the joint-replay soak rewinds to (rollback evidence).
pub const JOINT_ROLLBACK_FRAME: u64 = 60;
/// Frame the joint-replay soak injects a GAS-only divergent Damage command.
pub const JOINT_DIVERGENCE_FRAME: u64 = 90;
/// Magnitude of the injected GAS-only divergent damage (Health delta on target 0).
pub const JOINT_DIVERGENT_DAMAGE: f32 = 10.0;
/// 60 Hz frame budget (ns) — the GAS_60HZ gate timing evidence.
pub const JOINT_60HZ_BUDGET_NS: u64 = 16_666_667;
/// Evidence identifier for the joint-replay soak.
pub const JOINT_REPLAY_EVIDENCE_KIND: &str = "physics_gas_joint_replay_rollback_and_60hz_budget";

/// The cross-domain coupling authority: one `PhysicsWorld` + one
/// `GasRollbackWorld` with a deterministic, direct-index binding between GAS
/// entities and physics body ids.
pub struct PhysicsGasDuplex {
    pub physics: PhysicsWorld,
    pub gas: GasRollbackWorld,
    /// Binding table — index == GAS Entity, value == physics `UnifiedEntityId`.
    /// Built by lockstep spawn, so it is a pure direct index (no HashMap).
    bindings: Vec<UnifiedEntityId>,
    /// Per-entity fall-damage dedup: true once the entity has crossed the plane.
    fallen: Vec<bool>,
    /// Catalog id of the registered Knockback effect (GAS side).
    knockback_catalog_id: u32,
}

impl PhysicsGasDuplex {
    /// Spawns `count` bound pairs: GAS entity (Health 100) ↔ physics torso at
    /// `SPAWN_Y`, in lockstep, and registers the Knockback effect. Uses the
    /// kernel default 120 Hz × 2 substep clock (each 1/60 s `step` completes 2
    /// physics fixed frames).
    pub fn new(count: Entity, attribute_names: &[&str]) -> Self {
        Self::spawn(count, attribute_names, PhysicsWorld::new())
    }

    /// Builds a duplex whose physics clock is locked to the GAS fixed tick at
    /// 60 Hz × 1 substep — a perfect 1:1 physics-frame ↔ GAS-frame lockstep.
    ///
    /// This is the joint-rollback constructor: with the kernel default clock
    /// (120 Hz × 2), each `step(1/60)` completes **2** physics frames, so 120
    /// coupled steps would outrun the 128-frame default journal and evict the
    /// frame-60 checkpoint. At 60 Hz × 1 each `step(1/60)` completes exactly 1
    /// physics frame — 120 steps → physics frames 1..=120 (ring 256 retains
    /// all) vs GAS frames 0..=119, so [`PhysicsGasDuplex::rollback_to`] can
    /// rewind both domains to the same frame and re-sim them in lockstep.
    pub fn with_60hz_lockstep(count: Entity, attribute_names: &[&str]) -> Self {
        let physics = PhysicsWorld::with_config(PhysicsWorldConfig {
            clock: SimulationClockConfig {
                fixed_dt: JOINT_PHYSICS_FIXED_DT,
                substeps: 1,
                ..SimulationClockConfig::default()
            },
            journal_capacity: JOINT_PHYSICS_JOURNAL_CAPACITY,
            substep_mode: SubstepMode::RapierOnly,
        });
        Self::spawn(count, attribute_names, physics)
    }

    /// Shared lockstep-spawn body: registers the Knockback effect and creates
    /// `count` GAS entity ↔ physics torso pairs at `SPAWN_Y`.
    fn spawn(count: Entity, attribute_names: &[&str], mut physics: PhysicsWorld) -> Self {
        let mut gas = GasRollbackWorld::new(attribute_names);
        let knockback_catalog_id = gas.register_effect(knockback_effect());
        let mut bindings = Vec::with_capacity(count as usize);
        let mut fallen = Vec::with_capacity(count as usize);
        for i in 0..count {
            let entity = gas
                .state
                .world
                .create_entity(&[(HEALTH_ATTRIBUTE, 100.0)]);
            debug_assert_eq!(entity, i, "lockstep spawn must keep binding indices aligned");
            let bound = physics.spawn_euphoria_torso_at([
                i as f32 * DUPLEX_SPAWN_STRIDE,
                SPAWN_Y,
                0.0,
            ]);
            bindings.push(bound);
            fallen.push(false);
        }
        Self {
            physics,
            gas,
            bindings,
            fallen,
            knockback_catalog_id,
        }
    }

    /// Number of bound pairs spawned.
    pub fn spawn_count(&self) -> Entity {
        self.bindings.len() as Entity
    }

    /// O(1) forward binding: GAS entity → physics `UnifiedEntityId`. Fails
    /// closed for out-of-range entities (None, never a false-positive handle).
    pub fn bound_physics_id(&self, entity: Entity) -> Option<UnifiedEntityId> {
        self.bindings.get(entity as usize).copied()
    }

    /// Fail-closed reverse binding: physics id → GAS entity. Rejects any id
    /// whose domain is not `Physics` and any physics id that is not bound.
    pub fn bound_entity(&self, physics_id: UnifiedEntityId) -> Option<Entity> {
        if physics_id.domain() != EntityDomain::Physics {
            return None;
        }
        self.bindings
            .iter()
            .position(|bound| *bound == physics_id)
            .map(|index| index as Entity)
    }

    /// Live GAS-side Health value for a bound entity (0.0 fail-closed).
    pub fn health(&self, entity: Entity) -> f32 {
        self.gas.state.world.current_value(entity, HEALTH_ATTRIBUTE)
    }

    /// Live body position read from the physics rollback journal — the journal
    /// is the position-readback authority (zero kernel edits: `BodyState` /
    /// `WorldCheckpoint` fields are `pub`). Returns `None` fail-closed.
    pub fn body_position(&self, entity: Entity) -> Option<[f32; 3]> {
        let bound = self.bound_physics_id(entity)?;
        let cp = self
            .physics
            .journal
            .get(self.physics.journal.latest_frame_id())?;
        for body in &cp.bodies {
            if body.unified_id_raw == bound.raw() {
                return Some(body.position);
            }
        }
        None
    }

    /// GAS → Physics: records the Knockback status effect on the GAS side AND
    /// buffers a deterministic physics input for the next fixed frame. Returns
    /// false (fail-closed, no-op) if `entity` is not bound.
    pub fn apply_knockback(&mut self, entity: Entity, command: InputCommand) -> bool {
        let bound = match self.bound_physics_id(entity) {
            Some(bound) => bound,
            None => return false,
        };
        self.gas.record_command(
            self.gas.current_frame(),
            GasCommand::ApplyEffect {
                target: entity,
                source: u32::MAX,
                catalog_id: self.knockback_catalog_id,
            },
        );
        self.physics.record_input(bound, command);
        true
    }

    /// Physics → GAS: scans the latest physics checkpoint in ascending entity
    /// order and converts every fresh kill-plane crossing into a
    /// `GasCommand::Damage`. The `fallen` bitmap guarantees exactly-once damage
    /// per crossing. Returns the number of new damage events recorded.
    pub fn resolve_physics_events(&mut self) -> usize {
        let Some(cp) = self
            .physics
            .journal
            .get(self.physics.journal.latest_frame_id())
        else {
            return 0;
        };
        let mut recorded = 0usize;
        for entity in 0..self.bindings.len() {
            if self.fallen[entity] {
                continue;
            }
            let bound = self.bindings[entity];
            let crossed = cp
                .bodies
                .iter()
                .any(|body| body.unified_id_raw == bound.raw() && body.position[1] < KILL_PLANE_Y);
            if crossed {
                self.fallen[entity] = true;
                self.gas.record_command(
                    self.gas.current_frame(),
                    GasCommand::Damage {
                        target: entity as Entity,
                        source: u32::MAX,
                        amount_q16: f32_to_q16(FALL_DAMAGE),
                    },
                );
                recorded += 1;
            }
        }
        recorded
    }

    /// Coupled fixed step: advance physics, resolve physics→GAS events, then
    /// advance the GAS world through its own fixed tick. Returns the number of
    /// fall-damage events resolved this step (deterministic, entity-ordered).
    pub fn step(&mut self, real_dt: f32) -> usize {
        self.physics.step(real_dt);
        let resolved = self.resolve_physics_events();
        self.gas.tick_fixed();
        resolved
    }

    /// Integrated fingerprint folding physics state ⊕ GAS state ⊕ every
    /// binding raw id — a wrong binding changes the digest, so the soak's
    /// independent-replay check proves cross-domain determinism, not just the
    /// two sub-worlds agreeing in isolation.
    pub fn integrated_fingerprint(&self) -> u64 {
        let mut h = self.physics.fingerprint();
        h = hash_mix(h, self.gas.state.fingerprint());
        for bound in &self.bindings {
            h = hash_mix(h, bound.raw());
        }
        h
    }

    /// Joint dual-world rollback (S-27): rewinds the physics journal (the
    /// kernel auto re-sims forward through its recorded input log) AND rewinds
    /// the GAS world to the same frame, then re-sims GAS forward to the physics
    /// journal's final frame. Both rollbacks must succeed (fail-closed), and
    /// the GAS re-sim must land exactly on the physics final frame.
    ///
    /// To *correct* a divergent command, remove it from `self.gas.log` FIRST
    /// (via `GasCommandLog::remove_command`), then call this — the internal GAS
    /// re-sim replays the corrected log and converges.
    pub fn rollback_to(&mut self, target_frame: u64) -> bool {
        let physics_ok = self.physics.rollback_to(target_frame);
        let gas_ok = self.gas.rollback_to(target_frame);
        if !physics_ok || !gas_ok {
            return false;
        }
        let final_frame = self.physics.journal.latest_frame_id();
        self.gas.resim_to(final_frame) == final_frame
    }
}

/// The Knockback effect: zero-modifier Duration effect that grants the
/// `Status.Knockback` tag for 2.0 s (verified against `GameplayEffectPool::apply`
/// — the Duration branch grants `granted_tags`, recompute is a no-op on empty
/// modifiers, and 2.0 s > the 0.667 s soak window so the tag stays live).
fn knockback_effect() -> GameplayEffectDefinition {
    GameplayEffectDefinition {
        id: KNOCKBACK_EFFECT_ID.to_string(),
        duration_policy: GameplayEffectDurationPolicy::Duration,
        duration_seconds: Some(2.0),
        period_seconds: None,
        modifiers: Vec::new(),
        granted_tags: vec![KNOCKBACK_TAG.to_string()],
        required_tags: Vec::new(),
        blocked_tags: Vec::new(),
        application_cue_tag: Some("Cue.Status.Knockback".to_string()),
        removal_cue_tag: None,
        periodic_cue_tag: None,
    }
}

fn hash_mix(mut h: u64, v: u64) -> u64 {
    h = h.wrapping_mul(0x9E37_79B9_7F4A_7C15).wrapping_add(v);
    h ^= h >> 29;
    h.wrapping_mul(0xBF58_476D_1CE4_E5B9) ^ (h >> 32)
}

/// Deterministic soak evidence for the physics ↔ GAS duplex. `green` is
/// computed from measured criteria; `ready` is the HELD product flag (false).
#[derive(Debug, Clone, Serialize)]
pub struct PhysicsGasDuplexSoakReport {
    /// Number of bound pairs in the soak.
    pub entities: u32,
    /// Number of coupled 60 Hz duplex steps executed.
    pub steps: u32,
    /// Entity 0 (no input) stayed above the kill plane with Health 100.
    pub control_stayed_above_plane: bool,
    /// Entity 1 (SetVelocity −12) crossed the plane and took exactly one 25 dmg.
    pub downward_crossed_and_damaged_once: bool,
    /// Entity 2 (SetVelocity +8 x) moved forward and stayed above the plane.
    pub horizontal_stayed_above_plane: bool,
    /// Entity 3 (SetVelocity +6) moved up and stayed above the plane.
    pub upward_stayed_above_plane: bool,
    /// The GAS-side Knockback tag was applied by the physical knockback.
    pub knockback_tag_applied: bool,
    /// Physics journal rollback to `ROLLBACK_FRAME` re-simulated to the exact
    /// same full-soak fingerprint (kernel-proven convergence).
    pub physics_rollback_converges: bool,
    /// Two independent duplexes fed the same inputs produced identical
    /// integrated fingerprints (cross-domain determinism).
    pub independent_replay_deterministic: bool,
    /// Conjunction of every measured criterion above.
    pub green: bool,
    /// Fail-closed product flag (HELD — substrate proven, certificate pending).
    pub ready: bool,
    /// Evidence identifier.
    pub evidence_kind: String,
}

/// Runs the deterministic duplex soak: 4 bound pairs over 40 coupled steps,
/// measuring both coupling directions, physics rollback convergence, and
/// independent replay determinism. Pure binary state — no JSON in the tick.
pub fn run_physics_gas_duplex_soak() -> PhysicsGasDuplexSoakReport {
    const COUNT: Entity = 4;
    let mut a = PhysicsGasDuplex::new(COUNT, &[HEALTH_ATTRIBUTE]);
    let mut b = PhysicsGasDuplex::new(COUNT, &[HEALTH_ATTRIBUTE]);

    // Entity 0 = untouched control. 1 downward, 2 horizontal, 3 upward.
    // SetVelocity is mass-independent — deterministic regardless of torso mass.
    a.apply_knockback(1, InputCommand::SetVelocity([0.0, -12.0, 0.0]));
    a.apply_knockback(2, InputCommand::SetVelocity([8.0, 0.0, 0.0]));
    a.apply_knockback(3, InputCommand::SetVelocity([0.0, 6.0, 0.0]));
    b.apply_knockback(1, InputCommand::SetVelocity([0.0, -12.0, 0.0]));
    b.apply_knockback(2, InputCommand::SetVelocity([8.0, 0.0, 0.0]));
    b.apply_knockback(3, InputCommand::SetVelocity([0.0, 6.0, 0.0]));

    let mut a_damage_events = 0usize;
    let mut b_damage_events = 0usize;
    for _ in 0..SOAK_FRAMES {
        a_damage_events += a.step(DUPLEX_SOAK_DT);
        b_damage_events += b.step(DUPLEX_SOAK_DT);
    }

    // Physics-side rollback convergence: roll the physics journal back to
    // ROLLBACK_FRAME and let the kernel re-sim forward through the recorded
    // input log — it must reproduce the exact full-soak fingerprint. (The full
    // cross-domain dual-world rollback slice remains explicitly HELD.)
    let final_fp = a.physics.fingerprint();
    let rollback_ok = a.physics.rollback_to(ROLLBACK_FRAME);
    let physics_rollback_converges = rollback_ok && a.physics.fingerprint() == final_fp;

    let control_stayed_above_plane = a
        .body_position(0)
        .is_some_and(|p| p[1] > KILL_PLANE_Y)
        && (a.health(0) - 100.0).abs() < f32::EPSILON;

    let downward_below_plane = a
        .body_position(1)
        .is_some_and(|p| p[1] < KILL_PLANE_Y);
    let downward_crossed_and_damaged_once = downward_below_plane
        && a_damage_events == 1
        && (a.health(1) - (100.0 - FALL_DAMAGE)).abs() < f32::EPSILON;

    let horizontal = a.body_position(2);
    let horizontal_stayed_above_plane = horizontal
        .is_some_and(|p| p[0] > 4.0 && p[1] > KILL_PLANE_Y)
        && (a.health(2) - 100.0).abs() < f32::EPSILON;

    let upward_stayed_above_plane = a
        .body_position(3)
        .is_some_and(|p| p[1] > SPAWN_Y)
        && (a.health(3) - 100.0).abs() < f32::EPSILON;

    let knockback_tag_applied = a.gas.state.world.has_tag(1, KNOCKBACK_TAG);

    let independent_replay_deterministic = a.integrated_fingerprint() == b.integrated_fingerprint()
        && a_damage_events == b_damage_events;

    let green = control_stayed_above_plane
        && downward_crossed_and_damaged_once
        && horizontal_stayed_above_plane
        && upward_stayed_above_plane
        && knockback_tag_applied
        && physics_rollback_converges
        && independent_replay_deterministic;

    PhysicsGasDuplexSoakReport {
        entities: COUNT,
        steps: SOAK_FRAMES,
        control_stayed_above_plane,
        downward_crossed_and_damaged_once,
        horizontal_stayed_above_plane,
        upward_stayed_above_plane,
        knockback_tag_applied,
        physics_rollback_converges,
        independent_replay_deterministic,
        green,
        ready: PHYSICS_GAS_DUPLEX_READY,
        evidence_kind: PHYSICS_GAS_DUPLEX_EVIDENCE_KIND.to_string(),
    }
}

/// Deterministic honesty probe — reportable without claiming product readiness.
#[derive(Debug, Clone, Serialize)]
pub struct PhysicsGasDuplexProbe {
    /// Fail-closed product flag (substrate proven, product duplex HELD).
    pub physics_gas_duplex_ready: bool,
    /// Sibling identity-bridge readiness — context for the duplex layer.
    pub gas_unified_id_ready: bool,
    /// Evidence identifier.
    pub evidence_kind: String,
}

/// Tauri-visible honesty probe for the physics ↔ GAS duplex.
#[tauri::command]
pub fn physics_gas_duplex_probe_cmd() -> PhysicsGasDuplexProbe {
    PhysicsGasDuplexProbe {
        physics_gas_duplex_ready: PHYSICS_GAS_DUPLEX_READY,
        gas_unified_id_ready: GAS_UNIFIED_ID_READY,
        evidence_kind: PHYSICS_GAS_DUPLEX_EVIDENCE_KIND.to_string(),
    }
}

/// Tauri-visible deterministic duplex soak command.
#[tauri::command]
pub fn run_physics_gas_duplex_soak_cmd() -> PhysicsGasDuplexSoakReport {
    run_physics_gas_duplex_soak()
}

/// Deterministic joint-replay evidence (S-27): physics + GAS rewound together
/// to the same frame and re-simulated forward — reproducing a divergent
/// fingerprint faithfully, then converging after the divergent command is
/// corrected. `green` is computed from measured criteria; `ready` is the HELD
/// product flag (false).
#[derive(Debug, Clone, Serialize)]
pub struct JointReplaySoakReport {
    /// Number of bound pairs in the soak.
    pub entities: u32,
    /// Number of coupled 60 Hz lockstep steps executed.
    pub steps: u32,
    /// The twins' integrated fingerprints matched before the divergence injected.
    pub twins_before_divergence: bool,
    /// The GAS-only divergent damage split the twins (health delta exact).
    pub divergence_observed: bool,
    /// A third independent world replayed the same inputs to the same
    /// integrated fingerprint (cross-world determinism under divergence).
    pub independent_replay_deterministic: bool,
    /// Joint rollback to `JOINT_ROLLBACK_FRAME` re-simulated forward to
    /// reproduce the divergent full-soak fingerprint exactly (faithful replay).
    pub faithful_replay: bool,
    /// The divergent command was located and removed from the GAS command log.
    pub divergent_command_removed: bool,
    /// Joint rollback succeeded after the divergent command was corrected.
    pub joint_rollback_ok: bool,
    /// Physics fingerprint converged to the non-divergent twin after correction.
    pub physics_converges: bool,
    /// GAS fingerprint converged to the non-divergent twin after correction.
    pub gas_converges: bool,
    /// Integrated fingerprint converged to the non-divergent twin after correction.
    pub integrated_converges: bool,
    /// Mean coupled-step time in ns (60 Hz budget evidence, not part of green).
    pub mean_step_ns: f64,
    /// `mean_step_ns` fits inside the 60 Hz frame budget.
    pub within_60hz_budget: bool,
    /// Conjunction of every measured deterministic criterion above.
    pub green: bool,
    /// Fail-closed product flag (HELD — substrate proven, certificate pending).
    pub ready: bool,
    /// Evidence identifier.
    pub evidence_kind: String,
}

/// Runs the deterministic joint-replay soak (S-27): two 60 Hz lockstep duplexes
/// run 120 coupled steps; a GAS-only divergent `Damage` is injected mid-run; the
/// divergent fingerprint is reproduced by a joint rollback (faithful replay),
/// then corrected (command removed + joint rollback) until it converges on the
/// non-divergent twin. The coupled-step time is measured as GAS_60HZ evidence.
pub fn run_physics_gas_joint_replay_soak() -> JointReplaySoakReport {
    const COUNT: Entity = 4;
    let mut authority = PhysicsGasDuplex::with_60hz_lockstep(COUNT, &[HEALTH_ATTRIBUTE]);
    let mut convergent = PhysicsGasDuplex::with_60hz_lockstep(COUNT, &[HEALTH_ATTRIBUTE]);
    let mut independent = PhysicsGasDuplex::with_60hz_lockstep(COUNT, &[HEALTH_ATTRIBUTE]);

    // Same physical knockback set on every twin (1 down, 2 horizontal, 3 up;
    // entity 0 is the untouched control). SetVelocity is mass-independent.
    authority.apply_knockback(1, InputCommand::SetVelocity([0.0, -12.0, 0.0]));
    authority.apply_knockback(2, InputCommand::SetVelocity([8.0, 0.0, 0.0]));
    authority.apply_knockback(3, InputCommand::SetVelocity([0.0, 6.0, 0.0]));
    convergent.apply_knockback(1, InputCommand::SetVelocity([0.0, -12.0, 0.0]));
    convergent.apply_knockback(2, InputCommand::SetVelocity([8.0, 0.0, 0.0]));
    convergent.apply_knockback(3, InputCommand::SetVelocity([0.0, 6.0, 0.0]));
    independent.apply_knockback(1, InputCommand::SetVelocity([0.0, -12.0, 0.0]));
    independent.apply_knockback(2, InputCommand::SetVelocity([8.0, 0.0, 0.0]));
    independent.apply_knockback(3, InputCommand::SetVelocity([0.0, 6.0, 0.0]));

    // GAS-only divergent damage on entity 0 (Health delta — exact magnitude).
    let divergent = GasCommand::Damage {
        target: 0,
        source: u32::MAX,
        amount_q16: f32_to_q16(JOINT_DIVERGENT_DAMAGE),
    };

    let mut twins_before_divergence = false;
    let mut total_ns: u128 = 0;
    for i in 0..JOINT_REPLAY_FRAMES {
        if u64::from(i) == JOINT_DIVERGENCE_FRAME {
            twins_before_divergence =
                authority.integrated_fingerprint() == convergent.integrated_fingerprint();
            authority.gas.record_command(JOINT_DIVERGENCE_FRAME, divergent);
        }
        // Measure only the authority's authoritative coupled step (one 60 Hz
        // frame) for the budget; the twin steps outside the timer.
        let t0 = std::time::Instant::now();
        authority.step(DUPLEX_SOAK_DT);
        let frame_ns = t0.elapsed().as_nanos();
        convergent.step(DUPLEX_SOAK_DT);
        total_ns += frame_ns;
    }
    // Independent twin replays the same divergence stream, untouched by any
    // rollback — proves cross-world determinism under divergence.
    for i in 0..JOINT_REPLAY_FRAMES {
        if u64::from(i) == JOINT_DIVERGENCE_FRAME {
            independent.gas.record_command(JOINT_DIVERGENCE_FRAME, divergent);
        }
        independent.step(DUPLEX_SOAK_DT);
    }

    let mean_step_ns = total_ns as f64 / f64::from(JOINT_REPLAY_FRAMES);
    let within_60hz_budget = mean_step_ns <= JOINT_60HZ_BUDGET_NS as f64;

    // Phase 1 evidence: the divergence is real and GAS-only. Robust to any
    // (deterministic) fall-damage on the control entity: the twins' health
    // delta is exactly the divergent magnitude, and the fingerprints diverge.
    let divergence_observed = (convergent.health(0) - authority.health(0)
        - JOINT_DIVERGENT_DAMAGE)
        .abs()
        < f32::EPSILON
        && authority.integrated_fingerprint() != convergent.integrated_fingerprint();

    let independent_replay_deterministic =
        independent.integrated_fingerprint() == authority.integrated_fingerprint();

    // Phase 2: faithful replay — joint rollback reproduces the divergent fp.
    let divergent_fp = authority.integrated_fingerprint();
    let faithful_replay = authority.rollback_to(JOINT_ROLLBACK_FRAME)
        && authority.integrated_fingerprint() == divergent_fp;

    // Phase 3: correction — remove the divergent command, then roll back jointly.
    let divergent_command_removed = authority
        .gas
        .log
        .remove_command(JOINT_DIVERGENCE_FRAME, &divergent);
    let joint_rollback_ok = authority.rollback_to(JOINT_ROLLBACK_FRAME);
    let physics_converges = authority.physics.fingerprint() == convergent.physics.fingerprint();
    let gas_converges = authority.gas.state.fingerprint() == convergent.gas.state.fingerprint();
    let integrated_converges =
        authority.integrated_fingerprint() == convergent.integrated_fingerprint();

    let green = twins_before_divergence
        && divergence_observed
        && independent_replay_deterministic
        && faithful_replay
        && divergent_command_removed
        && joint_rollback_ok
        && physics_converges
        && gas_converges
        && integrated_converges;

    JointReplaySoakReport {
        entities: COUNT,
        steps: JOINT_REPLAY_FRAMES,
        twins_before_divergence,
        divergence_observed,
        independent_replay_deterministic,
        faithful_replay,
        divergent_command_removed,
        joint_rollback_ok,
        physics_converges,
        gas_converges,
        integrated_converges,
        mean_step_ns,
        within_60hz_budget,
        green,
        ready: PHYSICS_GAS_DUPLEX_READY,
        evidence_kind: JOINT_REPLAY_EVIDENCE_KIND.to_string(),
    }
}

/// Tauri-visible deterministic joint-replay soak command.
#[tauri::command]
pub fn run_physics_gas_joint_replay_soak_cmd() -> JointReplaySoakReport {
    run_physics_gas_joint_replay_soak()
}

#[cfg(test)]
mod tests {
    // NOTE: glob `use super::*` does NOT re-export the parent's private `use`
    // bindings — the kernel types must be re-imported explicitly here.
    use aethel_kernel_rust::physics_world::{EntityDomain, InputCommand, UnifiedEntityId};

    use super::*;

    #[test]
    fn binding_roundtrips_losslessly_and_fails_closed() {
        let duplex = PhysicsGasDuplex::new(3, &[HEALTH_ATTRIBUTE]);
        assert_eq!(duplex.spawn_count(), 3);
        for entity in 0..3u32 {
            let bound = duplex.bound_physics_id(entity).expect("bound pair exists");
            assert_eq!(bound.domain(), EntityDomain::Physics);
            assert_eq!(duplex.bound_entity(bound), Some(entity));
        }
        // Out-of-range GAS entity fails closed (never a false-positive handle).
        assert!(duplex.bound_physics_id(3).is_none());
        // Foreign-domain ids fail closed on the reverse lookup.
        assert!(duplex.bound_entity(UnifiedEntityId::from_gas(1)).is_none());
        assert!(duplex.bound_entity(UnifiedEntityId::from_world(1)).is_none());
        // A raw Physics-domain id that is not bound also fails closed.
        // NOTE: raw 0 is the legitimately-bound first Rapier body handle
        // (Physics domain 0<<62 | space 0), so an unbound physics-space id is
        // used here to exercise the fail-closed scan.
        assert!(duplex
            .bound_entity(UnifiedEntityId::from_parts(EntityDomain::Physics, 42))
            .is_none());
    }

    #[test]
    fn knockback_gas_effect_and_physics_velocity_both_apply() {
        let mut duplex = PhysicsGasDuplex::new(2, &[HEALTH_ATTRIBUTE]);
        // One call drives both domains: GAS ApplyEffect + physics SetVelocity.
        assert!(duplex.apply_knockback(1, InputCommand::SetVelocity([0.0, -12.0, 0.0])));
        for _ in 0..SOAK_FRAMES {
            duplex.step(DUPLEX_SOAK_DT);
        }
        // GAS side: the Knockback status effect granted its tag.
        assert!(duplex.gas.state.world.has_tag(1, KNOCKBACK_TAG));
        // Physics side: the SetVelocity kick actually moved the body down
        // (mass-independent — no torso-mass tuning involved).
        let pos = duplex.body_position(1).expect("journal position");
        assert!(pos[1] < KILL_PLANE_Y);
    }

    #[test]
    fn fall_damage_applies_exactly_once() {
        let mut duplex = PhysicsGasDuplex::new(2, &[HEALTH_ATTRIBUTE]);
        duplex.apply_knockback(1, InputCommand::SetVelocity([0.0, -12.0, 0.0]));
        let mut total = 0usize;
        for _ in 0..SOAK_FRAMES {
            total += duplex.step(DUPLEX_SOAK_DT);
        }
        // Exactly one damage event for the single kill-plane crossing…
        assert_eq!(total, 1);
        // …and the GAS attribute shows Health 100 → 75 exactly.
        assert!((duplex.health(1) - (100.0 - FALL_DAMAGE)).abs() < f32::EPSILON);
    }

    #[test]
    fn control_entity_unaffected() {
        let mut duplex = PhysicsGasDuplex::new(1, &[HEALTH_ATTRIBUTE]);
        for _ in 0..SOAK_FRAMES {
            duplex.step(DUPLEX_SOAK_DT);
        }
        let pos = duplex.body_position(0).expect("journal position");
        assert!(pos[1] > KILL_PLANE_Y);
        assert!((duplex.health(0) - 100.0).abs() < f32::EPSILON);
    }

    #[test]
    fn soak_green_and_ready_held() {
        let report = run_physics_gas_duplex_soak();
        assert!(report.green, "duplex soak must be green: {report:?}");
        assert!(!report.ready, "product duplex certificate must stay HELD");
        assert_eq!(report.entities, 4);
        assert_eq!(report.steps, SOAK_FRAMES);
    }

    #[test]
    fn probe_matches_ready_false() {
        let probe = physics_gas_duplex_probe_cmd();
        assert!(!probe.physics_gas_duplex_ready);
        assert!(!probe.gas_unified_id_ready);
        assert_eq!(probe.evidence_kind, PHYSICS_GAS_DUPLEX_EVIDENCE_KIND);
    }

    #[test]
    fn joint_replay_rollback_converges_after_divergent_input() {
        let report = run_physics_gas_joint_replay_soak();
        assert!(
            report.twins_before_divergence,
            "twins must match before the divergence: {report:?}"
        );
        assert!(
            report.divergence_observed,
            "GAS-only divergent damage must split the twins: {report:?}"
        );
        assert!(
            report.independent_replay_deterministic,
            "independent replay must be deterministic under divergence: {report:?}"
        );
        assert!(
            report.faithful_replay,
            "joint rollback must reproduce the divergent fingerprint: {report:?}"
        );
        assert!(
            report.divergent_command_removed,
            "divergent command must be locatable and removable: {report:?}"
        );
        assert!(
            report.joint_rollback_ok,
            "joint rollback after correction must succeed: {report:?}"
        );
        assert!(
            report.physics_converges,
            "physics must converge on the non-divergent twin: {report:?}"
        );
        assert!(
            report.gas_converges,
            "GAS must converge on the non-divergent twin: {report:?}"
        );
        assert!(
            report.integrated_converges,
            "integrated fingerprint must converge: {report:?}"
        );
        assert!(report.green, "joint-replay soak must be green: {report:?}");
        assert!(!report.ready, "product certificate must stay HELD");
        assert_eq!(report.entities, 4);
        assert_eq!(report.steps, JOINT_REPLAY_FRAMES);
        assert_eq!(report.evidence_kind, JOINT_REPLAY_EVIDENCE_KIND);
    }

    #[test]
    fn joint_replay_within_60hz_budget() {
        let report = run_physics_gas_joint_replay_soak();
        assert!(
            report.mean_step_ns < JOINT_60HZ_BUDGET_NS as f64,
            "coupled 60 Hz step must fit its frame budget: {report:?}"
        );
        assert!(report.within_60hz_budget, "{report:?}");
    }
}
