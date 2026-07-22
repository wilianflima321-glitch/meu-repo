//! Sparse Seed Instancing desktop wire — letter **fd**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::sparse_seed_instancing`
//! (deterministic sparse instance placement from seed inside AABB; density
//! controls count). Honesty probe `sparseSeedInstancingReady` is **distinct**
//! from fc `universalLogarithmicScaleReady`, fb `geometricScaleConstraintsReady`,
//! fa `digitalPressureChamberReady`, ez `dynamicMatterEntropyReady`, ey
//! `contextualPhysicsOverrideReady`, and prior probes. Full HISM / Nanite
//! foliage AAA / Coins / Agones / Nanite / DLSS HELD.
//!
//! Letter **in**: forwards measured `evidenceKind` / `evidenceFingerprint`.

use aethel_kernel_rust::sparse_seed_instancing::{
    probe_sparse_seed_instancing as kernel_probe, run_sparse_seed_instancing_soak,
    SparseSeedInstancingSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSparseSeedInstancingWireReport {
    pub sparse_seed_instancing_ready: bool,
    pub same_seed_deterministic: bool,
    pub density_controls_count: bool,
    pub all_inside_aabb: bool,
    pub outputs_finite: bool,
    pub state_mutated: bool,
    pub low_instance_count: u32,
    pub high_instance_count: u32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_universal_logarithmic_scale_probe: bool,
    pub distinct_from_geometric_scale_constraints_probe: bool,
    pub distinct_from_digital_pressure_chamber_probe: bool,
    pub distinct_from_dynamic_matter_entropy_probe: bool,
    pub distinct_from_contextual_physics_override_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub hism_nanite_foliage_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: SparseSeedInstancingSoakReport,
    note: impl Into<String>,
) -> KernelSparseSeedInstancingWireReport {
    KernelSparseSeedInstancingWireReport {
        sparse_seed_instancing_ready: r.sparse_seed_instancing_ready,
        same_seed_deterministic: r.same_seed_deterministic,
        density_controls_count: r.density_controls_count,
        all_inside_aabb: r.all_inside_aabb,
        outputs_finite: r.outputs_finite,
        state_mutated: r.state_mutated,
        low_instance_count: r.low_instance_count,
        high_instance_count: r.high_instance_count,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_universal_logarithmic_scale_probe: r
            .distinct_from_universal_logarithmic_scale_probe,
        distinct_from_geometric_scale_constraints_probe: r
            .distinct_from_geometric_scale_constraints_probe,
        distinct_from_digital_pressure_chamber_probe: r
            .distinct_from_digital_pressure_chamber_probe,
        distinct_from_dynamic_matter_entropy_probe: r.distinct_from_dynamic_matter_entropy_probe,
        distinct_from_contextual_physics_override_probe: r
            .distinct_from_contextual_physics_override_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "fd".into(),
        note: note.into(),
        hism_nanite_foliage_aaa_ready: r.hism_nanite_foliage_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run sparse seed instancing soak via kernel.
pub fn run_kernel_sparse_seed_instancing_soak() -> KernelSparseSeedInstancingWireReport {
    let r = run_sparse_seed_instancing_soak();
    let note = if !r.sparse_seed_instancing_ready {
        "Sparse seed instancing soak failed — sparseSeedInstancingReady stays false"
    } else {
        "Desktop soak: same seed → same AABB positions + higher density → more instances — sparseSeedInstancingReady true; hism_nanite_foliage_aaa_ready false; distinct from fc universalLogarithmicScaleReady + fb geometricScaleConstraintsReady + fa digitalPressureChamberReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `sparseSeedInstancingReady` (letter fd).
pub fn probe_sparse_seed_instancing() -> KernelSparseSeedInstancingWireReport {
    to_report(
        kernel_probe(),
        "Sparse seed instancing probe (letter fd) — distinct from universalLogarithmicScaleReady, geometricScaleConstraintsReady, digitalPressureChamberReady, and probe_kernel_foundation; hism_nanite_foliage_aaa_ready HELD",
    )
}

/// Tauri IPC — sparse seed instancing honesty.
#[tauri::command]
pub fn probe_sparse_seed_instancing_cmd() -> KernelSparseSeedInstancingWireReport {
    probe_sparse_seed_instancing()
}

/// Tauri IPC — run sparse seed instancing soak.
#[tauri::command]
pub fn run_kernel_sparse_seed_instancing_soak_cmd() -> KernelSparseSeedInstancingWireReport {
    run_kernel_sparse_seed_instancing_soak()
}
