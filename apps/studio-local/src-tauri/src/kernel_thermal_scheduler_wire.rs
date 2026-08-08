//! Thermal scheduler desktop wire — letter **fn**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::thermal_scheduler`
//! (simulated °C / 0–100 score → tick job quota; hot→fewer jobs soak).
//! Honesty probe `thermalSchedulerReady` is **distinct** from fm
//! `asynchronousRealityThreadsReady`, fl `cpuAffinityMicroWorkersReady`,
//! ff `atomicThreadSyncReady`, fe `lockfreeRingBufferReady`, and prior probes.
//! Full HW thermal sensor AAA (`hw_thermal_sensor_ready`) stays false (HELD).
//! Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::thermal_scheduler::{
    probe_thermal_scheduler as kernel_probe, run_thermal_scheduler_soak, ThermalSchedulerSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelThermalSchedulerWireReport {
    pub thermal_scheduler_ready: bool,
    pub cool_jobs: u32,
    pub hot_jobs: u32,
    pub hot_fewer_than_cool: bool,
    pub cool_quota: u32,
    pub hot_quota: u32,
    pub cool_celsius: f32,
    pub hot_celsius: f32,
    pub state_mutated: bool,
    pub fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub hw_thermal_sensor_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
}

fn to_report(
    r: ThermalSchedulerSoakReport,
    note: impl Into<String>,
) -> KernelThermalSchedulerWireReport {
    KernelThermalSchedulerWireReport {
        thermal_scheduler_ready: r.thermal_scheduler_ready,
        cool_jobs: r.cool_jobs,
        hot_jobs: r.hot_jobs,
        hot_fewer_than_cool: r.hot_fewer_than_cool,
        cool_quota: r.cool_quota,
        hot_quota: r.hot_quota,
        cool_celsius: r.cool_celsius,
        hot_celsius: r.hot_celsius,
        state_mutated: r.state_mutated,
        fingerprint: r.fingerprint,
        distinct_from_peers_note: r.distinct_from_peers_note,
        letter: "fn".into(),
        note: note.into(),
        hw_thermal_sensor_ready: r.hw_thermal_sensor_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
    }
}

/// Run thermal scheduler soak via kernel.
pub fn run_kernel_thermal_scheduler_soak() -> KernelThermalSchedulerWireReport {
    let r = run_thermal_scheduler_soak();
    let note = if !r.thermal_scheduler_ready {
        "Thermal scheduler soak failed — thermalSchedulerReady stays false"
    } else {
        "Desktop soak: simulated °C → tick job quota; hot admits fewer jobs than cool — thermalSchedulerReady true; hw_thermal_sensor_ready false; distinct from fm asynchronousRealityThreadsReady + fl cpuAffinityMicroWorkersReady + prior probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `thermalSchedulerReady` (letter fn).
pub fn probe_thermal_scheduler() -> KernelThermalSchedulerWireReport {
    to_report(
        kernel_probe(),
        "Thermal scheduler probe (letter fn) — distinct from asynchronousRealityThreadsReady, cpuAffinityMicroWorkersReady, atomicThreadSyncReady, lockfreeRingBufferReady, and probe_kernel_foundation; hw_thermal_sensor_ready HELD",
    )
}

/// Tauri IPC — thermal scheduler honesty.
#[tauri::command]
pub fn probe_thermal_scheduler_cmd() -> KernelThermalSchedulerWireReport {
    probe_thermal_scheduler()
}

/// Tauri IPC — run thermal scheduler soak.
#[tauri::command]
pub fn run_kernel_thermal_scheduler_soak_cmd() -> KernelThermalSchedulerWireReport {
    run_kernel_thermal_scheduler_soak()
}
