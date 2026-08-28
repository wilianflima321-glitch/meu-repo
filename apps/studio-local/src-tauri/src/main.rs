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
mod entropy_gpu_particles;
mod gf_mesh_001_fixture;
mod gf_integrated_scene_001_fixture;
mod gf_mesh_001_gpu_parity_fixture;
mod gf_substrates_device_validation;
mod present_command_channel;
mod product_screenshot_gate;
mod gpu_culling;
mod gpu_hiz;
mod gpu_indirect_draw;
mod gpu_meshlet_cull;
mod gpu_meshlet_cook;
mod product_present_adapter;
mod gpu_entropy_destruction;
mod gpu_frame_graph;
mod gpu_fsr;
mod gpu_micropoly_raster;
mod gpu_radiance_probes;
mod gpu_vsm;
mod gpu_soak_scale;
mod gpu_terminal_renderer;
mod engine_owned_present_loop;
mod frame_hash_digest;
mod hardware_profiler;
mod lsp_farm;
mod mmap_commands;
mod motion_matching;
mod physics_commands;
mod scene_graph;
mod wasm_runtime;
mod wgpu_renderer;
// ============================================================================
// Forward renderer + compute-physics substrate — HELD, not abandoned.
//
// `rendering/` is a complete forward-PBR resource graph (PbrPipeline's camera /
// 256-light / material / instance / indirect / visible-index buffers, MSAA-4
// depth, ShadowPass 2048², MeshRegistry mega-buffers, Camera + Skybox passes,
// glTF loader) with NO per-frame encode path, and `physics/` holds the
// compute-side XPBD scaffold (NativeXpbdCompute) for a future GPU path. Neither
// is constructed at runtime yet.
//
// This is an architecturally HELD state, not silent dead code: the natural wiring
// target (the product viewport) is exclusively owned by the embedded Chromium
// WebView (CW3 present constraint), so Rust cannot present to the primary HWND.
// The soak present path drives the `gpu_*` compute scaffolds on a secondary winit
// window instead (wgpu_renderer.rs). Real physics on the main thread is
// `PhysicsKernel` (Rapier3D, physics_kernel.rs); the forward renderer is the
// engine's forward-PBR foundation and is kept compile-validated — a real-device
// construction test (`forward_pbr_substrate_constructs_on_real_device` in
// pbr_graphics.rs) proves the WGSL contracts + resource graph build on a GPU.
//
// This mirrors the established `#[allow(dead_code)]` precedent on `WgpuRenderer`
// (wgpu_renderer.rs:63). Re-wiring into the product viewport is tracked (not
// silent) under the CW3 WebView-exclusive-present constraint — see
// AETHEL_FOCUS1_EXECUTION_PROGRESS.md.
// ============================================================================
#[allow(dead_code)] // held substrate — wiring tracked, not silent (see above)
mod physics;
#[allow(dead_code)] // held substrate — wiring tracked, not silent (see above)
mod rendering;
mod egui_overlay;
use aethel_studio_local::physics_kernel::PhysicsKernel;
// NOTE (round R2, 2026-08-15): the unified IPC surface now registers 114 commands via
// `aethel_studio_local::register_commands!()` — the declarative `IPC_ACL_REGISTRY` (S-12)
// is the single source of truth and every command carries Law #48 caller-identity params.
// The P2g disconnection of the host desktop commands (fs/window/ai) is ENDED: the 11
// re-wired commands are on the surface with AgentDeny ACL. Probe/soak-only kernel wires
// remain declared `pub` in `lib.rs` (code untouched); their reachability is governed by
// the S-11 Kernel Wire Registry (`xtask wire-check`), not by glob imports here.
//
// L.13 exception (2026-08-08): minimal `lsp_farm::*` commands are registered below.
use aethel_studio_local::kernel_svo_terrain_world_partition_wire::*;
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

