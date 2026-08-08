//! Semantic Light Leak desktop wire — letter **hb**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::semantic_light_leak`
//! (SoA bounds deterministic occlusion). Honesty probe
//! `semanticLightLeakReady` is **distinct** from prior probes.
//! Full Lumen / VXGI / Radiance Cascades AAA stays false (HELD).

use aethel_kernel_rust::semantic_light_leak::{
    probe_semantic_light_leak as kernel_probe, run_semantic_light_leak_soak,
    SemanticLightLeakSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSemanticLightLeakWireReport {
    pub semantic_light_leak_ready: bool,
    pub ambient_leak_factor: f32,
    pub total_occlusion_volume: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub full_radiance_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

fn to_report(
    r: SemanticLightLeakSoakReport,
    note: impl Into<String>,
) -> KernelSemanticLightLeakWireReport {
    KernelSemanticLightLeakWireReport {
        semantic_light_leak_ready: r.semantic_light_leak_ready,
        ambient_leak_factor: r.ambient_leak_factor,
        total_occlusion_volume: r.total_occlusion_volume,
        evidence_kind: r.evidence_kind.clone(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "hb".into(),
        note: note.into(),
        full_radiance_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Run semantic light leak soak via kernel.
pub fn run_kernel_semantic_light_leak_soak() -> KernelSemanticLightLeakWireReport {
    let r = run_semantic_light_leak_soak();
    let note = if !r.semantic_light_leak_ready {
        "Semantic Light Leak soak failed — semanticLightLeakReady stays false"
    } else {
        "Desktop soak: SoA bounds deterministic occlusion -> ambient light leak factor; full_radiance_aaa_ready false; distinct from ha thermalSpectralGiReady and prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `semanticLightLeakReady` (letter hb).
pub fn probe_semantic_light_leak() -> KernelSemanticLightLeakWireReport {
    to_report(
        kernel_probe(),
        "Semantic Light Leak probe (letter hb) — distinct from thermalSpectralGiReady and prior probes; full_radiance_aaa_ready HELD",
    )
}

/// Tauri IPC — semantic light leak honesty.
#[tauri::command]
pub fn probe_semantic_light_leak_cmd() -> KernelSemanticLightLeakWireReport {
    probe_semantic_light_leak()
}

/// Tauri IPC — run semantic light leak soak.
#[tauri::command]
pub fn run_kernel_semantic_light_leak_soak_cmd() -> KernelSemanticLightLeakWireReport {
    run_kernel_semantic_light_leak_soak()
}
