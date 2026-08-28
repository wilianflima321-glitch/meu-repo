//! # S-15 Wire-Reachability Runtime Telemetry (round R3)
//!
//! Doctrine #73 (Kernel Physics Supremacy) — **Zero Amnesia** sobre o gap
//! compile-vs-reachable (S-01) que a telemetria R3 torna observável.
//!
//! ## O problema que este módulo resolve
//!
//! O registro S-11 ([`crate::kernel_registry`]) declara `Active` para uma wire
//! quando ela está registrada em `tauri::generate_handler!` **em tempo de
//! compilação**. Isso não prova que o comando probe da wire ainda está presente
//! na superfície IPC **em tempo de execução**: alguém pode remover a entrada do
//! `IPC_ACL_REGISTRY`, renomear o comando ou desconectar o wire sem tocar no
//! registro S-11 — e o build continuaria verde enquanto a wire vira
//! compile-declared-but-runtime-unreachable.
//!
//! R3 fecha esse gap com um **classificador puro, determinístico e fail-closed**:
//! para cada wire ACTIVE mapeada em [`ACTIVE_WIRE_PROBE_CMDS`], ele verifica se o
//! comando probe correspondente está presente na superfície IPC *fornecida como
//! predicado pelo chamador* (o Studio Local injeta
//! `|cmd| ipc_surface::acl_for(cmd).is_some()`). O resultado é o **status de
//! runtime** de cada wire:
//!
//! - **`Active`** — declarada `Active` no registro S-11 **E** o comando probe está
//!   na superfície IPC de runtime.
//! - **`Wired`** — declarada `Active`, porém o comando probe **não** está na
//!   superfície (deriva de runtime = o gap S-01 que a telemetria mede).
//! - **`Unknown`** — wire no mapeamento probe que **não existe** no registro S-11
//!   (fail-closed: tabela apontando para módulo fantasma).
//!
//! ## Pureza e determinismo
//!
//! O kernel **não** conhece a superfície Tauri do Studio. O predicado
//! `surface_contains` é injetado pelo chamador, o que mantém este módulo puro,
//! testável com fechamentos artificiais e idêntico em qualquer host.
//!
//! ## Invariantes que os testes fixam
//!
//! - [`ACTIVE_WIRE_PROBE_CMDS`] é **exatamente** o conjunto `ACTIVE_WIRE_MODULES`
//!   do registro S-11 (35 wires; nenhuma a mais, nenhuma a menos, sem duplicatas).
//! - Todas presentes na superfície → `consistent == true`.
//! - Perder um probe → `drift` medido (`runtime_wired >= 1`), `consistent == false`.
//! - Wire fora do registro → `Unknown` (fail-closed), nunca `Active`.
//! - Determinismo: mesmo predicado → mesmas linhas e mesmo resumo.


/// Classificação de runtime de uma wire (diferente do status declarado S-11).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WireRuntimeClass {
    /// Declarada `Active` no registro S-11 **e** comando probe na superfície.
    Active,
    /// Declarada `Active`, porém probe ausente da superfície (gap S-01) — ou
    /// wire declarada não-`Active` no mapeamento probe (fail-closed).
    Wired,
    /// Wire do mapeamento probe ausente do registro S-11 (módulo fantasma).
    Unknown,
}

impl WireRuntimeClass {
    /// Tag estável para telemetria / serde (nunca deriva de debug).
    pub const fn tag(self) -> &'static str {
        match self {
            WireRuntimeClass::Active => "active",
            WireRuntimeClass::Wired => "wired",
            WireRuntimeClass::Unknown => "unknown",
        }
    }

    /// `true` apenas quando o runtime classifica a wire como totalmente ativa.
    pub const fn is_reachable(self) -> bool {
        matches!(self, WireRuntimeClass::Active)
    }
}

