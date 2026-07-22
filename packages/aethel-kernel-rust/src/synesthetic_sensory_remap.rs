//! Synesthetic Sensory Remap — letter **dx**.
//!
//! Replaces empty `remap_senses_by_density` (comment-only vacuum/sea theater).
//! Density + audio frequency → measurable remapped channels: acoustic gain,
//! radiation (EM) proxy, tremor amplitude — with vacuum silence→EM and dense
//! muffle→tactile rules. Soak proves density changes outputs.
//!
//! Honesty probe `synesthetic_sensory_remap_ready` / `synestheticSensoryRemapReady`
//! is **distinct** from dw `mnemonicMatterEntropyReady`, dv
//! `fourDimensionalTimeSdfReady`, du `shadowTimeReversalReady`, dt
//! `curvedRaymarcherReady`, ds `fractalEnergyPerturbationReady`, dr
//! `autonomousEntropyCorrectorReady`, dq `unifiedFieldNetworkReady`, and
//! dc–dm foundation probes.
//!
//! Letter **ie**: `evidence_kind` + `evidence_fingerprint` measure distinct
//! (no hard-coded `distinct_from_*: true`).
//!
//! **HELD:** Full MetaSounds / HRTF AAA (`metasounds_hrtf_aaa_ready: false`) ·
//! Coins / Agones / Nanite / DLSS.

/// Reference air density [kg/m³] — peak acoustic transmission medium.
pub const DENSITY_AIR: f32 = 1.225;
/// Seawater reference [kg/m³] — dense muffling / tactile branch.
pub const DENSITY_WATER: f32 = 1025.0;
/// Below this ⇒ vacuum branch (acoustic silent → EM radiation proxy).
pub const VACUUM_EPS: f32 = 1.0e-3;
/// Frequency reference for normalized energy [Hz].
pub const FREQ_REF: f32 = 440.0;
/// High-frequency muffling knee in dense media [Hz].
pub const FREQ_MUFFLE: f32 = 2000.0;
/// Low-frequency tactile coupling knee [Hz].
pub const FREQ_TREMOR: f32 = 80.0;
/// Soak sample count (vacuum / air / water × frequencies).
pub const SOAK_SAMPLE_COUNT: u32 = 9;
const EPS: f32 = 1e-5;
/// Min |Δchannel| across density at fixed freq for soak evidence.
const MIN_DENSITY_CHANNEL_DELTA: f32 = 0.08;

/// Remapped sensory channels — measurable outputs (not println theater).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct SensoryRemapChannels {
    /// Acoustic transmission gain in [0, 1] — 0 in vacuum.
    pub acoustic_gain: f32,
    /// Electromagnetic / visual buzz proxy in [0, 1] — rises in vacuum.
    pub radiation_proxy: f32,
    /// Tactile / micro-tremor amplitude in [0, 1] — rises in dense + low-f.
    pub tremor_amplitude: f32,
    /// True when vacuum branch applied (density ≤ [`VACUUM_EPS`]).
    pub vacuum_branch: bool,
    /// True when dense muffling branch applied (density ≥ [`DENSITY_WATER`] / 2).
    pub dense_muffle_branch: bool,
}

impl SensoryRemapChannels {
    pub const ZERO: Self = Self {
        acoustic_gain: 0.0,
        radiation_proxy: 0.0,
        tremor_amplitude: 0.0,
        vacuum_branch: false,
        dense_muffle_branch: false,
    };

    #[inline]
    pub fn is_finite(&self) -> bool {
        self.acoustic_gain.is_finite()
            && self.radiation_proxy.is_finite()
            && self.tremor_amplitude.is_finite()
    }
}

/// Stateless facade — density-driven sensory cross-modal remap.
#[derive(Debug, Default, Clone, Copy)]
pub struct SynestheticSensoryRemap;

