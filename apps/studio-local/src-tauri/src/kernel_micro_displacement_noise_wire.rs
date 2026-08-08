//! Micro Displacement Noise desktop wire — letter **ev**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::micro_displacement_noise`
//! (multi-octave seeded value-noise SDF displacement).
//! Honesty probe `microDisplacementNoiseReady` is **distinct** from eu
//! `internalVoxelDensityReady`, et `svoDepthLodReady`, and prior probes.
//! Full Nanite micro-displacement AAA / Coins / Agones / DLSS HELD.

use aethel_kernel_rust::micro_displacement_noise::{
    probe_micro_displacement_noise as kernel_probe, run_micro_displacement_noise_soak,
    MicroDisplacementNoiseSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMicroDisplacementNoiseWireReport {
    pub micro_displacement_noise_ready: bool,
    pub dirt_zero_identity: bool,
    pub dirt_perturbs: bool,
    pub higher_dirt_larger_abs_delta: bool,
    pub deterministic_seed: bool,
    pub outputs_finite: bool,
    pub delta_low: f32,
    pub delta_high: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub nanite_micro_displacement_aaa_ready: bool,
    pub nanite_svo_aaa_ready: bool,
}

fn to_report(
    r: MicroDisplacementNoiseSoakReport,
    note: impl Into<String>,
) -> KernelMicroDisplacementNoiseWireReport {
    KernelMicroDisplacementNoiseWireReport {
        micro_displacement_noise_ready: r.micro_displacement_noise_ready,
        dirt_zero_identity: r.dirt_zero_identity,
        dirt_perturbs: r.dirt_perturbs,
        higher_dirt_larger_abs_delta: r.higher_dirt_larger_abs_delta,
        deterministic_seed: r.deterministic_seed,
        outputs_finite: r.outputs_finite,
        delta_low: r.delta_low,
        delta_high: r.delta_high,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "ev".into(),
        note: note.into(),
        nanite_micro_displacement_aaa_ready: r.nanite_micro_displacement_aaa_ready,
        nanite_svo_aaa_ready: r.nanite_svo_aaa_ready,
    }
}

/// Run micro-displacement noise soak via kernel.
pub fn run_kernel_micro_displacement_noise_soak() -> KernelMicroDisplacementNoiseWireReport {
    let r = run_micro_displacement_noise_soak();
    let note = if !r.micro_displacement_noise_ready {
        "Micro displacement noise soak failed — microDisplacementNoiseReady stays false"
    } else {
        "Desktop soak: multi-octave value-noise SDF displace; dirt=0 identity; higher dirt → larger |Δ|; deterministic seed — microDisplacementNoiseReady true; nanite_micro_displacement_aaa_ready false; distinct from eu internalVoxelDensityReady + et svoDepthLodReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `microDisplacementNoiseReady` (letter ev).
pub fn probe_micro_displacement_noise() -> KernelMicroDisplacementNoiseWireReport {
    to_report(
        kernel_probe(),
        "Micro displacement noise probe (letter ev) — distinct from internalVoxelDensityReady, svoDepthLodReady, sdfSculptorReady, and probe_kernel_foundation; nanite_micro_displacement_aaa_ready HELD",
    )
}

/// Tauri IPC — micro displacement noise honesty.
#[tauri::command]
pub fn probe_micro_displacement_noise_cmd() -> KernelMicroDisplacementNoiseWireReport {
    probe_micro_displacement_noise()
}

/// Tauri IPC — run micro displacement noise soak.
#[tauri::command]
pub fn run_kernel_micro_displacement_noise_soak_cmd() -> KernelMicroDisplacementNoiseWireReport {
    run_kernel_micro_displacement_noise_soak()
}
