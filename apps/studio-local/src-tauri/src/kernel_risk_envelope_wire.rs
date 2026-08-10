//! N5 — Rust risk envelope desktop IPC wire.
//! Fail-closed kill-switch + drawdown/leverage gates. Live trading never enabled.
//! Distinct from Hub Coins. investmentGrade stays false.

use aethel_kernel_rust::risk_envelope::{probe_risk_envelope, RiskEnvelopeProbe};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelRiskEnvelopeWireReport {
    pub risk_envelope_ready: bool,
    pub live_trading_enabled: bool,
    pub investment_grade: bool,
    pub kill_switch_rejects: bool,
    pub live_intent_rejects: bool,
    pub drawdown_gate_works: bool,
    pub leverage_gate_works: bool,
    pub paper_pass_within_limits: bool,
    pub letter: String,
    pub note: String,
}

fn to_report(p: RiskEnvelopeProbe) -> KernelRiskEnvelopeWireReport {
    KernelRiskEnvelopeWireReport {
        risk_envelope_ready: p.risk_envelope_ready,
        live_trading_enabled: p.live_trading_enabled,
        investment_grade: p.investment_grade,
        kill_switch_rejects: p.kill_switch_rejects,
        live_intent_rejects: p.live_intent_rejects,
        drawdown_gate_works: p.drawdown_gate_works,
        leverage_gate_works: p.leverage_gate_works,
        paper_pass_within_limits: p.paper_pass_within_limits,
        letter: p.letter,
        note: p.note,
    }
}

/// Honesty probe — soak-gated N5 risk envelope (letter n5).
pub fn probe_risk_envelope_wire() -> KernelRiskEnvelopeWireReport {
    to_report(probe_risk_envelope())
}

/// Tauri IPC — N5 risk envelope honesty.
#[tauri::command]
pub fn probe_risk_envelope_cmd() -> KernelRiskEnvelopeWireReport {
    probe_risk_envelope_wire()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn wire_probe_fail_closed_live_and_investment_grade() {
        let r = probe_risk_envelope_wire();
        assert!(r.risk_envelope_ready);
        assert!(!r.live_trading_enabled);
        assert!(!r.investment_grade);
        assert_eq!(r.letter, "n5");
    }
}
