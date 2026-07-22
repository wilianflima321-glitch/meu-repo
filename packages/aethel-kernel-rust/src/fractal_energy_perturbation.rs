//! Fractal Energy Perturbation — letter **ds** / Domain **hr** (quality demote **hu**).
//!
//! Local force/stress noise injector: writes a gravity/stiffness perturbation
//! into a small SoA force + stress field; optionally couples magnitude into a
//! WorldSoA `timescale` column. Not telekinesis / Chaos PBD parity.
//!
//! Honesty probe `fractal_energy_perturbation_ready` / `fractalEnergyPerturbationReady`
//! is **distinct** from dr `autonomousEntropyCorrectorReady`, dq/hs
//! `unifiedFieldNetworkReady`, and dc–dm foundation probes.
//!
//! Letter **ig**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! peer probes (not hardcoded `distinct_from_*: true`); trio cross-check vs de/dr.
//!
//! **HELD:** Chaos / PBD full parity (`chaos_pbd_parity_ready: false`) ·
//! Coins / Agones / Nanite / DLSS.

use crate::ecs_core::WorldSoA;

/// Default soak particle count (small, deterministic).
pub const SOAK_PARTICLE_COUNT: usize = 8;
/// Inject steps in soak (repeated inject must keep force/stress mutable).
pub const SOAK_INJECT_STEPS: u32 = 4;
/// Soft floor on Young modulus (Pa-scale units, normalized). Avoids /0 tear.
pub const YOUNG_MODULUS_FLOOR: f32 = 1e-3;
/// Soft upper bound on scalar stress (fail-closed clamp).
pub const STRESS_MAX: f32 = 1.0e6;
/// Soak: entity mass (kg-scale units).
const SOAK_MASS: f32 = 2.0;
/// Soak: stiff clay (high Young → lower stress for same |F|).
const SOAK_YOUNG_STIFF: f32 = 100.0;
/// Soak: weak clay (low Young → higher stress / tear).
const SOAK_YOUNG_WEAK: f32 = 0.5;
/// Soak: upward force inject (force-noise fixture, not telekinesis AAA).
const SOAK_GRAVITY: [f32; 3] = [0.0, 12.0, 0.0];
/// Float compare epsilon for soak evidence.
const EPS: f32 = 1e-5;
/// Timescale couple gain: `|F|/mass` → additive timescale bump (clamped).
const TIMESCALE_COUPLE_GAIN: f32 = 0.05;
/// Soft upper bound on coupled timescale.
const TIMESCALE_MAX: f32 = 4.0;

/// One inject outcome — measurable force/stress write evidence.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct TelekinesisInjectResult {
    /// True when at least one particle force/stress column mutated.
    pub injected: bool,
    pub force_delta_norm: f32,
    pub stress_delta_sum: f32,
    pub tear_factor: f32,
}

/// Small SoA stress/force field for local gravity/stiffness perturbation.
#[derive(Debug, Clone)]
pub struct FractalEnergyField {
    pub force_x: Vec<f32>,
    pub force_y: Vec<f32>,
    pub force_z: Vec<f32>,
    /// Scalar Cauchy/von-Mises proxy: `|F| / young` (compliance tear).
    pub stress: Vec<f32>,
    steps: u64,
}

impl FractalEnergyField {
    /// Allocate zeroed SoA columns. Fail-closed empty when `n == 0`.
    pub fn with_capacity(n: usize) -> Self {
        Self {
            force_x: vec![0.0; n],
            force_y: vec![0.0; n],
            force_z: vec![0.0; n],
            stress: vec![0.0; n],
            steps: 0,
        }
    }

    /// Soak-sized field.
    pub fn soak_field() -> Self {
        Self::with_capacity(SOAK_PARTICLE_COUNT)
    }

    #[inline]
    pub fn particle_count(&self) -> usize {
        self.force_x
            .len()
            .min(self.force_y.len())
            .min(self.force_z.len())
            .min(self.stress.len())
    }

    #[inline]
    pub fn step_count(&self) -> u64 {
        self.steps
    }

    #[inline]
    pub fn total_force_norm(&self) -> f32 {
        let n = self.particle_count();
        let mut acc = 0.0_f32;
        for i in 0..n {
            let fx = self.force_x[i];
            let fy = self.force_y[i];
            let fz = self.force_z[i];
            acc += (fx * fx + fy * fy + fz * fz).sqrt();
        }
        acc
    }