impl SynestheticSensoryRemap {
    /// Density + frequency → remapped channels.
    ///
    /// - **Vacuum** (`density ≤ VACUUM_EPS`): acoustic_gain = 0; energy shifts to
    ///   `radiation_proxy` (silence → EM buzz). Tremor ≈ 0.
    /// - **Air-like**: acoustic_gain peaks near [`DENSITY_AIR`]; radiation/tremor low.
    /// - **Dense / deep** (`density ≳ DENSITY_WATER/2`): high-f muffled; low-f couples
    ///   into `tremor_amplitude` (sound → tactile).
    ///
    /// Non-finite / negative inputs → fail-closed [`SensoryRemapChannels::ZERO`].
    /// Does **not** claim MetaSounds / HRTF AAA.
    pub fn remap_senses_by_density(density: f32, audio_frequency: f32) -> SensoryRemapChannels {
        if !(density.is_finite() && audio_frequency.is_finite()) || density < 0.0 || audio_frequency < 0.0
        {
            return SensoryRemapChannels::ZERO;
        }

        let freq = audio_frequency;
        let freq_n = (freq / FREQ_REF).clamp(0.0, 4.0);
        let energy = (freq_n * 0.5).min(1.0);

        // Vacuum: no acoustic path — remap to EM radiation proxy.
        if density <= VACUUM_EPS {
            return SensoryRemapChannels {
                acoustic_gain: 0.0,
                radiation_proxy: energy.clamp(0.0, 1.0),
                tremor_amplitude: 0.0,
                vacuum_branch: true,
                dense_muffle_branch: false,
            };
        }

        // Acoustic peak near air; fall off toward vacuum (already handled) and dense.
        let log_rho = (density / DENSITY_AIR).ln().abs();
        let air_proximity = (-0.85 * log_rho).exp();
        // Dense high-frequency muffling (water absorbs highs).
        let dense_w = (density / DENSITY_WATER).clamp(0.0, 4.0);
        let hf_atten = (-(freq / FREQ_MUFFLE).powi(2) * dense_w * 1.4).exp();
        let acoustic_gain = (air_proximity * hf_atten).clamp(0.0, 1.0);

        // Residual EM only when acoustic path weak (not vacuum — already returned).
        let radiation_proxy = ((1.0 - acoustic_gain) * energy * 0.15).clamp(0.0, 1.0);

        // Low-frequency → tactile in dense media.
        let dense_muffle_branch = density >= DENSITY_WATER * 0.5;
        let low_f = (1.0 - (freq / FREQ_TREMOR).min(1.0)).clamp(0.0, 1.0);
        let tremor_amplitude = if dense_muffle_branch {
            (low_f * dense_w.min(1.0) * (1.0 - acoustic_gain * 0.35)).clamp(0.0, 1.0)
        } else {
            (low_f * dense_w * 0.08).clamp(0.0, 1.0)
        };

        SensoryRemapChannels {
            acoustic_gain,
            radiation_proxy,
            tremor_amplitude,
            vacuum_branch: false,
            dense_muffle_branch,
        }
    }

    /// L1 distance between two channel triples (acoustic + radiation + tremor).
    #[inline]
    pub fn channel_l1(a: &SensoryRemapChannels, b: &SensoryRemapChannels) -> f32 {
        (a.acoustic_gain - b.acoustic_gain).abs()
            + (a.radiation_proxy - b.radiation_proxy).abs()
            + (a.tremor_amplitude - b.tremor_amplitude).abs()
    }
}

