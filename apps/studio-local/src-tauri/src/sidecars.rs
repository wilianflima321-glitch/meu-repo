use crate::contracts::{
    LocalRuntimeAssetTool, LocalRuntimeMediaTool, LocalRuntimeProbeReport,
    LocalRuntimeRendererBackend, LocalRuntimeShaderTool, LocalRuntimeToolchainFeature,
    RuntimeJobLane, RuntimeSidecarCapability, RuntimeSidecarKind,
};

fn has_toolchain_feature(
    probe: &LocalRuntimeProbeReport,
    feature: LocalRuntimeToolchainFeature,
) -> bool {
    probe.local_toolchain.contains(&feature)
}

fn sidecar_available(probe: &LocalRuntimeProbeReport, kind: RuntimeSidecarKind) -> bool {
    match kind {
        RuntimeSidecarKind::WgpuRenderer => {
            probe.supports_offscreen_render
                && probe
                    .renderer_backends
                    .contains(&LocalRuntimeRendererBackend::WgpuNative)
        }
        RuntimeSidecarKind::Ffmpeg => {
            probe.ffmpeg_available
                || has_toolchain_feature(probe, LocalRuntimeToolchainFeature::Ffmpeg)
                || probe.media_tools.contains(&LocalRuntimeMediaTool::Ffmpeg)
        }
        RuntimeSidecarKind::Ffprobe => {
            has_toolchain_feature(probe, LocalRuntimeToolchainFeature::Ffprobe)
                || probe.media_tools.contains(&LocalRuntimeMediaTool::Ffprobe)
        }
        RuntimeSidecarKind::OnnxRuntime => {
            probe.onnx_runtime_available || !probe.ai_execution_providers.is_empty()
        }
        RuntimeSidecarKind::BrowserOperator => {
            probe.browser_automation_available
                || has_toolchain_feature(probe, LocalRuntimeToolchainFeature::BrowserAutomation)
        }
        RuntimeSidecarKind::AssetOptimizer => {
            has_toolchain_feature(probe, LocalRuntimeToolchainFeature::AssetOptimizer)
                || probe
                    .asset_tools
                    .contains(&LocalRuntimeAssetTool::GltfTransform)
                || probe
                    .asset_tools
                    .contains(&LocalRuntimeAssetTool::Meshoptimizer)
        }
        RuntimeSidecarKind::ShaderCompiler => {
            has_toolchain_feature(probe, LocalRuntimeToolchainFeature::ShaderCompiler)
                || !probe.shader_tools.is_empty()
                || probe.shader_tools.contains(&LocalRuntimeShaderTool::Naga)
        }
        RuntimeSidecarKind::NativeCompiler => {
            has_toolchain_feature(probe, LocalRuntimeToolchainFeature::ZigToolchain)
                || has_toolchain_feature(probe, LocalRuntimeToolchainFeature::ZigCCompiler)
        }
        RuntimeSidecarKind::RapierPhysics => {
            probe.rapier_available
                || has_toolchain_feature(probe, LocalRuntimeToolchainFeature::Rapier)
        }
    }
}

pub fn required_sidecars_for_lane(lane: RuntimeJobLane) -> Vec<RuntimeSidecarKind> {
    match lane {
        RuntimeJobLane::AiLocalInference => vec![RuntimeSidecarKind::OnnxRuntime],
        RuntimeJobLane::MemoryIndexing => Vec::new(),
        RuntimeJobLane::AssetImport => vec![
            RuntimeSidecarKind::AssetOptimizer,
            RuntimeSidecarKind::Ffprobe,
        ],
        RuntimeJobLane::ViewportRender => vec![
            RuntimeSidecarKind::WgpuRenderer,
            RuntimeSidecarKind::ShaderCompiler,
            RuntimeSidecarKind::RapierPhysics,
        ],
        RuntimeJobLane::BuildExport => vec![
            RuntimeSidecarKind::AssetOptimizer,
            RuntimeSidecarKind::NativeCompiler,
        ],
        RuntimeJobLane::BrowserOperator => vec![RuntimeSidecarKind::BrowserOperator],
        RuntimeJobLane::FileSync => Vec::new(),
        RuntimeJobLane::Playtest => vec![
            RuntimeSidecarKind::WgpuRenderer,
            RuntimeSidecarKind::RapierPhysics,
        ],
        RuntimeJobLane::RenderQueue => {
            vec![RuntimeSidecarKind::Ffmpeg, RuntimeSidecarKind::Ffprobe]
        }
    }
}

pub fn build_sidecar_capability_manifest(
    probe: &LocalRuntimeProbeReport,
) -> Vec<RuntimeSidecarCapability> {
    [
        RuntimeSidecarKind::WgpuRenderer,
        RuntimeSidecarKind::Ffmpeg,
        RuntimeSidecarKind::Ffprobe,
        RuntimeSidecarKind::OnnxRuntime,
        RuntimeSidecarKind::BrowserOperator,
        RuntimeSidecarKind::AssetOptimizer,
        RuntimeSidecarKind::ShaderCompiler,
        RuntimeSidecarKind::NativeCompiler,
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
                format!(
                    "{} was not confirmed by the Studio Local probe.",
                    kind.label()
                )
            },
        }
    })
    .collect()
}

pub fn missing_required_sidecars(
    probe: &LocalRuntimeProbeReport,
    lane: RuntimeJobLane,
) -> Vec<RuntimeSidecarKind> {
    required_sidecars_for_lane(lane)
        .into_iter()
        .filter(|kind| !sidecar_available(probe, *kind))
        .collect()
}

pub fn sidecar_names(items: &[RuntimeSidecarKind]) -> String {
    items
        .iter()
        .map(|item| item.as_str())
        .collect::<Vec<_>>()
        .join(", ")
}
