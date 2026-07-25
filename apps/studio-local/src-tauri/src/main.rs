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
use aethel_studio_local::kernel_foundation_wire::{
    probe_kernel_foundation_cmd, run_kernel_foundation_soak_cmd,
};
use aethel_studio_local::kernel_desktop_wire::{
    probe_kernel_desktop_wire_cmd, run_kernel_desktop_soak_cmd,
};
use aethel_studio_local::kernel_mut_dna_desktop_wire::{
    probe_kernel_mut_dna_desktop_cmd, run_kernel_mut_dna_desktop_soak_cmd,
};
use aethel_studio_local::kernel_spectral_sonic_desktop_wire::{
    probe_kernel_spectral_sonic_desktop_cmd, run_kernel_spectral_sonic_desktop_soak_cmd,
};
use aethel_studio_local::kernel_world_soa_sab_wire::{
    probe_world_soa_sab_layout_cmd, run_kernel_world_soa_sab_layout_soak_cmd,
};
use aethel_studio_local::kernel_mmap_ecs_pager_wire::{
    probe_mmap_ecs_pager_cmd, run_kernel_mmap_ecs_pager_soak_cmd,
};
use aethel_studio_local::kernel_simd_clay_math_wire::{
    probe_simd_clay_math_cmd, run_kernel_simd_clay_math_soak_cmd,
};
use aethel_studio_local::kernel_simd_world_soa_hot_path_wire::{
    probe_simd_world_soa_hot_path_cmd, run_kernel_simd_world_soa_hot_path_soak_cmd,
};
use aethel_studio_local::kernel_baremetal_memory_manager_wire::{
    probe_baremetal_memory_manager_cmd, run_kernel_baremetal_memory_manager_soak_cmd,
};
use aethel_studio_local::kernel_slab_allocator_mmap_wire::{
    probe_slab_allocator_mmap_cmd, run_kernel_slab_allocator_mmap_soak_cmd,
};
use aethel_studio_local::kernel_unified_field_network_wire::{
    probe_unified_field_network_cmd, run_kernel_unified_field_network_soak_cmd,
};
use aethel_studio_local::kernel_autonomous_entropy_corrector_wire::{
    probe_autonomous_entropy_corrector_cmd, run_kernel_autonomous_entropy_corrector_soak_cmd,
};
use aethel_studio_local::kernel_fractal_energy_perturbation_wire::{
    probe_fractal_energy_perturbation_cmd, run_kernel_fractal_energy_perturbation_soak_cmd,
};
use aethel_studio_local::kernel_curved_raymarcher_wire::{
    probe_curved_raymarcher_cmd, run_kernel_curved_raymarcher_soak_cmd,
};
use aethel_studio_local::kernel_shadow_time_reversal_wire::{
    probe_shadow_time_reversal_cmd, run_kernel_shadow_time_reversal_soak_cmd,
};
use aethel_studio_local::kernel_four_dimensional_time_sdf_wire::{
    probe_four_dimensional_time_sdf_cmd, run_kernel_four_dimensional_time_sdf_soak_cmd,
};
use aethel_studio_local::kernel_mnemonic_matter_entropy_wire::{
    probe_mnemonic_matter_entropy_cmd, run_kernel_mnemonic_matter_entropy_soak_cmd,
};
use aethel_studio_local::kernel_synesthetic_sensory_remap_wire::{
    probe_synesthetic_sensory_remap_cmd, run_kernel_synesthetic_sensory_remap_soak_cmd,
};
use aethel_studio_local::kernel_autonomous_conflict_generator_wire::{
    probe_autonomous_conflict_generator_cmd, run_kernel_autonomous_conflict_generator_soak_cmd,
};
use aethel_studio_local::kernel_atmospheric_physical_damping_wire::{
    probe_atmospheric_physical_damping_cmd, run_kernel_atmospheric_physical_damping_soak_cmd,
};
use aethel_studio_local::kernel_position_based_dynamics_wire::{
    probe_position_based_dynamics_cmd, run_kernel_position_based_dynamics_soak_cmd,
};
use aethel_studio_local::kernel_hybrid_eulerian_lagrangian_pbd_wire::{
    probe_hybrid_eulerian_lagrangian_pbd_cmd, run_kernel_hybrid_eulerian_lagrangian_pbd_soak_cmd,
};
use aethel_studio_local::kernel_matter_thermodynamics_sph_wire::{
    probe_matter_thermodynamics_sph_cmd, run_kernel_matter_thermodynamics_sph_soak_cmd,
};
use aethel_studio_local::kernel_aerodynamic_navier_stokes_wire::{
    probe_aerodynamic_navier_stokes_cmd, run_kernel_aerodynamic_navier_stokes_soak_cmd,
};
use aethel_studio_local::kernel_lattice_boltzmann_fluid_solver_wire::{
    probe_lattice_boltzmann_fluid_solver_cmd, run_kernel_lattice_boltzmann_fluid_solver_soak_cmd,
};
use aethel_studio_local::kernel_lattice_boltzmann_gas_fluid_wire::{
    probe_lattice_boltzmann_gas_fluid_cmd, run_kernel_lattice_boltzmann_gas_fluid_soak_cmd,
};
use aethel_studio_local::kernel_acoustic_raytracing_echo_wire::{
    probe_acoustic_raytracing_echo_cmd, run_kernel_acoustic_raytracing_echo_soak_cmd,
};
use aethel_studio_local::kernel_finite_element_analysis_wire::{
    probe_finite_element_analysis_cmd, run_kernel_finite_element_analysis_soak_cmd,
};
use aethel_studio_local::kernel_acoustic_reverb_geometry_wire::{
    probe_acoustic_reverb_geometry_cmd, run_kernel_acoustic_reverb_geometry_soak_cmd,
};
use aethel_studio_local::kernel_fm_additive_synthesis_wire::{
    probe_fm_additive_synthesis_cmd, run_kernel_fm_additive_synthesis_soak_cmd,
};
use aethel_studio_local::kernel_hermite_duality_grid_wire::{
    probe_hermite_duality_grid_cmd, run_kernel_hermite_duality_grid_soak_cmd,
};
use aethel_studio_local::kernel_hermite_sharp_features_wire::{
    probe_hermite_sharp_features_cmd, run_kernel_hermite_sharp_features_soak_cmd,
};
use aethel_studio_local::kernel_sdf_sculptor_wire::{
    probe_sdf_sculptor_cmd, run_kernel_sdf_sculptor_soak_cmd,
};
use aethel_studio_local::kernel_sdf_adaptive_cascades_wire::{
    probe_sdf_adaptive_cascades_cmd, run_kernel_sdf_adaptive_cascades_soak_cmd,
};
use aethel_studio_local::kernel_stochastic_virtual_sdf_wire::{
    probe_stochastic_virtual_sdf_cmd, run_kernel_stochastic_virtual_sdf_soak_cmd,
};
use aethel_studio_local::kernel_sdf_octree_hashing_wire::{
    probe_sdf_octree_hashing_cmd, run_kernel_sdf_octree_hashing_soak_cmd,
};
use aethel_studio_local::kernel_sdf_motion_vector_buffer_wire::{
    probe_sdf_motion_vector_buffer_cmd, run_kernel_sdf_motion_vector_buffer_soak_cmd,
};
use aethel_studio_local::kernel_velocity_buffer_ecs_wire::{
    probe_velocity_buffer_ecs_cmd, run_kernel_velocity_buffer_ecs_soak_cmd,
};
use aethel_studio_local::kernel_hybrid_geometry_svo_wire::{
    probe_hybrid_geometry_svo_cmd, run_kernel_hybrid_geometry_svo_soak_cmd,
};
use aethel_studio_local::kernel_svo_depth_lod_wire::{
    probe_svo_depth_lod_cmd, run_kernel_svo_depth_lod_soak_cmd,
};
use aethel_studio_local::kernel_internal_voxel_density_wire::{
    probe_internal_voxel_density_cmd, run_kernel_internal_voxel_density_soak_cmd,
};
use aethel_studio_local::kernel_micro_displacement_noise_wire::{
    probe_micro_displacement_noise_cmd, run_kernel_micro_displacement_noise_soak_cmd,
};
use aethel_studio_local::kernel_volumetric_extinction_medium_wire::{
    probe_volumetric_extinction_medium_cmd, run_kernel_volumetric_extinction_medium_soak_cmd,
};
use aethel_studio_local::kernel_sdf_audio_raymarching_wire::{
    probe_sdf_audio_raymarching_cmd, run_kernel_sdf_audio_raymarching_soak_cmd,
};
use aethel_studio_local::kernel_contextual_physics_override_wire::{
    probe_contextual_physics_override_cmd, run_kernel_contextual_physics_override_soak_cmd,
};
use aethel_studio_local::kernel_dynamic_matter_entropy_wire::{
    probe_dynamic_matter_entropy_cmd, run_kernel_dynamic_matter_entropy_soak_cmd,
};
use aethel_studio_local::kernel_digital_pressure_chamber_wire::{
    probe_digital_pressure_chamber_cmd, run_kernel_digital_pressure_chamber_soak_cmd,
};
use aethel_studio_local::kernel_geometric_scale_constraints_wire::{
    probe_geometric_scale_constraints_cmd, run_kernel_geometric_scale_constraints_soak_cmd,
};
use aethel_studio_local::kernel_universal_logarithmic_scale_wire::{
    probe_universal_logarithmic_scale_cmd, run_kernel_universal_logarithmic_scale_soak_cmd,
};
use aethel_studio_local::kernel_sparse_seed_instancing_wire::{
    probe_sparse_seed_instancing_cmd, run_kernel_sparse_seed_instancing_soak_cmd,
};
use aethel_studio_local::kernel_lockfree_ring_buffer_wire::{
    probe_lockfree_ring_buffer_cmd, run_kernel_lockfree_ring_buffer_soak_cmd,
};
use aethel_studio_local::kernel_atomic_thread_sync_wire::{
    probe_atomic_thread_sync_cmd, run_kernel_atomic_thread_sync_soak_cmd,
};
use aethel_studio_local::kernel_crdt_quantum_sync_wire::{
    probe_crdt_quantum_sync_cmd, run_kernel_crdt_quantum_sync_soak_cmd,
};
use aethel_studio_local::kernel_delta_seed_synchronization_wire::{
    probe_delta_seed_synchronization_cmd, run_kernel_delta_seed_synchronization_soak_cmd,
};
use aethel_studio_local::kernel_state_sync_protocol_wire::{
    probe_state_sync_protocol_cmd, run_kernel_state_sync_protocol_soak_cmd,
};
use aethel_studio_local::kernel_bitstream_reality_sync_wire::{
    probe_bitstream_reality_sync_cmd, run_kernel_bitstream_reality_sync_soak_cmd,
};
use aethel_studio_local::kernel_binary_seed_streamer_wire::{
    probe_binary_seed_streamer_cmd, run_kernel_binary_seed_streamer_soak_cmd,
};
use aethel_studio_local::kernel_cpu_affinity_micro_workers_wire::{
    probe_cpu_affinity_micro_workers_cmd, run_kernel_cpu_affinity_micro_workers_soak_cmd,
};
use aethel_studio_local::kernel_asynchronous_reality_threads_wire::{
    probe_asynchronous_reality_threads_cmd, run_kernel_asynchronous_reality_threads_soak_cmd,
};
use aethel_studio_local::kernel_thermal_scheduler_wire::{
    probe_thermal_scheduler_cmd, run_kernel_thermal_scheduler_soak_cmd,
};
use aethel_studio_local::kernel_live_cache_manager_wire::{
    probe_live_cache_manager_cmd, run_kernel_live_cache_manager_soak_cmd,
};
use aethel_studio_local::kernel_hierarchical_streaming_cache_wire::{
    probe_hierarchical_streaming_cache_cmd, run_kernel_hierarchical_streaming_cache_soak_cmd,
};
use aethel_studio_local::kernel_metabolic_memory_wire::{
    probe_metabolic_memory_cmd, run_kernel_metabolic_memory_soak_cmd,
};
use aethel_studio_local::kernel_ghost_state_predictor_wire::{
    probe_ghost_state_predictor_cmd, run_kernel_ghost_state_predictor_soak_cmd,
};
use aethel_studio_local::kernel_reversible_quantum_undo_wire::{
    probe_reversible_quantum_undo_cmd, run_kernel_reversible_quantum_undo_soak_cmd,
};
use aethel_studio_local::kernel_genomic_seed_library_wire::{
    probe_genomic_seed_library_cmd, run_kernel_genomic_seed_library_soak_cmd,
};
use aethel_studio_local::kernel_genomic_seed_transmitter_wire::{
    probe_genomic_seed_transmitter_cmd, run_kernel_genomic_seed_transmitter_soak_cmd,
};
use aethel_studio_local::kernel_formal_logic_verifier_wire::{
    probe_formal_logic_verifier_cmd, run_kernel_formal_logic_verifier_soak_cmd,
};
use aethel_studio_local::kernel_quantum_overlap_wire::{
    probe_quantum_overlap_cmd, run_kernel_quantum_overlap_soak_cmd,
};
use aethel_studio_local::kernel_blue_noise_dithering_wire::{
    probe_blue_noise_dithering_cmd, run_kernel_blue_noise_dithering_soak_cmd,
};
use aethel_studio_local::kernel_recursive_fractal_enhancement_wire::{
    probe_recursive_fractal_enhancement_cmd, run_kernel_recursive_fractal_enhancement_soak_cmd,
};
use aethel_studio_local::kernel_symmetric_vector_algebra_wire::{
    probe_symmetric_vector_algebra_cmd, run_kernel_symmetric_vector_algebra_soak_cmd,
};
use aethel_studio_local::kernel_voxel_cone_radiosity_wire::{
    probe_voxel_cone_radiosity_cmd, run_kernel_voxel_cone_radiosity_soak_cmd,
};
use aethel_studio_local::kernel_atmospheric_scattering_godrays_wire::{
    probe_atmospheric_scattering_godrays_cmd, run_kernel_atmospheric_scattering_godrays_soak_cmd,
};
use aethel_studio_local::kernel_dynamic_physics_dsl_wire::{
    probe_dynamic_physics_dsl_cmd, run_kernel_dynamic_physics_dsl_soak_cmd,
};
use aethel_studio_local::kernel_chromatic_glass_refraction_wire::{
    probe_chromatic_glass_refraction_cmd, run_kernel_chromatic_glass_refraction_soak_cmd,
};
use aethel_studio_local::kernel_preintegrated_sss_transmittance_wire::{
    probe_preintegrated_sss_transmittance_cmd,
    run_kernel_preintegrated_sss_transmittance_soak_cmd,
};
use aethel_studio_local::kernel_aces_cinematic_tonemapper_wire::{
    probe_aces_cinematic_tonemapper_cmd, run_kernel_aces_cinematic_tonemapper_soak_cmd,
};
use aethel_studio_local::kernel_fluid_ninja_compute_wire::{
    probe_fluid_ninja_compute_cmd, run_kernel_fluid_ninja_compute_soak_cmd,
};
use aethel_studio_local::kernel_wgsl_surface_noise_kernel_wire::{
    probe_wgsl_surface_noise_kernel_cmd, run_kernel_wgsl_surface_noise_kernel_soak_cmd,
};
use aethel_studio_local::kernel_infinite_anti_aliasing_wire::{
    probe_infinite_anti_aliasing_cmd, run_kernel_infinite_anti_aliasing_soak_cmd,
};
use aethel_studio_local::kernel_spectral_dispersion_caustics_wire::{
    probe_spectral_dispersion_caustics_cmd, run_kernel_spectral_dispersion_caustics_soak_cmd,
};
use aethel_studio_local::kernel_hybrid_cluster_shading_vsvm_wire::{
    probe_hybrid_cluster_shading_vsvm_cmd, run_kernel_hybrid_cluster_shading_vsvm_soak_cmd,
};
use aethel_studio_local::kernel_atmospheric_spine_particles_wire::{
    probe_atmospheric_spine_particles_cmd, run_kernel_atmospheric_spine_particles_soak_cmd,
};
use aethel_studio_local::kernel_radiance_cascades_gi_wire::{
    probe_radiance_cascades_gi_cmd, run_kernel_radiance_cascades_gi_soak_cmd,
};
use aethel_studio_local::kernel_alexa_cinematic_optics_wire::{
    probe_alexa_cinematic_optics_cmd, run_kernel_alexa_cinematic_optics_soak_cmd,
};
use aethel_studio_local::kernel_spectral_light_pipeline_wire::{
    probe_spectral_light_pipeline_cmd, run_kernel_spectral_light_pipeline_soak_cmd,
};
use aethel_studio_local::kernel_usd_importer_bridge_wire::{
    probe_usd_importer_bridge_cmd, run_kernel_usd_importer_bridge_soak_cmd,
};
use aethel_studio_local::kernel_msl_wgsl_compiler_wire::{
    probe_msl_wgsl_compiler_cmd, run_kernel_msl_wgsl_compiler_soak_cmd,
};
use aethel_studio_local::kernel_strain_aware_texturing_wire::{
    probe_strain_aware_texturing_cmd, run_kernel_strain_aware_texturing_soak_cmd,
};
use aethel_studio_local::kernel_gaze_foveated_reprojection_wire::{
    probe_gaze_foveated_reprojection_cmd, run_kernel_gaze_foveated_reprojection_soak_cmd,
};
use aethel_studio_local::kernel_wgpu_wgsl_device_load_wire::{
    probe_wgpu_wgsl_device_load_cmd, run_kernel_wgpu_wgsl_device_load_soak_cmd,
};
use aethel_studio_local::kernel_hdr_32bit_float_pipeline_wire::{
    probe_hdr_32bit_float_pipeline_cmd, run_kernel_hdr_32bit_float_pipeline_soak_cmd,
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

                println!("[Aethel] Probing native wgpu surface (mount/identity — not product present)…");
                match crate::wgpu_renderer::WgpuRenderer::mount_on_window(window_arc.clone()).await {
                    Ok(renderer) => {
                        // Mount proves adapter+surface create for profiler identity.
                        // Product present/submit is `renderer_present_probe` (secondary winit).
                        // WebView exclusive HWND present remains HELD — do not claim UE RHI.
                        println!(
                            "[Aethel] Native wgpu adapter/surface mount ok — present loop via renderer_present_probe."
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
                                "reason": "Native GPU adapter/surface mount ok — WebView exclusive present HELD; invoke renderer_present_probe for secondary-window submit+present evidence."
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
        .manage(std::sync::Arc::new(wgpu_renderer::PresentProbeState::default()))
        .manage(Mutex::new(mmap_commands::MmapRegistry::default()))
        .manage(wasm_runtime::WasmHostState::default())
        .manage(Mutex::new(PhysicsKernel::new()))
        .invoke_handler(tauri::generate_handler![
            open_panel_window,
            hardware_profiler::hardware_profiler_sample_once,
            wgpu_renderer::renderer_present_probe,
            wgpu_renderer::present_frame,
            wgpu_renderer::renderer_present_probe_last,
            physics_commands::poll_physics_state,
            scene_graph::scene_get_nodes,
            scene_graph::scene_select,
            scene_graph::scene_set_visible,
            scene_graph::scene_set_locked,
            scene_graph::scene_update_transform,
            scene_graph::scene_add_node,
            scene_graph::scene_remove_node,
            mmap_commands::mmap_open,
            mmap_commands::mmap_read_range,
            mmap_commands::mmap_close,
            asset_cooker::asset_cooker_start,
            wasm_runtime::wasm_load_module,
            wasm_runtime::wasm_watch_and_hot_reload,
            wasm_runtime::wasm_step,
            wasm_runtime::wasm_host_status,
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
            probe_kernel_foundation_cmd,
            run_kernel_foundation_soak_cmd,
            probe_kernel_desktop_wire_cmd,
            run_kernel_desktop_soak_cmd,
            probe_kernel_mut_dna_desktop_cmd,
            run_kernel_mut_dna_desktop_soak_cmd,
            probe_kernel_spectral_sonic_desktop_cmd,
            run_kernel_spectral_sonic_desktop_soak_cmd,
            probe_world_soa_sab_layout_cmd,
            run_kernel_world_soa_sab_layout_soak_cmd,
            probe_mmap_ecs_pager_cmd,
            run_kernel_mmap_ecs_pager_soak_cmd,
            probe_simd_clay_math_cmd,
            run_kernel_simd_clay_math_soak_cmd,
            probe_simd_world_soa_hot_path_cmd,
            run_kernel_simd_world_soa_hot_path_soak_cmd,
            probe_baremetal_memory_manager_cmd,
            run_kernel_baremetal_memory_manager_soak_cmd,
            probe_slab_allocator_mmap_cmd,
            run_kernel_slab_allocator_mmap_soak_cmd,
            probe_unified_field_network_cmd,
            run_kernel_unified_field_network_soak_cmd,
            probe_autonomous_entropy_corrector_cmd,
            run_kernel_autonomous_entropy_corrector_soak_cmd,
            probe_fractal_energy_perturbation_cmd,
            run_kernel_fractal_energy_perturbation_soak_cmd,
            probe_curved_raymarcher_cmd,
            run_kernel_curved_raymarcher_soak_cmd,
            probe_shadow_time_reversal_cmd,
            run_kernel_shadow_time_reversal_soak_cmd,
            probe_four_dimensional_time_sdf_cmd,
            run_kernel_four_dimensional_time_sdf_soak_cmd,
            probe_mnemonic_matter_entropy_cmd,
            run_kernel_mnemonic_matter_entropy_soak_cmd,
            probe_synesthetic_sensory_remap_cmd,
            run_kernel_synesthetic_sensory_remap_soak_cmd,
            probe_autonomous_conflict_generator_cmd,
            run_kernel_autonomous_conflict_generator_soak_cmd,
            probe_atmospheric_physical_damping_cmd,
            run_kernel_atmospheric_physical_damping_soak_cmd,
            probe_position_based_dynamics_cmd,
            run_kernel_position_based_dynamics_soak_cmd,
            probe_hybrid_eulerian_lagrangian_pbd_cmd,
            run_kernel_hybrid_eulerian_lagrangian_pbd_soak_cmd,
            probe_matter_thermodynamics_sph_cmd,
            run_kernel_matter_thermodynamics_sph_soak_cmd,
            probe_aerodynamic_navier_stokes_cmd,
            run_kernel_aerodynamic_navier_stokes_soak_cmd,
            probe_lattice_boltzmann_fluid_solver_cmd,
            run_kernel_lattice_boltzmann_fluid_solver_soak_cmd,
            probe_lattice_boltzmann_gas_fluid_cmd,
            run_kernel_lattice_boltzmann_gas_fluid_soak_cmd,
            probe_acoustic_raytracing_echo_cmd,
            run_kernel_acoustic_raytracing_echo_soak_cmd,
            probe_finite_element_analysis_cmd,
            run_kernel_finite_element_analysis_soak_cmd,
            probe_acoustic_reverb_geometry_cmd,
            run_kernel_acoustic_reverb_geometry_soak_cmd,
            probe_fm_additive_synthesis_cmd,
            run_kernel_fm_additive_synthesis_soak_cmd,
            probe_hermite_duality_grid_cmd,
            run_kernel_hermite_duality_grid_soak_cmd,
            probe_hermite_sharp_features_cmd,
            run_kernel_hermite_sharp_features_soak_cmd,
            probe_sdf_sculptor_cmd,
            run_kernel_sdf_sculptor_soak_cmd,
            probe_sdf_adaptive_cascades_cmd,
            run_kernel_sdf_adaptive_cascades_soak_cmd,
            probe_stochastic_virtual_sdf_cmd,
            run_kernel_stochastic_virtual_sdf_soak_cmd,
            probe_sdf_octree_hashing_cmd,
            run_kernel_sdf_octree_hashing_soak_cmd,
            probe_sdf_motion_vector_buffer_cmd,
            run_kernel_sdf_motion_vector_buffer_soak_cmd,
            probe_velocity_buffer_ecs_cmd,
            run_kernel_velocity_buffer_ecs_soak_cmd,
            probe_hybrid_geometry_svo_cmd,
            run_kernel_hybrid_geometry_svo_soak_cmd,
            probe_svo_depth_lod_cmd,
            run_kernel_svo_depth_lod_soak_cmd,
            probe_internal_voxel_density_cmd,
            run_kernel_internal_voxel_density_soak_cmd,
            probe_micro_displacement_noise_cmd,
            run_kernel_micro_displacement_noise_soak_cmd,
            probe_volumetric_extinction_medium_cmd,
            run_kernel_volumetric_extinction_medium_soak_cmd,
            probe_sdf_audio_raymarching_cmd,
            run_kernel_sdf_audio_raymarching_soak_cmd,
            probe_contextual_physics_override_cmd,
            run_kernel_contextual_physics_override_soak_cmd,
            probe_dynamic_matter_entropy_cmd,
            run_kernel_dynamic_matter_entropy_soak_cmd,
            probe_digital_pressure_chamber_cmd,
            run_kernel_digital_pressure_chamber_soak_cmd,
            probe_geometric_scale_constraints_cmd,
            run_kernel_geometric_scale_constraints_soak_cmd,
            probe_universal_logarithmic_scale_cmd,
            run_kernel_universal_logarithmic_scale_soak_cmd,
            probe_sparse_seed_instancing_cmd,
            run_kernel_sparse_seed_instancing_soak_cmd,
            probe_lockfree_ring_buffer_cmd,
            run_kernel_lockfree_ring_buffer_soak_cmd,
            probe_atomic_thread_sync_cmd,
            run_kernel_atomic_thread_sync_soak_cmd,
            probe_crdt_quantum_sync_cmd,
            run_kernel_crdt_quantum_sync_soak_cmd,
            probe_delta_seed_synchronization_cmd,
            run_kernel_delta_seed_synchronization_soak_cmd,
            probe_state_sync_protocol_cmd,
            run_kernel_state_sync_protocol_soak_cmd,
            probe_bitstream_reality_sync_cmd,
            run_kernel_bitstream_reality_sync_soak_cmd,
            probe_binary_seed_streamer_cmd,
            run_kernel_binary_seed_streamer_soak_cmd,
            probe_cpu_affinity_micro_workers_cmd,
            run_kernel_cpu_affinity_micro_workers_soak_cmd,
            probe_asynchronous_reality_threads_cmd,
            run_kernel_asynchronous_reality_threads_soak_cmd,
            probe_thermal_scheduler_cmd,
            run_kernel_thermal_scheduler_soak_cmd,
            probe_live_cache_manager_cmd,
            run_kernel_live_cache_manager_soak_cmd,
            probe_hierarchical_streaming_cache_cmd,
            run_kernel_hierarchical_streaming_cache_soak_cmd,
            probe_metabolic_memory_cmd,
            run_kernel_metabolic_memory_soak_cmd,
            probe_ghost_state_predictor_cmd,
            run_kernel_ghost_state_predictor_soak_cmd,
            probe_reversible_quantum_undo_cmd,
            run_kernel_reversible_quantum_undo_soak_cmd,
            probe_genomic_seed_library_cmd,
            run_kernel_genomic_seed_library_soak_cmd,
            probe_genomic_seed_transmitter_cmd,
            run_kernel_genomic_seed_transmitter_soak_cmd,
            probe_formal_logic_verifier_cmd,
            run_kernel_formal_logic_verifier_soak_cmd,
            probe_quantum_overlap_cmd,
            run_kernel_quantum_overlap_soak_cmd,
            probe_blue_noise_dithering_cmd,
            run_kernel_blue_noise_dithering_soak_cmd,
            probe_recursive_fractal_enhancement_cmd,
            run_kernel_recursive_fractal_enhancement_soak_cmd,
            probe_symmetric_vector_algebra_cmd,
            run_kernel_symmetric_vector_algebra_soak_cmd,
            probe_voxel_cone_radiosity_cmd,
            run_kernel_voxel_cone_radiosity_soak_cmd,
            probe_atmospheric_scattering_godrays_cmd,
            run_kernel_atmospheric_scattering_godrays_soak_cmd,
            probe_dynamic_physics_dsl_cmd,
            run_kernel_dynamic_physics_dsl_soak_cmd,
            probe_chromatic_glass_refraction_cmd,
            run_kernel_chromatic_glass_refraction_soak_cmd,
            probe_preintegrated_sss_transmittance_cmd,
            run_kernel_preintegrated_sss_transmittance_soak_cmd,
            probe_aces_cinematic_tonemapper_cmd,
            run_kernel_aces_cinematic_tonemapper_soak_cmd,
            probe_fluid_ninja_compute_cmd,
            run_kernel_fluid_ninja_compute_soak_cmd,
            probe_wgsl_surface_noise_kernel_cmd,
            run_kernel_wgsl_surface_noise_kernel_soak_cmd,
            probe_infinite_anti_aliasing_cmd,
            run_kernel_infinite_anti_aliasing_soak_cmd,
            probe_spectral_dispersion_caustics_cmd,
            run_kernel_spectral_dispersion_caustics_soak_cmd,
            probe_hybrid_cluster_shading_vsvm_cmd,
            run_kernel_hybrid_cluster_shading_vsvm_soak_cmd,
            probe_atmospheric_spine_particles_cmd,
            run_kernel_atmospheric_spine_particles_soak_cmd,
            probe_radiance_cascades_gi_cmd,
            run_kernel_radiance_cascades_gi_soak_cmd,
            probe_alexa_cinematic_optics_cmd,
            run_kernel_alexa_cinematic_optics_soak_cmd,
            probe_spectral_light_pipeline_cmd,
            run_kernel_spectral_light_pipeline_soak_cmd,
            probe_msl_wgsl_compiler_cmd,
            run_kernel_msl_wgsl_compiler_soak_cmd,
            probe_usd_importer_bridge_cmd,
            run_kernel_usd_importer_bridge_soak_cmd,
            probe_strain_aware_texturing_cmd,
            run_kernel_strain_aware_texturing_soak_cmd,
            probe_gaze_foveated_reprojection_cmd,
            run_kernel_gaze_foveated_reprojection_soak_cmd,
            probe_wgpu_wgsl_device_load_cmd,
            run_kernel_wgpu_wgsl_device_load_soak_cmd,
            probe_hdr_32bit_float_pipeline_cmd,
            run_kernel_hdr_32bit_float_pipeline_soak_cmd,
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
/ /   D o m a i n   1   g z :   P o s i t i o n - b a s e d   d y n a m i c s   r e a l   k e r n e l . 
 
 