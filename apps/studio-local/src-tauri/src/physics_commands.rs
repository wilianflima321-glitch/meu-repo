use tauri::ipc::Response;
use tauri::State;
use std::sync::Mutex;
use aethel_studio_local::physics_kernel::PhysicsKernel;

#[tauri::command]
pub fn poll_physics_state(
    kernel: State<'_, Mutex<PhysicsKernel>>,
    real_dt: Option<f32>,
) -> Result<Response, String> {
    let mut kernel = kernel
        .lock()
        .map_err(|_| "Physics Kernel lock is poisoned.".to_string())?;

    // Advance physics: when the caller supplies a real frame `dt`, run the
    // fixed-timestep substep cadence and expose the render interpolation alpha
    // (S-19 SimulationClock); otherwise fall back to a single solver substep
    // for call sites that poll without timing.
    if let Some(real_dt) = real_dt.filter(|dt| *dt > 0.0) {
        kernel.step_frame(real_dt);
    } else {
        kernel.step();
    }

    // Export binary state via the kernel-owned reusable scratch (S-18
    // Zero-Alloc Hot-Loop Audit): steady-state frames fill the retained buffer
    // with no heap allocation, and `mem::take` hands the bytes to the Tauri
    // `Response` boundary (which inherently owns its payload).
    let state_bytes = kernel.export_state_take();

    // Return raw bytes via Tauri IPC
    Ok(Response::new(state_bytes))
}
