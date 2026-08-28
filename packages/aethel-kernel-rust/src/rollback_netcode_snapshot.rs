//! Rollback Netcode Snapshot Engine — letter **rn** deepen.
//!
//! Deterministic fixed-dt snapshot ring + real rewind/re-simulate (not a no-op
//! comment stub). Instant-measured soak proves same inputs → same fingerprint.
//!
//! **Does not** claim GGPO-live product netcode or Unreal Replication Graph AAA.
//! **HELD:** `ggpo_live_ready: false` · marketing netcode claims · Coins / Nanite.

use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Default ring capacity (~1s @ 60Hz).
pub const SNAPSHOT_RING_CAPACITY: usize = 64;
/// Fixed dt for deterministic resim.
pub const ROLLBACK_FIXED_DT: f32 = 1.0 / 60.0;
/// Soak forward frames before correction.
pub const SOAK_FORWARD_FRAMES: u64 = 48;
/// Soak correction frame (must be < SOAK_FORWARD_FRAMES).
pub const SOAK_CORRECT_FRAME: u64 = 20;
/// Fingerprint seed ("rnsk").
const FP_SEED: u64 = 0x726e_736b;

/// A snapshot of an entity's physical state in a specific frame.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct EntitySnapshot {
    pub entity_id: u32,
    pub position: [f32; 3],
    pub velocity: [f32; 3],
    pub rotation_quat: [f32; 4],
}

impl EntitySnapshot {
    /// Deterministic integrate: pos += vel * dt; apply planar accel from input.
    pub fn integrate(&mut self, dt: f32, accel_x: f32, accel_z: f32) {
        self.velocity[0] += accel_x * dt;
        self.velocity[2] += accel_z * dt;
        self.position[0] += self.velocity[0] * dt;
        self.position[1] += self.velocity[1] * dt;
        self.position[2] += self.velocity[2] * dt;
    }
}

/// The entire ECS representation for a single tick.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct FrameSnapshot {
    pub frame_id: u64,
    pub entities: Vec<EntitySnapshot>,
    /// Buffered player input used to produce the *next* frame from this state.
    pub input_accel: [f32; 2],
    pub state_hash: u64,
}

impl FrameSnapshot {
    pub fn compute_hash(&self) -> u64 {
        let mut h = FP_SEED;
        h = hash_mix(h, self.frame_id);
        h = hash_mix(h, quant_f32(self.input_accel[0]));
        h = hash_mix(h, quant_f32(self.input_accel[1]));
        for e in &self.entities {
            h = hash_mix(h, u64::from(e.entity_id));
            h = hash_mix(h, quant_f32(e.position[0]));
            h = hash_mix(h, quant_f32(e.position[1]));
            h = hash_mix(h, quant_f32(e.position[2]));
            h = hash_mix(h, quant_f32(e.velocity[0]));
            h = hash_mix(h, quant_f32(e.velocity[1]));
            h = hash_mix(h, quant_f32(e.velocity[2]));
        }
        h
    }
}

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    ((v * 10_000.0).round() as i32) as u64
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

/// The core Rollback manager for fast-paced action.
pub struct RollbackNetcodeEngine {
    /// Ring buffer storing the last N frames.
    pub history_buffer: Vec<Option<FrameSnapshot>>,
    pub buffer_capacity: usize,
    pub current_frame: u64,
}

impl RollbackNetcodeEngine {
    pub fn new(capacity: usize) -> Self {
        let cap = capacity.max(2);
        Self {
            history_buffer: vec![None; cap],
            buffer_capacity: cap,
            current_frame: 0,
        }
    }

    /// Captures the current ECS state and stores it in the rolling buffer.
    pub fn save_frame_snapshot(
        &mut self,
        frame: u64,
        mut entities: Vec<EntitySnapshot>,
        input_accel: [f32; 2],
    ) {
        // Keep entity order stable for deterministic hashes.
        entities.sort_by_key(|e| e.entity_id);
        self.current_frame = frame;
        let index = (frame % self.buffer_capacity as u64) as usize;
        let mut snap = FrameSnapshot {
            frame_id: frame,
            entities,
            input_accel,
            state_hash: 0,
        };
        snap.state_hash = snap.compute_hash();
        self.history_buffer[index] = Some(snap);
    }

    /// Fetches a historical state. Used for Lag Compensation (Hit Registration).
    pub fn get_snapshot(&self, frame: u64) -> Option<&FrameSnapshot> {
        let index = (frame % self.buffer_capacity as u64) as usize;
        self.history_buffer[index]
            .as_ref()
            .filter(|s| s.frame_id == frame)
    }

