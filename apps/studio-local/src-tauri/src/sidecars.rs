use crate::contracts::{
    LocalRuntimeProbeReport, LocalRuntimeToolchainFeature, RuntimeJobLane,
    RuntimeSidecarCapability, RuntimeSidecarKind,
};

fn has_toolchain_feature(probe: &LocalRuntimeProbeReport, feature: LocalRuntimeToolchainFeature) -> bool {
    probe.local_toolchain.contains(&feature)
}

fn sidecar_available(probe: &LocalRuntimeProbeReport, kind: RuntimeSidecarKind) -> bool {
    match kind {
        RuntimeSidecarKind::WgpuRenderer => {
            probe.gpu_available || probe.web_gpu_available || !probe.native_graphics_backends.is_empty()
        }
        RuntimeSidecarKind::Ffmpeg => probe.ffmpeg_available || has_toolchain_feature(probe, LocalRuntimeToolchainFeature::Ffmpeg),
        RuntimeSidecarKind::Ffprobe => has_toolchain_feature(probe, LocalRuntimeToolchainFeature::Ffprobe),
        RuntimeSidecarKind::OnnxRuntime => probe.onnx_runtime_available || !probe.ai_execution_providers.is_empty(),
        RuntimeSidecarKind::BrowserOperator => {
            probe.browser_automation_available || has_toolchain_feature(probe, LocalRuntimeToolchainFeature::BrowserAutomation)
        }
        RuntimeSidecarKind::AssetOptimizer => has_toolchain_feature(probe, LocalRuntimeToolchainFeature::AssetOptimizer),
        RuntimeSidecarKind::ShaderCompiler => has_toolchain_feature(probe, LocalRuntimeToolchainFeature::ShaderCompiler),
        RuntimeSidecarKind::RapierPhysics => probe.rapier_available || has_toolchain_feature(probe, LocalRuntimeToolchainFeature::Rapier),
    }
}

pub fn required_sidecars_for_lane(lane: RuntimeJobLane) -> Vec<RuntimeSidecarKind> {
    match lane {
        RuntimeJobLane::AiLocalInference => vec![RuntimeSidecarKind::OnnxRuntime],
        RuntimeJobLane::MemoryIndexing => Vec::new(),
        RuntimeJobLane::AssetImport => vec![RuntimeSidecarKind::AssetOptimizer, RuntimeSidecarKind::Ffprobe],
        RuntimeJobLane::ViewportRender => vec![
            RuntimeSidecarKind::WgpuRenderer,
            RuntimeSidecarKind::ShaderCompiler,
            RuntimeSidecarKind::RapierPhysics,
        ],
        RuntimeJobLane::BuildExport => vec![RuntimeSidecarKind::AssetOptimizer],
        RuntimeJobLane::BrowserOperator => vec![RuntimeSidecarKind::BrowserOperator],
        RuntimeJobLane::FileSync => Vec::new(),
        RuntimeJobLane::Playtest => vec![RuntimeSidecarKind::WgpuRenderer, RuntimeSidecarKind::RapierPhysics],
        RuntimeJobLane::RenderQueue => vec![RuntimeSidecarKind::Ffmpeg, RuntimeSidecarKind::Ffprobe],
    }
}

pub fn build_sidecar_capability_manifest(probe: &LocalRuntimeProbeReport) -> Vec<RuntimeSidecarCapability> {
    [
        RuntimeSidecarKind::WgpuRenderer,
        RuntimeSidecarKind::Ffmpeg,
        RuntimeSidecarKind::Ffprobe,
        RuntimeSidecarKind::OnnxRuntime,
        RuntimeSidecarKind::BrowserOperator,
        RuntimeSidecarKind::AssetOptimizer,
        RuntimeSidecarKind::ShaderCompiler,
        RuntimeSidecarKind::RapierPhysics,
    ]
    .iter()
    .map(|kind| {
        let available = sidecar_available(probe, *kind);
        RuntimeSidecarCapability {
            kind: *kind,
            label: kind.label().to_string(),
            available,
            reason: if available {
                format!("{} is available for local execution.", kind.label())
            } else {
                format!("{} was not confirmed by the Studio Local probe.", kind.label())
            },
        }
    })
    .collect()
}

pub fn missing_required_sidecars(probe: &LocalRuntimeProbeReport, lane: RuntimeJobLane) -> Vec<RuntimeSidecarKind> {
    required_sidecars_for_lane(lane)
        .into_iter()
        .filter(|kind| !sidecar_available(probe, *kind))
        .collect()
}

pub fn sidecar_names(items: &[RuntimeSidecarKind]) -> String {
    items.iter().map(|item| item.as_str()).collect::<Vec<_>>().join(", ")
}
