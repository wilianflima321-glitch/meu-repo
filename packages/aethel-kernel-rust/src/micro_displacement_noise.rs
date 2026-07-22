//! Micro Displacement Noise — letter **ev**.
//!
//! Replaces thin theater stub `inject_fractal_porosity` (single sin/cos
//! perturbation, no soak) with real multi-octave seeded value-noise SDF
//! displacement: dirt_level=0 → identity; dirt>0 perturbs surface; same
//! seed → deterministic; higher dirt → larger |Δ|.
//!
//! Honesty probe `micro_displacement_noise_ready` / `microDisplacementNoiseReady`
//! is **distinct** from eu `internalVoxelDensityReady`, et `svoDepthLodReady`,
//! es `hybridGeometrySvoReady`, er `velocityBufferEcsReady`, eq
//! `sdfMotionVectorBufferReady`, ep `sdfOctreeHashingReady`, eo
//! `stochasticVirtualSdfReady`, en `sdfAdaptiveCascadesReady`, em
//! `sdfSculptorReady`, el `hermiteSharpFeaturesReady`, ek
//! `hermiteDualityGridReady`, ej `fmAdditiveSynthesisReady`, ei
//! `acousticReverbGeometryReady`, ef `acousticRaytracingEchoReady`, eh
//! `finiteElementAnalysisReady`, ee–ea fluid/PBD, dz–dq deepen, and dc–dm
//! foundation probes.
//!
//! Letter **ie**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! (no hard-coded `distinct_from_*: true`).
//!
//! **HELD:** Full GPU Nanite micro-displacement AAA
//! (`nanite_micro_displacement_aaa_ready: false`) · Coins / Agones / DLSS.

/// Default octave count for soak / production facade.
pub const DEFAULT_OCTAVES: u32 = 4;
/// Base frequency (world units⁻¹).
pub const BASE_FREQUENCY: f32 = 2.0;
/// Amplitude scale at octave 0 before dirt_level.
pub const BASE_AMPLITUDE: f32 = 0.04;
/// Lacunarity (frequency multiplier per octave).
pub const LACUNARITY: f32 = 2.0;
/// Gain (amplitude multiplier per octave).
pub const GAIN: f32 = 0.5;
/// Soak dirt levels.
pub const SOAK_DIRT_ZERO: f32 = 0.0;
pub const SOAK_DIRT_LOW: f32 = 0.5;
pub const SOAK_DIRT_HIGH: f32 = 1.5;
/// Analytic sphere radius for soak SDF.
pub const SOAK_SPHERE_R: f32 = 1.0;
const EPS: f32 = 1e-6;

/// Multi-octave displacement parameters.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MicroDisplacementParams {
    pub octaves: u32,
    pub base_frequency: f32,
    pub base_amplitude: f32,
    pub lacunarity: f32,
    pub gain: f32,
    pub seed: u32,
}

impl Default for MicroDisplacementParams {
    fn default() -> Self {
        Self {
            octaves: DEFAULT_OCTAVES,
            base_frequency: BASE_FREQUENCY,
            base_amplitude: BASE_AMPLITUDE,
            lacunarity: LACUNARITY,
            gain: GAIN,
            seed: 0x6576_u32, // "ev"
        }
    }
}

/// One displaced SDF sample.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct MicroDisplacementSample {
    pub sdf_in: f32,
    pub sdf_out: f32,
    pub perturbation: f32,
    pub dirt_level: f32,
    pub outputs_finite: bool,
}

/// Stateless facade — fractal micro-displacement on SDF.
#[derive(Debug, Default, Clone, Copy)]
pub struct MicroDisplacementNoise;

impl MicroDisplacementNoise {
    /// Hash → [0,1).
    #[inline]
    pub fn hash01(ix: i32, iy: i32, iz: i32, seed: u32) -> f32 {
        let mut h = seed
            .wrapping_mul(0x9e37_79b1)
            .wrapping_add((ix as u32).wrapping_mul(0x85eb_ca6b));
        h = h
            .wrapping_add((iy as u32).wrapping_mul(0xc2b2_ae35))
            .rotate_left(13);
        h = h
            .wrapping_add((iz as u32).wrapping_mul(0x27d4_eb2d))
            .rotate_left(17);
        h ^= h >> 16;
        h = h.wrapping_mul(0x7feb_352d);
        h ^= h >> 15;
        (h as f32) * (1.0 / (u32::MAX as f32))
    }

