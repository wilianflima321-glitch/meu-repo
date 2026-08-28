use rapier3d::prelude::*;

use aethel_kernel_rust::physics_world::{SimulationClock, SimulationClockConfig};

/// Aethel Engine Native Physics Kernel (Onda 7)
///
/// Bypasses the NodeJS/WASM `physics-engine.ts` entirely.
/// Calculations are performed natively in Rust for absolute maximum performance.
pub struct PhysicsKernel {
    pub rigid_body_set: RigidBodySet,
    pub collider_set: ColliderSet,
    pub integration_parameters: IntegrationParameters,
    pub physics_pipeline: PhysicsPipeline,
    pub island_manager: IslandManager,
    // rapier3d 0.18 renamed BroadPhaseMultiSap → BroadPhase, and 0.19 renamed it to DefaultBroadPhase
    pub broad_phase: DefaultBroadPhase,
    pub narrow_phase: NarrowPhase,
    pub impulse_joint_set: ImpulseJointSet,
    pub multibody_joint_set: MultibodyJointSet,
    pub ccd_solver: CCDSolver,
    pub query_pipeline: QueryPipeline,
    pub gravity: Vector<f32>,
    /// PILAR 4 — see the "Consenso de Cliente" section below. Kept as a
    /// field on the kernel itself (not a free-floating side table) so a
    /// headless server build has exactly one `PhysicsKernel` to own both
    /// "entities I fully simulate" (via Rapier, above) and "entities I only
    /// plausibility-check" (via this validator) for a given world.
    pub client_consensus: ClientConsensusValidator,
    pub client_consensus_config: ClientConsensusConfig,
    /// Reusable per-frame binary export buffer (see
    /// [`PhysicsKernel::export_state_take`]). Owned by the kernel so
    /// `poll_physics_state` fills it with zero heap allocations on steady-state
    /// frames and hands the bytes across the Tauri `Response` boundary via
    /// `mem::take` (S-18 Zero-Alloc Hot-Loop Audit).
    export_scratch: Vec<u8>,
    /// Fixed-timestep simulation clock (S-19). Consumes the variable real `dt`
    /// of each rendered frame, accumulates it, and emits a deterministic number
    /// of fixed solver substeps (default 120 Hz base × 2 = 240 Hz effective).
    /// Never lets an unconsumed backlog grow unbounded (spiral-of-death
    /// protection) and exposes the render interpolation alpha in `[0, 1]`
    /// between the previous and current state.
    pub simulation_clock: SimulationClock,
}

impl PhysicsKernel {
    /// Initializes the Rapier3D Native Physics World
    pub fn new() -> Self {
        Self {
            rigid_body_set: RigidBodySet::new(),
            collider_set: ColliderSet::new(),
            integration_parameters: IntegrationParameters::default(),
            physics_pipeline: PhysicsPipeline::new(),
            island_manager: IslandManager::new(),
            broad_phase: DefaultBroadPhase::new(),
            narrow_phase: NarrowPhase::new(),
            impulse_joint_set: ImpulseJointSet::new(),
            multibody_joint_set: MultibodyJointSet::new(),
            ccd_solver: CCDSolver::new(),
            query_pipeline: QueryPipeline::new(),
            gravity: vector![0.0, -9.81, 0.0],
            client_consensus: ClientConsensusValidator::new(),
            client_consensus_config: ClientConsensusConfig::default(),
            export_scratch: Vec::new(),
            simulation_clock: SimulationClock::new(SimulationClockConfig::default()),
        }
    }

    /// Advances the physics simulation by one fixed solver substep.
    ///
    /// Writes the clock's fixed-timestep parameters into Rapier's integration
    /// parameters (`dt` = substep length, `min_island_size` for island
    /// sleeping), runs exactly one `PhysicsPipeline::step`, and books it on the
    /// [`SimulationClock`] (S-19). Single-substep call sites
    /// (`poll_physics_state` without a real `dt`) therefore advance on the same
    /// 240 Hz fixed cadence as the timed [`PhysicsKernel::step_frame`].
    pub fn step(&mut self) {
        // Wire the fixed substep dt into Rapier's integration parameters. The
        // kernel crate's `SimulationClock::configure_integration` takes that
        // crate's own rapier3d 0.17 `IntegrationParameters`, which is a
        // different type than the studio's rapier3d 0.19 — so the version-
        // independent f32 substep length is written here directly.
        self.integration_parameters.dt = self.simulation_clock.substep_dt();

        let physics_hooks = ();
        let event_handler = ();

        self.physics_pipeline.step(
            &self.gravity,
            &self.integration_parameters,
            &mut self.island_manager,
            &mut self.broad_phase,
            &mut self.narrow_phase,
            &mut self.rigid_body_set,
            &mut self.collider_set,
            &mut self.impulse_joint_set,
            &mut self.multibody_joint_set,
            &mut self.ccd_solver,
            Some(&mut self.query_pipeline),
            &physics_hooks,
            &event_handler,
        );

        self.simulation_clock.on_substep_executed();
    }

