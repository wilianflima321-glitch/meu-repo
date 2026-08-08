use tauri::command;
use aethel_kernel_rust::ai_fusion_moa_orchestrator::{
    AiFusionMoaOrchestrator, SubAgentAnalysisPayload, ZeroTruncationCompletionMandate,
};

#[command]
pub fn run_moa_orchestrator(task_prompt: String) -> Result<String, String> {
    // 1. Start continuous runner
    let mut runner = AiFusionMoaOrchestrator::start_continuous_agent_runner(
        "claude-3-5-sonnet".to_string(), // Master Orchestrator
        task_prompt,
    );

    // 2. Add sub-agents (AST Rewriter, UI Auditor, etc.)
    runner.sub_tasks.push(aethel_kernel_rust::ai_fusion_moa_orchestrator::AgentSubTask {
        sub_agent_model_id: "qwen-3.6-plus".to_string(),
        sub_agent_role: "AST Rewrite / Architecture".to_string(),
        local_context_uri: "native_backend".to_string(),
    });

    runner.sub_tasks.push(aethel_kernel_rust::ai_fusion_moa_orchestrator::AgentSubTask {
        sub_agent_model_id: "gemini-2.5-flash".to_string(),
        sub_agent_role: "Zero-Hallucination Visual Audit".to_string(),
        local_context_uri: "ui_viewport".to_string(),
    });

    // 3. Execute Parallel Loop natively via Rayon (Zero blocking)
    AiFusionMoaOrchestrator::execute_parallel_agent_loop(&mut runner);

    Ok(format!("MoA Orchestration executed successfully with {} sub-tasks.", runner.sub_tasks.len()))
}