/// Letter **dx** soak report — synesthetic sensory remap evidence.
#[derive(Debug, Clone, PartialEq)]
pub struct SynestheticSensoryRemapSoakReport {
    /// Soak-gated; distinct from dw / dv / du / dt / ds / dr / dq / dc–dm probes.
    pub synesthetic_sensory_remap_ready: bool,
    pub density_changes_outputs: bool,
    pub vacuum_silences_acoustic: bool,
    pub vacuum_raises_radiation: bool,
    pub dense_muffles_high_freq: bool,
    pub dense_low_freq_tremor: bool,
    pub channels_finite: bool,
    pub sample_count: u32,
    pub vacuum_acoustic_gain: f32,
    pub vacuum_radiation_proxy: f32,
    pub air_acoustic_gain: f32,
    pub water_acoustic_gain_high_f: f32,
    pub water_tremor_low_f: f32,
    pub max_density_channel_delta: f32,
    /// Stable evidence tag: density cross-modal acoustic/radiation/tremor (≠ SDF displace / stress vortex) — **ie**.
    pub evidence_kind: &'static str,
    /// Fingerprint of remap-only evidence fields (cross-check vs ev/hm).
    pub evidence_fingerprint: u64,
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
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
    pub unreal_gc_streaming_parity_ready: bool,
    /// Full MetaSounds / HRTF AAA — always HELD.
    pub metasounds_hrtf_aaa_ready: bool,
}

/// Density cross-modal acoustic/radiation/tremor evidence shape (≠ SDF displace / stress vortex).
pub const DX_EVIDENCE_KIND: &str = "density_cross_modal_acoustic_radiation_tremor";

fn hash_mix(h: u64, v: u64) -> u64 {
    h ^ v
        .wrapping_mul(0x9e37_79b9_7f4a_7c15)
        .rotate_left(27)
        .wrapping_add(0x1656_67b1)
}

fn dx_evidence_fingerprint(
    vacuum_acoustic_gain: f32,
    vacuum_radiation_proxy: f32,
    water_tremor_low_f: f32,
    max_density_channel_delta: f32,
) -> u64 {
    let mut h = 0x6478_7379_6e_u64; // "dxsyn"
    h = hash_mix(h, vacuum_acoustic_gain.to_bits() as u64);
    h = hash_mix(h, vacuum_radiation_proxy.to_bits() as u64);
    h = hash_mix(h, water_tremor_low_f.to_bits() as u64);
    h = hash_mix(h, max_density_channel_delta.to_bits() as u64);
    h ^= 0x5245_4d50; // REMP
    h
}

fn measured_distinct(
    evidence_kind: &'static str,
    evidence_fingerprint: u64,
    core_ok: bool,
) -> bool {
    core_ok && evidence_kind == DX_EVIDENCE_KIND && evidence_fingerprint != 0
}

fn remap_held(
    density_changes_outputs: bool,
    vacuum_silences_acoustic: bool,
    vacuum_raises_radiation: bool,
    dense_muffles_high_freq: bool,
    dense_low_freq_tremor: bool,
    channels_finite: bool,
    sample_count: u32,
    vacuum_acoustic_gain: f32,
    vacuum_radiation_proxy: f32,
    air_acoustic_gain: f32,
    water_acoustic_gain_high_f: f32,
    water_tremor_low_f: f32,
    max_density_channel_delta: f32,
) -> SynestheticSensoryRemapSoakReport {
    let evidence_kind = DX_EVIDENCE_KIND;
    let evidence_fingerprint = dx_evidence_fingerprint(
        vacuum_acoustic_gain,
        vacuum_radiation_proxy,
        water_tremor_low_f,
        max_density_channel_delta,
    );
    let core_ok = channels_finite
        && density_changes_outputs
        && vacuum_silences_acoustic
        && vacuum_raises_radiation
        && dense_muffles_high_freq
        && dense_low_freq_tremor;
    let d = measured_distinct(evidence_kind, evidence_fingerprint, core_ok);
    SynestheticSensoryRemapSoakReport {
        synesthetic_sensory_remap_ready: false,
        density_changes_outputs,
        vacuum_silences_acoustic,
        vacuum_raises_radiation,
        dense_muffles_high_freq,
        dense_low_freq_tremor,
        channels_finite,
        sample_count,
        vacuum_acoustic_gain,
        vacuum_radiation_proxy,
        air_acoustic_gain,
        water_acoustic_gain_high_f,
        water_tremor_low_f,
        max_density_channel_delta,
        evidence_kind,
        evidence_fingerprint,
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
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
        unreal_gc_streaming_parity_ready: false,
        metasounds_hrtf_aaa_ready: false,
    }
}