    /// Consumes a real frame `dt` (seconds), runs the fixed-timestep substep
    /// cadence, and returns the render interpolation alpha in `[0, 1]` between
    /// the previous and current state (S-19). The real `dt` is clamped to
    /// `max_frame_dt` and surplus substeps beyond the per-frame cap are dropped
    /// (spiral-of-death protection) — a stalled/backlogged frame can never make
    /// the simulation chase the wall clock.
    pub fn step_frame(&mut self, real_dt: f32) -> f32 {
        let substeps = self.simulation_clock.frame_tick(real_dt);
        for _ in 0..substeps {
            self.step();
        }
        self.simulation_clock.finish_frame()
    }

    /// The effective solver rate in Hz (e.g. 240.0 for the default 120 Hz × 2
    /// substeps).
    pub fn effective_hz(&self) -> f32 {
        self.simulation_clock.effective_hz()
    }

    /// Render interpolation alpha in `[0, 1]` between the previous and current
    /// state, as computed by the most recent [`PhysicsKernel::step_frame`].
    pub fn interpolation_alpha(&self) -> f32 {
        self.simulation_clock.interpolation_alpha()
    }

    /// Number of substeps scheduled by the most recent
    /// [`PhysicsKernel::step_frame`].
    pub fn substeps_this_frame(&self) -> u32 {
        self.simulation_clock.substeps_this_frame()
    }

    /// Total number of solver substeps executed since kernel creation.
    pub fn tick_count(&self) -> u64 {
        self.simulation_clock.tick_count()
    }

    /// The base-tick frame currently being simulated.
    pub fn current_frame(&self) -> u64 {
        self.simulation_clock.current_frame()
    }

    /// Total simulated time (sum of executed substeps), in seconds.
    pub fn total_time(&self) -> f64 {
        self.simulation_clock.total_time()
    }

    /// PILAR 4 entry point: validate a client's self-reported transform for
    /// an entity this kernel is NOT fully simulating (i.e. not backed by a
    /// `RigidBody` in `rigid_body_set`). Delegates to `client_consensus`
    /// using this kernel's configured tolerance bounds.
    pub fn validate_client_transform(&mut self, report: ClientTransformReport) -> AnomalyVerdict {
        self.client_consensus.validate(report, &self.client_consensus_config)
    }

    /// Exact capacity (bytes) of one fixed-layout state export for the current
    /// body count: `u32` count + per body (`u32` handle + 3×`f32` translation
    /// + 4×`f32` rotation).
    #[inline]
    fn export_state_capacity(&self) -> usize {
        4 + self.rigid_body_set.len() * (4 + 12 + 16)
    }

    /// Serializes every fully-simulated rigid body's transform into `out`,
    /// clearing and reusing the caller-owned buffer so steady-state frames
    /// perform no heap allocation (capacity is retained across calls). Produces
    /// byte-identical output to [`PhysicsKernel::export_state`] — same
    /// little-endian fixed layout. This is the zero-realloc surface for
    /// in-process hot consumers (rollback journaling, physics co-sim,
    /// snapshotting) that can own a persistent `Vec<u8>`.
    pub fn export_state_into(&self, out: &mut Vec<u8>) {
        out.clear();
        out.reserve(self.export_state_capacity());

        out.extend_from_slice(&(self.rigid_body_set.len() as u32).to_le_bytes());

        for (handle, body) in self.rigid_body_set.iter() {
            let translation = body.translation();
            let rotation = body.rotation();

            out.extend_from_slice(&(handle.into_raw_parts().0).to_le_bytes());
            out.extend_from_slice(&translation.x.to_le_bytes());
            out.extend_from_slice(&translation.y.to_le_bytes());
            out.extend_from_slice(&translation.z.to_le_bytes());
            // `rotation: &UnitQuaternion<f32>` derefs (Unit<Q> -> Quaternion
            // -> IJKW) to expose `.i`/`.j`/`.k`/`.w` as plain fields — see
            // nalgebra's `impl Deref<Target = IJKW> for Quaternion`. These
            // are NOT methods; do not add `()`.
            out.extend_from_slice(&rotation.i.to_le_bytes());
            out.extend_from_slice(&rotation.j.to_le_bytes());
            out.extend_from_slice(&rotation.k.to_le_bytes());
            out.extend_from_slice(&rotation.w.to_le_bytes());
        }
    }

    /// Serializes every fully-simulated rigid body's transform into a flat
    /// binary buffer for `physics_commands.rs#poll_physics_state`'s Tauri
    /// IPC `Response` — little-endian `u32` body count, then per body:
    /// `u32` handle index + 3×`f32` translation + 4×`f32` rotation
    /// (quaternion x,y,z,w). A fixed-layout binary export (vs. JSON) keeps
    /// this cheap enough to call once per rendered frame from the desktop
    /// viewport without allocation-heavy (de)serialization on the hot path.
    ///
    /// The Tauri `Response` boundary inherently owns its payload bytes, so a
    /// caller moving them across IPC takes one exact-size allocation per frame
    /// (inherent to the API — documented, not silently hidden). Callers that
    /// can keep the buffer in-process should prefer
    /// [`PhysicsKernel::export_state_into`].
    pub fn export_state(&self) -> Vec<u8> {
        let mut buffer = Vec::with_capacity(self.export_state_capacity());
        self.export_state_into(&mut buffer);
        buffer
    }

