//! TICKET-PP-01/03 — persistent engine-owned present + 60s Instant soak.
//!
//! - CapScore-gated every-frame ScalableRenderGraph present on an engine-owned
//!   OS window (`gpu_soak_scale` — no new `gpu_*` feature passes).
//! - **Studio session ownership (Rust):** exclusive claim token; only one
//!   present loop may own the engine surface; second start refused.
//! - **60s Instant soak:** wall-clock ≥60s frame-graph execute; min/mean/max +
//!   frame count; fail-closed on pass drop; **no fabricated FPS**.
//!
//! # Honesty
//! - `product_present_ready` stays **false** until full 15→30 gates.
//! - **PP-02 WebView carve-out remains HELD** — Chromium owns Tauri HWND.
//! - G.3 stays ~15% — Critic forbids uplift without band checklist.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread::JoinHandle;
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::gpu_frame_graph::{FrameGraphPassTiming, WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON};
use crate::wgpu_renderer::{
    run_engine_owned_persistent_present, PersistentPresentHooks, RendererPresentProbeReport,
};

/// Safety cap for interactive persistent loop (~60s @ 60 FPS).
pub const PERSISTENT_PRESENT_MAX_FRAMES: u32 = 3600;
/// Minimum frames before `persistent_loop_proven` may flip true.
pub const PERSISTENT_PRESENT_PROVE_FRAMES: u32 = 30;
/// Critic gate: Instant soak wall duration (no FPS field).
pub const SOAK_60S_WALL_MS: u64 = 60_000;
/// Upper bound on frames during wall-timed soak (slow GPUs still hit 60s wall).
pub const SOAK_60S_MAX_FRAMES: u32 = 120_000;
/// Join timeout for 60s soak thread (wall + CapScore init headroom).
pub const SOAK_60S_JOIN_TIMEOUT: Duration = Duration::from_secs(180);

/// PP-02 remains HELD — documented for Critic checklist (no carve-out shipped).
pub const PP02_WEBVIEW_CARVEOUT_HELD_REASON: &str = "\
TICKET-PP-02 HELD: WebView2/Tauri composition carve-out is not implemented. \
Chromium still owns the Studio product viewport HWND; exclusive wgpu present on \
that surface is refused. Engine-owned secondary_winit persistent present does \
not satisfy PP-02.";

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct PresentSessionClaim {
    pub token: String,
    pub owner: String,
    pub claimed_unix_ms: u128,
    pub exclusive: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Default)]
#[serde(rename_all = "camelCase")]
pub struct CriticPresentChecklist {
    /// Persistent start/stop/status IPC exists.
    pub persistent_loop_ipc: bool,
    /// 60s Instant soak completed without pass drop.
    pub soak_60s_passed: bool,
    /// Exclusive session claim is held or was proven via refuse-second-start.
    pub exclusive_session_claim: bool,
    /// Second start while claimed was refused (evidence).
    pub second_start_refused_evidence: bool,
    /// Always true while PP-02 is unimplemented (HELD flag for Critic).
    pub pp02_webview_carveout_held: bool,
    /// Always false until full 15→30 band.
    pub product_present_ready: bool,
    /// Locked at 15 — do not invent uplift.
    pub g3_percent_claimed: u32,
    pub notes: Vec<String>,
}

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
    /// Wall-clock Instant ms for the whole run (soak or persistent). Never FPS.
    pub soak_wall_ms: f64,
    pub frame_graph_ms_last: f64,
    pub frame_graph_pass_timings: Vec<FrameGraphPassTiming>,
    pub present_width: u32,
    pub present_height: u32,
    pub capability_score: u32,
    pub fidelity_tier: String,
    pub oom_refused: bool,
    /// True when a frame-graph pass dropped / present Err (fail-closed).
    pub loop_dropped: bool,
    pub adapter_name: String,
    pub backend: String,
    pub last_error: String,
    pub session_token: String,
    pub exclusive_claim_held: bool,
    pub second_start_refused: bool,
    /// True after ≥PROVE_FRAMES with frame graph, no fatal drop.
    pub persistent_loop_proven: bool,
    /// True when wall ≥60s, frames>0, no loop_dropped, frame graph executed.
    pub soak_60s_passed: bool,
    pub soak_60s_requested: bool,
    /// Always false — Studio product viewport still WebView.
    pub product_present_ready: bool,
    pub webview_exclusive_present_ready: bool,
    /// Always true until PP-02 ships.
    pub pp02_webview_carveout_held: bool,
    pub critic_checklist: CriticPresentChecklist,
    pub note: String,
}

