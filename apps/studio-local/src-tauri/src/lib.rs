pub mod contracts;
pub mod daemon;
pub mod jobs;
pub mod policy;
pub mod probe;

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    use crate::contracts::{RuntimeExecutionTarget, RuntimeJobLane, RuntimeJobState, StoragePressure, ThermalState};
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
