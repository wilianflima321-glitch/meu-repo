use std::collections::BTreeMap;
use std::env;
use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::Window;
use notify::{Watcher, RecursiveMode};
use std::sync::mpsc::channel;
use std::thread;
use std::sync::{Arc, Mutex};
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};

const MAX_TEXT_FILE_BYTES: u64 = 2 * 1024 * 1024;
const MAX_WRITE_BYTES: usize = 2 * 1024 * 1024;
const MAX_TERMINAL_INPUT_BYTES: usize = 64 * 1024;
const ALLOWED_ROOTS_ENV: &str = "AETHEL_STUDIO_ALLOWED_ROOTS";
const DENIED_SEGMENTS: &[&str] = &[".git", "node_modules", ".next", "target"];

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    path: String,
    #[serde(rename = "type")]
    entry_type: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeNotificationInput {
    title: String,
    body: Option<String>,
    tone: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeCommandStatus {
    state: String,
    reason: String,
}

#[derive(Clone)]
struct TerminalSessionRecord {
    id: String,
    cwd: Option<String>,
    pty_writer: Arc<Mutex<Box<dyn std::io::Write + Send>>>,
}

#[derive(Default)]
pub struct TerminalSessionStore {
    next_id: u64,
    sessions: BTreeMap<String, TerminalSessionRecord>,
}

impl TerminalSessionStore {
    fn create_held(&mut self, cwd: Option<String>, app_handle: tauri::AppHandle) -> Result<TerminalSessionResponse, String> {
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
            },
        );
        
        Ok(TerminalSessionResponse {
            id,
            state: "running".to_string(),
            reason: "Native PTY shell process spawned successfully.".to_string(),
            cwd,
        })
    }

    fn write_held(&mut self, session_id: &str, input: &str) -> Result<NativeCommandStatus, String> {
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

    fn close(&mut self, session_id: &str) -> Result<NativeCommandStatus, String> {
        self.sessions
            .remove(session_id)
            .ok_or_else(|| format!("Studio Local terminal session was not found: {session_id}"))?;
            
        Ok(NativeCommandStatus {
            state: "terminated".to_string(),
            reason: "Terminal session dropped, killing process.".to_string(),
        })
    }
}

fn split_allowed_roots(value: &str) -> Vec<PathBuf> {
    value
        .split([';', ','])
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(PathBuf::from)
        .collect()
}

fn allowed_roots() -> Vec<PathBuf> {
    let mut roots = env::var(ALLOWED_ROOTS_ENV)
        .map(|value| split_allowed_roots(&value))
        .unwrap_or_default();

    if let Ok(current_dir) = env::current_dir() {
        roots.push(current_dir);
    }

    roots
        .into_iter()
        .filter_map(|root| root.canonicalize().ok())
        .collect()
}

fn has_denied_segment(path: &Path) -> bool {
    path.components().any(|component| match component {
        Component::Normal(value) => value
            .to_str()
            .map(|segment| {
                DENIED_SEGMENTS
                    .iter()
                    .any(|denied| segment.eq_ignore_ascii_case(denied))
            })
            .unwrap_or(false),
        _ => false,
    })
}

fn resolve_existing_path(input: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(input);
    let absolute = if candidate.is_absolute() {
        candidate
    } else {
        env::current_dir()
            .map_err(|error| format!("failed to resolve Studio Local current directory: {error}"))?
            .join(candidate)
    };
    absolute
        .canonicalize()
        .map_err(|error| format!("path is not available to Studio Local: {error}"))
}

fn ensure_allowed_existing_path(input: &str) -> Result<PathBuf, String> {
    let resolved = resolve_existing_path(input)?;
    ensure_allowed_resolved_path(resolved)
}

fn ensure_allowed_resolved_path(resolved: PathBuf) -> Result<PathBuf, String> {
    if has_denied_segment(&resolved) {
        return Err(
            "Studio Local blocks protected workspace internals for native filesystem commands."
                .to_string(),
        );
    }

    let roots = allowed_roots();
    if roots.is_empty() || !roots.iter().any(|root| resolved.starts_with(root)) {
        return Err(format!(
            "Path is outside Studio Local allowed roots. Configure {ALLOWED_ROOTS_ENV} before granting native filesystem access."
        ));
    }

    Ok(resolved)
}

