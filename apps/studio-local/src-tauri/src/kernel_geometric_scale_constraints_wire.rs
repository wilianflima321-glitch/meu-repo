//! Geometric Scale Constraints desktop wire — letter **fb**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::geometric_scale_constraints`
//! (WorldSoA min/max scale clamps + parent-child inheritance limits). Honesty
//! probe `geometricScaleConstraintsReady` is **distinct** from fa
//! `digitalPressureChamberReady`, ez `dynamicMatterEntropyReady`, ey
//! `contextualPhysicsOverrideReady`, dw `mnemonicMatterEntropyReady`, and
//! prior probes. Full UE constraint AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::geometric_scale_constraints::{
    probe_geometric_scale_constraints as kernel_probe, run_geometric_scale_constraints_soak,
    GeometricScaleConstraintsSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelGeometricScaleConstraintsWireReport {
    pub geometric_scale_constraints_ready: bool,
    pub out_of_range_snaps_high: bool,
    pub out_of_range_snaps_low: bool,
    pub parent_child_inheritance_limited: bool,
    pub in_range_unchanged: bool,
    pub non_finite_reset: bool,
    pub log_clamp_matches_abs: bool,
    pub architectural_sanity_rejects_mega_chair: bool,
    pub state_mutated: bool,
    pub outputs_finite: bool,
    pub scale_after_high: f32,
    pub scale_after_low: f32,
    pub scale_child_after: f32,
    pub scale_in_range_after: f32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub ue_constraint_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: GeometricScaleConstraintsSoakReport,
    note: impl Into<String>,
) -> KernelGeometricScaleConstraintsWireReport {
    KernelGeometricScaleConstraintsWireReport {
        geometric_scale_constraints_ready: r.geometric_scale_constraints_ready,
        out_of_range_snaps_high: r.out_of_range_snaps_high,
        out_of_range_snaps_low: r.out_of_range_snaps_low,
        parent_child_inheritance_limited: r.parent_child_inheritance_limited,
        in_range_unchanged: r.in_range_unchanged,
        non_finite_reset: r.non_finite_reset,
        log_clamp_matches_abs: r.log_clamp_matches_abs,
        architectural_sanity_rejects_mega_chair: r.architectural_sanity_rejects_mega_chair,
        state_mutated: r.state_mutated,
        outputs_finite: r.outputs_finite,
        scale_after_high: r.scale_after_high,
        scale_after_low: r.scale_after_low,
        scale_child_after: r.scale_child_after,
        scale_in_range_after: r.scale_in_range_after,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fb".into(),
        note: note.into(),
        ue_constraint_aaa_ready: r.ue_constraint_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run geometric scale constraints soak via kernel.
pub fn run_kernel_geometric_scale_constraints_soak() -> KernelGeometricScaleConstraintsWireReport {
    let r = run_geometric_scale_constraints_soak();
    let note = if !r.geometric_scale_constraints_ready {
        "Geometric scale constraints soak failed — geometricScaleConstraintsReady stays false"
    } else {
        "Desktop soak: WorldSoA min/max scale clamps + parent-child inheritance; out-of-range snaps to bounds — geometricScaleConstraintsReady true; ue_constraint_aaa_ready false; distinct from fa digitalPressureChamberReady + ez dynamicMatterEntropyReady + ey contextualPhysicsOverrideReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `geometricScaleConstraintsReady` (letter fb).
pub fn probe_geometric_scale_constraints() -> KernelGeometricScaleConstraintsWireReport {
    to_report(
        kernel_probe(),
        "Geometric scale constraints probe (letter fb) — distinct from digitalPressureChamberReady, dynamicMatterEntropyReady, contextualPhysicsOverrideReady, and probe_kernel_foundation; ue_constraint_aaa_ready HELD",
    )
}

/// Tauri IPC — geometric scale constraints honesty.
#[tauri::command]
pub fn probe_geometric_scale_constraints_cmd() -> KernelGeometricScaleConstraintsWireReport {
    probe_geometric_scale_constraints()
}

/// Tauri IPC — run geometric scale constraints soak.
#[tauri::command]
pub fn run_kernel_geometric_scale_constraints_soak_cmd() -> KernelGeometricScaleConstraintsWireReport
{
    run_kernel_geometric_scale_constraints_soak()
}
