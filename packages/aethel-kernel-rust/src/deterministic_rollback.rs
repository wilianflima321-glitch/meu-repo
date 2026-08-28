//! # S-22 Kernel Deterministic Rollback Authority (doctrine #73 — Kernel Physics Supremacy;
//! letter **g21**; "Deepen & Robustify" register S-22).
//!
//! Composed OVER the real [`PhysicsWorld`] substrate — the [`RollbackJournal`] ring, the
//! [`WorldCheckpoint`] captures and the input-replay `rollback_to` — with **zero substrate
//! edits**. This is a fail-closed authority that PROVES, from a single deterministic seed:
//!
//! - **golden determinism** — two independent worlds, identical script → identical fingerprints
//!   at EVERY captured checkpoint;
//! - **divergence detection** — a single divergent input changes the final fingerprint;
//! - **rollback pre-divergence identical** — the checkpoint immediately before the divergence
//!   applies is bit-identical (journal-level clone, no re-simulation);
//! - **rollback reproduces fingerprint** — `PhysicsWorld::rollback_to` re-simulates through the
//!   FULL private input log (divergent inputs are re-applied) and reproduces the divergent
//!   fingerprint bit-for-bit;
//! - **repair trajectory converges** — because the substrate `input_log` is private and there is
//!   no pub input-removal API, the honest repair is re-executing the corrected script on an
//!   independent world; the gate proves it converges back to golden;
//! - **journal bound** — ring eviction is fail-closed (`get(evicted)` → `None`, rollback to an
//!   evicted/missing frame → `false`);
//! - **clock cadence** — 120 Hz × 2 substeps = 240 Hz effective, exact tick/time accounting;
//! - **finite outputs** — every checkpoint body field across all worlds is finite.
//!
//! AAA / product / S-27 cross-domain (Physics↔GAS) duplex readiness are **HELD false**
//! (fail-closed). This authority is deterministic evidence, never a feature claim.

use serde::{Deserialize, Serialize};

use crate::physics_world::{
    InputCommand, PhysicsWorld, PhysicsWorldConfig, UnifiedEntityId,
};

// ============================================================================
// Constants
// ============================================================================

/// Machine-readable evidence kind.
pub const DETERMINISTIC_ROLLBACK_EVIDENCE_KIND: &str = "deterministic_rollback_authority";
/// Fingerprint seed ("g21").
const DR_FP_SEED: u64 = 0x67_3231;
/// Canonical soak seed ("g21" + 2020 soak).
pub const DETERMINISTIC_ROLLBACK_SOAK_SEED: u64 = 0x67_3231_2020_5EED;
/// Fixed-tick frames driven in the golden/divergent scripts.
pub const DETERMINISTIC_ROLLBACK_SOAK_FRAMES: u32 = 24;
/// Journal capacity for the authority worlds (frame 0 must survive the soak).
pub const DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY: usize = 32;
/// Dynamic bodies spawned per world.
pub const DETERMINISTIC_ROLLBACK_BODIES: usize = 4;
/// Frame at which the divergent extra input is recorded (targets `PRE_DIVERGE_FRAME` + 1).
const DIVERGE_RECORD_FRAME: u32 = 12;
/// Checkpoint still identical to golden (captured before the divergence applies).
const PRE_DIVERGE_FRAME: u64 = 13;
/// First checkpoint guaranteed to expose the divergence.
const DIVERGE_FIRST_DIVERGENT: u64 = 14;
/// Rollback target for the re-simulation reproduction proof (well before divergence).
const ROLLBACK_FRAME: u64 = 4;
/// Ring capacity for the eviction fail-closed probe.
const EVICTION_CAPACITY: usize = 8;
/// Frames driven in the eviction probe (must exceed `EVICTION_CAPACITY`).
const EVICTION_FRAMES: u32 = 16;
/// Deterministic spawn layout for the dynamic bodies.
const BODY_SPAWNS: [[f32; 3]; 4] = [
    [0.0, 5.0, 0.0],
    [2.0, 6.0, 0.0],
    [-2.0, 7.0, 0.0],
    [0.0, 8.0, 1.0],
];

// ============================================================================
// Deterministic helpers (shared AA fingerprinting vocabulary)
// ============================================================================

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xFFFF_FFFF_FFFF_FFFF;
    }
    let bits = v.to_bits();
    u64::from(bits >> 1) ^ u64::from(bits & 1)
}

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x
        .wrapping_add(0x9E37_79B9_7F4A_7C15)
        .wrapping_add(h << 6)
        .wrapping_add(h >> 2);
    h
}

fn xorshift64(mut x: u64) -> u64 {
    x ^= x << 13;
    x ^= x >> 7;
    x ^= x << 17;
    x
}

// ============================================================================
// Soak report
// ============================================================================

