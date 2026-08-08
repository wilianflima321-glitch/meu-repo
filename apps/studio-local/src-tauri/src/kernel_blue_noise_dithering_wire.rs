//! Blue Noise Dithering Relaxer desktop wire — letter **fx**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::blue_noise_dithering_relaxer`
//! (dart-throwing + repulsion-relax blue-noise point set; soak same-seed
//! determinism + min pairwise distance > white-noise baseline). Honesty probe
//! `blueNoiseDitheringReady` is **distinct** from fw `quantumOverlapReady`, eo
//! `stochasticVirtualSdfReady`, and prior. Full SSAO/TAA AAA
//! (`ssao_taa_aaa_ready`) stays false (HELD). Coins / Agones / Nanite / DLSS /
//! Quic HELD.

use aethel_kernel_rust::blue_noise_dithering_relaxer::{
    probe_blue_noise_dithering as kernel_probe, run_blue_noise_dithering_soak,
    BlueNoiseDitheringSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelBlueNoiseDitheringWireReport {
    pub blue_noise_dithering_ready: bool,
    pub same_seed_same_points: bool,
    pub min_dist_beats_white: bool,
    pub mean_nn_beats_white: bool,
    pub dither_finite: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub point_count: u32,
    pub blue_min_dist: f32,
    pub white_min_dist: f32,
    pub blue_mean_nn: f32,
    pub white_mean_nn: f32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub ssao_taa_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: BlueNoiseDitheringSoakReport,
    note: impl Into<String>,
) -> KernelBlueNoiseDitheringWireReport {
    KernelBlueNoiseDitheringWireReport {
        blue_noise_dithering_ready: r.blue_noise_dithering_ready,
        same_seed_same_points: r.same_seed_same_points,
        min_dist_beats_white: r.min_dist_beats_white,
        mean_nn_beats_white: r.mean_nn_beats_white,
        dither_finite: r.dither_finite,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        point_count: r.point_count,
        blue_min_dist: r.blue_min_dist,
        white_min_dist: r.white_min_dist,
        blue_mean_nn: r.blue_mean_nn,
        white_mean_nn: r.white_mean_nn,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "fx".into(),
        note: note.into(),
        ssao_taa_aaa_ready: r.ssao_taa_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run blue noise dithering soak via kernel.
pub fn run_kernel_blue_noise_dithering_soak() -> KernelBlueNoiseDitheringWireReport {
    let r = run_blue_noise_dithering_soak();
    let note = if !r.blue_noise_dithering_ready {
        "Blue noise dithering soak failed — blueNoiseDitheringReady stays false"
    } else {
        "Desktop soak: dart-throw + relax blue-noise point set; same seed→same points; min pairwise distance > white noise — blueNoiseDitheringReady true; ssao_taa_aaa_ready false; distinct from fw quantumOverlapReady + eo stochasticVirtualSdfReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `blueNoiseDitheringReady` (letter fx).
pub fn probe_blue_noise_dithering() -> KernelBlueNoiseDitheringWireReport {
    to_report(
        kernel_probe(),
        "Blue noise dithering probe (letter fx) — distinct from quantumOverlapReady, stochasticVirtualSdfReady, and probe_kernel_foundation; ssao_taa_aaa_ready HELD",
    )
}

/// Tauri IPC — blue noise dithering honesty.
#[tauri::command]
pub fn probe_blue_noise_dithering_cmd() -> KernelBlueNoiseDitheringWireReport {
    probe_blue_noise_dithering()
}

/// Tauri IPC — run blue noise dithering soak.
#[tauri::command]
pub fn run_kernel_blue_noise_dithering_soak_cmd() -> KernelBlueNoiseDitheringWireReport {
    run_kernel_blue_noise_dithering_soak()
}
