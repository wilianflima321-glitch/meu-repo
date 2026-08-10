//! TICKET-PP-01/03 — persistent engine-owned present loop (not soak-only).
//!
//! Runs the existing ScalableRenderGraph-style frame graph every frame on an
//! engine-owned OS window until stop IPC or safety cap. CapScore-gated
//! resolution + fail-closed OOM via `gpu_soak_scale`.
//!
//! Honesty: `product_present_ready` stays **false** until Studio product
//! viewport / session lifetime / PP-02 carve-out land. G.3 stays ~15%.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use serde::{Deserialize, Serialize};

use crate::gpu_frame_graph::{FrameGraphPassTiming, WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON};
use crate::wgpu_renderer::{
    run_engine_owned_persistent_present, PersistentPresentHooks, RendererPresentProbeReport,
};

/// Safety cap — ~60s at 60 FPS. Longer needs product session ownership (PP-03).
pub const PERSISTENT_PRESENT_MAX_FRAMES: u32 = 3600;
/// Minimum frames before `persistent_loop_proven` may flip true.
pub const PERSISTENT_PRESENT_PROVE_FRAMES: u32 = 30;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct PersistentPresentLiveMetrics {
    pub running: bool,
    pub stop_requested: bool,
    pub frames_presented: u32,
    pub frames_cap: u32,
    pub last_frame_ms: f64,
    pub frame_ms_min: f64,
    pub frame_ms_max: f64,
    pub frame_ms_mean: f64,
    pub frame_ms_total: f64,
    pub frame_graph_ms_last: f64,
    pub frame_graph_pass_timings: Vec<FrameGraphPassTiming>,
    pub present_width: u32,
    pub present_height: u32,
    pub capability_score: u32,
    pub fidelity_tier: String,
    pub oom_refused: bool,
    pub adapter_name: String,
    pub backend: String,
    pub last_error: String,
    /// True after ≥PERSISTENT_PRESENT_PROVE_FRAMES with frame graph, no fatal error.
    pub persistent_loop_proven: bool,
    /// Always false — Studio product viewport still WebView.
    pub product_present_ready: bool,
    pub webview_exclusive_present_ready: bool,
    pub note: String,
}

#[derive(Default)]
pub struct PersistentPresentLoopState {
    stop: Arc<AtomicBool>,
    live: Arc<Mutex<PersistentPresentLiveMetrics>>,
    join: Mutex<Option<JoinHandle<()>>>,
}

impl PersistentPresentLoopState {
    pub fn live_snapshot(&self) -> PersistentPresentLiveMetrics {
        self.live
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default()
    }
}

fn apply_probe_to_live(live: &mut PersistentPresentLiveMetrics, probe: &RendererPresentProbeReport) {
    live.present_width = probe.soak_present_width;
    live.present_height = probe.soak_present_height;
    live.capability_score = probe.soak_capability_score;
    live.fidelity_tier = probe.soak_fidelity_tier.clone();
    live.oom_refused = probe.soak_oom_refused;
    live.adapter_name = probe.adapter_name.clone();
    live.backend = probe.backend.clone();
    live.frames_presented = probe.frames_presented;
    live.frame_ms_min = probe.frame_ms_min;
    live.frame_ms_max = probe.frame_ms_max;
    live.frame_ms_mean = probe.frame_ms_mean;
    live.frame_ms_total = probe.frame_ms_total;
    live.frame_graph_ms_last = probe.frame_graph_ms_total;
    live.frame_graph_pass_timings = probe.frame_graph_pass_timings.clone();
    live.last_frame_ms = probe.frame_ms_mean;
    if !probe.presented {
        live.last_error = probe
            .reasons
            .first()
            .cloned()
            .unwrap_or_else(|| "persistent present failed".into());
    }
    live.persistent_loop_proven = probe.presented
        && probe.frame_graph_executed
        && probe.frames_presented >= PERSISTENT_PRESENT_PROVE_FRAMES;
    live.product_present_ready = false;
    live.webview_exclusive_present_ready = false;
    live.note = if live.persistent_loop_proven {
        format!(
            "TICKET-PP-03 PARTIAL: persistent engine-owned loop presented {} frames at {}x{} (CapScore {}); product_present_ready=false — not Studio viewport / PP-02 HELD. {}",
            probe.frames_presented,
            probe.soak_present_width,
            probe.soak_present_height,
            probe.soak_capability_score,
            WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON
        )
    } else if probe.soak_oom_refused {
        "Persistent present OOM fail-closed — CapScore ladder refused all tiers".into()
    } else {
        format!(
            "Persistent present incomplete (presented={} frames={}); product_present_ready=false",
            probe.presented, probe.frames_presented
        )
    };
}