/// Deterministic rollback authority soak report (camelCase wire contract).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeterministicRollbackSoakReport {
    /// Machine-readable evidence kind.
    pub evidence_kind: &'static str,
    /// True when every evidence gate below is green.
    pub ready: bool,
    /// Two independent identical scripts match at every checkpoint.
    pub golden_determinism: bool,
    /// A single divergent input changes the final fingerprint.
    pub divergence_detected: bool,
    /// Checkpoint just before divergence is bit-identical across worlds.
    pub rollback_pre_divergence_identical: bool,
    /// Rollback → re-sim reproduces the divergent fingerprint bit-for-bit.
    pub rollback_reproduces_fingerprint: bool,
    /// Corrected script re-executed on an independent world converges to golden.
    pub repair_trajectory_converges: bool,
    /// Ring eviction is fail-closed (evicted frames are not retrievable).
    pub journal_bound_holds: bool,
    /// Rollback to a missing/evicted frame returns false without mutation.
    pub rollback_missing_fails_closed: bool,
    /// 120 Hz × 2 substeps = 240 Hz with exact tick/time accounting.
    pub clock_fixed_cadence_ok: bool,
    /// Every floating-point output across all worlds is finite.
    pub all_outputs_finite: bool,
    /// Same seed reproduces an identical golden fingerprint.
    pub deterministic_same_seed: bool,
    /// Different seeds produce distinct fingerprints.
    pub distinct_evidence_across_seeds: bool,
    /// Effective fused cadence in Hz (240.0 for 120 Hz × 2 substeps).
    pub effective_hz: f32,
    /// Substep subdivision count.
    pub substeps: u32,
    /// Total simulated time (seconds).
    pub total_time: f64,
    /// Base-tick frame reached by the golden world.
    pub current_frame: u64,
    /// Solver substeps actually executed.
    pub tick_count: u64,
    /// Unconsumed time in the accumulator (seconds).
    pub accumulator: f32,
    /// Render interpolation alpha at the last finish_frame.
    pub interpolation_alpha: f32,
    /// Dynamic bodies spawned per world.
    pub bodies_spawned: u64,
    /// Fixed-tick frames driven per script.
    pub frames_driven: u64,
    /// Journal ring capacity of the authority worlds.
    pub journal_capacity: u64,
    /// Golden (correct) final fingerprint.
    pub golden_fingerprint: u64,
    /// Divergent final fingerprint.
    pub divergent_fingerprint: u64,
    /// Repaired (corrected re-execution) final fingerprint.
    pub repaired_fingerprint: u64,
    /// Frame the rollback re-simulation proof targeted.
    pub rollback_frame: u64,
    /// Frame proven identical across worlds (pre-divergence).
    pub pre_divergence_frame: u64,
    /// Deterministic evidence fingerprint.
    pub evidence_fingerprint: u64,
    /// AAA readiness — HELD false (fail-closed).
    pub deterministic_rollback_aaa_ready: bool,
    /// Product readiness — HELD false (fail-closed).
    pub deterministic_rollback_product_ready: bool,
    /// Full Physics↔GAS cross-domain rollback duplex (S-27) — HELD false.
    pub cross_domain_rollback_ready: bool,
}

impl DeterministicRollbackSoakReport {
    /// True when every floating-point field is finite.
    pub fn is_finite(&self) -> bool {
        self.effective_hz.is_finite()
            && self.total_time.is_finite()
            && self.accumulator.is_finite()
            && self.interpolation_alpha.is_finite()
    }
}

// ============================================================================
// Soak
// ============================================================================

fn deterministic_rollback_evidence_fingerprint(r: &DeterministicRollbackSoakReport) -> u64 {
    let mut h = hash_mix(DR_FP_SEED, r.ready as u64);
    h = hash_mix(h, r.golden_determinism as u64);
    h = hash_mix(h, r.divergence_detected as u64);
    h = hash_mix(h, r.rollback_pre_divergence_identical as u64);
    h = hash_mix(h, r.rollback_reproduces_fingerprint as u64);
    h = hash_mix(h, r.repair_trajectory_converges as u64);
    h = hash_mix(h, r.journal_bound_holds as u64);
    h = hash_mix(h, r.rollback_missing_fails_closed as u64);
    h = hash_mix(h, r.clock_fixed_cadence_ok as u64);
    h = hash_mix(h, r.all_outputs_finite as u64);
    h = hash_mix(h, r.deterministic_same_seed as u64);
    h = hash_mix(h, r.distinct_evidence_across_seeds as u64);
    h = hash_mix(h, quant_f32(r.effective_hz));
    h = hash_mix(h, u64::from(r.substeps));
    h = hash_mix(h, quant_f32(r.total_time as f32));
    h = hash_mix(h, r.current_frame);
    h = hash_mix(h, r.tick_count);
    h = hash_mix(h, quant_f32(r.accumulator));
    h = hash_mix(h, quant_f32(r.interpolation_alpha));
    h = hash_mix(h, r.bodies_spawned);
    h = hash_mix(h, r.frames_driven);
    h = hash_mix(h, r.journal_capacity);
    h = hash_mix(h, r.golden_fingerprint);
    h = hash_mix(h, r.divergent_fingerprint);
    h = hash_mix(h, r.repaired_fingerprint);
    h = hash_mix(h, r.rollback_frame);
    h = hash_mix(h, r.pre_divergence_frame);
    h
}

