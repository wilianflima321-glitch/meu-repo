//! S-17..S-22 Physics World Authority (doctrine #73 — Kernel Physics Supremacy).
//!
//! The crate previously owned real soak-proven solvers and a Rapier kernel that
//! were **soak-only, unwired to a live world**. This module is the authority
//! spine that unifies them:
//!
//! - **S-17 PhysicsWorld Authority** — ONE world owning the Rapier + Euphoria
//!   [`PhysicsKernel`](crate::physics_kernel::PhysicsKernel), a
//!   [`SimulationClock`], a [`RollbackJournal`] and a deterministic input log.
//! - **S-19 SimulationClock** — fixed-timestep accumulator + substeps (default
//!   120 Hz base tick × 2 = **240 Hz** effective substep rate) + render
//!   interpolation alpha + spiral-of-death protection + island-sleeping group
//!   configuration via Rapier's `IntegrationParameters::min_island_size`.
//! - **S-20 UnifiedEntityId** — a single domain-tagged identity space across
//!   the THREE pre-existing entity-id spaces (Rapier `RigidBodyHandle` / GAS
//!   u32 / WorldSoA u64), lossless round-trippable to each native handle.
//! - **S-22 Deterministic Rollback World** — real-Rapier input-replay rollback:
//!   per-fixed-tick body-state checkpoints (transform+velocity capture/restore,
//!   no serialization), a deterministic ordered input log, and re-simulation
//!   after rollback that **reproduces the identical fingerprint**.
//!
//! **Fail-closed (never claimed here):** `chaos_physics_aaa_ready=false`,
//! `ggpo_live_ready=false`, `euphoria_full_aaa_ready=false`,
//! `physics_gas_duplex_ready=false` (the product GAS↔physics duplex is only
//! flipped after a real product duplex soak, per doctrine). No JSON in the
//! 60 Hz path, no per-object bind groups, no invented readiness.

use nalgebra::{Quaternion, UnitQuaternion, Vector3};
use rapier3d::prelude::*;
use serde::{Deserialize, Serialize};
use std::time::Instant;

use crate::euphoria_balance_controller::{
    EuphoriaBalanceConfig, EuphoriaBalanceSoA, EUPHORIA_TORSO_DEFAULT_MASS,
};
use crate::physics_kernel::PhysicsKernel;

// ============================================================================
// S-20 — UnifiedEntityId
// ============================================================================

/// The three pre-existing entity-id spaces the kernel must unify.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[repr(u8)]
pub enum EntityDomain {
    /// Rapier rigid-body handle space (`RigidBodyHandle`).
    Physics = 0,
    /// GAS attribute entity space (u32).
    Gas = 1,
    /// WorldSoA `EntityId` space (u64).
    World = 2,
}

/// Number of bits used to tag the domain.
const DOMAIN_BITS: u64 = 2;
const DOMAIN_MASK: u64 = (1 << DOMAIN_BITS) - 1;
/// Number of bits available for the space-local id.
const SPACE_ID_BITS: u64 = 64 - DOMAIN_BITS;
const SPACE_ID_MASK: u64 = (1 << SPACE_ID_BITS) - 1;

/// A unified entity identity across all three spaces.
///
/// The domain tag occupies the upper `DOMAIN_BITS`; the space-local id occupies
/// the lower `SPACE_ID_BITS`. Because the tag is embedded, ids from different
/// spaces never collide while remaining a pure, allocation-free function of
/// each native handle — no registry HashMap is needed on the hot path.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct UnifiedEntityId(u64);

impl UnifiedEntityId {
    /// Builds an id from a domain tag and a space-local id.
    pub const fn from_parts(domain: EntityDomain, space_id: u64) -> Self {
        let d = domain as u64 & DOMAIN_MASK;
        let s = space_id & SPACE_ID_MASK;
        Self((d << SPACE_ID_BITS) | s)
    }

    /// Reconstructs an id from its raw packed representation.
    pub const fn from_raw(raw: u64) -> Self {
        Self(raw)
    }

    /// The domain this id belongs to.
    pub const fn domain(self) -> EntityDomain {
        match (self.0 >> SPACE_ID_BITS) & DOMAIN_MASK {
            1 => EntityDomain::Gas,
            2 => EntityDomain::World,
            _ => EntityDomain::Physics,
        }
    }

    /// The raw domain tag as a `u64` — const-comparable for hot-path domain
    /// checks without requiring the derived (non-const) `PartialEq`.
    pub const fn domain_raw(self) -> u64 {
        (self.0 >> SPACE_ID_BITS) & DOMAIN_MASK
    }

    /// The space-local id (all lower `SPACE_ID_BITS` bits).
    pub const fn space_id(self) -> u64 {
        self.0 & SPACE_ID_MASK
    }

    /// The raw packed representation (for binary IPC / fingerprinting).
    pub const fn raw(self) -> u64 {
        self.0
    }

    /// Builds a `Physics`-domain id from a Rapier handle, packing both the
    /// arena index and the generation so the id stays stable across handle
    /// slot reuse.
    pub fn from_rapier(handle: RigidBodyHandle) -> Self {
        let (index, generation) = handle.into_raw_parts();
        let space = ((generation as u64) << 32) | (index as u64);
        Self::from_parts(EntityDomain::Physics, space)
    }

    /// Lossless conversion back to a Rapier handle, or `None` if the domain
    /// is not `Physics`.
    pub fn as_rapier(self) -> Option<RigidBodyHandle> {
        if self.domain() != EntityDomain::Physics {
            return None;
        }
        let s = self.space_id();
        let generation = (s >> 32) as u32;
        let index = (s & 0xFFFF_FFFF) as u32;
        Some(RigidBodyHandle::from_raw_parts(index, generation))
    }

    /// Builds a `Gas`-domain id from a GAS entity (u32).
    pub const fn from_gas(entity: u32) -> Self {
        Self::from_parts(EntityDomain::Gas, entity as u64)
    }

