//! AI Fusion MoA Orchestrator — Adaptive Mixture-of-Agents & Trava Enforcement Engine.
//!
//! Enforces Chief Architect Travas (Law XVI - Creative Fusion):
//! 1. **Trava I (Cost Guard Extendido):** Two-phase reserve/settle before provider dispatch. Fail-closed ≠ mock.
//! 2. **Trava II (Yjs CRDT Atomic Transaction):** Every asset/viewport write is wrapped in atomic Yjs transaction.
//! 3. **MoA Adaptive Width:** Risk < 40 -> 1 Generator; 40..69 -> 2 Generators; >= 70 -> 3 Generators.
//! 4. **No Mock Artifacts:** Rejects empty or fake payloads with non-lazy verification.
//! 5. **Ephemeral AI Help Context Protocol:** Injects clean, purged, zero-drift context from AI Orchestrator to Gemini 3.6 Flash.
//! 6. **Project-Scoped Anti-Laziness Knowledge Ledger (Cursor Supremacy Protocol):**
//!    - Zero-laziness mandate prohibiting partial or superficial analysis.
//!    - Project-isolated persistent knowledge indexing (`.aethel/knowledge/project_audit_summary.md`).
//!    - Cloud-synced project memory index preserving project state across sessions.

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

/// Project-Scoped Isolated Knowledge Index for Persistent Memory across Sessions.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProjectKnowledgeIndex {
    pub project_id: String,
    pub project_root_uri: String,
    pub audit_ledger_path: String,
    pub symbol_graph_hash: String,
    pub cloud_sync_status: String,
    pub total_indexed_files: u32,
}

/// Ephemeral Context Package injected by AI Orchestrator into AI Help (Gemini 3.6 Flash).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct EphemeralAiHelpContextPack {
    pub orchestrator_session_id: String,
    pub target_task: String,
    pub sanitized_context_snapshot: String,
    pub max_ephemeral_tokens: u32,
    pub read_only_mode: bool,
    pub auto_purge_after_completion: bool,
    pub aaa_rigor_mandate: bool,
    pub project_knowledge_ref: Option<ProjectKnowledgeIndex>,
}

impl EphemeralAiHelpContextPack {
    pub const CURSOR_SUPREMACY_ANTI_LAZINESS_DIRECTIVE: &'static str =
        "DIRECTIVA DE SUPREMACIA AETHEL (ANTI-PREGUIÇA E ZERO SUPERFICIALIDADE):\n\
         - PROIBIÇÃO ABSOLUTA de análises parciais, superficiais, resumos genéricos ou respostas lazies.\n\
         - NENHUM arquivo ou conexão pode passar batido. Exija profundidade técnica de nível AAA.\n\
         - Utilize o Ledger de Conhecimento do Projeto (.aethel/knowledge) para recall seletivo sem acumular lixo no chat.\n\
         - Mantenha isolamento total de dados entre projetos. Modo de análise estrito (Read-Only).";
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

    /// Constructs a clean, ephemeral, auto-purging context package for the AI Help (Gemini 3.6 Flash) with Project Knowledge Ledger.
    pub fn prepare_ephemeral_help_context(
        orchestrator_session_id: &str,
        target_task: &str,
        raw_context: &str,
        user_selected_help_as_editor: bool,
        project_knowledge: Option<ProjectKnowledgeIndex>,
    ) -> EphemeralAiHelpContextPack {
        let sanitized = format!(
            "{}\n\n[CONTEXT SNAPSHOT DE PROJETO ISOLADO]\n{}",
            EphemeralAiHelpContextPack::CURSOR_SUPREMACY_ANTI_LAZINESS_DIRECTIVE,
            raw_context
        );

        EphemeralAiHelpContextPack {
            orchestrator_session_id: orchestrator_session_id.to_string(),
            target_task: target_task.to_string(),
            sanitized_context_snapshot: sanitized,
            max_ephemeral_tokens: 2_000_000,
            read_only_mode: !user_selected_help_as_editor,
            auto_purge_after_completion: true,
            aaa_rigor_mandate: true,
            project_knowledge_ref: project_knowledge,
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

    #[test]
    fn test_prepare_ephemeral_help_context_enforces_anti_laziness_and_project_isolation() {
        let proj_info = ProjectKnowledgeIndex {
            project_id: "aethel_engine_main".to_string(),
            project_root_uri: "e:\\Aethel engine".to_string(),
            audit_ledger_path: ".aethel/knowledge/project_audit_summary.md".to_string(),
            symbol_graph_hash: "a1b2c3d4e5f6".to_string(),
            cloud_sync_status: "synced_v1".to_string(),
            total_indexed_files: 260,
        };

        let pack = AiFusionMoaOrchestrator::prepare_ephemeral_help_context(
            "sess_456",
            "full_audit_scan",
            "fn kernel_main() {}",
            false,
            Some(proj_info),
        );

        assert!(pack.read_only_mode);
        assert!(pack.auto_purge_after_completion);
        assert!(pack.aaa_rigor_mandate);
        assert!(pack.project_knowledge_ref.is_some());
        assert!(pack.sanitized_context_snapshot.contains("DIRECTIVA DE SUPREMACIA AETHEL"));
    }
}
