//! Recursive Fractal Enhancement desktop wire — letter **fy**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::recursive_fractal_enhancement`
//! (diamond-square lite midpoint displacement; soak same-seed determinism +
//! depth increases variance/edge/filled vs depth-0). Honesty probe
//! `recursiveFractalEnhancementReady` is **distinct** from fx
//! `blueNoiseDitheringReady`, fw `quantumOverlapReady`, ev
//! `microDisplacementNoiseReady`, and prior. Full Nanite/Lumen/Unreal terrain
//! AAA (`nanite_lumen_terrain_aaa_ready`) stays false (HELD). Coins / Agones /
//! Nanite / DLSS / Quic HELD.

use aethel_kernel_rust::recursive_fractal_enhancement::{
    probe_recursive_fractal_enhancement as kernel_probe, run_recursive_fractal_enhancement_soak,
    RecursiveFractalEnhancementSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelRecursiveFractalEnhancementWireReport {
    pub recursive_fractal_enhancement_ready: bool,
    pub same_seed_same_field: bool,
    pub depth_increases_variance: bool,
    pub depth_increases_edge_count: bool,
    pub depth_increases_filled_samples: bool,
    pub deterministic: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub sample_count: u32,
    pub variance_depth0: f32,
    pub variance_deep: f32,
    pub edge_count_depth0: u32,
    pub edge_count_deep: u32,
    pub filled_depth0: u32,
    pub filled_deep: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub nanite_lumen_terrain_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: RecursiveFractalEnhancementSoakReport,
    note: impl Into<String>,
) -> KernelRecursiveFractalEnhancementWireReport {
    KernelRecursiveFractalEnhancementWireReport {
        recursive_fractal_enhancement_ready: r.recursive_fractal_enhancement_ready,
        same_seed_same_field: r.same_seed_same_field,
        depth_increases_variance: r.depth_increases_variance,
        depth_increases_edge_count: r.depth_increases_edge_count,
        depth_increases_filled_samples: r.depth_increases_filled_samples,
        deterministic: r.deterministic,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        sample_count: r.sample_count,
        variance_depth0: r.variance_depth0,
        variance_deep: r.variance_deep,
        edge_count_depth0: r.edge_count_depth0,
        edge_count_deep: r.edge_count_deep,
        filled_depth0: r.filled_depth0,
        filled_deep: r.filled_deep,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fy".into(),
        note: note.into(),
        nanite_lumen_terrain_aaa_ready: r.nanite_lumen_terrain_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run recursive fractal enhancement soak via kernel.
pub fn run_kernel_recursive_fractal_enhancement_soak() -> KernelRecursiveFractalEnhancementWireReport
{
    let r = run_recursive_fractal_enhancement_soak();
    let note = if !r.recursive_fractal_enhancement_ready {
        "Recursive fractal enhancement soak failed — recursiveFractalEnhancementReady stays false"
    } else {
        "Desktop soak: diamond-square lite; same seed→same field; depth>0 increases variance/edge/filled vs depth-0 — recursiveFractalEnhancementReady true; nanite_lumen_terrain_aaa_ready false; distinct from fx blueNoiseDitheringReady + fw quantumOverlapReady + ev microDisplacementNoiseReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `recursiveFractalEnhancementReady` (letter fy).
pub fn probe_recursive_fractal_enhancement() -> KernelRecursiveFractalEnhancementWireReport {
    to_report(
        kernel_probe(),
        "Recursive fractal enhancement probe (letter fy) — distinct from blueNoiseDitheringReady, quantumOverlapReady, microDisplacementNoiseReady, and probe_kernel_foundation; nanite_lumen_terrain_aaa_ready HELD",
    )
}

/// Tauri IPC — recursive fractal enhancement honesty.
#[tauri::command]
pub fn probe_recursive_fractal_enhancement_cmd() -> KernelRecursiveFractalEnhancementWireReport {
    probe_recursive_fractal_enhancement()
}

/// Tauri IPC — run recursive fractal enhancement soak.
#[tauri::command]
pub fn run_kernel_recursive_fractal_enhancement_soak_cmd()
-> KernelRecursiveFractalEnhancementWireReport {
    run_kernel_recursive_fractal_enhancement_soak()
}
