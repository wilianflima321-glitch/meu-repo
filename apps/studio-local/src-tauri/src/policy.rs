use crate::contracts::{
    LocalRuntimeProbeReport, RuntimeExecutionDecision, RuntimeExecutionTarget, RuntimeJobLane,
    StoragePressure, ThermalState,
};

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
            reason: "Native acceleration is available; route heavy work to Studio Local native runtime.".to_string(),
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
