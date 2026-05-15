pub mod contracts;
pub mod daemon;
pub mod jobs;
pub mod policy;
pub mod probe;
pub mod runtime_engine;
pub mod sidecars;

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use crate::contracts::{
        LocalRuntimeAssetTool, LocalRuntimeMediaTool, LocalRuntimeRendererBackend,
        LocalRuntimeShaderTool, LocalRuntimeToolchainFeature, RuntimeExecutionTarget,
        RuntimeJobLane, RuntimeJobState, StoragePressure, ThermalState,
    };
    use crate::jobs::{RuntimeJobRequest, RuntimeJobStore};
    use crate::policy::resolve_runtime_target;
    use crate::probe::build_probe_from_signals;
    use crate::runtime_engine::{build_local_wgpu_probe_contract, build_local_wgpu_render_contract};
    use crate::sidecars::{build_sidecar_capability_manifest, missing_required_sidecars};

    #[test]
    fn strong_device_routes_heavy_jobs_to_local_native() {
        let probe = build_probe_from_signals("test-device", true, true, 16_384, ThermalState::Nominal, StoragePressure::Ok);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::ViewportRender);
        assert_eq!(decision.target, RuntimeExecutionTarget::LocalNative);
        assert!(decision.can_start);
    }

    #[test]
    fn weak_device_routes_heavy_jobs_to_cloud_sandbox() {
        let probe = build_probe_from_signals("test-device", false, false, 2_048, ThermalState::Nominal, StoragePressure::Ok);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::RenderQueue);
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.can_start);
    }

    #[test]
    fn critical_thermal_state_holds_work() {
        let probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Critical, StoragePressure::Ok);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::AiLocalInference);
        assert_eq!(decision.target, RuntimeExecutionTarget::Held);
        assert!(!decision.can_start);
    }

    #[test]
    fn render_queue_without_ffmpeg_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Nominal, StoragePressure::Ok);
        probe.ffmpeg_available = false;
        probe.local_toolchain.retain(|feature| feature.as_str() != "ffmpeg");

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::RenderQueue);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.requires_human_approval);
        assert!(decision.reason.contains("FFmpeg"));
    }

    #[test]
    fn ai_local_inference_without_execution_provider_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals("test-device", false, false, 32_768, ThermalState::Nominal, StoragePressure::Ok);
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
        let mut probe = build_probe_from_signals("test-device", false, false, 32_768, ThermalState::Nominal, StoragePressure::Ok);
        probe.gpu_available = false;
        probe.web_gpu_available = false;
        probe.native_graphics_backends.clear();

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::ViewportRender);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.reason.contains("native graphics backend"));
    }

    #[test]
    fn browser_operator_without_browser_runtime_routes_to_approved_sandbox() {
        let mut probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Nominal, StoragePressure::Ok);
        probe.browser_automation_available = false;
        probe.local_toolchain.retain(|feature| feature.as_str() != "browser-automation");

        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BrowserOperator);

        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
        assert!(decision.requires_human_approval);
        assert!(decision.reason.contains("browser automation"));
    }

    #[test]
    fn sidecar_manifest_reports_renderer_and_physics_capabilities() {
        let probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Nominal, StoragePressure::Ok);
        let manifest = build_sidecar_capability_manifest(&probe);

        assert!(manifest.iter().any(|entry| entry.kind.as_str() == "wgpu-renderer" && entry.available));
        assert!(manifest.iter().any(|entry| entry.kind.as_str() == "rapier-physics" && entry.available));
    }

    #[test]
    fn local_probe_reports_runtime_engine_spine_fields() {
        let probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Nominal, StoragePressure::Ok);

        assert!(probe.supports_offscreen_render);
        assert!(probe.renderer_backends.contains(&LocalRuntimeRendererBackend::WgpuNative));
        assert!(probe.media_tools.iter().all(|tool| matches!(tool, LocalRuntimeMediaTool::Ffmpeg | LocalRuntimeMediaTool::Ffprobe)));
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
                | LocalRuntimeToolchainFeature::OzzAnimation
                | LocalRuntimeToolchainFeature::UnrealExportBridge
                | LocalRuntimeToolchainFeature::UnityExportBridge
                | LocalRuntimeToolchainFeature::GodotExportBridge
        )));
    }

    #[test]
    fn viewport_render_without_offscreen_support_routes_to_cloud_sandbox() {
        let mut probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Nominal, StoragePressure::Ok);
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
        assert_eq!(render_contract.idempotency_key, "project-native-render:render-final-a:2026-05-14T14:00:00.000Z");
        assert!(render_contract.accepted_targets.contains(&"local-native".to_string()));
        assert_eq!(render_contract.browser_role, "preview-only");
        assert!(render_contract.require_offscreen_render);
        assert!(render_contract.require_performance_report_artifact);
        assert!(render_contract.require_validation_report_artifact);
        assert!(render_contract.never_auto_release);
        assert_eq!(render_contract.max_render_time_ms, 60_000);
    }

    #[test]
    fn playtest_missing_renderer_sidecar_falls_back_to_cloud() {
        let mut probe = build_probe_from_signals("test-device", false, false, 32_768, ThermalState::Nominal, StoragePressure::Ok);
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
        let mut probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Nominal, StoragePressure::Ok);
        probe.local_toolchain.clear();
        probe.asset_tools.clear();
        probe.media_tools.clear();

        let missing = missing_required_sidecars(&probe, RuntimeJobLane::AssetImport);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::AssetImport);

        assert!(missing.iter().any(|kind| kind.as_str() == "asset-optimizer"));
        assert!(missing.iter().any(|kind| kind.as_str() == "ffprobe"));
        assert_eq!(decision.target, RuntimeExecutionTarget::CloudSandbox);
    }

    #[test]
    fn held_job_is_stored_with_blocker() {
        let probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Critical, StoragePressure::Ok);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BrowserOperator);
        let mut store = RuntimeJobStore::default();
        let status = store.create(RuntimeJobRequest::fixture(RuntimeJobLane::BrowserOperator), decision);
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
            let probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Nominal, StoragePressure::Ok);
            let decision = resolve_runtime_target(&probe, RuntimeJobLane::MemoryIndexing);
            let mut store = RuntimeJobStore::from_persistence_path(&path).expect("create persistent job store");
            let status = store.create(RuntimeJobRequest::fixture(RuntimeJobLane::MemoryIndexing), decision);
            assert_eq!(status.state, RuntimeJobState::Running);
            assert!(path.exists());
            status.id
        };

        let recovered = RuntimeJobStore::from_persistence_path(&path).expect("recover persistent job store");
        let status = recovered.get(&job_id).expect("recovered job exists");
        assert_eq!(status.state, RuntimeJobState::Held);
        assert!(status.blocker.as_deref().unwrap_or_default().contains("Recovered after Studio Local restart"));
        assert!(status.compact_log.iter().any(|line| line.contains("Recovered after Studio Local restart")));
        assert!(recovered.last_persistence_error().is_none());

        let _ = fs::remove_file(path);
    }

    #[test]
    fn persisted_cancelled_jobs_stay_cancelled_after_restart() {
        let path = temp_snapshot_path("recover-cancelled");
        let job_id = {
            let probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Nominal, StoragePressure::Ok);
            let decision = resolve_runtime_target(&probe, RuntimeJobLane::MemoryIndexing);
            let mut store = RuntimeJobStore::from_persistence_path(&path).expect("create persistent job store");
            let status = store.create(RuntimeJobRequest::fixture(RuntimeJobLane::MemoryIndexing), decision);
            store.cancel(&status.id).expect("cancel job");
            status.id
        };

        let recovered = RuntimeJobStore::from_persistence_path(&path).expect("recover persistent job store");
        let status = recovered.get(&job_id).expect("recovered job exists");
        assert_eq!(status.state, RuntimeJobState::Cancelled);
        assert!(!status.compact_log.iter().any(|line| line.contains("Recovered after Studio Local restart")));

        let _ = fs::remove_file(path);
    }

}
