//! Universal Logarithmic Scale desktop wire — letter **fc**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::universal_logarithmic_scale`
//! (world↔signed-log map + floating-origin rebase + nested origin offsets).
//! Honesty probe `universalLogarithmicScaleReady` is **distinct** from fb
//! `geometricScaleConstraintsReady`, fa `digitalPressureChamberReady`, ez
//! `dynamicMatterEntropyReady`, ey `contextualPhysicsOverrideReady`, and prior
//! probes. Full Star-Citizen / cosmos AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::universal_logarithmic_scale::{
    probe_universal_logarithmic_scale as kernel_probe, run_universal_logarithmic_scale_soak,
    UniversalLogarithmicScaleSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelUniversalLogarithmicScaleWireReport {
    pub universal_logarithmic_scale_ready: bool,
    pub log_roundtrip_ok: bool,
    pub rebase_triggered: bool,
    pub relative_positions_preserved: bool,
    pub nested_offset_composes: bool,
    pub camera_near_origin_after_rebase: bool,
    pub state_mutated: bool,
    pub outputs_finite: bool,
    pub roundtrip_error_m: f64,
    pub relative_delta_error_m: f64,
    pub rebase_count: u32,
    pub absolute_origin_x: f64,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub star_citizen_cosmos_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: UniversalLogarithmicScaleSoakReport,
    note: impl Into<String>,
) -> KernelUniversalLogarithmicScaleWireReport {
    KernelUniversalLogarithmicScaleWireReport {
        universal_logarithmic_scale_ready: r.universal_logarithmic_scale_ready,
        log_roundtrip_ok: r.log_roundtrip_ok,
        rebase_triggered: r.rebase_triggered,
        relative_positions_preserved: r.relative_positions_preserved,
        nested_offset_composes: r.nested_offset_composes,
        camera_near_origin_after_rebase: r.camera_near_origin_after_rebase,
        state_mutated: r.state_mutated,
        outputs_finite: r.outputs_finite,
        roundtrip_error_m: r.roundtrip_error_m,
        relative_delta_error_m: r.relative_delta_error_m,
        rebase_count: r.rebase_count,
        absolute_origin_x: r.absolute_origin_x,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fc".into(),
        note: note.into(),
        star_citizen_cosmos_aaa_ready: r.star_citizen_cosmos_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run universal logarithmic scale soak via kernel.
pub fn run_kernel_universal_logarithmic_scale_soak() -> KernelUniversalLogarithmicScaleWireReport {
    let r = run_universal_logarithmic_scale_soak();
    let note = if !r.universal_logarithmic_scale_ready {
        "Universal logarithmic scale soak failed — universalLogarithmicScaleReady stays false"
    } else {
        "Desktop soak: world↔signed-log roundtrip + floating-origin rebase preserves relative WorldSoA Δ — universalLogarithmicScaleReady true; star_citizen_cosmos_aaa_ready false; distinct from fb geometricScaleConstraintsReady + fa digitalPressureChamberReady + ez dynamicMatterEntropyReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `universalLogarithmicScaleReady` (letter fc).
pub fn probe_universal_logarithmic_scale() -> KernelUniversalLogarithmicScaleWireReport {
    to_report(
        kernel_probe(),
        "Universal logarithmic scale probe (letter fc) — distinct from geometricScaleConstraintsReady, digitalPressureChamberReady, dynamicMatterEntropyReady, and probe_kernel_foundation; star_citizen_cosmos_aaa_ready HELD",
    )
}

/// Tauri IPC — universal logarithmic scale honesty.
#[tauri::command]
pub fn probe_universal_logarithmic_scale_cmd() -> KernelUniversalLogarithmicScaleWireReport {
    probe_universal_logarithmic_scale()
}

/// Tauri IPC — run universal logarithmic scale soak.
#[tauri::command]
pub fn run_kernel_universal_logarithmic_scale_soak_cmd() -> KernelUniversalLogarithmicScaleWireReport
{
    run_kernel_universal_logarithmic_scale_soak()
}
