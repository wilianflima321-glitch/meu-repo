//! Desktop IPC command submodules.
//!
//! `terminal_*` (+ Law #48 ACL) are registered on the Tauri handler surface (R22).
//! Other desktop IPC (fs/window/ai) may remain disconnected from `generate_handler!`
//! per P2g preserve — re-wiring those is a deliberate follow-up.
#![allow(dead_code, unused_imports)]

pub mod agent_shell_acl;
pub mod fs_commands;
pub mod pty_commands;
pub mod security;
pub mod window_commands;

pub use agent_shell_acl::*;
pub use fs_commands::*;
pub use pty_commands::*;
pub use security::*;
pub use window_commands::*;
