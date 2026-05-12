use crate::contracts::{
    LocalRuntimeProbeReport, RuntimeExecutionDecision, RuntimeExecutionTarget, RuntimeJobLane,
    StoragePressure, ThermalState,
};
use crate::sidecars::{missing_required_sidecars, sidecar_names};

fn has_native_graphics(probe: &LocalRuntimeProbeReport) -> bool {
    probe.gpu_available || probe.web_gpu_available || !probe.native_graphics_backends.is_empty()
}

fn has_ai_execution_provider(probe: &LocalRuntimeProbeReport) -> bool {
    probe.onnx_runtime_available || probe.direct_ml_available || probe.web_nn_available || !probe.ai_execution_providers.is_empty()
}

pub fn resolve_runtime_target(
    probe: &LocalRuntimeProbeReport,
    lane: RuntimeJobLane,
) -> RuntimeExecutionDecision {
    if probe.thermal_state == ThermalState::Critical || probe.storage_pressure == StoragePressure::Critical {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::Held,
            can_start: false,
            requires_human_approval: lane.requires_human_approval(),
            reason: "Device is in a critical thermal or storage state; heavy work is held to protect the user session.".to_string(),
        };
    }

    if lane == RuntimeJobLane::AiLocalInference && !has_ai_execution_provider(probe) {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::CloudSandbox,
            can_start: true,
            requires_human_approval: lane.requires_human_approval(),
            reason: "No local ONNX, DirectML, CoreML, CUDA, WebNN, or equivalent AI execution provider was confirmed; route inference to cloud sandbox.".to_string(),
        };
    }

    if lane == RuntimeJobLane::ViewportRender && !has_native_graphics(probe) {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::CloudSandbox,
            can_start: true,
            requires_human_approval: lane.requires_human_approval(),
            reason: "No native graphics backend was confirmed for viewport rendering; route heavy viewport work away from the device.".to_string(),
        };
    }

    if lane == RuntimeJobLane::RenderQueue && !probe.ffmpeg_available {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::CloudSandbox,
            can_start: true,
            requires_human_approval: lane.requires_human_approval(),
            reason: "FFmpeg was not confirmed locally; route render queue encoding to cloud sandbox with evidence.".to_string(),
        };
    }

    if lane == RuntimeJobLane::BrowserOperator && !probe.browser_automation_available {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::CloudSandbox,
            can_start: true,
            requires_human_approval: true,
            reason: "No local browser automation runtime was confirmed; route browser operator work to an approved sandbox.".to_string(),
        };
    }

    let missing_sidecars = missing_required_sidecars(probe, lane);
    if !missing_sidecars.is_empty()
        && matches!(
            lane,
            RuntimeJobLane::AssetImport | RuntimeJobLane::BuildExport | RuntimeJobLane::Playtest
        )
    {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::CloudSandbox,
            can_start: true,
            requires_human_approval: lane.requires_human_approval(),
            reason: format!(
                "Missing required local sidecars for {}: {}; route work to cloud sandbox with evidence.",
                lane.as_str(),
                sidecar_names(&missing_sidecars)
            ),
        };
    }

    if lane == RuntimeJobLane::FileSync {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::LocalWorker,
            can_start: true,
            requires_human_approval: false,
            reason: "File sync can run in a local worker lane.".to_string(),
        };
    }

    if lane.is_heavy() && (probe.npu_available || probe.gpu_available) && probe.preferred_executor == RuntimeExecutionTarget::LocalNative {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::LocalNative,
            can_start: true,
            requires_human_approval: lane.requires_human_approval(),
            reason: "Native acceleration and required lane toolchain are available; route heavy work to Studio Local native runtime.".to_string(),
        };
    }

    if lane.is_heavy() && probe.available_memory_mb.unwrap_or(0) < 4_096 {
        return RuntimeExecutionDecision {
            lane,
            target: RuntimeExecutionTarget::CloudSandbox,
            can_start: true,
            requires_human_approval: lane.requires_human_approval(),
            reason: "Device memory is constrained; isolate heavy work in cloud sandbox.".to_string(),
        };
    }

    RuntimeExecutionDecision {
        lane,
        target: RuntimeExecutionTarget::LocalWorker,
        can_start: true,
        requires_human_approval: lane.requires_human_approval(),
        reason: "No native accelerator was confirmed; route work to local worker lane when safe.".to_string(),
    }
}
