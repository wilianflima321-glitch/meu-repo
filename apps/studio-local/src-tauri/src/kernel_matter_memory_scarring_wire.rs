//! R4 — Matter Memory & Scarring desktop wire (letter **lj**).
//!
//! Espelha a autoridade do kernel [`aethel_kernel_rust::matter_memory_scarring`]
//! — o ScarMap persistente (memória de matéria por cell-hash: damage
//! acumulado, last_impact_time, severity com decaimento exponencial de
//! meia-vida 60 s até o piso 0.25·acumulado, **nunca regenera**), hot loop
//! zero-alloc com keep-capacity, persistência binária Zero-Amnesia
//! fail-closed e composição dw/kh/ip2 — expondo o soak **fail-closed** na
//! superfície IPC desktop. A wire espelha o report completo do substrato e
//! adiciona `wire_on_surface` (self-check do registro ACL). Feed honesto do R4
//! — nunca afirma prontidão matter-memory / scar-map / persistence (flags HELD
//! no kernel, espelhadas aqui).

use aethel_kernel_rust::matter_memory_scarring::{
    run_matter_memory_scarring_soak, MatterMemoryScarringReport,
};
use serde::{Deserialize, Serialize};

/// Wire report do Matter Memory & Scarring — espelho camelCase do
/// `MatterMemoryScarringReport` do kernel mais o self-check `wire_on_surface`.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMatterMemoryScarringWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub impact_registers_damage: bool,
    pub accumulation_two_over_one: bool,
    pub no_regeneration: bool,
    pub severity_decays_to_floor: bool,
    pub deterministic_replay: bool,
    pub binary_round_trip_bit_identical: bool,
    pub fail_closed_invalid_cell: bool,
    pub fail_closed_invalid_time: bool,
    pub finite_bounded: bool,
    pub map_capacity_respected: bool,
    pub composition_finite: bool,
    pub zero_alloc_hot_loop: bool,
    pub representative_damage: f32,
    pub representative_severity: f32,
    pub representative_cells: u32,
    pub representative_impacts: u32,
    pub entropy_impact: f32,
    pub fracture_impact: f32,
    pub voronoi_impact: f32,
    pub dw_mnemonic_entropy_ready: bool,
    pub kh_composite_fracture_ready: bool,
    pub ip2_voronoi_ready: bool,
    pub hot_loop_peak_severity: f32,
    pub scar_capacity: u32,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub matter_memory_aaa_ready: bool,
    pub scar_map_aaa_ready: bool,
    pub persistence_aaa_ready: bool,
    pub coins_ready: bool,
    pub agones_ready: bool,
    pub quic_ready: bool,
    /// Honest self-check: esta própria wire está registrada na superfície IPC
    /// de runtime (probe + soak cmds presentes no `IPC_ACL_REGISTRY`).
    pub wire_on_surface: bool,
}

fn to_report(
    r: MatterMemoryScarringReport,
    wire_on_surface: bool,
) -> KernelMatterMemoryScarringWireReport {
    KernelMatterMemoryScarringWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        impact_registers_damage: r.impact_registers_damage,
        accumulation_two_over_one: r.accumulation_two_over_one,
        no_regeneration: r.no_regeneration,
        severity_decays_to_floor: r.severity_decays_to_floor,
        deterministic_replay: r.deterministic_replay,
        binary_round_trip_bit_identical: r.binary_round_trip_bit_identical,
        fail_closed_invalid_cell: r.fail_closed_invalid_cell,
        fail_closed_invalid_time: r.fail_closed_invalid_time,
        finite_bounded: r.finite_bounded,
        map_capacity_respected: r.map_capacity_respected,
        composition_finite: r.composition_finite,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        representative_damage: r.representative_damage,
        representative_severity: r.representative_severity,
        representative_cells: r.representative_cells,
        representative_impacts: r.representative_impacts,
        entropy_impact: r.entropy_impact,
        fracture_impact: r.fracture_impact,
        voronoi_impact: r.voronoi_impact,
        dw_mnemonic_entropy_ready: r.dw_mnemonic_entropy_ready,
        kh_composite_fracture_ready: r.kh_composite_fracture_ready,
        ip2_voronoi_ready: r.ip2_voronoi_ready,
        hot_loop_peak_severity: r.hot_loop_peak_severity,
        scar_capacity: r.scar_capacity,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct from 31 reachable peers".into(),
        letter: "lj".into(),
        note: "ScarMap persistent matter memory per cell-hash, damage accumulates capped, severity decays half-life 60s to floor 0.25*accumulated, never regenerates, Zero-Amnesia binary persistence, dw/kh/ip2 composition".into(),
        matter_memory_aaa_ready: r.matter_memory_aaa_ready,
        scar_map_aaa_ready: r.scar_map_aaa_ready,
        persistence_aaa_ready: r.persistence_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        quic_ready: r.quic_ready,
        wire_on_surface,
    }
}