    /// Advance one predicted frame from `from` using its stored input.
    pub fn simulate_next(&self, from: &FrameSnapshot, next_frame: u64, next_input: [f32; 2]) -> FrameSnapshot {
        let mut entities = from.entities.clone();
        let ax = from.input_accel[0];
        let az = from.input_accel[1];
        for e in &mut entities {
            e.integrate(ROLLBACK_FIXED_DT, ax, az);
        }
        entities.sort_by_key(|e| e.entity_id);
        let mut snap = FrameSnapshot {
            frame_id: next_frame,
            entities,
            input_accel: next_input,
            state_hash: 0,
        };
        snap.state_hash = snap.compute_hash();
        snap
    }

    /// Rewind to `authoritative_frame`, overwrite input, re-simulate to `current_frame`.
    ///
    /// Returns the number of frames re-simulated and the final state hash.
    pub fn rewind_and_resimulate(
        &mut self,
        authoritative_frame: u64,
        current_frame: u64,
        corrected_input: [f32; 2],
    ) -> Result<(u32, u64), &'static str> {
        if authoritative_frame >= current_frame {
            return Err("Cannot rewind to future frame");
        }
        if current_frame.saturating_sub(authoritative_frame) as usize >= self.buffer_capacity {
            return Err("Correction older than ring capacity");
        }

        let mut base = self
            .get_snapshot(authoritative_frame)
            .cloned()
            .ok_or("Authoritative frame lost in history buffer")?;
        base.input_accel = corrected_input;
        base.state_hash = base.compute_hash();
        let index = (authoritative_frame % self.buffer_capacity as u64) as usize;
        self.history_buffer[index] = Some(base.clone());

        let mut prev = base;
        let mut resim = 0u32;
        for f in authoritative_frame..current_frame {
            let next_id = f + 1;
            // Preserve originally buffered input for frames after the correction
            // when available; otherwise carry corrected input (prediction path).
            let next_input = self
                .get_snapshot(next_id)
                .map(|s| s.input_accel)
                .unwrap_or(corrected_input);
            let next = self.simulate_next(&prev, next_id, next_input);
            let idx = (next_id % self.buffer_capacity as u64) as usize;
            self.history_buffer[idx] = Some(next.clone());
            prev = next;
            resim = resim.saturating_add(1);
        }
        self.current_frame = current_frame;
        Ok((resim, prev.state_hash))
    }
}

/// Honesty probe structure for Rollback readiness (legacy shape).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RollbackNetcodeProbe {
    pub netcode_ready: bool,
    pub buffer_capacity: usize,
    pub snapshots_held: usize,
}

pub fn probe_rollback_netcode(engine: &RollbackNetcodeEngine) -> RollbackNetcodeProbe {
    let held = engine.history_buffer.iter().filter(|x| x.is_some()).count();
    let soak = run_rollback_netcode_snapshot_soak();
    RollbackNetcodeProbe {
        netcode_ready: soak.rollback_netcode_snapshot_ready,
        buffer_capacity: engine.buffer_capacity,
        snapshots_held: held,
    }
}

/// Instant-measured determinism soak — GGPO-live marketing fail-closed.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RollbackNetcodeSnapshotSoakReport {
    pub rollback_netcode_snapshot_ready: bool,
    pub rewind_resim_ok: bool,
    pub same_input_same_hash: bool,
    pub correction_changes_hash: bool,
    pub resimulated_frames: u32,
    pub hash_a: u64,
    pub hash_b: u64,
    pub hash_uncorrected: u64,
    pub soak_elapsed_ns: u128,
    pub mean_resim_ns: u128,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Fail-closed — no GGPO-live / marketing netcode claim.
    pub ggpo_live_ready: bool,
    pub netcode_marketing_ready: bool,
    pub unreal_replication_aaa_ready: bool,
    pub coins_ready: bool,
    pub nanite_ready: bool,
}

pub const RN_EVIDENCE_KIND: &str = "rollback_snapshot_rewind_resim_instant";

fn seed_forward(engine: &mut RollbackNetcodeEngine, frames: u64, accel: [f32; 2]) {
    let mut entities = vec![EntitySnapshot {
        entity_id: 1,
        position: [0.0, 0.0, 0.0],
        velocity: [0.0, 0.0, 0.0],
        rotation_quat: [0.0, 0.0, 0.0, 1.0],
    }];
    engine.save_frame_snapshot(0, entities.clone(), accel);
    for f in 0..frames {
        let prev = engine.get_snapshot(f).expect("seeded").clone();
        let next = engine.simulate_next(&prev, f + 1, accel);
        entities = next.entities.clone();
        engine.save_frame_snapshot(f + 1, entities, accel);
    }
}