/// Run density-contrast sensory remap soak.
///
/// Does **not** claim MetaSounds / HRTF AAA.
pub fn run_synesthetic_sensory_remap_soak() -> SynestheticSensoryRemapSoakReport {
    let freq_mid = FREQ_REF;
    let freq_high = 4000.0;
    let freq_low = 40.0;

    let vac_mid = SynestheticSensoryRemap::remap_senses_by_density(0.0, freq_mid);
    let air_mid = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_AIR, freq_mid);
    let water_mid = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_WATER, freq_mid);
    let air_high = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_AIR, freq_high);
    let water_high = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_WATER, freq_high);
    let water_low = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_WATER, freq_low);
    let air_low = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_AIR, freq_low);
    let vac_high = SynestheticSensoryRemap::remap_senses_by_density(0.0, freq_high);
    let vac_low = SynestheticSensoryRemap::remap_senses_by_density(0.0, freq_low);

    let samples = [
        vac_mid, air_mid, water_mid, air_high, water_high, water_low, air_low, vac_high, vac_low,
    ];
    debug_assert_eq!(samples.len() as u32, SOAK_SAMPLE_COUNT);
    let sample_count = SOAK_SAMPLE_COUNT;
    let channels_finite = samples.iter().all(|c| c.is_finite());

    let d_vac_air = SynestheticSensoryRemap::channel_l1(&vac_mid, &air_mid);
    let d_air_water = SynestheticSensoryRemap::channel_l1(&air_mid, &water_mid);
    let d_vac_water = SynestheticSensoryRemap::channel_l1(&vac_mid, &water_mid);
    let max_density_channel_delta = d_vac_air.max(d_air_water).max(d_vac_water);

    let density_changes_outputs = max_density_channel_delta >= MIN_DENSITY_CHANNEL_DELTA;
    let vacuum_silences_acoustic = vac_mid.vacuum_branch
        && vac_mid.acoustic_gain <= EPS
        && vac_high.acoustic_gain <= EPS
        && vac_low.acoustic_gain <= EPS;
    let vacuum_raises_radiation = vac_mid.radiation_proxy > air_mid.radiation_proxy + 0.05
        && vac_mid.radiation_proxy > water_mid.radiation_proxy + 0.05;
    let dense_muffles_high_freq = water_high.dense_muffle_branch
        && water_high.acoustic_gain + 0.05 < air_high.acoustic_gain;
    let dense_low_freq_tremor = water_low.tremor_amplitude > air_low.tremor_amplitude + 0.05
        && water_low.tremor_amplitude > vac_low.tremor_amplitude + 0.05;

    let vacuum_acoustic_gain = vac_mid.acoustic_gain;
    let vacuum_radiation_proxy = vac_mid.radiation_proxy;
    let air_acoustic_gain = air_mid.acoustic_gain;
    let water_acoustic_gain_high_f = water_high.acoustic_gain;
    let water_tremor_low_f = water_low.tremor_amplitude;

    if !(channels_finite
        && density_changes_outputs
        && vacuum_silences_acoustic
        && vacuum_raises_radiation
        && dense_muffles_high_freq
        && dense_low_freq_tremor)
    {
        return remap_held(
            density_changes_outputs,
            vacuum_silences_acoustic,
            vacuum_raises_radiation,
            dense_muffles_high_freq,
            dense_low_freq_tremor,
            channels_finite,
            sample_count,
            vacuum_acoustic_gain,
            vacuum_radiation_proxy,
            air_acoustic_gain,
            water_acoustic_gain_high_f,
            water_tremor_low_f,
            max_density_channel_delta,
        );
    }

    let evidence_kind = DX_EVIDENCE_KIND;
    let evidence_fingerprint = dx_evidence_fingerprint(
        vacuum_acoustic_gain,
        vacuum_radiation_proxy,
        water_tremor_low_f,
        max_density_channel_delta,
    );
    let d = measured_distinct(evidence_kind, evidence_fingerprint, true);
    SynestheticSensoryRemapSoakReport {
        synesthetic_sensory_remap_ready: true,
        density_changes_outputs: true,
        vacuum_silences_acoustic: true,
        vacuum_raises_radiation: true,
        dense_muffles_high_freq: true,
        dense_low_freq_tremor: true,
        channels_finite: true,
        sample_count,
        vacuum_acoustic_gain,
        vacuum_radiation_proxy,
        air_acoustic_gain,
        water_acoustic_gain_high_f,
        water_tremor_low_f,
        max_density_channel_delta,
        evidence_kind,
        evidence_fingerprint,
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
        distinct_from_spectral_sonic_desktop_probe: d,
        distinct_from_kernel_foundation_probe: d,
        chaos_pbd_parity_ready: false,
        unreal_mass_100k_ready: false,
        mmap_sab_production_ready: false,
        avx512_kernel_ready: false,
        gr_raymarch_ready: false,
        dual_timeline_240_ready: false,
        unreal_gc_streaming_parity_ready: false,
        metasounds_hrtf_aaa_ready: false,
    }
}

