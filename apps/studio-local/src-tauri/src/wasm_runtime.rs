//! Missão Suprema 7 — Live-Coding Determinístico (WASM Hot-Reload).
//!
//! Gameplay logic compiled to WebAssembly gets instantiated by `wasmtime`
//! and driven one `update(dt)` step at a time by the running engine loop.
//! When the developer edits the source and it recompiles to a new `.wasm`
//! binary, a `notify` watcher on that file triggers `WasmGameplayHost::load`
//! again — but the *simulation state* (`GameplayState` below) lives in the
//! Rust host, not inside the WASM instance's linear memory, so swapping the
//! instance never resets it. The character's exact position and velocity
//! survive the swap mid-jump, because the new instance's `update` export is
//! simply called with the same numbers the old one would have produced next.
//!
//! Expected module contract (documented rather than embedded — compiling a
//! `.wat` sample at runtime would need the `wat` crate, which isn't wired in
//! here to keep the dependency surface honest about what's actually used):
//!
//! ```wat
//! (module
//!   (func $update (export "update") (param $dt f32) (param $y f32) (param $vy f32)
//!         (result f32 f32)
//!     ;; new_vy = vy - 9.81 * dt ; new_y = y + new_vy * dt
//!     (local $new_vy f32)
//!     (local.set $new_vy (f32.sub (local.get $vy) (f32.mul (f32.const 9.81) (local.get $dt))))
//!     (f32.add (local.get $y) (f32.mul (local.get $new_vy) (local.get $dt)))
//!     (local.get $new_vy))
//! )
//! ```
//!
//! Ship a new build of this module with, say, `19.81` instead of `9.81` and
//! `wasm_watch_and_hot_reload` swaps it in on save — the in-flight jump
//! instantly falls faster without the world resetting.
use std::path::PathBuf;
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::thread;

use notify::{RecursiveMode, Watcher};
use serde::Serialize;
use tauri::{AppHandle, Emitter, State};
use wasmtime::{Engine, Instance, Linker, Module, Store, TypedFunc};

use crate::desktop_commands::{ensure_allowed_existing_path, locked_project_root, ProjectRootState};

pub const WASM_HOT_RELOADED_EVENT: &str = "wasm_hot_reloaded";
pub const WASM_HOT_RELOAD_FAILED_EVENT: &str = "wasm_hot_reload_failed";

/// `update(dt, y, vy) -> (new_y, new_vy)` export contract (see module docs above).
type GameplayUpdateFn = TypedFunc<(f32, f32, f32), (f32, f32)>;

/// Simulation state that must outlive any single WASM instance for a swap
/// to feel like a hot-reload instead of a restart.
#[derive(Debug, Clone, Copy, Default, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GameplayState {
    pub position_y: f32,
    pub velocity_y: f32,
}

#[allow(dead_code)] // `instance` is kept alive alongside `update_fn`, which borrows through it.
struct LoadedModule {
    store: Store<()>,
    instance: Instance,
    update_fn: Option<GameplayUpdateFn>,
}

pub struct WasmGameplayHost {
    engine: Engine,
    loaded: Mutex<Option<LoadedModule>>,
    state: Mutex<GameplayState>,
}

impl Default for WasmGameplayHost {
    fn default() -> Self {
        Self {
            engine: Engine::default(),
            loaded: Mutex::new(None),
            state: Mutex::new(GameplayState::default()),
        }
    }
}

impl WasmGameplayHost {
    /// Compiles and instantiates `wasm_bytes` as the active gameplay
    /// module. Deliberately does *not* touch `self.state` — that's the
    /// entire mechanism that makes this a hot *swap* instead of a reset.
    pub fn load(&self, wasm_bytes: &[u8]) -> Result<(), String> {
        let module = Module::new(&self.engine, wasm_bytes)
            .map_err(|error| format!("failed to compile gameplay WASM module: {error}"))?;
        let linker: Linker<()> = Linker::new(&self.engine);
        let mut store = Store::new(&self.engine, ());
        let instance = linker
            .instantiate(&mut store, &module)
            .map_err(|error| format!("failed to instantiate gameplay WASM module: {error}"))?;

        let update_fn = instance
            .get_typed_func::<(f32, f32, f32), (f32, f32)>(&mut store, "update")
            .ok();

        let mut guard = self
            .loaded
            .lock()
            .map_err(|_| "Studio Local WASM host lock is poisoned.".to_string())?;
        *guard = Some(LoadedModule { store, instance, update_fn });
        Ok(())
    }