/// Uma linha da telemetria de runtime: uma wire ACTIVE e seu comando probe.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WireReachabilityRow {
    /// Nome do módulo wire no Studio Local (ex.: `"kernel_risk_envelope_wire"`).
    pub wire_module: &'static str,
    /// Nome do comando Tauri que expõe o probe da wire.
    pub probe_cmd: &'static str,
    /// Status **declarado** no registro S-11 (`active` / `wire` / `held`).
    pub declared_status: &'static str,
    /// Classificação de **runtime** medida pela telemetria.
    pub runtime_class: WireRuntimeClass,
    /// `true` se o comando probe existe na superfície IPC injetada.
    pub probe_on_surface: bool,
    /// Letra documentada da wire (vazia = dívida de completude S-11).
    pub letter: &'static str,
}

/// Resumo agregado da telemetria de runtime (feed para o registro S-01/S-11).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WireReachabilitySummary {
    /// Total de wires no registro S-11 (`registry_total()`).
    pub total_wires: usize,
    /// Wires declaradas `Active` no registro (`reachable_wires()`).
    pub declared_active: usize,
    /// Wires cobertas pelo mapeamento probe ([`ACTIVE_WIRE_PROBE_CMDS`]).
    pub probed_wires: usize,
    /// Wires classificadas `Active` em runtime (declarada + probe na superfície).
    pub runtime_active: usize,
    /// Wires com deriva: declaradas ativas porém probe ausente (gap S-01).
    pub runtime_wired: usize,
    /// Wires do mapeamento probe ausentes do registro (módulo fantasma).
    pub unknown: usize,
    /// Wires declaradas `Active` no registro sem entrada no mapeamento probe.
    pub registry_active_without_probe: usize,
    /// `true` quando não há deriva: declaração e runtime coincidem.
    pub consistent: bool,
    /// Verdicto textual honesto (nunca afirma prontidão AAA).
    pub verdict: &'static str,
}

/// Mapeamento wire ACTIVE → comando probe (espelha `ACTIVE_WIRE_MODULES` do
/// registro S-11). Alterar um lado sem o outro falha nos testes (fail-closed).
pub const ACTIVE_WIRE_PROBE_CMDS: &[(&str, &str)] = &[
    (
        "kernel_aethel_matter_model_wire",
        "probe_aethel_matter_model_cmd",
    ),
    (
        "kernel_async_compute_scheduler_wire",
        "probe_async_compute_scheduler_cmd",
    ),
    (
        "kernel_auto_photography_director_wire",
        "probe_auto_photography_director_cmd",
    ),
    (
        "kernel_celestial_orbital_dynamics_wire",
        "probe_celestial_orbital_dynamics_cmd",
    ),
    (
        "kernel_cinema_frame_graph_composition_wire",
        "probe_cinema_frame_graph_composition_cmd",
    ),
    (
        "kernel_cinema_hot_loop_composition_wire",
        "probe_cinema_hot_loop_composition_cmd",
    ),
    (
        "kernel_dynamic_shader_rewriter_wire",
        "probe_dynamic_shader_rewriter_cmd",
    ),
    (
        "kernel_dynamic_surface_deformation_wire",
        "probe_dynamic_surface_deformation_cmd",
    ),
    (
        "kernel_euphoria_balance_controller_wire",
        "probe_euphoria_balance_controller_cmd",
    ),
    (
        "kernel_flight_aerodynamics_wire",
        "probe_flight_aerodynamics_cmd",
    ),
    (
        "kernel_foundation_honesty_wire",
        "probe_kernel_foundation_cmd",
    ),
    (
        "kernel_gaze_intent_anticipation_wire",
        "probe_gaze_intent_anticipation_cmd",
    ),
    (
        "kernel_holographic_scene_tensor_wire",
        "probe_holographic_scene_tensor_cmd",
    ),
    (
        "kernel_latent_dreamspace_bytecode_wire",
        "probe_latent_dreamspace_bytecode_cmd",
    ),
    (
        "kernel_living_sky_fluid_ocean_buoyancy_wire",
        "probe_living_sky_fluid_ocean_buoyancy_cmd",
    ),
    (
        "kernel_matter_memory_scarring_wire",
        "probe_matter_memory_scarring_cmd",
    ),
    (
        "kernel_micro_dream_gpu_pass_wire",
        "probe_micro_dream_gpu_pass_cmd",
    ),
    (
        "kernel_micro_poly_cull_wire",
        "probe_micro_poly_cull_cmd",
    ),
    (
        "kernel_micro_shadow_bent_normals_wire",
        "probe_micro_shadow_bent_normals_cmd",
    ),
    (
        "kernel_multiverse_rollback_branching_wire",
        "probe_multiverse_rollback_branching_cmd",
    ),
    (
        "kernel_narrative_tension_clock_wire",
        "probe_narrative_tension_clock_cmd",
    ),
    (
        "kernel_neural_physics_co_sim_wire",
        "probe_neural_physics_co_sim_cmd",
    ),
    (
        "kernel_physics_world_solvers_wire",
        "probe_physics_world_solvers_cmd",
    ),
    (
        "kernel_position_based_dynamics_wire",
        "probe_position_based_dynamics_cmd",
    ),
    (
        "kernel_procedural_muscle_locomotion_wire",
        "probe_procedural_muscle_locomotion_cmd",
    ),
    ("kernel_risk_envelope_wire", "probe_risk_envelope_cmd"),
    (
        "kernel_sdf_contact_blending_wire",
        "probe_sdf_contact_blending_cmd",
    ),
    (
        "kernel_sequencing_timeline_wire",
        "probe_sequencing_timeline_cmd",
    ),
    (
        "kernel_spatial_partition_hibernation_wire",
        "probe_spatial_partition_hibernation_cmd",
    ),
    (
        "kernel_synesthetic_resonance_matrix_wire",
        "probe_synesthetic_resonance_matrix_cmd",
    ),
    (
        "kernel_task_graph_scheduler_wire",
        "probe_task_graph_scheduler_cmd",
    ),
    (
        "kernel_vehicle_chassis_dynamics_wire",
        "probe_vehicle_chassis_dynamics_cmd",
    ),
    (
        "kernel_wind_field_dynamics_wire",
        "probe_wind_field_dynamics_cmd",
    ),
    (
        "kernel_wire_reachability_wire",
        "probe_wire_reachability_cmd",
    ),
    (
        "kernel_world_forge_densification_wire",
        "probe_world_forge_densification_cmd",
    ),
];

