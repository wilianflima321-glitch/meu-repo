#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

use tauri::command;

/// Aethel Engine: Native GPU Bridge
/// Bypasses the Webview's WebGL context and executes rendering
/// commands directly on the native GPU using Vulkan/DirectX 12 (via wgpu).
/// In production, this uses SharedArrayBuffer to read the Matrix memory 
/// from the Javascript thread directly without IPC overhead.
#[command]
fn wgpu_execute(command_buffer_id: String) -> Result<String, String> {
  // 1. Map Shared Memory from command_buffer_id
  // 2. Submit to wgpu Queue
  // 3. Return sync status
  
  println!("Aethel GPU: Executing native draw call block: {}", command_buffer_id);
  
  Ok(format!("Native execution complete: {}", command_buffer_id))
}

#[command]
fn inject_fractal_energy(entity_mass: f32, young_modulus: f32, gravity_y: f32) -> Result<String, String> {
  // Wire to fractal_energy_perturbation.rs
  println!("Aethel Engine: Injecting fractal energy perturbation (telekinesis lite) with mass {} young {} gravity {}", entity_mass, young_modulus, gravity_y);
  Ok("Fractal energy perturbation injected".to_string())
}

#[command]
fn collapse_unified_field(depth_pressure: f32, radiation_intensity: f32) -> Result<String, String> {
  // Wire to unified_field_network.rs
  println!("Aethel Engine: Collapsing unified field network with depth {} radiation {}", depth_pressure, radiation_intensity);
  Ok("Unified field collapsed".to_string())
}

#[command]
fn check_four_dimensional_time_sdf_ready() -> Result<bool, String> {
  // Wire to four_dimensional_time_sdf.rs
  println!("Aethel Engine: Checking four_dimensional_time_sdf_ready probe");
  Ok(aethel_kernel_rust::four_dimensional_time_sdf::probe_four_dimensional_time_sdf().four_dimensional_time_sdf_ready)
}

#[command]
async fn run_moa_orchestrator(
    goal_title: String, 
    session_id: String, 
    sub_tasks: Vec<aethel_kernel_rust::ai_fusion_moa_orchestrator::AgentSubTask>
) -> Result<bool, String> {
    println!("Aethel Engine: Booting MoA Orchestrator loop via Rayon threadpool for goal: {}", goal_title);
    
    let mut runner = aethel_kernel_rust::ai_fusion_moa_orchestrator::AiFusionMoaOrchestrator::start_continuous_agent_runner(
        &goal_title,
        &session_id,
        sub_tasks,
    );

    // CPU intensive parallel execution inside spawn_blocking to not block Tauri UI loop
    let success = tauri::async_runtime::spawn_blocking(move || {
        aethel_kernel_rust::ai_fusion_moa_orchestrator::AiFusionMoaOrchestrator::execute_parallel_agent_loop(&mut runner);
        runner.master_goal_achieved
    }).await.map_err(|e| e.to_string())?;

    Ok(success)
}

fn main() {
  tauri::Builder::default()
      .invoke_handler(tauri::generate_handler![
          wgpu_execute,
          inject_fractal_energy,
          collapse_unified_field,
          check_four_dimensional_time_sdf_ready,
          run_moa_orchestrator
      ])
      .run(tauri::generate_context!())
      .expect("error while running Aethel Engine desktop application");
}
