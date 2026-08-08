//! Lock-free ring buffer desktop wire — letter **fe**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::lockfree_ring_buffer`
//! (fixed-capacity SPSC Atomics ring; push/pop FIFO + wrap soak). Honesty
//! probe `lockfreeRingBufferReady` is **distinct** from fd
//! `sparseSeedInstancingReady`, fc `universalLogarithmicScaleReady`, fb
//! `geometricScaleConstraintsReady`, fa `digitalPressureChamberReady`, ez
//! `dynamicMatterEntropyReady`, and prior probes. Full crossbeam / MPSC
//! lock-free AAA / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::lockfree_ring_buffer::{
    probe_lockfree_ring_buffer as kernel_probe, run_lockfree_ring_buffer_soak,
    LockfreeRingBufferSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelLockfreeRingBufferWireReport {
    pub lockfree_ring_buffer_ready: bool,
    pub fifo_order: bool,
    pub wrap_around: bool,
    pub fail_closed_full: bool,
    pub fail_closed_empty: bool,
    pub multi_thread_spsc: bool,
    pub state_mutated: bool,
    pub capacity: u32,
    pub wrap_pushed: u32,
    pub mt_transferred: u32,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub crossbeam_lockfree_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: LockfreeRingBufferSoakReport,
    note: impl Into<String>,
) -> KernelLockfreeRingBufferWireReport {
    KernelLockfreeRingBufferWireReport {
        lockfree_ring_buffer_ready: r.lockfree_ring_buffer_ready,
        fifo_order: r.fifo_order,
        wrap_around: r.wrap_around,
        fail_closed_full: r.fail_closed_full,
        fail_closed_empty: r.fail_closed_empty,
        multi_thread_spsc: r.multi_thread_spsc,
        state_mutated: r.state_mutated,
        capacity: r.capacity,
        wrap_pushed: r.wrap_pushed,
        mt_transferred: r.mt_transferred,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "fe".into(),
        note: note.into(),
        crossbeam_lockfree_aaa_ready: r.crossbeam_lockfree_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run lock-free ring buffer soak via kernel.
pub fn run_kernel_lockfree_ring_buffer_soak() -> KernelLockfreeRingBufferWireReport {
    let r = run_lockfree_ring_buffer_soak();
    let note = if !r.lockfree_ring_buffer_ready {
        "Lock-free ring buffer soak failed — lockfreeRingBufferReady stays false"
    } else {
        "Desktop soak: SPSC Atomics FIFO + wrap + fail-closed full/empty + multi-thread SPSC — lockfreeRingBufferReady true; crossbeam_lockfree_aaa_ready false; distinct from fd sparseSeedInstancingReady + fc universalLogarithmicScaleReady + fb geometricScaleConstraintsReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `lockfreeRingBufferReady` (letter fe).
pub fn probe_lockfree_ring_buffer() -> KernelLockfreeRingBufferWireReport {
    to_report(
        kernel_probe(),
        "Lock-free ring buffer probe (letter fe) — distinct from sparseSeedInstancingReady, universalLogarithmicScaleReady, geometricScaleConstraintsReady, and probe_kernel_foundation; crossbeam_lockfree_aaa_ready HELD",
    )
}

/// Tauri IPC — lock-free ring buffer honesty.
#[tauri::command]
pub fn probe_lockfree_ring_buffer_cmd() -> KernelLockfreeRingBufferWireReport {
    probe_lockfree_ring_buffer()
}

/// Tauri IPC — run lock-free ring buffer soak.
#[tauri::command]
pub fn run_kernel_lockfree_ring_buffer_soak_cmd() -> KernelLockfreeRingBufferWireReport {
    run_kernel_lockfree_ring_buffer_soak()
}
