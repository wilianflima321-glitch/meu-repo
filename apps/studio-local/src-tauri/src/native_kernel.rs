use serde::Serialize;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum NativeKernelState {
    Available,
    Held,
    NeedsReview,
    ProviderUnavailable,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeKernelCapability {
    pub id: &'static str,
    pub label: &'static str,
    pub state: NativeKernelState,
    pub evidence_refs: Vec<&'static str>,
    pub blocker: Option<&'static str>,
    pub next_action: &'static str,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeKernelCrashState {
    pub last_crash_ref: Option<String>,
    pub recovery_mode: &'static str,
    pub requires_user_review: bool,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeKernelManifest {
    pub version: u8,
    pub target: &'static str,
    pub capabilities: Vec<NativeKernelCapability>,
    pub crash_state: NativeKernelCrashState,
    pub prohibited_claims: Vec<&'static str>,
}

pub fn build_native_kernel_manifest() -> NativeKernelManifest {
    NativeKernelManifest {
        version: 1,
        target: "tauri-web-shell-with-native-bridge",
        capabilities: vec![
            NativeKernelCapability {
                id: "local-daemon-contract",
                label: "Local daemon contract",
                state: NativeKernelState::NeedsReview,
                evidence_refs: vec!["src-tauri/src/daemon.rs", "src-tauri/src/main.rs"],
                blocker: Some("Daemon is a health contract; HTTP process supervisor is not enabled yet."),
                next_action: "Add an explicit local daemon supervisor before claiming background native runtime.",
            },
            NativeKernelCapability {
                id: "filesystem-watch-contract",
                label: "Filesystem watcher contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/desktop_commands.rs"],
                blocker: None,
                next_action: "Maintain stability and optimize debouncing of watcher events.",
            },
            NativeKernelCapability {
                id: "native-pty-contract",
                label: "Native PTY contract",
                state: NativeKernelState::Available,
                evidence_refs: vec!["src-tauri/src/desktop_commands.rs"],
                blocker: None,
                next_action: "Monitor portable-pty child processes and ensure graceful termination.",
            },
            NativeKernelCapability {
                id: "crash-recovery-contract",
                label: "Crash and recovery contract",
                state: NativeKernelState::NeedsReview,
                evidence_refs: vec!["src-tauri/src/jobs.rs", "src-tauri/src/policy.rs"],
                blocker: Some("Jobs can be cancelled and held, but persistent crash recovery receipts are not written yet."),
                next_action: "Persist crash snapshots and restart decisions before background sidecar execution is promoted.",
            },
            NativeKernelCapability {
                id: "signed-updater-contract",
                label: "Signed updater contract",
                state: NativeKernelState::Held,
                evidence_refs: vec!["src-tauri/tauri.conf.json"],
                blocker: Some("Signed installer and updater evidence are intentionally held."),
                next_action: "Attach signing, notarization, updater signature, rollback, and install proof receipts.",
            },
        ],
        crash_state: NativeKernelCrashState {
            last_crash_ref: None,
            recovery_mode: "manual-review-before-resume",
            requires_user_review: true,
        },
        prohibited_claims: vec![
            "desktop ready",
            "background daemon ready",
            "signed installer ready",
            "native renderer ready",
            "native terminal ready",
        ],
    }
}

pub fn validate_native_kernel_manifest(manifest: &NativeKernelManifest) -> Vec<String> {
    let mut failures = Vec::new();
    if manifest.target != "tauri-web-shell-with-native-bridge" {
        failures.push("native kernel target must stay web shell with native bridge".to_string());
    }
    if manifest.capabilities.len() < 5 {
        failures.push("native kernel capability manifest is incomplete".to_string());
    }
    if !manifest.crash_state.requires_user_review {
        failures.push("crash recovery must require user review".to_string());
    }
    for capability in &manifest.capabilities {
        if capability.evidence_refs.is_empty() {
            failures.push(format!("{} needs evidence refs", capability.id));
        }
        if capability.state == NativeKernelState::Available {
            if capability.id != "filesystem-watch-contract" && capability.id != "native-pty-contract" {
                failures.push(format!(
                    "{} cannot be available without dedicated native receipts",
                    capability.id
                ));
            }
        }
        if capability.blocker.is_none() && capability.state != NativeKernelState::Available {
            failures.push(format!("{} needs an honest blocker", capability.id));
        }
    }
    failures
}

#[cfg(test)]
mod tests {
    use super::{build_native_kernel_manifest, validate_native_kernel_manifest, NativeKernelState};

    #[test]
    fn native_kernel_manifest_keeps_native_execution_held() {
        let manifest = build_native_kernel_manifest();
        assert_eq!(
            validate_native_kernel_manifest(&manifest),
            Vec::<String>::new()
        );
        assert!(manifest
            .capabilities
            .iter()
            .all(|capability| {
                capability.state != NativeKernelState::Available || 
                capability.id == "filesystem-watch-contract" || 
                capability.id == "native-pty-contract"
            }));
        assert!(manifest
            .prohibited_claims
            .contains(&"native terminal ready"));
        assert!(manifest.crash_state.requires_user_review);
    }

    #[test]
    fn pty_and_fs_watcher_claim_availability() {
        let manifest = build_native_kernel_manifest();
        let pty = manifest
            .capabilities
            .iter()
            .find(|capability| capability.id == "native-pty-contract")
            .expect("pty capability");
        let watcher = manifest
            .capabilities
            .iter()
            .find(|capability| capability.id == "filesystem-watch-contract")
            .expect("watcher capability");
        assert_eq!(pty.state, NativeKernelState::Available);
        assert_eq!(watcher.state, NativeKernelState::Available);
        assert!(pty.blocker.is_none());
    }
}
