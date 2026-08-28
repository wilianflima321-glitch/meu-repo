//! Anisotropic Neural Microfacets desktop wire — letter **brdf**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::anisotropic_neural_microfacets`.
//! The kernel now exposes the full measured, soak-gated anisotropic GGX BRDF
//! report (`probe_anisotropic_neural_microfacets` / `run_anisotropic_neural_microfacets_soak`
//! returning `AnisotropicNeuralMicrofacetsSoakReport`). This wire maps that
//! report onto the Tauri surface without recomputing any physics — single
//! source of truth in the kernel, zero-alloc hot loop preserved.

use aethel_kernel_rust::anisotropic_neural_microfacets::{
    probe_anisotropic_neural_microfacets as kernel_probe,
    run_anisotropic_neural_microfacets_soak as kernel_soak, AnisotropicNeuralMicrofacetsSoakReport,
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
    pub distinct_from_peers_note: String,
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
    pub distinct_from_peers_note: String,
}

/// Honesty probe (letter `brdf`) — delegates to the kernel's measured report.
pub fn probe_anisotropic_neural_microfacets() -> KernelAnisotropicNeuralMicrofacetsProbeWireReport {
    let r: AnisotropicNeuralMicrofacetsSoakReport = kernel_probe();
    let note = if r.anisotropic_brdf_ready {
        "Probe: GGX anisotropic specular anti-aliasing over the physical curvature ramp — strictly monotonic falloff, zero-alloc hot loop."
    } else {
        "Probe failed — anisotropicBRDFReady stays false."
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

/// Soak — delegates to the kernel's deterministic 64-tick replay.
pub fn run_kernel_anisotropic_neural_microfacets_soak() -> KernelAnisotropicNeuralMicrofacetsSoakWireReport {
    let r: AnisotropicNeuralMicrofacetsSoakReport = kernel_soak();
    let note = if r.anisotropic_brdf_ready && r.deterministic {
        "Soak: GGX anisotropic falloff replayed bit-identically across 64 ticks (zero-alloc, deterministic)."
    } else {
        "Soak failed — anisotropy not monotonic or replay diverged."
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
    probe_anisotropic_neural_microfacets()
}

/// Soak — Tauri IPC.
#[tauri::command]
pub fn run_kernel_anisotropic_neural_microfacets_soak_cmd() -> KernelAnisotropicNeuralMicrofacetsSoakWireReport {
    run_kernel_anisotropic_neural_microfacets_soak()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_delegates_to_kernel_report() {
        let wire = probe_anisotropic_neural_microfacets();
        let kernel = kernel_probe();
        assert_eq!(wire.anisotropic_brdf_ready, kernel.anisotropic_brdf_ready);
        assert_eq!(wire.specular_min, kernel.specular_min);
        assert_eq!(wire.specular_max, kernel.specular_max);
        assert_eq!(wire.letter, "brdf");
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let wire = run_kernel_anisotropic_neural_microfacets_soak();
        let kernel = kernel_soak();
        assert_eq!(wire.deterministic, kernel.deterministic);
        assert_eq!(wire.tested_entities, kernel.tested_entities);
        assert_eq!(wire.total_ticks, kernel.total_ticks);
        assert_eq!(wire.letter, "brdf");
    }
}