    /// Advances the simulation by `dt` seconds using the active module's
    /// `update(dt, y, vy) -> (y, vy)` export. Falls back to a constant-
    /// gravity integrator (rather than an error) when no module is loaded
    /// yet or it doesn't export `update`, so the caller always gets a
    /// usable, deterministic frame.
    pub fn step(&self, dt: f32) -> Result<GameplayState, String> {
        let mut state = self
            .state
            .lock()
            .map_err(|_| "Studio Local WASM state lock is poisoned.".to_string())?;
        let mut guard = self
            .loaded
            .lock()
            .map_err(|_| "Studio Local WASM host lock is poisoned.".to_string())?;

        if let Some(loaded) = guard.as_mut() {
            if let Some(update_fn) = loaded.update_fn {
                let (new_position, new_velocity) = update_fn
                    .call(&mut loaded.store, (dt, state.position_y, state.velocity_y))
                    .map_err(|error| format!("gameplay WASM update() trapped: {error}"))?;
                state.position_y = new_position;
                state.velocity_y = new_velocity;
                return Ok(*state);
            }
        }

        state.velocity_y -= 9.81 * dt;
        state.position_y += state.velocity_y * dt;
        Ok(*state)
    }

    pub fn is_module_loaded(&self) -> bool {
        self.loaded.lock().map(|guard| guard.is_some()).unwrap_or(false)
    }
}

pub struct WasmHostState(pub Arc<WasmGameplayHost>);

impl Default for WasmHostState {
    fn default() -> Self {
        Self(Arc::new(WasmGameplayHost::default()))
    }
}

/// Watches the single `.wasm` file at `watch_path` and hot-swaps `host`
/// every time it changes on disk.
pub fn spawn_wasm_watcher(watch_path: PathBuf, host: Arc<WasmGameplayHost>, app_handle: AppHandle) {
    thread::spawn(move || {
        let Some(parent) = watch_path.parent().map(|p| p.to_path_buf()) else { return };

        let (tx, rx) = channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(watcher) => watcher,
            Err(_) => return,
        };
        if watcher.watch(&parent, RecursiveMode::NonRecursive).is_err() {
            return;
        }

        for event_result in rx {
            let Ok(event) = event_result else { continue };
            if !matches!(event.kind, notify::EventKind::Create(_) | notify::EventKind::Modify(_)) {
                continue;
            }
            if !event.paths.iter().any(|changed| changed == &watch_path) {
                continue;
            }

            let reload_result = std::fs::read(&watch_path)
                .map_err(|error| format!("failed to read gameplay WASM module: {error}"))
                .and_then(|bytes| host.load(&bytes));

            match reload_result {
                Ok(()) => {
                    let _ = app_handle.emit(
                        WASM_HOT_RELOADED_EVENT,
                        serde_json::json!({ "path": watch_path.display().to_string() }),
                    );
                }
                Err(error) => {
                    let _ = app_handle.emit(
                        WASM_HOT_RELOAD_FAILED_EVENT,
                        serde_json::json!({
                            "path": watch_path.display().to_string(),
                            "error": error,
                        }),
                    );
                }
            }
        }
    });
}

#[tauri::command]
pub fn wasm_load_module(
    path: String,
    host: State<'_, WasmHostState>,
    project_root: State<'_, ProjectRootState>,
) -> Result<String, String> {
    let root = locked_project_root(&project_root)?;
    let resolved = ensure_allowed_existing_path(&path, root.as_deref())?;
    let bytes = std::fs::read(&resolved)
        .map_err(|error| format!("failed to read gameplay WASM module: {error}"))?;
    host.0.load(&bytes)?;
    Ok(format!("Loaded gameplay WASM module from {}.", resolved.display()))
}

#[tauri::command]
pub fn wasm_watch_and_hot_reload(
    path: String,
    host: State<'_, WasmHostState>,
    project_root: State<'_, ProjectRootState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    let root = locked_project_root(&project_root)?;
    let resolved = ensure_allowed_existing_path(&path, root.as_deref())?;
    let bytes = std::fs::read(&resolved)
        .map_err(|error| format!("failed to read gameplay WASM module: {error}"))?;
    host.0.load(&bytes)?;
    spawn_wasm_watcher(resolved.clone(), host.0.clone(), app_handle);
    Ok(format!(
        "Watching {} for deterministic gameplay hot-reload.",
        resolved.display()
    ))
}

#[tauri::command]
pub fn wasm_step(dt: f32, host: State<'_, WasmHostState>) -> Result<GameplayState, String> {
    host.0.step(dt)
}

#[tauri::command]
pub fn wasm_host_status(host: State<'_, WasmHostState>) -> bool {
    host.0.is_module_loaded()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn fallback_gravity_integrator_is_deterministic_without_a_loaded_module() {
        let host = WasmGameplayHost::default();
        assert!(!host.is_module_loaded());

        let first = host.step(1.0 / 60.0).expect("step succeeds");
        let second = host.step(1.0 / 60.0).expect("step succeeds");

        assert!(second.velocity_y < first.velocity_y, "gravity should keep accelerating downward");
        assert!(second.position_y < first.position_y, "falling object should keep losing height");
    }

    #[test]
    fn loading_garbage_bytes_fails_cleanly_without_poisoning_the_host() {
        let host = WasmGameplayHost::default();
        let result = host.load(b"not a real wasm module");
        assert!(result.is_err());
        // The host should still be perfectly usable via the gravity fallback.
        assert!(host.step(0.016).is_ok());
    }
}