    /// Lossless conversion back to a GAS entity, or `None` if not `Gas`.
    pub const fn as_gas(self) -> Option<u32> {
        if self.domain_raw() != EntityDomain::Gas as u64 {
            None
        } else {
            Some(self.space_id() as u32)
        }
    }

    /// Builds a `World`-domain id from a WorldSoA entity.
    pub const fn from_world(entity: u64) -> Self {
        Self::from_parts(EntityDomain::World, entity)
    }

    /// Lossless conversion back to a WorldSoA entity, or `None` if not `World`.
    pub const fn as_world(self) -> Option<u64> {
        if self.domain_raw() != EntityDomain::World as u64 {
            None
        } else {
            Some(self.space_id())
        }
    }
}

// ============================================================================
// S-19 — SimulationClock
// ============================================================================

/// Default base tick: 120 Hz.
pub const DEFAULT_FIXED_DT: f32 = 1.0 / 120.0;
/// Default substep subdivision → 240 Hz effective solver rate.
pub const DEFAULT_SUBSTEPS: u32 = 2;
/// Default clamp for a single real frame (50 ms) — spiral-of-death protection.
pub const DEFAULT_MAX_FRAME_DT: f32 = 1.0 / 20.0;
/// Default hard cap on substeps executed per real frame.
pub const DEFAULT_MAX_SUBSTEPS_PER_FRAME: u32 = 8;
/// Rapier's default minimum dynamic bodies per active island.
pub const DEFAULT_MIN_ISLAND_SIZE: usize = 128;

/// Configuration for a [`SimulationClock`].
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SimulationClockConfig {
    /// Base tick length in seconds (fixed timestep).
    pub fixed_dt: f32,
    /// Number of solver substeps per base tick.
    pub substeps: u32,
    /// Maximum real `dt` accepted per frame before clamping.
    pub max_frame_dt: f32,
    /// Maximum number of substeps executed per real frame.
    pub max_substeps_per_frame: u32,
    /// Island-sleeping grouping: minimum dynamic bodies per active island
    /// (wired into Rapier's `IntegrationParameters::min_island_size`).
    pub min_island_size: usize,
}

impl Default for SimulationClockConfig {
    fn default() -> Self {
        Self {
            fixed_dt: DEFAULT_FIXED_DT,
            substeps: DEFAULT_SUBSTEPS,
            max_frame_dt: DEFAULT_MAX_FRAME_DT,
            max_substeps_per_frame: DEFAULT_MAX_SUBSTEPS_PER_FRAME,
            min_island_size: DEFAULT_MIN_ISLAND_SIZE,
        }
    }
}

/// Fixed-timestep simulation clock (S-19).
///
/// Consumes variable real `dt`, accumulates it, and emits a deterministic
/// number of fixed solver substeps. Exposes the render interpolation alpha
/// between the previous and current state for 240 Hz visual interpolation.
/// Never lets a backlog of unconsumed time grow unbounded (spiral protection).
pub struct SimulationClock {
    cfg: SimulationClockConfig,
    accumulator: f32,
    total_time: f64,
    tick_count: u64,
    last_frame_real_dt: f32,
    substeps_this_frame: u32,
    interpolation_alpha: f32,
}

impl SimulationClock {
    /// Builds a clock from a configuration.
    pub fn new(cfg: SimulationClockConfig) -> Self {
        Self {
            cfg,
            accumulator: 0.0,
            total_time: 0.0,
            tick_count: 0,
            last_frame_real_dt: 0.0,
            substeps_this_frame: 0,
            interpolation_alpha: 0.0,
        }
    }

    /// Length of a single solver substep in seconds.
    pub fn substep_dt(&self) -> f32 {
        self.cfg.fixed_dt / self.cfg.substeps.max(1) as f32
    }

    /// Length of a base tick in seconds.
    pub fn fixed_dt(&self) -> f32 {
        self.cfg.fixed_dt
    }

    /// The effective solver rate in Hz (e.g. 240.0 for 120 Hz × 2 substeps).
    pub fn effective_hz(&self) -> f32 {
        let sdt = self.substep_dt();
        if sdt > 0.0 {
            1.0 / sdt
        } else {
            0.0
        }
    }

    /// Substep subdivision count.
    pub fn substeps(&self) -> u32 {
        self.cfg.substeps.max(1)
    }

    /// Total simulated time (sum of executed substeps), seconds.
    pub fn total_time(&self) -> f64 {
        self.total_time
    }

    /// Number of solver substeps executed so far.
    pub fn tick_count(&self) -> u64 {
        self.tick_count
    }

    /// Render interpolation alpha in `[0, 1]` between previous and current state.
    pub fn interpolation_alpha(&self) -> f32 {
        self.interpolation_alpha
    }

    /// The (clamped) real `dt` of the most recent frame.
    pub fn last_frame_real_dt(&self) -> f32 {
        self.last_frame_real_dt
    }

    /// How many substeps were scheduled by the most recent [`SimulationClock::frame_tick`].
    pub fn substeps_this_frame(&self) -> u32 {
        self.substeps_this_frame
    }

    /// Unconsumed time still buffered in the accumulator (seconds).
    pub fn accumulator(&self) -> f32 {
        self.accumulator
    }

    /// Consumes a real frame `dt` and returns how many fixed substeps the
    /// caller must execute. Clamps the input to `max_frame_dt`, drops any
    /// surplus beyond `max_substeps_per_frame` (spiral-of-death protection).
    pub fn frame_tick(&mut self, real_dt: f32) -> u32 {
        let clamped = real_dt.min(self.cfg.max_frame_dt);
        self.last_frame_real_dt = clamped;
        self.accumulator += clamped;

        let sdt = self.substep_dt();
        let mut steps = 0u32;
        while self.accumulator >= sdt && steps < self.cfg.max_substeps_per_frame {
            self.accumulator -= sdt;
            steps += 1;
        }
        // Spiral protection: never carry an unbounded time backlog.
        if steps == self.cfg.max_substeps_per_frame {
            self.accumulator = 0.0;
        }
        self.substeps_this_frame = steps;
        steps
    }

