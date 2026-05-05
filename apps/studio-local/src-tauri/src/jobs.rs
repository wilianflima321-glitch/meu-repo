use std::collections::HashMap;

use crate::contracts::{
    RuntimeExecutionDecision, RuntimeExecutionTarget, RuntimeJobLane, RuntimeJobRequest,
    RuntimeJobState, RuntimeJobStatus, STUDIO_LOCAL_CONTRACT_VERSION,
};

impl RuntimeJobRequest {
    pub fn fixture(lane: RuntimeJobLane) -> Self {
        Self {
            version: STUDIO_LOCAL_CONTRACT_VERSION,
            project_id: "project-fixture".to_string(),
            mission_id: "mission-fixture".to_string(),
            lane,
            requested_target: RuntimeExecutionTarget::LocalNative,
            title: format!("Fixture {} job", lane.as_str()),
            owner_agent: "Producer Agent".to_string(),
            allowed_paths: vec!["/**".to_string()],
            denied_paths: vec!["/.git/**".to_string()],
            evidence_required: vec!["mission-ledger".to_string(), "validation-graph".to_string()],
            rollback_plan: "Cancel job and preserve previous Mission Ledger checkpoint.".to_string(),
            max_cost_usd: 0.0,
            requires_human_approval: lane.requires_human_approval(),
        }
    }
}

#[derive(Default)]
pub struct RuntimeJobStore {
    next_id: u64,
    jobs: HashMap<String, RuntimeJobStatus>,
}

impl RuntimeJobStore {
    pub fn create(&mut self, request: RuntimeJobRequest, decision: RuntimeExecutionDecision) -> RuntimeJobStatus {
        self.next_id += 1;
        let id = format!("local-job-{}", self.next_id);
        let state = if !decision.can_start {
            RuntimeJobState::Held
        } else if decision.requires_human_approval {
            RuntimeJobState::NeedsApproval
        } else {
            RuntimeJobState::Running
        };

        let status = RuntimeJobStatus {
            version: STUDIO_LOCAL_CONTRACT_VERSION,
            id: id.clone(),
            request,
            state,
            target: decision.target,
            progress: 0,
            compact_log: vec![decision.reason.clone()],
            evidence_refs: Vec::new(),
            blocker: if decision.can_start { None } else { Some(decision.reason) },
        };

        self.jobs.insert(id, status.clone());
        status
    }

    pub fn get(&self, id: &str) -> Option<&RuntimeJobStatus> {
        self.jobs.get(id)
    }

    pub fn cancel(&mut self, id: &str) -> Option<RuntimeJobStatus> {
        let job = self.jobs.get_mut(id)?;
        job.state = RuntimeJobState::Cancelled;
        job.compact_log.push("Cancelled by user or cloud policy.".to_string());
        Some(job.clone())
    }

    pub fn list(&self) -> Vec<RuntimeJobStatus> {
        self.jobs.values().cloned().collect()
    }
}
