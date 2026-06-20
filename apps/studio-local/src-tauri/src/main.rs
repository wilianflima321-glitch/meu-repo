use std::sync::Mutex;

use aethel_studio_local::contracts::{
    LocalRuntimeProbeReport, RuntimeExecutionTarget, RuntimeJobLane, RuntimeJobState,
    RuntimeJobStatus, RuntimeSidecarCapability,
};
use aethel_studio_local::jobs::RuntimeJobStore;
use aethel_studio_local::native_kernel::{build_native_kernel_manifest, NativeKernelManifest};
use aethel_studio_local::policy::resolve_runtime_target;
use aethel_studio_local::probe::collect_local_probe;
use aethel_studio_local::sidecars::build_sidecar_capability_manifest;
use serde::Serialize;
use tauri::State;

mod desktop_commands;
mod wgpu_renderer;
use tauri::Manager;

const LOCAL_DEVICE_ID: &str = "local-device";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeProbeSummary {
    lane: String,
    available: bool,
    reason: String,
    checked_at: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct RuntimeRouteResponse {
    lane: String,
    reason: String,
    job_id: String,
    state: String,
    requires_human_approval: bool,
}

fn target_lane(target: RuntimeExecutionTarget) -> &'static str {
    match target {
        RuntimeExecutionTarget::LocalNative => "local-native",
        RuntimeExecutionTarget::LocalWorker | RuntimeExecutionTarget::LocalMainSafe => {
            "local-worker"
        }
        RuntimeExecutionTarget::CloudSandbox => "cloud-sandbox",
        RuntimeExecutionTarget::Held => "held",
    }
}

fn job_state_label(state: RuntimeJobState) -> &'static str {
    match state {
        RuntimeJobState::Queued => "queued",
        RuntimeJobState::Running => "running",
        RuntimeJobState::Held => "held",
        RuntimeJobState::NeedsApproval => "needs-review",
        RuntimeJobState::Complete => "complete",
        RuntimeJobState::Failed => "blocked",
        RuntimeJobState::Cancelled => "cancelled",
    }
}

fn parse_job_lane(kind: &str) -> Option<RuntimeJobLane> {
    let normalized = kind.trim().replace('_', "-").to_ascii_lowercase();
    match normalized.as_str() {
        "ai" | "ai-local" | "ai-local-inference" | "inference" => {
            Some(RuntimeJobLane::AiLocalInference)
        }
        "memory" | "memory-index" | "memory-indexing" => Some(RuntimeJobLane::MemoryIndexing),
        "asset" | "asset-import" | "import" => Some(RuntimeJobLane::AssetImport),
        "viewport" | "viewport-render" | "render-preview" => Some(RuntimeJobLane::ViewportRender),
        "build" | "build-export" | "export" => Some(RuntimeJobLane::BuildExport),
        "browser" | "browser-operator" | "browser-replay" => Some(RuntimeJobLane::BrowserOperator),
        "file" | "file-sync" | "sync" => Some(RuntimeJobLane::FileSync),
        "playtest" | "game-playtest" => Some(RuntimeJobLane::Playtest),
        "render" | "render-queue" | "cinematic-render" => Some(RuntimeJobLane::RenderQueue),
        _ => None,
    }
}

#[tauri::command]
fn local_runtime_health() -> String {
    aethel_studio_local::daemon::health_body()
}

#[tauri::command]
fn local_runtime_probe() -> RuntimeProbeSummary {
    let probe = collect_local_probe(LOCAL_DEVICE_ID);
    let lane = target_lane(probe.preferred_executor).to_string();
    RuntimeProbeSummary {
        lane,
        available: probe.preferred_executor != RuntimeExecutionTarget::Held,
        reason: if probe.preferred_executor == RuntimeExecutionTarget::Held {
            "Studio Local held native execution until device capability evidence improves."
                .to_string()
        } else {
            "Studio Local produced a governed runtime lane from the native probe.".to_string()
        },
        checked_at: probe.generated_at,
    }
}

#[tauri::command]
fn local_runtime_probe_report() -> LocalRuntimeProbeReport {
    collect_local_probe(LOCAL_DEVICE_ID)
}

#[tauri::command]
fn local_runtime_sidecars() -> Vec<RuntimeSidecarCapability> {
    let probe = collect_local_probe(LOCAL_DEVICE_ID);
    build_sidecar_capability_manifest(&probe)
}

#[tauri::command]
fn native_kernel_manifest() -> NativeKernelManifest {
    build_native_kernel_manifest()
}

#[tauri::command]
fn jobs_route(
    kind: String,
    store: State<'_, Mutex<RuntimeJobStore>>,
) -> Result<RuntimeRouteResponse, String> {
    let lane = parse_job_lane(&kind)
        .ok_or_else(|| format!("Unsupported Studio Local job lane: {kind}"))?;
    let probe = collect_local_probe(LOCAL_DEVICE_ID);
    let decision = resolve_runtime_target(&probe, lane);
    let mut store = store
        .lock()
        .map_err(|_| "Studio Local job store lock is poisoned.".to_string())?;
    let status = store.create(
        aethel_studio_local::contracts::RuntimeJobRequest::fixture(lane),
        decision,
    );

    Ok(RuntimeRouteResponse {
        lane: target_lane(status.target).to_string(),
        reason: status.compact_log.first().cloned().unwrap_or_else(|| {
            "Studio Local routed the job through the native policy.".to_string()
        }),
        job_id: status.id,
        state: job_state_label(status.state).to_string(),
        requires_human_approval: status.request.requires_human_approval,
    })
}

#[tauri::command]
fn jobs_list(store: State<'_, Mutex<RuntimeJobStore>>) -> Result<Vec<RuntimeJobStatus>, String> {
    let store = store
        .lock()
        .map_err(|_| "Studio Local job store lock is poisoned.".to_string())?;
    Ok(store.list())
}

#[tauri::command]
fn jobs_cancel(
    job_id: String,
    store: State<'_, Mutex<RuntimeJobStore>>,
) -> Result<RuntimeJobStatus, String> {
    let mut store = store
        .lock()
        .map_err(|_| "Studio Local job store lock is poisoned.".to_string())?;
    store
        .cancel(&job_id)
        .ok_or_else(|| format!("Studio Local job was not found: {job_id}"))
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            let window_arc = std::sync::Arc::new(window);
            tauri::async_runtime::spawn(async move {
                println!("[Aethel] Injecting Native WGPU Surface...");
                let _renderer = crate::wgpu_renderer::WgpuRenderer::mount_on_window(window_arc).await.unwrap();
                println!("[Aethel] Native Engine Ready.");
            });
            Ok(())
        })
        .manage(Mutex::new(RuntimeJobStore::default()))
        .manage(Mutex::new(desktop_commands::TerminalSessionStore::default()))
        .invoke_handler(tauri::generate_handler![
            desktop_commands::fs_read,
            desktop_commands::fs_write,
            desktop_commands::fs_list,
            desktop_commands::fs_watch,
            desktop_commands::terminal_create,
            desktop_commands::terminal_write,
            desktop_commands::terminal_close,
            desktop_commands::ai_complete,
            desktop_commands::notify_native,
            desktop_commands::window_minimize,
            desktop_commands::window_toggle_maximize,
            desktop_commands::window_close,
            local_runtime_health,
            local_runtime_probe,
            local_runtime_probe_report,
            local_runtime_sidecars,
            native_kernel_manifest,
            jobs_route,
            jobs_list,
            jobs_cancel
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Aethel Studio Local");
}