/// Run Instant determinism soak: dual identical corrections + uncorrected contrast.
///
/// Does **not** flip `ggpo_live_ready`.
pub fn run_rollback_netcode_snapshot_soak() -> RollbackNetcodeSnapshotSoakReport {
    let t0 = Instant::now();

    let mut eng_a = RollbackNetcodeEngine::new(SNAPSHOT_RING_CAPACITY);
    seed_forward(&mut eng_a, SOAK_FORWARD_FRAMES, [2.0, 0.0]);
    let uncorrected = eng_a
        .get_snapshot(SOAK_FORWARD_FRAMES)
        .map(|s| s.state_hash)
        .unwrap_or(0);

    let t_resim = Instant::now();
    let (resim_a, hash_a) = eng_a
        .rewind_and_resimulate(SOAK_CORRECT_FRAME, SOAK_FORWARD_FRAMES, [-3.0, 1.0])
        .expect("resim a");
    let resim_ns_a = t_resim.elapsed().as_nanos();

    let mut eng_b = RollbackNetcodeEngine::new(SNAPSHOT_RING_CAPACITY);
    seed_forward(&mut eng_b, SOAK_FORWARD_FRAMES, [2.0, 0.0]);
    let t_resim_b = Instant::now();
    let (resim_b, hash_b) = eng_b
        .rewind_and_resimulate(SOAK_CORRECT_FRAME, SOAK_FORWARD_FRAMES, [-3.0, 1.0])
        .expect("resim b");
    let resim_ns_b = t_resim_b.elapsed().as_nanos();

    let same = hash_a == hash_b && hash_a != 0 && resim_a == resim_b;
    let changed = hash_a != uncorrected && uncorrected != 0;
    let rewind_ok = resim_a == (SOAK_FORWARD_FRAMES - SOAK_CORRECT_FRAME) as u32;
    let mean_resim_ns = (resim_ns_a + resim_ns_b) / 2;
    let elapsed = t0.elapsed().as_nanos();
    let core = same && changed && rewind_ok && elapsed > 0;

    let mut evidence = FP_SEED;
    evidence = hash_mix(evidence, hash_a);
    evidence = hash_mix(evidence, uncorrected);
    evidence = hash_mix(evidence, u64::from(core));
    evidence = hash_mix(evidence, mean_resim_ns as u64);

    RollbackNetcodeSnapshotSoakReport {
        rollback_netcode_snapshot_ready: core && evidence != 0,
        rewind_resim_ok: rewind_ok,
        same_input_same_hash: same,
        correction_changes_hash: changed,
        resimulated_frames: resim_a,
        hash_a,
        hash_b,
        hash_uncorrected: uncorrected,
        soak_elapsed_ns: elapsed,
        mean_resim_ns,
        evidence_kind: RN_EVIDENCE_KIND,
        evidence_fingerprint: evidence,
        ggpo_live_ready: false,
        netcode_marketing_ready: false,
        unreal_replication_aaa_ready: false,
        coins_ready: false,
        nanite_ready: false,
    }
}

/// Honesty probe — soak-gated; GGPO-live always fail-closed.
pub fn probe_rollback_netcode_snapshot() -> RollbackNetcodeSnapshotSoakReport {
    run_rollback_netcode_snapshot_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rollback_netcode_snapshot_storage_and_rewind() {
        let mut engine = RollbackNetcodeEngine::new(64);

        for f in 1..=10 {
            let state = vec![EntitySnapshot {
                entity_id: 1,
                position: [f as f32, 0.0, 0.0],
                velocity: [1.0, 0.0, 0.0],
                rotation_quat: [0.0, 0.0, 0.0, 1.0],
            }];
            engine.save_frame_snapshot(f, state, [0.0, 0.0]);
        }

        let historic = engine.get_snapshot(5).unwrap();
        assert_eq!(historic.entities[0].position[0], 5.0);

        let (resim, hash) = engine.rewind_and_resimulate(5, 10, [1.0, 0.0]).unwrap();
        assert_eq!(resim, 5);
        assert_ne!(hash, 0);

        let probe = probe_rollback_netcode(&engine);
        assert!(probe.netcode_ready);
        assert!(probe.snapshots_held >= 10);
    }

    #[test]
    fn soak_determinism_ggpo_live_held() {
        let r = run_rollback_netcode_snapshot_soak();
        assert!(r.rollback_netcode_snapshot_ready, "{r:?}");
        assert!(r.same_input_same_hash);
        assert!(r.correction_changes_hash);
        assert!(r.rewind_resim_ok);
        assert_eq!(r.hash_a, r.hash_b);
        assert!(r.soak_elapsed_ns > 0);
        assert_eq!(r.evidence_kind, RN_EVIDENCE_KIND);
        assert!(!r.ggpo_live_ready);
        assert!(!r.netcode_marketing_ready);
        assert!(!r.unreal_replication_aaa_ready);
        assert!(!r.nanite_ready);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_rollback_netcode_snapshot_soak();
        let b = probe_rollback_netcode_snapshot();
        assert_eq!(a.rollback_netcode_snapshot_ready, b.rollback_netcode_snapshot_ready);
        assert_eq!(a.hash_a, b.hash_a);
        assert!(!a.ggpo_live_ready);
    }
}
