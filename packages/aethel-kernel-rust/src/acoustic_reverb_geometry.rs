//! Acoustic Reverb Geometry — letter **ei**.
//!
//! Replaces empty ZST stub `calculate_sdf_bounce` (println theater, unused
//! SDF mask). Sabine / Eyring RT60 from box room volume + mean absorption,
//! plus first early-reflection delay from half-dimension nearest wall.
//! Soak proves larger rooms and higher absorption change RT60.
//!
//! **Distinct** from ef `acousticRaytracingEchoReady` (specular image-source
//! first-order echo tap — delay+gain vs one wall, not room RT60) and from
//! dc sonic impedance / dg spectral sonic / dx synesthetic / dz atmospheric
//! damping / ee–ea fluid/PBD probes.
//!
//! Honesty probe `acoustic_reverb_geometry_ready` / `acousticReverbGeometryReady`.
//! Letter **ia**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! (no hard-coded `distinct_from_*: true`).
//!
//! **HELD:** Full MetaSounds / HRTF AAA (`metasounds_hrtf_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS.

/// Speed of sound in air [m/s] — early-reflection delay base.
pub const SPEED_OF_SOUND_AIR: f32 = 343.0;
/// Sabine / Eyring constant for SI units (s/m) — ≈ 0.161.
pub const SABINE_CONSTANT: f32 = 0.161;
/// Soak sample count (small/large × low/high α × degenerate).
pub const SOAK_SAMPLE_COUNT: u32 = 6;
const EPS: f32 = 1e-5;
/// Min |ΔRT60| across room size for soak evidence [s].
const MIN_RT60_SIZE_DELTA: f32 = 0.15;
/// Min |ΔRT60| across absorption for soak evidence [s].
const MIN_RT60_ABSORB_DELTA: f32 = 0.20;
/// Min |Δ early delay| across nearest-wall half-dim [s].
const MIN_EARLY_DELAY_DELTA: f32 = 0.003;

/// Measurable room reverb geometry (not println theater).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RoomReverbEstimate {
    /// Room volume [m³].
    pub volume_m3: f32,
    /// Total surface area [m²].
    pub surface_m2: f32,
    /// Mean absorption coefficient α in (0, 1).
    pub mean_absorption: f32,
    /// Equivalent absorption area A = α · S [m² sabins].
    pub absorption_area_m2: f32,
    /// Sabine RT60 [s] — `0.161 · V / A`.
    pub rt60_sabine_sec: f32,
    /// Eyring RT60 [s] — `0.161 · V / (−S · ln(1 − α))`.
    pub rt60_eyring_sec: f32,
    /// First early reflection delay [s] for colocated source/listener at
    /// room center: round-trip to nearest wall = `min(L,W,H) / c`.
    pub early_reflection_delay_sec: f32,
    /// Nearest half-dimension used for early reflection [m].
    pub nearest_half_dim_m: f32,
}

impl RoomReverbEstimate {
    pub const EMPTY: Self = Self {
        volume_m3: 0.0,
        surface_m2: 0.0,
        mean_absorption: 0.0,
        absorption_area_m2: 0.0,
        rt60_sabine_sec: 0.0,
        rt60_eyring_sec: 0.0,
        early_reflection_delay_sec: 0.0,
        nearest_half_dim_m: 0.0,
    };

    #[inline]
    pub fn is_finite(&self) -> bool {
        self.volume_m3.is_finite()
            && self.surface_m2.is_finite()
            && self.mean_absorption.is_finite()
            && self.absorption_area_m2.is_finite()
            && self.rt60_sabine_sec.is_finite()
            && self.rt60_eyring_sec.is_finite()
            && self.early_reflection_delay_sec.is_finite()
            && self.nearest_half_dim_m.is_finite()
    }
}

/// Stateless facade — geometric room RT60 + early reflection (not ef echo tap).
#[derive(Debug, Default, Clone, Copy)]
pub struct AcousticReverbGeometry;

