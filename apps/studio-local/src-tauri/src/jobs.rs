use std::collections::HashMap;
use std::fs;
use std::io;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

use serde::{Deserialize, Serialize};

use crate::contracts::{
    RuntimeExecutionDecision, RuntimeExecutionTarget, RuntimeJobLane, RuntimeJobRequest,
    RuntimeJobState, RuntimeJobStatus, STUDIO_LOCAL_CONTRACT_VERSION,
};

const RECOVERED_JOB_BLOCKER: &str =
    "Recovered after Studio Local restart. Awaiting user or cloud confirmation before resuming.";

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
            rollback_plan: "Cancel job and preserve previous Mission Ledger checkpoint."
                .to_string(),
            max_cost_usd: 0.0,
            requires_human_approval: lane.requires_human_approval(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct RuntimeJobStoreSnapshot {
    version: u8,
    next_id: u64,
    jobs: Vec<RuntimeJobStatus>,
}

pub struct RuntimeJobStore {
    next_id: u64,
    jobs: HashMap<String, RuntimeJobStatus>,
    persistence_path: Option<PathBuf>,
    last_persistence_error: Option<String>,
}

impl Default for RuntimeJobStore {
    fn default() -> Self {
        Self {
            next_id: 0,
            jobs: HashMap::new(),
            persistence_path: None,
            last_persistence_error: None,
        }
    }
}

impl RuntimeJobStore {
    pub fn from_persistence_path(path: impl Into<PathBuf>) -> io::Result<Self> {
        let mut store = Self {
            persistence_path: Some(path.into()),
            ..Self::default()
        };
        store.recover_from_disk()?;
        Ok(store)
    }

    pub fn create(
        &mut self,
        request: RuntimeJobRequest,
        decision: RuntimeExecutionDecision,
    ) -> RuntimeJobStatus {
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
            blocker: if decision.can_start {
                None
            } else {
                Some(decision.reason)
            },
            created_at_unix_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|duration| duration.as_millis())
                .unwrap_or(0),
        };

        self.jobs.insert(id, status.clone());
        self.persist_or_record();
        status
    }

    pub fn get(&self, id: &str) -> Option<&RuntimeJobStatus> {
        self.jobs.get(id)
    }

    pub fn cancel(&mut self, id: &str) -> Option<RuntimeJobStatus> {
        let updated = {
            let job = self.jobs.get_mut(id)?;
            job.state = RuntimeJobState::Cancelled;
            job.compact_log
                .push("Cancelled by user or cloud policy.".to_string());
            job.clone()
        };
        self.persist_or_record();
        Some(updated)
    }

    pub fn list(&self) -> Vec<RuntimeJobStatus> {
        let mut jobs = self.jobs.values().cloned().collect::<Vec<_>>();
        jobs.sort_by(|left, right| left.id.cmp(&right.id));
        jobs
    }

    pub fn last_persistence_error(&self) -> Option<&str> {
        self.last_persistence_error.as_deref()
    }

    pub fn recover_from_disk(&mut self) -> io::Result<()> {
        let Some(path) = self.persistence_path.clone() else {
            return Ok(());
        };

        if !path.exists() {
            return Ok(());
        }

        let contents = fs::read_to_string(&path)?;
        if contents.trim().is_empty() {
            return Ok(());
        }

        let snapshot =
            serde_json::from_str::<RuntimeJobStoreSnapshot>(&contents).map_err(|error| {
                io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!("invalid Studio Local job snapshot: {error}"),
                )
            })?;

        self.next_id = snapshot.next_id;
        self.jobs.clear();
        for mut job in snapshot.jobs {
            self.next_id = self.next_id.max(job_sequence_number(&job.id).unwrap_or(0));
            recover_interrupted_job(&mut job);
            self.jobs.insert(job.id.clone(), job);
        }

        self.persist_snapshot()?;
        self.last_persistence_error = None;
        Ok(())
    }

    fn persist_or_record(&mut self) {
        match self.persist_snapshot() {
            Ok(()) => self.last_persistence_error = None,
            Err(error) => self.last_persistence_error = Some(error.to_string()),
        }
    }

    fn persist_snapshot(&self) -> io::Result<()> {
        let Some(path) = self.persistence_path.as_deref() else {
            return Ok(());
        };

        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }

        let snapshot = RuntimeJobStoreSnapshot {
            version: STUDIO_LOCAL_CONTRACT_VERSION,
            next_id: self.next_id,
            jobs: self.list(),
        };
        let serialized = serde_json::to_string_pretty(&snapshot).map_err(|error| {
            io::Error::new(
                io::ErrorKind::InvalidData,
                format!("failed to serialize Studio Local job snapshot: {error}"),
            )
        })?;

        let temp_path = temporary_snapshot_path(path);
        fs::write(&temp_path, serialized)?;
        if let Err(rename_error) = fs::rename(&temp_path, path) {
            if path.exists() {
                fs::remove_file(path)?;
                fs::rename(&temp_path, path)?;
            } else {
                return Err(rename_error);
            }
        }
        Ok(())
    }
}

fn temporary_snapshot_path(path: &Path) -> PathBuf {
    let file_name = path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("jobs.json");
    path.with_file_name(format!("{file_name}.tmp"))
}

fn job_sequence_number(id: &str) -> Option<u64> {
    id.strip_prefix("local-job-")?.parse::<u64>().ok()
}

fn recover_interrupted_job(job: &mut RuntimeJobStatus) {
    if matches!(
        job.state,
        RuntimeJobState::Queued | RuntimeJobState::Running | RuntimeJobState::NeedsApproval
    ) {
        job.state = RuntimeJobState::Held;
        job.blocker = Some(RECOVERED_JOB_BLOCKER.to_string());
        if !job
            .compact_log
            .iter()
            .any(|line| line == RECOVERED_JOB_BLOCKER)
        {
            job.compact_log.push(RECOVERED_JOB_BLOCKER.to_string());
        }
    }
}
