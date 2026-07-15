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

mod asset_cooker;
mod desktop_commands;
mod gpu_culling;
mod hardware_profiler;
mod mmap_commands;
mod motion_matching;
mod physics_commands;
mod scene_graph;
mod wasm_runtime;
mod wgpu_renderer;
use aethel_studio_local::ecs_parallel::ecs_benchmark;
use aethel_studio_local::geometry_clusterizer::clusterize_mesh;
use aethel_studio_local::gi_sdf::voxelize_scene_sdf;
use aethel_studio_local::physics_kernel::PhysicsKernel;
use aethel_studio_local::auto_retopology_worker::{
    probe_auto_retopology_worker_cmd, run_auto_retopology_worker_cmd,
};
use aethel_studio_local::onnx_native_gen::{
    probe_onnx_native_gen_cmd, probe_vram_pager_hooks_cmd, run_onnx_native_gen_cmd,
};
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

/// Missão Suprema 1 — Multi-Monitor & Undocking.
///
/// Spawns a brand-new OS-level webview window pointing at the same bundled
/// frontend with `?panel=<panel>` in the URL; `main.tsx` reads that query
/// param and renders only that one panel instead of the full app shell. No
/// bespoke IPC channel is needed to keep the undocked window in sync with
/// the main one: both windows are just separate listeners on the same
/// global Tauri events (`scene_graph_changed`, `hardware_sample`, ...)
/// already broadcast by `AppHandle::emit`, so dragging the Outliner out to a
/// second monitor and editing a node there updates the main window's
/// Properties panel in real time for free.
#[tauri::command]
fn open_panel_window(app: tauri::AppHandle, label: String, title: String, panel: String) -> Result<(), String> {
    if app.get_webview_window(&label).is_some() {
        return Err(format!("A Studio Local window labelled '{label}' is already open."));
    }

    let url = tauri::WebviewUrl::App(format!("index.html?panel={panel}").into());
    tauri::WebviewWindowBuilder::new(&app, &label, url)
        .title(title)
        .inner_size(520.0, 680.0)
        .min_inner_size(360.0, 420.0)
        .build()
        .map_err(|error| format!("failed to open undocked panel window '{panel}': {error}"))?;

    Ok(())
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
            // ----------------------------------------------------------------
            // Graceful hardware init (DEBT-DESK / wgpu + ort)
            //
            // Heavy crates like wgpu and ort (ONNX Runtime) can fail on older
            // machines without Vulkan / DirectX 12 or the required C++ runtimes.
            // Instead of panicking and closing the window, we emit a structured
            // IPC event so the React frontend can surface a friendly banner and
            // fall back to WebGL + cloud AI transparently.
            //
            // Event schema  →  "runtime_capability"
            //   { feature: "wgpu" | "ort", available: bool, reason: string }
            // ----------------------------------------------------------------
            let Some(window) = app.get_webview_window("main") else {
                eprintln!("[Aethel] main webview window not found — skipping hardware init");
                return Ok(());
            };
            let window_arc = std::sync::Arc::new(window);

            // Missão Suprema 2 (Profiler de Hardware Real): starts sampling
            // CPU/RAM immediately — it doesn't need the wgpu surface to
            // succeed. GPU identity is filled in below once/if the adapter
            // mounts.
            let gpu_identity_state = app
                .state::<std::sync::Arc<hardware_profiler::GpuIdentityState>>()
                .inner()
                .clone();
            hardware_profiler::spawn_hardware_profiler(app.handle().clone(), gpu_identity_state.clone());

            tauri::async_runtime::spawn(async move {
                use tauri::Emitter;

                println!("[Aethel] Probing native wgpu surface…");
                match crate::wgpu_renderer::WgpuRenderer::mount_on_window(window_arc.clone()).await {
                    Ok(renderer) => {
                        println!("[Aethel] Native wgpu renderer ready.");
                        let adapter_info = renderer.adapter.get_info();
                        if let Ok(mut identity) = gpu_identity_state.0.lock() {
                            identity.name = Some(adapter_info.name.clone());
                            identity.backend = Some(format!("{:?}", adapter_info.backend));
                        }
                        let _ = window_arc.emit(
                            "runtime_capability",
                            serde_json::json!({
                                "feature": "wgpu",
                                "available": true,
                                "reason": "Native GPU surface initialised successfully."
                            }),
                        );
                    }
                    Err(err) => {
                        eprintln!("[Aethel] wgpu init failed: {err}");
                        let _ = window_arc.emit(
                            "runtime_capability",
                            serde_json::json!({
                                "feature": "wgpu",
                                "available": false,
                                "reason": format!(
                                    "Native GPU initialisation failed: {err}. \
                                     Falling back to WebGL rendering."
                                )
                            }),
                        );
                    }
                }

                // ONNX Runtime probe — gated behind the "local-ai" feature flag
                // so the binary size stays small on machines that don't need it.
                #[cfg(feature = "local-ai")]
                {
                    use ort::{Environment, ExecutionProvider};
                    let ort_ok = Environment::builder()
                        .with_name("aethel")
                        .with_execution_providers([ExecutionProvider::CPU(Default::default())])
                        .build()
                        .is_ok();

                    let _ = window_arc.emit(
                        "runtime_capability",
                        serde_json::json!({
                            "feature": "ort",
                            "available": ort_ok,
                            "reason": if ort_ok {
                                "ONNX Runtime initialised — local AI inference available."
                            } else {
                                "ONNX Runtime failed to initialise — local AI inference \
                                 unavailable. Using cloud AI."
                            }
                        }),
                    );
                }

                println!("[Aethel] Runtime init complete.");
            });

            Ok(())
        })
        .manage(Mutex::new(RuntimeJobStore::default()))
        .manage(Mutex::new(desktop_commands::TerminalSessionStore::default()))
        .manage(desktop_commands::ProjectRootState::default())
        .manage(Mutex::new(scene_graph::SceneGraphState::default()))
        .manage(std::sync::Arc::new(hardware_profiler::GpuIdentityState::default()))
        .manage(Mutex::new(mmap_commands::MmapRegistry::default()))
        .manage(wasm_runtime::WasmHostState::default())
        .manage(Mutex::new(PhysicsKernel::new()))
        .invoke_handler(tauri::generate_handler![
            desktop_commands::fs_read,
            desktop_commands::fs_write,
            desktop_commands::fs_list,
            desktop_commands::fs_tree,
            desktop_commands::fs_watch,
            desktop_commands::set_project_root,
            desktop_commands::get_project_root,
            desktop_commands::pick_project_directory,
            desktop_commands::terminal_create,
            desktop_commands::terminal_write,
            desktop_commands::terminal_resize,
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
            jobs_cancel,
            clusterize_mesh,
            probe_auto_retopology_worker_cmd,
            run_auto_retopology_worker_cmd,
            probe_onnx_native_gen_cmd,
            run_onnx_native_gen_cmd,
            probe_vram_pager_hooks_cmd,
            voxelize_scene_sdf,
            scene_graph::scene_get_nodes,
            scene_graph::scene_select,
            scene_graph::scene_set_visible,
            scene_graph::scene_set_locked,
            scene_graph::scene_update_transform,
            scene_graph::scene_add_node,
            scene_graph::scene_remove_node,
            hardware_profiler::hardware_profiler_sample_once,
            mmap_commands::mmap_open,
            mmap_commands::mmap_read_range,
            mmap_commands::mmap_close,
            ecs_benchmark,
            open_panel_window,
            asset_cooker::asset_cooker_start,
            wasm_runtime::wasm_load_module,
            wasm_runtime::wasm_watch_and_hot_reload,
            wasm_runtime::wasm_step,
            wasm_runtime::wasm_host_status,
            motion_matching::motion_matching_evaluate,
            motion_matching::motion_matching_status,
            physics_commands::poll_physics_state
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Aethel Studio Local");
}
