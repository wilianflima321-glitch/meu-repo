//! Entropy × Rapier bridge — couple Voronoi destruction chunks to physics bodies.
//!
//! Goes beyond the 64-chunk GPU toy substrate: fractures a measured seed count
//! (≥256) and inserts matching Rapier dynamic spheres, then Instant-ticks the
//! shared physics kernel. Proves debris bodies exist and move under gravity.
//!
//! **Does not** claim Unreal Chaos destruction AAA / Niagara / GPU Voronoi product.
//! **HELD:** `chaos_destruction_aaa_ready: false` · Nanite / Lumen / Coins.

use crate::physics_kernel::{PhysicsKernel, SOAK_FIXED_DT};
use crate::voronoi_destruction_3d::{
    VoronoiDestruction3D, VoronoiFragmentSoA, DEFAULT_YIELD_STRESS,
};
use nalgebra::Vector3;
use rapier3d::prelude::*;
use serde::{Deserialize, Serialize};
use std::time::Instant;

/// Beyond GPU toy 64 — bridge soak target body/chunk count.
pub const BRIDGE_CHUNK_TARGET: usize = 256;
/// Physics ticks after spawn for motion evidence.
pub const BRIDGE_PHYSICS_TICKS: u32 = 45;
/// Fingerprint seed ("erpb").
const FP_SEED: u64 = 0x6572_7062;

fn hash_mix(mut h: u64, x: u64) -> u64 {
    h ^= x.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h = h.rotate_left(27).wrapping_mul(0x517C_C1B7_2722_0A95);
    h
}

fn quant_f32(v: f32) -> u64 {
    if !v.is_finite() {
        return 0xDEAD_BEEF;
    }
    ((v * 10_000.0).round() as i32) as u64
}

fn lattice_seeds(count: usize) -> Vec<[f32; 3]> {
    let side = ((count as f32).cbrt().ceil() as usize).max(2);
    let mut seeds = Vec::with_capacity(count);
    let inv = 1.0 / (side as f32);
    for iz in 0..side {
        for iy in 0..side {
            for ix in 0..side {
                if seeds.len() >= count {
                    return seeds;
                }
                seeds.push([
                    -1.0 + (ix as f32 + 0.5) * 2.0 * inv,
                    2.0 + (iy as f32 + 0.5) * 2.0 * inv,
                    -1.0 + (iz as f32 + 0.5) * 2.0 * inv,
                ]);
            }
        }
    }
    seeds
}

/// Spawn one Rapier dynamic sphere per active Voronoi fragment (mass-scaled radius).
///
/// Returns number of bodies inserted. Uses kernel public sets — zero GPU path.
pub fn spawn_entropy_chunks_into_rapier(
    kernel: &mut PhysicsKernel,
    fragments: &VoronoiFragmentSoA,
) -> usize {
    let n = fragments.len().min(fragments.active.len());
    let mut spawned = 0usize;
    for i in 0..n {
        if !fragments.active[i] {
            continue;
        }
        let mass = fragments.mass[i].max(1e-3);
        let radius = (fragments.volume[i].max(1e-4) / (4.0 / 3.0 * std::f32::consts::PI))
            .cbrt()
            .clamp(0.05, 0.5);
        let body = RigidBodyBuilder::dynamic()
            .translation(Vector3::new(
                fragments.center_x[i],
                fragments.center_y[i],
                fragments.center_z[i],
            ))
            .linvel(Vector3::new(
                fragments.vel_x[i],
                fragments.vel_y[i],
                fragments.vel_z[i],
            ))
            .additional_mass(mass)
            .build();
        let collider = ColliderBuilder::ball(radius).restitution(0.2).build();
        let handle = kernel.rigid_body_set.insert(body);
        kernel
            .collider_set
            .insert_with_parent(collider, handle, &mut kernel.rigid_body_set);
        spawned += 1;
    }
    spawned
}

/// Instant-measured Entropy×Rapier bridge soak report.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EntropyRapierBridgeSoakReport {
    pub entropy_rapier_bridge_ready: bool,
    pub beyond_toy_64: bool,
    pub bodies_spawned: u32,
    pub fragment_count: u32,
    pub mass_conserved: bool,
    pub gravity_mutates_com_y: bool,
    pub outputs_finite: bool,
    pub mean_tick_ns: u128,
    pub soak_elapsed_ns: u128,
    pub com_y_before: f32,
    pub com_y_after: f32,
    pub evidence_kind: &'static str,
    pub evidence_fingerprint: u64,
    /// Fail-closed — do not claim Unreal Chaos AAA.
    pub chaos_destruction_aaa_ready: bool,
    pub unreal_chaos_parity_ready: bool,
    pub nanite_ready: bool,
    pub lumen_ready: bool,
    pub coins_ready: bool,
}

pub const ERPB_EVIDENCE_KIND: &str = "voronoi_fragments_to_rapier_bodies";

fn mean_com_y(kernel: &PhysicsKernel) -> (f32, bool) {
    let mut sum = 0.0_f32;
    let mut count = 0u32;
    let mut finite = true;
    for (_, body) in kernel.rigid_body_set.iter() {
        let y = body.translation().y;
        if !y.is_finite() {
            finite = false;
            continue;
        }
        sum += y;
        count += 1;
    }
    if count == 0 {
        (0.0, false)
    } else {
        (sum / count as f32, finite)
    }
}

