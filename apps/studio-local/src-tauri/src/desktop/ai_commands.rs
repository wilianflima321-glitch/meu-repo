use tauri::command;
use aethel_kernel_rust::ai_fusion_moa_orchestrator::{
    AiFusionMoaOrchestrator, AgentSubTask,
};

use super::agent_shell_acl::acl_or_deny_ipc;
use aethel_studio_local::ipc_surface::IpcAclClass;

/// Maximum orchestration steps before the runner fails closed (anti-infinite-loop).
const MAX_ORCHESTRATION_STEPS: u32 = 64;

#[command]
pub fn run_moa_orchestrator(
    task_prompt: String,
    caller_kind: Option<String>,
    agent_tool: Option<String>,
    agent_id: Option<String>,
) -> Result<String, String> {
    acl_or_deny_ipc(IpcAclClass::AgentDeny, caller_kind, agent_tool, agent_id)?;
    // Build the deterministic sub-task squad for this orchestration mission.
    let sub_tasks = vec![
        AgentSubTask {
            sub_task_id: "ast-rewrite-architecture".to_string(),
            description: "AST Rewrite / Architecture audit of native_backend".to_string(),
            assigned_sub_agent_model: "qwen/qwen-3.6-plus".to_string(),
            is_completed: false,
            compiler_verification_passed: false,
        },
        AgentSubTask {
            sub_task_id: "visual-audit-ui-viewport".to_string(),
            description: "Zero-Hallucination Visual Audit of ui_viewport".to_string(),
            assigned_sub_agent_model: "google/gemini-2.5-flash".to_string(),
            is_completed: false,
            compiler_verification_passed: false,
        },
    ];

    // 1. Start the continuous agent-of-agents runner (goal_title, session_id, sub_tasks).
    let mut runner = AiFusionMoaOrchestrator::start_continuous_agent_runner(
        "Aethel Native Orchestration Mission",
        &task_prompt,
        sub_tasks,
    );

    // 2. Step the deterministic completion loop until the master goal is achieved.
    let mut steps = 0u32;
    while AiFusionMoaOrchestrator::step_continuous_agent_runner(&mut runner) {
        steps += 1;
        if steps >= MAX_ORCHESTRATION_STEPS {
            return Err(
                "MoA orchestrator exceeded MAX_ORCHESTRATION_STEPS without reaching completion"
                    .to_string(),
            );
        }
    }

    if !runner.master_goal_achieved {
        return Err("MoA orchestrator finished without achieving the master goal".to_string());
    }

    let all_verified = runner
        .completed_sub_tasks
        .iter()
        .all(|t| t.compiler_verification_passed);

    Ok(format!(
        "MoA orchestration completed: {} sub-tasks validated (compiler_verification_passed={}), master_goal_achieved={}, zero_hallucination_guarantee={}",
        runner.completed_sub_tasks.len(),
        all_verified,
        runner.master_goal_achieved,
        runner.zero_hallucination_guarantee,
    ))
}