    /// Bookkeeping to call after each executed solver substep.
    pub fn on_substep_executed(&mut self) {
        self.tick_count += 1;
        self.total_time += self.substep_dt() as f64;
    }

    /// Called after all substeps of a real frame are executed; returns the
    /// render interpolation alpha in `[0, 1]`.
    pub fn finish_frame(&mut self) -> f32 {
        let sdt = self.substep_dt();
        self.interpolation_alpha = if sdt > 0.0 {
            (self.accumulator / sdt).clamp(0.0, 1.0)
        } else {
            0.0
        };
        self.interpolation_alpha
    }

    /// Rewinds the clock to the start of `frame_id` (used by rollback re-sim).
    pub fn rewind_to_frame(&mut self, frame_id: u64) {
        let substeps = u64::from(self.substeps());
        self.tick_count = frame_id * substeps;
        self.total_time = frame_id as f64 * self.cfg.fixed_dt as f64;
        self.accumulator = 0.0;
        self.interpolation_alpha = 0.0;
    }

    /// The base-tick frame currently being simulated.
    pub fn current_frame(&self) -> u64 {
        self.tick_count / u64::from(self.substeps())
    }

    /// Writes the fixed-timestep solver parameters into Rapier's
    /// `IntegrationParameters` (dt + island-sleeping grouping).
    pub fn configure_integration(&self, params: &mut IntegrationParameters) {
        params.dt = self.substep_dt();
        params.min_island_size = self.cfg.min_island_size;
    }
}

// ============================================================================
// S-22 — deterministic rollback primitives
// ============================================================================

/// Fingerprint seed ("phyw").
const PW_FP_SEED: u64 = 0x7068_7977;
/// Default journal capacity in fixed-tick frames (~1.07 s @ 120 Hz).
pub const DEFAULT_JOURNAL_CAPACITY: usize = 128;

/// A single rigid body's transform+velocity state at a checkpoint.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BodyState {
    pub unified_id_raw: u64,
    pub position: [f32; 3],
    /// Quaternion `x,y,z,w` (w canonicalized non-negative for sign-stability).
    pub rotation: [f32; 4],
    pub linvel: [f32; 3],
    pub angvel: [f32; 3],
}

/// A full-world checkpoint at a fixed-tick frame boundary.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldCheckpoint {
    pub frame_id: u64,
    pub bodies: Vec<BodyState>,
    pub fingerprint: u64,
}

/// Ring buffer of world checkpoints for rollback (S-22).
pub struct RollbackJournal {
    capacity: usize,
    ring: Vec<Option<WorldCheckpoint>>,
    latest_frame_id: u64,
    latest_fingerprint: u64,
}

impl RollbackJournal {
    /// Builds an empty journal with the given ring capacity (min 2).
    pub fn new(capacity: usize) -> Self {
        let cap = capacity.max(2);
        Self {
            capacity: cap,
            ring: vec![None; cap],
            latest_frame_id: 0,
            latest_fingerprint: 0,
        }
    }

    /// Ring capacity in frames.
    pub fn capacity(&self) -> usize {
        self.capacity
    }

    /// Highest frame id currently stored.
    pub fn latest_frame_id(&self) -> u64 {
        self.latest_frame_id
    }

    /// Fingerprint of the most recently stored checkpoint.
    pub fn latest_fingerprint(&self) -> u64 {
        self.latest_fingerprint
    }

    /// Stores a checkpoint, evicting the oldest slot when full.
    pub fn push(&mut self, checkpoint: WorldCheckpoint) {
        self.latest_frame_id = checkpoint.frame_id;
        self.latest_fingerprint = checkpoint.fingerprint;
        let idx = (checkpoint.frame_id % self.capacity as u64) as usize;
        self.ring[idx] = Some(checkpoint);
    }

    /// Fetches a checkpoint by exact frame id (validates the slot generation).
    pub fn get(&self, frame_id: u64) -> Option<&WorldCheckpoint> {
        let idx = (frame_id % self.capacity as u64) as usize;
        match &self.ring[idx] {
            Some(cp) if cp.frame_id == frame_id => Some(cp),
            _ => None,
        }
    }

    /// Clones a checkpoint for rollback restore, or `None` if not present.
    pub fn rollback_to(&self, frame_id: u64) -> Option<WorldCheckpoint> {
        self.get(frame_id).cloned()
    }

    /// Removes every checkpoint strictly after `frame_id` (they will be
    /// re-captured by the rollback re-simulation).
    pub fn clear_after(&mut self, frame_id: u64) {
        let mut max_kept = frame_id;
        for slot in self.ring.iter_mut() {
            if let Some(cp) = slot.as_ref() {
                if cp.frame_id > frame_id {
                    *slot = None;
                } else if cp.frame_id > max_kept {
                    max_kept = cp.frame_id;
                }
            }
        }
        self.latest_frame_id = max_kept;
        if let Some(cp) = self.get(max_kept) {
            self.latest_fingerprint = cp.fingerprint;
        }
    }
}

/// Deterministic one-shot input command applied at a fixed-tick boundary.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum InputCommand {
    /// Linear impulse applied to the body (wakes it).
    Impulse([f32; 3]),
    /// Torque impulse applied to the body (wakes it).
    TorqueImpulse([f32; 3]),
    /// Hard-set the linear velocity (wakes it).
    SetVelocity([f32; 3]),
}

impl InputCommand {
    /// Stable tag used for deterministic ordering within a frame.
    pub const fn tag(self) -> u8 {
        match self {
            InputCommand::Impulse(_) => 0,
            InputCommand::TorqueImpulse(_) => 1,
            InputCommand::SetVelocity(_) => 2,
        }
    }
}

/// A buffered input targeting a specific fixed-tick frame.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldInput {
    pub target_frame: u64,
    pub entity: UnifiedEntityId,
    pub command: InputCommand,
}

// ============================================================================
// S-17 — PhysicsWorld Authority
// ============================================================================

/// Which substep driver the world uses for each fixed solver step.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SubstepMode {
    /// Pure Rapier fixed-dt step (strictly deterministic, default).
    RapierOnly,
    /// Rapier + Euphoria PD controller torque pass.
    Euphoria,
}

