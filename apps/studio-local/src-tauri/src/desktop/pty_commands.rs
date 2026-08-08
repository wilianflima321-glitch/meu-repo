//! Native PTY terminal lifecycle management.
//!
//! Honesty / Law #48 (AgentShellPolicy):
//! - These commands are the **human-operator** host PTY lane (Studio Local UI).
//! - Agent / Fusion tools MUST NOT invoke `terminal_*` — sandbox-only after L.1.
//! - Cwd is confined to the locked project root when set (`ensure_allowed_existing_path`).

use std::collections::BTreeMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::Serialize;

use super::security::{ensure_allowed_existing_path, locked_project_root, ProjectRootState, MAX_TERMINAL_INPUT_BYTES};
use super::window_commands::NativeCommandStatus;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSessionResponse {
    pub id: String,
    pub state: String,
    pub reason: String,
    pub cwd: Option<String>,
}

// `id`/`cwd` are populated for every session (and mirrored into the map key / spawn
// args) but have no reader yet — a `terminal_list_sessions` introspection command
// (parity with VS Code's terminal picker) is scoped for a future IDE-shell round.
#[derive(Clone)]
pub(crate) struct TerminalSessionRecord {
    #[allow(dead_code)]
    pub id: String,
    #[allow(dead_code)]
    pub cwd: Option<String>,
    pub pty_writer: Arc<Mutex<Box<dyn std::io::Write + Send>>>,
    pub pty_master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
}

#[derive(Default)]
pub struct TerminalSessionStore {
    pub(crate) next_id: u64,
    pub(crate) sessions: BTreeMap<String, TerminalSessionRecord>,
}

impl TerminalSessionStore {
    pub(crate) fn create_held(&mut self, cwd: Option<String>, app_handle: tauri::AppHandle) -> Result<TerminalSessionResponse, String> {
        self.next_id += 1;
        let id = format!("terminal-native-{}", self.next_id);
        
        let pty_system = native_pty_system();
        let pair = pty_system.openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        }).map_err(|e| format!("Failed to create PTY pair: {}", e))?;
        
        #[cfg(target_os = "windows")]
        let mut cmd = CommandBuilder::new("powershell.exe");
        #[cfg(not(target_os = "windows"))]
        let mut cmd = CommandBuilder::new("bash");
        
        if let Some(ref d) = cwd {
            cmd.cwd(d);
        }
        
        let _child = pair.slave.spawn_command(cmd).map_err(|e| format!("Failed to spawn shell: {}", e))?;
        
        let mut reader = pair.master.try_clone_reader().map_err(|e| format!("Failed to clone reader: {}", e))?;
        let writer = pair.master.take_writer().map_err(|e| format!("Failed to take writer: {}", e))?;
        
        let emit_id = id.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 1024];
            while let Ok(n) = reader.read(&mut buf) {
                if n == 0 { break; }
                let bytes = buf[..n].to_vec();
                use tauri::Emitter;
                let _ = app_handle.emit(&format!("terminal_data_{}", emit_id), bytes);
            }
        });
        
        self.sessions.insert(
            id.clone(),
            TerminalSessionRecord {
                id: id.clone(),
                cwd: cwd.clone(),
                pty_writer: Arc::new(Mutex::new(writer)),
                pty_master: Arc::new(Mutex::new(pair.master)),
            },
        );
        
        Ok(TerminalSessionResponse {
            id,
            state: "running".to_string(),
            reason: "Native PTY shell process spawned successfully.".to_string(),
            cwd,
        })
    }

    pub(crate) fn write_held(&mut self, session_id: &str, input: &str) -> Result<NativeCommandStatus, String> {
        let session = self
            .sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Studio Local terminal session was not found: {session_id}"))?;
            
        let mut writer = session.pty_writer.lock().map_err(|_| "Terminal PTY lock poisoned".to_string())?;
        writer.write_all(input.as_bytes()).map_err(|e| format!("Failed to write to PTY: {}", e))?;
        writer.flush().map_err(|e| format!("Failed to flush PTY: {}", e))?;
        
        Ok(NativeCommandStatus {
            state: "running".to_string(),
            reason: "Input piped to native shell.".to_string(),
        })
    }

    pub(crate) fn resize_held(&mut self, session_id: &str, rows: u16, cols: u16) -> Result<NativeCommandStatus, String> {
        let session = self
            .sessions
            .get_mut(session_id)
            .ok_or_else(|| format!("Studio Local terminal session was not found: {session_id}"))?;

        let master = session
            .pty_master
            .lock()
            .map_err(|_| "Terminal PTY master lock poisoned".to_string())?;
        master
            .resize(PtySize { rows, cols, pixel_width: 0, pixel_height: 0 })
            .map_err(|error| format!("Failed to resize native PTY: {error}"))?;

        Ok(NativeCommandStatus {
            state: "running".to_string(),
            reason: format!("Native PTY resized to {cols}x{rows}."),
        })
    }

    pub(crate) fn close(&mut self, session_id: &str) -> Result<NativeCommandStatus, String> {
        self.sessions
            .remove(session_id)
            .ok_or_else(|| format!("Studio Local terminal session was not found: {session_id}"))?;
            
        Ok(NativeCommandStatus {
            state: "terminated".to_string(),
            reason: "Terminal session dropped, killing process.".to_string(),
        })
    }
}

#[tauri::command]
pub fn terminal_create(
    cwd: Option<String>,
    store: tauri::State<'_, std::sync::Mutex<TerminalSessionStore>>,
    project_root: tauri::State<'_, ProjectRootState>,
    app_handle: tauri::AppHandle,
) -> Result<TerminalSessionResponse, String> {
    let root = locked_project_root(&project_root)?;
    let cwd = match cwd {
        Some(path) if !path.trim().is_empty() => {
            let resolved = ensure_allowed_existing_path(&path, root.as_deref())?;
            if !resolved.is_dir() {
                return Err("Studio Local terminal cwd must be an allowed directory.".to_string());
            }
            Some(resolved.display().to_string())
        }
        _ => root.map(|value| value.display().to_string()),
    };

    let mut store = store
        .lock()
        .map_err(|_| "Studio Local terminal store lock is poisoned.".to_string())?;
    store.create_held(cwd, app_handle)
}

#[tauri::command]
pub fn terminal_write(
    session_id: String,
    input: String,
    store: tauri::State<'_, std::sync::Mutex<TerminalSessionStore>>,
) -> Result<NativeCommandStatus, String> {
    if input.len() > MAX_TERMINAL_INPUT_BYTES {
        return Err(format!(
            "Studio Local refuses terminal payloads larger than {MAX_TERMINAL_INPUT_BYTES} bytes."
        ));
    }
    let mut store = store
        .lock()
        .map_err(|_| "Studio Local terminal store lock is poisoned.".to_string())?;
    store.write_held(&session_id, &input)
}

#[tauri::command]
pub fn terminal_resize(
    session_id: String,
    rows: u16,
    cols: u16,
    store: tauri::State<'_, std::sync::Mutex<TerminalSessionStore>>,
) -> Result<NativeCommandStatus, String> {
    let mut store = store
        .lock()
        .map_err(|_| "Studio Local terminal store lock is poisoned.".to_string())?;
    store.resize_held(&session_id, rows, cols)
}

#[tauri::command]
pub fn terminal_close(
    session_id: String,
    store: tauri::State<'_, std::sync::Mutex<TerminalSessionStore>>,
) -> Result<NativeCommandStatus, String> {
    let mut store = store
        .lock()
        .map_err(|_| "Studio Local terminal store lock is poisoned.".to_string())?;
    store.close(&session_id)
}
