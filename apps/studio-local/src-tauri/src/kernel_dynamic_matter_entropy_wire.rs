//! Dynamic Matter Entropy desktop wire — letter **hp** / **ez**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::dynamic_matter_entropy`
//! (live entropy production from WorldSoA `|vel|` + optional stress SoA).
//! Honesty probe `dynamicMatterEntropyReady` is **distinct** from dw
//! `mnemonicMatterEntropyReady`, ey `contextualPhysicsOverrideReady`, ds
//! `fractalEnergyPerturbationReady`, and prior probes.
//! Letter **ij**: forwards measured `evidenceKind` / `evidenceFingerprint`.
//! Full Chaos thermodynamics AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::dynamic_matter_entropy::{
    probe_dynamic_matter_entropy as kernel_probe, run_dynamic_matter_entropy_soak,
    DynamicMatterEntropySoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelDynamicMatterEntropyWireReport {
    pub dynamic_matter_entropy_ready: bool,
    pub fast_entropy_gt_static: bool,
    pub fast_entropy_gained: bool,
    pub static_near_identity: bool,
    pub stress_increases_entropy: bool,
    pub legacy_uses_args: bool,
    pub material_erosion_differs: bool,
    pub aging_increases: bool,
    pub state_mutated: bool,
    pub outputs_finite: bool,
    pub entities: u32,
    pub soak_frames: u32,
    pub entropy_fast_final: f32,
    pub entropy_static_final: f32,
    pub entropy_stress_final: f32,
    pub fast_gain: f32,
    pub static_gain: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub chaos_thermodynamics_aaa_ready: bool,
    pub chaos_pbd_parity_ready: bool,
}

fn to_report(
    r: DynamicMatterEntropySoakReport,
    note: impl Into<String>,
) -> KernelDynamicMatterEntropyWireReport {
    KernelDynamicMatterEntropyWireReport {
        dynamic_matter_entropy_ready: r.dynamic_matter_entropy_ready,
        fast_entropy_gt_static: r.fast_entropy_gt_static,
        fast_entropy_gained: r.fast_entropy_gained,
        static_near_identity: r.static_near_identity,
        stress_increases_entropy: r.stress_increases_entropy,
        legacy_uses_args: r.legacy_uses_args,
        material_erosion_differs: r.material_erosion_differs,
        aging_increases: r.aging_increases,
        state_mutated: r.state_mutated,
        outputs_finite: r.outputs_finite,
        entities: r.entities,
        soak_frames: r.soak_frames,
        entropy_fast_final: r.entropy_fast_final,
        entropy_static_final: r.entropy_static_final,
        entropy_stress_final: r.entropy_stress_final,
        fast_gain: r.fast_gain,
        static_gain: r.static_gain,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "hp".into(),
        note: note.into(),
        chaos_thermodynamics_aaa_ready: r.chaos_thermodynamics_aaa_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
    }
}

/// Run dynamic matter entropy soak via kernel.
pub fn run_kernel_dynamic_matter_entropy_soak() -> KernelDynamicMatterEntropyWireReport {
    let r = run_dynamic_matter_entropy_soak();
    let note = if !r.dynamic_matter_entropy_ready {
        "Dynamic matter entropy soak failed — dynamicMatterEntropyReady stays false"
    } else {
        "Desktop soak: live entropy from |vel| + stress; fast≫static; legacy friction/moisture used — dynamicMatterEntropyReady true; chaos_thermodynamics_aaa_ready false; distinct from dw mnemonicMatterEntropyReady + ey contextualPhysicsOverrideReady + ds fractalEnergyPerturbationReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `dynamicMatterEntropyReady` (letter hp).
pub fn probe_dynamic_matter_entropy() -> KernelDynamicMatterEntropyWireReport {
    to_report(
        kernel_probe(),
        "Dynamic matter entropy probe (letter hp) — distinct from mnemonicMatterEntropyReady, contextualPhysicsOverrideReady, fractalEnergyPerturbationReady, and probe_kernel_foundation; chaos_thermodynamics_aaa_ready HELD",
    )
}

/// Tauri IPC — dynamic matter entropy honesty.
#[tauri::command]
pub fn probe_dynamic_matter_entropy_cmd() -> KernelDynamicMatterEntropyWireReport {
    probe_dynamic_matter_entropy()
}

/// Tauri IPC — run dynamic matter entropy soak.
#[tauri::command]
pub fn run_kernel_dynamic_matter_entropy_soak_cmd() -> KernelDynamicMatterEntropyWireReport {
    run_kernel_dynamic_matter_entropy_soak()
}