/// Start every-frame present on engine-owned surface (background thread).
pub fn start_persistent_present_loop(
    state: &PersistentPresentLoopState,
) -> PersistentPresentLiveMetrics {
    // Refuse double-start.
    if let Ok(guard) = state.join.lock() {
        if let Some(handle) = guard.as_ref() {
            if !handle.is_finished() {
                let mut snap = state.live_snapshot();
                snap.last_error = "Persistent present already running — stop first".into();
                snap.note = snap.last_error.clone();
                return snap;
            }
        }
    }

    state.stop.store(false, Ordering::SeqCst);
    {
        let mut live = state.live.lock().unwrap_or_else(|e| e.into_inner());
        *live = PersistentPresentLiveMetrics {
            running: true,
            stop_requested: false,
            frames_cap: PERSISTENT_PRESENT_MAX_FRAMES,
            note: "Persistent engine-owned present starting — product_present_ready=false".into(),
            ..Default::default()
        };
    }

    let stop = Arc::clone(&state.stop);
    let live = Arc::clone(&state.live);
    let handle = std::thread::Builder::new()
        .name("aethel-persistent-present".into())
        .spawn(move || {
            let hooks = PersistentPresentHooks {
                stop: Arc::clone(&stop),
                live: Arc::clone(&live),
                max_frames: PERSISTENT_PRESENT_MAX_FRAMES,
                prove_frames: PERSISTENT_PRESENT_PROVE_FRAMES,
            };
            let probe = run_engine_owned_persistent_present(hooks);
            if let Ok(mut g) = live.lock() {
                apply_probe_to_live(&mut g, &probe);
                g.running = false;
                g.stop_requested = stop.load(Ordering::SeqCst);
            }
        })
        .expect("spawn persistent present thread");

    if let Ok(mut join) = state.join.lock() {
        *join = Some(handle);
    }

    // Brief yield so first status can show running + adapter if init is fast.
    std::thread::sleep(Duration::from_millis(50));
    state.live_snapshot()
}

pub fn stop_persistent_present_loop(
    state: &PersistentPresentLoopState,
) -> PersistentPresentLiveMetrics {
    state.stop.store(true, Ordering::SeqCst);
    {
        if let Ok(mut live) = state.live.lock() {
            live.stop_requested = true;
        }
    }
    if let Ok(mut join) = state.join.lock() {
        if let Some(handle) = join.take() {
            let _ = handle.join();
        }
    }
    let mut snap = state.live_snapshot();
    snap.running = false;
    snap.stop_requested = true;
    snap.product_present_ready = false;
    snap.webview_exclusive_present_ready = false;
    if snap.note.is_empty() {
        snap.note =
            "Persistent present stopped — product_present_ready=false; G.3 stays ~15%".into();
    }
    snap
}

pub fn persistent_present_status(
    state: &PersistentPresentLoopState,
) -> PersistentPresentLiveMetrics {
    let mut snap = state.live_snapshot();
    snap.product_present_ready = false;
    snap.webview_exclusive_present_ready = false;
    snap
}

#[tauri::command]
pub fn product_present_persistent_start(
    state: tauri::State<'_, Arc<PersistentPresentLoopState>>,
) -> PersistentPresentLiveMetrics {
    start_persistent_present_loop(&state)
}

#[tauri::command]
pub fn product_present_persistent_stop(
    state: tauri::State<'_, Arc<PersistentPresentLoopState>>,
) -> PersistentPresentLiveMetrics {
    stop_persistent_present_loop(&state)
}

#[tauri::command]
pub fn product_present_persistent_status(
    state: tauri::State<'_, Arc<PersistentPresentLoopState>>,
) -> PersistentPresentLiveMetrics {
    persistent_present_status(&state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn live_metrics_never_claim_product_present() {
        let m = PersistentPresentLiveMetrics {
            persistent_loop_proven: true,
            frames_presented: 120,
            ..Default::default()
        };
        assert!(!m.product_present_ready);
        assert!(!m.webview_exclusive_present_ready);
    }

    #[test]
    fn prove_threshold_is_above_toy_soak() {
        assert!(PERSISTENT_PRESENT_PROVE_FRAMES > 8);
        assert!(PERSISTENT_PRESENT_MAX_FRAMES >= 60);
    }
}
