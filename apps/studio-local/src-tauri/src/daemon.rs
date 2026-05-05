use crate::contracts::RuntimeJobLane;
use crate::jobs::{RuntimeJobRequest, RuntimeJobStore};
use crate::policy::resolve_runtime_target;
use crate::probe::collect_local_probe;

pub const HEALTH_ENDPOINT: &str = "/health";
pub const PROBE_ENDPOINT: &str = "/probe";
pub const JOBS_ENDPOINT: &str = "/jobs";
pub const SYNC_CLOUD_ENDPOINT: &str = "/sync/cloud";

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RuntimeHttpResponse {
    pub status_code: u16,
    pub body: String,
}

pub fn health_body() -> String {
    "{\"ok\":true,\"service\":\"aethel-studio-local\",\"version\":1}".to_string()
}

pub fn handle_request(method: &str, path: &str, store: &mut RuntimeJobStore) -> RuntimeHttpResponse {
    match (method, path) {
        ("GET", HEALTH_ENDPOINT) => RuntimeHttpResponse { status_code: 200, body: health_body() },
        ("POST", PROBE_ENDPOINT) => {
            let probe = collect_local_probe("local-device");
            RuntimeHttpResponse {
                status_code: 200,
                body: format!("probe:{}:{}", probe.os, probe.preferred_executor.as_str()),
            }
        }
        ("POST", JOBS_ENDPOINT) => {
            let probe = collect_local_probe("local-device");
            let request = RuntimeJobRequest::fixture(RuntimeJobLane::MemoryIndexing);
            let decision = resolve_runtime_target(&probe, request.lane);
            let status = store.create(request, decision);
            RuntimeHttpResponse {
                status_code: 202,
                body: format!("job:{}:{}", status.id, status.target.as_str()),
            }
        }
        ("POST", SYNC_CLOUD_ENDPOINT) => RuntimeHttpResponse {
            status_code: 202,
            body: "sync:accepted".to_string(),
        },
        _ if method == "GET" && path.starts_with("/jobs/") => {
            let id = path.trim_start_matches("/jobs/");
            match store.get(id) {
                Some(status) => RuntimeHttpResponse { status_code: 200, body: format!("job:{}:{}", status.id, status.target.as_str()) },
                None => RuntimeHttpResponse { status_code: 404, body: "job:not-found".to_string() },
            }
        }
        _ if method == "POST" && path.starts_with("/jobs/") && path.ends_with("/cancel") => {
            let id = path.trim_start_matches("/jobs/").trim_end_matches("/cancel");
            match store.cancel(id) {
                Some(status) => RuntimeHttpResponse { status_code: 202, body: format!("job:{}:cancelled", status.id) },
                None => RuntimeHttpResponse { status_code: 404, body: "job:not-found".to_string() },
            }
        }
        _ => RuntimeHttpResponse { status_code: 404, body: "endpoint:not-found".to_string() },
    }
}
