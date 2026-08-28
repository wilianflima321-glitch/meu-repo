//! R3 — wire-reachability runtime telemetry desktop IPC wire (S-15).
//!
//! Injeta o **predicado real** da superfície IPC (`ipc_surface::acl_for`) no
//! classificador puro do kernel [`aethel_kernel_rust::wire_reachability`],
//! transformando o registro S-11 (compile-time) em telemetria de runtime:
//! cada wire ACTIVE é classificada `active` / `wired` / `unknown` conforme o
//! comando probe existe na superfície de runtime. Feed honesto do registro
//! S-01/S-11 — nunca afirma prontidão AAA, apenas consistência declaração×runtime.

use aethel_kernel_rust::wire_reachability::{
    classify_wire_reachability, run_wire_reachability_soak, WireReachabilityRow,
    WireReachabilitySoakReport, WireReachabilitySummary,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelWireReachabilityRowReport {
    pub wire_module: String,
    pub probe_cmd: String,
    pub declared_status: String,
    pub runtime_class: String,
    pub probe_on_surface: bool,
    pub letter: String,
}

impl From<&WireReachabilityRow> for KernelWireReachabilityRowReport {
    fn from(r: &WireReachabilityRow) -> Self {
        Self {
            wire_module: r.wire_module.to_string(),
            probe_cmd: r.probe_cmd.to_string(),
            declared_status: r.declared_status.to_string(),
            runtime_class: r.runtime_class.tag().to_string(),
            probe_on_surface: r.probe_on_surface,
            letter: r.letter.to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelWireReachabilityWireReport {
    pub total_wires: usize,
    pub declared_active: usize,
    pub probed_wires: usize,
    pub runtime_active: usize,
    pub runtime_wired: usize,
    pub unknown: usize,
    pub registry_active_without_probe: usize,
    pub consistent: bool,
    pub verdict: String,
    pub rows: Vec<KernelWireReachabilityRowReport>,
}

fn to_report(
    summary: WireReachabilitySummary,
    rows: Vec<WireReachabilityRow>,
) -> KernelWireReachabilityWireReport {
    KernelWireReachabilityWireReport {
        total_wires: summary.total_wires,
        declared_active: summary.declared_active,
        probed_wires: summary.probed_wires,
        runtime_active: summary.runtime_active,
        runtime_wired: summary.runtime_wired,
        unknown: summary.unknown,
        registry_active_without_probe: summary.registry_active_without_probe,
        consistent: summary.consistent,
        verdict: summary.verdict.to_string(),
        rows: rows
            .iter()
            .map(KernelWireReachabilityRowReport::from)
            .collect(),
    }
}

/// Honesty probe — R3 wire-reachability runtime telemetry (letter s15).
///
/// O predicado real é `|cmd| crate::ipc_surface::acl_for(cmd).is_some()`: a wire
/// é classificada `active` apenas quando o comando probe está no `IPC_ACL_REGISTRY`
/// de runtime. Qualquer deriva (probe removido, renomeado ou wire desconectada)
/// vira `wired` e quebra `consistent` — o gap S-01 medido em runtime.
pub fn probe_wire_reachability_wire() -> KernelWireReachabilityWireReport {
    let surface_contains = |cmd: &str| crate::ipc_surface::acl_for(cmd).is_some();
    let (rows, summary) = classify_wire_reachability(surface_contains);
    to_report(summary, rows)
}

/// Tauri IPC — R3 wire-reachability runtime telemetry.
#[tauri::command]
pub fn probe_wire_reachability_cmd() -> KernelWireReachabilityWireReport {
    probe_wire_reachability_wire()
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelWireReachabilitySoakWireReport {
    pub wire_reachability_ready: bool,
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

fn soak_to_wire(r: WireReachabilitySoakReport) -> KernelWireReachabilitySoakWireReport {
    KernelWireReachabilitySoakWireReport {
        wire_reachability_ready: r.wire_reachability_ready,
        declared_active: r.declared_active,
        full_runtime_active: r.full_runtime_active,
        full_runtime_wired: r.full_runtime_wired,
        full_consistent: r.full_consistent,
        drift_detected: r.drift_detected,
        fail_closed_holds: r.fail_closed_holds,
        deterministic: r.deterministic,
        total_ticks: r.total_ticks,
        evidence_kind: r.evidence_kind,
        evidence_fingerprint: r.evidence_fingerprint,
        full_reachability_aaa_ready: r.full_reachability_aaa_ready,
        coins_ready: r.coins_ready,
        agones_ready: r.agones_ready,
        nanite_ready: r.nanite_ready,
        dlss_ready: r.dlss_ready,
        quic_ready: r.quic_ready,
    }
}

/// Tauri IPC — deterministic soak replay of the wire-reachability telemetry
/// (64 ticks, mesma evidência medida do kernel, nunca afirma prontidão AAA).
#[tauri::command]
pub fn run_kernel_wire_reachability_soak_cmd() -> KernelWireReachabilitySoakWireReport {
    soak_to_wire(run_wire_reachability_soak())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_reports_the_live_surface_honestly() {
        let r = probe_wire_reachability_wire();
        // Todas as wires ACTIVE (5) devem estar cobertas pelo mapeamento probe e
        // presentes na superfície IPC real — declaração e runtime coincidem.
        assert_eq!(r.probed_wires, r.declared_active);
        assert_eq!(r.runtime_active, r.declared_active);
        assert_eq!(r.runtime_wired, 0);
        assert_eq!(r.unknown, 0);
        assert_eq!(r.registry_active_without_probe, 0);
        assert!(r.consistent);
        assert!(r.verdict.contains("consistent"));
        // Auto-referencial: a própria wire R3 está na superfície como `active`.
        assert!(r.rows.iter().any(|row| {
            row.wire_module == "kernel_wire_reachability_wire"
                && row.probe_cmd == "probe_wire_reachability_cmd"
                && row.runtime_class == "active"
                && row.probe_on_surface
        }));
    }

    #[test]
    fn wire_probe_never_claims_aaa_readiness() {
        let r = probe_wire_reachability_wire();
        assert!(
            !r.verdict.contains("aaa"),
            "honest verdict must not claim AAA readiness"
        );
    }

    #[test]
    fn wire_soak_delegates_to_kernel_report() {
        let w = soak_to_wire(aethel_kernel_rust::wire_reachability::run_wire_reachability_soak());
        assert!(w.wire_reachability_ready);
        assert!(w.full_consistent);
        assert!(w.drift_detected);
        assert!(w.fail_closed_holds);
        assert!(w.deterministic);
        assert_eq!(
            w.total_ticks,
            aethel_kernel_rust::wire_reachability::WIRE_REACHABILITY_SOAK_TICKS
        );
        assert!(
            !w.full_reachability_aaa_ready,
            "wire soak must never claim AAA readiness"
        );
    }
}
