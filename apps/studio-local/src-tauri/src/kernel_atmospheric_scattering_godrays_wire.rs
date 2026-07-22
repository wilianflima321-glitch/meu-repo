//! Atmospheric Scattering Godrays desktop wire — letter **gb**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::atmospheric_scattering_godrays`
//! (single-scattering Beer–Lambert optical depth + godray shaft integral;
//! soak proves denser/longer → lower T, occluder reduces godray, same-seed,
//! values in [0,1]).
//! Honesty probe `atmosphericScatteringGodraysReady` is **distinct** from ga
//! `voxelConeRadiosityReady`, fz `symmetricVectorAlgebraReady`, fy
//! `recursiveFractalEnhancementReady`, fx `blueNoiseDitheringReady`, fw
//! `quantumOverlapReady`, ew `volumetricExtinctionMediumReady`, and prior.
//! Full volumetric fog AAA / UE sky atmosphere stay false (HELD). Coins /
//! Agones / Nanite / DLSS / Quic HELD.
//!
//! Letter **il**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::atmospheric_scattering_godrays::{
    probe_atmospheric_scattering_godrays as kernel_probe,
    run_atmospheric_scattering_godrays_soak, AtmosphericScatteringGodraysSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAtmosphericScatteringGodraysWireReport {
    pub atmospheric_scattering_godrays_ready: bool,
    pub denser_lower_transmittance: bool,
    pub longer_path_lower_transmittance: bool,
    pub occluder_reduces_godray: bool,
    pub same_seed_same_results: bool,
    pub deterministic: bool,
    pub values_in_unit_interval: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub clear_godray: f32,
    pub occluded_godray: f32,
    pub tr_low_density: f32,
    pub tr_high_density: f32,
    pub tr_short_path: f32,
    pub tr_long_path: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_voxel_cone_radiosity_probe: bool,
    pub distinct_from_symmetric_vector_algebra_probe: bool,
    pub distinct_from_recursive_fractal_enhancement_probe: bool,
    pub distinct_from_blue_noise_dithering_probe: bool,
    pub distinct_from_quantum_overlap_probe: bool,
    pub distinct_from_volumetric_extinction_medium_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub volumetric_fog_aaa_ready: bool,
    pub ue_sky_atmosphere_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: AtmosphericScatteringGodraysSoakReport,
    note: impl Into<String>,
) -> KernelAtmosphericScatteringGodraysWireReport {
    KernelAtmosphericScatteringGodraysWireReport {
        atmospheric_scattering_godrays_ready: r.atmospheric_scattering_godrays_ready,
        denser_lower_transmittance: r.denser_lower_transmittance,
        longer_path_lower_transmittance: r.longer_path_lower_transmittance,
        occluder_reduces_godray: r.occluder_reduces_godray,
        same_seed_same_results: r.same_seed_same_results,
        deterministic: r.deterministic,
        values_in_unit_interval: r.values_in_unit_interval,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        clear_godray: r.clear_godray,
        occluded_godray: r.occluded_godray,
        tr_low_density: r.tr_low_density,
        tr_high_density: r.tr_high_density,
        tr_short_path: r.tr_short_path,
        tr_long_path: r.tr_long_path,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_voxel_cone_radiosity_probe: r.distinct_from_voxel_cone_radiosity_probe,
        distinct_from_symmetric_vector_algebra_probe: r.distinct_from_symmetric_vector_algebra_probe,
        distinct_from_recursive_fractal_enhancement_probe: r
            .distinct_from_recursive_fractal_enhancement_probe,
        distinct_from_blue_noise_dithering_probe: r.distinct_from_blue_noise_dithering_probe,
        distinct_from_quantum_overlap_probe: r.distinct_from_quantum_overlap_probe,
        distinct_from_volumetric_extinction_medium_probe: r
            .distinct_from_volumetric_extinction_medium_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "gb".into(),
        note: note.into(),
        volumetric_fog_aaa_ready: r.volumetric_fog_aaa_ready,
        ue_sky_atmosphere_ready: r.ue_sky_atmosphere_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run atmospheric scattering godrays soak via kernel.
pub fn run_kernel_atmospheric_scattering_godrays_soak() -> KernelAtmosphericScatteringGodraysWireReport {
    let r = run_atmospheric_scattering_godrays_soak();
    let note = if !r.atmospheric_scattering_godrays_ready {
        "Atmospheric scattering godrays soak failed — atmosphericScatteringGodraysReady stays false"
    } else {
        "Desktop soak: Beer–Lambert τ/T + single-scatter godray; denser/longer→lower T; occluder < clear godray; same seed→same; values∈[0,1] — atmosphericScatteringGodraysReady true; volumetric_fog_aaa_ready / ue_sky_atmosphere_ready false; distinct from ga voxelConeRadiosityReady + fz symmetricVectorAlgebraReady + fy recursiveFractalEnhancementReady + fx blueNoiseDitheringReady + fw quantumOverlapReady + ew volumetricExtinctionMediumReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `atmosphericScatteringGodraysReady` (letter gb).
pub fn probe_atmospheric_scattering_godrays() -> KernelAtmosphericScatteringGodraysWireReport {
    to_report(
        kernel_probe(),
        "Atmospheric scattering godrays probe (letter gb) — distinct from voxelConeRadiosityReady, symmetricVectorAlgebraReady, recursiveFractalEnhancementReady, blueNoiseDitheringReady, quantumOverlapReady, volumetricExtinctionMediumReady, and probe_kernel_foundation; volumetric_fog_aaa_ready / ue_sky_atmosphere_ready HELD",
    )
}

/// Tauri IPC — atmospheric scattering godrays honesty.
#[tauri::command]
pub fn probe_atmospheric_scattering_godrays_cmd() -> KernelAtmosphericScatteringGodraysWireReport {
    probe_atmospheric_scattering_godrays()
}

/// Tauri IPC — run atmospheric scattering godrays soak.
#[tauri::command]
pub fn run_kernel_atmospheric_scattering_godrays_soak_cmd() -> KernelAtmosphericScatteringGodraysWireReport {
    run_kernel_atmospheric_scattering_godrays_soak()
}
