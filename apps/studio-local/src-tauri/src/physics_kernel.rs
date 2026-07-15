use rapier3d::prelude::*;
use std::collections::HashMap;

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
    pub broad_phase: BroadPhaseMultiSap,
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
            broad_phase: BroadPhaseMultiSap::new(),
            narrow_phase: NarrowPhase::new(),
            impulse_joint_set: ImpulseJointSet::new(),
            multibody_joint_set: MultibodyJointSet::new(),
            ccd_solver: CCDSolver::new(),
            query_pipeline: QueryPipeline::new(),
            gravity: vector![0.0, -9.81, 0.0],
            client_consensus: ClientConsensusValidator::new(),
            client_consensus_config: ClientConsensusConfig::default(),
        }
    }

    /// Advances the physics simulation by one tick
    pub fn step(&mut self) {
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
    }

    /// PILAR 4 entry point: validate a client's self-reported transform for
    /// an entity this kernel is NOT fully simulating (i.e. not backed by a
    /// `RigidBody` in `rigid_body_set`). Delegates to `client_consensus`
    /// using this kernel's configured tolerance bounds.
    pub fn validate_client_transform(&mut self, report: ClientTransformReport) -> AnomalyVerdict {
        self.client_consensus.validate(report, &self.client_consensus_config)
    }

    /// Serializes every fully-simulated rigid body's transform into a flat
    /// binary buffer for `physics_commands.rs#poll_physics_state`'s Tauri
    /// IPC `Response` — little-endian `u32` body count, then per body:
    /// `u32` handle index + 3×`f32` translation + 4×`f32` rotation
    /// (quaternion x,y,z,w). A fixed-layout binary export (vs. JSON) keeps
    /// this cheap enough to call once per rendered frame from the desktop
    /// viewport without allocation-heavy (de)serialization on the hot path.
    pub fn export_state(&self) -> Vec<u8> {
        let mut buffer = Vec::with_capacity(4 + self.rigid_body_set.len() * (4 + 12 + 16));
        buffer.extend_from_slice(&(self.rigid_body_set.len() as u32).to_le_bytes());

        for (handle, body) in self.rigid_body_set.iter() {
            let translation = body.translation();
            let rotation = body.rotation();

            buffer.extend_from_slice(&(handle.into_raw_parts().0).to_le_bytes());
            buffer.extend_from_slice(&translation.x.to_le_bytes());
            buffer.extend_from_slice(&translation.y.to_le_bytes());
            buffer.extend_from_slice(&translation.z.to_le_bytes());
            // `rotation: &UnitQuaternion<f32>` derefs (Unit<Q> -> Quaternion
            // -> IJKW) to expose `.i`/`.j`/`.k`/`.w` as plain fields — see
            // nalgebra's `impl Deref<Target = IJKW> for Quaternion`. These
            // are NOT methods; do not add `()`.
            buffer.extend_from_slice(&rotation.i.to_le_bytes());
            buffer.extend_from_slice(&rotation.j.to_le_bytes());
            buffer.extend_from_slice(&rotation.k.to_le_bytes());
            buffer.extend_from_slice(&rotation.w.to_le_bytes());
        }

        buffer
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

/// Server-side registry of last-known-good transforms, one per entity
/// currently running under client authority. Cheap by design: O(1)
/// arithmetic per report, no Rapier query, no broad/narrow-phase — this is
/// exactly the CPU saving PILAR 4 asks for.
#[derive(Default)]
pub struct ClientConsensusValidator {
    last_known_good: HashMap<u64, ClientTransformReport>,
}

impl ClientConsensusValidator {
    pub fn new() -> Self {
        Self { last_known_good: HashMap::new() }
    }

    /// Removes an entity's tracked state (e.g. on disconnect/despawn) so a
    /// stale baseline never causes a false-positive `teleport_suspected` if
    /// the entity ID is later reused.
    pub fn forget(&mut self, entity_id: u64) {
        self.last_known_good.remove(&entity_id);
    }

    /// Validates `report` against the entity's last accepted transform.
    /// The very first report for a given entity is always accepted (there
    /// is no prior baseline to compare against) and becomes that baseline.
    pub fn validate(&mut self, report: ClientTransformReport, config: &ClientConsensusConfig) -> AnomalyVerdict {
        let Some(previous) = self.last_known_good.get(&report.entity_id).copied() else {
            self.last_known_good.insert(report.entity_id, report);
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
            self.last_known_good.insert(report.entity_id, self.clamped_report(&report, verdict.authoritative_position));
            return verdict;
        }

        let speed = distance / dt_seconds;
        let max_speed = config.max_speed_mps * config.tolerance_factor;
        if speed > max_speed {
            let verdict = self.reject(&previous, &report, AnomalyReason::SpeedExceeded, speed - max_speed, config, dt_seconds);
            self.last_known_good.insert(report.entity_id, self.clamped_report(&report, verdict.authoritative_position));
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
            self.last_known_good.insert(report.entity_id, self.clamped_report(&report, verdict.authoritative_position));
            return verdict;
        }

        self.last_known_good.insert(report.entity_id, report);
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
        // 100 meters in 1 second == 100 m/s, far above the 10 m/s cap.
        let verdict = validator.validate(
            ClientTransformReport { entity_id: 1, position: [100.0, 0.0, 0.0], velocity: [100.0, 0.0, 0.0], server_recv_time_ms: 1000 },
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
}
