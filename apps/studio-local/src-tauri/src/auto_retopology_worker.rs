//! Letter bz — Auto-retopology native worker scaffold + IPC hooks.
//!
//! TS `auto-retopology.ts` ships the deepened production simplify path
//! (`remeshQualityDeepened`). This Rust module exposes Tauri IPC probe/run
//! commands for desktop sidecars. Commercial Instant Meshes / QuadriFlow-class
//! remesh remains **HELD** — never invent remeshed bytes.
//!
//! Law XV: heavy remesh stays off weak-GPU inline paths.

use serde::{Deserialize, Serialize};

/// Nominal target for game-ready hero meshes — matches TS default.
pub const DEFAULT_TARGET_TRIANGLES: u32 = 10_000;

/// Law XV offline gate — mirrors TS `HEAVY_REMESH_MIN_CAPABILITY_SCORE`.
pub const HEAVY_REMESH_MIN_CAPABILITY_SCORE: u32 = 45;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoRetopoWorkerRequest {
    pub positions: Vec<f32>,
    pub indices: Vec<u32>,
    pub target_triangles: u32,
    pub capability_score: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutoRetopoWorkerStatus {
    pub held: bool,
    pub held_reason: String,
    pub instant_meshes_parity: bool,
    pub instant_meshes_parity_ready: bool,
    /// TS owns remesh deepen; Rust does not claim commercial parity.
    pub remesh_quality_deepened_ts: bool,
    pub ts_fallback: bool,
    pub ipc_ready: bool,
    pub note: String,
}

/// Probe — IPC ready, commercial remesher still HELD.
pub fn probe_auto_retopology_worker() -> AutoRetopoWorkerStatus {
    AutoRetopoWorkerStatus {
        held: true,
        held_reason: "Commercial remesher (Instant Meshes / QuadriFlow class) not soaked — use TS auto-retopology deepen (bz)".into(),
        instant_meshes_parity: false,
        instant_meshes_parity_ready: false,
        remesh_quality_deepened_ts: true,
        ts_fallback: true,
        ipc_ready: true,
        note: "Letter bz IPC hook — cargo commercial remesh soak HELD; TS remeshQualityDeepened ships".into(),
    }
}

/// Native simplify entry — returns HELD; never invents remeshed bytes.
pub fn run_auto_retopology_worker(req: &AutoRetopoWorkerRequest) -> AutoRetopoWorkerStatus {
    if req.capability_score < HEAVY_REMESH_MIN_CAPABILITY_SCORE {
        return AutoRetopoWorkerStatus {
            held: true,
            held_reason: format!(
                "Capability Score {} < {} — heavy remesh offline only",
                req.capability_score, HEAVY_REMESH_MIN_CAPABILITY_SCORE
            ),
            instant_meshes_parity: false,
            instant_meshes_parity_ready: false,
            remesh_quality_deepened_ts: true,
            ts_fallback: true,
            ipc_ready: true,
            note: "Law XV weak-GPU gate".into(),
        };
    }
    probe_auto_retopology_worker()
}

/// Tauri IPC — honesty probe for desktop studio.
#[tauri::command]
pub fn probe_auto_retopology_worker_cmd() -> AutoRetopoWorkerStatus {
    probe_auto_retopology_worker()
}

/// Tauri IPC — run entry (HELD until commercial remesher soak).
#[tauri::command]
pub fn run_auto_retopology_worker_cmd(request: AutoRetopoWorkerRequest) -> AutoRetopoWorkerStatus {
    run_auto_retopology_worker(&request)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn probe_is_held_without_commercial_remesher() {
        let status = probe_auto_retopology_worker();
        assert!(status.held);
        assert!(!status.instant_meshes_parity);
        assert!(!status.instant_meshes_parity_ready);
        assert!(status.remesh_quality_deepened_ts);
        assert!(status.ts_fallback);
        assert!(status.ipc_ready);
    }

    #[test]
    fn weak_gpu_stays_held() {
        let req = AutoRetopoWorkerRequest {
            positions: vec![0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0, 0.0],
            indices: vec![0, 1, 2],
            target_triangles: DEFAULT_TARGET_TRIANGLES,
            capability_score: 20,
        };
        let status = run_auto_retopology_worker(&req);
        assert!(status.held);
        assert!(status.held_reason.contains("Capability Score"));
    }
}