/// Spawns `count` dynamic bodies at the deterministic layout.
fn spawn_bodies(world: &mut PhysicsWorld, count: usize) -> Vec<UnifiedEntityId> {
    BODY_SPAWNS
        .iter()
        .take(count)
        .map(|&t| world.spawn_euphoria_torso_at(t))
        .collect()
}

/// Generates the next deterministic command from the shared rng stream.
fn next_command(rng: &mut u64) -> InputCommand {
    *rng = xorshift64(*rng);
    match *rng % 3 {
        0 => InputCommand::Impulse([
            ((*rng >> 8) % 2000) as f32 / 100.0,
            ((*rng >> 16) % 2000) as f32 / 100.0,
            ((*rng >> 24) % 2000) as f32 / 100.0,
        ]),
        1 => InputCommand::TorqueImpulse([
            ((*rng >> 8) % 1000) as f32 / 100.0,
            ((*rng >> 16) % 1000) as f32 / 100.0,
            ((*rng >> 24) % 1000) as f32 / 100.0,
        ]),
        _ => InputCommand::SetVelocity([
            ((*rng >> 8) % 4000) as f32 / 100.0 - 20.0,
            ((*rng >> 16) % 4000) as f32 / 100.0 - 20.0,
            ((*rng >> 24) % 4000) as f32 / 100.0 - 20.0,
        ]),
    }
}

/// Drives a world for `frames` fixed ticks (each `1/120 s`) with a deterministic
/// per-frame command script generated from `seed`. When `inject_divergence` is
/// true, an extra hard `SetVelocity` command is recorded at `DIVERGE_RECORD_FRAME`
/// (targeting `PRE_DIVERGE_FRAME` + 1) WITHOUT consuming rng — so the shared
/// command stream stays identical to the golden run.
fn drive_script(
    world: &mut PhysicsWorld,
    ids: &[UnifiedEntityId],
    seed: u64,
    frames: u32,
    inject_divergence: bool,
) {
    let mut rng = seed;
    for f in 0..frames {
        for &id in ids {
            world.record_input(id, next_command(&mut rng));
        }
        if inject_divergence && f == DIVERGE_RECORD_FRAME {
            world.record_input(ids[0], InputCommand::SetVelocity([80.0, 40.0, 0.0]));
        }
        world.step(1.0 / 120.0);
    }
}

/// True when every checkpoint `0..=frames` exists and carries an identical
/// fingerprint in both journals.
fn checkpoints_identical(a: &PhysicsWorld, b: &PhysicsWorld, frames: u32) -> bool {
    for f in 0..=u64::from(frames) {
        let ca = a.journal.get(f);
        let cb = b.journal.get(f);
        match (ca, cb) {
            (Some(x), Some(y)) => {
                if x.frame_id != y.frame_id || x.fingerprint != y.fingerprint {
                    return false;
                }
            }
            _ => return false,
        }
    }
    true
}

/// True when every checkpoint body field in `world` is finite.
fn all_checkpoints_finite(world: &PhysicsWorld, frames: u32) -> bool {
    for f in 0..=u64::from(frames) {
        let Some(cp) = world.journal.get(f) else {
            return false;
        };
        for b in &cp.bodies {
            for c in b.position {
                if !c.is_finite() {
                    return false;
                }
            }
            for c in b.rotation {
                if !c.is_finite() {
                    return false;
                }
            }
            for c in b.linvel {
                if !c.is_finite() {
                    return false;
                }
            }
            for c in b.angvel {
                if !c.is_finite() {
                    return false;
                }
            }
        }
    }
    true
}