/// Classifica **uma** wire contra um predicado de superfície. Exposição pública
/// para teste fail-closed de wire fantasma (ver [`classify_wire_reachability`]).
///
/// **Semântica fail-closed:** só vira `Active` quando a wire está declarada
/// `Active` no registro S-11 **e** o comando probe está na superfície. Qualquer
/// outra combinação é `Wired` (declarada mas não alcançável, ou alcançável mas
/// não declarada ativa); wire inexistente no registro é `Unknown`.
pub fn classify_row<F>(
    surface_contains: &F,
    wire_module: &'static str,
    probe_cmd: &'static str,
) -> WireReachabilityRow
where
    F: Fn(&str) -> bool,
{
    let probe_on_surface = surface_contains(probe_cmd);
    match crate::kernel_registry::entry_by_wire_module(wire_module) {
        Some(entry) => {
            let runtime_class = if entry.status.is_reachable() && probe_on_surface {
                WireRuntimeClass::Active
            } else {
                WireRuntimeClass::Wired
            };
            WireReachabilityRow {
                wire_module,
                probe_cmd,
                declared_status: entry.status.tag(),
                runtime_class,
                probe_on_surface,
                letter: entry.letter,
            }
        }
        None => WireReachabilityRow {
            wire_module,
            probe_cmd,
            declared_status: "unknown",
            runtime_class: WireRuntimeClass::Unknown,
            probe_on_surface,
            letter: "",
        },
    }
}

/// Conta as wires declaradas `Active` no registro que **não** possuem entrada no
/// mapeamento probe dado (drift de completude: o registro diz ativa, a telemetria
/// não a cobre). Fail-closed quando `ACTIVE_WIRE_MODULES` e a tabela divergem.
pub fn registry_active_without_probe(probe_table: &[(&'static str, &'static str)]) -> usize {
    crate::kernel_registry::KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.status.is_reachable())
        .filter(|e| !probe_table.iter().any(|(wm, _)| *wm == e.wire_module))
        .count()
}