/// Configuration for a [`PhysicsWorld`].
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsWorldConfig {
    pub clock: SimulationClockConfig,
    pub journal_capacity: usize,
    pub substep_mode: SubstepMode,
}

impl Default for PhysicsWorldConfig {
    fn default() -> Self {
        Self {
            clock: SimulationClockConfig::default(),
            journal_capacity: DEFAULT_JOURNAL_CAPACITY,
            substep_mode: SubstepMode::RapierOnly,
        }
    }
}

/// The unified physics authority (S-17).
///
/// Owns the Rapier + Euphoria [`PhysicsKernel`], the [`SimulationClock`], the
/// [`RollbackJournal`] and the deterministic input log, and drives the whole
/// world under a single fixed-timestep cadence.
pub struct PhysicsWorld {
    pub kernel: PhysicsKernel,
    pub clock: SimulationClock,
    pub journal: RollbackJournal,
    input_log: Vec<WorldInput>,
    substep_mode: SubstepMode,
    /// Live capture-point balance controller (Euphoria path only). Kept as a
    /// zero-alloc SoA mapped 1:1 to spawned Euphoria torsos via
    /// `balance_links`; the `RapierOnly` default path never touches it.
    balance: EuphoriaBalanceSoA,
    /// Maps a spawned torso's Rapier handle to its balance-agent index.
    balance_links: Vec<(RigidBodyHandle, u32)>,
}

impl Default for PhysicsWorld {
    fn default() -> Self {
        Self::new()
    }
}

impl PhysicsWorld {
    /// Builds a world with default configuration (120 Hz × 2 = 240 Hz, ring 128).
    pub fn new() -> Self {
        Self::with_config(PhysicsWorldConfig::default())
    }

    /// Builds a world from an explicit configuration.
    pub fn with_config(cfg: PhysicsWorldConfig) -> Self {
        let clock = SimulationClock::new(cfg.clock);
        let mut world = Self {
            kernel: PhysicsKernel::new(),
            clock,
            journal: RollbackJournal::new(cfg.journal_capacity),
            input_log: Vec::new(),
            substep_mode: cfg.substep_mode,
            balance: EuphoriaBalanceSoA::new(&EuphoriaBalanceConfig::default())
                .expect("default euphoria balance config is provably valid"),
            balance_links: Vec::new(),
        };
        // Authoritative initial checkpoint at frame 0.
        world.capture_checkpoint_at(0);
        world
    }

    /// The substep driver in use.
    pub fn substep_mode(&self) -> SubstepMode {
        self.substep_mode
    }

    /// Switches the substep driver (affects subsequent substeps only).
    pub fn set_substep_mode(&mut self, mode: SubstepMode) {
        self.substep_mode = mode;
    }

    /// Spawns a physical torso linked to the Euphoria Active Ragdoll Balancer at
    /// `(0, pos_y, 0)`; returns its unified id (S-20).
    pub fn spawn_euphoria_torso(&mut self, pos_y: f32) -> UnifiedEntityId {
        self.spawn_euphoria_torso_at([0.0, pos_y, 0.0])
    }

    /// Spawns a physical torso linked to the Euphoria Active Ragdoll Balancer at
    /// an explicit translation; returns its unified id (S-20).
    pub fn spawn_euphoria_torso_at(&mut self, translation: [f32; 3]) -> UnifiedEntityId {
        let handle = self.kernel.spawn_euphoria_torso_at(translation);
        // Link the new torso to a capture-point balance agent. Best-effort
        // within the SoA capacity: the physical torso spawns regardless, so a
        // world that exceeds `max_agents` fails closed without panicking.
        let com_height = translation[1].max(0.1);
        if let Ok(idx) = self.balance.add_agent(
            translation,
            [0.0, 0.0, 0.0],
            EUPHORIA_TORSO_DEFAULT_MASS,
            com_height,
        ) {
            self.balance_links.push((handle, idx));
        }
        UnifiedEntityId::from_rapier(handle)
    }

    /// Buffers an input to take effect at the next fixed-tick boundary and
    /// returns the frame it will be applied on.
    pub fn record_input(&mut self, entity: UnifiedEntityId, command: InputCommand) -> u64 {
        let target = self.clock.current_frame() + 1;
        self.input_log.push(WorldInput {
            target_frame: target,
            entity,
            command,
        });
        target
    }

    /// Advances the world by a real frame `dt`, executing the scheduled fixed
    /// substeps, applying buffered inputs at frame boundaries, and capturing a
    /// rollback checkpoint per completed fixed tick.
    pub fn step(&mut self, real_dt: f32) {
        let steps = self.clock.frame_tick(real_dt);
        let substeps = u64::from(self.clock.substeps());
        // S-22: `with_config` captures frame 0 before any body exists. Once the
        // caller has spawned bodies, re-capture frame 0 on the very first step
        // (before any input applies) so `rollback_to(0)` restores the true
        // initial world instead of an empty body list.
        if self.clock.tick_count() == 0 {
            self.capture_checkpoint_at(0);
        }
        for _ in 0..steps {
            if self.clock.tick_count().is_multiple_of(substeps) {
                let entering = self.clock.tick_count() / substeps;
                self.apply_inputs_for_frame(entering);
            }
            self.run_one_substep();
            if self.clock.tick_count().is_multiple_of(substeps) {
                let completed = self.clock.tick_count() / substeps;
                self.capture_checkpoint_at(completed);
            }
        }
        self.clock.finish_frame();
    }

    /// Runs exactly one fixed solver substep (driver selected by `substep_mode`).
    fn run_one_substep(&mut self) {
        let dt = self.clock.substep_dt();
        match self.substep_mode {
            SubstepMode::RapierOnly => self.kernel.tick_rapier_only(dt),
            SubstepMode::Euphoria => {
                // S-17 balance authority (R2-F): feed the live Rapier torso state
                // into the capture-point controller, compute the corrective
                // acceleration, apply it as a real impulse, then run Rapier so
                // the physics integrates the control within this same substep.
                self.sync_balance_from_bodies();
                self.balance.step(dt);
                self.apply_balance_forces(dt);
                self.kernel.tick_physics(dt);
            }
        }
        self.clock.on_substep_executed();
    }

