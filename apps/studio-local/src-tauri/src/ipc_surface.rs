//! # S-12 Unified IPC Surface — the declarative, auditable command surface (round R2).
//!
//! ## Why this module exists
//!
//! The Tauri command surface used to be an unlabeled, inline `tauri::generate_handler![...]`
//! list living inside the binary crate (`apps/studio-local/src-tauri/src/main.rs`). Nothing
//! declared *why* a command was reachable, which commands were agent-denied (Law #48 ACL) or
//! which were 60 Hz zero-copy hot paths (Law I — no JSON in the tick). R2 turns that implicit
//! list into a named, documented, testable artifact:
//!
//! 1. **`register_commands!`** (`#[macro_export]`) — the single source of truth for the
//!    *registration* of the reachable surface. It expands to `tauri::generate_handler![...]`
//!    and is invoked from `main.rs` as `aethel_studio_local::register_commands!()`. The paths
//!    resolve at the invocation site (the binary crate), which is where the binary-only command
//!    modules (`scene_graph`, `lsp_farm`, `desktop_commands`, …) live — so resolution semantics
//!    are byte-for-byte identical to the old inline list.
//!
//! 2. **`IPC_ACL_REGISTRY`** — a declarative, sorted access-control ledger covering every
//!    registered command name: `(name, acl_class, category, hot_path)`.
//!    - **Law #48 ACL:** PTY commands (`terminal_*`) and the host-PTY deny evidence command
//!      (`wasm_shield_agent_pty_deny_cmd`) are `AgentDeny`; scene mutation, mmap open/read,
//!      LSP spawn/stop and GAS input recording are `HumanOnly`.
//!    - **Law I SAB hot paths:** 60 Hz / zero-copy commands (`gas_runtime_*` frame read/write,
//!      `poll_physics_state`, `probe_gas_sab_ring_cmd`, `wasm_step`, …) are flagged `hot_path`
//!      so the surface can be audited for JSON-in-tick regressions.
//!
//! 3. **`probe_ipc_surface_cmd()`** — a functional backend command (itself on the surface) that
//!    reports the registry state honestly: counts, sorted/unique invariants, PTY-agent-deny
//!    coverage and the declared hot-path / agent-denied sets. **Fail-closed honesty:** it
//!    reports the *declared registry*, never claims runtime enforcement it does not perform and
//!    never asserts AAA readiness.
//!
//! ## Honest boundary
//!
//! The ACL registry is declarative governance + evidence, not a runtime interception layer.
//! Call-time Law #48 enforcement lives where it already exists (`desktop_commands::terminal_*`
//! caller-identity checks, `wasm_shield_agent_pty_deny_cmd`). This module makes that policy
//! auditable in one place and fail-closes on any registry drift (duplicate / unsorted / missing
//! AgentDeny for PTY) via tests + the probe.
//!
//! ## Version
//!
//! `IPC_SURFACE_VERSION = "r30-2026-08-19"` — measured against disk reality: **181 registered
//! commands** (156 at R26 + 16 R4 Latent Dreamspace commands: 8 probes + 8 soaks,
//! letters lc→lj — latent_dreamspace_bytecode, micro_dream_gpu_pass,
//! holographic_scene_tensor, multiverse_rollback_branching, synesthetic_resonance_matrix,
//! gaze_intent_anticipation, narrative_tension_clock, matter_memory_scarring —
//! Aethel Latent Dreamspace & Spatial Bytecode `.asbc` + 1 R5 engine-owned frame-hash
//! command `renderer_frame_hash_last` — GF-PARITY-3B2-001 engine-owned digest producer)
//! + 5 R6 GAS 2.0 commands (letters lk→ll — data_assets registry probe + cook soak,
//! state_tree runtime probe + soak, tags S5-ACC-03 query benchmark),
//! + 3 R6.1 S6.0 commands (letters gr + gj — replication probe + soak,
//! joint physics↔GAS replay soak),
//! 17 AgentDeny, 17 HumanOnly, 154 Public, 16 hot-path.

use serde::Serialize;

/// IPC surface version tag — bumped on any surface change (Zero Amnesia).
pub const IPC_SURFACE_VERSION: &str = "r30-2026-08-19";

/// Number of commands this surface registers (macro list == registry length invariant).
pub const REGISTERED_COMMAND_COUNT: usize = 188;

/// Documented ACL split — each const must match `IPC_ACL_REGISTRY` (verified by
/// `cargo xtask ipc-check` and `acl_class_counts_match_the_documented_split`).
pub const AGENT_DENY_COMMAND_COUNT: usize = 17;
pub const HUMAN_ONLY_COMMAND_COUNT: usize = 17;
pub const PUBLIC_COMMAND_COUNT: usize = 154;
pub const HOT_PATH_COMMAND_COUNT: usize = 16;

// ============================================================================
// 1. ACL model
// ============================================================================

/// Access-control class for a command (Law #48 — agent callers).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IpcAclClass {
    /// Read-only probes / soaks / telemetry — safe for any caller.
    Public,
    /// Mutates user-facing state (scene graph, sessions, mmap handles, LSP spawn) —
    /// intended for the human operator.
    HumanOnly,
    /// Denied to agent callers by policy (PTY, host-PTY deny evidence).
    AgentDeny,
}

impl IpcAclClass {
    /// Stable wire tag (camelCase).
    pub const fn tag(self) -> &'static str {
        match self {
            IpcAclClass::Public => "public",
            IpcAclClass::HumanOnly => "humanOnly",
            IpcAclClass::AgentDeny => "agentDeny",
        }
    }
}