/// Runs the full S-22 evidence soak with a deterministic seed.
pub fn run_deterministic_rollback_soak_seeded(seed: u64) -> DeterministicRollbackSoakReport {
    let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;

    // --- golden + twin determinism (every checkpoint identical) ---
    let mut golden = PhysicsWorld::with_config(PhysicsWorldConfig {
        journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
        ..Default::default()
    });
    let golden_ids = spawn_bodies(&mut golden, DETERMINISTIC_ROLLBACK_BODIES);
    drive_script(&mut golden, &golden_ids, seed, frames, false);
    let golden_fp = golden.fingerprint();
    let bodies_spawned = golden_ids.len();

    let mut twin = PhysicsWorld::with_config(PhysicsWorldConfig {
        journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
        ..Default::default()
    });
    let twin_ids = spawn_bodies(&mut twin, DETERMINISTIC_ROLLBACK_BODIES);
    drive_script(&mut twin, &twin_ids, seed, frames, false);
    let twin_fp = twin.fingerprint();
    let deterministic_same_seed = golden_fp == twin_fp;
    let golden_determinism = deterministic_same_seed && checkpoints_identical(&golden, &twin, frames);

    // --- divergent world (one extra hard command) ---
    let mut divergent = PhysicsWorld::with_config(PhysicsWorldConfig {
        journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
        ..Default::default()
    });
    let divergent_ids = spawn_bodies(&mut divergent, DETERMINISTIC_ROLLBACK_BODIES);
    drive_script(&mut divergent, &divergent_ids, seed, frames, true);
    let divergent_fp = divergent.fingerprint();
    let divergence_detected = divergent_fp != golden_fp
        && match (
            golden.journal.get(DIVERGE_FIRST_DIVERGENT),
            divergent.journal.get(DIVERGE_FIRST_DIVERGENT),
        ) {
            (Some(cg), Some(cd)) => cg.fingerprint != cd.fingerprint,
            _ => false,
        };

    // --- pre-divergence checkpoint bit-identical (journal clone, no re-sim) ---
    let pre_divergence_identical = match (
        golden.journal.get(PRE_DIVERGE_FRAME),
        divergent.journal.get(PRE_DIVERGE_FRAME),
    ) {
        (Some(cg), Some(cd)) => {
            cg.frame_id == cd.frame_id
                && cg.fingerprint == cd.fingerprint
                && cg.bodies.len() == cd.bodies.len()
                && cg.bodies.iter().zip(cd.bodies.iter()).all(|(a, b)| {
                    a.unified_id_raw == b.unified_id_raw
                        && a.position == b.position
                        && a.rotation == b.rotation
                        && a.linvel == b.linvel
                        && a.angvel == b.angvel
                })
        }
        _ => false,
    };

    // --- rollback re-sim reproduces the divergent fingerprint bit-for-bit ---
    let divergent_fp_before = divergent.fingerprint();
    let rollback_ok = divergent.rollback_to(ROLLBACK_FRAME);
    let rollback_reproduces_fingerprint =
        rollback_ok && divergent_fp_before == divergent.fingerprint();

    // --- repair: corrected script on an independent world converges to golden ---
    let mut repaired = PhysicsWorld::with_config(PhysicsWorldConfig {
        journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
        ..Default::default()
    });
    let repaired_ids = spawn_bodies(&mut repaired, DETERMINISTIC_ROLLBACK_BODIES);
    drive_script(&mut repaired, &repaired_ids, seed, frames, false);
    let repaired_fp = repaired.fingerprint();
    let repair_trajectory_converges = repaired_fp == golden_fp && repaired_fp != divergent_fp;

    // --- journal bound: ring eviction fail-closed ---
    let mut evict = PhysicsWorld::with_config(PhysicsWorldConfig {
        journal_capacity: EVICTION_CAPACITY,
        ..Default::default()
    });
    spawn_bodies(&mut evict, 2);
    for _ in 0..EVICTION_FRAMES {
        evict.step(1.0 / 120.0);
    }
    let journal_bound_holds = evict.journal.latest_frame_id() == u64::from(EVICTION_FRAMES)
        && evict.journal.get(0).is_none()
        && evict.journal.get(u64::from(EVICTION_FRAMES)).is_some()
        && !evict.rollback_to(0);

    // --- rollback to a missing frame fails closed without mutation ---
    let rollback_missing_fails_closed =
        !golden.rollback_to(u64::from(frames) + 1) && golden.clock.current_frame() == u64::from(frames);

    // --- distinct seeds produce distinct fingerprints ---
    let mut alt = PhysicsWorld::with_config(PhysicsWorldConfig {
        journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
        ..Default::default()
    });
    let alt_ids = spawn_bodies(&mut alt, DETERMINISTIC_ROLLBACK_BODIES);
    drive_script(&mut alt, &alt_ids, seed ^ 0xDEAD_BEEF, frames, false);
    let alt_fp = alt.fingerprint();
    let distinct_evidence_across_seeds = alt_fp != golden_fp;

    // --- clock cadence + finiteness over the golden authority ---
    let effective_hz = golden.clock.effective_hz();
    let substeps = golden.clock.substeps();
    let total_time = golden.clock.total_time();
    let current_frame = golden.clock.current_frame();
    let tick_count = golden.clock.tick_count();
    let accumulator = golden.clock.accumulator();
    let interpolation_alpha = golden.clock.interpolation_alpha();
    let clock_fixed_cadence_ok = current_frame == u64::from(frames)
        && tick_count == u64::from(frames) * u64::from(substeps)
        && (total_time - f64::from(frames) / 120.0).abs() < 1e-6
        && (239.9..=240.1).contains(&effective_hz)
        && (0.0..=1.0).contains(&interpolation_alpha)
        && accumulator.abs() < 1e-6;
    let all_outputs_finite = effective_hz.is_finite()
        && total_time.is_finite()
        && accumulator.is_finite()
        && interpolation_alpha.is_finite()
        && all_checkpoints_finite(&golden, frames)
        && all_checkpoints_finite(&twin, frames)
        && all_checkpoints_finite(&divergent, frames);

    let ready = golden_determinism
        && divergence_detected
        && pre_divergence_identical
        && rollback_reproduces_fingerprint
        && repair_trajectory_converges
        && journal_bound_holds
        && rollback_missing_fails_closed
        && clock_fixed_cadence_ok
        && all_outputs_finite
        && deterministic_same_seed
        && distinct_evidence_across_seeds;

    let mut report = DeterministicRollbackSoakReport {
        evidence_kind: DETERMINISTIC_ROLLBACK_EVIDENCE_KIND,
        ready,
        golden_determinism,
        divergence_detected,
        rollback_pre_divergence_identical: pre_divergence_identical,
        rollback_reproduces_fingerprint,
        repair_trajectory_converges,
        journal_bound_holds,
        rollback_missing_fails_closed,
        clock_fixed_cadence_ok,
        all_outputs_finite,
        deterministic_same_seed,
        distinct_evidence_across_seeds,
        effective_hz,
        substeps,
        total_time,
        current_frame,
        tick_count,
        accumulator,
        interpolation_alpha,
        bodies_spawned: bodies_spawned as u64,
        frames_driven: u64::from(frames),
        journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY as u64,
        golden_fingerprint: golden_fp,
        divergent_fingerprint: divergent_fp,
        repaired_fingerprint: repaired_fp,
        rollback_frame: ROLLBACK_FRAME,
        pre_divergence_frame: PRE_DIVERGE_FRAME,
        evidence_fingerprint: 0,
        deterministic_rollback_aaa_ready: false,
        deterministic_rollback_product_ready: false,
        cross_domain_rollback_ready: false,
    };
    report.evidence_fingerprint = deterministic_rollback_evidence_fingerprint(&report);
    report
}

