//! Skeletal Rig & XPBD Ragdoll desktop wire.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::skeletal_rig_ragdoll_xpbd`.
//! Exposes honesty probe for FABRIK IK and XPBD capsule integration to TypeScript.

use aethel_kernel_rust::skeletal_rig_ragdoll_xpbd::{
    probe_skeletal_rig_ragdoll as kernel_probe, SkeletalRagdollSoA, SkeletalRigRagdollProbe
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelSkeletalRigRagdollWireReport {
    pub skeletal_rig_ragdoll_xpbd_ready: bool,
    pub active_joint_count: usize,
    pub active_capsule_count: usize,
    pub fabrik_ik_solver_valid: bool,
    pub note: String,
}

fn to_report(
    r: SkeletalRigRagdollProbe,
    note: impl Into<String>,
) -> KernelSkeletalRigRagdollWireReport {
    KernelSkeletalRigRagdollWireReport {
        skeletal_rig_ragdoll_xpbd_ready: r.skeletal_rig_ragdoll_xpbd_ready,
        active_joint_count: r.active_joint_count,
        active_capsule_count: r.active_capsule_count,
        fabrik_ik_solver_valid: r.fabrik_ik_solver_valid,
        note: note.into(),
    }
}

/// Honesty probe — soak-gated readiness.
pub fn probe_skeletal_rig_ragdoll_xpbd() -> KernelSkeletalRigRagdollWireReport {
    let mut soa = SkeletalRagdollSoA::default();
    soa.push_joint([0.0, 0.0, 0.0], -1, 0.0);
    soa.push_joint([0.0, 1.0, 0.0], 0, 1.0);
    soa.push_joint([0.0, 2.0, 0.0], 1, 1.0);
    to_report(
        kernel_probe(&soa),
        "Skeletal Rig & XPBD Ragdoll probe — ready status via native kernel Rust authority.",
    )
}

/// Tauri IPC — skeletal rig ragdoll honesty.
#[tauri::command]
pub fn probe_skeletal_rig_ragdoll_xpbd_cmd() -> KernelSkeletalRigRagdollWireReport {
    probe_skeletal_rig_ragdoll_xpbd()
}