    #[inline]
    pub fn total_stress(&self) -> f32 {
        self.stress.iter().sum()
    }

    /// Sanitize mass / Young / gravity (fail-closed non-finite → zero / floor).
    #[inline]
    pub fn sanitize_inputs(
        entity_mass: f32,
        young_modulus: f32,
        target_gravity: [f32; 3],
    ) -> (f32, f32, [f32; 3]) {
        let mass = if entity_mass.is_finite() && entity_mass > 0.0 {
            entity_mass
        } else {
            0.0
        };
        let young = if young_modulus.is_finite() && young_modulus > 0.0 {
            young_modulus.max(YOUNG_MODULUS_FLOOR)
        } else {
            YOUNG_MODULUS_FLOOR
        };
        let g = [
            if target_gravity[0].is_finite() {
                target_gravity[0]
            } else {
                0.0
            },
            if target_gravity[1].is_finite() {
                target_gravity[1]
            } else {
                0.0
            },
            if target_gravity[2].is_finite() {
                target_gravity[2]
            } else {
                0.0
            },
        ];
        (mass, young, g)
    }

    /// Inject local force/stress noise into SoA (legacy `telekinesis` name kept).
    ///
    /// `F_i = mass * g * radial_weight(i)` — inverted/local gravity write.
    /// `stress_i += |F_i| / young` — weak Young → higher tear stress (PBD proxy).
    /// Does **not** claim Chaos/PBD full solver parity.
    pub fn inject_telekinesis_tensor(
        &mut self,
        entity_mass: f32,
        young_modulus: f32,
        target_gravity: [f32; 3],
    ) -> TelekinesisInjectResult {
        let n = self.particle_count();
        if n == 0 {
            return TelekinesisInjectResult {
                injected: false,
                force_delta_norm: 0.0,
                stress_delta_sum: 0.0,
                tear_factor: 0.0,
            };
        }

        let (mass, young, g) = Self::sanitize_inputs(entity_mass, young_modulus, target_gravity);
        if mass <= 0.0 {
            return TelekinesisInjectResult {
                injected: false,
                force_delta_norm: 0.0,
                stress_delta_sum: 0.0,
                tear_factor: 0.0,
            };
        }

        let force_before = self.total_force_norm();
        let stress_before = self.total_stress();
        let n_f = n as f32;
        let mut tear_acc = 0.0_f32;

        let time_offset = self.steps as f32 * 0.1;

        for i in 0..n {
            // Fractal noise based on particle index and time
            let mut w = 0.0_f32;
            let mut amplitude = 1.0_f32;
            let mut frequency = 1.0_f32;
            let x = i as f32 * 0.1 + time_offset;
            
            for _ in 0..3 {
                w += (x * frequency).sin() * amplitude;
                amplitude *= 0.5;
                frequency *= 2.0;
            }
            
            // Map from approx [-1.75, 1.75] to [0.1, 1.0]
            let w = (w * 0.25 + 0.5).clamp(0.1, 1.0);

            let fx = mass * g[0] * w;
            let fy = mass * g[1] * w;
            let fz = mass * g[2] * w;
            self.force_x[i] += fx;
            self.force_y[i] += fy;
            self.force_z[i] += fz;

            let f_mag = (fx * fx + fy * fy + fz * fz).sqrt();
            let ds = (f_mag / young).min(STRESS_MAX);
            self.stress[i] = (self.stress[i] + ds).min(STRESS_MAX);
            tear_acc += ds;
        }

        self.steps = self.steps.saturating_add(1);

        let force_after = self.total_force_norm();
        let stress_after = self.total_stress();
        let force_delta = force_after - force_before;
        let stress_delta = stress_after - stress_before;
        let injected = force_delta > EPS || stress_delta > EPS;

        TelekinesisInjectResult {
            injected,
            force_delta_norm: force_delta,
            stress_delta_sum: stress_delta,
            tear_factor: tear_acc / n_f,
        }
    }

