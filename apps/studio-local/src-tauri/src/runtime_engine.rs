use serde::{Deserialize, Serialize};

use crate::contracts::STUDIO_LOCAL_CONTRACT_VERSION;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalWgpuProbeContract {
    pub version: u8,
    pub kind: String,
    pub timeout_ms: u64,
    pub benchmark_max_duration_ms: u64,
    pub benchmark_max_frames: u32,
    pub no_downloads: bool,
    pub no_main_thread: bool,
    pub manual_consent_only: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalWgpuRenderContract {
    pub version: u8,
    pub kind: String,
    pub idempotency_key: String,
    pub project_id: String,
    pub render_contract_id: String,
    pub accepted_targets: Vec<String>,
    pub browser_role: String,
    pub no_downloads: bool,
    pub no_main_thread: bool,
    pub require_offscreen_render: bool,
    pub require_performance_report: bool,
    pub require_validation_report: bool,
    pub require_performance_report_artifact: bool,
    pub require_validation_report_artifact: bool,
    pub never_auto_release: bool,
    pub max_render_time_ms: u64,
}

pub fn build_local_wgpu_probe_contract() -> LocalWgpuProbeContract {
    LocalWgpuProbeContract {
        version: STUDIO_LOCAL_CONTRACT_VERSION,
        kind: "aethel.wgpu.probe".to_string(),
        timeout_ms: 5_000,
        benchmark_max_duration_ms: 750,
        benchmark_max_frames: 30,
        no_downloads: true,
        no_main_thread: true,
        manual_consent_only: true,
    }
}

pub fn build_local_wgpu_render_contract(
    project_id: &str,
    render_contract_id: &str,
    requested_at: &str,
    max_duration_seconds: u64,
) -> LocalWgpuRenderContract {
    LocalWgpuRenderContract {
        version: STUDIO_LOCAL_CONTRACT_VERSION,
        kind: "aethel.wgpu.render".to_string(),
        idempotency_key: format!("{project_id}:{render_contract_id}:{requested_at}"),
        project_id: project_id.to_string(),
        render_contract_id: render_contract_id.to_string(),
        accepted_targets: vec!["local-native".to_string(), "cloud-sandbox".to_string()],
        browser_role: "preview-only".to_string(),
        no_downloads: true,
        no_main_thread: true,
        require_offscreen_render: true,
        require_performance_report: true,
        require_validation_report: true,
        require_performance_report_artifact: true,
        require_validation_report_artifact: true,
        never_auto_release: true,
        max_render_time_ms: 30_000.max(max_duration_seconds.saturating_mul(1_000)),
    }
}
