//! Law #48 AgentShellPolicy — IPC ACL for desktop `terminal_*` host PTY.
//!
//! Human Studio Local UI may open portable-pty. Agent / Fusion / tool callers
//! MUST be refused with explicit deny evidence (never silently allowed).

use serde::{Deserialize, Serialize};

use aethel_studio_local::ipc_surface::IpcAclClass;

pub const AGENT_HOST_PTY_DENY_CODE: &str = "AGENT_HOST_PTY_DENIED";
pub const LAW_AGENT_SHELL_POLICY: u32 = 48;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TerminalCallerKind {
    User,
    Agent,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalCallerMeta {
    /// `"user"` | `"agent"` (case-insensitive). Omitted → user when no agent markers.
    pub caller_kind: Option<String>,
    /// Non-empty agent tool id / name marks agent origin (parity with `x-aethel-agent-tool`).
    pub agent_tool: Option<String>,
    /// Non-empty agent run id marks agent origin (parity with `x-aethel-agent-id`).
    pub agent_id: Option<String>,
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct TerminalAclDenyEvidence {
    pub allowed: bool,
    pub status: &'static str,
    pub law: u32,
    pub code: &'static str,
    pub caller_kind: &'static str,
    pub requested_target: &'static str,
    pub execution_lane: &'static str,
    pub reason: &'static str,
    pub claim: &'static str,
    pub placebo_forbidden: bool,
}

impl TerminalAclDenyEvidence {
    pub fn agent_host_pty_blocked() -> Self {
        Self {
            allowed: false,
            status: "blocked",
            law: LAW_AGENT_SHELL_POLICY,
            code: AGENT_HOST_PTY_DENY_CODE,
            caller_kind: "agent",
            requested_target: "desktop-native-pty",
            execution_lane: "denied",
            reason: "Law #48 AgentShellPolicy: agents must never spawn host OS PTY via terminal_* IPC; use Forge sandbox only.",
            claim: "Agent host PTY blocked",
            placebo_forbidden: true,
        }
    }

    /// Stable string for Tauri `Err` + CI evidence parsing.
    pub fn to_ipc_error(self) -> String {
        match serde_json::to_string(&self) {
            Ok(json) => format!("{AGENT_HOST_PTY_DENY_CODE}:{json}"),
            Err(_) => format!(
                "{AGENT_HOST_PTY_DENY_CODE}:{{\"allowed\":false,\"status\":\"blocked\",\"law\":48,\"code\":\"{AGENT_HOST_PTY_DENY_CODE}\"}}"
            ),
        }
    }
}

pub fn detect_terminal_caller_kind(meta: &TerminalCallerMeta) -> TerminalCallerKind {
    let kind = meta
        .caller_kind
        .as_deref()
        .map(str::trim)
        .map(str::to_ascii_lowercase)
        .unwrap_or_default();
    if kind == "agent" {
        return TerminalCallerKind::Agent;
    }
    if meta
        .agent_tool
        .as_deref()
        .map(str::trim)
        .is_some_and(|v| !v.is_empty())
    {
        return TerminalCallerKind::Agent;
    }
    if meta
        .agent_id
        .as_deref()
        .map(str::trim)
        .is_some_and(|v| !v.is_empty())
    {
        return TerminalCallerKind::Agent;
    }
    TerminalCallerKind::User
}

/// Gate every `terminal_*` IPC call. Users allowed; agents denied with evidence.
pub fn enforce_human_terminal_acl(meta: &TerminalCallerMeta) -> Result<(), TerminalAclDenyEvidence> {
    match detect_terminal_caller_kind(meta) {
        TerminalCallerKind::User => Ok(()),
        TerminalCallerKind::Agent => Err(TerminalAclDenyEvidence::agent_host_pty_blocked()),
    }
}

/// Gate an IPC command by its declarative ACL class (round R2, S-12). Only
/// `AgentDeny` commands are refused for agent callers; `Public`/`HumanOnly` pass
/// through here (HumanOnly stays declarative-only — no runtime interception layer).
///
/// The desktop module is binary-only, so the enforcement helper must live here
/// (it can reference the lib crate's `ipc_surface::IpcAclClass`), not in the lib.
pub fn enforce_ipc_acl(
    class: IpcAclClass,
    caller_kind: Option<String>,
    agent_tool: Option<String>,
    agent_id: Option<String>,
) -> Result<(), TerminalAclDenyEvidence> {
    if class != IpcAclClass::AgentDeny {
        return Ok(());
    }
    let meta = TerminalCallerMeta {
        caller_kind,
        agent_tool,
        agent_id,
    };
    enforce_human_terminal_acl(&meta)
}

/// Convenience for Tauri commands: `enforce_ipc_acl` mapped to a stable `Err(String)`.
pub fn acl_or_deny_ipc(
    class: IpcAclClass,
    caller_kind: Option<String>,
    agent_tool: Option<String>,
    agent_id: Option<String>,
) -> Result<(), String> {
    enforce_ipc_acl(class, caller_kind, agent_tool, agent_id)
        .map_err(|evidence| evidence.to_ipc_error())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn user_caller_is_allowed() {
        let meta = TerminalCallerMeta {
            caller_kind: Some("user".into()),
            ..Default::default()
        };
        assert!(enforce_human_terminal_acl(&meta).is_ok());
    }

    #[test]
    fn omitted_caller_defaults_to_user_for_human_ui() {
        let meta = TerminalCallerMeta::default();
        assert_eq!(detect_terminal_caller_kind(&meta), TerminalCallerKind::User);
        assert!(enforce_human_terminal_acl(&meta).is_ok());
    }

    #[test]
    fn agent_caller_kind_is_denied_with_law_48_evidence() {
        let meta = TerminalCallerMeta {
            caller_kind: Some("agent".into()),
            ..Default::default()
        };
        let err = enforce_human_terminal_acl(&meta).expect_err("agent must be denied");
        assert!(!err.allowed);
        assert_eq!(err.law, 48);
        assert_eq!(err.code, AGENT_HOST_PTY_DENY_CODE);
        assert_eq!(err.status, "blocked");
        assert_eq!(err.requested_target, "desktop-native-pty");
        assert!(err.placebo_forbidden);
        let ipc = err.to_ipc_error();
        assert!(ipc.starts_with(AGENT_HOST_PTY_DENY_CODE));
        assert!(ipc.contains("\"law\":48"));
    }

    #[test]
    fn agent_tool_marker_is_denied() {
        let meta = TerminalCallerMeta {
            caller_kind: Some("user".into()),
            agent_tool: Some("terminal_create".into()),
            ..Default::default()
        };
        let err = enforce_human_terminal_acl(&meta).expect_err("agent_tool marks agent");
        assert_eq!(err.code, AGENT_HOST_PTY_DENY_CODE);
    }

    #[test]
    fn agent_id_marker_is_denied() {
        let meta = TerminalCallerMeta {
            agent_id: Some("run-abc".into()),
            ..Default::default()
        };
        assert!(enforce_human_terminal_acl(&meta).is_err());
    }

    #[test]
    fn enforce_ipc_acl_gates_only_agent_deny_class() {
        // Non-AgentDeny classes never refuse (no runtime interception layer).
        assert!(enforce_ipc_acl(IpcAclClass::Public, None, None, None).is_ok());
        assert!(enforce_ipc_acl(
            IpcAclClass::HumanOnly,
            Some("agent".into()),
            None,
            None,
        )
        .is_ok());
        // AgentDeny refuses agent callers with Law #48 evidence.
        let err = enforce_ipc_acl(IpcAclClass::AgentDeny, Some("agent".into()), None, None)
            .expect_err("AgentDeny class must refuse agent callers");
        assert_eq!(err.law, 48);
        assert_eq!(err.code, AGENT_HOST_PTY_DENY_CODE);
        assert!(enforce_ipc_acl(IpcAclClass::AgentDeny, None, None, None).is_ok());
        // acl_or_deny_ipc maps to a stable String error carrying the deny code.
        let ipc = acl_or_deny_ipc(IpcAclClass::AgentDeny, None, Some("tool".into()), None)
            .expect_err("agent_tool marker must deny");
        assert!(ipc.starts_with(AGENT_HOST_PTY_DENY_CODE));
    }
}
