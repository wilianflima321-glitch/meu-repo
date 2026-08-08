//! Contextual Physics Override desktop wire — letter **ey**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::contextual_physics_override`
//! (AABB/sphere volumes → gravity scale / timescale / damping on WorldSoA).
//! Honesty probe `contextualPhysicsOverrideReady` is **distinct** from ex
//! `sdfAudioRaymarchingReady`, ew `volumetricExtinctionMediumReady`, dz
//! `atmosphericPhysicalDampingReady`, ds `fractalEnergyPerturbationReady`,
//! and prior probes.
//! Letter **ij**: forwards measured `evidenceKind` / `evidenceFingerprint`.
//! Full Chaos/physics volume AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::contextual_physics_override::{
    probe_contextual_physics_override as kernel_probe, run_contextual_physics_override_soak,
    ContextualPhysicsOverrideSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelContextualPhysicsOverrideWireReport {
    pub contextual_physics_override_ready: bool,
    pub aabb_inside_ne_outside: bool,
    pub sphere_contains_works: bool,
    pub timescale_inside_ne_outside: bool,
    pub gravity_inside_ne_outside: bool,
    pub damping_inside_ne_outside: bool,
    pub legacy_inject_uses_args: bool,
    pub outputs_finite: bool,
    pub timescale_inside: f32,
    pub timescale_outside: f32,
    pub delta_y_inside: f32,
    pub delta_y_outside: f32,
    pub speed_inside_after: f32,
    pub speed_outside_after: f32,
    pub fingerprint: u64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub chaos_physics_volume_aaa_ready: bool,
    pub chaos_pbd_parity_ready: bool,
}

fn to_report(
    r: ContextualPhysicsOverrideSoakReport,
    note: impl Into<String>,
) -> KernelContextualPhysicsOverrideWireReport {
    KernelContextualPhysicsOverrideWireReport {
        contextual_physics_override_ready: r.contextual_physics_override_ready,
        aabb_inside_ne_outside: r.aabb_inside_ne_outside,
        sphere_contains_works: r.sphere_contains_works,
        timescale_inside_ne_outside: r.timescale_inside_ne_outside,
        gravity_inside_ne_outside: r.gravity_inside_ne_outside,
        damping_inside_ne_outside: r.damping_inside_ne_outside,
        legacy_inject_uses_args: r.legacy_inject_uses_args,
        outputs_finite: r.outputs_finite,
        timescale_inside: r.timescale_inside,
        timescale_outside: r.timescale_outside,
        delta_y_inside: r.delta_y_inside,
        delta_y_outside: r.delta_y_outside,
        speed_inside_after: r.speed_inside_after,
        speed_outside_after: r.speed_outside_after,
        fingerprint: r.fingerprint,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "ey".into(),
        note: note.into(),
        chaos_physics_volume_aaa_ready: r.chaos_physics_volume_aaa_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
    }
}

/// Run contextual physics override soak via kernel.
pub fn run_kernel_contextual_physics_override_soak() -> KernelContextualPhysicsOverrideWireReport {
    let r = run_contextual_physics_override_soak();
    let note = if !r.contextual_physics_override_ready {
        "Contextual physics override soak failed — contextualPhysicsOverrideReady stays false"
    } else {
        "Desktop soak: AABB/sphere override volumes; inside≠outside on gravity scale / timescale / damping; legacy inject uses args — contextualPhysicsOverrideReady true; chaos_physics_volume_aaa_ready false; distinct from ex sdfAudioRaymarchingReady + ew volumetricExtinctionMediumReady + dz atmosphericPhysicalDampingReady + ds fractalEnergyPerturbationReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `contextualPhysicsOverrideReady` (letter ey).
pub fn probe_contextual_physics_override() -> KernelContextualPhysicsOverrideWireReport {
    to_report(
        kernel_probe(),
        "Contextual physics override probe (letter ey) — distinct from sdfAudioRaymarchingReady, volumetricExtinctionMediumReady, atmosphericPhysicalDampingReady, fractalEnergyPerturbationReady, and probe_kernel_foundation; chaos_physics_volume_aaa_ready HELD",
    )
}

/// Tauri IPC — contextual physics override honesty.
#[tauri::command]
pub fn probe_contextual_physics_override_cmd() -> KernelContextualPhysicsOverrideWireReport {
    probe_contextual_physics_override()
}

/// Tauri IPC — run contextual physics override soak.
#[tauri::command]
pub fn run_kernel_contextual_physics_override_soak_cmd() -> KernelContextualPhysicsOverrideWireReport
{
    run_kernel_contextual_physics_override_soak()
}
