//! N5 — Rust risk envelope (max drawdown, leverage, kill-switch).
//! Fail-closed: live trading is never enabled. Kernel rejects before network.
//! Distinct from Hub Coins / Creative CostGuard. Pairs with N3 trade audit.

use serde::{Deserialize, Serialize};

/// Live trading is hard-disabled in this kernel surface (investment-grade HELD).
pub const LIVE_TRADING_ENABLED: bool = false;

/// Default max drawdown: 10% (1000 bps).
pub const DEFAULT_MAX_DRAWDOWN_BPS: u32 = 1000;

/// Default max leverage: 2.0× encoded as ×100.
pub const DEFAULT_MAX_LEVERAGE_X100: u32 = 200;

/// Default max order notional (paper sandbox ceiling).
pub const DEFAULT_MAX_NOTIONAL_USD: f64 = 100_000.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RiskRejectCode {
    KillSwitch,
    LiveTradingDisabled,
    DrawdownExceeded,
    LeverageExceeded,
    NotionalExceeded,
    InvalidRequest,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskEnvelopeLimits {
    pub max_drawdown_bps: u32,
    pub max_leverage_x100: u32,
    pub max_notional_usd: f64,
    /// When true, every order is rejected (fail-closed halt).
    pub kill_switch_armed: bool,
    /// Always false — never enable live trading from this envelope.
    pub live_trading_enabled: bool,
}

impl Default for RiskEnvelopeLimits {
    fn default() -> Self {
        Self {
            max_drawdown_bps: DEFAULT_MAX_DRAWDOWN_BPS,
            max_leverage_x100: DEFAULT_MAX_LEVERAGE_X100,
            max_notional_usd: DEFAULT_MAX_NOTIONAL_USD,
            kill_switch_armed: false,
            live_trading_enabled: LIVE_TRADING_ENABLED,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskCheckRequest {
    pub strategy_id: String,
    pub notional_usd: f64,
    pub leverage_x100: u32,
    pub current_drawdown_bps: u32,
    /// Caller intent — always rejected while live_trading_enabled is false.
    pub wants_live: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RiskVerdict {
    Pass,
    Reject {
        code: RiskRejectCode,
        reason: String,
    },
}

impl RiskVerdict {
    pub fn is_pass(&self) -> bool {
        matches!(self, RiskVerdict::Pass)
    }
}

/// Arm kill-switch — irreversible for this envelope instance until rebuilt.
pub fn arm_kill_switch(limits: &mut RiskEnvelopeLimits) {
    limits.kill_switch_armed = true;
}

/// Disarm only when not live (live remains hard-disabled).
pub fn disarm_kill_switch(limits: &mut RiskEnvelopeLimits) -> Result<(), RiskRejectCode> {
    if limits.live_trading_enabled {
        return Err(RiskRejectCode::LiveTradingDisabled);
    }
    limits.kill_switch_armed = false;
    Ok(())
}

/// Evaluate order against envelope — reject before any network/broker path.
pub fn evaluate_risk(limits: &RiskEnvelopeLimits, req: &RiskCheckRequest) -> RiskVerdict {
    if req.strategy_id.trim().is_empty()
        || !req.notional_usd.is_finite()
        || req.notional_usd <= 0.0
    {
        return RiskVerdict::Reject {
            code: RiskRejectCode::InvalidRequest,
            reason: "strategy_id empty or notional invalid".into(),
        };
    }

    if limits.kill_switch_armed {
        return RiskVerdict::Reject {
            code: RiskRejectCode::KillSwitch,
            reason: "kill-switch armed — all orders rejected".into(),
        };
    }

    // Fail-closed: live never ships from this kernel.
    if req.wants_live || limits.live_trading_enabled {
        return RiskVerdict::Reject {
            code: RiskRejectCode::LiveTradingDisabled,
            reason: "live trading disabled — paper/sandbox only".into(),
        };
    }

    if req.current_drawdown_bps > limits.max_drawdown_bps {
        return RiskVerdict::Reject {
            code: RiskRejectCode::DrawdownExceeded,
            reason: format!(
                "drawdown {} bps exceeds max {} bps",
                req.current_drawdown_bps, limits.max_drawdown_bps
            ),
        };
    }

    if req.leverage_x100 > limits.max_leverage_x100 {
        return RiskVerdict::Reject {
            code: RiskRejectCode::LeverageExceeded,
            reason: format!(
                "leverage {}x100 exceeds max {}x100",
                req.leverage_x100, limits.max_leverage_x100
            ),
        };
    }

    if req.notional_usd > limits.max_notional_usd {
        return RiskVerdict::Reject {
            code: RiskRejectCode::NotionalExceeded,
            reason: format!(
                "notional {} exceeds max {}",
                req.notional_usd, limits.max_notional_usd
            ),
        };
    }

    RiskVerdict::Pass
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RiskEnvelopeProbe {
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

/// Soak-gated honesty probe — never flips investment_grade or live trading.
pub fn probe_risk_envelope() -> RiskEnvelopeProbe {
    let mut limits = RiskEnvelopeLimits::default();

    let paper_ok = evaluate_risk(
        &limits,
        &RiskCheckRequest {
            strategy_id: "probe-paper".into(),
            notional_usd: 1_000.0,
            leverage_x100: 100,
            current_drawdown_bps: 50,
            wants_live: false,
        },
    )
    .is_pass();

    let live_reject = matches!(
        evaluate_risk(
            &limits,
            &RiskCheckRequest {
                strategy_id: "probe-live".into(),
                notional_usd: 1_000.0,
                leverage_x100: 100,
                current_drawdown_bps: 0,
                wants_live: true,
            },
        ),
        RiskVerdict::Reject {
            code: RiskRejectCode::LiveTradingDisabled,
            ..
        }
    );

    let drawdown_reject = matches!(
        evaluate_risk(
            &limits,
            &RiskCheckRequest {
                strategy_id: "probe-dd".into(),
                notional_usd: 1_000.0,
                leverage_x100: 100,
                current_drawdown_bps: limits.max_drawdown_bps + 1,
                wants_live: false,
            },
        ),
        RiskVerdict::Reject {
            code: RiskRejectCode::DrawdownExceeded,
            ..
        }
    );

    let leverage_reject = matches!(
        evaluate_risk(
            &limits,
            &RiskCheckRequest {
                strategy_id: "probe-lev".into(),
                notional_usd: 1_000.0,
                leverage_x100: limits.max_leverage_x100 + 1,
                current_drawdown_bps: 0,
                wants_live: false,
            },
        ),
        RiskVerdict::Reject {
            code: RiskRejectCode::LeverageExceeded,
            ..
        }
    );

    arm_kill_switch(&mut limits);
    let kill_reject = matches!(
        evaluate_risk(
            &limits,
            &RiskCheckRequest {
                strategy_id: "probe-kill".into(),
                notional_usd: 100.0,
                leverage_x100: 100,
                current_drawdown_bps: 0,
                wants_live: false,
            },
        ),
        RiskVerdict::Reject {
            code: RiskRejectCode::KillSwitch,
            ..
        }
    );

    let ready = paper_ok
        && live_reject
        && drawdown_reject
        && leverage_reject
        && kill_reject
        && !LIVE_TRADING_ENABLED;

    RiskEnvelopeProbe {
        risk_envelope_ready: ready,
        live_trading_enabled: LIVE_TRADING_ENABLED,
        investment_grade: false,
        kill_switch_rejects: kill_reject,
        live_intent_rejects: live_reject,
        drawdown_gate_works: drawdown_reject,
        leverage_gate_works: leverage_reject,
        paper_pass_within_limits: paper_ok,
        letter: "n5".into(),
        note: if ready {
            "N5 risk envelope PARTIAL — drawdown/leverage/kill-switch fail-closed; live trading hard-disabled; investmentGrade false"
                .into()
        } else {
            "N5 risk envelope probe failed — gates incomplete".into()
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn paper_order_within_limits_passes() {
        let limits = RiskEnvelopeLimits::default();
        let v = evaluate_risk(
            &limits,
            &RiskCheckRequest {
                strategy_id: "s1".into(),
                notional_usd: 500.0,
                leverage_x100: 100,
                current_drawdown_bps: 10,
                wants_live: false,
            },
        );
        assert!(v.is_pass());
    }

    #[test]
    fn live_intent_always_rejected() {
        let limits = RiskEnvelopeLimits::default();
        let v = evaluate_risk(
            &limits,
            &RiskCheckRequest {
                strategy_id: "s1".into(),
                notional_usd: 100.0,
                leverage_x100: 100,
                current_drawdown_bps: 0,
                wants_live: true,
            },
        );
        assert!(matches!(
            v,
            RiskVerdict::Reject {
                code: RiskRejectCode::LiveTradingDisabled,
                ..
            }
        ));
        assert!(!LIVE_TRADING_ENABLED);
    }

    #[test]
    fn kill_switch_rejects_all() {
        let mut limits = RiskEnvelopeLimits::default();
        arm_kill_switch(&mut limits);
        let v = evaluate_risk(
            &limits,
            &RiskCheckRequest {
                strategy_id: "s1".into(),
                notional_usd: 50.0,
                leverage_x100: 100,
                current_drawdown_bps: 0,
                wants_live: false,
            },
        );
        assert!(matches!(
            v,
            RiskVerdict::Reject {
                code: RiskRejectCode::KillSwitch,
                ..
            }
        ));
    }

    #[test]
    fn drawdown_and_leverage_gates() {
        let limits = RiskEnvelopeLimits::default();
        assert!(matches!(
            evaluate_risk(
                &limits,
                &RiskCheckRequest {
                    strategy_id: "s1".into(),
                    notional_usd: 100.0,
                    leverage_x100: 100,
                    current_drawdown_bps: 10_001,
                    wants_live: false,
                },
            ),
            RiskVerdict::Reject {
                code: RiskRejectCode::DrawdownExceeded,
                ..
            }
        ));
        assert!(matches!(
            evaluate_risk(
                &limits,
                &RiskCheckRequest {
                    strategy_id: "s1".into(),
                    notional_usd: 100.0,
                    leverage_x100: 9999,
                    current_drawdown_bps: 0,
                    wants_live: false,
                },
            ),
            RiskVerdict::Reject {
                code: RiskRejectCode::LeverageExceeded,
                ..
            }
        ));
    }

    #[test]
    fn probe_ready_and_investment_grade_false() {
        let p = probe_risk_envelope();
        assert!(p.risk_envelope_ready);
        assert!(!p.live_trading_enabled);
        assert!(!p.investment_grade);
        assert_eq!(p.letter, "n5");
    }
}