/// MissÃ£o Suprema 1 â€” Multi-Monitor & Undocking.
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
        .register_uri_scheme_protocol("aethel-mmap", move |app, request| {
            // True Zero-Copy IPC Streamer
            let uri = request.uri().path(); // e.g., /mmap-1/0/1024
            let parts: Vec<&str> = uri.trim_matches('/').split('/').collect();
            if parts.len() != 3 {
                return tauri::http::Response::builder()
                    .status(400)
                    .body(Vec::new())
                    .unwrap();
            }
            
            let handle = parts[0];
            let offset: usize = parts[1].parse().unwrap_or(0);
            let length: usize = parts[2].parse().unwrap_or(0);

            let registry = app.app_handle().state::<std::sync::Mutex<crate::mmap_commands::MmapRegistry>>();
            let payload = if let Ok(guard) = registry.lock() {
                guard.read_binary_slice(handle, offset, length).unwrap_or_default()
            } else {
                Vec::new()
            };
            
            // Bypass base64 overhead! Return raw bytes directly.
            tauri::http::Response::builder()
                .header("Access-Control-Allow-Origin", "*")
                .header("Content-Type", "application/octet-stream")
                .body(payload)
                .unwrap()
        })
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
            // Event schema  â†’  "runtime_capability"
            //   { feature: "wgpu" | "ort", available: bool, reason: string }
            // ----------------------------------------------------------------
            let Some(window) = app.get_webview_window("main") else {
                eprintln!("[Aethel] main webview window not found â€” skipping hardware init");
                return Ok(());
            };
            let window_arc = std::sync::Arc::new(window);

            // MissÃ£o Suprema 2 (Profiler de Hardware Real): starts sampling
            // CPU/RAM immediately â€” it doesn't need the wgpu surface to
            // succeed. GPU identity is filled in below once/if the adapter
            // mounts.
            let gpu_identity_state = app
                .state::<std::sync::Arc<hardware_profiler::GpuIdentityState>>()
                .inner()
                .clone();
            hardware_profiler::spawn_hardware_profiler(app.handle().clone(), gpu_identity_state.clone());

            tauri::async_runtime::spawn(async move {
                use tauri::Emitter;

                println!("[Aethel] Probing native wgpu surface (mount/identity â€” not product present)â€¦");
                match crate::wgpu_renderer::WgpuRenderer::mount_on_window(window_arc.clone()).await {
                    Ok(renderer) => {
                        // Mount proves adapter+surface create for profiler identity.
                        // Product present/submit is `renderer_present_probe` (secondary winit).
                        // WebView exclusive HWND present remains HELD â€” do not claim UE RHI.
                        println!(
                            "[Aethel] Native wgpu adapter/surface mount ok â€” present loop via renderer_present_probe."
                        );
                        let adapter_info = renderer.adapter.get_info();
                        if let Ok(mut identity) = gpu_identity_state.0.lock() {
                            identity.name = Some(adapter_info.name.clone());
                            identity.backend = Some(format!("{:?}", adapter_info.backend));
                        }
                        // Drop renderer: holding a surface on the WebView HWND without a
                        // present loop is identity-only; continuous exclusive present HELD.
                        drop(renderer);
                        let _ = window_arc.emit(
                            "runtime_capability",
                            serde_json::json!({
                                "feature": "wgpu",
                                "available": true,
                                "presentLoop": "held_until_probe",
                                "reason": "Native GPU adapter/surface mount ok â€” WebView exclusive present HELD; invoke renderer_present_probe for secondary-window submit+present evidence."
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
                                "presentLoop": "unavailable",
                                "reason": format!(
                                    "Native GPU initialisation failed: {err}. \
                                     Falling back to WebGL rendering. present stays fail-closed."
                                )
                            }),
                        );
                    }
                }

                // ONNX Runtime probe â€” gated behind the "local-ai" feature flag
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
                                "ONNX Runtime initialised â€” local AI inference available."
                            } else {
                                "ONNX Runtime failed to initialise â€” local AI inference \
                                 unavailable. Using cloud AI."
                            }
                        }),
                    );
                }

                // [Onda M] Zero-Copy Binary WebSocket Gateway — HELD.
                // `ipc_zero_copy_ws` exists on disk but is not `pub mod` in aethel-kernel-rust
                // (no tokio_tungstenite/futures_util deps). Do not spawn a missing surface;
                // Law XI compile honesty — not Onda M feature completion.
                println!(
                    "[Aethel] Zero-Copy WS Gateway HELD — ipc_zero_copy_ws not exported/deps missing."
                );

                println!("[Aethel] Runtime init complete.");
            });

            Ok(())
        })
        .manage(Mutex::new(RuntimeJobStore::default()))
        .manage(Mutex::new(desktop_commands::TerminalSessionStore::default()))
        .manage(desktop_commands::ProjectRootState::default())
        .manage(Mutex::new(scene_graph::SceneGraphState::default()))
        .manage(std::sync::Arc::new(hardware_profiler::GpuIdentityState::default()))
        .manage(std::sync::Arc::new(wgpu_renderer::PresentProbeState::default()))
        .manage(std::sync::Arc::new(
            engine_owned_present_loop::PersistentPresentLoopState::default(),
        ))
        .manage(Mutex::new(mmap_commands::MmapRegistry::default()))
        .manage(Mutex::new(lsp_farm::LspFarmRegistry::default()))
        .manage(wasm_runtime::WasmHostState::default())
        .manage(Mutex::new(PhysicsKernel::new()))
        .manage(Mutex::new(
            aethel_studio_local::gameplay_ability_system::GasSimRuntime::new(),
        ))
        .manage(Mutex::new(WorldPartitionStreamState::default()))
        .invoke_handler(aethel_studio_local::register_commands!())
        .run(tauri::generate_context!())
        .expect("failed to run Aethel Studio Local");
}

// Domain 1 gz: Position-based dynamics real kernel.
