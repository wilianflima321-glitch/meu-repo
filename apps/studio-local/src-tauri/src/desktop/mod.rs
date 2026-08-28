//! Desktop IPC command submodules.
//!
//! All host desktop commands (`terminal_*`, `fs_*`, `window_*`, `notify_native`,
//! `ai_complete`, `run_moa_orchestrator`) are registered on the unified Tauri
//! surface via `aethel_studio_local::register_commands!()` (round R2). The P2g
//! disconnection is ended; every command carries Law #48 caller-identity params
//! and enforces `AgentDeny` for host-PTY / filesystem / window / AI call paths.
#![allow(dead_code, unused_imports)]

pub mod agent_shell_acl;
/// MOA orchestrator IPC command (kernel `ai_fusion_moa_orchestrator`).
/// Round R2 (2026-08-15): re-wired onto the unified IPC surface with Law #48
/// `AgentDeny` ACL — the P2g preserve disconnection is ended. J.11/J.12 remain
/// STOPPED; this only makes the backend command reachable and governed, never
/// ships a UI/AI-native workflow.
pub mod ai_commands;
pub mod fs_commands;
pub mod pty_commands;
pub mod security;
pub mod window_commands;

pub use agent_shell_acl::*;
pub use ai_commands::*;
pub use fs_commands::*;
pub use pty_commands::*;
pub use security::*;
pub use window_commands::*;