    /// Feeds the live Rapier torso state (position + velocity) into the balance
    /// SoA each Euphoria substep.
    fn sync_balance_from_bodies(&mut self) {
        for (handle, idx) in &self.balance_links {
            let Some(body) = self.kernel.rigid_body_set.get(*handle) else {
                continue;
            };
            let pos = body.translation();
            let vel = body.linvel();
            let _ = self
                .balance
                .set_com(*idx, [pos.x, pos.y, pos.z], [vel.x, vel.y, vel.z]);
        }
    }

    /// Applies the corrective acceleration computed by the balance controller
    /// as a real impulse on each linked Rapier torso (`J = m · a · act · dt`).
    fn apply_balance_forces(&mut self, dt: f32) {
        for (handle, idx) in &self.balance_links {
            let Some(body) = self.kernel.rigid_body_set.get_mut(*handle) else {
                continue;
            };
            let accel = self.balance.corrective_accel(*idx);
            let mass = self.balance.agent_mass(*idx);
            let act = self.balance.balance_activation(*idx);
            body.apply_impulse(
                Vector3::new(
                    accel[0] * mass * act * dt,
                    accel[1] * mass * act * dt,
                    accel[2] * mass * act * dt,
                ),
                true,
            );
        }
    }

    /// Applies every buffered input targeting `frame_id`, in deterministic
    /// order (entity space id, then command tag).
    fn apply_inputs_for_frame(&mut self, frame_id: u64) {
        let mut pending: Vec<&WorldInput> = self
            .input_log
            .iter()
            .filter(|i| i.target_frame == frame_id)
            .collect();
        pending.sort_by(|a, b| {
            a.entity
                .space_id()
                .cmp(&b.entity.space_id())
                .then_with(|| a.command.tag().cmp(&b.command.tag()))
        });
        for input in pending {
            let Some(handle) = input.entity.as_rapier() else {
                continue;
            };
            if let Some(body) = self.kernel.rigid_body_set.get_mut(handle) {
                match input.command {
                    InputCommand::Impulse(v) => {
                        body.apply_impulse(Vector3::new(v[0], v[1], v[2]), true);
                    }
                    InputCommand::TorqueImpulse(v) => {
                        body.apply_torque_impulse(Vector3::new(v[0], v[1], v[2]), true);
                    }
                    InputCommand::SetVelocity(v) => {
                        body.set_linvel(Vector3::new(v[0], v[1], v[2]), true);
                    }
                }
            }
        }
    }

    /// Captures the full world state into a checkpoint for `frame_id`.
    fn capture_checkpoint_at(&mut self, frame_id: u64) {
        let mut bodies = Vec::with_capacity(self.kernel.rigid_body_set.len());
        for (handle, body) in self.kernel.rigid_body_set.iter() {
            let t = body.translation();
            let r = body.rotation();
            let v = body.linvel();
            let av = body.angvel();
            // Canonicalize quaternion sign so identical rotations always hash
            // identically (q and -q represent the same rotation).
            let mut q = [r.i, r.j, r.k, r.w];
            if q[3] < 0.0 {
                for c in &mut q {
                    *c = -*c;
                }
            }
            bodies.push(BodyState {
                unified_id_raw: UnifiedEntityId::from_rapier(handle).raw(),
                position: [t.x, t.y, t.z],
                rotation: q,
                linvel: [v.x, v.y, v.z],
                angvel: [av.x, av.y, av.z],
            });
        }
        // Stable ordering for deterministic fingerprints.
        bodies.sort_unstable_by_key(|b| b.unified_id_raw);
        let fingerprint = fingerprint_of_states(&bodies);
        self.journal.push(WorldCheckpoint {
            frame_id,
            bodies,
            fingerprint,
        });
    }

    /// Restores a checkpoint's body states into the live kernel (wakes bodies).
    fn restore_checkpoint(&mut self, cp: &WorldCheckpoint) {
        for bs in &cp.bodies {
            if let Some(handle) = UnifiedEntityId::from_raw(bs.unified_id_raw).as_rapier() {
                if let Some(body) = self.kernel.rigid_body_set.get_mut(handle) {
                    body.set_translation(
                        Vector3::new(bs.position[0], bs.position[1], bs.position[2]),
                        true,
                    );
                    body.set_rotation(
                        // S-22 determinism: `from_quaternion` RE-NORMALIZES the
                        // quaternion, erasing the ~1 ULP non-unitarity drift that the
                        // Rapier integrator leaves in `coords`. That drift feeds the
                        // world inertia tensor used by `apply_torque_impulse`, so
                        // re-normalizing on restore breaks bit-exact replay of angular
                        // inputs. `Unit::new_unchecked` preserves the captured bits
                        // verbatim (sign-canonicalized w >= 0), making the restored
                        // inertia tensor bit-identical to the original.
                        UnitQuaternion::new_unchecked(Quaternion::new(
                            bs.rotation[3],
                            bs.rotation[0],
                            bs.rotation[1],
                            bs.rotation[2],
                        )),
                        true,
                    );
                    body.set_linvel(Vector3::new(bs.linvel[0], bs.linvel[1], bs.linvel[2]), true);
                    body.set_angvel(Vector3::new(bs.angvel[0], bs.angvel[1], bs.angvel[2]), true);
                }
            }
        }
    }

    /// Rolls the world back to `frame_id` and re-simulates forward through the
    /// recorded input log, reproducing the identical world fingerprint (S-22).
    ///
    /// Returns `false` if no checkpoint exists for `frame_id`.
    pub fn rollback_to(&mut self, frame_id: u64) -> bool {
        let Some(cp) = self.journal.rollback_to(frame_id) else {
            return false;
        };
        let target = self.journal.latest_frame_id();
        self.restore_checkpoint(&cp);
        self.clock.rewind_to_frame(frame_id);
        if frame_id >= target {
            return true;
        }
        self.journal.clear_after(frame_id);
        for f in frame_id..target {
            self.apply_inputs_for_frame(f);
            for _ in 0..self.clock.substeps() {
                self.run_one_substep();
            }
            self.capture_checkpoint_at(f + 1);
        }
        true
    }