/// Honesty probe — R4 Matter Memory & Scarring (letter lj).
///
/// Roda o soak unificado do kernel e reporta a paridade completa. A wire
/// também se auto-verifica: `wire_on_surface` é `true` apenas quando os dois
/// comandos (probe + soak) estão no `IPC_ACL_REGISTRY` de runtime.
pub fn probe_matter_memory_scarring_wire() -> KernelMatterMemoryScarringWireReport {
    let wire_on_surface = crate::ipc_surface::acl_for("probe_matter_memory_scarring_cmd").is_some()
        && crate::ipc_surface::acl_for("run_kernel_matter_memory_scarring_soak_cmd").is_some();
    to_report(run_matter_memory_scarring_soak(), wire_on_surface)
}

/// Tauri IPC — R4 Matter Memory & Scarring probe.
#[tauri::command]
pub fn probe_matter_memory_scarring_cmd() -> KernelMatterMemoryScarringWireReport {
    probe_matter_memory_scarring_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelMatterMemoryScarringSoakWireReport {
    pub ready: bool,
    pub deterministic: bool,
    pub evidence_kind: String,
    pub impact_registers_damage: bool,
    pub accumulation_two_over_one: bool,
    pub no_regeneration: bool,
    pub severity_decays_to_floor: bool,
    pub deterministic_replay: bool,
    pub binary_round_trip_bit_identical: bool,
    pub fail_closed_invalid_cell: bool,
    pub fail_closed_invalid_time: bool,
    pub finite_bounded: bool,
    pub map_capacity_respected: bool,
    pub composition_finite: bool,
    pub zero_alloc_hot_loop: bool,
    pub representative_damage: f32,
    pub representative_severity: f32,
    pub representative_cells: u32,
    pub representative_impacts: u32,
    pub hot_loop_peak_severity: f32,
    pub scar_capacity: u32,
    pub measured_pass_micros: f32,
    pub evidence_fingerprint: u64,
    pub matter_memory_aaa_ready: bool,
    pub scar_map_aaa_ready: bool,
    pub persistence_aaa_ready: bool,
}

fn soak_to_wire(r: MatterMemoryScarringReport) -> KernelMatterMemoryScarringSoakWireReport {
    KernelMatterMemoryScarringSoakWireReport {
        ready: r.ready,
        deterministic: r.deterministic,
        evidence_kind: r.evidence_kind.to_string(),
        impact_registers_damage: r.impact_registers_damage,
        accumulation_two_over_one: r.accumulation_two_over_one,
        no_regeneration: r.no_regeneration,
        severity_decays_to_floor: r.severity_decays_to_floor,
        deterministic_replay: r.deterministic_replay,
        binary_round_trip_bit_identical: r.binary_round_trip_bit_identical,
        fail_closed_invalid_cell: r.fail_closed_invalid_cell,
        fail_closed_invalid_time: r.fail_closed_invalid_time,
        finite_bounded: r.finite_bounded,
        map_capacity_respected: r.map_capacity_respected,
        composition_finite: r.composition_finite,
        zero_alloc_hot_loop: r.zero_alloc_hot_loop,
        representative_damage: r.representative_damage,
        representative_severity: r.representative_severity,
        representative_cells: r.representative_cells,
        representative_impacts: r.representative_impacts,
        hot_loop_peak_severity: r.hot_loop_peak_severity,
        scar_capacity: r.scar_capacity,
        measured_pass_micros: r.measured_pass_micros,
        evidence_fingerprint: r.evidence_fingerprint,
        matter_memory_aaa_ready: r.matter_memory_aaa_ready,
        scar_map_aaa_ready: r.scar_map_aaa_ready,
        persistence_aaa_ready: r.persistence_aaa_ready,
    }
}

/// Tauri IPC — deterministic soak replay do Matter Memory & Scarring (mesma
/// evidência medida do kernel; flags AAA sempre HELD, nunca afirmadas).
#[tauri::command]
pub fn run_kernel_matter_memory_scarring_soak_cmd() -> KernelMatterMemoryScarringSoakWireReport {
    soak_to_wire(run_matter_memory_scarring_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_matter_memory_honestly() {
        let r = probe_matter_memory_scarring_wire();
        assert!(r.ready);
        assert!(r.deterministic);
        assert!(r.impact_registers_damage);
        assert!(r.accumulation_two_over_one);
        assert!(r.no_regeneration);
        assert!(r.severity_decays_to_floor);
        assert!(r.deterministic_replay);
        assert!(r.binary_round_trip_bit_identical);
        assert!(r.fail_closed_invalid_cell);
        assert!(r.fail_closed_invalid_time);
        assert!(r.finite_bounded);
        assert!(r.map_capacity_respected);
        assert!(r.composition_finite);
        assert!(r.zero_alloc_hot_loop);
        assert!(r.dw_mnemonic_entropy_ready);
        assert!(r.kh_composite_fracture_ready);
        assert!(r.ip2_voronoi_ready);
        assert!(r.representative_damage.is_finite() && r.representative_severity.is_finite());
        assert!(r.entropy_impact.is_finite() && r.fracture_impact.is_finite() && r.voronoi_impact.is_finite());
        assert!(r.hot_loop_peak_severity.is_finite() && r.measured_pass_micros.is_finite());
        assert!(r.scar_capacity > 0);
        assert!(!r.evidence_kind.is_empty());
        assert_ne!(r.evidence_fingerprint, 0);
        assert_eq!(r.letter, "lj");
        assert!(r.wire_on_surface);
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_matter_memory_scarring_wire();
        assert!(
            !r.matter_memory_aaa_ready,
            "honest wire must never claim matter memory AAA readiness"
        );
        assert!(
            !r.scar_map_aaa_ready,
            "honest wire must never claim scar map AAA readiness"
        );
        assert!(
            !r.persistence_aaa_ready,
            "honest wire must never claim persistence AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(
            aethel_kernel_rust::matter_memory_scarring::run_matter_memory_scarring_soak(),
        );
        assert!(w.ready);
        assert!(w.deterministic);
        assert!(
            w.impact_registers_damage
                && w.accumulation_two_over_one
                && w.no_regeneration
                && w.severity_decays_to_floor
        );
        assert!(w.binary_round_trip_bit_identical && w.map_capacity_respected && w.composition_finite);
        assert!(w.fail_closed_invalid_cell && w.fail_closed_invalid_time && w.zero_alloc_hot_loop);
        assert!(w.representative_damage.is_finite() && w.representative_severity.is_finite());
        assert!(!w.evidence_kind.is_empty());
        assert_ne!(w.evidence_fingerprint, 0);
        assert!(
            !w.matter_memory_aaa_ready && !w.scar_map_aaa_ready && !w.persistence_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
        // Determinismo: fingerprint do soak idêntico ao do probe.
        let probe = probe_matter_memory_scarring_wire();
        assert_eq!(probe.evidence_fingerprint, w.evidence_fingerprint);
    }
}