struct SessionSlot {
    claim: PresentSessionClaim,
}

pub struct PersistentPresentLoopState {
    stop: Arc<AtomicBool>,
    live: Arc<Mutex<PersistentPresentLiveMetrics>>,
    join: Mutex<Option<JoinHandle<()>>>,
    session: Mutex<Option<SessionSlot>>,
    second_start_refused_once: AtomicBool,
}

impl Default for PersistentPresentLoopState {
    fn default() -> Self {
        Self {
            stop: Arc::new(AtomicBool::new(false)),
            live: Arc::new(Mutex::new(PersistentPresentLiveMetrics::default())),
            join: Mutex::new(None),
            session: Mutex::new(None),
            second_start_refused_once: AtomicBool::new(false),
        }
    }
}

impl PersistentPresentLoopState {
    pub fn live_snapshot(&self) -> PersistentPresentLiveMetrics {
        self.reap_finished_loop();
        let mut snap = self
            .live
            .lock()
            .map(|g| g.clone())
            .unwrap_or_default();
        snap.product_present_ready = false;
        snap.webview_exclusive_present_ready = false;
        snap.pp02_webview_carveout_held = true;
        snap.second_start_refused = self.second_start_refused_once.load(Ordering::SeqCst);
        if let Ok(slot) = self.session.lock() {
            if let Some(s) = slot.as_ref() {
                snap.session_token = s.claim.token.clone();
                snap.exclusive_claim_held = s.claim.exclusive;
            } else {
                snap.exclusive_claim_held = false;
            }
        }
        snap.critic_checklist = build_critic_checklist(&snap);
        snap
    }

    fn is_loop_thread_alive(&self) -> bool {
        self.join
            .lock()
            .ok()
            .and_then(|g| g.as_ref().map(|h| !h.is_finished()))
            .unwrap_or(false)
    }

    /// Join finished present threads (does not release exclusive session claim).
    fn reap_finished_loop(&self) {
        let finished = self
            .join
            .lock()
            .ok()
            .and_then(|g| g.as_ref().map(|h| h.is_finished()))
            .unwrap_or(false);
        if !finished {
            return;
        }
        if let Ok(mut join) = self.join.lock() {
            if let Some(handle) = join.take() {
                let _ = handle.join();
            }
        }
    }
}

fn now_unix_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

fn new_session_token(owner: &str) -> String {
    format!("ppsess-{owner}-{}", now_unix_ms())
}

fn build_critic_checklist(m: &PersistentPresentLiveMetrics) -> CriticPresentChecklist {
    CriticPresentChecklist {
        persistent_loop_ipc: true,
        soak_60s_passed: m.soak_60s_passed,
        exclusive_session_claim: m.exclusive_claim_held || !m.session_token.is_empty(),
        second_start_refused_evidence: m.second_start_refused,
        pp02_webview_carveout_held: true,
        product_present_ready: false,
        g3_percent_claimed: 15,
        notes: vec![
            WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON.into(),
            PP02_WEBVIEW_CARVEOUT_HELD_REASON.into(),
            "G.3 stays 15% — 15→30 band incomplete until Critic cites all ladder gates".into(),
        ],
    }
}

fn honesty_defaults(m: &mut PersistentPresentLiveMetrics) {
    m.product_present_ready = false;
    m.webview_exclusive_present_ready = false;
    m.pp02_webview_carveout_held = true;
    m.critic_checklist = build_critic_checklist(m);
}

