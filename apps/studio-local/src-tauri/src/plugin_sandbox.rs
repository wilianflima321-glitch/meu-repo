//! Plugin sandbox IPC surface — honesty-first (P2b BLOCKER 12).
//!
//! Prior revision shipped fake FPS/DOM telemetry (`start_sandbox_telemetry`) and a
//! synthetic 512-D "vibe" embedding (`export_vibe_embedding`) while claiming live
//! WebGPU/Physics hooks + local ViT. Those paths are fail-closed HELD until a real
//! V8 isolate (deno_core / equivalent) and real sensor feeds exist.
//!
//! `execute_sandbox_plugin` is also HELD: there is no `deno_core` dependency in this
//! crate, so inventing a JS runtime success would be Zero-MVP theater.

use tauri::AppHandle;

const SANDBOX_V8_HELD: &str = "PLUGIN_SANDBOX_HELD: V8 isolate / deno_core not wired — refuse to invent plugin execution success";
const TELEMETRY_HELD: &str = "PLUGIN_TELEMETRY_HELD: refuse fake FPS/DOM/collision telemetry — wire real GPU/physics hooks before streaming aethel-telemetry-feed";
const VIBE_EMBEDDING_HELD: &str = "VIBE_EMBEDDING_HELD: refuse synthetic 512-D embedding — local ViT / screen buffer encoder not implemented";
const AESTHETIC_LORA_HELD: &str = "AESTHETIC_LORA_HELD: local LoRA aesthetic override not implemented — refuse silent Ok(())";

/// Evaluates third-party plugin JS. Fail-closed until a real isolate ships.
#[tauri::command]
pub fn execute_sandbox_plugin(_js_code: String) -> Result<Vec<u8>, String> {
    Err(SANDBOX_V8_HELD.to_string())
}

/// Live ephemeral telemetry feed. Fail-closed — never emits fabricated metrics.
#[tauri::command]
pub fn start_sandbox_telemetry(_app: AppHandle, _hook_id: String) -> Result<(), String> {
    Err(TELEMETRY_HELD.to_string())
}

/// Perceptual "vibe" embedding export. Fail-closed — never returns a fake vector.
#[tauri::command]
pub fn export_vibe_embedding() -> Result<Vec<f32>, String> {
    Err(VIBE_EMBEDDING_HELD.to_string())
}

/// User aesthetic override / local LoRA train hook. Fail-closed.
#[tauri::command]
pub fn register_user_aesthetic_override(_metrics: String) -> Result<(), String> {
    Err(AESTHETIC_LORA_HELD.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn execute_sandbox_plugin_fails_closed() {
        let err = execute_sandbox_plugin("1+1".into()).unwrap_err();
        assert!(err.contains("PLUGIN_SANDBOX_HELD"));
    }

    #[test]
    fn export_vibe_embedding_refuses_synthetic_vector() {
        let err = export_vibe_embedding().unwrap_err();
        assert!(err.contains("VIBE_EMBEDDING_HELD"));
        assert!(!err.is_empty());
    }

    #[test]
    fn aesthetic_override_refuses_silent_ok() {
        let err = register_user_aesthetic_override("{}".into()).unwrap_err();
        assert!(err.contains("AESTHETIC_LORA_HELD"));
    }

    #[test]
    fn telemetry_held_reason_is_honest() {
        // AppHandle cannot be constructed in a unit test; assert the constant contract.
        assert!(TELEMETRY_HELD.contains("PLUGIN_TELEMETRY_HELD"));
        assert!(TELEMETRY_HELD.contains("refuse fake"));
    }
}
