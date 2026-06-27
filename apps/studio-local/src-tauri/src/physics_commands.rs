use tauri::ipc::Response;
use tauri::State;
use std::sync::Mutex;
use aethel_studio_local::physics_kernel::PhysicsKernel;

#[tauri::command]
pub fn poll_physics_state(
    kernel: State<'_, Mutex<PhysicsKernel>>,
) -> Result<Response, String> {
    let mut kernel = kernel
        .lock()
        .map_err(|_| "Physics Kernel lock is poisoned.".to_string())?;
    
    // Advance physics
    kernel.step();
    
    // Export binary state
    let state_bytes = kernel.export_state();
    
    // Return raw bytes via Tauri IPC
    Ok(Response::new(state_bytes))
}
