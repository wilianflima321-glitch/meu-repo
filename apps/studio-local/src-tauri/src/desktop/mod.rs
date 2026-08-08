//! Desktop IPC command submodules.
//!
//! NOTE (chore/preserve WIP, 2026-08-08): these commands are real, unit-tested logic
//! (see `desktop_commands::tests`) that used to be registered in the Tauri
//! `generate_handler!` surface before it was trimmed to a reduced command set. They
//! are intentionally left disconnected from IPC in this preservation pass — see
//! AETHEL_FOCUS1_EXECUTION_PROGRESS.md P2g. Re-wiring is a deliberate follow-up
//! decision, not made here. `#[allow(dead_code, unused_imports)]` silences the
//! resulting `cargo clippy -D warnings` noise honestly instead of inventing call
//! sites just to satisfy the linter.
#![allow(dead_code, unused_imports)]

pub mod fs_commands;
pub mod pty_commands;
pub mod security;
pub mod window_commands;

pub use fs_commands::*;
pub use pty_commands::*;
pub use security::*;
pub use window_commands::*;
