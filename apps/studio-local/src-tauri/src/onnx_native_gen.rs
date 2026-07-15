//! Letter ca — ONNX native Text-to-3D session scaffold + VRAM pager hooks.
//! Letter cu — ORT weights probe + load/infer pager protocol deepen.
//!
//! TS owns production honesty (`nativeOnnxReady` until models soak).
//! This Rust module exposes Tauri IPC probe/run + pager state mirror.
//! Never invent mesh bytes. Law XV: GT730 / weak score fail-closed.
//! Weights missing ≠ ready. BYOK clay remains.
//!
//! Cargo soak with real ORT (`local-ai` feature) + weights remains evidence-gated.

use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

/// Mirrors TS `NATIVE_ONNX_MIN_CAPABILITY_SCORE`.
pub const NATIVE_ONNX_MIN_CAPABILITY_SCORE: u32 = 45;
/// Mirrors TS GT730 fail-closed band.
pub const NATIVE_ONNX_GT730_FAIL_CLOSED_SCORE: u32 = 20;
/// Never claim 8GB on weak GPU.
pub const NATIVE_ONNX_WEAK_VRAM_MB_CEILING: u32 = 512;
pub const NATIVE_ONNX_DISCRETE_VRAM_MB_CLAIM: u32 = 4096;

/// Candidate weight paths (relative to process cwd / common install roots).
pub const ONNX_ORT_WEIGHTS_CANDIDATES: &[&str] = &[
    "fixtures/onnx/tiny-text-to-3d.onnx",
    "cloud-web-app/web/fixtures/onnx/tiny-text-to-3d.onnx",
    "apps/studio-local/models/text-to-3d.onnx",
    "apps/studio-local/models/tiny-text-to-3d.onnx",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum VramPagerState {
    Idle,
    PauseViewport,
    IsolateAlloc,
    Generate,
    UnloadModel,
    ResumeViewport,
    FailClosed,
    CpuFallback,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum OnnxOrtSessionState {
    Idle,
    ProbeWeights,
    PauseViewport,
    LoadSession,
    SessionReady,
    Infer,
    UnloadSession,
    ResumeViewport,
    FailClosed,
    HeldNoWeights,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnnxNativeGenRequest {
    pub prompt: String,
    pub project_id: String,
    pub capability_score: u32,
    pub dedicated_vram_mb: Option<u32>,
    pub prefer_cpu_small: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OnnxNativeGenStatus {
    pub held: bool,
    pub held_reason: String,
    /// True ONLY when weights on disk + (optional) ORT feature soak evidence.
    pub native_onnx_ready: bool,
    pub ipc_ready: bool,
    pub models_held: bool,
    pub weights_present: bool,
    pub weights_path: Option<String>,
    pub runtime_present: bool,
    pub zero_ui: bool,
    pub claimed_vram_mb: u32,
    pub pager_state: VramPagerState,
    pub session_state: OnnxOrtSessionState,
    pub note: String,
}

fn claimed_vram_mb(score: u32, dedicated: Option<u32>) -> u32 {
    if score < NATIVE_ONNX_MIN_CAPABILITY_SCORE {
        dedicated
            .unwrap_or(NATIVE_ONNX_WEAK_VRAM_MB_CEILING)
            .min(NATIVE_ONNX_WEAK_VRAM_MB_CEILING)
    } else {
        dedicated
            .unwrap_or(NATIVE_ONNX_DISCRETE_VRAM_MB_CLAIM)
            .min(NATIVE_ONNX_DISCRETE_VRAM_MB_CLAIM * 2)
    }
}

/// Probe candidate paths for non-empty `.onnx` weights.
pub fn probe_onnx_weights_on_disk() -> (bool, Option<PathBuf>) {
    for rel in ONNX_ORT_WEIGHTS_CANDIDATES {
        let p = Path::new(rel);
        if p.is_file() {
            if let Ok(meta) = std::fs::metadata(p) {
                if meta.len() > 0 {
                    return (true, Some(p.to_path_buf()));
                }
            }
        }
    }
    (false, None)
}

/// ORT runtime presence — `local-ai` feature compiles ort; without it, false.
pub fn probe_ort_runtime_present() -> bool {
    cfg!(feature = "local-ai")
}

/// Probe — IPC ready; native_onnx_ready only with weights + runtime (still needs soak).
/// Without weights: honest HELD (weights missing ≠ ready).
pub fn probe_onnx_native_gen() -> OnnxNativeGenStatus {
    let (weights_present, weights_path) = probe_onnx_weights_on_disk();
    let runtime_present = probe_ort_runtime_present();
    // Never flip ready on probe alone — soak evidence lives in TS Vitest / cargo soak.
    let native_onnx_ready = false;
    let models_held = !weights_present;

    let (held, held_reason, session_state, note) = if !weights_present {
        (
            true,
            "Local Text-to-3D ONNX weights not on disk — BYOK MoA clay remains".to_string(),
            OnnxOrtSessionState::HeldNoWeights,
            "Letter cu — weights missing ≠ ready; pager+session protocol wired; native_onnx_ready: false"
                .to_string(),
        )
    } else if !runtime_present {
        (
            true,
            "ORT weights present but cargo `local-ai`/ort runtime not enabled — soak HELD".to_string(),
            OnnxOrtSessionState::HeldNoWeights,
            "Letter cu — weights without runtime ≠ ready; enable feature local-ai + soak".to_string(),
        )
    } else {
        (
            true,
            "ORT weights+runtime present — TS/cargo soak evidence still required to flip nativeOnnxReady"
                .to_string(),
            OnnxOrtSessionState::Idle,
            "Letter cu — probe found weights+runtime; native_onnx_ready stays false until soak"
                .to_string(),
        )
    };

    OnnxNativeGenStatus {
        held,
        held_reason,
        native_onnx_ready,
        ipc_ready: true,
        models_held,
        weights_present,
        weights_path: weights_path.map(|p| p.display().to_string()),
        runtime_present,
        zero_ui: false,
        claimed_vram_mb: NATIVE_ONNX_DISCRETE_VRAM_MB_CLAIM,
        pager_state: VramPagerState::Idle,
        session_state,
        note,
    }
}

/// Run entry — fail-closed / Zero-UI on weak GPU; never invents mesh bytes.
/// Pager happy-path mirrored in session_state when capability allows but weights HELD.
pub fn run_onnx_native_gen(req: &OnnxNativeGenRequest) -> OnnxNativeGenStatus {
    let claimed = claimed_vram_mb(req.capability_score, req.dedicated_vram_mb);
    let (weights_present, weights_path) = probe_onnx_weights_on_disk();
    let runtime_present = probe_ort_runtime_present();

    if req.capability_score < NATIVE_ONNX_GT730_FAIL_CLOSED_SCORE {
        return OnnxNativeGenStatus {
            held: true,
            held_reason: format!(
                "Law XV GT730-class score {} — native ONNX fail-closed; Zero-UI MoA clay",
                req.capability_score
            ),
            native_onnx_ready: false,
            ipc_ready: true,
            models_held: !weights_present,
            weights_present,
            weights_path: weights_path.map(|p| p.display().to_string()),
            runtime_present,
            zero_ui: true,
            claimed_vram_mb: claimed,
            pager_state: VramPagerState::CpuFallback,
            session_state: OnnxOrtSessionState::FailClosed,
            note: "Never claim 8192MB VRAM on GT730".into(),
        };
    }

    if req.capability_score < NATIVE_ONNX_MIN_CAPABILITY_SCORE {
        return OnnxNativeGenStatus {
            held: true,
            held_reason: format!(
                "Capability Score {} < {} — defer native ONNX / CPU-small HELD",
                req.capability_score, NATIVE_ONNX_MIN_CAPABILITY_SCORE
            ),
            native_onnx_ready: false,
            ipc_ready: true,
            models_held: !weights_present,
            weights_present,
            weights_path: weights_path.map(|p| p.display().to_string()),
            runtime_present,
            zero_ui: true,
            claimed_vram_mb: claimed,
            pager_state: VramPagerState::FailClosed,
            session_state: OnnxOrtSessionState::FailClosed,
            note: "VRAM pager would refuse isolate_alloc for ONNX on this score".into(),
        };
    }

    if !weights_present {
        return OnnxNativeGenStatus {
            held: true,
            held_reason: "ORT weights missing on disk — nativeOnnxReady false; BYOK clay remains"
                .into(),
            native_onnx_ready: false,
            ipc_ready: true,
            models_held: true,
            weights_present: false,
            weights_path: None,
            runtime_present,
            zero_ui: false,
            claimed_vram_mb: claimed,
            pager_state: VramPagerState::Idle,
            session_state: OnnxOrtSessionState::HeldNoWeights,
            note: "Pager protocol ready; load/infer withheld — weights missing ≠ ready".into(),
        };
    }

    // Weights present — still no invent; soak must flip ready in TS/cargo evidence.
    OnnxNativeGenStatus {
        held: true,
        held_reason: if runtime_present {
            "ORT session load protocol armed — soak evidence required before native_onnx_ready"
                .into()
        } else {
            "ORT weights present; runtime feature local-ai HELD — BYOK clay remains".into()
        },
        native_onnx_ready: false,
        ipc_ready: true,
        models_held: false,
        weights_present: true,
        weights_path: weights_path.map(|p| p.display().to_string()),
        runtime_present,
        zero_ui: false,
        claimed_vram_mb: claimed,
        pager_state: VramPagerState::Idle,
        session_state: OnnxOrtSessionState::ProbeWeights,
        note: "Pager happy-path: pause→load→infer→unload→resume (TS owns soak flip)".into(),
    }
}

/// VRAM pager hook mirror — validates Law XV claim honesty for desktop.
pub fn probe_vram_pager_hooks(capability_score: u32, dedicated_vram_mb: Option<u32>) -> OnnxNativeGenStatus {
    let mut status = probe_onnx_native_gen();
    status.claimed_vram_mb = claimed_vram_mb(capability_score, dedicated_vram_mb);
    status.pager_state = VramPagerState::Idle;
    status.note = "VRAM pager hooks scaffold — TS state machine is source of truth (letter cu)".into();
    if capability_score < NATIVE_ONNX_GT730_FAIL_CLOSED_SCORE {
        status.zero_ui = true;
        status.pager_state = VramPagerState::FailClosed;
        status.session_state = OnnxOrtSessionState::FailClosed;
    }
    status
}

#[tauri::command]
pub fn probe_onnx_native_gen_cmd() -> OnnxNativeGenStatus {
    probe_onnx_native_gen()
}

#[tauri::command]
pub fn run_onnx_native_gen_cmd(request: OnnxNativeGenRequest) -> OnnxNativeGenStatus {
    run_onnx_native_gen(&request)
}

#[tauri::command]
pub fn probe_vram_pager_hooks_cmd(
    capability_score: u32,
    dedicated_vram_mb: Option<u32>,
) -> OnnxNativeGenStatus {
    probe_vram_pager_hooks(capability_score, dedicated_vram_mb)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn probe_never_claims_onnx_ready_without_soak() {
        let s = probe_onnx_native_gen();
        assert!(!s.native_onnx_ready);
        assert!(s.ipc_ready);
        // Without fixture on disk: models held
        if !s.weights_present {
            assert!(s.models_held);
            assert!(s.held);
            assert_eq!(s.session_state, OnnxOrtSessionState::HeldNoWeights);
        }
    }

    #[test]
    fn gt730_fail_closed_zero_ui() {
        let req = OnnxNativeGenRequest {
            prompt: "hero rock".into(),
            project_id: "p1".into(),
            capability_score: 15,
            dedicated_vram_mb: Some(2048), // adversarial inflate — still capped
            prefer_cpu_small: Some(true),
        };
        let s = run_onnx_native_gen(&req);
        assert!(s.zero_ui);
        assert!(!s.native_onnx_ready);
        assert!(s.claimed_vram_mb <= NATIVE_ONNX_WEAK_VRAM_MB_CEILING);
        assert_ne!(s.claimed_vram_mb, 8192);
        assert_eq!(s.session_state, OnnxOrtSessionState::FailClosed);
    }

    #[test]
    fn discrete_still_held_without_weights_or_soak() {
        let req = OnnxNativeGenRequest {
            prompt: "hero rock".into(),
            project_id: "p1".into(),
            capability_score: 70,
            dedicated_vram_mb: Some(8192),
            prefer_cpu_small: None,
        };
        let s = run_onnx_native_gen(&req);
        assert!(s.held);
        assert!(!s.native_onnx_ready);
        assert!(!s.zero_ui);
    }

    #[test]
    fn weights_missing_means_not_ready() {
        // Default workspace has no fixture — honesty invariant.
        let (present, _) = probe_onnx_weights_on_disk();
        if !present {
            let s = probe_onnx_native_gen();
            assert!(!s.native_onnx_ready);
            assert!(s.models_held);
        }
    }
}
