//! Re-export kernel WorldSoA — single SoA authority (letter **dc**).
//! Local toy ECS removed; desktop uses `aethel-kernel-rust::ecs_core`.
//! Path dep compiles; full studio-local `cargo check` still blocked by unrelated modules (see Progress dc).

pub use aethel_kernel_rust::ecs_core::{EntityId, SceneGraph, WorldSoA};