/// Classifica todas as wires ACTIVE contra o predicado de superfície injetado.
/// Retorna as linhas por wire (ordem da tabela, determinística) e o resumo
/// agregado. O resumo é **honesto**: nunca afirma prontidão AAA — apenas relata
/// consistência entre a declaração S-11 e a superfície de runtime.
pub fn classify_wire_reachability<F>(
    surface_contains: F,
) -> (Vec<WireReachabilityRow>, WireReachabilitySummary)
where
    F: Fn(&str) -> bool,
{
    let rows: Vec<WireReachabilityRow> = ACTIVE_WIRE_PROBE_CMDS
        .iter()
        .copied()
        .map(|(wire_module, probe_cmd)| classify_row(&surface_contains, wire_module, probe_cmd))
        .collect();

    let runtime_active = rows
        .iter()
        .filter(|r| r.runtime_class == WireRuntimeClass::Active)
        .count();
    let runtime_wired = rows
        .iter()
        .filter(|r| r.runtime_class == WireRuntimeClass::Wired)
        .count();
    let unknown = rows
        .iter()
        .filter(|r| r.runtime_class == WireRuntimeClass::Unknown)
        .count();

    let declared_active = crate::kernel_registry::reachable_wires();
    let probed_wires = ACTIVE_WIRE_PROBE_CMDS.len();
    let registry_active_without_probe = registry_active_without_probe(ACTIVE_WIRE_PROBE_CMDS);

    let consistent = runtime_wired == 0
        && unknown == 0
        && registry_active_without_probe == 0
        && probed_wires == declared_active;

    let verdict = if consistent {
        "consistent: every declared-Active wire is reachable on the runtime IPC surface"
    } else {
        "drift: declared-Active wire(s) are not reachable at runtime (S-01 compile-vs-reachable gap)"
    };

    let summary = WireReachabilitySummary {
        total_wires: crate::kernel_registry::registry_total(),
        declared_active,
        probed_wires,
        runtime_active,
        runtime_wired,
        unknown,
        registry_active_without_probe,
        consistent,
        verdict,
    };

    (rows, summary)
}

// ---------------------------------------------------------------------------
// Soak-honesty layer — measured, deterministic replay (letter s15).
// Replicates the per-module honesty convention (R0/R1): evidence is measured,
// never assumed; AAA/coins/agones/nanite/dlss/quic stay HELD (false).
// ---------------------------------------------------------------------------

fn fnv1a(mut hash: u64, data: &[u8]) -> u64 {
    for b in data {
        hash ^= u64::from(*b);
        hash = hash.wrapping_mul(0x0000_0100_0000_01b3);
    }
    hash
}

/// Measured (never assumed) evidence for the wire-reachability soak.
#[derive(Debug, Clone)]
struct ReachabilityMeasured {
    total_wires: usize,
    declared_active: usize,
    probed_wires: usize,
    full_runtime_active: usize,
    full_runtime_wired: usize,
    full_consistent: bool,
    drift_runtime_active: usize,
    drift_runtime_wired: usize,
    drift_detected: bool,
    fail_closed_runtime_active: usize,
    fail_closed_runtime_wired: usize,
    fail_closed_holds: bool,
    no_unknown_on_full_surface: bool,
    no_registry_active_without_probe: bool,
}

