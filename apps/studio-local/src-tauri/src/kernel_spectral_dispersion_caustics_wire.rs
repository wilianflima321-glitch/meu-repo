//! Spectral Dispersion Caustics desktop wire — letter **gj**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::spectral_dispersion_caustics`
//! (wavelength-split Snell + Cauchy η(λ) through spherical lens → tiny
//! receiver grid; soak proves caustic hotspot > unfocused baseline +
//! chromatic spread > mono + same-seed field + intensities ≥0 / no NaN).
//! Honesty probe `spectralDispersionCausticsReady` is **distinct** from gi
//! `infiniteAntiAliasingReady`, gh `wgslSurfaceNoiseKernelReady`, gg
//! `fluidNinjaComputeReady`, gf `acesCinematicTonemapperReady`, ge
//! `preintegratedSssTransmittanceReady`, gd `chromaticGlassRefractionReady`,
//! and prior.
//! Full spectral path-tracer AAA stays false (HELD). Coins / Agones /
//! Nanite / DLSS / Quic HELD.
//!
//! Letter **im**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::spectral_dispersion_caustics::{
    probe_spectral_dispersion_caustics as kernel_probe, run_spectral_dispersion_caustics_soak,
    SpectralDispersionCausticsSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSpectralDispersionCausticsWireReport {
    pub spectral_dispersion_caustics_ready: bool,
    pub caustic_hotspot_above_baseline: bool,
    pub chromatic_spread_above_mono: bool,
    pub same_seed_same_field: bool,
    pub deterministic: bool,
    pub intensities_non_negative: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub peak_spectral: f32,
    pub peak_mono: f32,
    pub peak_unfocused: f32,
    pub chromatic_spread: f32,
    pub chromatic_spread_mono: f32,
    pub sample_count: u32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub spectral_path_tracer_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: SpectralDispersionCausticsSoakReport,
    note: impl Into<String>,
) -> KernelSpectralDispersionCausticsWireReport {
    KernelSpectralDispersionCausticsWireReport {
        spectral_dispersion_caustics_ready: r.spectral_dispersion_caustics_ready,
        caustic_hotspot_above_baseline: r.caustic_hotspot_above_baseline,
        chromatic_spread_above_mono: r.chromatic_spread_above_mono,
        same_seed_same_field: r.same_seed_same_field,
        deterministic: r.deterministic,
        intensities_non_negative: r.intensities_non_negative,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        peak_spectral: r.peak_spectral,
        peak_mono: r.peak_mono,
        peak_unfocused: r.peak_unfocused,
        chromatic_spread: r.chromatic_spread,
        chromatic_spread_mono: r.chromatic_spread_mono,
        sample_count: r.sample_count,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "gj".into(),
        note: note.into(),
        spectral_path_tracer_aaa_ready: r.spectral_path_tracer_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run spectral dispersion caustics soak via kernel.
pub fn run_kernel_spectral_dispersion_caustics_soak() -> KernelSpectralDispersionCausticsWireReport {
    let r = run_spectral_dispersion_caustics_soak();
    let note = if !r.spectral_dispersion_caustics_ready {
        "Spectral dispersion caustics soak failed — spectralDispersionCausticsReady stays false"
    } else {
        "Desktop soak: wavelength-split Snell + Cauchy η(λ) lens caustic on tiny grid; hotspot > unfocused + chromatic spread > mono; same seed→same; intensities≥0; no NaN — spectralDispersionCausticsReady true; spectral_path_tracer_aaa_ready false; distinct from gi infiniteAntiAliasingReady + gh wgslSurfaceNoiseKernelReady + gg fluidNinjaComputeReady + gf acesCinematicTonemapperReady + ge preintegratedSssTransmittanceReady + gd chromaticGlassRefractionReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `spectralDispersionCausticsReady` (letter gj).
pub fn probe_spectral_dispersion_caustics() -> KernelSpectralDispersionCausticsWireReport {
    to_report(
        kernel_probe(),
        "Spectral dispersion caustics probe (letter gj) — distinct from infiniteAntiAliasingReady, wgslSurfaceNoiseKernelReady, fluidNinjaComputeReady, acesCinematicTonemapperReady, preintegratedSssTransmittanceReady, chromaticGlassRefractionReady, and probe_kernel_foundation; spectral_path_tracer_aaa_ready HELD",
    )
}

/// Tauri IPC — spectral dispersion caustics honesty.
#[tauri::command]
pub fn probe_spectral_dispersion_caustics_cmd() -> KernelSpectralDispersionCausticsWireReport {
    probe_spectral_dispersion_caustics()
}

/// Tauri IPC — run spectral dispersion caustics soak.
#[tauri::command]
pub fn run_kernel_spectral_dispersion_caustics_soak_cmd() -> KernelSpectralDispersionCausticsWireReport {
    run_kernel_spectral_dispersion_caustics_soak()
}