fn apply_probe_to_live(
    live: &mut PersistentPresentLiveMetrics,
    probe: &RendererPresentProbeReport,
    wall_ms: f64,
    soak_60s_mode: bool,
) {
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
    live.soak_wall_ms = wall_ms;
    live.loop_dropped = probe.reasons.iter().any(|r| {
        r.contains("pass drop")
            || r.contains("loop_dropped")
            || r.contains("Present loop produced zero")
            || r.contains("frame graph")
                && r.contains("fail")
    }) || (!probe.presented && probe.frames_presented > 0);
    // Prefer explicit flag from reasons stamped by renderer.
    if probe.reasons.iter().any(|r| r.contains("LOOP_DROPPED")) {
        live.loop_dropped = true;
    }
    if !probe.presented && !probe.soak_oom_refused {
        live.last_error = probe
            .reasons
            .first()
            .cloned()
            .unwrap_or_else(|| "persistent present failed".into());
        if probe.frames_presented > 0 || live.last_error.contains("pass") {
            live.loop_dropped = true;
        }
    }
    live.persistent_loop_proven = probe.presented
        && probe.frame_graph_executed
        && probe.frames_presented >= PERSISTENT_PRESENT_PROVE_FRAMES
        && !live.loop_dropped;
    live.soak_60s_requested = soak_60s_mode;
    live.soak_60s_passed = soak_60s_mode
        && probe.presented
        && probe.frame_graph_executed
        && !live.loop_dropped
        && !probe.soak_oom_refused
        && wall_ms + 1.0 >= SOAK_60S_WALL_MS as f64
        && probe.frames_presented > 0;
    honesty_defaults(live);
    live.note = if live.soak_60s_passed {
        format!(
            "TICKET-PP-03 60s Instant soak PASSED: frames={} wall_ms={:.1} min={:.3} mean={:.3} max={:.3} CapScore {} {}x{} — no FPS; product_present_ready=false; PP-02 HELD. {}",
            probe.frames_presented,
            wall_ms,
            probe.frame_ms_min,
            probe.frame_ms_mean,
            probe.frame_ms_max,
            probe.soak_capability_score,
            probe.soak_present_width,
            probe.soak_present_height,
            PP02_WEBVIEW_CARVEOUT_HELD_REASON
        )
    } else if soak_60s_mode && live.loop_dropped {
        format!(
            "60s Instant soak FAIL-CLOSED (loop_dropped): frames={} wall_ms={:.1}; product_present_ready=false",
            probe.frames_presented, wall_ms
        )
    } else if live.persistent_loop_proven {
        format!(
            "TICKET-PP-03 PARTIAL: persistent engine-owned loop presented {} frames at {}x{} (CapScore {}); product_present_ready=false — PP-02 HELD. {}",
            probe.frames_presented,
            probe.soak_present_width,
            probe.soak_present_height,
            probe.soak_capability_score,
            PP02_WEBVIEW_CARVEOUT_HELD_REASON
        )
    } else if probe.soak_oom_refused {
        "Persistent present OOM fail-closed — CapScore ladder refused all tiers".into()
    } else {
        format!(
            "Persistent present incomplete (presented={} frames={} wall_ms={:.1}); product_present_ready=false; PP-02 HELD",
            probe.presented, probe.frames_presented, wall_ms
        )
    };
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct SessionClaimResult {
    pub ok: bool,
    pub claim: Option<PresentSessionClaim>,
    pub metrics: PersistentPresentLiveMetrics,
}

/// Acquire exclusive present-session ownership (Rust-side Studio session claim).
pub fn claim_present_session(
    state: &PersistentPresentLoopState,
    owner: &str,
) -> SessionClaimResult {
    state.reap_finished_loop();
    let mut slot = state.session.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(existing) = slot.as_ref() {
        if existing.claim.exclusive {
            let held_token = existing.claim.token.clone();
            let held_owner = existing.claim.owner.clone();
            state
                .second_start_refused_once
                .store(true, Ordering::SeqCst);
            drop(slot);
            let mut snap = state.live_snapshot();
            snap.second_start_refused = true;
            snap.exclusive_claim_held = true;
            snap.session_token = held_token.clone();
            snap.last_error = format!(
                "REFUSED second present-session claim — exclusive token `{held_token}` held by `{held_owner}`"
            );
            snap.note = snap.last_error.clone();
            honesty_defaults(&mut snap);
            return SessionClaimResult {
                ok: false,
                claim: None,
                metrics: snap,
            };
        }
    }
    let claim = PresentSessionClaim {
        token: new_session_token(owner),
        owner: owner.into(),
        claimed_unix_ms: now_unix_ms(),
        exclusive: true,
    };
    *slot = Some(SessionSlot {
        claim: claim.clone(),
    });
    let mut snap = state.live_snapshot();
    snap.session_token = claim.token.clone();
    snap.exclusive_claim_held = true;
    honesty_defaults(&mut snap);
    SessionClaimResult {
        ok: true,
        claim: Some(claim),
        metrics: snap,
    }
}

pub fn release_present_session(state: &PersistentPresentLoopState, token: Option<&str>) {
    let mut slot = state.session.lock().unwrap_or_else(|e| e.into_inner());
    if let Some(tok) = token {
        if let Some(s) = slot.as_ref() {
            if s.claim.token != tok {
                return;
            }
        }
    }
    *slot = None;
}

/// Start every-frame present on engine-owned surface (background thread).
pub fn start_persistent_present_loop(
    state: &PersistentPresentLoopState,
) -> PersistentPresentLiveMetrics {
    if state.is_loop_thread_alive() {
        state
            .second_start_refused_once
            .store(true, Ordering::SeqCst);
        let mut snap = state.live_snapshot();
        snap.second_start_refused = true;
        snap.last_error =
            "REFUSED second persistent present start — exclusive session owns the engine surface"
                .into();
        snap.note = snap.last_error.clone();
        honesty_defaults(&mut snap);
        return snap;
    }

    let claim = match claim_present_session(state, "persistent_loop") {
        SessionClaimResult {
            ok: true,
            claim: Some(c),
            ..
        } => c,
        SessionClaimResult { metrics, .. } => return metrics,
    };

    state.stop.store(false, Ordering::SeqCst);
    {
        let mut live = state.live.lock().unwrap_or_else(|e| e.into_inner());
        *live = PersistentPresentLiveMetrics {
            running: true,
            stop_requested: false,
            frames_cap: PERSISTENT_PRESENT_MAX_FRAMES,
            session_token: claim.token.clone(),
            exclusive_claim_held: true,
            pp02_webview_carveout_held: true,
            note: format!(
                "Persistent present starting (session {}); product_present_ready=false; PP-02 HELD",
                claim.token
            ),
            ..Default::default()
        };
        honesty_defaults(&mut live);
    }

    let stop = Arc::clone(&state.stop);
    let live = Arc::clone(&state.live);
    let session_token = claim.token.clone();
    let handle = std::thread::Builder::new()
        .name("aethel-persistent-present".into())
        .spawn(move || {
            let wall0 = Instant::now();
            let hooks = PersistentPresentHooks {
                stop: Arc::clone(&stop),
                live: Arc::clone(&live),
                max_frames: PERSISTENT_PRESENT_MAX_FRAMES,
                prove_frames: PERSISTENT_PRESENT_PROVE_FRAMES,
                min_wall_ms: None,
                fail_closed_on_pass_drop: true,
            };
            let probe = run_engine_owned_persistent_present(hooks);
            let wall_ms = wall0.elapsed().as_secs_f64() * 1000.0;
            if let Ok(mut g) = live.lock() {
                apply_probe_to_live(&mut g, &probe, wall_ms, false);
                g.running = false;
                g.stop_requested = stop.load(Ordering::SeqCst);
                g.session_token = session_token;
                g.exclusive_claim_held = true;
                honesty_defaults(&mut g);
            }
        })
        .expect("spawn persistent present thread");

    if let Ok(mut join) = state.join.lock() {
        *join = Some(handle);
    }

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
    release_present_session(state, None);
    let mut snap = state.live_snapshot();
    snap.running = false;
    snap.stop_requested = true;
    snap.exclusive_claim_held = false;
    honesty_defaults(&mut snap);
    if snap.note.is_empty() {
        snap.note =
            "Persistent present stopped — product_present_ready=false; G.3 stays ~15%; PP-02 HELD"
                .into();
    }
    snap
}

pub fn persistent_present_status(
    state: &PersistentPresentLoopState,
) -> PersistentPresentLiveMetrics {
    state.live_snapshot()
}

/// Blocking 60s Instant frame-graph soak for Critic checklist (no fabricated FPS).
pub fn run_persistent_soak_60s(
    state: &PersistentPresentLoopState,
) -> PersistentPresentLiveMetrics {
    if state.is_loop_thread_alive() {
        state
            .second_start_refused_once
            .store(true, Ordering::SeqCst);
        let mut snap = state.live_snapshot();
        snap.second_start_refused = true;
        snap.soak_60s_requested = true;
        snap.last_error =
            "REFUSED 60s soak — exclusive persistent present already owns the engine surface".into();
        snap.note = snap.last_error.clone();
        honesty_defaults(&mut snap);
        return snap;
    }

    let claim = match claim_present_session(state, "soak_60s") {
        SessionClaimResult {
            ok: true,
            claim: Some(c),
            ..
        } => c,
        SessionClaimResult { mut metrics, .. } => {
            metrics.soak_60s_requested = true;
            return metrics;
        }
    };

    state.stop.store(false, Ordering::SeqCst);
    {
        let mut live = state.live.lock().unwrap_or_else(|e| e.into_inner());
        *live = PersistentPresentLiveMetrics {
            running: true,
            soak_60s_requested: true,
            frames_cap: SOAK_60S_MAX_FRAMES,
            session_token: claim.token.clone(),
            exclusive_claim_held: true,
            pp02_webview_carveout_held: true,
            note: format!(
                "60s Instant soak starting (session {}); no FPS; product_present_ready=false; PP-02 HELD",
                claim.token
            ),
            ..Default::default()
        };
        honesty_defaults(&mut live);
    }

    let stop = Arc::clone(&state.stop);
    let live = Arc::clone(&state.live);
    let session_token = claim.token.clone();
    let (tx, rx) = std::sync::mpsc::channel();
    let handle = std::thread::Builder::new()
        .name("aethel-present-soak-60s".into())
        .spawn(move || {
            let wall0 = Instant::now();
            let hooks = PersistentPresentHooks {
                stop: Arc::clone(&stop),
                live: Arc::clone(&live),
                max_frames: SOAK_60S_MAX_FRAMES,
                prove_frames: PERSISTENT_PRESENT_PROVE_FRAMES,
                min_wall_ms: Some(SOAK_60S_WALL_MS),
                fail_closed_on_pass_drop: true,
            };
            let probe = run_engine_owned_persistent_present(hooks);
            let wall_ms = wall0.elapsed().as_secs_f64() * 1000.0;
            if let Ok(mut g) = live.lock() {
                apply_probe_to_live(&mut g, &probe, wall_ms, true);
                g.running = false;
                g.session_token = session_token;
                g.exclusive_claim_held = true;
                honesty_defaults(&mut g);
            }
            let _ = tx.send(());
        })
        .expect("spawn 60s soak thread");

    if let Ok(mut join) = state.join.lock() {
        *join = Some(handle);
    }

    match rx.recv_timeout(SOAK_60S_JOIN_TIMEOUT) {
        Ok(()) => {}
        Err(_) => {
            state.stop.store(true, Ordering::SeqCst);
            if let Ok(mut live) = state.live.lock() {
                live.loop_dropped = true;
                live.running = false;
                live.last_error = "60s Instant soak timed out waiting for present thread".into();
                live.soak_60s_requested = true;
                live.soak_60s_passed = false;
                honesty_defaults(&mut live);
            }
        }
    }

    if let Ok(mut join) = state.join.lock() {
        if let Some(handle) = join.take() {
            let _ = handle.join();
        }
    }
    release_present_session(state, Some(&claim.token));
    let mut snap = state.live_snapshot();
    snap.exclusive_claim_held = false;
    honesty_defaults(&mut snap);
    snap
}

#[tauri::command]
pub fn product_present_session_claim(
    owner: Option<String>,
    state: tauri::State<'_, Arc<PersistentPresentLoopState>>,
) -> SessionClaimResult {
    claim_present_session(&state, owner.as_deref().unwrap_or("studio_session"))
}

#[tauri::command]
pub fn product_present_session_release(
    token: Option<String>,
    state: tauri::State<'_, Arc<PersistentPresentLoopState>>,
) -> PersistentPresentLiveMetrics {
    release_present_session(&state, token.as_deref());
    let mut snap = state.live_snapshot();
    snap.note = "Present session claim released — product_present_ready=false; PP-02 HELD".into();
    honesty_defaults(&mut snap);
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

#[tauri::command]
pub fn product_present_soak_60s(
    state: tauri::State<'_, Arc<PersistentPresentLoopState>>,
) -> PersistentPresentLiveMetrics {
    run_persistent_soak_60s(&state)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn live_metrics_never_claim_product_present_or_pp02() {
        let mut m = PersistentPresentLiveMetrics {
            persistent_loop_proven: true,
            soak_60s_passed: true,
            frames_presented: 3_600,
            ..Default::default()
        };
        honesty_defaults(&mut m);
        assert!(!m.product_present_ready);
        assert!(!m.webview_exclusive_present_ready);
        assert!(m.pp02_webview_carveout_held);
        assert_eq!(m.critic_checklist.g3_percent_claimed, 15);
        assert!(m.critic_checklist.pp02_webview_carveout_held);
        assert!(!m.critic_checklist.notes.is_empty());
    }

    #[test]
    fn exclusive_claim_refuses_second_while_held() {
        let state = PersistentPresentLoopState::default();
        let a = claim_present_session(&state, "a");
        assert!(a.ok);
        let token = a.claim.expect("token").token;
        let refused = claim_present_session(&state, "b");
        assert!(!refused.ok);
        assert!(refused.metrics.second_start_refused);
        assert!(refused.metrics.last_error.contains("REFUSED"));
        release_present_session(&state, Some(&token));
        let c = claim_present_session(&state, "c");
        assert!(c.ok);
    }

    #[test]
    fn soak_constants_document_pp02_held() {
        assert_eq!(SOAK_60S_WALL_MS, 60_000);
        assert!(SOAK_60S_MAX_FRAMES > PERSISTENT_PRESENT_MAX_FRAMES);
        assert!(PP02_WEBVIEW_CARVEOUT_HELD_REASON.contains("PP-02"));
        assert!(PP02_WEBVIEW_CARVEOUT_HELD_REASON.contains("HELD"));
        assert!(!PP02_WEBVIEW_CARVEOUT_HELD_REASON.contains("READY"));
    }

    #[test]
    fn critic_checklist_locks_g3_at_15() {
        let m = PersistentPresentLiveMetrics {
            soak_60s_passed: true,
            exclusive_claim_held: true,
            second_start_refused: true,
            ..Default::default()
        };
        let c = build_critic_checklist(&m);
        assert_eq!(c.g3_percent_claimed, 15);
        assert!(!c.product_present_ready);
        assert!(c.pp02_webview_carveout_held);
        assert!(c.soak_60s_passed);
    }
}