/// Functional category of a command — coarse domain grouping for the ledger.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IpcCategory {
    /// Kernel-wire honesty probes / soaks (letter-registered kernel surface).
    KernelWire,
    /// Product / editor runtime commands (scene, motion, cooker, runtime lanes).
    Product,
    /// GPU present / adapter / engine-owned present / compute probes.
    Gpu,
    /// GAS 60 Hz sim runtime + binary IPC + SAB ring + duplex.
    Gas,
    /// PTY terminal commands (Law #48).
    Pty,
    /// LSP farm commands.
    Lsp,
    /// mmap shared-memory commands.
    Memory,
    /// WASM runtime / shield commands.
    Wasm,
    /// Job routing / ledger commands.
    Job,
    /// Host-level runtime / window / surface-probe commands.
    Host,
    /// Host filesystem commands (`fs_*` — re-wired P2g desktop commands, round R2).
    Filesystem,
    /// Host window-control commands (`window_*`, `notify_native` — re-wired round R2).
    Window,
    /// AI completion / MoA orchestration commands (re-wired round R2).
    Ai,
}

impl IpcCategory {
    /// Stable wire tag.
    pub const fn tag(self) -> &'static str {
        match self {
            IpcCategory::KernelWire => "kernelWire",
            IpcCategory::Product => "product",
            IpcCategory::Gpu => "gpu",
            IpcCategory::Gas => "gas",
            IpcCategory::Pty => "pty",
            IpcCategory::Lsp => "lsp",
            IpcCategory::Memory => "memory",
            IpcCategory::Wasm => "wasm",
            IpcCategory::Job => "job",
            IpcCategory::Host => "host",
            IpcCategory::Filesystem => "filesystem",
            IpcCategory::Window => "window",
            IpcCategory::Ai => "ai",
        }
    }
}

/// One row of the declarative IPC ACL ledger.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct IpcAclEntry {
    /// Tauri command name (function name after `#[tauri::command]`).
    pub name: &'static str,
    /// Access-control class (Law #48).
    pub acl: IpcAclClass,
    /// Functional domain.
    pub category: IpcCategory,
    /// True when the command is a 60 Hz / zero-copy hot path (Law I — no JSON in tick).
    pub hot_path: bool,
}

/// Const constructor for registry rows (keeps the table terse and `const`-evaluable).
pub const fn acl_entry(
    name: &'static str,
    acl: IpcAclClass,
    category: IpcCategory,
    hot_path: bool,
) -> IpcAclEntry {
    IpcAclEntry {
        name,
        acl,
        category,
        hot_path,
    }
}

// ============================================================================
// 2. Declarative ACL registry (single source for the reachable surface)
// ============================================================================
//
// Sorted by command name for deterministic diffs. Each row mirrors a real
// `#[tauri::command]` reachable from `main.rs` (98 pre-existing + the probe in
// this module + the 11 re-wired P2g host desktop commands + the R3 wire-reachability
// probe). Counts measured on disk: 17 AgentDeny / 17 HumanOnly / 77 Public / 16
// hot-path — see
// `probe_ipc_surface_cmd` + tests for the invariants.