/// Superfície artificial completa: todos os probes ACTIVE declarados presentes.
fn full_surface(cmd: &str) -> bool {
    matches!(
        cmd,
        "probe_aethel_matter_model_cmd"
            | "probe_async_compute_scheduler_cmd"
            | "probe_auto_photography_director_cmd"
            | "probe_celestial_orbital_dynamics_cmd"
            | "probe_cinema_frame_graph_composition_cmd"
            | "probe_cinema_hot_loop_composition_cmd"
            | "probe_dynamic_shader_rewriter_cmd"
            | "probe_dynamic_surface_deformation_cmd"
            | "probe_euphoria_balance_controller_cmd"
            | "probe_flight_aerodynamics_cmd"
            | "probe_kernel_foundation_cmd"
            | "probe_gaze_intent_anticipation_cmd"
            | "probe_holographic_scene_tensor_cmd"
            | "probe_latent_dreamspace_bytecode_cmd"
            | "probe_living_sky_fluid_ocean_buoyancy_cmd"
            | "probe_matter_memory_scarring_cmd"
            | "probe_micro_dream_gpu_pass_cmd"
            | "probe_micro_poly_cull_cmd"
            | "probe_micro_shadow_bent_normals_cmd"
            | "probe_multiverse_rollback_branching_cmd"
            | "probe_narrative_tension_clock_cmd"
            | "probe_neural_physics_co_sim_cmd"
            | "probe_physics_world_solvers_cmd"
            | "probe_position_based_dynamics_cmd"
            | "probe_procedural_muscle_locomotion_cmd"
            | "probe_risk_envelope_cmd"
            | "probe_sdf_contact_blending_cmd"
            | "probe_sequencing_timeline_cmd"
            | "probe_spatial_partition_hibernation_cmd"
            | "probe_synesthetic_resonance_matrix_cmd"
            | "probe_task_graph_scheduler_cmd"
            | "probe_vehicle_chassis_dynamics_cmd"
            | "probe_wind_field_dynamics_cmd"
            | "probe_wire_reachability_cmd"
            | "probe_world_forge_densification_cmd"
    )
}

fn run_measured_pass() -> ReachabilityMeasured {
    let (_, full) = classify_wire_reachability(full_surface);
    let (_, drift) = classify_wire_reachability(|cmd: &str| cmd != "probe_risk_envelope_cmd");
    let (_, empty) = classify_wire_reachability(|_| false);

    let no_unknown_on_full_surface = full.unknown == 0;
    let no_registry_active_without_probe = full.registry_active_without_probe == 0;
    let drift_detected =
        !drift.consistent && drift.runtime_active == 34 && drift.runtime_wired == 1;
    let fail_closed_holds = empty.runtime_active == 0
        && empty.runtime_wired == full.declared_active
        && !empty.consistent;

    ReachabilityMeasured {
        total_wires: full.total_wires,
        declared_active: full.declared_active,
        probed_wires: full.probed_wires,
        full_runtime_active: full.runtime_active,
        full_runtime_wired: full.runtime_wired,
        full_consistent: full.consistent,
        drift_runtime_active: drift.runtime_active,
        drift_runtime_wired: drift.runtime_wired,
        drift_detected,
        fail_closed_runtime_active: empty.runtime_active,
        fail_closed_runtime_wired: empty.runtime_wired,
        fail_closed_holds,
        no_unknown_on_full_surface,
        no_registry_active_without_probe,
    }
}

fn reachability_evidence_fingerprint(m: &ReachabilityMeasured) -> u64 {
    let mut fp = fnv1a(0xcbf2_9ce4_8422_2325, b"wire_reachability");
    for bits in [
        m.total_wires as u64,
        m.declared_active as u64,
        m.probed_wires as u64,
        m.full_runtime_active as u64,
        m.full_runtime_wired as u64,
        m.drift_runtime_active as u64,
        m.drift_runtime_wired as u64,
        m.fail_closed_runtime_active as u64,
        m.fail_closed_runtime_wired as u64,
    ] {
        fp = fnv1a(fp, &bits.to_le_bytes());
    }
    for flag in [
        m.full_consistent,
        m.drift_detected,
        m.fail_closed_holds,
        m.no_unknown_on_full_surface,
        m.no_registry_active_without_probe,
    ] {
        fp = fnv1a(fp, &[u8::from(flag)]);
    }
    fp
}

