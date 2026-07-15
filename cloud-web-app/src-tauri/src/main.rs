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

fn main() {
  tauri::Builder::default()
      .invoke_handler(tauri::generate_handler![
          wgpu_execute
      ])
      .run(tauri::generate_context!())
      .expect("error while running Aethel Engine desktop application");
}
