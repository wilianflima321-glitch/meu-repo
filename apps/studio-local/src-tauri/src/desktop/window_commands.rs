//! Desktop window controls, notifications, and AI completion IPC.
//!
//! `ai_complete` / `notify_native` are honest `provider_unavailable` HELD paths —
//! not production stubs presented as working AI or OS notifications.

use serde::{Deserialize, Serialize};
use tauri::Window;

use super::agent_shell_acl::acl_or_deny_ipc;
use aethel_studio_local::ipc_surface::IpcAclClass;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeNotificationInput {
    pub title: String,
    pub body: Option<String>,
    pub tone: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCommandStatus {
    pub state: String,
    pub reason: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCompleteResponse {
    pub text: String,
    pub cost_usd: Option<f64>,
    pub state: String,
    pub reason: String,
}

#[tauri::command]
pub fn ai_complete(
    prompt: String,
    model: Option<String>,
    caller_kind: Option<String>,
    agent_tool: Option<String>,
    agent_id: Option<String>,
) -> AiCompleteResponse {
    if let Err(evidence) =
        acl_or_deny_ipc(IpcAclClass::AgentDeny, caller_kind, agent_tool, agent_id)
    {
        return AiCompleteResponse {
            text: String::new(),
            cost_usd: Some(0.0),
            state: "denied".to_string(),
            reason: evidence,
        };
    }
    let _ = (prompt, model);
    AiCompleteResponse {
        text: String::new(),
        cost_usd: Some(0.0),
        state: "provider_unavailable".to_string(),
        reason: "Local AI completion is not wired in Studio Local; use the governed cloud/provider adapter until a local model sidecar is approved.".to_string(),
    }
}

#[tauri::command]
pub fn notify_native(
    input: NativeNotificationInput,
    caller_kind: Option<String>,
    agent_tool: Option<String>,
    agent_id: Option<String>,
) -> NativeCommandStatus {
    if let Err(evidence) =
        acl_or_deny_ipc(IpcAclClass::AgentDeny, caller_kind, agent_tool, agent_id)
    {
        return NativeCommandStatus {
            state: "denied".to_string(),
            reason: evidence,
        };
    }
    let _ = (&input.title, &input.body, &input.tone);
    NativeCommandStatus {
        state: "provider_unavailable".to_string(),
        reason: "Native notification plugin is not installed; the web shell should show the in-product toast instead.".to_string(),
    }
}

#[tauri::command]
pub fn window_minimize(
    window: Window,
    caller_kind: Option<String>,
    agent_tool: Option<String>,
    agent_id: Option<String>,
) -> Result<(), String> {
    acl_or_deny_ipc(IpcAclClass::AgentDeny, caller_kind, agent_tool, agent_id)?;
    window
        .minimize()
        .map_err(|error| format!("failed to minimize window: {error}"))
}

#[tauri::command]
pub fn window_toggle_maximize(
    window: Window,
    caller_kind: Option<String>,
    agent_tool: Option<String>,
    agent_id: Option<String>,
) -> Result<(), String> {
    acl_or_deny_ipc(IpcAclClass::AgentDeny, caller_kind, agent_tool, agent_id)?;
    let is_maximized = window
        .is_maximized()
        .map_err(|error| format!("failed to inspect window state: {error}"))?;
    if is_maximized {
        window
            .unmaximize()
            .map_err(|error| format!("failed to unmaximize window: {error}"))
    } else {
        window
            .maximize()
            .map_err(|error| format!("failed to maximize window: {error}"))
    }
}

#[tauri::command]
pub fn window_close(
    window: Window,
    caller_kind: Option<String>,
    agent_tool: Option<String>,
    agent_id: Option<String>,
) -> Result<(), String> {
    acl_or_deny_ipc(IpcAclClass::AgentDeny, caller_kind, agent_tool, agent_id)?;
    window
        .close()
        .map_err(|error| format!("failed to close window: {error}"))
}
