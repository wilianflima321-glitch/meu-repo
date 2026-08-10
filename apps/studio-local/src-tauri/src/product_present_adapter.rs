//! Product present adapter — HWND ownership honesty + engine-owned OS window.
//!
//! # What this proves
//! - **Inventory** of present surface owners (Tauri WebView/Chromium vs
//!   engine-owned secondary winit).
//! - **Refuse** exclusive wgpu present attach when the HWND is WebView-owned
//!   (`raw_window_handle` bridge stub — fail-closed).
//! - **Engine-owned OS window present**: run the secondary ScalableRenderGraph
//!   frame graph into a winit window owned by the engine (not claiming
//!   WebView exclusive / Studio product viewport replacement).
//!
//! # What this does **not** prove
//! - `product_present_ready` — Studio product viewport remains WebView.
//! - `webview_exclusive_present_ready` — Chromium owns the Tauri HWND.
//! - UE RHI / Nanite / Lumen AAA. All `*_aaa_ready` stay **false**.

use serde::{Deserialize, Serialize};

use crate::gpu_frame_graph::WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON;
use crate::wgpu_renderer::{
    run_engine_owned_os_window_present_probe, RendererPresentProbeReport,
};

/// Concrete engineering tickets required before product WebView exclusive present.
pub const PRODUCT_PRESENT_ENGINEERING_TICKETS: &[&str] = &[
    "TICKET-PP-01: Host Studio viewport as engine-owned HWND child (or Tauri native window) instead of Chromium-composited WebView pixels for exclusive wgpu present.",
    "TICKET-PP-02: WebView2/Tauri composition carve-out — document or disable Chromium ownership of the viewport HWND region before raw_window_handle exclusive claim.",
    "TICKET-PP-03: Persist engine-owned present loop (not soak-only) with resize/DPI + frame-graph execute wired to product session lifetime.",
    "TICKET-PP-04: Screenshot/parity gate (3B.2) — web preview vs desktop engine-owned present before marketing product present ready.",
];

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum HwndOwnerKind {
    /// Tauri main / panel window — Chromium WebView compositor owns pixels.
    TauriWebViewChromium,
    /// Secondary winit (or future native child) owned by the engine process.
    EngineOwnedWinit,
    /// Unknown / not probed.
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct HwndInventoryEntry {
    pub surface_id: String,
    pub owner_kind: HwndOwnerKind,
    pub exclusive_wgpu_present_allowed: bool,
    pub note: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ProductPresentHonestyReport {
    /// Always false until Studio product viewport is engine-owned exclusive.
    pub product_present_ready: bool,
    /// Always false — Chromium owns Tauri HWND.
    pub webview_exclusive_present_ready: bool,
    /// True only after engine-owned secondary_winit frame-graph present succeeded.
    pub engine_owned_os_window_present_proven: bool,
    /// True when WebView exclusive attach was attempted and refused.
    pub webview_attach_refused: bool,
    pub webview_refuse_reason: String,
    pub hwnd_inventory: Vec<HwndInventoryEntry>,
    pub engineering_tickets: Vec<String>,
    pub surface_kind: String,
    pub frames_presented: u32,
    pub frame_graph_executed: bool,
    pub soak_present_width: u32,
    pub soak_present_height: u32,
    pub soak_fidelity_tier: String,
    pub soak_capability_score: u32,
    pub adapter_name: String,
    pub backend: String,
    /// Always false — never flip AAA from present adapter.
    pub nanite_ready: bool,
    pub lumen_ready: bool,
    pub micro_poly_aaa_ready: bool,
    pub frame_graph_aaa_ready: bool,
    pub unreal_rhi_parity_ready: bool,
    pub letter: String,
    pub note: String,
    pub reasons: Vec<String>,
}

fn inventory_baseline() -> Vec<HwndInventoryEntry> {
    vec![
        HwndInventoryEntry {
            surface_id: "tauri.main.webview".into(),
            owner_kind: HwndOwnerKind::TauriWebViewChromium,
            exclusive_wgpu_present_allowed: false,
            note: WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON.into(),
        },
        HwndInventoryEntry {
            surface_id: "engine.secondary_winit.present_probe".into(),
            owner_kind: HwndOwnerKind::EngineOwnedWinit,
            exclusive_wgpu_present_allowed: true,
            note: "Engine-owned winit HWND — ScalableRenderGraph-style present allowed; not Studio product WebView viewport.".into(),
        },
        HwndInventoryEntry {
            surface_id: "engine.secondary_winit.persistent_present".into(),
            owner_kind: HwndOwnerKind::EngineOwnedWinit,
            exclusive_wgpu_present_allowed: true,
            note: "TICKET-PP-03: persistent every-frame frame-graph present on engine-owned OS window (CapScore-gated); product_present_ready stays false until Studio session / PP-02.".into(),
        },
    ]
}

fn tickets() -> Vec<String> {
    PRODUCT_PRESENT_ENGINEERING_TICKETS
        .iter()
        .map(|s| (*s).to_string())
        .collect()
}

/// Fail-closed inventory + honesty without running GPU present.
pub fn probe_product_present_honesty() -> ProductPresentHonestyReport {
    ProductPresentHonestyReport {
        product_present_ready: false,
        webview_exclusive_present_ready: false,
        engine_owned_os_window_present_proven: false,
        webview_attach_refused: false,
        webview_refuse_reason: String::new(),
        hwnd_inventory: inventory_baseline(),
        engineering_tickets: tickets(),
        surface_kind: "inventory_only".into(),
        frames_presented: 0,
        frame_graph_executed: false,
        soak_present_width: 0,
        soak_present_height: 0,
        soak_fidelity_tier: String::new(),
        soak_capability_score: 0,
        adapter_name: String::new(),
        backend: String::new(),
        nanite_ready: false,
        lumen_ready: false,
        micro_poly_aaa_ready: false,
        frame_graph_aaa_ready: false,
        unreal_rhi_parity_ready: false,
        letter: "product-present".into(),
        note: "HWND inventory only — product_present_ready stays false; WebView exclusive HELD; engine-owned soak via product_present_engine_owned_soak".into(),
        reasons: vec![
            "Inventoried TauriWebViewChromium (exclusive forbidden) + EngineOwnedWinit (secondary path allowed)".into(),
            WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON.into(),
            "product_present_ready=false until TICKET-PP-01..04 close".into(),
        ],
    }
}

/// `raw_window_handle` bridge stub: refuse exclusive present on WebView HWND.
pub fn try_attach_exclusive_present_on_webview_hwnd(
    surface_id: Option<String>,
) -> ProductPresentHonestyReport {
    let id = surface_id.unwrap_or_else(|| "tauri.main.webview".into());
    let reason = format!(
        "REFUSED exclusive wgpu present on `{id}`: Chromium WebView owns the HWND \
         (raw_window_handle attach without exclusive ownership is identity-only and \
         must not replace product pixels). {WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON}"
    );
    let mut report = probe_product_present_honesty();
    report.webview_attach_refused = true;
    report.webview_refuse_reason = reason.clone();
    report.surface_kind = "tauri_webview_refused".into();
    report.note = "WebView exclusive attach refused — fail-closed; product_present_ready=false".into();
    report.reasons.insert(0, reason);
    report
}

fn from_present_probe(probe: RendererPresentProbeReport) -> ProductPresentHonestyReport {
    let proven = probe.presented
        && probe.submitted
        && probe.surface_kind == "secondary_winit"
        && probe.frame_graph_executed
        && probe.webview_exclusive_present_held;
    let mut reasons = vec![
        format!(
            "Engine-owned OS window present: presented={} submitted={} surface={} frame_graph_executed={}",
            probe.presented, probe.submitted, probe.surface_kind, probe.frame_graph_executed
        ),
        WEBVIEW_EXCLUSIVE_PRESENT_HELD_REASON.into(),
        "product_present_ready remains false — Studio product viewport is still WebView-composited".into(),
    ];
    reasons.extend(probe.reasons.iter().take(4).cloned());
    ProductPresentHonestyReport {
        product_present_ready: false,
        webview_exclusive_present_ready: false,
        engine_owned_os_window_present_proven: proven,
        webview_attach_refused: false,
        webview_refuse_reason: String::new(),
        hwnd_inventory: inventory_baseline(),
        engineering_tickets: tickets(),
        surface_kind: if proven {
            "engine_owned_os_window".into()
        } else {
            probe.surface_kind
        },
        frames_presented: probe.frames_presented,
        frame_graph_executed: probe.frame_graph_executed,
        soak_present_width: probe.soak_present_width,
        soak_present_height: probe.soak_present_height,
        soak_fidelity_tier: probe.soak_fidelity_tier,
        soak_capability_score: probe.soak_capability_score,
        adapter_name: probe.adapter_name,
        backend: probe.backend,
        nanite_ready: false,
        lumen_ready: false,
        micro_poly_aaa_ready: false,
        frame_graph_aaa_ready: false,
        unreal_rhi_parity_ready: false,
        letter: "product-present".into(),
        note: if proven {
            "Engine-owned secondary_winit presented ScalableRenderGraph frame graph — not WebView exclusive; product_present_ready=false".into()
        } else {
            "Engine-owned present soak did not prove present — fail-closed; product_present_ready=false".into()
        },
        reasons,
    }
}

/// Present the secondary frame graph into an engine-owned OS window (not WebView).
pub fn run_engine_owned_present_soak(
    frames: Option<u32>,
) -> (ProductPresentHonestyReport, RendererPresentProbeReport) {
    let probe = run_engine_owned_os_window_present_probe(frames);
    (from_present_probe(probe.clone()), probe)
}

#[tauri::command]
pub fn product_present_honesty_probe() -> ProductPresentHonestyReport {
    probe_product_present_honesty()
}

#[tauri::command]
pub fn product_present_try_webview_attach(
    surface_id: Option<String>,
) -> ProductPresentHonestyReport {
    try_attach_exclusive_present_on_webview_hwnd(surface_id)
}

#[tauri::command]
pub fn product_present_engine_owned_soak(
    frames: Option<u32>,
    state: tauri::State<'_, std::sync::Arc<crate::wgpu_renderer::PresentProbeState>>,
) -> ProductPresentHonestyReport {
    let (report, probe) = run_engine_owned_present_soak(frames);
    if let Ok(mut guard) = state.0.lock() {
        *guard = Some(probe);
    }
    report
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn honesty_probe_never_flips_product_present() {
        let r = probe_product_present_honesty();
        assert!(!r.product_present_ready);
        assert!(!r.webview_exclusive_present_ready);
        assert!(!r.nanite_ready);
        assert!(!r.lumen_ready);
        assert!(!r.engine_owned_os_window_present_proven);
        assert_eq!(r.hwnd_inventory.len(), 3);
        assert!(!r.engineering_tickets.is_empty());
        assert!(r
            .hwnd_inventory
            .iter()
            .any(|e| e.owner_kind == HwndOwnerKind::TauriWebViewChromium
                && !e.exclusive_wgpu_present_allowed));
        assert!(r.engineering_tickets.iter().any(|t| t.contains("TICKET-PP-01")));
    }

    #[test]
    fn webview_attach_is_refused() {
        let r = try_attach_exclusive_present_on_webview_hwnd(Some("tauri.main.webview".into()));
        assert!(r.webview_attach_refused);
        assert!(!r.product_present_ready);
        assert!(!r.webview_exclusive_present_ready);
        assert!(r.webview_refuse_reason.contains("REFUSED"));
        assert!(r.webview_refuse_reason.contains("Chromium"));
    }
}
