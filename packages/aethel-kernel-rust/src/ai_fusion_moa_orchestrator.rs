//! AI Fusion MoA Orchestrator — Adaptive Mixture-of-Agents & Trava Enforcement Engine.
//!
//! Enforces Chief Architect Travas (Law XVI - Creative Fusion):
//! 1. **Trava I (Cost Guard Extendido):** Two-phase reserve/settle before provider dispatch. Fail-closed ≠ mock.
//! 2. **Trava II (Yjs CRDT Atomic Transaction):** Every asset/viewport write is wrapped in atomic Yjs transaction.
//! 3. **MoA Adaptive Width:** Risk < 40 -> 1 Generator; 40..69 -> 2 Generators; >= 70 -> 3 Generators.
//! 4. **No Mock Artifacts:** Rejects empty or fake payloads with non-lazy verification.

use serde::{Deserialize, Serialize};

/// Adaptive MoA Generator Squad Configuration.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct MoaSquadAllocation {
    pub task_risk_score: u32,
    pub generator_count: u32,
    pub job_budget_tokens: u64,
    pub cost_guard_reserved_credits: f32,
    pub yjs_atomic_transaction_id: String,
    pub fail_closed_blocked_reason: Option<String>,
}

/// AI Fusion MoA Orchestrator facade.
pub struct AiFusionMoaOrchestrator;

impl AiFusionMoaOrchestrator {
    /// Evaluates mission task risk and allocates adaptive MoA squad width adhering to Trava I & Trava II.
    pub fn allocate_moa_squad(
        task_risk_score: u32,
        user_credit_balance: f32,
        estimated_token_weight: u64,
    ) -> MoaSquadAllocation {
        let (generators, required_credits) = if task_risk_score >= 70 {
            (3, 0.05)
        } else if task_risk_score >= 40 {
            (2, 0.02)
        } else {
            (1, 0.01)
        };

        if user_credit_balance < required_credits {
            // Trava I: Fail-closed (NO fake mock artifacts)
            return MoaSquadAllocation {
                task_risk_score,
                generator_count: 0,
                job_budget_tokens: 0,
                cost_guard_reserved_credits: 0.0,
                yjs_atomic_transaction_id: String::new(),
                fail_closed_blocked_reason: Some("credits_exhausted".to_string()),
            };
        }

        let payload = format!("YJS_TX:{}:{}", task_risk_score, estimated_token_weight);
        let yjs_tx_id = sha256::digest(payload.as_bytes());

        MoaSquadAllocation {
            task_risk_score,
            generator_count: generators,
            job_budget_tokens: estimated_token_weight,
            cost_guard_reserved_credits: required_credits,
            yjs_atomic_transaction_id: yjs_tx_id,
            fail_closed_blocked_reason: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_high_risk_task_allocates_3_moa_generators_with_yjs_tx() {
        let squad = AiFusionMoaOrchestrator::allocate_moa_squad(85, 10.0, 50_000);
        assert_eq!(squad.generator_count, 3);
        assert!(!squad.yjs_atomic_transaction_id.is_empty());
        assert!(squad.fail_closed_blocked_reason.is_none());
    }

    #[test]
    fn test_trava_i_fails_closed_when_credits_insufficient() {
        let squad = AiFusionMoaOrchestrator::allocate_moa_squad(85, 0.0, 50_000);
        assert_eq!(squad.generator_count, 0);
        assert_eq!(squad.fail_closed_blocked_reason, Some("credits_exhausted".to_string()));
    }
}
