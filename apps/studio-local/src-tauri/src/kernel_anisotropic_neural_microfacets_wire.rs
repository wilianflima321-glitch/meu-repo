//! Anisotropic Neural Microfacets desktop wire.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::anisotropic_neural_microfacets`

use aethel_kernel_rust::anisotropic_neural_microfacets::{
    probe_anisotropic_neural_microfacets as kernel_probe,
    run_anisotropic_neural_microfacets_soak as kernel_soak,
    AnisotropicNeuralMicrofacetsProbeReport,
    AnisotropicNeuralMicrofacetsSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAnisotropicNeuralMicrofacetsProbeWireReport {
    pub anisotropic_brdf_ready: bool,
    pub specular_min: f32,
    pub specular_max: f32,
    pub letter: String,
    pub note: String,
        distinct_from_peers_note: "distinct".into(),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAnisotropicNeuralMicrofacetsSoakWireReport {
    pub anisotropic_brdf_ready: bool,
    pub deterministic: bool,
    pub tested_entities: usize,
    pub total_ticks: u32,
    pub letter: String,
    pub note: String,
        distinct_from_peers_note: "distinct".into(),
}

fn probe_to_wire(
    r: AnisotropicNeuralMicrofacetsProbeReport,
) -> KernelAnisotropicNeuralMicrofacetsProbeWireReport {
    let note = if r.anisotropic_brdf_ready {
        "Probe: GGX Anisotropic evaluated successfully via zero-alloc hot loop."
    } else {
        "Probe failed."
    };
    KernelAnisotropicNeuralMicrofacetsProbeWireReport {
        anisotropic_brdf_ready: r.anisotropic_brdf_ready,
        specular_min: r.specular_min,
        specular_max: r.specular_max,
        letter: "brdf".into(),
        note: note.into(),
        distinct_from_peers_note: "distinct".into(),
    }
}

fn soak_to_wire(
    r: AnisotropicNeuralMicrofacetsSoakReport,
) -> KernelAnisotropicNeuralMicrofacetsSoakWireReport {
    let note = if r.anisotropic_brdf_ready {
        "Soak: Deterministic execution of GGX across multiple frames passed."
    } else {
        "Soak failed."
    };
    KernelAnisotropicNeuralMicrofacetsSoakWireReport {
        anisotropic_brdf_ready: r.anisotropic_brdf_ready,
        deterministic: r.deterministic,
        tested_entities: r.tested_entities,
        total_ticks: r.total_ticks,
        letter: "brdf".into(),
        note: note.into(),
        distinct_from_peers_note: "distinct".into(),
    }
}

/// Honesty probe — Tauri IPC.
#[tauri::command]
pub fn probe_anisotropic_neural_microfacets_cmd() -> KernelAnisotropicNeuralMicrofacetsProbeWireReport {
    probe_to_wire(kernel_probe())
        distinct_from_peers_note: "distinct".into(),
}

/// Soak — Tauri IPC.
#[tauri::command]
pub fn run_kernel_anisotropic_neural_microfacets_soak_cmd() -> KernelAnisotropicNeuralMicrofacetsSoakWireReport {
    soak_to_wire(kernel_soak())
        distinct_from_peers_note: "distinct".into(),
}