/// Runs the full S-22 evidence soak with the canonical seed.
pub fn run_deterministic_rollback_soak() -> DeterministicRollbackSoakReport {
    run_deterministic_rollback_soak_seeded(DETERMINISTIC_ROLLBACK_SOAK_SEED)
}

/// Probe entry point — delegates to the soak (honest fail-closed reporting).
pub fn probe_deterministic_rollback() -> DeterministicRollbackSoakReport {
    run_deterministic_rollback_soak()
}

// ============================================================================
// Tests — S-22 deterministic rollback authority
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;
    use crate::physics_world::{SubstepMode, WorldCheckpoint};

    /// Shared helper: golden fp + divergent fp from the same seed.
    fn golden_and_divergent_fps(seed: u64, frames: u32) -> (u64, u64) {
        let mut g = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_g = spawn_bodies(&mut g, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut g, &ids_g, seed, frames, false);
        let mut d = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_d = spawn_bodies(&mut d, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut d, &ids_d, seed, frames, true);
        (g.fingerprint(), d.fingerprint())
    }

    #[test]
    fn golden_twin_checkpoints_identical_and_fp_nonzero() {
        let seed = 0xABCD_1234;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let mut a = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_a = spawn_bodies(&mut a, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut a, &ids_a, seed, frames, false);
        let mut b = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_b = spawn_bodies(&mut b, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut b, &ids_b, seed, frames, false);
        assert_ne!(a.fingerprint(), 0);
        assert_eq!(a.fingerprint(), b.fingerprint());
        assert!(checkpoints_identical(&a, &b, frames));
    }

    #[test]
    fn divergent_input_changes_fingerprint() {
        let seed = 0xFEED_BEEF;
        let (golden_fp, divergent_fp) =
            golden_and_divergent_fps(seed, DETERMINISTIC_ROLLBACK_SOAK_FRAMES);
        assert_ne!(golden_fp, divergent_fp);
    }

    #[test]
    fn pre_divergence_checkpoint_identical_across_worlds() {
        let seed = 0x0BAD_F00D;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let mut g = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_g = spawn_bodies(&mut g, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut g, &ids_g, seed, frames, false);
        let mut d = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_d = spawn_bodies(&mut d, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut d, &ids_d, seed, frames, true);
        let cg = g.journal.get(PRE_DIVERGE_FRAME).expect("golden pre-divergence");
        let cd = d.journal.get(PRE_DIVERGE_FRAME).expect("divergent pre-divergence");
        assert_eq!(cg.fingerprint, cd.fingerprint);
        assert_eq!(cg.bodies, cd.bodies);
    }

    #[test]
    fn divergence_visible_from_first_divergent_frame_forward() {
        let seed = 0x5150_5105;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let mut g = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_g = spawn_bodies(&mut g, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut g, &ids_g, seed, frames, false);
        let mut d = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_d = spawn_bodies(&mut d, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut d, &ids_d, seed, frames, true);
        let cg_pre = g.journal.get(PRE_DIVERGE_FRAME).expect("golden pre");
        let cd_pre = d.journal.get(PRE_DIVERGE_FRAME).expect("divergent pre");
        assert_eq!(cg_pre.fingerprint, cd_pre.fingerprint);
        let cg_post = g.journal.get(DIVERGE_FIRST_DIVERGENT).expect("golden post");
        let cd_post = d.journal.get(DIVERGE_FIRST_DIVERGENT).expect("divergent post");
        assert_ne!(cg_post.fingerprint, cd_post.fingerprint);
    }

    #[test]
    fn rollback_re_sim_reproduces_divergent_fingerprint() {
        let seed = 0x1234_5678;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let mut d = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_d = spawn_bodies(&mut d, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut d, &ids_d, seed, frames, true);
        let before = d.fingerprint();
        assert!(d.rollback_to(ROLLBACK_FRAME));
        assert_eq!(before, d.fingerprint());
        assert_eq!(before, d.journal.latest_fingerprint());
    }

    #[test]
    fn full_rewind_to_frame_zero_reproduces_divergent_fingerprint() {
        let seed = 0xDEAD_BEEF;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let mut d = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_d = spawn_bodies(&mut d, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut d, &ids_d, seed, frames, true);
        let before = d.fingerprint();
        assert!(d.rollback_to(0));
        assert_eq!(before, d.fingerprint());
        assert_eq!(d.clock.current_frame(), u64::from(frames));
    }

    /// Single command-type stream driver (kind 0=Impulse, 1=TorqueImpulse,
    /// 2=SetVelocity) with the same rng consumption shape as `next_command`.
    fn drive_fixed(
        world: &mut PhysicsWorld,
        ids: &[UnifiedEntityId],
        seed: u64,
        frames: u32,
        kind: u8,
    ) {
        let mut rng = seed;
        for _ in 0..frames {
            for &id in ids {
                rng = xorshift64(rng);
                let cmd = match kind {
                    0 => InputCommand::Impulse([
                        ((rng >> 8) % 2000) as f32 / 100.0,
                        ((rng >> 16) % 2000) as f32 / 100.0,
                        ((rng >> 24) % 2000) as f32 / 100.0,
                    ]),
                    1 => InputCommand::TorqueImpulse([
                        ((rng >> 8) % 1000) as f32 / 100.0,
                        ((rng >> 16) % 1000) as f32 / 100.0,
                        ((rng >> 24) % 1000) as f32 / 100.0,
                    ]),
                    _ => InputCommand::SetVelocity([
                        ((rng >> 8) % 4000) as f32 / 100.0 - 20.0,
                        ((rng >> 16) % 4000) as f32 / 100.0 - 20.0,
                        ((rng >> 24) % 4000) as f32 / 100.0 - 20.0,
                    ]),
                };
                world.record_input(id, cmd);
            }
            world.step(1.0 / 120.0);
        }
    }

    /// Runs a single scenario and returns the first frame whose re-simulated
    /// checkpoint fingerprint diverges from the original (None = bit-exact).
    /// kind: 0xFF = no inputs, 0xFE = canonical mixed `drive_script`,
    ///       0/1/2 = single command-type `drive_fixed`.
    fn replay_first_divergence(
        seed: u64,
        frames: u32,
        spawns: &[[f32; 3]],
        kind: u8,
    ) -> Option<u64> {
        let mut w = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids: Vec<UnifiedEntityId> = spawns
            .iter()
            .map(|&t| w.spawn_euphoria_torso_at(t))
            .collect();
        match kind {
            0xFF => {
                for _ in 0..frames {
                    w.step(1.0 / 120.0);
                }
            }
            0xFE => drive_script(&mut w, &ids, seed, frames, true),
            k => drive_fixed(&mut w, &ids, seed, frames, k),
        }
        let original: Vec<Option<WorldCheckpoint>> = (0..=u64::from(frames))
            .map(|f| w.journal.get(f).cloned())
            .collect();
        let ok = w.rollback_to(ROLLBACK_FRAME);
        assert!(ok, "rollback_to must succeed");
        (0..=u64::from(frames)).find(|&f| {
            let a = original[f as usize].as_ref().map(|c| c.fingerprint);
            let b = w.journal.get(f).map(|c| c.fingerprint);
            a != b
        })
    }

    /// Regression lock for the S-22 root cause: `restore_checkpoint` must NOT
    /// re-normalize the captured quaternion. `UnitQuaternion::from_quaternion`
    /// erased the ~1 ULP non-unitarity drift left by the Rapier integrator,
    /// corrupting `effective_world_inv_inertia_sqrt` used by
    /// `apply_torque_impulse` and breaking bit-exact replay of angular inputs.
    /// Every scenario — pure restore, linear-only, torque-only and mixed — must
    /// replay bit-exact after the fix (`UnitQuaternion::new_unchecked`).
    #[test]
    fn rollback_replays_torque_and_mixed_inputs_bit_exact() {
        let seed = 0x1234_5678;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;

        // 0xFF -> no inputs at all         (pure Rapier restore fidelity)
        // 0xFE -> per-frame mixed commands (the failing soak scenario)
        // 0/1/2 -> single command-type stream on far-apart spawns (no collisions)
        let far: [[f32; 3]; 4] = [
            [0.0, 5.0, 0.0],
            [0.0, 25.0, 0.0],
            [0.0, 45.0, 0.0],
            [0.0, 65.0, 0.0],
        ];
        let cases: [(&str, &[[f32; 3]], u8); 6] = [
            ("no-input", &BODY_SPAWNS, 0xFF),
            ("mixed-close", &BODY_SPAWNS, 0xFE),
            ("mixed-far", &far, 0xFE),
            ("impulse-only-far", &far, 0),
            ("torque-only-far", &far, 1),
            ("setvel-only-far", &far, 2),
        ];
        for (label, spawns, kind) in cases {
            let div = replay_first_divergence(seed, frames, spawns, kind);
            assert!(
                div.is_none(),
                "S-22 re-sim diverged at frame {div:?} [{label}]"
            );
        }
    }

    #[test]
    fn corrected_replay_converges_to_golden() {
        let seed = 0xCAFE_1234;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let (golden_fp, divergent_fp) = golden_and_divergent_fps(seed, frames);
        let mut r = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_r = spawn_bodies(&mut r, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut r, &ids_r, seed, frames, false);
        assert_eq!(r.fingerprint(), golden_fp);
        assert_ne!(r.fingerprint(), divergent_fp);
    }

    #[test]
    fn journal_eviction_fail_closed() {
        let mut w = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: EVICTION_CAPACITY,
            ..Default::default()
        });
        spawn_bodies(&mut w, 2);
        for _ in 0..EVICTION_FRAMES {
            w.step(1.0 / 120.0);
        }
        assert_eq!(w.journal.latest_frame_id(), u64::from(EVICTION_FRAMES));
        assert!(w.journal.get(0).is_none());
        assert!(w.journal.get(u64::from(EVICTION_FRAMES)).is_some());
        assert!(!w.rollback_to(0));
    }

    #[test]
    fn rollback_to_missing_frame_fails_closed() {
        let seed = 42;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let mut w = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_w = spawn_bodies(&mut w, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut w, &ids_w, seed, frames, false);
        assert!(!w.rollback_to(u64::from(frames) + 1));
        assert_eq!(w.clock.current_frame(), u64::from(frames));
        assert_eq!(w.journal.latest_frame_id(), u64::from(frames));
    }

    #[test]
    fn clock_fixed_cadence_exact() {
        let seed = 7;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let mut w = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_w = spawn_bodies(&mut w, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut w, &ids_w, seed, frames, false);
        let substeps = w.clock.substeps();
        assert_eq!(w.clock.current_frame(), u64::from(frames));
        assert_eq!(w.clock.tick_count(), u64::from(frames) * u64::from(substeps));
        assert!((w.clock.total_time() - f64::from(frames) / 120.0).abs() < 1e-6);
        assert!((239.9..=240.1).contains(&w.clock.effective_hz()));
        assert!((0.0..=1.0).contains(&w.clock.interpolation_alpha()));
        assert!(w.clock.accumulator().abs() < 1e-6);
    }

    #[test]
    fn all_checkpoint_bodies_finite() {
        let seed = 99;
        let frames = DETERMINISTIC_ROLLBACK_SOAK_FRAMES;
        let mut g = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_g = spawn_bodies(&mut g, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut g, &ids_g, seed, frames, false);
        let mut d = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        let ids_d = spawn_bodies(&mut d, DETERMINISTIC_ROLLBACK_BODIES);
        drive_script(&mut d, &ids_d, seed, frames, true);
        assert!(all_checkpoints_finite(&g, frames));
        assert!(all_checkpoints_finite(&d, frames));
    }

    #[test]
    fn soak_ready_flips_and_aaa_fail_closed() {
        let r = run_deterministic_rollback_soak();
        assert!(r.ready, "deterministic rollback authority must be green");
        assert!(!r.deterministic_rollback_aaa_ready);
        assert!(!r.deterministic_rollback_product_ready);
        assert!(!r.cross_domain_rollback_ready);
        assert!(r.is_finite());
        assert_eq!(r.evidence_kind, DETERMINISTIC_ROLLBACK_EVIDENCE_KIND);
    }

    #[test]
    fn soak_fingerprint_deterministic_same_seed() {
        let a = run_deterministic_rollback_soak_seeded(0x2222_2222);
        let b = run_deterministic_rollback_soak_seeded(0x2222_2222);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.golden_fingerprint, b.golden_fingerprint);
    }

    #[test]
    fn soak_distinct_evidence_across_seeds() {
        let a = run_deterministic_rollback_soak_seeded(0x1111_1111);
        let b = run_deterministic_rollback_soak_seeded(0x2222_2222);
        assert_ne!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_ne!(a.golden_fingerprint, b.golden_fingerprint);
    }

    #[test]
    fn probe_matches_soak() {
        let p = probe_deterministic_rollback();
        let s = run_deterministic_rollback_soak();
        assert_eq!(p.evidence_fingerprint, s.evidence_fingerprint);
        assert_eq!(p.ready, s.ready);
        assert_eq!(p.golden_fingerprint, s.golden_fingerprint);
    }

    #[test]
    fn record_input_targets_next_fixed_frame() {
        let mut w = PhysicsWorld::new();
        let id = w.spawn_euphoria_torso_at([0.0, 2.0, 0.0]);
        let t0 = w.clock.current_frame();
        let target = w.record_input(id, InputCommand::Impulse([1.0, 0.0, 0.0]));
        assert_eq!(target, t0 + 1);
    }

    #[test]
    fn substep_mode_defaults_to_rapier_only() {
        let w = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: DETERMINISTIC_ROLLBACK_JOURNAL_CAPACITY,
            ..Default::default()
        });
        assert_eq!(w.substep_mode(), SubstepMode::RapierOnly);
    }

    #[test]
    fn effective_hz_is_240() {
        let mut w = PhysicsWorld::new();
        w.step(1.0 / 120.0);
        assert!((239.9..=240.1).contains(&w.clock.effective_hz()));
        assert_eq!(w.clock.substeps(), 2);
        assert_eq!(w.clock.tick_count(), 2);
    }

    #[test]
    fn quant_f32_finite_and_nan_fail_closed() {
        let q_zero = quant_f32(0.0);
        let q_one = quant_f32(1.0);
        let q_neg = quant_f32(-1.0);
        let q_nan = quant_f32(f32::NAN);
        let q_inf = quant_f32(f32::INFINITY);

        assert_ne!(q_zero, q_one);
        assert_ne!(q_one, q_neg);
        assert_eq!(q_nan, 0xFFFF_FFFF_FFFF_FFFF);
        assert_eq!(q_inf, 0xFFFF_FFFF_FFFF_FFFF);
    }

    #[test]
    fn hash_mix_avalanche_and_determinism() {
        let h0 = hash_mix(0x1234_5678_9ABC_DEF0, 42);
        let h1 = hash_mix(0x1234_5678_9ABC_DEF0, 43); // 1-bit difference in x
        assert_ne!(h0, h1);

        // Multiple rounds with xorshift64 achieve full diffusion
        let d0 = xorshift64(h0);
        let d1 = xorshift64(h1);
        assert_ne!(d0, d1);

        // Determinism
        let h0_repeat = hash_mix(0x1234_5678_9ABC_DEF0, 42);
        assert_eq!(h0, h0_repeat);
    }

    #[test]
    fn multi_step_inertial_trajectory_continuity() {
        let mut w = PhysicsWorld::with_config(PhysicsWorldConfig {
            journal_capacity: 32,
            ..Default::default()
        });
        let _id = w.spawn_euphoria_torso_at([0.0, 10.0, 0.0]);

        // Step 10 frames
        for _ in 0..10 {
            w.step(1.0 / 120.0);
        }

        // Body must have fallen under gravity continuously and stay finite
        if let Some(cp) = w.journal.get(10) {
            assert!(!cp.bodies.is_empty());
            let pos_y = cp.bodies[0].position[1];
            assert!(pos_y.is_finite());
            assert!(pos_y < 10.0, "Body must fall downwards under gravity: {pos_y}");
        }
    }
}