    /// Fingerprint of the most recent checkpoint.
    pub fn fingerprint(&self) -> u64 {
        self.journal.latest_fingerprint()
    }
}

// ============================================================================
// Fingerprinting helpers
// ============================================================================

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    let q = (v * 10_000.0).round() as i32;
    q as u64
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

/// Deterministic fingerprint over an ordered body-state slice.
pub fn fingerprint_of_states(states: &[BodyState]) -> u64 {
    let mut h = PW_FP_SEED;
    for s in states {
        h = hash_mix(h, s.unified_id_raw);
        for c in s.position {
            h = hash_mix(h, quant_f32(c));
        }
        for c in s.rotation {
            h = hash_mix(h, quant_f32(c));
        }
        for c in s.linvel {
            h = hash_mix(h, quant_f32(c));
        }
        for c in s.angvel {
            h = hash_mix(h, quant_f32(c));
        }
    }
    h
}

// ============================================================================
// Honesty soak + probe
// ============================================================================

/// Soak frames for the S-17..S-22 authority proof.
pub const SOAK_FRAMES: u32 = 60;
/// Frame to roll back to in the rollback proof (must be < SOAK_FRAMES).
pub const SOAK_ROLLBACK_FRAME: u64 = 20;
/// Frame at which the stronger (re-applied input) rollback proof records input.
pub const SOAK_RECORD_AT_FRAME: u32 = 30;

/// Instant-measured S-17..S-22 authority soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhysicsWorldSoakReport {
    /// S-17: the unified authority stepped deterministically.
    pub physics_world_authority_ready: bool,
    /// S-19: clock produced fixed substeps + valid interpolation alpha.
    pub simulation_clock_ready: bool,
    /// S-20: unified ids round-trip losslessly across all three spaces.
    pub unified_entity_id_ready: bool,
    /// S-22: rollback → re-sim reproduces the identical fingerprint.
    pub rollback_determinism_ready: bool,
    pub fixed_dt: f32,
    pub substep_dt: f32,
    pub effective_hz: f32,
    pub journal_capacity: usize,
    pub frames_simulated: u64,
    pub interpolation_alpha_valid: bool,
    pub same_inputs_same_fingerprint: bool,
    pub rollback_reproduces_fingerprint: bool,
    pub fingerprint: u64,
    pub soak_elapsed_ns: u128,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Fail-closed — no AAA / product claims.
    pub chaos_physics_aaa_ready: bool,
    pub ggpo_live_ready: bool,
    pub euphoria_full_aaa_ready: bool,
    pub physics_gas_duplex_ready: bool,
}

/// Evidence kind for the physics world authority soak.
pub const PW_EVIDENCE_KIND: &str = "physics_world_authority_clock_rollback";

fn build_deterministic_world(impulse: [f32; 3]) -> PhysicsWorld {
    let mut world = PhysicsWorld::new();
    world.spawn_euphoria_torso(5.0);
    world.spawn_euphoria_torso(3.0);
    let target = world.spawn_euphoria_torso(1.0);
    world.record_input(target, InputCommand::Impulse(impulse));
    world
}

/// Runs the S-17..S-22 authority soak.
///
/// Report memoized process-wide via `OnceLock` (peer-DAG rationale in
/// `run_synesthetic_resonance_matrix_soak`); this kernel is a hot leaf fetched by
/// many sibling soaks, so caching collapses repeated peer recomputation.
pub fn run_physics_world_soak() -> PhysicsWorldSoakReport {
    static CACHE: std::sync::OnceLock<PhysicsWorldSoakReport> = std::sync::OnceLock::new();
    CACHE
        .get_or_init(|| {
            let t0 = Instant::now();

    // --- S-19 clock behavior ---
    let mut clock = SimulationClock::new(SimulationClockConfig::default());
    let steps = clock.frame_tick(1.0 / 60.0);
    let alpha = clock.finish_frame();
    let effective_hz = clock.effective_hz();
    let clock_ok = steps > 0
        && (0.0..=1.0).contains(&alpha)
        && (239.9..=240.1).contains(&effective_hz)
        && clock.current_frame() == 0;

    // --- S-20 unified id round-trips ---
    let probe_id = UnifiedEntityId::from_parts(EntityDomain::Physics, 7);
    let id_ok = probe_id.domain() == EntityDomain::Physics
        && UnifiedEntityId::from_raw(probe_id.raw()) == probe_id
        && UnifiedEntityId::from_gas(42).as_gas() == Some(42)
        && UnifiedEntityId::from_gas(42).domain() == EntityDomain::Gas
        && UnifiedEntityId::from_gas(42).as_rapier().is_none()
        && UnifiedEntityId::from_world(99).as_world() == Some(99)
        && UnifiedEntityId::from_world(99).domain() == EntityDomain::World;

    // --- S-17/S-22 determinism + rollback ---
    let mut w_a = build_deterministic_world([30.0, 0.0, 0.0]);
    for _ in 0..SOAK_FRAMES {
        w_a.step(1.0 / 120.0);
    }
    let fp_a = w_a.fingerprint();
    let frames_a = w_a.clock.tick_count();

    let mut w_b = build_deterministic_world([30.0, 0.0, 0.0]);
    for _ in 0..SOAK_FRAMES {
        w_b.step(1.0 / 120.0);
    }
    let fp_b = w_b.fingerprint();
    let same = fp_a == fp_b && fp_a != 0;

    // --- S-22 strong rollback (input re-applied after rollback) ---
    let mut w_c = PhysicsWorld::new();
    w_c.spawn_euphoria_torso(5.0);
    w_c.spawn_euphoria_torso(3.0);
    let target_c = w_c.spawn_euphoria_torso(1.0);
    for _ in 0..SOAK_RECORD_AT_FRAME {
        w_c.step(1.0 / 120.0);
    }
    w_c.record_input(target_c, InputCommand::Impulse([0.0, 20.0, 0.0]));
    for _ in SOAK_RECORD_AT_FRAME..SOAK_FRAMES {
        w_c.step(1.0 / 120.0);
    }
    let fp_before_rollback = w_c.fingerprint();
    let ok_rollback = w_c.rollback_to(SOAK_ROLLBACK_FRAME);
    let fp_after_rollback = w_c.fingerprint();
    let rollback_repro = ok_rollback && fp_before_rollback == fp_after_rollback;

    let authority_ready = same
        && rollback_repro
        && clock_ok
        && id_ok
        && frames_a == u64::from(SOAK_FRAMES) * u64::from(clock.substeps());
    let elapsed = t0.elapsed().as_nanos();

    let mut evidence = PW_FP_SEED;
    evidence = hash_mix(evidence, fp_a);
    evidence = hash_mix(evidence, u64::from(authority_ready));
    evidence = hash_mix(evidence, u64::from(clock_ok));
    evidence = hash_mix(evidence, u64::from(id_ok));
    evidence = hash_mix(evidence, u64::from(rollback_repro));
    evidence = hash_mix(evidence, u64::from(ok_rollback));

    PhysicsWorldSoakReport {
        physics_world_authority_ready: authority_ready,
        simulation_clock_ready: clock_ok,
        unified_entity_id_ready: id_ok,
        rollback_determinism_ready: rollback_repro,
        fixed_dt: clock.fixed_dt(),
        substep_dt: clock.substep_dt(),
        effective_hz,
        journal_capacity: w_a.journal.capacity(),
        frames_simulated: frames_a,
        interpolation_alpha_valid: (0.0..=1.0).contains(&alpha),
        same_inputs_same_fingerprint: same,
        rollback_reproduces_fingerprint: rollback_repro,
        fingerprint: fp_a,
        soak_elapsed_ns: elapsed,
        evidence_kind: PW_EVIDENCE_KIND,
        evidence_fingerprint: evidence,
        chaos_physics_aaa_ready: false,
        ggpo_live_ready: false,
        euphoria_full_aaa_ready: false,
        physics_gas_duplex_ready: false,
    }
        })
        .clone()
}