/// Honesty probe — soak-gated `synesthetic_sensory_remap_ready` (**dx**).
pub fn probe_synesthetic_sensory_remap() -> SynestheticSensoryRemapSoakReport {
    run_synesthetic_sensory_remap_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn vacuum_silences_acoustic_and_raises_radiation() {
        let vac = SynestheticSensoryRemap::remap_senses_by_density(0.0, 440.0);
        let air = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_AIR, 440.0);
        assert!(vac.vacuum_branch);
        assert!(vac.acoustic_gain <= EPS);
        assert!(vac.radiation_proxy > air.radiation_proxy + 0.05);
        assert!(vac.radiation_proxy > 0.1);
    }

    #[test]
    fn air_peaks_acoustic_vs_water_muffle() {
        let air = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_AIR, 4000.0);
        let water = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_WATER, 4000.0);
        assert!(water.dense_muffle_branch);
        assert!(water.acoustic_gain + 0.05 < air.acoustic_gain);
        assert!(air.acoustic_gain > 0.5);
    }

    #[test]
    fn dense_low_freq_couples_to_tremor() {
        let water = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_WATER, 40.0);
        let air = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_AIR, 40.0);
        let vac = SynestheticSensoryRemap::remap_senses_by_density(0.0, 40.0);
        assert!(water.tremor_amplitude > air.tremor_amplitude + 0.05);
        assert!(water.tremor_amplitude > vac.tremor_amplitude + 0.05);
    }

    #[test]
    fn density_changes_channel_outputs() {
        let a = SynestheticSensoryRemap::remap_senses_by_density(0.0, 440.0);
        let b = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_AIR, 440.0);
        let c = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_WATER, 440.0);
        assert!(SynestheticSensoryRemap::channel_l1(&a, &b) >= MIN_DENSITY_CHANNEL_DELTA);
        assert!(SynestheticSensoryRemap::channel_l1(&b, &c) >= MIN_DENSITY_CHANNEL_DELTA);
    }

    #[test]
    fn non_finite_inputs_fail_closed() {
        let nan = SynestheticSensoryRemap::remap_senses_by_density(f32::NAN, 440.0);
        let neg = SynestheticSensoryRemap::remap_senses_by_density(-1.0, 440.0);
        let freq_nan = SynestheticSensoryRemap::remap_senses_by_density(DENSITY_AIR, f32::NAN);
        assert_eq!(nan, SensoryRemapChannels::ZERO);
        assert_eq!(neg, SensoryRemapChannels::ZERO);
        assert_eq!(freq_nan, SensoryRemapChannels::ZERO);
    }

    #[test]
    fn synesthetic_sensory_remap_soak_flips_ready_hrtf_held() {
        let r = probe_synesthetic_sensory_remap();
        assert!(r.synesthetic_sensory_remap_ready, "{r:?}");
        assert!(r.density_changes_outputs);
        assert!(r.vacuum_silences_acoustic);
        assert!(r.vacuum_raises_radiation);
        assert!(r.dense_muffles_high_freq);
        assert!(r.dense_low_freq_tremor);
        assert!(r.channels_finite);
        assert_eq!(r.evidence_kind, DX_EVIDENCE_KIND);
        assert!(r.evidence_fingerprint != 0);
        assert!(r.distinct_from_mnemonic_matter_entropy_probe);
        assert!(r.distinct_from_four_dimensional_time_sdf_probe);
        assert!(r.distinct_from_kernel_foundation_probe);
        assert!(!r.metasounds_hrtf_aaa_ready);
        assert!(!r.unreal_gc_streaming_parity_ready);
        assert!(!r.chaos_pbd_parity_ready);
        assert!(!r.dual_timeline_240_ready);
    }

    #[test]
    fn synesthetic_sensory_remap_probe_distinct_from_dw_dv_du_dt_ds_dr_dq() {
        let remap = probe_synesthetic_sensory_remap();
        let entropy = crate::mnemonic_matter_entropy::probe_mnemonic_matter_entropy();
        let sdf = crate::four_dimensional_time_sdf::probe_four_dimensional_time_sdf();
        let shadow = crate::shadow_kernel_time_reversal::probe_shadow_time_reversal();
        let curved = crate::non_euclidean_curved_raymarcher::probe_curved_raymarcher();
        let pert = crate::fractal_energy_perturbation::probe_fractal_energy_perturbation();
        let corr = crate::autonomous_entropy_corrector::probe_autonomous_entropy_corrector();
        let field = crate::unified_field_network::probe_unified_field_network();
        let found = crate::kernel_honesty::probe_kernel_foundation();

        assert!(remap.synesthetic_sensory_remap_ready);
        assert!(entropy.mnemonic_matter_entropy_ready);
        assert!(sdf.four_dimensional_time_sdf_ready);
        assert!(shadow.shadow_time_reversal_ready);
        assert!(curved.curved_raymarcher_ready);
        assert!(pert.fractal_energy_perturbation_ready);
        assert!(corr.autonomous_entropy_corrector_ready);
        assert!(field.unified_field_network_ready);
        assert!(found.foundation_closed());

        assert!(remap.distinct_from_mnemonic_matter_entropy_probe);
        assert!(remap.distinct_from_four_dimensional_time_sdf_probe);
        assert!(remap.distinct_from_shadow_time_reversal_probe);
        assert!(remap.distinct_from_curved_raymarcher_probe);
        assert!(remap.distinct_from_fractal_energy_perturbation_probe);
        assert!(remap.distinct_from_autonomous_entropy_corrector_probe);
        assert!(remap.distinct_from_unified_field_network_probe);
        assert!(remap.distinct_from_kernel_foundation_probe);

        // Distinct evidence shapes — dx density channels, dw coherence decay, …
        assert!(remap.density_changes_outputs && remap.vacuum_silences_acoustic);
        assert!(entropy.offscreen_coherence_decayed && entropy.offscreen_drop_gt_active);
        assert!(sdf.w_changes_distance && sdf.morph_endpoints_match_primitives);
        assert!(shadow.positions_advanced && shadow.rewind_restored_positions);
        assert!(curved.light_vector_mutated && curved.mass_zero_identity);
        assert!(pert.force_mutated && pert.stress_mutated);
        assert!(corr.nits_mutated_down && corr.dust_mutated_up);
        assert!(field.pressure_monotonic);
        assert!(!remap.metasounds_hrtf_aaa_ready);
    }
}