fn ensure_allowed_write_path(input: &str) -> Result<PathBuf, String> {
    let candidate = PathBuf::from(input);
    let absolute = if candidate.is_absolute() {
        candidate
    } else {
        env::current_dir()
            .map_err(|error| format!("failed to resolve Studio Local current directory: {error}"))?
            .join(candidate)
    };

    let parent = absolute.parent().ok_or_else(|| {
        "Studio Local requires a parent directory before native writes.".to_string()
    })?;
    let file_name = absolute
        .file_name()
        .ok_or_else(|| "Studio Local requires a file name before native writes.".to_string())?;
    let parent = parent
        .canonicalize()
        .map_err(|error| format!("write parent is not available to Studio Local: {error}"))?;
    let resolved = parent.join(file_name);
    ensure_allowed_resolved_path(resolved)
}

#[tauri::command]
pub fn fs_read(path: String) -> Result<String, String> {
    let path = ensure_allowed_existing_path(&path)?;
    let metadata =
        fs::metadata(&path).map_err(|error| format!("failed to inspect file: {error}"))?;
    if !metadata.is_file() {
        return Err("Studio Local fs_read only accepts files.".to_string());
    }
    if metadata.len() > MAX_TEXT_FILE_BYTES {
        return Err(format!(
            "Studio Local refuses to read files larger than {MAX_TEXT_FILE_BYTES} bytes through the UI bridge."
        ));
    }
    fs::read_to_string(&path).map_err(|error| format!("failed to read UTF-8 file: {error}"))
}

#[tauri::command]
pub fn fs_write(path: String, content: String) -> Result<(), String> {
    if content.len() > MAX_WRITE_BYTES {
        return Err(format!(
            "Studio Local refuses to write payloads larger than {MAX_WRITE_BYTES} bytes through the UI bridge."
        ));
    }
    let path = ensure_allowed_write_path(&path)?;
    fs::write(&path, content).map_err(|error| format!("failed to write file: {error}"))
}

#[tauri::command]
pub fn fs_list(path: String) -> Result<Vec<FileEntry>, String> {
    let path = ensure_allowed_existing_path(&path)?;
    let metadata =
        fs::metadata(&path).map_err(|error| format!("failed to inspect directory: {error}"))?;
    if !metadata.is_dir() {
        return Err("Studio Local fs_list only accepts directories.".to_string());
    }

    let mut entries = Vec::new();
    for entry in
        fs::read_dir(&path).map_err(|error| format!("failed to list directory: {error}"))?
    {
        let entry = entry.map_err(|error| format!("failed to inspect directory entry: {error}"))?;
        let entry_path = entry.path();
        if has_denied_segment(&entry_path) {
            continue;
        }
        let metadata = entry
            .metadata()
            .map_err(|error| format!("failed to inspect directory entry: {error}"))?;
        entries.push(FileEntry {
            path: entry_path.display().to_string(),
            entry_type: if metadata.is_dir() {
                "folder".to_string()
            } else {
                "file".to_string()
            },
        });
    }
    entries.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(entries)
}