/// Honesty probe — soak-gated S-17..S-22 readiness, always fail-closed on AAA.
pub fn probe_physics_world_authority() -> PhysicsWorldSoakReport {
    run_physics_world_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unified_entity_id_roundtrips_all_spaces() {
        let rapier = UnifiedEntityId::from_rapier(RigidBodyHandle::from_raw_parts(12, 7));
        assert_eq!(rapier.domain(), EntityDomain::Physics);
        let back = rapier.as_rapier().expect("physics domain");
        let (i, g) = back.into_raw_parts();
        assert_eq!(i, 12);
        assert_eq!(g, 7);

        let gas = UnifiedEntityId::from_gas(42);
        assert_eq!(gas.as_gas(), Some(42));
        assert!(gas.as_rapier().is_none());
        assert!(gas.as_world().is_none());

        let world = UnifiedEntityId::from_world(0xFFFF_FFFF_FFFF);
        assert_eq!(world.as_world(), Some(0xFFFF_FFFF_FFFF));
        assert!(world.as_gas().is_none());

        // Distinct spaces never collide even with identical low ids.
        assert_ne!(UnifiedEntityId::from_gas(1).raw(), UnifiedEntityId::from_world(1).raw());
        assert_ne!(
            UnifiedEntityId::from_parts(EntityDomain::Physics, 1).raw(),
            UnifiedEntityId::from_gas(1).raw()
        );
    }

    #[test]
    fn simulation_clock_fixed_timestep_accumulation() {
        let mut clock = SimulationClock::new(SimulationClockConfig::default());
        // 1/120 s real frame → exactly 2 substeps of 1/240 s.
        assert_eq!(clock.frame_tick(1.0 / 120.0), 2);
        clock.on_substep_executed();
        clock.on_substep_executed();
        let alpha = clock.finish_frame();
        assert!((0.0..=1.0).contains(&alpha));
        assert_eq!(clock.tick_count(), 2);
        assert_eq!(clock.current_frame(), 1);
    }

    #[test]
    fn simulation_clock_substep_accumulation_across_frames() {
        let mut clock = SimulationClock::new(SimulationClockConfig::default());
        // 1/60 s real frame = 4 substeps of 1/240 s.
        assert_eq!(clock.frame_tick(1.0 / 60.0), 4);
        assert_eq!(clock.current_frame(), 0);
        // 1/480 s real frame = 0 substeps (accumulated), alpha = 0.5.
        assert_eq!(clock.frame_tick(1.0 / 480.0), 0);
        let alpha = clock.finish_frame();
        assert!((alpha - 0.5).abs() < 1e-6);
    }

    #[test]
    fn simulation_clock_spiral_of_death_protection() {
        let mut clock = SimulationClock::new(SimulationClockConfig::default());
        // Huge real dt is clamped to max_frame_dt and capped substeps.
        let steps = clock.frame_tick(10.0);
        assert_eq!(steps, DEFAULT_MAX_SUBSTEPS_PER_FRAME);
        assert_eq!(clock.accumulator(), 0.0);
    }

    #[test]
    fn simulation_clock_configure_integration() {
        let clock = SimulationClock::new(SimulationClockConfig::default());
        let mut params = IntegrationParameters::default();
        clock.configure_integration(&mut params);
        assert_eq!(params.dt, clock.substep_dt());
        assert_eq!(params.min_island_size, DEFAULT_MIN_ISLAND_SIZE);
    }

    #[test]
    fn physics_world_gravity_moves_torso_and_fingerprint_changes() {
        let mut world = PhysicsWorld::new();
        world.spawn_euphoria_torso(5.0);
        let fp0 = world.fingerprint();
        for _ in 0..60 {
            world.step(1.0 / 120.0);
        }
        let fp1 = world.fingerprint();
        assert_ne!(fp0, fp1);
        assert_ne!(fp1, 0);
    }

    #[test]
    fn physics_world_same_inputs_same_fingerprint() {
        let mut a = build_deterministic_world([30.0, 0.0, 0.0]);
        let mut b = build_deterministic_world([30.0, 0.0, 0.0]);
        for _ in 0..60 {
            a.step(1.0 / 120.0);
            b.step(1.0 / 120.0);
        }
        assert_eq!(a.fingerprint(), b.fingerprint());
        assert_ne!(a.fingerprint(), 0);
    }

    #[test]
    fn physics_world_input_changes_trajectory() {
        let mut no_input = PhysicsWorld::new();
        no_input.spawn_euphoria_torso(1.0);
        for _ in 0..60 {
            no_input.step(1.0 / 120.0);
        }

        let mut with_input = PhysicsWorld::new();
        let t = with_input.spawn_euphoria_torso(1.0);
        with_input.record_input(t, InputCommand::Impulse([50.0, 0.0, 0.0]));
        for _ in 0..60 {
            with_input.step(1.0 / 120.0);
        }

        assert_ne!(no_input.fingerprint(), with_input.fingerprint());
    }

    #[test]
    fn physics_world_euphoria_balance_wiring_and_determinism() {
        // Euphoria-mode world: the capture-point controller must be wired into
        // the substep loop and keep the torso's horizontal drift bounded even
        // after a hard lateral hit, deterministically across twin worlds.
        let config = |mode: SubstepMode| PhysicsWorldConfig {
            substep_mode: mode,
            ..PhysicsWorldConfig::default()
        };
        let mut world = PhysicsWorld::with_config(config(SubstepMode::Euphoria));
        let t = world.spawn_euphoria_torso_at([0.0, 2.0, 0.0]);
        // The torso is linked to exactly one balance agent.
        assert_eq!(world.balance_links.len(), 1);
        assert_eq!(world.balance.agent_count(), 1);
        // A hard lateral hit: 60 N·s sideways impulse.
        world.record_input(t, InputCommand::Impulse([60.0, 0.0, 0.0]));
        // One second of simulation at 120 Hz.
        for _ in 0..120 {
            world.step(1.0 / 120.0);
        }
        // The balance controller engages and the torso stays bounded.
        let body = world
            .kernel
            .rigid_body_set
            .get(t.as_rapier().expect("physics entity"))
            .expect("torso body present");
        let final_x = body.translation().x;
        assert!(final_x.abs() < 5.0, "torso drifted too far: {final_x}");

        // Determinism: an identical Euphoria world reproduces the fingerprint.
        let mut twin = PhysicsWorld::with_config(config(SubstepMode::Euphoria));
        let t2 = twin.spawn_euphoria_torso_at([0.0, 2.0, 0.0]);
        twin.record_input(t2, InputCommand::Impulse([60.0, 0.0, 0.0]));
        for _ in 0..120 {
            twin.step(1.0 / 120.0);
        }
        assert_eq!(world.fingerprint(), twin.fingerprint());
        // The RapierOnly default path is untouched: no balance agent exists.
        let mut plain = PhysicsWorld::new();
        assert_eq!(plain.balance_links.len(), 0);
        plain.spawn_euphoria_torso_at([0.0, 2.0, 0.0]);
        assert_eq!(plain.balance_links.len(), 1);
        for _ in 0..30 {
            plain.step(1.0 / 120.0);
        }
        // No panic and a non-zero fingerprint from the RapierOnly path.
        assert_ne!(plain.fingerprint(), 0);
    }

    #[test]
    fn physics_world_rollback_reproduces_fingerprint() {
        let mut world = PhysicsWorld::new();
        world.spawn_euphoria_torso(5.0);
        world.spawn_euphoria_torso(3.0);
        let target = world.spawn_euphoria_torso(1.0);
        // Record input mid-simulation; it must be re-applied after rollback.
        for _ in 0..SOAK_RECORD_AT_FRAME {
            world.step(1.0 / 120.0);
        }
        world.record_input(target, InputCommand::Impulse([0.0, 20.0, 0.0]));
        for _ in SOAK_RECORD_AT_FRAME..SOAK_FRAMES {
            world.step(1.0 / 120.0);
        }
        let before = world.fingerprint();
        assert!(world.rollback_to(SOAK_ROLLBACK_FRAME));
        let after = world.fingerprint();
        assert_eq!(before, after);
        // Rollback to a frame that never existed → false.
        assert!(!world.rollback_to(10_000));
    }

    #[test]
    fn rollback_journal_evicts_oldest() {
        let mut journal = RollbackJournal::new(4);
        for f in 0..8 {
            journal.push(WorldCheckpoint {
                frame_id: f,
                bodies: Vec::new(),
                fingerprint: f * 31,
            });
        }
        // Frame 3 was evicted; frame 7 is present; 4..7 present.
        assert!(journal.get(3).is_none());
        assert_eq!(journal.get(7).map(|c| c.fingerprint), Some(7 * 31));
        assert!(journal.get(4).is_some());
        assert_eq!(journal.latest_frame_id(), 7);
    }

    #[test]
    fn soak_green_and_aaa_fail_closed() {
        let r = run_physics_world_soak();
        assert!(r.physics_world_authority_ready);
        assert!(r.simulation_clock_ready);
        assert!(r.unified_entity_id_ready);
        assert!(r.rollback_determinism_ready);
        assert!(r.same_inputs_same_fingerprint);
        assert!(r.rollback_reproduces_fingerprint);
        assert!(r.interpolation_alpha_valid);
        assert_eq!(r.evidence_kind, PW_EVIDENCE_KIND);
        assert!(!r.chaos_physics_aaa_ready);
        assert!(!r.ggpo_live_ready);
        assert!(!r.euphoria_full_aaa_ready);
        assert!(!r.physics_gas_duplex_ready);
        assert_eq!(r.frames_simulated, u64::from(SOAK_FRAMES) * 2);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_physics_world_soak();
        let b = probe_physics_world_authority();
        assert_eq!(a.physics_world_authority_ready, b.physics_world_authority_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert!(!b.physics_gas_duplex_ready);
    }
}
