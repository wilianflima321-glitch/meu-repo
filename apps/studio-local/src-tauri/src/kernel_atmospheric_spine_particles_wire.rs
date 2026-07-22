//! Atmospheric spine particles desktop wire — letter **gl**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::atmospheric_spine_particles`
//! (SoA dust integrate: spine wind + gravity + density drag + lifetime cull;
//! soak proves positions change vs t0, dead culled, same-seed, no NaN).
//! Honesty probe `atmosphericSpineParticlesReady` is **distinct** from gk
//! `hybridClusterShadingVsvmReady`, gj `spectralDispersionCausticsReady`,
//! gg `fluidNinjaComputeReady`, gf `acesCinematicTonemapperReady`, ge
//! `preintegratedSssTransmittanceReady`, and gd `chromaticGlassRefractionReady`
//! (never touch those probes).
//! Full Niagara / UE cascade AAA stay false (HELD). Coins / Agones / Nanite /
//! DLSS / Quic HELD.
//!
//! Letter **im**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::atmospheric_spine_particles::{
    probe_atmospheric_spine_particles as kernel_probe, run_atmospheric_spine_particles_soak,
    AtmosphericSpineParticlesSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAtmosphericSpineParticlesWireReport {
    pub atmospheric_spine_particles_ready: bool,
    pub positions_changed: bool,
    pub dead_culled: bool,
    pub same_seed_same_output: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub no_nan: bool,
    pub state_mutated: bool,
    pub alive_t0: u32,
    pub alive_tn: u32,
    pub culled_total: u32,
    pub mean_pos_delta: f32,
    pub mean_speed: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_hybrid_cluster_shading_vsvm_probe: bool,
    pub distinct_from_spectral_dispersion_caustics_probe: bool,
    pub distinct_from_fluid_ninja_compute_probe: bool,
    pub distinct_from_aces_cinematic_tonemapper_probe: bool,
    pub distinct_from_preintegrated_sss_transmittance_probe: bool,
    pub distinct_from_chromatic_glass_refraction_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub niagara_cascade_aaa_ready: bool,
    pub ue_cascade_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: AtmosphericSpineParticlesSoakReport,
    note: impl Into<String>,
) -> KernelAtmosphericSpineParticlesWireReport {
    KernelAtmosphericSpineParticlesWireReport {
        atmospheric_spine_particles_ready: r.atmospheric_spine_particles_ready,
        positions_changed: r.positions_changed,
        dead_culled: r.dead_culled,
        same_seed_same_output: r.same_seed_same_output,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        no_nan: r.no_nan,
        state_mutated: r.state_mutated,
        alive_t0: r.alive_t0,
        alive_tn: r.alive_tn,
        culled_total: r.culled_total,
        mean_pos_delta: r.mean_pos_delta,
        mean_speed: r.mean_speed,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_hybrid_cluster_shading_vsvm_probe: r
            .distinct_from_hybrid_cluster_shading_vsvm_probe,
        distinct_from_spectral_dispersion_caustics_probe: r
            .distinct_from_spectral_dispersion_caustics_probe,
        distinct_from_fluid_ninja_compute_probe: r.distinct_from_fluid_ninja_compute_probe,
        distinct_from_aces_cinematic_tonemapper_probe: r
            .distinct_from_aces_cinematic_tonemapper_probe,
        distinct_from_preintegrated_sss_transmittance_probe: r
            .distinct_from_preintegrated_sss_transmittance_probe,
        distinct_from_chromatic_glass_refraction_probe: r
            .distinct_from_chromatic_glass_refraction_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "gl".into(),
        note: note.into(),
        niagara_cascade_aaa_ready: r.niagara_cascade_aaa_ready,
        ue_cascade_aaa_ready: r.ue_cascade_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run Atmospheric spine particles soak via kernel.
pub fn run_kernel_atmospheric_spine_particles_soak() -> KernelAtmosphericSpineParticlesWireReport {
    let r = run_atmospheric_spine_particles_soak();
    let note = if !r.atmospheric_spine_particles_ready {
        "Atmospheric spine particles soak failed — atmosphericSpineParticlesReady stays false"
    } else {
        "Desktop soak: SoA spine wind+gravity+drag integrate + lifetime cull; positions change vs t0 + dead culled + same seed→same + no NaN — atmosphericSpineParticlesReady true; niagara_cascade_aaa_ready / ue_cascade_aaa_ready false; distinct from gk hybridClusterShadingVsvmReady + gj spectralDispersionCausticsReady + gg fluidNinjaComputeReady + gf acesCinematicTonemapperReady + ge preintegratedSssTransmittanceReady + gd chromaticGlassRefractionReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `atmosphericSpineParticlesReady` (letter gl).
pub fn probe_atmospheric_spine_particles() -> KernelAtmosphericSpineParticlesWireReport {
    to_report(
        kernel_probe(),
        "Atmospheric spine particles probe (letter gl) — distinct from hybridClusterShadingVsvmReady, spectralDispersionCausticsReady, fluidNinjaComputeReady, acesCinematicTonemapperReady, preintegratedSssTransmittanceReady, chromaticGlassRefractionReady, and probe_kernel_foundation; niagara_cascade_aaa_ready / ue_cascade_aaa_ready HELD",
    )
}

/// Tauri IPC — Atmospheric spine particles honesty.
#[tauri::command]
pub fn probe_atmospheric_spine_particles_cmd() -> KernelAtmosphericSpineParticlesWireReport {
    probe_atmospheric_spine_particles()
}

/// Tauri IPC — run Atmospheric spine particles soak.
#[tauri::command]
pub fn run_kernel_atmospheric_spine_particles_soak_cmd() -> KernelAtmosphericSpineParticlesWireReport {
    run_kernel_atmospheric_spine_particles_soak()
}
