//! Semantic Light Leak desktop wire — letter **hb**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::semantic_light_leak`
//! (SoA bounds deterministic occlusion). The kernel now exposes a measured,
//! soak-gated `SemanticLightLeakSoakReport` via `probe_semantic_light_leak`
//! and `run_semantic_light_leak_soak`; this wire maps that report onto the
//! Tauri surface without recomputing the lattice math (single source of truth
//! in the kernel, zero-alloc hot loop preserved). Honesty probe
//! `semanticLightLeakReady` is **distinct** from prior probes.
//! Full Lumen / VXGI / Radiance Cascades AAA stays false (HELD).

use aethel_kernel_rust::semantic_light_leak::{
    probe_semantic_light_leak as kernel_probe, run_semantic_light_leak_soak as kernel_soak,
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
        full_radiance_aaa_ready: r.full_radiance_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Run semantic light leak soak via the real kernel math.
pub fn run_kernel_semantic_light_leak_soak() -> KernelSemanticLightLeakWireReport {
    let r = kernel_soak();
    let note = if !r.semantic_light_leak_ready {
        "Semantic Light Leak soak failed — semanticLightLeakReady stays false"
    } else {
        "Desktop soak: SoA bounds deterministic occlusion -> ambient light leak factor (bit-identical replay over 64 ticks); full_radiance_aaa_ready false; distinct from ha thermalSpectralGiReady and prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `semanticLightLeakReady` (letter hb).
pub fn probe_semantic_light_leak() -> KernelSemanticLightLeakWireReport {
    let note = "Semantic Light Leak probe (letter hb) — distinct from thermalSpectralGiReady and prior probes; full_radiance_aaa_ready HELD";
    to_report(kernel_probe(), note)
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_delegates_to_kernel_report() {
        let wire = probe_semantic_light_leak();
        let kernel = kernel_probe();
        assert_eq!(wire.semantic_light_leak_ready, kernel.semantic_light_leak_ready);
        assert_eq!(wire.ambient_leak_factor, kernel.ambient_leak_factor);
        assert_eq!(wire.total_occlusion_volume, kernel.total_occlusion_volume);
        assert_eq!(wire.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(wire.letter, "hb");
        assert!(!wire.full_radiance_aaa_ready);
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let wire = run_kernel_semantic_light_leak_soak();
        let kernel = kernel_soak();
        assert_eq!(wire.semantic_light_leak_ready, kernel.semantic_light_leak_ready);
        assert_eq!(wire.evidence_fingerprint, kernel.evidence_fingerprint);
        assert_eq!(wire.letter, "hb");
        assert!(!wire.full_radiance_aaa_ready);
    }
}