/// Soak report for the wire-reachability telemetry kernel (letter **s15**).
/// Readiness is **measured** — never hardcoded. `full_reachability_aaa_ready` HELD.
#[derive(Debug, Clone, PartialEq)]
pub struct WireReachabilitySoakReport {
    pub wire_reachability_ready: bool,
    pub total_wires: usize,
    pub declared_active: usize,
    pub full_runtime_active: usize,
    pub full_runtime_wired: usize,
    pub full_consistent: bool,
    pub drift_detected: bool,
    pub fail_closed_holds: bool,
    pub deterministic: bool,
    pub total_ticks: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub full_reachability_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub nanite_ready: bool,
    pub dlss_ready: bool,
    pub quic_ready: bool,
}

/// Number of deterministic replay ticks in the wire-reachability soak.
pub const WIRE_REACHABILITY_SOAK_TICKS: u32 = 64;

fn report_from_measured(
    m: &ReachabilityMeasured,
    deterministic: bool,
    total_ticks: u32,
) -> WireReachabilitySoakReport {
    let ready = m.full_consistent
        && m.no_unknown_on_full_surface
        && m.no_registry_active_without_probe
        && m.drift_detected
        && m.fail_closed_holds
        && deterministic;
    WireReachabilitySoakReport {
        wire_reachability_ready: ready,
        total_wires: m.total_wires,
        declared_active: m.declared_active,
        full_runtime_active: m.full_runtime_active,
        full_runtime_wired: m.full_runtime_wired,
        full_consistent: m.full_consistent,
        drift_detected: m.drift_detected,
        fail_closed_holds: m.fail_closed_holds,
        deterministic,
        total_ticks,
        evidence_kind: "s11_declaration_x_surface_runtime".to_string(),
        evidence_fingerprint: reachability_evidence_fingerprint(m),
        full_reachability_aaa_ready: false,
        coins_ready: false,
        agones_ready: false,
        nanite_ready: false,
        dlss_ready: false,
        quic_ready: false,
    }
}

/// Single-pass honesty probe (soak-gated, letter `s15`). Uses the deterministic
/// full artificial surface — the live-surface probe lives in the studio wire.
pub fn probe_wire_reachability() -> WireReachabilitySoakReport {
    report_from_measured(&run_measured_pass(), true, 1)
}