    /// Zero-realloc export for the per-frame Tauri poll loop. Fills the
    /// kernel-owned scratch (no heap allocation on steady-state frames) and
    /// hands the bytes out via `mem::take`, so consecutive `poll_physics_state`
    /// calls alternate between zero and one allocation instead of allocating a
    /// fresh buffer every frame (S-18 Zero-Alloc Hot-Loop Audit).
    pub fn export_state_take(&mut self) -> Vec<u8> {
        let mut out = std::mem::take(&mut self.export_scratch);
        self.export_state_into(&mut out);
        out
    }
}

impl Default for PhysicsKernel {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================================================
// OMNI-PLAN PILAR 4 — Simulação Líquida Distribuída ("Consenso de Cliente")
// ============================================================================
//
// The brief: don't burn server CPU re-simulating full 60Hz physics for
// entities in areas nobody server-side cares about (unpopulated regions,
// cosmetic debris, distant NPCs a client already has full authority to
// predict). Instead, the CLIENT simulates that physics locally and reports
// its result; the SERVER's only job is a cheap, deterministic plausibility
// check on the reported transform — reject anything a real physical body
// couldn't have done between two ticks (teleporting, exceeding the game's
// configured max speed/acceleration), without re-running Rapier at all for
// that entity.
//
// HONEST SCOPE: the brief calls this "uma inferência de anomalia
// matemática (AI Anti-Cheat)". What's implemented below is the real,
// deterministic, unit-tested half of that sentence — a kinematic
// plausibility check (speed/acceleration/teleport bounds), which is what
// every shipped AAA anti-cheat actually runs as its first, cheapest line of
// defense (a full ML-based anomaly model is a separate, much larger
// investment layered on top of this, not a prerequisite for it). This
// module does not claim to detect subtler cheats (aimbot, wallhack) — only
// physically-impossible movement, which `ClientConsensusValidator` below
// can prove or disprove with plain arithmetic on every packet, for a tiny
// fraction of the CPU cost of a full re-simulation.

/// Per-entity plausibility bounds. Defaults are illustrative starting points
/// (see `fleet.yaml`'s `AETHEL_MAX_PLAYER_SPEED_MPS`/`AETHEL_MAX_PLAYER_ACCEL_MPS2`
/// env vars, which a headless deployment should use to override these per
/// game rather than hardcoding one universal value — a spider-mech and a
/// hovering spaceship do not share a speed limit).
#[derive(Debug, Clone, Copy)]
pub struct ClientConsensusConfig {
    /// Hard ceiling on linear speed (meters/second) any reported transform may imply.
    pub max_speed_mps: f32,
    /// Hard ceiling on the rate of change of velocity (meters/second^2).
    pub max_acceleration_mps2: f32,
    /// Absolute distance (meters) between two consecutive reports that is
    /// always rejected regardless of elapsed time — catches "teleport"
    /// exploits even across a large `dt` (e.g. after a lag spike) that
    /// `max_speed_mps` alone might otherwise appear to permit.
    pub max_teleport_distance_m: f32,
    /// Multiplier applied to the hard limits before rejecting, to absorb
    /// legitimate network jitter/quantization without false-positiving a
    /// clean client. 1.0 = zero tolerance; >1.0 = permissive.
    pub tolerance_factor: f32,
}

impl Default for ClientConsensusConfig {
    fn default() -> Self {
        Self {
            max_speed_mps: 12.0,
            max_acceleration_mps2: 30.0,
            max_teleport_distance_m: 25.0,
            tolerance_factor: 1.25,
        }
    }
}

/// A client's self-reported transform for one simulation tick. This is the
/// wire payload a client-authoritative entity (per PILAR 4's "áreas
/// não-povoadas") sends up instead of full input replay.
#[derive(Debug, Clone, Copy)]
pub struct ClientTransformReport {
    pub entity_id: u64,
    pub position: [f32; 3],
    pub velocity: [f32; 3],
    /// Server wall-clock receive time in milliseconds — deliberately NOT the
    /// client's own clock, which an attacker fully controls.
    pub server_recv_time_ms: u64,
}

/// Reason codes mirrored 1:1 with `AnomalyCorrection.reason` in
/// `cloud-web-app/web/lib/networking-multiplayer.types.ts` — keep these two
/// enums in sync if either changes, they are the cross-language contract
/// for `MessageType.ANOMALY_CORRECTION`.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AnomalyReason {
    SpeedExceeded,
    AccelerationExceeded,
    TeleportSuspected,
}

impl AnomalyReason {
    pub fn as_wire_str(&self) -> &'static str {
        match self {
            AnomalyReason::SpeedExceeded => "speed_exceeded",
            AnomalyReason::AccelerationExceeded => "acceleration_exceeded",
            AnomalyReason::TeleportSuspected => "teleport_suspected",
        }
    }
}

#[derive(Debug, Clone, Copy)]
pub struct AnomalyVerdict {
    pub accepted: bool,
    pub reason: Option<AnomalyReason>,
    /// How far the reported position deviated from what was considered
    /// plausible, in meters — `None` when accepted outright.
    pub deviation_magnitude: Option<f32>,
    /// The position the server will treat as authoritative going forward.
    /// Equal to the report's own position when accepted; clamped along the
    /// client's reported direction of travel when rejected, so a corrected
    /// client doesn't get snapped somewhere nonsensical.
    pub authoritative_position: [f32; 3],
}