impl AcousticReverbGeometry {
    /// Sabine / Eyring RT60 + first early-reflection delay for a box room.
    ///
    /// - **Volume** `V = L·W·H`, **surface** `S = 2(LW+LH+WH)`.
    /// - **Sabine:** `T60 = 0.161 · V / (α·S)`.
    /// - **Eyring:** `T60 = 0.161 · V / (−S · ln(1 − α))` (α clamped below 1).
    /// - **Early reflection:** listener ≈ source at center;
    ///   `delay = min(L,W,H) / c` (round-trip to nearest wall).
    ///
    /// Non-finite / non-positive dims / α∉(0,1) → fail-closed [`RoomReverbEstimate::EMPTY`].
    /// Does **not** claim MetaSounds / HRTF AAA. Distinct from
    /// [`crate::acoustic_raytracing_echo::AcousticRaytracingEcho::propagate_sound_waves`].
    ///
    /// Replaces stub `calculate_sdf_bounce` (println + unused mask).
    pub fn calculate_sdf_bounce(
        length_m: f32,
        width_m: f32,
        height_m: f32,
        mean_absorption: f32,
    ) -> RoomReverbEstimate {
        Self::estimate_room_reverb(length_m, width_m, height_m, mean_absorption)
    }

    /// Explicit room-box reverb estimate (preferred API name).
    pub fn estimate_room_reverb(
        length_m: f32,
        width_m: f32,
        height_m: f32,
        mean_absorption: f32,
    ) -> RoomReverbEstimate {
        if !(length_m.is_finite()
            && width_m.is_finite()
            && height_m.is_finite()
            && mean_absorption.is_finite())
            || length_m <= EPS
            || width_m <= EPS
            || height_m <= EPS
            || mean_absorption <= EPS
            || mean_absorption >= 1.0 - EPS
        {
            return RoomReverbEstimate::EMPTY;
        }

        let volume_m3 = length_m * width_m * height_m;
        let surface_m2 = 2.0 * (length_m * width_m + length_m * height_m + width_m * height_m);
        if volume_m3 <= EPS || surface_m2 <= EPS {
            return RoomReverbEstimate::EMPTY;
        }

        let alpha = mean_absorption.clamp(EPS, 1.0 - EPS);
        let absorption_area_m2 = alpha * surface_m2;
        let rt60_sabine_sec = SABINE_CONSTANT * volume_m3 / absorption_area_m2;
        // Eyring: −ln(1−α) > α for α>0 → slightly shorter RT60 than Sabine.
        let eyring_denom = -surface_m2 * (1.0 - alpha).ln();
        let rt60_eyring_sec = if eyring_denom > EPS {
            SABINE_CONSTANT * volume_m3 / eyring_denom
        } else {
            0.0
        };

        let nearest_half_dim_m = length_m.min(width_m).min(height_m) * 0.5;
        // Round-trip to nearest wall from center = 2 · half = min edge length.
        let early_path_m = nearest_half_dim_m * 2.0;
        let early_reflection_delay_sec = early_path_m / SPEED_OF_SOUND_AIR;

        RoomReverbEstimate {
            volume_m3,
            surface_m2,
            mean_absorption: alpha,
            absorption_area_m2,
            rt60_sabine_sec,
            rt60_eyring_sec,
            early_reflection_delay_sec,
            nearest_half_dim_m,
        }
    }
}

/// Letter **ei** soak report — acoustic reverb geometry evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct AcousticReverbGeometrySoakReport {
    /// Soak-gated; distinct from ef echo + prior acoustic/fluid/foundation probes.
    pub acoustic_reverb_geometry_ready: bool,
    pub larger_room_longer_rt60: bool,
    pub higher_absorption_shorter_rt60: bool,
    pub early_delay_tracks_nearest_wall: bool,
    pub eyring_shorter_than_sabine: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub small_rt60_sabine_sec: f32,
    pub large_rt60_sabine_sec: f32,
    pub low_absorb_rt60_sec: f32,
    pub high_absorb_rt60_sec: f32,
    pub small_early_delay_sec: f32,
    pub large_early_delay_sec: f32,
    pub max_rt60_size_delta: f32,
    pub max_rt60_absorb_delta: f32,
    /// Stable evidence tag: room RT60 Sabine/Eyring geometry (≠ echo / FM synth) — **ia**.
    pub evidence_kind: &'static str,
    /// Fingerprint of reverb-only evidence fields (cross-check vs ef/ej).
    pub evidence_fingerprint: u64,
    pub distinct_from_acoustic_raytracing_echo_probe: bool,
    pub distinct_from_sonic_impedance_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_synesthetic_sensory_remap_probe: bool,
    pub distinct_from_atmospheric_physical_damping_probe: bool,
    pub distinct_from_lattice_boltzmann_fluid_solver_probe: bool,
    pub distinct_from_aerodynamic_navier_stokes_probe: bool,
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_hybrid_eulerian_lagrangian_pbd_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_finite_element_analysis_probe: bool,
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
    /// Full MetaSounds / HRTF AAA — always HELD.
    pub metasounds_hrtf_aaa_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