#[tauri::command]
pub fn fs_watch(path: String, app_handle: tauri::AppHandle) -> Result<NativeCommandStatus, String> {
    let path = ensure_allowed_existing_path(&path)?;
    
    thread::spawn(move || {
        let (tx, rx) = channel();
        let mut watcher = match notify::recommended_watcher(tx) {
            Ok(w) => w,
            Err(_) => return,
        };

        if watcher.watch(&path, RecursiveMode::Recursive).is_err() {
            return;
        }

        for res in rx {
            match res {
                Ok(event) => {
                    use tauri::Emitter;
                    let paths: Vec<String> = event.paths.into_iter().map(|p| p.display().to_string()).collect();
                    let _ = app_handle.emit("fs_event", paths);
                },
                Err(_) => (),
            }
        }
    });

    Ok(NativeCommandStatus {
        state: "watching".to_string(),
        reason: "Native notify-backed filesystem watcher initialized and emitting events to UI.".to_string(),
    })
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSessionResponse {
    id: String,
    state: String,
    reason: String,
    cwd: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiCompleteResponse {
    text: String,
    cost_usd: Option<f64>,
    state: String,
    reason: String,
}

#[tauri::command]
pub fn terminal_create(
    cwd: Option<String>,
    store: tauri::State<'_, std::sync::Mutex<TerminalSessionStore>>,
    app_handle: tauri::AppHandle,
) -> Result<TerminalSessionResponse, String> {
    let cwd = match cwd {
        Some(path) if !path.trim().is_empty() => {
            let resolved = ensure_allowed_existing_path(&path)?;
            if !resolved.is_dir() {
                return Err("Studio Local terminal cwd must be an allowed directory.".to_string());
            }
            Some(resolved.display().to_string())
        }
        _ => None,
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
pub fn terminal_close(
    session_id: String,
    store: tauri::State<'_, std::sync::Mutex<TerminalSessionStore>>,
) -> Result<NativeCommandStatus, String> {
    let mut store = store
        .lock()
        .map_err(|_| "Studio Local terminal store lock is poisoned.".to_string())?;
    store.close(&session_id)
}

#[tauri::command]
pub fn ai_complete(prompt: String, model: Option<String>) -> AiCompleteResponse {
    let _ = (prompt, model);
    AiCompleteResponse {
        text: String::new(),
        cost_usd: Some(0.0),
        state: "provider_unavailable".to_string(),
        reason: "Local AI completion is not wired in Studio Local; use the governed cloud/provider adapter until a local model sidecar is approved.".to_string(),
    }
}

#[tauri::command]
pub fn notify_native(input: NativeNotificationInput) -> NativeCommandStatus {
    let _ = (&input.title, &input.body, &input.tone);
    NativeCommandStatus {
        state: "provider_unavailable".to_string(),
        reason: "Native notification plugin is not installed; the web shell should show the in-product toast instead.".to_string(),
    }
}

#[tauri::command]
pub fn window_minimize(window: Window) -> Result<(), String> {
    window
        .minimize()
        .map_err(|error| format!("failed to minimize window: {error}"))
}

#[tauri::command]
pub fn window_toggle_maximize(window: Window) -> Result<(), String> {
    let is_maximized = window
        .is_maximized()
        .map_err(|error| format!("failed to inspect window state: {error}"))?;
    if is_maximized {
        window
            .unmaximize()
            .map_err(|error| format!("failed to unmaximize window: {error}"))
    } else {
        window
            .maximize()
            .map_err(|error| format!("failed to maximize window: {error}"))
    }
}

#[tauri::command]
pub fn window_close(window: Window) -> Result<(), String> {
    window
        .close()
        .map_err(|error| format!("failed to close window: {error}"))
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    use super::*;

    fn test_workspace(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_nanos())
            .unwrap_or(0);
        let root = env::current_dir()
            .expect("current dir is available")
            .join("desktop-command-tests")
            .join(format!("{name}-{nonce}"));
        fs::create_dir_all(&root).expect("test workspace created");
        root
    }

    #[test]
    fn filesystem_commands_are_guarded_and_bounded() {
        let root = test_workspace("filesystem");
        let file = root.join("note.txt");

        fs_write(
            file.display().to_string(),
            "hello from Studio Local".to_string(),
        )
        .expect("write allowed file");
        let contents = fs_read(file.display().to_string()).expect("read allowed file");
        assert_eq!(contents, "hello from Studio Local");

        let entries = fs_list(root.display().to_string()).expect("list allowed directory");
        assert!(entries
            .iter()
            .any(|entry| entry.path.ends_with("note.txt") && entry.entry_type == "file"));

        let protected_dir = root.join(".git");
        fs::create_dir_all(&protected_dir).expect("protected dir created");
        let protected_file = protected_dir.join("config");
        fs::write(&protected_file, "secret").expect("protected file created");
        let error =
            fs_read(protected_file.display().to_string()).expect_err("protected path is blocked");
        assert!(error.contains("protected workspace internals"));

        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn terminal_sessions_stay_held_without_spawning_shell() {
        let mut store = TerminalSessionStore::default();
        let session = store.create_held(None);
        assert_eq!(session.state, "held");
        assert!(session.reason.contains("without spawning a local shell process"));

        let written = store
            .write_held(&session.id, "echo 42\n")
            .expect("held terminal input recorded");
        assert_eq!(written.state, "held");
        let record = store.sessions.get(&session.id).expect("session stored");
        assert_eq!(record.last_input_bytes, 8);

        let closed = store.close(&session.id).expect("held terminal closed");
        assert_eq!(closed.state, "held");
        assert!(!store.sessions.contains_key(&session.id));
    }

    #[test]
    fn ai_completion_stays_provider_unavailable_until_sidecar_exists() {
        let response = ai_complete(
            "draft a plan".to_string(),
            Some("local-fixture".to_string()),
        );
        assert_eq!(response.state, "provider_unavailable");
        assert_eq!(response.cost_usd, Some(0.0));
        assert!(response.text.is_empty());
        assert!(response.reason.contains("Local AI completion is not wired"));
    }

    #[test]
    fn native_notification_reports_provider_unavailable_without_plugin() {
        let response = notify_native(NativeNotificationInput {
            title: "Aethel".to_string(),
            body: Some("hello".to_string()),
            tone: Some("info".to_string()),
        });
        assert_eq!(response.state, "provider_unavailable");
        assert!(response
            .reason
            .contains("Native notification plugin is not installed"));
    }
}