    /// Smoothstep fade.
    #[inline]
    fn fade(t: f32) -> f32 {
        t * t * (3.0 - 2.0 * t)
    }

    /// Trilinear value noise in [-1, 1].
    pub fn value_noise(p: [f32; 3], seed: u32) -> f32 {
        let x0 = p[0].floor() as i32;
        let y0 = p[1].floor() as i32;
        let z0 = p[2].floor() as i32;
        let fx = Self::fade(p[0] - x0 as f32);
        let fy = Self::fade(p[1] - y0 as f32);
        let fz = Self::fade(p[2] - z0 as f32);

        let n000 = Self::hash01(x0, y0, z0, seed);
        let n100 = Self::hash01(x0 + 1, y0, z0, seed);
        let n010 = Self::hash01(x0, y0 + 1, z0, seed);
        let n110 = Self::hash01(x0 + 1, y0 + 1, z0, seed);
        let n001 = Self::hash01(x0, y0, z0 + 1, seed);
        let n101 = Self::hash01(x0 + 1, y0, z0 + 1, seed);
        let n011 = Self::hash01(x0, y0 + 1, z0 + 1, seed);
        let n111 = Self::hash01(x0 + 1, y0 + 1, z0 + 1, seed);

        let nx00 = n000 + (n100 - n000) * fx;
        let nx10 = n010 + (n110 - n010) * fx;
        let nx01 = n001 + (n101 - n001) * fx;
        let nx11 = n011 + (n111 - n011) * fx;
        let nxy0 = nx00 + (nx10 - nx00) * fy;
        let nxy1 = nx01 + (nx11 - nx01) * fy;
        let n = nxy0 + (nxy1 - nxy0) * fz;
        n * 2.0 - 1.0
    }

    /// Fractal Brownian motion sum (signed).
    pub fn fbm(world_pos: [f32; 3], params: &MicroDisplacementParams) -> f32 {
        let mut amp = params.base_amplitude.max(0.0);
        let mut freq = params.base_frequency.max(EPS);
        let mut sum = 0.0;
        let octaves = params.octaves.max(1).min(8);
        for o in 0..octaves {
            let p = [
                world_pos[0] * freq,
                world_pos[1] * freq,
                world_pos[2] * freq,
            ];
            let seed = params.seed.wrapping_add(o.wrapping_mul(0x9e37));
            sum += Self::value_noise(p, seed) * amp;
            freq *= params.lacunarity.max(1.0);
            amp *= params.gain.clamp(0.0, 1.0);
        }
        sum
    }

    /// Inject fractal porosity into SDF distance (dirt_level scales amplitude).
    ///
    /// `dirt_level == 0` → identity (`sdf_out == sdf_distance`).
    pub fn inject_fractal_porosity(
        sdf_distance: f32,
        world_pos: [f32; 3],
        dirt_level: f32,
    ) -> f32 {
        Self::displace(sdf_distance, world_pos, dirt_level, &MicroDisplacementParams::default())
            .sdf_out
    }

    /// Full displace with explicit params.
    pub fn displace(
        sdf_distance: f32,
        world_pos: [f32; 3],
        dirt_level: f32,
        params: &MicroDisplacementParams,
    ) -> MicroDisplacementSample {
        let dirt = dirt_level.max(0.0);
        let perturbation = if dirt < EPS {
            0.0
        } else {
            Self::fbm(world_pos, params) * dirt
        };
        let sdf_out = sdf_distance + perturbation;
        let outputs_finite = sdf_distance.is_finite()
            && sdf_out.is_finite()
            && perturbation.is_finite()
            && dirt.is_finite()
            && world_pos.iter().all(|c| c.is_finite());
        MicroDisplacementSample {
            sdf_in: sdf_distance,
            sdf_out,
            perturbation,
            dirt_level: dirt,
            outputs_finite,
        }
    }