/// Fracture ≥256 chunks → Rapier bodies → Instant gravity ticks.
///
/// Does **not** claim Chaos destruction AAA.
pub fn run_entropy_rapier_bridge_soak() -> EntropyRapierBridgeSoakReport {
    let t0 = Instant::now();
    let seeds = lattice_seeds(BRIDGE_CHUNK_TARGET);
    let fragment_count = seeds.len() as u32;
    let mut fragments = VoronoiFragmentSoA::with_capacity(BRIDGE_CHUNK_TARGET);
    let solver = VoronoiDestruction3D::new(DEFAULT_YIELD_STRESS * 0.1);
    let total_mass = 256.0_f32;
    let step = solver.compute_fracture(
        total_mass,
        [-2.0, 0.0, -2.0],
        [2.0, 6.0, 2.0],
        [0.0, 3.0, 0.0],
        [0.0, -500.0, 0.0],
        DEFAULT_YIELD_STRESS * 2.0,
        &seeds,
        &mut fragments,
    );

    let mut kernel = PhysicsKernel::new();
    let spawned = spawn_entropy_chunks_into_rapier(&mut kernel, &fragments);
    let (y_before, finite_before) = mean_com_y(&kernel);

    let mut tick_sum = 0u128;
    for _ in 0..BRIDGE_PHYSICS_TICKS {
        let tick_t0 = Instant::now();
        kernel.tick_rapier_only(SOAK_FIXED_DT);
        tick_sum = tick_sum.saturating_add(tick_t0.elapsed().as_nanos());
    }
    let mean_tick_ns = tick_sum / u128::from(BRIDGE_PHYSICS_TICKS);
    let (y_after, finite_after) = mean_com_y(&kernel);
    let elapsed = t0.elapsed().as_nanos();

    let beyond = spawned > 64;
    let gravity_mutates = y_after < y_before - 0.01;
    let finite = finite_before && finite_after && step.mass_conserved;
    let core_ok = beyond
        && spawned == BRIDGE_CHUNK_TARGET
        && step.fractured
        && step.mass_conserved
        && gravity_mutates
        && finite
        && mean_tick_ns > 0
        && elapsed > 0;

    let mut evidence = FP_SEED;
    evidence = hash_mix(evidence, spawned as u64);
    evidence = hash_mix(evidence, quant_f32(y_before));
    evidence = hash_mix(evidence, quant_f32(y_after));
    evidence = hash_mix(evidence, mean_tick_ns as u64);
    evidence = hash_mix(evidence, u64::from(core_ok));

    EntropyRapierBridgeSoakReport {
        entropy_rapier_bridge_ready: core_ok && evidence != 0,
        beyond_toy_64: beyond,
        bodies_spawned: spawned as u32,
        fragment_count,
        mass_conserved: step.mass_conserved,
        gravity_mutates_com_y: gravity_mutates,
        outputs_finite: finite,
        mean_tick_ns,
        soak_elapsed_ns: elapsed,
        com_y_before: y_before,
        com_y_after: y_after,
        evidence_kind: ERPB_EVIDENCE_KIND,
        evidence_fingerprint: evidence,
        chaos_destruction_aaa_ready: false,
        unreal_chaos_parity_ready: false,
        nanite_ready: false,
        lumen_ready: false,
        coins_ready: false,
    }
}

/// Honesty probe — soak-gated `entropy_rapier_bridge_ready`.
pub fn probe_entropy_rapier_bridge() -> EntropyRapierBridgeSoakReport {
    run_entropy_rapier_bridge_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn spawn_count_matches_active_fragments() {
        let seeds = lattice_seeds(128);
        let mut fragments = VoronoiFragmentSoA::with_capacity(128);
        let solver = VoronoiDestruction3D::new(1.0e5);
        let step = solver.compute_fracture(
            128.0,
            [-1.0, 0.0, -1.0],
            [1.0, 4.0, 1.0],
            [0.0, 2.0, 0.0],
            [10.0, 0.0, 0.0],
            2.0e5,
            &seeds,
            &mut fragments,
        );
        assert!(step.fractured);
        let mut kernel = PhysicsKernel::new();
        let n = spawn_entropy_chunks_into_rapier(&mut kernel, &fragments);
        assert_eq!(n, fragments.count_active());
        assert_eq!(kernel.rigid_body_set.len(), n);
    }

    #[test]
    fn soak_beyond_64_chaos_aaa_held() {
        let r = run_entropy_rapier_bridge_soak();
        assert!(r.entropy_rapier_bridge_ready, "{r:?}");
        assert!(r.beyond_toy_64);
        assert!(r.bodies_spawned > 64);
        assert_eq!(r.bodies_spawned, BRIDGE_CHUNK_TARGET as u32);
        assert!(r.gravity_mutates_com_y);
        assert!(r.mass_conserved);
        assert!(r.soak_elapsed_ns > 0);
        assert_eq!(r.evidence_kind, ERPB_EVIDENCE_KIND);
        assert!(!r.chaos_destruction_aaa_ready);
        assert!(!r.unreal_chaos_parity_ready);
        assert!(!r.nanite_ready);
        assert!(!r.lumen_ready);
    }

    #[test]
    fn probe_matches_soak_ready() {
        let a = run_entropy_rapier_bridge_soak();
        let b = probe_entropy_rapier_bridge();
        assert_eq!(a.entropy_rapier_bridge_ready, b.entropy_rapier_bridge_ready);
        assert_eq!(a.bodies_spawned, b.bodies_spawned);
        assert!(!a.chaos_destruction_aaa_ready);
    }
}
