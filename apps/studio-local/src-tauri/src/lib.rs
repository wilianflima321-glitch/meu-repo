pub mod contracts;
pub mod daemon;
pub mod jobs;
pub mod policy;
pub mod probe;

#[cfg(test)]
mod tests {
    use crate::contracts::{RuntimeExecutionTarget, RuntimeJobLane, StoragePressure, ThermalState};
    use crate::jobs::{RuntimeJobRequest, RuntimeJobStore};
    use crate::policy::resolve_runtime_target;
    use crate::probe::build_probe_from_signals;

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
    fn held_job_is_stored_with_blocker() {
        let probe = build_probe_from_signals("test-device", true, true, 32_768, ThermalState::Critical, StoragePressure::Ok);
        let decision = resolve_runtime_target(&probe, RuntimeJobLane::BrowserOperator);
        let mut store = RuntimeJobStore::default();
        let status = store.create(RuntimeJobRequest::fixture(RuntimeJobLane::BrowserOperator), decision);
        assert_eq!(status.target, RuntimeExecutionTarget::Held);
        assert!(status.blocker.is_some());
    }
}