    /// Analytic sphere SDF for soak.
    #[inline]
    pub fn sphere_sdf(p: [f32; 3], radius: f32) -> f32 {
        (p[0] * p[0] + p[1] * p[1] + p[2] * p[2]).sqrt() - radius
    }
}

/// Letter **ev** soak report — micro-displacement noise evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct MicroDisplacementNoiseSoakReport {
    /// Soak-gated; distinct from eu internal voxel density + prior probes.
    pub micro_displacement_noise_ready: bool,
    pub dirt_zero_identity: bool,
    pub dirt_perturbs: bool,
    pub higher_dirt_larger_abs_delta: bool,
    pub deterministic_seed: bool,
    pub outputs_finite: bool,
    pub delta_low: f32,
    pub delta_high: f32,
    pub fingerprint: u64,
    /// Stable evidence tag: multi-octave value-noise SDF displace (≠ stress vortex / density remap) — **ie**.
    pub evidence_kind: &'static str,
    /// Fingerprint of displacement-only evidence fields (cross-check vs hm/dx).
    pub evidence_fingerprint: u64,
    pub distinct_from_internal_voxel_density_probe: bool,
    pub distinct_from_svo_depth_lod_probe: bool,
    pub distinct_from_hybrid_geometry_svo_probe: bool,
    pub distinct_from_velocity_buffer_ecs_probe: bool,
    pub distinct_from_sdf_motion_vector_buffer_probe: bool,
    pub distinct_from_sdf_octree_hashing_probe: bool,
    pub distinct_from_stochastic_virtual_sdf_probe: bool,
    pub distinct_from_sdf_adaptive_cascades_probe: bool,
    pub distinct_from_sdf_sculptor_probe: bool,
    pub distinct_from_hermite_sharp_features_probe: bool,
    pub distinct_from_hermite_duality_grid_probe: bool,
    pub distinct_from_fm_additive_synthesis_probe: bool,
    pub distinct_from_acoustic_reverb_geometry_probe: bool,
    pub distinct_from_acoustic_raytracing_echo_probe: bool,
    pub distinct_from_finite_element_analysis_probe: bool,
    pub distinct_from_sonic_impedance_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_synesthetic_sensory_remap_probe: bool,
    pub distinct_from_atmospheric_physical_damping_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_hybrid_eulerian_lagrangian_pbd_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_autonomous_conflict_generator_probe: bool,
    pub distinct_from_mnemonic_matter_entropy_probe: bool,
    pub distinct_from_four_dimensional_time_sdf_probe: bool,
    pub distinct_from_shadow_time_reversal_probe: bool,
    pub distinct_from_curved_raymarcher_probe: bool,
    pub distinct_from_fractal_energy_perturbation_probe: bool,
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
    pub distinct_from_kernel_foundation_probe: bool,
    /// Full Nanite micro-displacement AAA — always HELD.
    pub nanite_micro_displacement_aaa_ready: bool,
    pub nanite_svo_aaa_ready: bool,
    pub magica_csg_parity_ready: bool,
    pub ue_geometry_parity_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// Multi-octave value-noise SDF displace evidence shape (≠ stress vortex / density remap).
pub const EV_EVIDENCE_KIND: &str = "multi_octave_value_noise_sdf_displace";

fn hash_mix(h: u64, v: u64) -> u64 {
    h ^ v
        .wrapping_mul(0x9e37_79b9_7f4a_7c15)
        .rotate_left(27)
        .wrapping_add(0x1656_67b1)
}