pub const IPC_ACL_REGISTRY: &[IpcAclEntry] = &[
    acl_entry("ai_complete", IpcAclClass::AgentDeny, IpcCategory::Ai, false),
    acl_entry("asset_cooker_start", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("data_assets_registry_probe_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("entropy_gpu_particle_soak_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
    acl_entry("execute_sandbox_plugin", IpcAclClass::Public, IpcCategory::Wasm, false),
    acl_entry("export_vibe_embedding", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("fs_list", IpcAclClass::AgentDeny, IpcCategory::Filesystem, false),
    acl_entry("fs_read", IpcAclClass::AgentDeny, IpcCategory::Filesystem, false),
    acl_entry("fs_tree", IpcAclClass::AgentDeny, IpcCategory::Filesystem, false),
    acl_entry("fs_watch", IpcAclClass::AgentDeny, IpcCategory::Filesystem, false),
    acl_entry("fs_write", IpcAclClass::AgentDeny, IpcCategory::Filesystem, false),
    acl_entry("gas_binary_ipc_roundtrip_cmd", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("gas_runtime_entity_count", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("gas_runtime_entity_from_unified", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("gas_runtime_honesty_probe", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("gas_runtime_metrics", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("gas_runtime_pop_frame", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("gas_runtime_read_frame", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("gas_runtime_record_command", IpcAclClass::HumanOnly, IpcCategory::Gas, false),
    acl_entry("gas_runtime_start", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("gas_runtime_step", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("gas_runtime_stop", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("gas_runtime_sustained_soak", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("gas_runtime_unified_id_for_entity", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("gas_unified_id_probe_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("gpu_terminal_probe_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
acl_entry("hardware_profiler_sample_once", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("jobs_cancel", IpcAclClass::HumanOnly, IpcCategory::Job, false),
    acl_entry("jobs_list", IpcAclClass::Public, IpcCategory::Job, false),
    acl_entry("jobs_route", IpcAclClass::HumanOnly, IpcCategory::Job, false),
    acl_entry("launch_native_egui_overlay", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("local_runtime_health", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("local_runtime_probe", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("local_runtime_probe_report", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("local_runtime_sidecars", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("lsp_farm_did_change", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_did_open", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_ensure_session", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_honesty", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_ipc_probe", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_list", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_poll_diagnostics", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_probe", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_request", IpcAclClass::Public, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_spawn", IpcAclClass::HumanOnly, IpcCategory::Lsp, false),
    acl_entry("lsp_farm_stop", IpcAclClass::HumanOnly, IpcCategory::Lsp, false),
    acl_entry("mmap_close", IpcAclClass::HumanOnly, IpcCategory::Memory, false),
    acl_entry("mmap_open", IpcAclClass::HumanOnly, IpcCategory::Memory, false),
    acl_entry("mmap_read_range", IpcAclClass::HumanOnly, IpcCategory::Memory, false),
    acl_entry("motion_matching_evaluate", IpcAclClass::Public, IpcCategory::KernelWire, true),
    acl_entry("motion_matching_status", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("native_kernel_manifest", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("notify_native", IpcAclClass::AgentDeny, IpcCategory::Window, false),
    acl_entry("open_panel_window", IpcAclClass::Public, IpcCategory::Host, false),
    acl_entry("physics_gas_duplex_probe_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
acl_entry("poll_physics_state", IpcAclClass::Public, IpcCategory::KernelWire, true),
acl_entry("present_command_send_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
acl_entry("present_frame", IpcAclClass::Public, IpcCategory::Product, true),
    acl_entry("probe_aethel_matter_model_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_async_compute_scheduler_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_auto_photography_director_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_celestial_orbital_dynamics_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_cinema_frame_graph_composition_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_cinema_hot_loop_composition_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_dynamic_shader_rewriter_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_dynamic_surface_deformation_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_entropy_gpu_particles_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
    acl_entry("probe_euphoria_balance_controller_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_flight_aerodynamics_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_gas_binary_ipc_tick_cmd", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("probe_gas_sab_ring_cmd", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("probe_gaze_intent_anticipation_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_gpu_culling_frustum_soak_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
    acl_entry("probe_holographic_scene_tensor_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_ipc_surface_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_kernel_foundation_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_latent_dreamspace_bytecode_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_living_sky_fluid_ocean_buoyancy_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_matter_memory_scarring_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_micro_dream_gpu_pass_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_micro_poly_cull_cmd", IpcAclClass::Public, IpcCategory::Gpu, true),
    acl_entry("probe_micro_shadow_bent_normals_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_multiverse_rollback_branching_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_narrative_tension_clock_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_neural_physics_co_sim_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_physics_world_solvers_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
acl_entry("probe_position_based_dynamics_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
acl_entry("probe_present_command_channel_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
acl_entry("probe_procedural_muscle_locomotion_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_rendering_quarantine_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
    acl_entry("probe_risk_envelope_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_sdf_contact_blending_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_sequencing_timeline_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_spatial_partition_hibernation_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_synesthetic_resonance_matrix_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_task_graph_scheduler_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_vehicle_chassis_dynamics_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_wasm_shield_cmd", IpcAclClass::Public, IpcCategory::Wasm, false),
    acl_entry("probe_wind_field_dynamics_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_wire_reachability_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("probe_world_forge_densification_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("product_present_engine_owned_soak", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("product_present_honesty_probe", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("product_present_persistent_start", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("product_present_persistent_status", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("product_present_persistent_stop", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("product_present_session_claim", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("product_present_session_release", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("product_present_soak_60s", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("product_present_try_webview_attach", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("register_user_aesthetic_override", IpcAclClass::HumanOnly, IpcCategory::Product, false),
    acl_entry("renderer_frame_graph_timings_last", IpcAclClass::Public, IpcCategory::Gpu, true),
    acl_entry("renderer_frame_hash_last", IpcAclClass::Public, IpcCategory::Gpu, false),
    acl_entry("renderer_present_probe", IpcAclClass::Public, IpcCategory::Gpu, true),
    acl_entry("renderer_present_probe_last", IpcAclClass::Public, IpcCategory::Gpu, false),
    acl_entry("run_data_assets_cook_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("run_gas_runtime_sustained_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("run_gas_sim_driver_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, true),
    acl_entry("run_gas_unified_id_roundtrip_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("run_gf_gas_001_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
acl_entry("run_gf_gas_002_gate_matrix_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
acl_entry("run_gf_integrated_scene_001_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
acl_entry("run_gf_mesh_001_golden_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
acl_entry("run_gf_mesh_001_gpu_parity_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
acl_entry("run_gf_net_001_rollback_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
acl_entry("run_kernel_aethel_matter_model_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_async_compute_scheduler_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_auto_photography_director_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_celestial_orbital_dynamics_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_cinema_frame_graph_composition_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_cinema_hot_loop_composition_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_dynamic_shader_rewriter_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_dynamic_surface_deformation_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_euphoria_balance_controller_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_flight_aerodynamics_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_gaze_intent_anticipation_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_holographic_scene_tensor_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_latent_dreamspace_bytecode_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_living_sky_fluid_ocean_buoyancy_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_matter_memory_scarring_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_micro_dream_gpu_pass_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_micro_shadow_bent_normals_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_multiverse_rollback_branching_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_narrative_tension_clock_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_neural_physics_co_sim_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_physics_world_solvers_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_position_based_dynamics_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_procedural_muscle_locomotion_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_sdf_contact_blending_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_sequencing_timeline_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_spatial_partition_hibernation_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_synesthetic_resonance_matrix_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_task_graph_scheduler_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_vehicle_chassis_dynamics_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_wind_field_dynamics_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_wire_reachability_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_kernel_world_forge_densification_soak_cmd", IpcAclClass::Public, IpcCategory::KernelWire, false),
    acl_entry("run_moa_orchestrator", IpcAclClass::AgentDeny, IpcCategory::Ai, false),
    acl_entry("run_physics_gas_duplex_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("run_physics_gas_joint_replay_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
acl_entry("run_product_screenshot_gate_cmd", IpcAclClass::Public, IpcCategory::Gpu, false),
    acl_entry("run_s6_replication_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("run_state_tree_soak_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("run_tag_query_benchmark_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("s6_replication_probe_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("scene_add_node", IpcAclClass::HumanOnly, IpcCategory::Product, false),
    acl_entry("scene_get_nodes", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("scene_remove_node", IpcAclClass::HumanOnly, IpcCategory::Product, false),
    acl_entry("scene_reparent", IpcAclClass::HumanOnly, IpcCategory::Product, false),
    acl_entry("scene_select", IpcAclClass::Public, IpcCategory::Product, false),
    acl_entry("scene_set_locked", IpcAclClass::HumanOnly, IpcCategory::Product, false),
    acl_entry("scene_set_visible", IpcAclClass::HumanOnly, IpcCategory::Product, false),
    acl_entry("scene_update_transform", IpcAclClass::HumanOnly, IpcCategory::Product, false),
    acl_entry("start_sandbox_telemetry", IpcAclClass::Public, IpcCategory::Wasm, false),
    acl_entry("state_tree_runtime_probe_cmd", IpcAclClass::Public, IpcCategory::Gas, false),
    acl_entry("terminal_acl_probe", IpcAclClass::AgentDeny, IpcCategory::Pty, false),
    acl_entry("terminal_close", IpcAclClass::AgentDeny, IpcCategory::Pty, false),
    acl_entry("terminal_create", IpcAclClass::AgentDeny, IpcCategory::Pty, false),
    acl_entry("terminal_resize", IpcAclClass::AgentDeny, IpcCategory::Pty, false),
    acl_entry("terminal_write", IpcAclClass::AgentDeny, IpcCategory::Pty, false),
    acl_entry("wasm_host_status", IpcAclClass::Public, IpcCategory::Wasm, false),
    acl_entry("wasm_load_module", IpcAclClass::HumanOnly, IpcCategory::Wasm, false),
    acl_entry("wasm_shield_agent_pty_deny_cmd", IpcAclClass::AgentDeny, IpcCategory::Wasm, false),
    acl_entry("wasm_step", IpcAclClass::Public, IpcCategory::Wasm, true),
    acl_entry("wasm_watch_and_hot_reload", IpcAclClass::HumanOnly, IpcCategory::Wasm, false),
    acl_entry("window_close", IpcAclClass::AgentDeny, IpcCategory::Window, false),
    acl_entry("window_minimize", IpcAclClass::AgentDeny, IpcCategory::Window, false),
    acl_entry("window_toggle_maximize", IpcAclClass::AgentDeny, IpcCategory::Window, false),
];

// ============================================================================
// 3. Registry accessors (fail-closed invariants)
// ============================================================================

/// Number of rows actually present in `IPC_ACL_REGISTRY`.
pub const fn registry_len() -> usize {
    IPC_ACL_REGISTRY.len()
}

/// Look up a command row by name. `None` means "not part of the declared surface".
pub fn acl_for(name: &str) -> Option<IpcAclEntry> {
    IPC_ACL_REGISTRY
        .iter()
        .find(|e| e.name == name)
        .copied()
}

/// The registry is sorted lexicographically by name (deterministic diffs).
pub fn registry_is_sorted() -> bool {
    IPC_ACL_REGISTRY.windows(2).all(|w| w[0].name <= w[1].name)
}

/// The registry has no duplicate command names.
pub fn registry_has_no_duplicates() -> bool {
    IPC_ACL_REGISTRY.windows(2).all(|w| w[0].name != w[1].name)
}

/// Count of commands flagged as Law I SAB hot paths.
pub fn hot_path_count() -> usize {
    IPC_ACL_REGISTRY.iter().filter(|e| e.hot_path).count()
}

/// Count of commands in the given ACL class.
pub fn acl_count(class: IpcAclClass) -> usize {
    IPC_ACL_REGISTRY.iter().filter(|e| e.acl == class).count()
}

/// Every PTY command is `AgentDeny` (Law #48 fail-closed).
pub fn pty_commands_are_agent_deny() -> bool {
    IPC_ACL_REGISTRY
        .iter()
        .filter(|e| e.category == IpcCategory::Pty)
        .all(|e| e.acl == IpcAclClass::AgentDeny)
}

/// Hot-path commands must never be in the `Pty` category (PTY is never zero-copy).
pub fn hot_paths_are_never_pty() -> bool {
    IPC_ACL_REGISTRY
        .iter()
        .filter(|e| e.hot_path)
        .all(|e| e.category != IpcCategory::Pty)
}

// ============================================================================
// 4. Honest surface probe (declarative governance, fail-closed honesty)
// ============================================================================

/// Wire report for `probe_ipc_surface_cmd`.
#[derive(Debug, Clone, Serialize)]
pub struct IpcSurfaceProbeReport {
    pub version: &'static str,
    pub declared_command_count: usize,
    pub registry_len: usize,
    pub surface_declared: bool,
    pub registry_sorted: bool,
    pub registry_unique: bool,
    pub agent_deny_count: usize,
    pub human_only_count: usize,
    pub public_count: usize,
    pub hot_path_count: usize,
    pub pty_commands_agent_deny: bool,
    pub hot_paths_never_pty: bool,
    pub enforcement_note: &'static str,
}

/// Honest surface probe. Reports the *declared* registry; never claims runtime
/// interception it does not perform and never asserts AAA readiness.
#[tauri::command]
pub fn probe_ipc_surface_cmd() -> IpcSurfaceProbeReport {
    let registry_len = IPC_ACL_REGISTRY.len();
    IpcSurfaceProbeReport {
        version: IPC_SURFACE_VERSION,
        declared_command_count: REGISTERED_COMMAND_COUNT,
        registry_len,
        surface_declared: registry_len == REGISTERED_COMMAND_COUNT,
        registry_sorted: registry_is_sorted(),
        registry_unique: registry_has_no_duplicates(),
        agent_deny_count: acl_count(IpcAclClass::AgentDeny),
        human_only_count: acl_count(IpcAclClass::HumanOnly),
        public_count: acl_count(IpcAclClass::Public),
        hot_path_count: hot_path_count(),
        pty_commands_agent_deny: pty_commands_are_agent_deny(),
        hot_paths_never_pty: hot_paths_are_never_pty(),
        enforcement_note: "declarative governance + call-site Law #48 enforcement; no runtime interception layer",
    }
}

// ============================================================================
// 5. Single registration source (replaces the inline main.rs generate_handler)
// ============================================================================
//
// Invoked from `main.rs` as `aethel_studio_local::register_commands!()`. All paths
// resolve at the invocation site (binary crate), so the binary-only command modules
// (`egui_overlay`, `scene_graph`, `lsp_farm`, `desktop_commands`, …) resolve exactly
// as they did in the old inline list. Order is preserved byte-for-byte from the
// pre-R2 `main.rs` list; `probe_ipc_surface_cmd` is the 99th command, the 11
// re-wired P2g host desktop commands + `probe_wire_reachability_cmd` +
// `run_kernel_wire_reachability_soak_cmd` (R3) + `probe_physics_world_solvers_cmd`
// + `run_kernel_physics_world_solvers_soak_cmd` (R4) complete the surface (114
// commands total).

#[macro_export]
macro_rules! register_commands {
    () => {
        tauri::generate_handler![
            egui_overlay::launch_native_egui_overlay,
            open_panel_window,
            hardware_profiler::hardware_profiler_sample_once,
            wgpu_renderer::renderer_present_probe,
            wgpu_renderer::present_frame,
            wgpu_renderer::renderer_present_probe_last,
            wgpu_renderer::renderer_frame_graph_timings_last,
            product_present_adapter::product_present_honesty_probe,
            product_present_adapter::product_present_try_webview_attach,
            product_present_adapter::product_present_engine_owned_soak,
            engine_owned_present_loop::product_present_persistent_start,
            engine_owned_present_loop::product_present_persistent_stop,
            engine_owned_present_loop::product_present_persistent_status,
            engine_owned_present_loop::product_present_session_claim,
            engine_owned_present_loop::product_present_session_release,
            engine_owned_present_loop::product_present_soak_60s,
            frame_hash_digest::renderer_frame_hash_last,
            physics_commands::poll_physics_state,
            scene_graph::scene_get_nodes,
            scene_graph::scene_select,
            scene_graph::scene_set_visible,
            scene_graph::scene_set_locked,
            scene_graph::scene_update_transform,
            scene_graph::scene_add_node,
            scene_graph::scene_remove_node,
            scene_graph::scene_reparent,
            mmap_commands::mmap_open,
            mmap_commands::mmap_read_range,
            mmap_commands::mmap_close,
            asset_cooker::asset_cooker_start,
            wasm_runtime::wasm_load_module,
            wasm_runtime::wasm_watch_and_hot_reload,
            wasm_runtime::wasm_step,
            wasm_runtime::wasm_host_status,
            motion_matching::motion_matching_evaluate,
            motion_matching::motion_matching_status,
            entropy_gpu_particles::entropy_gpu_particle_soak_cmd,
            entropy_gpu_particles::probe_entropy_gpu_particles_cmd,
            lsp_farm::lsp_farm_honesty,
            lsp_farm::lsp_farm_probe,
            lsp_farm::lsp_farm_spawn,
            lsp_farm::lsp_farm_ensure_session,
            lsp_farm::lsp_farm_did_open,
            lsp_farm::lsp_farm_did_change,
            lsp_farm::lsp_farm_poll_diagnostics,
            lsp_farm::lsp_farm_request,
            lsp_farm::lsp_farm_list,
            lsp_farm::lsp_farm_stop,
            lsp_farm::lsp_farm_ipc_probe,
            desktop_commands::terminal_create,
            desktop_commands::terminal_write,
            desktop_commands::terminal_resize,
            desktop_commands::terminal_close,
            desktop_commands::terminal_acl_probe,
            // Round R2: P2g disconnection ended — the 11 host desktop commands are
            // re-wired with Law #48 AgentDeny ACL (see IPC_ACL_REGISTRY).
            desktop_commands::fs_read,
            desktop_commands::fs_write,
            desktop_commands::fs_list,
            desktop_commands::fs_tree,
            desktop_commands::fs_watch,
            desktop_commands::notify_native,
            desktop_commands::ai_complete,
            desktop_commands::window_minimize,
            desktop_commands::window_toggle_maximize,
            desktop_commands::window_close,
            desktop_commands::run_moa_orchestrator,
            aethel_studio_local::plugin_sandbox::execute_sandbox_plugin,
            aethel_studio_local::plugin_sandbox::start_sandbox_telemetry,
            aethel_studio_local::plugin_sandbox::export_vibe_embedding,
            aethel_studio_local::plugin_sandbox::register_user_aesthetic_override,
            aethel_studio_local::wasm_shield::probe_wasm_shield_cmd,
            aethel_studio_local::wasm_shield::wasm_shield_agent_pty_deny_cmd,
            aethel_studio_local::rendering_quarantine::probe_rendering_quarantine_cmd,
            aethel_studio_local::gameplay_ability_system::probe_gas_binary_ipc_tick_cmd,
            aethel_studio_local::gameplay_ability_system::gas_binary_ipc_roundtrip_cmd,
            aethel_studio_local::ipc::gas_sab_ring::probe_gas_sab_ring_cmd,
            aethel_studio_local::gameplay_ability_system::driver::run_gas_sim_driver_soak_cmd,
            aethel_studio_local::gameplay_ability_system::fixtures::run_gf_gas_001_soak_cmd,
            aethel_studio_local::gameplay_ability_system::fixtures::run_gf_gas_002_gate_matrix_cmd,
            aethel_studio_local::gameplay_ability_system::fixtures::run_gf_net_001_rollback_soak_cmd,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_start,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_stop,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_step,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_record_command,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_read_frame,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_pop_frame,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_metrics,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_sustained_soak,
            aethel_studio_local::gameplay_ability_system::runtime::run_gas_runtime_sustained_soak_cmd,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_honesty_probe,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_entity_count,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_unified_id_for_entity,
            aethel_studio_local::gameplay_ability_system::runtime::gas_runtime_entity_from_unified,
            aethel_studio_local::gameplay_ability_system::unified_id::gas_unified_id_probe_cmd,
            aethel_studio_local::gameplay_ability_system::unified_id::run_gas_unified_id_roundtrip_cmd,
            aethel_studio_local::gameplay_ability_system::duplex::physics_gas_duplex_probe_cmd,
            aethel_studio_local::gameplay_ability_system::duplex::run_physics_gas_duplex_soak_cmd,
            aethel_studio_local::gameplay_ability_system::duplex::run_physics_gas_joint_replay_soak_cmd,
            aethel_studio_local::gameplay_ability_system::replication::s6_replication_probe_cmd,
            aethel_studio_local::gameplay_ability_system::replication::run_s6_replication_soak_cmd,
            aethel_studio_local::gameplay_ability_system::data_assets::data_assets_registry_probe_cmd,
            aethel_studio_local::gameplay_ability_system::data_assets::run_data_assets_cook_soak_cmd,
            aethel_studio_local::gameplay_ability_system::state_tree::state_tree_runtime_probe_cmd,
            aethel_studio_local::gameplay_ability_system::state_tree::run_state_tree_soak_cmd,
            aethel_studio_local::gameplay_ability_system::tags::run_tag_query_benchmark_cmd,
            local_runtime_health,
            local_runtime_probe,
            local_runtime_probe_report,
            local_runtime_sidecars,
            native_kernel_manifest,
            jobs_route,
            jobs_list,
            jobs_cancel,
            aethel_studio_local::kernel_foundation_honesty_wire::probe_kernel_foundation_cmd,
            aethel_studio_local::kernel_micro_poly_cull_wire::probe_micro_poly_cull_cmd,
            aethel_studio_local::kernel_position_based_dynamics_wire::probe_position_based_dynamics_cmd,
            aethel_studio_local::kernel_position_based_dynamics_wire::run_kernel_position_based_dynamics_soak_cmd,
            aethel_studio_local::kernel_risk_envelope_wire::probe_risk_envelope_cmd,
            gpu_culling::probe_gpu_culling_frustum_soak_cmd,
            aethel_studio_local::ipc_surface::probe_ipc_surface_cmd,
            aethel_studio_local::kernel_wire_reachability_wire::probe_wire_reachability_cmd,
            aethel_studio_local::kernel_wire_reachability_wire::run_kernel_wire_reachability_soak_cmd,
            aethel_studio_local::kernel_physics_world_solvers_wire::probe_physics_world_solvers_cmd,
            aethel_studio_local::kernel_physics_world_solvers_wire::run_kernel_physics_world_solvers_soak_cmd,
            aethel_studio_local::kernel_aethel_matter_model_wire::probe_aethel_matter_model_cmd,
            aethel_studio_local::kernel_aethel_matter_model_wire::run_kernel_aethel_matter_model_soak_cmd,
            aethel_studio_local::kernel_living_sky_fluid_ocean_buoyancy_wire::probe_living_sky_fluid_ocean_buoyancy_cmd,
            aethel_studio_local::kernel_living_sky_fluid_ocean_buoyancy_wire::run_kernel_living_sky_fluid_ocean_buoyancy_soak_cmd,
            aethel_studio_local::kernel_procedural_muscle_locomotion_wire::probe_procedural_muscle_locomotion_cmd,
            aethel_studio_local::kernel_procedural_muscle_locomotion_wire::run_kernel_procedural_muscle_locomotion_soak_cmd,
            aethel_studio_local::kernel_neural_physics_co_sim_wire::probe_neural_physics_co_sim_cmd,
            aethel_studio_local::kernel_neural_physics_co_sim_wire::run_kernel_neural_physics_co_sim_soak_cmd,
            aethel_studio_local::kernel_task_graph_scheduler_wire::probe_task_graph_scheduler_cmd,
            aethel_studio_local::kernel_task_graph_scheduler_wire::run_kernel_task_graph_scheduler_soak_cmd,
            aethel_studio_local::kernel_spatial_partition_hibernation_wire::probe_spatial_partition_hibernation_cmd,
            aethel_studio_local::kernel_spatial_partition_hibernation_wire::run_kernel_spatial_partition_hibernation_soak_cmd,
            aethel_studio_local::kernel_sequencing_timeline_wire::probe_sequencing_timeline_cmd,
            aethel_studio_local::kernel_sequencing_timeline_wire::run_kernel_sequencing_timeline_soak_cmd,
            aethel_studio_local::kernel_sdf_contact_blending_wire::probe_sdf_contact_blending_cmd,
            aethel_studio_local::kernel_sdf_contact_blending_wire::run_kernel_sdf_contact_blending_soak_cmd,
            aethel_studio_local::kernel_micro_shadow_bent_normals_wire::probe_micro_shadow_bent_normals_cmd,
            aethel_studio_local::kernel_micro_shadow_bent_normals_wire::run_kernel_micro_shadow_bent_normals_soak_cmd,
            aethel_studio_local::kernel_dynamic_surface_deformation_wire::probe_dynamic_surface_deformation_cmd,
            aethel_studio_local::kernel_dynamic_surface_deformation_wire::run_kernel_dynamic_surface_deformation_soak_cmd,
            aethel_studio_local::kernel_async_compute_scheduler_wire::probe_async_compute_scheduler_cmd,
            aethel_studio_local::kernel_async_compute_scheduler_wire::run_kernel_async_compute_scheduler_soak_cmd,
            aethel_studio_local::kernel_auto_photography_director_wire::probe_auto_photography_director_cmd,
            aethel_studio_local::kernel_auto_photography_director_wire::run_kernel_auto_photography_director_soak_cmd,
            aethel_studio_local::kernel_celestial_orbital_dynamics_wire::probe_celestial_orbital_dynamics_cmd,
            aethel_studio_local::kernel_celestial_orbital_dynamics_wire::run_kernel_celestial_orbital_dynamics_soak_cmd,
            aethel_studio_local::kernel_cinema_frame_graph_composition_wire::probe_cinema_frame_graph_composition_cmd,
            aethel_studio_local::kernel_cinema_frame_graph_composition_wire::run_kernel_cinema_frame_graph_composition_soak_cmd,
            aethel_studio_local::kernel_cinema_hot_loop_composition_wire::probe_cinema_hot_loop_composition_cmd,
            aethel_studio_local::kernel_cinema_hot_loop_composition_wire::run_kernel_cinema_hot_loop_composition_soak_cmd,
            aethel_studio_local::kernel_dynamic_shader_rewriter_wire::probe_dynamic_shader_rewriter_cmd,
            aethel_studio_local::kernel_dynamic_shader_rewriter_wire::run_kernel_dynamic_shader_rewriter_soak_cmd,
            aethel_studio_local::kernel_euphoria_balance_controller_wire::probe_euphoria_balance_controller_cmd,
            aethel_studio_local::kernel_euphoria_balance_controller_wire::run_kernel_euphoria_balance_controller_soak_cmd,
            aethel_studio_local::kernel_flight_aerodynamics_wire::probe_flight_aerodynamics_cmd,
            aethel_studio_local::kernel_flight_aerodynamics_wire::run_kernel_flight_aerodynamics_soak_cmd,
            aethel_studio_local::kernel_world_forge_densification_wire::probe_world_forge_densification_cmd,
            aethel_studio_local::kernel_world_forge_densification_wire::run_kernel_world_forge_densification_soak_cmd,
            aethel_studio_local::kernel_wind_field_dynamics_wire::probe_wind_field_dynamics_cmd,
            aethel_studio_local::kernel_wind_field_dynamics_wire::run_kernel_wind_field_dynamics_soak_cmd,
            aethel_studio_local::kernel_vehicle_chassis_dynamics_wire::probe_vehicle_chassis_dynamics_cmd,
            aethel_studio_local::kernel_vehicle_chassis_dynamics_wire::run_kernel_vehicle_chassis_dynamics_soak_cmd,
            aethel_studio_local::kernel_gaze_intent_anticipation_wire::probe_gaze_intent_anticipation_cmd,
            aethel_studio_local::kernel_gaze_intent_anticipation_wire::run_kernel_gaze_intent_anticipation_soak_cmd,
            aethel_studio_local::kernel_holographic_scene_tensor_wire::probe_holographic_scene_tensor_cmd,
            aethel_studio_local::kernel_holographic_scene_tensor_wire::run_kernel_holographic_scene_tensor_soak_cmd,
            aethel_studio_local::kernel_latent_dreamspace_bytecode_wire::probe_latent_dreamspace_bytecode_cmd,
            aethel_studio_local::kernel_latent_dreamspace_bytecode_wire::run_kernel_latent_dreamspace_bytecode_soak_cmd,
            aethel_studio_local::kernel_matter_memory_scarring_wire::probe_matter_memory_scarring_cmd,
            aethel_studio_local::kernel_matter_memory_scarring_wire::run_kernel_matter_memory_scarring_soak_cmd,
            aethel_studio_local::kernel_micro_dream_gpu_pass_wire::probe_micro_dream_gpu_pass_cmd,
            aethel_studio_local::kernel_micro_dream_gpu_pass_wire::run_kernel_micro_dream_gpu_pass_soak_cmd,
            aethel_studio_local::kernel_multiverse_rollback_branching_wire::probe_multiverse_rollback_branching_cmd,
            aethel_studio_local::kernel_multiverse_rollback_branching_wire::run_kernel_multiverse_rollback_branching_soak_cmd,
            aethel_studio_local::kernel_narrative_tension_clock_wire::probe_narrative_tension_clock_cmd,
            aethel_studio_local::kernel_narrative_tension_clock_wire::run_kernel_narrative_tension_clock_soak_cmd,
            aethel_studio_local::kernel_synesthetic_resonance_matrix_wire::probe_synesthetic_resonance_matrix_cmd,
            aethel_studio_local::kernel_synesthetic_resonance_matrix_wire::run_kernel_synesthetic_resonance_matrix_soak_cmd,
            gf_mesh_001_fixture::run_gf_mesh_001_golden_cmd,
            gf_mesh_001_gpu_parity_fixture::run_gf_mesh_001_gpu_parity_cmd,
            present_command_channel::present_command_send_cmd,
            present_command_channel::probe_present_command_channel_cmd,
            product_screenshot_gate::run_product_screenshot_gate_cmd,
            gpu_terminal_renderer::gpu_terminal_probe_cmd,
            gf_integrated_scene_001_fixture::run_gf_integrated_scene_001_cmd,
        ]
    };
}

// ============================================================================
// 6. AAA test suite — exact invariants, fail-closed, deterministic
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_matches_the_declared_surface_count() {
        assert_eq!(IPC_ACL_REGISTRY.len(), REGISTERED_COMMAND_COUNT);
        assert_eq!(registry_len(), REGISTERED_COMMAND_COUNT);
        assert_eq!(REGISTERED_COMMAND_COUNT, 188);
    }

    #[test]
    fn registry_is_sorted_and_unique() {
        assert!(registry_is_sorted());
        assert!(registry_has_no_duplicates());
    }

    #[test]
    fn acl_class_counts_match_the_documented_split() {
        assert_eq!(acl_count(IpcAclClass::AgentDeny), AGENT_DENY_COMMAND_COUNT);
        assert_eq!(acl_count(IpcAclClass::HumanOnly), HUMAN_ONLY_COMMAND_COUNT);
        assert_eq!(acl_count(IpcAclClass::Public), PUBLIC_COMMAND_COUNT);
    }

    #[test]
    fn hot_path_count_matches_the_documented_set() {
        assert_eq!(hot_path_count(), HOT_PATH_COMMAND_COUNT);
    }

    #[test]
    fn pty_commands_are_all_agent_deny() {
        assert!(pty_commands_are_agent_deny());
    }

    #[test]
    fn hot_paths_are_never_pty_invariant() {
        assert!(super::hot_paths_are_never_pty());
    }

    #[test]
    fn law_48_agent_deny_set_is_exact() {
        for name in [
            "terminal_create",
            "terminal_write",
            "terminal_resize",
            "terminal_close",
            "terminal_acl_probe",
            "wasm_shield_agent_pty_deny_cmd",
            "ai_complete",
            "fs_list",
            "fs_read",
            "fs_tree",
            "fs_watch",
            "fs_write",
            "notify_native",
            "run_moa_orchestrator",
            "window_close",
            "window_minimize",
            "window_toggle_maximize",
        ] {
            assert_eq!(
                acl_for(name).unwrap().acl,
                IpcAclClass::AgentDeny,
                "{name} must be AgentDeny"
            );
        }
    }

    #[test]
    fn human_only_set_is_exact() {
        for name in [
            "scene_add_node",
            "scene_remove_node",
            "scene_reparent",
            "scene_set_locked",
            "scene_set_visible",
            "scene_update_transform",
            "mmap_open",
            "mmap_read_range",
            "mmap_close",
            "lsp_farm_spawn",
            "lsp_farm_stop",
            "gas_runtime_record_command",
            "wasm_load_module",
            "wasm_watch_and_hot_reload",
            "register_user_aesthetic_override",
            "jobs_route",
            "jobs_cancel",
        ] {
            assert_eq!(
                acl_for(name).unwrap().acl,
                IpcAclClass::HumanOnly,
                "{name} must be HumanOnly"
            );
        }
    }

    #[test]
    fn scene_reads_are_public() {
        for name in ["scene_get_nodes", "scene_select"] {
            assert_eq!(acl_for(name).unwrap().acl, IpcAclClass::Public);
        }
    }

    #[test]
    fn sab_hot_paths_are_flagged() {
        for name in [
            "probe_gas_sab_ring_cmd",
            "probe_gas_binary_ipc_tick_cmd",
            "gas_binary_ipc_roundtrip_cmd",
            "gas_runtime_read_frame",
            "gas_runtime_pop_frame",
            "gas_runtime_step",
            "gas_runtime_metrics",
            "gas_runtime_entity_count",
            "poll_physics_state",
            "wasm_step",
            "present_frame",
            "renderer_present_probe",
            "renderer_frame_graph_timings_last",
            "probe_micro_poly_cull_cmd",
            "motion_matching_evaluate",
            "run_gas_sim_driver_soak_cmd",
        ] {
            assert!(
                acl_for(name).unwrap().hot_path,
                "{name} must be a hot path"
            );
        }
    }

    #[test]
    fn probe_is_public_and_on_the_surface() {
        let entry = acl_for("probe_ipc_surface_cmd").unwrap();
        assert_eq!(entry.acl, IpcAclClass::Public);
        assert_eq!(entry.category, IpcCategory::KernelWire);
    }

    #[test]
    fn unknown_command_is_fail_closed_none() {
        assert!(acl_for("does_not_exist_cmd").is_none());
    }

    #[test]
    fn probe_reports_registry_honestly() {
        let report = probe_ipc_surface_cmd();
        assert_eq!(report.version, IPC_SURFACE_VERSION);
        assert_eq!(report.declared_command_count, REGISTERED_COMMAND_COUNT);
        assert_eq!(report.registry_len, REGISTERED_COMMAND_COUNT);
        assert!(report.surface_declared);
        assert!(report.registry_sorted);
        assert!(report.registry_unique);
        assert_eq!(report.agent_deny_count, AGENT_DENY_COMMAND_COUNT);
        assert_eq!(report.human_only_count, HUMAN_ONLY_COMMAND_COUNT);
        assert_eq!(report.public_count, PUBLIC_COMMAND_COUNT);
        assert_eq!(report.hot_path_count, HOT_PATH_COMMAND_COUNT);
        assert!(report.pty_commands_agent_deny);
        assert!(report.hot_paths_never_pty);
        assert!(report.enforcement_note.contains("declarative"));
    }

    #[test]
    fn probe_never_claims_aaa_readiness() {
        let note = probe_ipc_surface_cmd().enforcement_note;
        assert!(!note.contains("aaa") && !note.contains("ready"), "honest note must not claim AAA readiness");
    }

    #[test]
    fn re_wired_host_desktop_commands_are_agent_deny_and_not_hot_path() {
        for name in [
            "fs_read",
            "fs_write",
            "fs_list",
            "fs_tree",
            "fs_watch",
            "notify_native",
            "ai_complete",
            "window_minimize",
            "window_toggle_maximize",
            "window_close",
            "run_moa_orchestrator",
        ] {
            let entry = acl_for(name).expect("re-wired command is registered");
            assert_eq!(entry.acl, IpcAclClass::AgentDeny, "{name} must be AgentDeny");
            assert!(!entry.hot_path, "{name} is a host command, never a 60 Hz hot path");
        }
    }

    #[test]
    fn new_categories_are_tagged_stably() {
        assert_eq!(IpcCategory::Filesystem.tag(), "filesystem");
        assert_eq!(IpcCategory::Window.tag(), "window");
        assert_eq!(IpcCategory::Ai.tag(), "ai");
    }
}