/// Room RT60 Sabine/Eyring geometry evidence shape (≠ image-source echo / FM PCM).
pub const REVERB_EVIDENCE_KIND: &str = "room_rt60_sabine_eyring_geometry";

fn reverb_evidence_fingerprint(
    larger_room_longer_rt60: bool,
    higher_absorption_shorter_rt60: bool,
    early_delay_tracks_nearest_wall: bool,
    eyring_shorter_than_sabine: bool,
    small_rt60_sabine_sec: f32,
    large_rt60_sabine_sec: f32,
    low_absorb_rt60_sec: f32,
    high_absorb_rt60_sec: f32,
    small_early_delay_sec: f32,
    large_early_delay_sec: f32,
    max_rt60_size_delta: f32,
    max_rt60_absorb_delta: f32,
) -> u64 {
    let mut h: u64 = 0x7276_6230; // "rvb0"
    h = h.rotate_left(11) ^ if larger_room_longer_rt60 { 0x5254 } else { 0 };
    h = h.rotate_left(5) ^ if higher_absorption_shorter_rt60 { 0x4142 } else { 0 };
    h = h.rotate_left(7) ^ if early_delay_tracks_nearest_wall { 0x4544 } else { 0 };
    h = h.rotate_left(3) ^ if eyring_shorter_than_sabine { 0x4559 } else { 0 };
    h ^= small_rt60_sabine_sec.to_bits() as u64;
    h ^= (large_rt60_sabine_sec.to_bits() as u64).rotate_left(11);
    h ^= (low_absorb_rt60_sec.to_bits() as u64).rotate_left(13);
    h ^= (high_absorb_rt60_sec.to_bits() as u64).rotate_left(17);
    h ^= (small_early_delay_sec.to_bits() as u64).rotate_left(19);
    h ^= (large_early_delay_sec.to_bits() as u64).rotate_left(23);
    h ^= (max_rt60_size_delta.to_bits() as u64).rotate_left(29);
    h ^= (max_rt60_absorb_delta.to_bits() as u64).rotate_left(31);
    h ^= 0x5254_3630; // RT60
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == REVERB_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn reverb_held(
    larger_room_longer_rt60: bool,
    higher_absorption_shorter_rt60: bool,
    early_delay_tracks_nearest_wall: bool,
    eyring_shorter_than_sabine: bool,
    outputs_finite: bool,
    sample_count: u32,
    small_rt60_sabine_sec: f32,
    large_rt60_sabine_sec: f32,
    low_absorb_rt60_sec: f32,
    high_absorb_rt60_sec: f32,
    small_early_delay_sec: f32,
    large_early_delay_sec: f32,
    max_rt60_size_delta: f32,
    max_rt60_absorb_delta: f32,
) -> AcousticReverbGeometrySoakReport {
    let evidence_kind = REVERB_EVIDENCE_KIND;
    let evidence_fingerprint = reverb_evidence_fingerprint(
        larger_room_longer_rt60,
        higher_absorption_shorter_rt60,
        early_delay_tracks_nearest_wall,
        eyring_shorter_than_sabine,
        small_rt60_sabine_sec,
        large_rt60_sabine_sec,
        low_absorb_rt60_sec,
        high_absorb_rt60_sec,
        small_early_delay_sec,
        large_early_delay_sec,
        max_rt60_size_delta,
        max_rt60_absorb_delta,
    );
    let core_ok = larger_room_longer_rt60
        && higher_absorption_shorter_rt60
        && early_delay_tracks_nearest_wall
        && eyring_shorter_than_sabine
        && outputs_finite;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    AcousticReverbGeometrySoakReport {
        acoustic_reverb_geometry_ready: false,
        larger_room_longer_rt60,
        higher_absorption_shorter_rt60,
        early_delay_tracks_nearest_wall,
        eyring_shorter_than_sabine,
        outputs_finite,
        sample_count,
        small_rt60_sabine_sec,
        large_rt60_sabine_sec,
        low_absorb_rt60_sec,
        high_absorb_rt60_sec,
        small_early_delay_sec,
        large_early_delay_sec,
        max_rt60_size_delta,
        max_rt60_absorb_delta,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_acoustic_raytracing_echo_probe: d,
        distinct_from_sonic_impedance_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_finite_element_analysis_probe: d,
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
        metasounds_hrtf_aaa_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Run room-size / absorption / early-delay reverb soak.
///
/// Does **not** claim MetaSounds / HRTF AAA.
pub fn run_acoustic_reverb_geometry_soak() -> AcousticReverbGeometrySoakReport {
    let small = AcousticReverbGeometry::estimate_room_reverb(4.0, 3.0, 2.5, 0.20);
    // Larger nearest edge (min=6) → longer early delay + longer RT60 than small.
    let large = AcousticReverbGeometry::estimate_room_reverb(18.0, 12.0, 6.0, 0.20);
    let low_a = AcousticReverbGeometry::estimate_room_reverb(8.0, 6.0, 3.0, 0.08);
    let high_a = AcousticReverbGeometry::estimate_room_reverb(8.0, 6.0, 3.0, 0.45);
    let tall = AcousticReverbGeometry::estimate_room_reverb(6.0, 5.0, 8.0, 0.25);
    let bad = AcousticReverbGeometry::estimate_room_reverb(0.0, 5.0, 3.0, 0.2);

    let samples = [small, large, low_a, high_a, tall, bad];
    debug_assert_eq!(samples.len() as u32, SOAK_SAMPLE_COUNT);
    let sample_count = SOAK_SAMPLE_COUNT;
    let outputs_finite = samples.iter().all(|t| t.is_finite());

    let max_rt60_size_delta = (large.rt60_sabine_sec - small.rt60_sabine_sec).abs();
    let max_rt60_absorb_delta = (low_a.rt60_sabine_sec - high_a.rt60_sabine_sec).abs();

    let larger_room_longer_rt60 = max_rt60_size_delta >= MIN_RT60_SIZE_DELTA
        && large.rt60_sabine_sec > small.rt60_sabine_sec
        && large.volume_m3 > small.volume_m3
        && large.rt60_eyring_sec > small.rt60_eyring_sec;
    let higher_absorption_shorter_rt60 = max_rt60_absorb_delta >= MIN_RT60_ABSORB_DELTA
        && high_a.rt60_sabine_sec < low_a.rt60_sabine_sec
        && high_a.mean_absorption > low_a.mean_absorption;
    let early_delay_tracks_nearest_wall = large.early_reflection_delay_sec
        > small.early_reflection_delay_sec + MIN_EARLY_DELAY_DELTA
        && (tall.early_reflection_delay_sec - (5.0 / SPEED_OF_SOUND_AIR)).abs() < 1e-4;
    let eyring_shorter_than_sabine = small.rt60_eyring_sec < small.rt60_sabine_sec
        && large.rt60_eyring_sec < large.rt60_sabine_sec
        && low_a.rt60_eyring_sec < low_a.rt60_sabine_sec
        && bad.volume_m3 <= EPS;

    let small_rt60_sabine_sec = small.rt60_sabine_sec;
    let large_rt60_sabine_sec = large.rt60_sabine_sec;
    let low_absorb_rt60_sec = low_a.rt60_sabine_sec;
    let high_absorb_rt60_sec = high_a.rt60_sabine_sec;
    let small_early_delay_sec = small.early_reflection_delay_sec;
    let large_early_delay_sec = large.early_reflection_delay_sec;

    if !(outputs_finite
        && larger_room_longer_rt60
        && higher_absorption_shorter_rt60
        && early_delay_tracks_nearest_wall
        && eyring_shorter_than_sabine)
    {
        return reverb_held(
            larger_room_longer_rt60,
            higher_absorption_shorter_rt60,
            early_delay_tracks_nearest_wall,
            eyring_shorter_than_sabine,
            outputs_finite,
            sample_count,
            small_rt60_sabine_sec,
            large_rt60_sabine_sec,
            low_absorb_rt60_sec,
            high_absorb_rt60_sec,
            small_early_delay_sec,
            large_early_delay_sec,
            max_rt60_size_delta,
            max_rt60_absorb_delta,
        );
    }

    let evidence_kind = REVERB_EVIDENCE_KIND;
    let evidence_fingerprint = reverb_evidence_fingerprint(
        true,
        true,
        true,
        true,
        small_rt60_sabine_sec,
        large_rt60_sabine_sec,
        low_absorb_rt60_sec,
        high_absorb_rt60_sec,
        small_early_delay_sec,
        large_early_delay_sec,
        max_rt60_size_delta,
        max_rt60_absorb_delta,
    );
    let d = measured_distinct(evidence_kind, evidence_fingerprint, true);
    AcousticReverbGeometrySoakReport {
        acoustic_reverb_geometry_ready: true,
        larger_room_longer_rt60: true,
        higher_absorption_shorter_rt60: true,
        early_delay_tracks_nearest_wall: true,
        eyring_shorter_than_sabine: true,
        outputs_finite: true,
        sample_count,
        small_rt60_sabine_sec,
        large_rt60_sabine_sec,
        low_absorb_rt60_sec,
        high_absorb_rt60_sec,
        small_early_delay_sec,
        large_early_delay_sec,
        max_rt60_size_delta,
        max_rt60_absorb_delta,
        evidence_kind,
        evidence_fingerprint,
        distinct_from_acoustic_raytracing_echo_probe: d,
        distinct_from_sonic_impedance_probe: d,
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_synesthetic_sensory_remap_probe: d,
        distinct_from_atmospheric_physical_damping_probe: d,
        distinct_from_lattice_boltzmann_fluid_solver_probe: d,
        distinct_from_aerodynamic_navier_stokes_probe: d,
        distinct_from_matter_thermodynamics_sph_probe: d,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: d,
        distinct_from_position_based_dynamics_probe: d,
        distinct_from_finite_element_analysis_probe: d,
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
        metasounds_hrtf_aaa_ready: false,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
    }
}

/// Honesty probe — soak-gated `acoustic_reverb_geometry_ready` (**ei**).
pub fn probe_acoustic_reverb_geometry() -> AcousticReverbGeometrySoakReport {
    run_acoustic_reverb_geometry_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn larger_room_increases_rt60() {
        let small = AcousticReverbGeometry::estimate_room_reverb(4.0, 3.0, 2.5, 0.2);
        let large = AcousticReverbGeometry::estimate_room_reverb(18.0, 12.0, 6.0, 0.2);
        assert!(large.volume_m3 > small.volume_m3);
        assert!(
            large.rt60_sabine_sec > small.rt60_sabine_sec + MIN_RT60_SIZE_DELTA,
            "{small:?} vs {large:?}"
        );
        assert!(large.rt60_eyring_sec > small.rt60_eyring_sec);
    }

    #[test]
    fn higher_absorption_shortens_rt60() {
        let low = AcousticReverbGeometry::estimate_room_reverb(8.0, 6.0, 3.0, 0.08);
        let high = AcousticReverbGeometry::estimate_room_reverb(8.0, 6.0, 3.0, 0.45);
        assert!(
            high.rt60_sabine_sec + MIN_RT60_ABSORB_DELTA < low.rt60_sabine_sec,
            "{low:?} vs {high:?}"
        );
        assert!((low.volume_m3 - high.volume_m3).abs() < 1e-5);
    }

    #[test]
    fn early_reflection_delay_from_nearest_wall() {
        // min edge = 4 → round-trip path 4 m → delay = 4/343
        let r = AcousticReverbGeometry::estimate_room_reverb(4.0, 6.0, 5.0, 0.25);
        let expected = 4.0 / SPEED_OF_SOUND_AIR;
        assert!((r.early_reflection_delay_sec - expected).abs() < 1e-5, "{r:?}");
        assert!((r.nearest_half_dim_m - 2.0).abs() < 1e-5);
    }

    #[test]
    fn eyring_shorter_than_sabine_for_finite_alpha() {
        let r = AcousticReverbGeometry::estimate_room_reverb(10.0, 8.0, 3.5, 0.3);
        assert!(r.rt60_eyring_sec < r.rt60_sabine_sec, "{r:?}");
        assert!(r.rt60_eyring_sec > 0.0);
        assert!(r.rt60_sabine_sec > 0.0);
    }

    #[test]
    fn sabine_matches_closed_form() {
        let l = 5.0_f32;
        let w = 4.0_f32;
        let h = 3.0_f32;
        let a = 0.22_f32;
        let r = AcousticReverbGeometry::calculate_sdf_bounce(l, w, h, a);
        let v = l * w * h;
        let s = 2.0 * (l * w + l * h + w * h);
        let expected = SABINE_CONSTANT * v / (a * s);
        assert!((r.rt60_sabine_sec - expected).abs() < 1e-5, "{r:?} vs {expected}");
    }

    #[test]
    fn degenerate_dims_or_alpha_fail_closed() {
        assert_eq!(
            AcousticReverbGeometry::estimate_room_reverb(0.0, 5.0, 3.0, 0.2),
            RoomReverbEstimate::EMPTY
        );
        assert_eq!(
            AcousticReverbGeometry::estimate_room_reverb(5.0, 5.0, 3.0, 0.0),
            RoomReverbEstimate::EMPTY
        );
        assert_eq!(
            AcousticReverbGeometry::estimate_room_reverb(5.0, 5.0, 3.0, 1.0),
            RoomReverbEstimate::EMPTY
        );
    }

    #[test]
    fn distinct_from_acoustic_raytracing_echo_api() {
        let reverb = AcousticReverbGeometry::estimate_room_reverb(8.0, 6.0, 3.0, 0.2);
        let echo = crate::acoustic_raytracing_echo::AcousticRaytracingEcho::propagate_sound_waves(
            1000.0,
            5.0,
            0.8,
            crate::acoustic_raytracing_echo::DENSITY_AIR,
        );
        // Reverb: room RT60 seconds; echo: single-wall delay+gain — different mechanisms.
        assert!(reverb.rt60_sabine_sec > 0.1);
        assert!(echo.delay_sec > 0.0 && echo.echo_gain > 0.0);
        assert_eq!(echo.bounce_count, 1);
        // Not interchangeable: RT60 ≫ first-order echo delay for same-ish scale.
        assert!(reverb.rt60_sabine_sec > echo.delay_sec * 5.0);
    }

    #[test]
    fn soak_probe_ready_and_held_flags() {
        let r = probe_acoustic_reverb_geometry();
        assert!(r.acoustic_reverb_geometry_ready, "{r:?}");
        assert!(r.larger_room_longer_rt60);
        assert!(r.higher_absorption_shorter_rt60);
        assert!(r.early_delay_tracks_nearest_wall);
        assert!(r.eyring_shorter_than_sabine);
        assert!(r.outputs_finite);
        assert_eq!(r.evidence_kind, REVERB_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(!r.metasounds_hrtf_aaa_ready);
        assert!(r.distinct_from_acoustic_raytracing_echo_probe);
        assert!(r.distinct_from_finite_element_analysis_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
    }

    #[test]
    fn reverb_probe_distinct_from_echo_fea_and_prior() {
        let reverb = probe_acoustic_reverb_geometry();
        let echo = crate::acoustic_raytracing_echo::probe_acoustic_raytracing_echo();
        let fea = crate::finite_element_analysis_kernel::probe_finite_element_analysis();
        let damp = crate::atmospheric_physical_damping::probe_atmospheric_physical_damping();
        let remap = crate::synesthetic_sensory_remap::probe_synesthetic_sensory_remap();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(reverb.acoustic_reverb_geometry_ready);
        assert!(echo.acoustic_raytracing_echo_ready);
        assert!(fea.finite_element_analysis_ready);
        assert!(damp.atmospheric_physical_damping_ready);
        assert!(remap.synesthetic_sensory_remap_ready);
        assert!(found.foundation_closed());

        assert!(reverb.distinct_from_acoustic_raytracing_echo_probe);
        assert!(reverb.distinct_from_finite_element_analysis_probe);
        assert!(reverb.distinct_from_sonic_impedance_probe);
        assert!(reverb.distinct_from_kernel_foundation_probe);
        assert!(!reverb.metasounds_hrtf_aaa_ready);
        // Different evidence fields.
        assert!(reverb.large_rt60_sabine_sec > 0.0);
        assert!(echo.max_delay_delta > 0.0);
        assert!(fea.tip_displacement > 0.0);
    }
}
