//! WorldSoA + LBM desktop soak wire — letter **de**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::desktop_soak`. Honesty probe
//! `kernelDesktopWireReady` is distinct from dc `probe_kernel_foundation`.
//! Chaos/100k/mmap-SAB/AVX-512/GR/dual-240 / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::desktop_soak::{
    probe_kernel_desktop_wire as kernel_probe, run_desktop_world_lbm_soak, DesktopSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelDesktopWireReport {
    pub kernel_desktop_wire_ready: bool,
    pub world_soa_ticked: bool,
    pub entity_count: usize,
    pub ticks_run: usize,
    pub lbm_stepped: bool,
    pub lbm_mass_conserved: bool,
    pub lbm_mass_drift: f64,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_kernel_foundation_probe: bool,
    pub letter: String,
    pub note: String,
    pub chaos_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(r: DesktopSoakReport, note: impl Into<String>) -> KernelDesktopWireReport {
    KernelDesktopWireReport {
        kernel_desktop_wire_ready: r.kernel_desktop_wire_ready,
        world_soa_ticked: r.world_soa_ticked,
        entity_count: r.entity_count,
        ticks_run: r.ticks_run,
        lbm_stepped: r.lbm_stepped,
        lbm_mass_conserved: r.lbm_mass_conserved,
        lbm_mass_drift: r.lbm_mass_drift,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
        letter: "de".into(),
        note: note.into(),
        chaos_parity_ready: r.chaos_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run desktop soak via kernel (WorldSoA + optional LBM).
pub fn run_kernel_desktop_soak(include_lbm: bool) -> KernelDesktopWireReport {
    let r = run_desktop_world_lbm_soak(include_lbm);
    let note = if !r.kernel_desktop_wire_ready {
        "Desktop soak failed — kernelDesktopWireReady stays false"
    } else if include_lbm {
        "Desktop soak: WorldSoA ticks + LBM D2Q9 — kernelDesktopWireReady true; Chaos/100k/etc HELD"
    } else {
        "Desktop soak: WorldSoA ticks (LBM skipped) — kernelDesktopWireReady true; Chaos/100k/etc HELD"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `kernelDesktopWireReady` (with LBM).
pub fn probe_kernel_desktop_wire() -> KernelDesktopWireReport {
    to_report(
        kernel_probe(),
        "Desktop soak probe (letter de) — distinct from probe_kernel_foundation; Chaos/100k/etc HELD",
    )
}

/// Tauri IPC — desktop WorldSoA + LBM soak honesty.
#[tauri::command]
pub fn probe_kernel_desktop_wire_cmd() -> KernelDesktopWireReport {
    probe_kernel_desktop_wire()
}

/// Tauri IPC — run soak; `include_lbm` defaults true.
#[tauri::command]
pub fn run_kernel_desktop_soak_cmd(include_lbm: Option<bool>) -> KernelDesktopWireReport {
    run_kernel_desktop_soak(include_lbm.unwrap_or(true))
}