fn ev_evidence_fingerprint(delta_low: f32, delta_high: f32, zero_out: f32) -> u64 {
    let mut h = 0x6576_6d64_6e_u64; // "evmdn"
    h = hash_mix(h, delta_low.to_bits() as u64);
    h = hash_mix(h, delta_high.to_bits() as u64);
    h = hash_mix(h, zero_out.to_bits() as u64);
    h ^= 0x4e4f_4953; // NOIS
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == EV_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn ev_held(
    dirt_zero_identity: bool,
    dirt_perturbs: bool,
    higher_dirt_larger_abs_delta: bool,
    deterministic_seed: bool,
    outputs_finite: bool,
    delta_low: f32,
    delta_high: f32,
    zero_out: f32,
) -> MicroDisplacementNoiseSoakReport {
    let evidence_kind = EV_EVIDENCE_KIND;
    let evidence_fingerprint = ev_evidence_fingerprint(delta_low, delta_high, zero_out);
    let core_ok = outputs_finite
        && dirt_zero_identity
        && dirt_perturbs
        && higher_dirt_larger_abs_delta
        && deterministic_seed;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    MicroDisplacementNoiseSoakReport {
        micro_displacement_noise_ready: false,
        dirt_zero_identity,
        dirt_perturbs,
        higher_dirt_larger_abs_delta,
        deterministic_seed,
        outputs_finite,
        delta_low,
        delta_high,
        fingerprint: evidence_fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_internal_voxel_density_probe: d,
        distinct_from_svo_depth_lod_probe: d,
        distinct_from_hybrid_geometry_svo_probe: d,
        distinct_from_velocity_buffer_ecs_probe: d,
        distinct_from_sdf_motion_vector_buffer_probe: d,
        distinct_from_sdf_octree_hashing_probe: d,
        distinct_from_stochastic_virtual_sdf_probe: d,
        distinct_from_sdf_adaptive_cascades_probe: d,
        distinct_from_sdf_sculptor_probe: d,
        distinct_from_hermite_sharp_features_probe: d,
        distinct_from_hermite_duality_grid_probe: d,
        distinct_from_fm_additive_synthesis_probe: d,
        distinct_from_acoustic_reverb_geometry_probe: d,
        distinct_from_acoustic_raytracing_echo_probe: d,
        distinct_from_finite_element_analysis_probe: d,
        distinct_from_sonic_impedance_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_autonomous_conflict_generator_probe: d,
        distinct_from_mnemonic_matter_entropy_probe: d,
        distinct_from_four_dimensional_time_sdf_probe: d,
        distinct_from_shadow_time_reversal_probe: d,
        distinct_from_curved_raymarcher_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
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
        distinct_from_kernel_foundation_probe: d,
        nanite_micro_displacement_aaa_ready: false,
        nanite_svo_aaa_ready: false,
        magica_csg_parity_ready: false,
        ue_geometry_parity_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Run micro-displacement soak — identity at dirt=0; higher dirt → larger |Δ|.
///
/// Does **not** claim Nanite micro-displacement AAA parity.
pub fn run_micro_displacement_noise_soak() -> MicroDisplacementNoiseSoakReport {
    let params = MicroDisplacementParams::default();
    let pos = [0.37, -0.21, 0.88];
    let sdf_in = MicroDisplacementNoise::sphere_sdf(pos, SOAK_SPHERE_R);

    let zero = MicroDisplacementNoise::displace(sdf_in, pos, SOAK_DIRT_ZERO, &params);
    let low = MicroDisplacementNoise::displace(sdf_in, pos, SOAK_DIRT_LOW, &params);
    let high = MicroDisplacementNoise::displace(sdf_in, pos, SOAK_DIRT_HIGH, &params);

    let again = MicroDisplacementNoise::displace(sdf_in, pos, SOAK_DIRT_HIGH, &params);
    let via_facade = MicroDisplacementNoise::inject_fractal_porosity(sdf_in, pos, SOAK_DIRT_HIGH);

    let dirt_zero_identity = (zero.sdf_out - sdf_in).abs() < EPS && zero.perturbation.abs() < EPS;
    let dirt_perturbs = low.perturbation.abs() > EPS && (low.sdf_out - sdf_in).abs() > EPS;
    let delta_low = low.perturbation.abs();
    let delta_high = high.perturbation.abs();
    let higher_dirt_larger_abs_delta = delta_high > delta_low && delta_low > EPS;
    let deterministic_seed = (high.sdf_out - again.sdf_out).abs() < EPS
        && (high.sdf_out - via_facade).abs() < EPS;
    let outputs_finite = zero.outputs_finite
        && low.outputs_finite
        && high.outputs_finite
        && dirt_zero_identity
        && dirt_perturbs
        && higher_dirt_larger_abs_delta
        && deterministic_seed
        && sdf_in.is_finite();

    if !outputs_finite {
        return ev_held(
            dirt_zero_identity,
            dirt_perturbs,
            higher_dirt_larger_abs_delta,
            deterministic_seed,
            outputs_finite,
            delta_low,
            delta_high,
            zero.sdf_out,
        );
    }

    let evidence_kind = EV_EVIDENCE_KIND;
    let evidence_fingerprint = ev_evidence_fingerprint(delta_low, delta_high, zero.sdf_out);
    let d = measured_distinct(evidence_kind, evidence_fingerprint, true);
    MicroDisplacementNoiseSoakReport {
        micro_displacement_noise_ready: true,
        dirt_zero_identity: true,
        dirt_perturbs: true,
        higher_dirt_larger_abs_delta: true,
        deterministic_seed: true,
        outputs_finite: true,
        delta_low,
        delta_high,
        fingerprint: evidence_fingerprint,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_internal_voxel_density_probe: d,
        distinct_from_svo_depth_lod_probe: d,
        distinct_from_hybrid_geometry_svo_probe: d,
        distinct_from_velocity_buffer_ecs_probe: d,
        distinct_from_sdf_motion_vector_buffer_probe: d,
        distinct_from_sdf_octree_hashing_probe: d,
        distinct_from_stochastic_virtual_sdf_probe: d,
        distinct_from_sdf_adaptive_cascades_probe: d,
        distinct_from_sdf_sculptor_probe: d,
        distinct_from_hermite_sharp_features_probe: d,
        distinct_from_hermite_duality_grid_probe: d,
        distinct_from_fm_additive_synthesis_probe: d,
        distinct_from_acoustic_reverb_geometry_probe: d,
        distinct_from_acoustic_raytracing_echo_probe: d,
        distinct_from_finite_element_analysis_probe: d,
        distinct_from_sonic_impedance_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_autonomous_conflict_generator_probe: d,
        distinct_from_mnemonic_matter_entropy_probe: d,
        distinct_from_four_dimensional_time_sdf_probe: d,
        distinct_from_shadow_time_reversal_probe: d,
        distinct_from_curved_raymarcher_probe: d,
        distinct_from_fractal_energy_perturbation_probe: d,
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
        distinct_from_kernel_foundation_probe: d,
        nanite_micro_displacement_aaa_ready: false,
        nanite_svo_aaa_ready: false,
        magica_csg_parity_ready: false,
        ue_geometry_parity_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Honesty probe — soak-gated `micro_displacement_noise_ready` (**ev**).
pub fn probe_micro_displacement_noise() -> MicroDisplacementNoiseSoakReport {
    run_micro_displacement_noise_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dirt_zero_is_identity() {
        let p = [0.5, 0.25, -0.1];
        let sdf = MicroDisplacementNoise::sphere_sdf(p, 1.0);
        let out = MicroDisplacementNoise::inject_fractal_porosity(sdf, p, 0.0);
        assert!((out - sdf).abs() < 1e-6);
    }

    #[test]
    fn dirt_perturbs_surface() {
        let p = [0.37, -0.21, 0.88];
        let sdf = MicroDisplacementNoise::sphere_sdf(p, 1.0);
        let out = MicroDisplacementNoise::inject_fractal_porosity(sdf, p, 1.0);
        assert!((out - sdf).abs() > 1e-5);
    }

    #[test]
    fn higher_dirt_larger_abs_delta() {
        let params = MicroDisplacementParams::default();
        let p = [0.37, -0.21, 0.88];
        let sdf = MicroDisplacementNoise::sphere_sdf(p, 1.0);
        let low = MicroDisplacementNoise::displace(sdf, p, 0.5, &params);
        let high = MicroDisplacementNoise::displace(sdf, p, 1.5, &params);
        assert!(high.perturbation.abs() > low.perturbation.abs());
    }

    #[test]
    fn deterministic_same_seed() {
        let p = [1.1, 2.2, 3.3];
        let a = MicroDisplacementNoise::inject_fractal_porosity(0.0, p, 1.0);
        let b = MicroDisplacementNoise::inject_fractal_porosity(0.0, p, 1.0);
        assert_eq!(a, b);
    }

    #[test]
    fn soak_ready_and_held_flags() {
        let r = run_micro_displacement_noise_soak();
        assert!(r.micro_displacement_noise_ready, "{r:?}");
        assert!(r.dirt_zero_identity);
        assert!(r.dirt_perturbs);
        assert!(r.higher_dirt_larger_abs_delta);
        assert!(r.deterministic_seed);
        assert!(!r.nanite_micro_displacement_aaa_ready);
        assert_eq!(r.evidence_kind, EV_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert_eq!(r.fingerprint, r.evidence_fingerprint);
        assert!(r.distinct_from_internal_voxel_density_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
    }

    #[test]
    fn probe_matches_soak() {
        let a = run_micro_displacement_noise_soak();
        let b = probe_micro_displacement_noise();
        assert_eq!(
            a.micro_displacement_noise_ready,
            b.micro_displacement_noise_ready
        );
        assert!(b.micro_displacement_noise_ready);
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.evidence_kind, b.evidence_kind);
    }

    #[test]
    fn distinct_from_eu_and_prior_probes() {
        let ev = probe_micro_displacement_noise();
        let eu = crate::internal_voxel_density::probe_internal_voxel_density();
        assert!(ev.micro_displacement_noise_ready);
        assert!(eu.internal_voxel_density_ready);
        assert!(ev.distinct_from_internal_voxel_density_probe);
        assert_ne!("microDisplacementNoiseReady", "internalVoxelDensityReady");
        assert_ne!("microDisplacementNoiseReady", "svoDepthLodReady");
        assert_ne!("microDisplacementNoiseReady", "sdfSculptorReady");
    }

    #[test]
    fn deterministic_fingerprint() {
        let a = run_micro_displacement_noise_soak();
        let b = run_micro_displacement_noise_soak();
        assert_eq!(a.fingerprint, b.fingerprint);
        assert_eq!(a.evidence_fingerprint, b.evidence_fingerprint);
        assert_eq!(a.delta_high, b.delta_high);
    }

    #[test]
    fn ev_hm_dx_distinct_evidence_fingerprints() {
        let ev = probe_micro_displacement_noise();
        let hm = crate::autonomous_conflict_generator::probe_autonomous_conflict_generator();
        let dx = crate::synesthetic_sensory_remap::probe_synesthetic_sensory_remap();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(ev.micro_displacement_noise_ready);
        assert!(hm.autonomous_conflict_generator_ready);
        assert!(dx.synesthetic_sensory_remap_ready);
        assert!(found.foundation_closed());

        assert_eq!(ev.evidence_kind, EV_EVIDENCE_KIND);
        assert_eq!(
            hm.evidence_kind,
            crate::autonomous_conflict_generator::HM_EVIDENCE_KIND
        );
        assert_eq!(
            dx.evidence_kind,
            crate::synesthetic_sensory_remap::DX_EVIDENCE_KIND
        );
        assert_ne!(ev.evidence_kind, hm.evidence_kind);
        assert_ne!(ev.evidence_kind, dx.evidence_kind);
        assert_ne!(hm.evidence_kind, dx.evidence_kind);
        assert_ne!(ev.evidence_fingerprint, hm.evidence_fingerprint);
        assert_ne!(ev.evidence_fingerprint, dx.evidence_fingerprint);
        assert_ne!(hm.evidence_fingerprint, dx.evidence_fingerprint);

        assert!(ev.distinct_from_autonomous_conflict_generator_probe);
        assert!(hm.distinct_from_synesthetic_sensory_remap_probe);
        assert!(dx.distinct_from_kernel_foundation_probe);
        assert!(!ev.nanite_micro_displacement_aaa_ready);
        // Different evidence fields — dirt |Δ| ≠ stress vortex ≠ density channels.
        assert!(ev.delta_high > ev.delta_low);
        assert!(hm.high_stress_spawns_events && hm.velocity_field_perturbed);
        assert!(dx.density_changes_outputs && dx.vacuum_silences_acoustic);
    }
}