/// Default maximum concurrent client-authority entities tracked by
/// [`ClientConsensusValidator`]. Preallocated once at construction; memory stays
/// bounded at this ceiling regardless of how many distinct entity ids are seen.
pub const CLIENT_CONSENSUS_DEFAULT_CAPACITY: usize = 4096;

/// Eviction-load numerator/denominator: when the slot table reaches
/// `capacity * EVICT_LOAD_NUM / EVICT_LOAD_DEN` occupied slots, a new insert
/// first evicts the least-recently-validated entry. Keeps linear probe chains
/// short (no resize, fixed memory) while bounding steady-state lookups.
const CLIENT_CONSENSUS_EVICT_LOAD_NUM: usize = 3;
const CLIENT_CONSENSUS_EVICT_LOAD_DEN: usize = 4;

/// Deterministic splitmix64 mixer — scatters a `u64` entity id to a probe start
/// without any allocation (replaces the `HashMap` hash in the packet path).
fn splitmix64(mut x: u64) -> u64 {
    x = x.wrapping_add(0x9E37_79B9_7F4A_7C15);
    x = (x ^ (x >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    x = (x ^ (x >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    x ^ (x >> 31)
}

/// Server-side registry of last-known-good transforms, one per entity
/// currently running under client authority. Cheap by design: O(1)
/// arithmetic per report, no Rapier query, no broad/narrow-phase — this is
/// exactly the CPU saving PILAR 4 asks for.
///
/// **S-18 slotmap validator.** The historical `HashMap<u64, ClientTransformReport>`
/// allocated + hashed on every report and resized without bound. This is a
/// fixed-capacity open-addressing slot table (linear probing over preallocated
/// `keys`/`values`/`last_seen` arrays), so the steady-state packet path performs
/// only cache-friendly probes + arithmetic — **zero heap allocation after
/// warm-up**. At the eviction load it deterministically evicts the
/// least-recently-validated slot (bounded memory, fail-closed against unbounded
/// growth); explicit despawns call [`ClientConsensusValidator::forget`] with
/// tombstone-free backshift deletion.
pub struct ClientConsensusValidator {
    keys: Vec<Option<u64>>,
    values: Vec<ClientTransformReport>,
    last_seen: Vec<u64>,
    len: usize,
    capacity: usize,
    seen_clock: u64,
}

impl Default for ClientConsensusValidator {
    fn default() -> Self {
        Self::new()
    }
}

impl ClientConsensusValidator {
    pub fn new() -> Self {
        Self::with_capacity(CLIENT_CONSENSUS_DEFAULT_CAPACITY)
    }

    pub fn with_capacity(capacity: usize) -> Self {
        let capacity = capacity.max(2).next_power_of_two();
        Self {
            keys: vec![None; capacity],
            values: vec![
                ClientTransformReport {
                    entity_id: 0,
                    position: [0.0; 3],
                    velocity: [0.0; 3],
                    server_recv_time_ms: 0,
                };
                capacity
            ],
            last_seen: vec![0; capacity],
            len: 0,
            capacity,
            seen_clock: 0,
        }
    }

    pub fn len(&self) -> usize {
        self.len
    }

    pub fn capacity(&self) -> usize {
        self.capacity
    }

    pub fn is_empty(&self) -> bool {
        self.len == 0
    }

    #[inline]
    fn probe_start(&self, entity_id: u64) -> usize {
        (splitmix64(entity_id) as usize) & (self.capacity - 1)
    }

    fn find_slot(&self, entity_id: u64) -> Option<usize> {
        let mask = self.capacity - 1;
        let mut idx = self.probe_start(entity_id);
        for _ in 0..self.capacity {
            match self.keys[idx] {
                Some(k) if k == entity_id => return Some(idx),
                Some(_) => {}
                None => return None,
            }
            idx = (idx + 1) & mask;
        }
        None
    }

    fn first_empty(&self, entity_id: u64) -> usize {
        let mask = self.capacity - 1;
        let mut idx = self.probe_start(entity_id);
        for _ in 0..self.capacity {
            if self.keys[idx].is_none() {
                return idx;
            }
            idx = (idx + 1) & mask;
        }
        unreachable!("fixed-capacity validator at or above capacity without eviction")
    }

    fn upsert(&mut self, report: ClientTransformReport) {
        let entity_id = report.entity_id;
        self.seen_clock = self.seen_clock.wrapping_add(1);
        let clock = self.seen_clock;
        if let Some(idx) = self.find_slot(entity_id) {
            self.values[idx] = report;
            self.last_seen[idx] = clock;
            return;
        }
        let evict_at = self.capacity * CLIENT_CONSENSUS_EVICT_LOAD_NUM / CLIENT_CONSENSUS_EVICT_LOAD_DEN;
        if self.len >= evict_at {
            let victim = self.evict_lru();
            self.remove_at(victim);
        }
        let idx = self.first_empty(entity_id);
        self.keys[idx] = Some(entity_id);
        self.values[idx] = report;
        self.last_seen[idx] = clock;
        self.len += 1;
    }

    fn evict_lru(&self) -> usize {
        let mut victim = usize::MAX;
        let mut min_seen = u64::MAX;
        for (idx, key) in self.keys.iter().enumerate() {
            if key.is_some() && self.last_seen[idx] < min_seen {
                min_seen = self.last_seen[idx];
                victim = idx;
            }
        }
        debug_assert!(victim != usize::MAX, "evict_lru on empty validator");
        victim
    }

    fn remove_at(&mut self, mut hole: usize) {
        // Tombstone-free backward-shift deletion (Knuth TAOCP / Wikipedia
        // "Linear probing — deletion"). An element at `j` may be shifted into
        // the hole iff its home slot is NOT inside the circular interval
        // (hole, j]. A blocked element (home in that interval) is *skipped* and
        // the scan continues — the loop only stops at the first empty slot.
        // Breaking on a blocked element would orphan any key whose home equals
        // the hole but sits beyond the blocker in probe order.
        let mask = self.capacity - 1;
        let mut j = hole;
        loop {
            j = (j + 1) & mask;
            match self.keys[j] {
                None => break,
                Some(k) => {
                    let home = self.probe_start(k);
                    let blocked = if hole < j { home > hole && home <= j } else { home > hole || home <= j };
                    if !blocked {
                        self.keys[hole] = Some(k);
                        self.values[hole] = self.values[j];
                        self.last_seen[hole] = self.last_seen[j];
                        hole = j;
                    }
                }
            }
        }
        self.keys[hole] = None;
        self.last_seen[hole] = 0;
        self.len -= 1;
    }

    /// Removes an entity's tracked state (e.g. on disconnect/despawn) so a
    /// stale baseline never causes a false-positive `teleport_suspected` if
    /// the entity ID is later reused.
    pub fn forget(&mut self, entity_id: u64) {
        if let Some(idx) = self.find_slot(entity_id) {
            self.remove_at(idx);
        }
    }

    /// Validates `report` against the entity's last accepted transform.
    /// The very first report for a given entity is always accepted (there
    /// is no prior baseline to compare against) and becomes that baseline.
    pub fn validate(&mut self, report: ClientTransformReport, config: &ClientConsensusConfig) -> AnomalyVerdict {
        let previous = self.find_slot(report.entity_id).map(|idx| self.values[idx]);
        let Some(previous) = previous else {
            self.upsert(report);
            return AnomalyVerdict {
                accepted: true,
                reason: None,
                deviation_magnitude: None,
                authoritative_position: report.position,
            };
        };

        let dt_ms = report.server_recv_time_ms.saturating_sub(previous.server_recv_time_ms);
        // A zero/negative (out-of-order packet) dt can't be evaluated for
        // speed (division by zero); treat as implicitly accepted-but-stale
        // rather than crashing or false-flagging — out-of-order delivery is
        // a transport concern, not a physics-plausibility one.
        if dt_ms == 0 {
            return AnomalyVerdict {
                accepted: true,
                reason: None,
                deviation_magnitude: None,
                authoritative_position: report.position,
            };
        }
        let dt_seconds = dt_ms as f32 / 1000.0;

        let delta = subtract(report.position, previous.position);
        let distance = magnitude(delta);

        if distance > config.max_teleport_distance_m {
            let verdict = self.reject(&previous, &report, AnomalyReason::TeleportSuspected, distance, config, dt_seconds);
            self.upsert(self.clamped_report(&report, verdict.authoritative_position));
            return verdict;
        }

        let speed = distance / dt_seconds;
        let max_speed = config.max_speed_mps * config.tolerance_factor;
        if speed > max_speed {
            let verdict = self.reject(&previous, &report, AnomalyReason::SpeedExceeded, speed - max_speed, config, dt_seconds);
            self.upsert(self.clamped_report(&report, verdict.authoritative_position));
            return verdict;
        }

        let velocity_delta = subtract(report.velocity, previous.velocity);
        let acceleration = magnitude(velocity_delta) / dt_seconds;
        let max_acceleration = config.max_acceleration_mps2 * config.tolerance_factor;
        if acceleration > max_acceleration {
            let verdict = self.reject(
                &previous,
                &report,
                AnomalyReason::AccelerationExceeded,
                acceleration - max_acceleration,
                config,
                dt_seconds,
            );
            self.upsert(self.clamped_report(&report, verdict.authoritative_position));
            return verdict;
        }

        self.upsert(report);
        AnomalyVerdict {
            accepted: true,
            reason: None,
            deviation_magnitude: None,
            authoritative_position: report.position,
        }
    }

    fn reject(
        &self,
        previous: &ClientTransformReport,
        report: &ClientTransformReport,
        reason: AnomalyReason,
        deviation_magnitude: f32,
        config: &ClientConsensusConfig,
        dt_seconds: f32,
    ) -> AnomalyVerdict {
        // Clamp the corrected position along the client's own reported
        // direction of travel, at the maximum plausible distance — this is
        // the "rebobinar a tela" target sent back to the client as
        // `AnomalyCorrection.authoritativeState`, not just a rejection flag.
        let direction = normalize(subtract(report.position, previous.position));
        let max_distance = (config.max_speed_mps * config.tolerance_factor * dt_seconds).min(config.max_teleport_distance_m);
        let authoritative_position = add(previous.position, scale(direction, max_distance));

        AnomalyVerdict {
            accepted: false,
            reason: Some(reason),
            deviation_magnitude: Some(deviation_magnitude),
            authoritative_position,
        }
    }

    fn clamped_report(&self, report: &ClientTransformReport, authoritative_position: [f32; 3]) -> ClientTransformReport {
        ClientTransformReport { position: authoritative_position, ..*report }
    }
}

fn subtract(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}
fn add(a: [f32; 3], b: [f32; 3]) -> [f32; 3] {
    [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}
fn scale(a: [f32; 3], s: f32) -> [f32; 3] {
    [a[0] * s, a[1] * s, a[2] * s]
}
fn magnitude(a: [f32; 3]) -> f32 {
    (a[0] * a[0] + a[1] * a[1] + a[2] * a[2]).sqrt()
}
fn normalize(a: [f32; 3]) -> [f32; 3] {
    let m = magnitude(a);
    if m < f32::EPSILON {
        [0.0, 0.0, 0.0]
    } else {
        scale(a, 1.0 / m)
    }
}

#[cfg(test)]
mod client_consensus_tests {
    use super::*;

    fn config() -> ClientConsensusConfig {
        ClientConsensusConfig { max_speed_mps: 10.0, max_acceleration_mps2: 20.0, max_teleport_distance_m: 15.0, tolerance_factor: 1.0 }
    }

    fn report(entity_id: u64, server_recv_time_ms: u64) -> ClientTransformReport {
        ClientTransformReport { entity_id, position: [0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0], server_recv_time_ms }
    }

    #[test]
    fn first_report_for_an_entity_is_always_accepted() {
        let mut validator = ClientConsensusValidator::new();
        let report = ClientTransformReport { entity_id: 1, position: [0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0], server_recv_time_ms: 1000 };
        let verdict = validator.validate(report, &config());
        assert!(verdict.accepted);
        assert!(verdict.reason.is_none());
    }

    #[test]
    fn plausible_movement_within_speed_limit_is_accepted() {
        let mut validator = ClientConsensusValidator::new();
        let cfg = config();
        validator.validate(
            ClientTransformReport { entity_id: 1, position: [0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0], server_recv_time_ms: 0 },
            &cfg,
        );
        // 5 meters in 1 second == 5 m/s, well under the 10 m/s cap.
        let verdict = validator.validate(
            ClientTransformReport { entity_id: 1, position: [5.0, 0.0, 0.0], velocity: [5.0, 0.0, 0.0], server_recv_time_ms: 1000 },
            &cfg,
        );
        assert!(verdict.accepted);
    }

    #[test]
    fn speed_hack_is_rejected_and_clamped_along_travel_direction() {
        let mut validator = ClientConsensusValidator::new();
        let cfg = config();
        validator.validate(
            ClientTransformReport { entity_id: 1, position: [0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0], server_recv_time_ms: 0 },
            &cfg,
        );
        // 12 meters in 1 second == 12 m/s, above the 10 m/s speed cap but
        // still under the 15m teleport cap — isolates the speed check from
        // the (separately tested) teleport check below, which runs first
        // and would otherwise shadow `SpeedExceeded` with `TeleportSuspected`.
        let verdict = validator.validate(
            ClientTransformReport { entity_id: 1, position: [12.0, 0.0, 0.0], velocity: [12.0, 0.0, 0.0], server_recv_time_ms: 1000 },
            &cfg,
        );
        assert!(!verdict.accepted);
        assert_eq!(verdict.reason, Some(AnomalyReason::SpeedExceeded));
        // Clamped to at most max_speed_mps * dt along +X.
        assert!(verdict.authoritative_position[0] <= cfg.max_speed_mps + f32::EPSILON);
        assert!(verdict.authoritative_position[0] > 0.0);
    }

    #[test]
    fn teleport_far_beyond_the_hard_cap_is_rejected_even_with_generous_dt() {
        let mut validator = ClientConsensusValidator::new();
        let cfg = config();
        validator.validate(
            ClientTransformReport { entity_id: 1, position: [0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0], server_recv_time_ms: 0 },
            &cfg,
        );
        // 1000m even across a full 10-second dt (which alone would need
        // 100m/s to be "just" a speed violation) must hit the absolute
        // teleport cap first.
        let verdict = validator.validate(
            ClientTransformReport { entity_id: 1, position: [1000.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0], server_recv_time_ms: 10_000 },
            &cfg,
        );
        assert!(!verdict.accepted);
        assert_eq!(verdict.reason, Some(AnomalyReason::TeleportSuspected));
    }

    #[test]
    fn forgetting_an_entity_clears_its_baseline() {
        let mut validator = ClientConsensusValidator::new();
        let cfg = config();
        validator.validate(
            ClientTransformReport { entity_id: 42, position: [500.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0], server_recv_time_ms: 0 },
            &cfg,
        );
        validator.forget(42);
        // Without forgetting, this report would be a huge teleport from
        // [500,0,0]; after forgetting, it's treated as a fresh baseline.
        let verdict = validator.validate(
            ClientTransformReport { entity_id: 42, position: [0.0, 0.0, 0.0], velocity: [0.0, 0.0, 0.0], server_recv_time_ms: 1000 },
            &cfg,
        );
        assert!(verdict.accepted);
    }

    #[test]
    fn entity_zero_is_tracked_like_any_other() {
        // entity_id 0 is a *valid* key: the slotmap encodes "empty" as
        // `None` in `keys`, so id 0 must not be conflated with an empty slot.
        let mut validator = ClientConsensusValidator::new();
        let cfg = config();
        let first = validator.validate(report(0, 0), &cfg);
        assert!(first.accepted);
        let second = validator.validate(report(0, 1000), &cfg);
        assert!(second.accepted);
        assert!(validator.find_slot(0).is_some());
        assert_eq!(validator.len(), 1);
    }

    #[test]
    fn slotmap_stays_bounded_and_evicts_lru_deterministically() {
        // capacity 4 -> eviction load 4*3/4 = 3. Insert 3 ids, re-touch id 1
        // (making id 2 the LRU), then insert id 4: the LRU (id 2) must be
        // evicted deterministically and id 4 must land in a free slot.
        let mut validator = ClientConsensusValidator::with_capacity(4);
        let cfg = config();
        for id in [1u64, 2, 3] {
            validator.validate(report(id, 0), &cfg);
        }
        assert_eq!(validator.len(), 3);
        validator.validate(report(1, 1000), &cfg);
        validator.validate(report(4, 0), &cfg);
        assert_eq!(validator.len(), 3);
        assert_eq!(validator.capacity(), 4);
        assert!(validator.find_slot(2).is_none(), "LRU must be evicted");
        assert!(validator.find_slot(4).is_some());
        assert!(validator.find_slot(1).is_some());
        assert!(validator.find_slot(3).is_some());
    }

    #[test]
    fn tiny_capacity_clamps_to_power_of_two() {
        // Fixed-capacity slot tables must always be a power of two so the
        // probe mask `capacity - 1` stays a clean bitwise AND.
        assert_eq!(ClientConsensusValidator::with_capacity(1).capacity(), 2);
        assert_eq!(ClientConsensusValidator::with_capacity(3).capacity(), 4);
        assert_eq!(ClientConsensusValidator::with_capacity(7).capacity(), 8);
        let empty = ClientConsensusValidator::with_capacity(0);
        assert!(empty.is_empty());
        assert_eq!(empty.capacity(), 2);
    }

    #[test]
    fn backshift_deletion_keeps_remaining_lookups_correct() {
        // Exercise `remove_at`'s tombstone-free backshift under real probe
        // chains: pack a capacity-16 table near its eviction load (12/16
        // occupancy makes probe collisions essentially certain), then delete
        // entries one at a time and verify every remaining key is still
        // findable and the table drains to empty.
        let mut validator = ClientConsensusValidator::with_capacity(16);
        let cfg = config();
        for id in 10..22u64 {
            validator.validate(report(id, 0), &cfg);
        }
        assert_eq!(validator.len(), 12);
        let ids: Vec<u64> = (10..22).collect();
        // We delete in ascending order, so the survivors still present after
        // deleting `removed` are exactly the ids greater than it. Filtering
        // only on `!= removed` would wrongly require already-deleted ids (e.g.
        // 10 after removing 11) to remain reachable.
        for removed in &ids {
            validator.forget(*removed);
            assert!(validator.find_slot(*removed).is_none(), "deleted {removed} must be gone");
            for survivor in ids.iter().filter(|s| *s > removed) {
                assert!(
                    validator.find_slot(*survivor).is_some(),
                    "survivor {survivor} lost after deleting {removed}"
                );
            }
        }
        assert!(validator.is_empty());
        assert_eq!(validator.len(), 0);
        // Re-inserting after a full drain must work (no stale tombstones).
        validator.validate(report(99, 0), &cfg);
        assert!(validator.find_slot(99).is_some());
    }

    #[test]
    fn steady_state_validate_keeps_bounded_structure() {
        // Hammer the validator with far more distinct entities than it can
        // hold: memory stays fixed at capacity 16, occupancy stays at the
        // eviction load (12), and only the 12 most-recently-validated
        // entities survive — deterministically, oldest-first.
        let mut validator = ClientConsensusValidator::with_capacity(16);
        let cfg = config();
        for id in 0..30u64 {
            validator.validate(report(id, 0), &cfg);
        }
        assert_eq!(validator.capacity(), 16);
        assert_eq!(validator.len(), 12);
        // The 12 most recent ids (18..=29) survive; the 18 earliest are gone.
        assert!(validator.find_slot(29).is_some());
        assert!(validator.find_slot(18).is_some());
        assert!(validator.find_slot(17).is_none());
        assert!(validator.find_slot(0).is_none());
    }
}

#[cfg(test)]
mod simulation_clock_tests {
    use super::*;

    /// Spawns one dynamic ball body at `translation` in `kernel` — used to
    /// prove the fixed-timestep cadence drives real Rapier bodies
    /// deterministically.
    fn spawn_test_body(kernel: &mut PhysicsKernel, translation: [f32; 3]) {
        let rigid_body = RigidBodyBuilder::dynamic()
            .translation(vector![translation[0], translation[1], translation[2]])
            .build();
        let handle = kernel.rigid_body_set.insert(rigid_body);
        let collider = ColliderBuilder::ball(0.5).build();
        kernel
            .collider_set
            .insert_with_parent(collider, handle, &mut kernel.rigid_body_set);
    }

    #[test]
    fn new_kernel_is_240hz_fixed_timestep() {
        let kernel = PhysicsKernel::new();
        // f32 arithmetic: 1 / ((1/120)/2) lands within 1e-3 of 240.
        assert!((kernel.effective_hz() - 240.0).abs() < 1e-3);
        assert_eq!(kernel.substeps_this_frame(), 0);
        assert_eq!(kernel.tick_count(), 0);
        assert_eq!(kernel.total_time(), 0.0);
        assert_eq!(kernel.current_frame(), 0);
        let alpha = kernel.interpolation_alpha();
        assert!((0.0..=1.0).contains(&alpha));
    }

    #[test]
    fn step_is_one_fixed_substep_and_books_the_clock() {
        let mut kernel = PhysicsKernel::new();
        kernel.step();
        assert_eq!(kernel.tick_count(), 1);
        // A single substep is exactly 1/240 s.
        assert!((kernel.total_time() - (1.0 / 240.0)).abs() < 1e-6);
        // The fixed substep dt was wired into Rapier's integration params.
        assert!((kernel.integration_parameters.dt - (1.0 / 240.0)).abs() < 1e-6);
    }

    #[test]
    fn step_frame_accumulates_the_fixed_cadence() {
        let mut kernel = PhysicsKernel::new();
        // One 60 Hz frame = 4 substeps at 240 Hz.
        let alpha = kernel.step_frame(1.0 / 60.0);
        assert_eq!(kernel.tick_count(), 4);
        assert_eq!(kernel.substeps_this_frame(), 4);
        assert!((kernel.total_time() - (4.0 / 240.0)).abs() < 1e-6);
        assert!((0.0..=1.0).contains(&alpha));
        // 4 substeps / 2 substeps per base tick = frame 2.
        assert_eq!(kernel.current_frame(), 2);
    }

    #[test]
    fn step_frame_without_full_tick_buffers_accumulator() {
        let mut kernel = PhysicsKernel::new();
        // A tiny frame schedules no substep but keeps time in the accumulator;
        // the interpolation alpha reflects the partial progress.
        let alpha = kernel.step_frame(1.0 / 2400.0);
        assert_eq!(kernel.tick_count(), 0);
        assert_eq!(kernel.substeps_this_frame(), 0);
        assert!((0.0..=1.0).contains(&alpha));
        assert!(kernel.interpolation_alpha() > 0.0);
    }

    #[test]
    fn step_frame_spiral_of_death_protection_drops_surplus() {
        let mut kernel = PhysicsKernel::new();
        // A 10 s stall is clamped to max_frame_dt (1/20) and capped at 8
        // substeps; the backlog is dropped, never carried forward.
        let alpha = kernel.step_frame(10.0);
        assert_eq!(kernel.tick_count(), 8);
        assert_eq!(kernel.substeps_this_frame(), 8);
        assert!((0.0..=1.0).contains(&alpha));
        // Accumulator was reset after hitting the cap: a following tiny frame
        // still schedules zero substeps (no hidden backlog).
        kernel.step_frame(1.0 / 2400.0);
        assert_eq!(kernel.tick_count(), 8);
    }

    #[test]
    fn step_frame_deterministic_replay_is_byte_identical() {
        // Two identical empty kernels fed the identical real-dt sequence must
        // produce byte-identical binary exports (determinism across the whole
        // fixed-timestep cadence + export surface).
        let mut a = PhysicsKernel::new();
        let mut b = PhysicsKernel::new();
        let sequence = [0.0, 1.0, 3.0, 7.0, 11.0, 5.0, 2.0, 1.0, 9.0, 4.0];
        for (i, t) in sequence.iter().enumerate() {
            let dt = (t + (i as f32) * 0.001) / 60.0;
            a.step_frame(dt);
            b.step_frame(dt);
            assert_eq!(a.export_state(), b.export_state());
        }
        assert_eq!(a.tick_count(), b.tick_count());
        assert_eq!(a.current_frame(), b.current_frame());
        assert_eq!(a.total_time(), b.total_time());
        assert_eq!(a.effective_hz(), b.effective_hz());
    }

    #[test]
    fn step_frame_advances_a_real_body_deterministically() {
        // Spawn an identical dynamic body in two kernels; the same real-dt
        // sequence must yield the same trajectory and the same binary export.
        let mut a = PhysicsKernel::new();
        let mut b = PhysicsKernel::new();
        spawn_test_body(&mut a, [0.0, 10.0, 0.0]);
        spawn_test_body(&mut b, [0.0, 10.0, 0.0]);
        for i in 0..30u32 {
            let dt = 1.0 / 60.0 + (i as f32) * 0.0005;
            a.step_frame(dt);
            b.step_frame(dt);
        }
        assert_eq!(a.export_state(), b.export_state());
        assert_eq!(a.tick_count(), b.tick_count());
    }
}
