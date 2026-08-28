//! Law I — Shared Address Bus (SAB) IPC substrate.
//!
//! Canonical path mandated by Launch Hard Gate #72 / `AETHEL_AAA_PARITY_TARGETS.md`
//! §4 (P2 GAS): `apps/studio-local/src-tauri/src/ipc/`. Binary-only channels —
//! **no JSON / generic-serde reflection in the 60 Hz tick path** (R-S05).
//!
//! `gas_sab_ring` is the in-process, `&mut self` zero-copy SPSC byte-frame slot
//! ring that lets the GAS fixed-tick loop encode each frame **directly into a
//! persistent slot** (S-18 Zero-Alloc Hot-Loop fix). Cross-thread lock-free /
//! mmap / product web↔Tauri duplex remains the kernel `fe` letter's proven job
//! and stays fail-closed.

pub mod gas_sab_ring;

pub use gas_sab_ring::*;