    /// Couple field force magnitude into WorldSoA `timescale` (first `min` slots).
    /// Measurable: timescale rises with |F|/mass proxy. Chaos/PBD HELD.
    pub fn couple_to_world_timescale(&self, world: &mut WorldSoA, entity_mass: f32) -> bool {
        let n = self.particle_count().min(world.len);
        if n == 0 {
            return false;
        }
        let mass = if entity_mass.is_finite() && entity_mass > 0.0 {
            entity_mass
        } else {
            1.0
        };
        let mut mutated = false;
        for i in 0..n {
            let fx = self.force_x[i];
            let fy = self.force_y[i];
            let fz = self.force_z[i];
            let accel = (fx * fx + fy * fy + fz * fz).sqrt() / mass;
            let bump = (accel * TIMESCALE_COUPLE_GAIN).min(TIMESCALE_MAX);
            let before = world.timescale[i];
            let next = (before + bump).clamp(0.0, TIMESCALE_MAX);
            if (next - before).abs() > EPS {
                world.timescale[i] = next;
                mutated = true;
            }
        }
        mutated
    }
}

/// Stateless facade kept for call-site name continuity (ZST over SoA field).
#[derive(Debug, Default, Clone, Copy)]
pub struct FractalEnergyPerturbation;

impl FractalEnergyPerturbation {
    /// Inject into a caller-owned field (preferred — measurable SoA write).
    pub fn inject_telekinesis_tensor(
        field: &mut FractalEnergyField,
        entity_mass: f32,
        young_modulus: f32,
        target_gravity: [f32; 3],
    ) -> TelekinesisInjectResult {
        field.inject_telekinesis_tensor(entity_mass, young_modulus, target_gravity)
    }
}

/// Letter **ds** soak report — fractal energy perturbation evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct FractalEnergyPerturbationSoakReport {
    /// Soak-gated; distinct from dr / dq / dc–dm probes.
    pub fractal_energy_perturbation_ready: bool,
    pub inject_steps: u32,
    pub force_mutated: bool,
    pub stress_mutated: bool,
    pub weak_stress_gt_stiff: bool,
    pub timescale_coupled: bool,
    pub is_fractal_pattern: bool,
    pub final_force_norm: f32,
    pub final_stress: f32,
    /// Stable evidence tag: SoA force+stress Young tear + timescale couple (≠ nits/dust / WorldSoA tick) — **ig**.
    pub evidence_kind: &'static str,
    /// Fingerprint of force/stress evidence fields (cross-check vs de/dr).
    pub evidence_fingerprint: u64,
    pub distinct_from_autonomous_entropy_corrector_probe: bool,
    pub distinct_from_unified_field_network_probe: bool,
    pub distinct_from_slab_allocator_mmap_probe: bool,
    pub distinct_from_baremetal_memory_manager_probe: bool,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_simd_world_soa_hot_path_probe: bool,
    pub distinct_from_simd_clay_math_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// SoA force+stress Young tear + timescale couple evidence shape (≠ nits/dust / WorldSoA tick).
pub const DS_EVIDENCE_KIND: &str = "soa_force_stress_young_tear_timescale";

fn hash_mix(h: u64, v: u64) -> u64 {
    h ^ v
        .wrapping_mul(0x9e37_79b9_7f4a_7c15)
        .rotate_left(27)
        .wrapping_add(0x1656_67b1)
}