/// Deterministic 64-tick replay of the wire-reachability measurement.
pub fn run_wire_reachability_soak() -> WireReachabilitySoakReport {
    let reference = run_measured_pass();
    let ref_fp = reachability_evidence_fingerprint(&reference);
    let mut deterministic = true;
    for _ in 0..WIRE_REACHABILITY_SOAK_TICKS {
        if reachability_evidence_fingerprint(&run_measured_pass()) != ref_fp {
            deterministic = false;
        }
    }
    report_from_measured(&reference, deterministic, WIRE_REACHABILITY_SOAK_TICKS)
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Superfície artificial com todos os 35 probes ACTIVE presentes
    /// (espelha exatamente `ACTIVE_WIRE_PROBE_CMDS`).
    fn all_probes_surface(cmd: &str) -> bool {
        matches!(
            cmd,
            "probe_aethel_matter_model_cmd"
                | "probe_async_compute_scheduler_cmd"
                | "probe_auto_photography_director_cmd"
                | "probe_celestial_orbital_dynamics_cmd"
                | "probe_cinema_frame_graph_composition_cmd"
                | "probe_cinema_hot_loop_composition_cmd"
                | "probe_dynamic_shader_rewriter_cmd"
                | "probe_dynamic_surface_deformation_cmd"
                | "probe_euphoria_balance_controller_cmd"
                | "probe_flight_aerodynamics_cmd"
                | "probe_kernel_foundation_cmd"
                | "probe_gaze_intent_anticipation_cmd"
                | "probe_holographic_scene_tensor_cmd"
                | "probe_latent_dreamspace_bytecode_cmd"
                | "probe_living_sky_fluid_ocean_buoyancy_cmd"
                | "probe_matter_memory_scarring_cmd"
                | "probe_micro_dream_gpu_pass_cmd"
                | "probe_micro_poly_cull_cmd"
                | "probe_micro_shadow_bent_normals_cmd"
                | "probe_multiverse_rollback_branching_cmd"
                | "probe_narrative_tension_clock_cmd"
                | "probe_neural_physics_co_sim_cmd"
                | "probe_physics_world_solvers_cmd"
                | "probe_position_based_dynamics_cmd"
                | "probe_procedural_muscle_locomotion_cmd"
                | "probe_risk_envelope_cmd"
                | "probe_sdf_contact_blending_cmd"
                | "probe_sequencing_timeline_cmd"
                | "probe_spatial_partition_hibernation_cmd"
                | "probe_synesthetic_resonance_matrix_cmd"
                | "probe_task_graph_scheduler_cmd"
                | "probe_vehicle_chassis_dynamics_cmd"
                | "probe_wind_field_dynamics_cmd"
                | "probe_wire_reachability_cmd"
                | "probe_world_forge_densification_cmd"
        )
    }

    #[test]
    fn probe_table_keys_match_active_wire_modules_exactly() {
        // O mapeamento probe deve ser exatamente o conjunto ACTIVE_WIRE_MODULES
        // (mesmas 35 wires; sem extra, sem falta). Qualquer divergência = falha.
        let mut table: Vec<&str> = ACTIVE_WIRE_PROBE_CMDS
            .iter()
            .map(|(wm, _)| *wm)
            .collect();
        let mut active: Vec<&str> = crate::kernel_registry::ACTIVE_WIRE_MODULES.to_vec();
        table.sort_unstable();
        active.sort_unstable();
        assert_eq!(table, active, "probe table keys must equal ACTIVE_WIRE_MODULES");
    }

    #[test]
    fn probe_table_has_no_duplicate_wire_modules() {
        let mut seen: Vec<&str> = Vec::new();
        for (wm, _) in ACTIVE_WIRE_PROBE_CMDS {
            assert!(
                !seen.contains(wm),
                "duplicate wire module in probe table: {wm}"
            );
            seen.push(wm);
        }
        assert_eq!(seen.len(), 35);
    }

    #[test]
    fn every_probed_wire_has_a_non_empty_letter() {
        // Dívida de completude S-11: toda wire ACTIVE mapeada precisa de letra.
        for (wm, _) in ACTIVE_WIRE_PROBE_CMDS {
            let entry =
                crate::kernel_registry::entry_by_wire_module(wm).expect("probed wire registered");
            assert!(
                !entry.letter.is_empty(),
                "probed wire {wm} must have a documented letter"
            );
        }
    }

    #[test]
    fn classify_all_present_is_consistent() {
        let (_rows, summary) = classify_wire_reachability(all_probes_surface);
        assert_eq!(summary.probed_wires, 35);
        assert_eq!(summary.declared_active, 35);
        assert_eq!(summary.runtime_active, 35);
        assert_eq!(summary.runtime_wired, 0);
        assert_eq!(summary.unknown, 0);
        assert_eq!(summary.registry_active_without_probe, 0);
        assert!(summary.consistent);
        assert!(summary.verdict.contains("consistent"));
        assert_eq!(summary.total_wires, crate::kernel_registry::registry_total());
    }

    #[test]
    fn classify_dropping_one_probe_detects_drift() {
        // Remove `probe_risk_envelope_cmd` da superfície → a wire fica Wired,
        // o resumo reporta drift e consistent vira false (gap S-01 medido).
        let surface = |cmd: &str| cmd != "probe_risk_envelope_cmd";
        let (rows, summary) = classify_wire_reachability(surface);
        assert_eq!(summary.runtime_active, 34);
        assert_eq!(summary.runtime_wired, 1);
        assert_eq!(summary.unknown, 0);
        assert!(!summary.consistent);
        assert!(summary.verdict.contains("drift"));
        let risk = rows
            .iter()
            .find(|r| r.wire_module == "kernel_risk_envelope_wire")
            .expect("risk wire row present");
        assert_eq!(risk.runtime_class, WireRuntimeClass::Wired);
        assert!(!risk.probe_on_surface);
        assert_eq!(
            risk.declared_status,
            crate::kernel_registry::WireStatus::Active.tag()
        );
    }

    #[test]
    fn classify_empty_surface_is_fail_closed_wired() {
        let (_rows, summary) = classify_wire_reachability(|_| false);
        assert_eq!(summary.runtime_active, 0);
        assert_eq!(summary.runtime_wired, 35);
        assert!(!summary.consistent);
        assert!(summary.verdict.contains("drift"));
    }

    #[test]
    fn classify_row_unknown_for_unregistered_wire() {
        // Wire fantasma no mapeamento probe → fail-closed Unknown, nunca Active.
        // Mesmo para wire desconhecida o predicado de superfície é consultado —
        // não há short-circuit antes do lookup no registro. Prova-se a avaliação
        // via contador (Cell: mutação interior, Fn preservado) e `probe_on_surface`
        // reflete a verdade injetada pelo predicado.
        let calls = std::cell::Cell::new(0usize);
        let row = classify_row(
            &|cmd| {
                calls.set(calls.get() + 1);
                cmd == "probe_ghost_cmd"
            },
            "kernel_ghost_wire",
            "probe_ghost_cmd",
        );
        assert_eq!(
            calls.get(),
            1,
            "predicate must be evaluated even for unknown wire"
        );
        assert_eq!(row.runtime_class, WireRuntimeClass::Unknown);
        assert_eq!(row.declared_status, "unknown");
        assert!(!row.runtime_class.is_reachable());
        assert_eq!(row.letter, "");
        assert!(row.probe_on_surface, "probe reflects the injected surface truth");
    }

    #[test]
    fn wired_class_is_not_reachable() {
        // Fail-closed: apenas `Active` é alcançável em runtime. `Wired` (declarada
        // ativa porém probe fora da superfície) e `Unknown` (módulo fantasma) nunca
        // sinalizam reachability — o gap S-01 é a deriva que a telemetria mede.
        assert!(!WireRuntimeClass::Wired.is_reachable());
        assert!(!WireRuntimeClass::Unknown.is_reachable());
        assert!(WireRuntimeClass::Active.is_reachable());
        assert_eq!(WireRuntimeClass::Active.tag(), "active");
        assert_eq!(WireRuntimeClass::Wired.tag(), "wired");
        assert_eq!(WireRuntimeClass::Unknown.tag(), "unknown");
    }

    #[test]
    fn measured_pass_is_deterministic() {
        assert_eq!(
            reachability_evidence_fingerprint(&run_measured_pass()),
            reachability_evidence_fingerprint(&run_measured_pass())
        );
    }

    #[test]
    fn soak_gates_ready_and_aaa_held() {
        let r = run_wire_reachability_soak();
        assert!(r.wire_reachability_ready, "wire-reachability soak must prove readiness");
        assert_eq!(r.declared_active, 35);
        assert_eq!(r.full_runtime_active, 35);
        assert_eq!(r.full_runtime_wired, 0);
        assert!(r.full_consistent);
        assert!(r.drift_detected, "soak must measure that probe-drop drift is detected");
        assert!(r.fail_closed_holds, "soak must measure fail-closed on empty surface");
        assert!(r.deterministic);
        assert_eq!(r.total_ticks, WIRE_REACHABILITY_SOAK_TICKS);
        assert_eq!(r.evidence_kind, "s11_declaration_x_surface_runtime");
        assert!(r.evidence_fingerprint != 0);
        assert!(
            !r.full_reachability_aaa_ready,
            "full_reachability_aaa_ready must stay HELD (false)"
        );
        assert!(
            !r.coins_ready && !r.agones_ready && !r.nanite_ready && !r.dlss_ready && !r.quic_ready
        );
    }

    #[test]
    fn probe_matches_soak() {
        let soak = run_wire_reachability_soak();
        let probe = probe_wire_reachability();
        assert_eq!(soak.wire_reachability_ready, probe.wire_reachability_ready);
        assert_eq!(soak.evidence_fingerprint, probe.evidence_fingerprint);
        assert_eq!(soak.declared_active, probe.declared_active);
        assert_eq!(soak.full_runtime_active, probe.full_runtime_active);
        assert_eq!(soak.full_consistent, probe.full_consistent);
    }
}