pub mod ambient_sensor_kernel;
pub mod auto_retopology_worker;
pub mod contracts;
pub mod daemon;
/// Unified SoA from `aethel-kernel-rust` (letter dc).
pub mod ecs_core;
pub mod ecs_parallel;
pub mod gameplay_ability_system;
pub mod geometry_clusterizer;
pub mod gi_sdf;
pub mod jobs;
/// Kernel foundation IPC (letter dc surface; letter do web bridge).
/// WorldSoA + LBM desktop soak wire (letter de).
/// MutDNA + FrameArena desktop soak wire (letter df).
/// Timescale + Beer–Lambert + sonic desktop soak wire (letter dg).
/// WorldSoA SAB layout header wire (letter dh).
pub mod kernel_world_soa_sab_wire;
/// mmap ECS pager wire (letter di).
pub mod kernel_mmap_ecs_pager_wire;
/// SIMD clay math wire (letter dj).
pub mod kernel_simd_clay_math_wire;
/// SIMD → WorldSoA hot-path wire (letter dk).
/// BareMetalMemoryManager wire (letter dl).
pub mod kernel_baremetal_memory_manager_wire;
/// Slab allocator mmap wire (letter dm).
pub mod kernel_slab_allocator_mmap_wire;
/// Unified Field Network wire (letter dq).
pub mod kernel_unified_field_network_wire;
/// Autonomous Entropy Corrector wire (letter dr).
pub mod kernel_autonomous_entropy_corrector_wire;
/// Fractal Energy Perturbation wire (letter ds).
pub mod kernel_fractal_energy_perturbation_wire;
/// Non-Euclidean Curved Raymarcher wire (letter dt).
pub mod kernel_curved_raymarcher_wire;
/// Shadow Kernel Time Reversal wire (letter du).
pub mod kernel_shadow_time_reversal_wire;
/// Four-Dimensional Time SDF wire (letter dv).
pub mod kernel_four_dimensional_time_sdf_wire;
/// Mnemonic Matter Entropy wire (letter dw).
pub mod kernel_mnemonic_matter_entropy_wire;
/// Synesthetic Sensory Remap wire (letter dx).
pub mod kernel_synesthetic_sensory_remap_wire;
/// Autonomous Conflict Generator wire (letter dy).
pub mod kernel_autonomous_conflict_generator_wire;
/// Atmospheric Physical Damping wire (letter dz).
pub mod kernel_atmospheric_physical_damping_wire;
/// Position-Based Dynamics wire (letter ea).
pub mod kernel_position_based_dynamics_wire;
/// Hybrid Eulerian–Lagrangian PBD wire (letter eb).
pub mod kernel_hybrid_eulerian_lagrangian_pbd_wire;
/// Matter Thermodynamics SPH wire (letter ec).
pub mod kernel_matter_thermodynamics_sph_wire;
/// Aerodynamic Navier–Stokes wire (letter gv).
pub mod kernel_aerodynamic_navier_stokes_wire;
/// Lattice-Boltzmann fluid solver wire (letter ee).
pub mod kernel_lattice_boltzmann_gas_fluid_wire;
/// Acoustic Raytracing Echo wire (letter ef).
pub mod kernel_acoustic_raytracing_echo_wire;
/// Finite Element Analysis wire (letter eh).
pub mod kernel_finite_element_analysis_wire;
/// Acoustic Reverb Geometry wire (letter ei).
pub mod kernel_acoustic_reverb_geometry_wire;
/// FM / Additive Synthesis wire (letter ej).
pub mod kernel_fm_additive_synthesis_wire;
/// Hermite Duality Grid wire (letter ek).
pub mod kernel_hermite_duality_grid_wire;
/// Hermite Sharp Features wire (letter el).
pub mod kernel_hermite_sharp_features_wire;
/// SDF Sculptor wire (letter em).
pub mod kernel_sdf_sculptor_wire;
/// SDF Adaptive Cascades wire (letter en).
pub mod kernel_sdf_adaptive_cascades_wire;
/// Stochastic Virtual SDF wire (letter eo).
pub mod kernel_stochastic_virtual_sdf_wire;
/// SDF Octree Hashing wire (letter ep).
pub mod kernel_sdf_octree_hashing_wire;
/// SDF Motion Vector Buffer wire (letter eq).
pub mod kernel_sdf_motion_vector_buffer_wire;
/// Velocity Buffer ECS wire (letter er).
pub mod kernel_velocity_buffer_ecs_wire;
/// Hybrid Geometry SVO wire (letter es).
pub mod kernel_hybrid_geometry_svo_wire;
/// SVO Depth LOD wire (letter et).
pub mod kernel_svo_depth_lod_wire;
/// Internal Voxel Density wire (letter eu).
pub mod kernel_internal_voxel_density_wire;
/// Micro Displacement Noise wire (letter ev).
pub mod kernel_micro_displacement_noise_wire;
/// Volumetric Extinction Medium wire (letter ew).
pub mod kernel_volumetric_extinction_medium_wire;
/// SDF Audio Raymarching wire (letter ex).
pub mod kernel_sdf_audio_raymarching_wire;
/// Contextual Physics Override wire (letter ey).
pub mod kernel_contextual_physics_override_wire;
/// Dynamic Matter Entropy wire (letter ez).
pub mod kernel_dynamic_matter_entropy_wire;
/// Digital Pressure Chamber wire (letter fa).
pub mod kernel_digital_pressure_chamber_wire;
/// Geometric Scale Constraints wire (letter fb).
pub mod kernel_geometric_scale_constraints_wire;
/// Universal Logarithmic Scale wire (letter fc).
pub mod kernel_universal_logarithmic_scale_wire;
/// Sparse Seed Instancing wire (letter fd).
pub mod kernel_sparse_seed_instancing_wire;
/// Lock-free Ring Buffer wire (letter fe).
pub mod kernel_lockfree_ring_buffer_wire;
/// Atomic Thread Sync wire (letter ff).
pub mod kernel_atomic_thread_sync_wire;
/// CRDT Quantum Sync wire (letter fg).
pub mod kernel_crdt_quantum_sync_wire;
/// Delta Seed Synchronization wire (letter fh).
pub mod kernel_delta_seed_synchronization_wire;
/// State Sync Protocol wire (letter fi).
pub mod kernel_state_sync_protocol_wire;
/// Bitstream Reality Sync wire (letter fj).
pub mod kernel_bitstream_reality_sync_wire;
/// Binary Seed Streamer wire (letter fk).
pub mod kernel_binary_seed_streamer_wire;
pub mod kernel_cpu_affinity_micro_workers_wire;
/// Asynchronous Reality Threads wire (letter fm).
pub mod kernel_asynchronous_reality_threads_wire;
/// Thermal Scheduler wire (letter fn).
pub mod kernel_thermal_scheduler_wire;
/// Live Cache Manager wire (letter fo).
pub mod kernel_live_cache_manager_wire;
/// Hierarchical Streaming Cache wire (letter fp).
pub mod kernel_hierarchical_streaming_cache_wire;
/// Metabolic Memory wire (letter fq).
pub mod kernel_metabolic_memory_wire;
pub mod kernel_ghost_state_predictor_wire;
pub mod kernel_reversible_quantum_undo_wire;
/// Genomic Seed Library wire (letter ft).
pub mod kernel_genomic_seed_library_wire;
/// Genomic Seed Transmitter wire (letter fu).
pub mod kernel_genomic_seed_transmitter_wire;
/// Formal Logic Verifier wire (letter fv).
pub mod kernel_formal_logic_verifier_wire;
pub mod kernel_quantum_overlap_wire;
/// Blue Noise Dithering Relaxer wire (letter fx).
pub mod kernel_blue_noise_dithering_wire;
pub mod kernel_recursive_fractal_enhancement_wire;
/// Symmetric Vector Algebra wire (letter fz).
pub mod kernel_symmetric_vector_algebra_wire;
/// Voxel Cone Radiosity wire (letter ga).
pub mod kernel_voxel_cone_radiosity_wire;
/// Atmospheric Scattering Godrays wire (letter gb).
pub mod kernel_atmospheric_scattering_godrays_wire;
/// Dynamic Physics DSL wire (letter gc).
pub mod kernel_dynamic_physics_dsl_wire;
/// Chromatic Glass Refraction wire (letter gd).
pub mod kernel_chromatic_glass_refraction_wire;
/// Preintegrated SSS Transmittance wire (letter ge).
pub mod kernel_preintegrated_sss_transmittance_wire;
/// ACES Cinematic Tonemapper wire (letter gf).
pub mod kernel_aces_cinematic_tonemapper_wire;
/// Fluid Ninja Compute wire (letter gg).
pub mod kernel_fluid_ninja_compute_wire;
/// WGSL Surface Noise Kernel wire (letter gh).
pub mod kernel_wgsl_surface_noise_kernel_wire;
/// Infinite Anti-Aliasing wire (letter gi).
pub mod kernel_infinite_anti_aliasing_wire;
/// Spectral Dispersion Caustics wire (letter gj).
pub mod kernel_spectral_dispersion_caustics_wire;
/// Hybrid Cluster Shading VSVM wire (letter gk).
pub mod kernel_hybrid_cluster_shading_vsvm_wire;
/// Atmospheric Spine Particles wire (letter gl).
pub mod kernel_atmospheric_spine_particles_wire;
/// Radiance Cascades GI wire (letter gm).
pub mod kernel_radiance_cascades_gi_wire;
/// Alexa Cinematic Optics wire (letter gn).
pub mod kernel_alexa_cinematic_optics_wire;
/// Spectral Light Pipeline wire (letter go).
pub mod kernel_spectral_light_pipeline_wire;
/// MSL → WGSL compiler wire (letter gp).
pub mod kernel_msl_wgsl_compiler_wire;
/// USD Importer Bridge wire (letter gq).
pub mod kernel_usd_importer_bridge_wire;
/// HDR 32-bit float pipeline wire (letter gr).
pub mod kernel_hdr_32bit_float_pipeline_wire;
/// Strain-Aware Texturing wire (letter gs).
pub mod kernel_strain_aware_texturing_wire;
/// Gaze-Foveated Reprojection wire (letter gt).
pub mod kernel_gaze_foveated_reprojection_wire;
/// wgpu WGSL device load wire (letter gu) — gp emit → create_shader_module.
pub mod kernel_wgpu_wgsl_device_load_wire;
/// SVO Terrain World Partition desktop wire (letter ip4) — camera-driven
/// identity-based hydrate/evict streaming, stateful per-frame tick command.
pub mod kernel_svo_terrain_world_partition_wire;
pub mod kernel_skeletal_rig_ragdoll_xpbd_wire;
pub mod kernel_voronoi_destruction_3d_wire;
pub mod kernel_micro_poly_cull_wire;
pub mod native_kernel;
pub mod onnx_native_gen;
pub mod physics_kernel;
pub mod policy;
pub mod probe;
pub mod runtime_engine;
pub mod sidecars;

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use crate::contracts::RuntimeJobRequest;
    use crate::contracts::{
        LocalRuntimeAssetTool, LocalRuntimeMediaTool, LocalRuntimeRendererBackend,
        LocalRuntimeShaderTool, LocalRuntimeToolchainFeature, RuntimeExecutionTarget,
        RuntimeJobLane, RuntimeJobState, StoragePressure, ThermalState,
    };
    use crate::jobs::RuntimeJobStore;
    use crate::native_kernel::{
        build_native_kernel_manifest, validate_native_kernel_manifest, NativeKernelState,
        AVAILABLE_CAPABILITY_IDS,
    };
    use crate::policy::resolve_runtime_target;
    use crate::probe::build_probe_from_signals;
    use crate::runtime_engine::{
        build_local_wgpu_probe_contract, build_local_wgpu_render_contract,
    };
    use crate::sidecars::{build_sidecar_capability_manifest, missing_required_sidecars};

    #[test]
    fn strong_device_routes_heavy_jobs_to_local_native() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            16_384,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::ViewportRender);
        assert_eq!(decision.target, RuntimeExecutionTarget::LocalNative);
        assert!(decision.can_start);
    }

    #[test]
    fn weak_device_routes_heavy_jobs_to_cloud_sandbox() {
        let probe = build_probe_from_signals(
            "test-device",
            false,
            false,
            2_048,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::RenderQueue);
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.can_start);
    }

    #[test]
    fn critical_thermal_state_holds_work() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Critical,
            StoragePressure::Ok,
        );
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::AiLocalInference);
        assert_eq!(decision.target, RuntimeExecutionTarget::Held);
        assert!(!decision.can_start);
    }

    #[test]
    fn render_queue_without_ffmpeg_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.ffmpeg_available = false;
        probe
            .local_toolchain
            .retain(|feature| feature.as_str() != "ffmpeg");

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::RenderQueue);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.requires_human_approval);
        assert!(decision.reason.contains("FFmpeg"));
    }

    #[test]
    fn ai_local_inference_without_execution_provider_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            false,
            false,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.onnx_runtime_available = false;
        probe.direct_ml_available = false;
        probe.web_nn_available = false;
        probe.ai_execution_providers.clear();

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::AiLocalInference);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("AI execution provider"));
    }

    #[test]
    fn viewport_render_without_native_graphics_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            false,
            false,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.gpu_available = false;
        probe.web_gpu_available = false;
        probe.native_graphics_backends.clear();

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::ViewportRender);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("native graphics backend"));
    }

    #[test]
    fn browser_operator_without_browser_runtime_routes_to_approved_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.browser_automation_available = false;
        probe
            .local_toolchain
            .retain(|feature| feature.as_str() != "browser-automation");

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BrowserOperator);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.requires_human_approval);
        assert!(decision.reason.contains("browser automation"));
    }

    #[test]
    fn sidecar_manifest_reports_renderer_and_physics_capabilities() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        let manifest = build_sidecar_capability_manifest(&probe);

        assert!(manifest
            .iter()
            .any(|entry| entry.kind.as_str() == "wgpu-renderer" && entry.available));
        assert!(manifest
            .iter()
            .any(|entry| entry.kind.as_str() == "rapier-physics" && entry.available));
    }

    #[test]
    fn local_probe_reports_runtime_engine_spine_fields() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );

        assert!(probe.supports_offscreen_render);
        assert!(probe
            .renderer_backends
            .contains(&LocalRuntimeRendererBackend::WgpuNative));
        assert!(probe.media_tools.iter().all(|tool| matches!(
            tool,
            LocalRuntimeMediaTool::Ffmpeg | LocalRuntimeMediaTool::Ffprobe
        )));
        assert!(probe.asset_tools.iter().all(|tool| matches!(
            tool,
            LocalRuntimeAssetTool::GltfTransform
                | LocalRuntimeAssetTool::Meshoptimizer
                | LocalRuntimeAssetTool::KtxSoftware
                | LocalRuntimeAssetTool::Basisu
                | LocalRuntimeAssetTool::OpenUsd
                | LocalRuntimeAssetTool::BlenderHeadless
                | LocalRuntimeAssetTool::RecastDetour
                | LocalRuntimeAssetTool::OzzAnimation
                | LocalRuntimeAssetTool::UnrealExportBridge
                | LocalRuntimeAssetTool::UnityExportBridge
                | LocalRuntimeAssetTool::GodotExportBridge
        )));
        assert!(probe.shader_tools.iter().all(|tool| matches!(
            tool,
            LocalRuntimeShaderTool::Naga
                | LocalRuntimeShaderTool::WgslValidator
                | LocalRuntimeShaderTool::Shaderc
                | LocalRuntimeShaderTool::Dxc
        )));
        assert!(probe.local_toolchain.iter().all(|tool| matches!(
            tool,
            LocalRuntimeToolchainFeature::Ffmpeg
                | LocalRuntimeToolchainFeature::Ffprobe
                | LocalRuntimeToolchainFeature::Rapier
                | LocalRuntimeToolchainFeature::BrowserAutomation
                | LocalRuntimeToolchainFeature::AssetOptimizer
                | LocalRuntimeToolchainFeature::ShaderCompiler
                | LocalRuntimeToolchainFeature::Meshoptimizer
                | LocalRuntimeToolchainFeature::KtxSoftware
                | LocalRuntimeToolchainFeature::Basisu
                | LocalRuntimeToolchainFeature::OpenUsd
                | LocalRuntimeToolchainFeature::BlenderHeadless
                | LocalRuntimeToolchainFeature::WgpuNative
                | LocalRuntimeToolchainFeature::RecastDetour
                | LocalRuntimeToolchainFeature::ZigToolchain
                | LocalRuntimeToolchainFeature::ZigCCompiler
                | LocalRuntimeToolchainFeature::OzzAnimation
                | LocalRuntimeToolchainFeature::UnrealExportBridge
                | LocalRuntimeToolchainFeature::UnityExportBridge
                | LocalRuntimeToolchainFeature::GodotExportBridge
        )));
    }

    #[test]
    fn viewport_render_without_offscreen_support_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.supports_offscreen_render = false;
        probe.renderer_backends.clear();

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::ViewportRender);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("native graphics backend"));
    }

    #[test]
    fn local_wgpu_contracts_are_bounded_and_evidence_first() {
        let probe_contract = build_local_wgpu_probe_contract();
        assert_eq!(probe_contract.kind, "aethel.wgpu.probe");
        assert!(probe_contract.no_downloads);
        assert!(probe_contract.no_main_thread);
        assert!(probe_contract.manual_consent_only);
        assert!(probe_contract.benchmark_max_duration_ms <= 750);

        let render_contract = build_local_wgpu_render_contract(
            "project-native-render",
            "render-final-a",
            "2026-05-14T14:00:00.000Z",
            60,
        );
        assert_eq!(render_contract.kind, "aethel.wgpu.render");
        assert_eq!(
            render_contract.idempotency_key,
            "project-native-render:render-final-a:2026-05-14T14:00:00.000Z"
        );
        assert!(render_contract
            .accepted_targets
            .contains(&"local-native".to_string()));
        assert_eq!(render_contract.browser_role, "preview-only");
        assert!(render_contract.require_offscreen_render);
        assert!(render_contract.require_performance_report_artifact);
        assert!(render_contract.require_validation_report_artifact);
        assert!(render_contract.never_auto_release);
        assert_eq!(render_contract.max_render_time_ms, 60_000);
    }

    #[test]
    fn playtest_missing_renderer_sidecar_falls_back_to_cloud() {
        let mut probe = build_probe_from_signals(
            "test-device",
            false,
            false,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.gpu_available = false;
        probe.web_gpu_available = false;
        probe.native_graphics_backends.clear();

        let missing = missing_required_sidecars(&probe, RuntimeJobLane::Playtest);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::Playtest);

        assert!(missing.iter().any(|kind| kind.as_str() == "wgpu-renderer"));
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("sidecars"));
    }

    #[test]
    fn asset_import_requires_optimizer_and_media_probe_sidecars() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.local_toolchain.clear();
        probe.asset_tools.clear();
        probe.media_tools.clear();

        let missing = missing_required_sidecars(&probe, RuntimeJobLane::AssetImport);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::AssetImport);

        assert!(missing
            .iter()
            .any(|kind| kind.as_str() == "asset-optimizer"));
        assert!(missing.iter().any(|kind| kind.as_str() == "ffprobe"));
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
    }

    #[test]
    fn build_export_requires_native_compiler_sidecar() {
        let mut probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Nominal,
            StoragePressure::Ok,
        );
        probe.local_toolchain.retain(|feature| {
            !matches!(
                feature,
                LocalRuntimeToolchainFeature::ZigToolchain
                    | LocalRuntimeToolchainFeature::ZigCCompiler
            )
        });

        let missing = missing_required_sidecars(&probe, RuntimeJobLane::BuildExport);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BuildExport);

        assert!(missing
            .iter()
            .any(|kind| kind.as_str() == "native-compiler"));
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("native-compiler"));
    }

    #[test]
    fn native_kernel_manifest_blocks_unproven_native_claims() {
        let manifest = build_native_kernel_manifest();
        assert_eq!(
            validate_native_kernel_manifest(&manifest),
            Vec::<String>::new()
        );
        assert!(manifest
            .capabilities
            .iter()
            .all(|capability| {
                capability.state != NativeKernelState::Available
                    || AVAILABLE_CAPABILITY_IDS.contains(&capability.id)
            }));
        assert!(manifest
            .prohibited_claims
            .contains(&"signed installer ready"));
        assert!(manifest.crash_state.requires_user_review);
    }

    #[test]
    fn held_job_is_stored_with_blocker() {
        let probe = build_probe_from_signals(
            "test-device",
            true,
            true,
            32_768,
            ThermalState::Critical,
            StoragePressure::Ok,
        );
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BrowserOperator);
        let mut store = RuntimeJobStore::default();
        let status = store.create(
            RuntimeJobRequest::fixture(RuntimeJobLane::BrowserOperator),
            decision,
        );
        assert_eq!(status.target, RuntimeExecutionTarget::Held);
        assert!(status.blocker.is_some());
    }

    fn temp_snapshot_path(test_name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        std::env::temp_dir().join(format!("aethel-studio-local-{test_name}-{nonce}.json"))
    }

    #[test]
    fn persisted_running_jobs_recover_as_held_after_restart() {
        let path = temp_snapshot_path("recover-running");
        let job_id = {
            let probe = build_probe_from_signals(
                "test-device",
                true,
                true,
                32_768,
                ThermalState::Nominal,
                StoragePressure::Ok,
            );
            let decision = resolve_runtime_target(&probe, RuntimeJobLane::MemoryIndexing);
            let mut store =
                RuntimeJobStore::from_persistence_path(&path).expect("create persistent job store");
            let status = store.create(
                RuntimeJobRequest::fixture(RuntimeJobLane::MemoryIndexing),
                decision,
            );
            assert_eq!(status.state, RuntimeJobState::Running);
            assert!(path.exists());
            status.id
        };

        let recovered =
            RuntimeJobStore::from_persistence_path(&path).expect("recover persistent job store");
        let status = recovered.get(&job_id).expect("recovered job exists");
        assert_eq!(status.state, RuntimeJobState::Held);
        assert!(status
            .blocker
            .as_deref()
            .unwrap_or_default()
            .contains("Recovered after Studio Local restart"));
        assert!(status
            .compact_log
            .iter()
            .any(|line| line.contains("Recovered after Studio Local restart")));
        assert!(recovered.last_persistence_error().is_none());

        let _ = fs::remove_file(path);
    }

    #[test]
    fn persisted_cancelled_jobs_stay_cancelled_after_restart() {
        let path = temp_snapshot_path("recover-cancelled");
        let job_id = {
            let probe = build_probe_from_signals(
                "test-device",
                true,
                true,
                32_768,
                ThermalState::Nominal,
                StoragePressure::Ok,
            );
            let decision = resolve_runtime_target(&probe, RuntimeJobLane::MemoryIndexing);
            let mut store =
                RuntimeJobStore::from_persistence_path(&path).expect("create persistent job store");
            let status = store.create(
                RuntimeJobRequest::fixture(RuntimeJobLane::MemoryIndexing),
                decision,
            );
            store.cancel(&status.id).expect("cancel job");
            status.id
        };

        let recovered =
            RuntimeJobStore::from_persistence_path(&path).expect("recover persistent job store");
        let status = recovered.get(&job_id).expect("recovered job exists");
        assert_eq!(status.state, RuntimeJobState::Cancelled);
        assert!(!status
            .compact_log
            .iter()
            .any(|line| line.contains("Recovered after Studio Local restart")));

        let _ = fs::remove_file(path);
    }
}

// Domain 1 gz: Position-based dynamics real kernel.