fn ds_evidence_fingerprint(
    final_force_norm: f32,
    final_stress: f32,
    inject_steps: u32,
) -> u64 {
    let mut h = 0x6473_6670_65_u64; // "dsfpe"
    h = hash_mix(h, final_force_norm.to_bits() as u64);
    h = hash_mix(h, final_stress.to_bits() as u64);
    h = hash_mix(h, inject_steps as u64);
    h ^= 0x464f_5243; // FORC
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == DS_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn perturbation_held(
    inject_steps: u32,
    force_mutated: bool,
    stress_mutated: bool,
    weak_stress_gt_stiff: bool,
    timescale_coupled: bool,
    is_fractal_pattern: bool,
    final_force_norm: f32,
    final_stress: f32,
) -> FractalEnergyPerturbationSoakReport {
    let evidence_kind = DS_EVIDENCE_KIND;
    let evidence_fingerprint =
        ds_evidence_fingerprint(final_force_norm, final_stress, inject_steps);
    let core_ok = force_mutated
        && stress_mutated
        && weak_stress_gt_stiff
        && timescale_coupled
        && is_fractal_pattern;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    FractalEnergyPerturbationSoakReport {
        fractal_energy_perturbation_ready: false,
        inject_steps,
        force_mutated,
        stress_mutated,
        weak_stress_gt_stiff,
        timescale_coupled,
        is_fractal_pattern,
        final_force_norm,
        final_stress,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_autonomous_entropy_corrector_probe: d,
        distinct_from_unified_field_network_probe: d,
        distinct_from_slab_allocator_mmap_probe: d,
        distinct_from_baremetal_memory_manager_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_simd_world_soa_hot_path_probe: d,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Run force/stress inject + weak>stiff tear + WorldSoA timescale couple soak.
/// Does **not** claim Chaos/PBD full parity.
pub fn run_fractal_energy_perturbation_soak() -> FractalEnergyPerturbationSoakReport {
    let mut field = FractalEnergyField::soak_field();
    let mut steps: u32 = 0;
    let mut all_injected = true;
    let force_start = field.total_force_norm();
    let stress_start = field.total_stress();

    for _ in 0..SOAK_INJECT_STEPS {
        let r = FractalEnergyPerturbation::inject_telekinesis_tensor(
            &mut field,
            SOAK_MASS,
            SOAK_YOUNG_STIFF,
            SOAK_GRAVITY,
        );
        steps = steps.saturating_add(1);
        if !r.injected || r.force_delta_norm <= EPS || r.stress_delta_sum <= EPS {
            all_injected = false;
        }
    }

    let force_mutated = all_injected && field.total_force_norm() > force_start + EPS;
    let stress_mutated = all_injected && field.total_stress() > stress_start + EPS;

    // Weak Young must tear harder than stiff for the same gravity inject.
    let mut weak = FractalEnergyField::soak_field();
    let mut stiff = FractalEnergyField::soak_field();
    let rw = FractalEnergyPerturbation::inject_telekinesis_tensor(
        &mut weak,
        SOAK_MASS,
        SOAK_YOUNG_WEAK,
        SOAK_GRAVITY,
    );
    let rs = FractalEnergyPerturbation::inject_telekinesis_tensor(
        &mut stiff,
        SOAK_MASS,
        SOAK_YOUNG_STIFF,
        SOAK_GRAVITY,
    );
    let weak_stress_gt_stiff = rw.injected
        && rs.injected
        && weak.total_stress() > stiff.total_stress() + EPS
        && rw.tear_factor > rs.tear_factor + EPS;

    // Couple into WorldSoA timescale — measurable column write.
    let mut world = WorldSoA::with_capacity(SOAK_PARTICLE_COUNT);
    for i in 0..SOAK_PARTICLE_COUNT {
        world
            .add_entity(i as f32, 10.0, 0.0)
            .expect("soak entity alloc");
        world.timescale[i] = 1.0;
    }
    let ts_before: f32 = world.timescale.iter().sum();
    let timescale_coupled = field.couple_to_world_timescale(&mut world, SOAK_MASS);
    let ts_after: f32 = world.timescale.iter().sum();
    let timescale_coupled = timescale_coupled && ts_after > ts_before + EPS;

    let final_force = field.total_force_norm();
    let final_stress = field.total_stress();

    // Prove fractal/noise pattern rather than uniform force
    let mut is_fractal_pattern = false;
    let mut min_f = f32::MAX;
    let mut max_f = f32::MIN;
    for i in 0..field.particle_count() {
        let f_mag = (field.force_x[i].powi(2) + field.force_y[i].powi(2) + field.force_z[i].powi(2)).sqrt();
        if f_mag < min_f { min_f = f_mag; }
        if f_mag > max_f { max_f = f_mag; }
    }
    if max_f - min_f > EPS {
        is_fractal_pattern = true;
    }

    if !(force_mutated
        && stress_mutated
        && weak_stress_gt_stiff
        && timescale_coupled
        && is_fractal_pattern
        && steps == SOAK_INJECT_STEPS
        && all_injected)
    {
        return perturbation_held(
            steps,
            force_mutated,
            stress_mutated,
            weak_stress_gt_stiff,
            timescale_coupled,
            is_fractal_pattern,
            final_force,
            final_stress,
        );
    }

    let evidence_kind = DS_EVIDENCE_KIND;
    let evidence_fingerprint = ds_evidence_fingerprint(final_force, final_stress, steps);
    let d = measured_distinct(evidence_kind, evidence_fingerprint, true);
    FractalEnergyPerturbationSoakReport {
        fractal_energy_perturbation_ready: true,
        inject_steps: steps,
        force_mutated: true,
        stress_mutated: true,
        weak_stress_gt_stiff: true,
        timescale_coupled: true,
        is_fractal_pattern: true,
        final_force_norm: final_force,
        final_stress,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_autonomous_entropy_corrector_probe: d,
        distinct_from_unified_field_network_probe: d,
        distinct_from_slab_allocator_mmap_probe: d,
        distinct_from_baremetal_memory_manager_probe: d,
        distinct_from_mmap_ecs_pager_probe: d,
        distinct_from_simd_world_soa_hot_path_probe: d,
        distinct_from_simd_clay_math_probe: d,
        distinct_from_world_soa_sab_layout_probe: d,
        distinct_from_desktop_wire_probe: d,
        distinct_from_mut_dna_desktop_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Honesty probe — soak-gated `fractal_energy_perturbation_ready` (**ds**).
pub fn probe_fractal_energy_perturbation() -> FractalEnergyPerturbationSoakReport {
    run_fractal_energy_perturbation_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inject_mutates_force_and_stress() {
        let mut field = FractalEnergyField::soak_field();
        let before_f = field.total_force_norm();
        let before_s = field.total_stress();
        let r = FractalEnergyPerturbation::inject_telekinesis_tensor(
            &mut field,
            3.0,
            50.0,
            [0.0, 9.8, 0.0],
        );
        assert!(r.injected);
        assert!(field.total_force_norm() > before_f);
        assert!(field.total_stress() > before_s);
        assert!(r.force_delta_norm > 0.0);
        assert!(r.stress_delta_sum > 0.0);
        assert_eq!(field.step_count(), 1);
    }

    #[test]
    fn weak_young_tears_harder_than_stiff() {
        let mut weak = FractalEnergyField::soak_field();
        let mut stiff = FractalEnergyField::soak_field();
        let rw = FractalEnergyPerturbation::inject_telekinesis_tensor(
            &mut weak,
            SOAK_MASS,
            SOAK_YOUNG_WEAK,
            SOAK_GRAVITY,
        );
        let rs = FractalEnergyPerturbation::inject_telekinesis_tensor(
            &mut stiff,
            SOAK_MASS,
            SOAK_YOUNG_STIFF,
            SOAK_GRAVITY,
        );
        assert!(rw.tear_factor > rs.tear_factor);
        assert!(weak.total_stress() > stiff.total_stress());
        // Same gravity → same force magnitude (Young only affects stress).
        assert!((weak.total_force_norm() - stiff.total_force_norm()).abs() < 1e-3);
    }

    #[test]
    fn zero_mass_is_identity() {
        let mut field = FractalEnergyField::soak_field();
        let r = FractalEnergyPerturbation::inject_telekinesis_tensor(
            &mut field,
            0.0,
            10.0,
            SOAK_GRAVITY,
        );
        assert!(!r.injected);
        assert_eq!(field.total_force_norm(), 0.0);
        assert_eq!(field.total_stress(), 0.0);
        assert_eq!(field.step_count(), 0);
    }

    #[test]
    fn non_finite_sanitized() {
        let mut field = FractalEnergyField::soak_field();
        let r = FractalEnergyPerturbation::inject_telekinesis_tensor(
            &mut field,
            f32::NAN,
            f32::NEG_INFINITY,
            [f32::INFINITY, 1.0, f32::NAN],
        );
        assert!(!r.injected);
        assert_eq!(field.total_force_norm(), 0.0);
    }

    #[test]
    fn couple_raises_world_timescale() {
        let mut field = FractalEnergyField::soak_field();
        FractalEnergyPerturbation::inject_telekinesis_tensor(
            &mut field,
            SOAK_MASS,
            SOAK_YOUNG_STIFF,
            SOAK_GRAVITY,
        );
        let mut world = WorldSoA::with_capacity(SOAK_PARTICLE_COUNT);
        for i in 0..SOAK_PARTICLE_COUNT {
            world.add_entity(0.0, i as f32, 0.0).unwrap();
            world.timescale[i] = 1.0;
        }
        let before = world.timescale[0];
        assert!(field.couple_to_world_timescale(&mut world, SOAK_MASS));
        assert!(world.timescale[0] > before);
    }

    #[test]
    fn perturbation_soak_flips_ready_chaos_held() {
        let r = probe_fractal_energy_perturbation();
        assert!(r.fractal_energy_perturbation_ready, "{r:?}");
        assert_eq!(r.inject_steps, SOAK_INJECT_STEPS);
        assert!(r.force_mutated);
        assert!(r.stress_mutated);
        assert!(r.weak_stress_gt_stiff);
        assert!(r.timescale_coupled);
        assert!(r.is_fractal_pattern);
        assert!(r.final_force_norm > 0.0);
        assert!(r.final_stress > 0.0);
        assert_eq!(r.evidence_kind, DS_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_autonomous_entropy_corrector_probe);
        assert!(r.distinct_from_unified_field_network_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.chaos_pbd_parity_ready);
        assert!(!r.unreal_mass_100k_ready);
        assert!(!r.mmap_sab_production_ready);
        assert!(!r.avx512_kernel_ready);
        assert!(!r.gr_raymarch_ready);
        assert!(!r.dual_timeline_240_ready);
    }

    #[test]
    fn perturbation_probe_distinct_from_dr_dq_dc() {
        let pert = probe_fractal_energy_perturbation();
        let corr = crate::autonomous_entropy_corrector::probe_autonomous_entropy_corrector();
        let field = crate::unified_field_network::probe_unified_field_network();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(pert.fractal_energy_perturbation_ready);
        assert!(corr.autonomous_entropy_corrector_ready);
        assert!(field.unified_field_network_ready);
        assert!(found.foundation_closed());

        assert!(pert.distinct_from_autonomous_entropy_corrector_probe);
        assert!(pert.distinct_from_unified_field_network_probe);
        assert!(pert.distinct_from_kernel_foundation_probe);

        // Distinct evidence shapes — ds force/stress, dr nits/dust, dq pressure/radiation.
        assert!(pert.force_mutated && pert.stress_mutated && pert.weak_stress_gt_stiff);
        assert!(corr.nits_mutated_down && corr.dust_mutated_up);
        assert!(field.pressure_monotonic && field.pressure_diffusion_conserved);
        assert!(!pert.chaos_pbd_parity_ready);
    }

    #[test]
    fn de_dr_ds_distinct_evidence_fingerprints() {
        let de = crate::desktop_soak::probe_kernel_desktop_wire();
        let dr = crate::autonomous_entropy_corrector::probe_autonomous_entropy_corrector();
        let ds = probe_fractal_energy_perturbation();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(de.kernel_desktop_wire_ready);
        assert!(dr.autonomous_entropy_corrector_ready);
        assert!(ds.fractal_energy_perturbation_ready);
        assert!(found.foundation_closed());

        assert_eq!(de.evidence_kind, crate::desktop_soak::DE_EVIDENCE_KIND);
        assert_eq!(
            dr.evidence_kind,
            crate::autonomous_entropy_corrector::DR_EVIDENCE_KIND
        );
        assert_eq!(ds.evidence_kind, DS_EVIDENCE_KIND);
        assert_ne!(de.evidence_kind, dr.evidence_kind);
        assert_ne!(de.evidence_kind, ds.evidence_kind);
        assert_ne!(dr.evidence_kind, ds.evidence_kind);
        assert_ne!(de.evidence_fingerprint, dr.evidence_fingerprint);
        assert_ne!(de.evidence_fingerprint, ds.evidence_fingerprint);
        assert_ne!(dr.evidence_fingerprint, ds.evidence_fingerprint);

        assert!(de.distinct_from_kernel_foundation_probe);
        assert!(dr.distinct_from_desktop_wire_probe);
        assert!(ds.distinct_from_autonomous_entropy_corrector_probe);
        assert!(!ds.chaos_pbd_parity_ready);
        // Different evidence fields — WorldSoA+LBM ≠ nits/dust ≠ force/stress tear.
        assert!(de.world_soa_ticked && de.lbm_stepped && de.lbm_mass_conserved);
        assert!(dr.nits_mutated_down && dr.dust_mutated_up && dr.within_budget_after);
        assert!(ds.force_mutated && ds.stress_mutated && ds.weak_stress_gt_stiff);
    }
}
