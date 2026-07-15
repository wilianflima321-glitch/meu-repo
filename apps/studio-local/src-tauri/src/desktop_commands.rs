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

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeNode {
    name: String,
    path: String,
    #[serde(rename = "type")]
    entry_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    children: Option<Vec<FileTreeNode>>,
}

/// Tarefa 4 (Segurança do SO): the single source of truth for "which
/// directory is the currently open Aethel project". Every filesystem/PTY
/// command resolves paths against this before falling back to anything
/// else, so a plugin or malformed IPC payload cannot walk out to `C:\Windows`
/// just because the app happened to be launched from an unrelated CWD.
///
/// Managed as Tauri state (`main.rs` calls `.manage(ProjectRootState::default())`),
/// set once via `set_project_root` when the user opens/creates a project.
#[derive(Default)]
pub struct ProjectRootState(pub Mutex<Option<PathBuf>>);

#[tauri::command]
pub fn set_project_root(
    path: String,
    state: tauri::State<'_, ProjectRootState>,
) -> Result<String, String> {
    let resolved = PathBuf::from(&path)
        .canonicalize()
        .map_err(|error| format!("Studio Local could not resolve project root '{path}': {error}"))?;
    if !resolved.is_dir() {
        return Err("Studio Local project root must be an existing directory.".to_string());
    }

    let mut guard = state
        .0
        .lock()
        .map_err(|_| "Studio Local project root lock is poisoned.".to_string())?;
    *guard = Some(resolved.clone());
    Ok(resolved.display().to_string())
}

/// Focus 1B — native OS folder picker so FileExplorer can bind to a real
/// Windows/macOS/Linux directory without guessing CWD. Returns `None` when
/// the user cancels. Always followed by `set_project_root` on the client.
#[tauri::command]
pub fn pick_project_directory() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new()
        .set_title("Open Aethel project folder")
        .pick_folder();
    Ok(folder.map(|path| path.display().to_string()))
}

/// Focus 1B — FileExplorer host-disk truth. Returns the active project root
/// (if `set_project_root` was called) so the WebView can invoke `fs_tree` /
/// `fs_watch` against the real Windows/macOS/Linux path without guessing CWD.
#[tauri::command]
pub fn get_project_root(state: tauri::State<'_, ProjectRootState>) -> Result<Option<String>, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "Studio Local project root lock is poisoned.".to_string())?;
    Ok(guard.as_ref().map(|path| path.display().to_string()))
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
    /// Kept alongside the writer purely so `resize_held` can call
    /// `MasterPty::resize` later — `take_writer`/`try_clone_reader` both
    /// borrow rather than consume, so the master handle stays valid for the
    /// lifetime of the session.
    pty_master: Arc<Mutex<Box<dyn portable_pty::MasterPty + Send>>>,
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

    fn resize_held(&mut self, session_id: &str, rows: u16, cols: u16) -> Result<NativeCommandStatus, String> {
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

/// Resolves the set of roots native filesystem commands are allowed to touch,
/// in priority order:
///   1. The explicit `project_root` set via `set_project_root` (the normal,
///      hardened path once a project is open).
///   2. `AETHEL_STUDIO_ALLOWED_ROOTS` (operator/CI override for tests and
///      local dev setups without a running project session).
///   3. The process current directory — a dev-convenience fallback ONLY, so
///      Studio Local isn't completely unusable before a project is opened.
///      A packaged production build should never rely on this: whatever
///      directory the OS happened to launch the .exe from (which can be
///      anywhere, including a user's Desktop or Downloads) is not an
///      acceptable filesystem boundary on its own.
fn allowed_roots(project_root: Option<&Path>) -> Vec<PathBuf> {
    let mut roots: Vec<PathBuf> = Vec::new();

    if let Some(root) = project_root {
        roots.push(root.to_path_buf());
    }

    let env_roots = env::var(ALLOWED_ROOTS_ENV)
        .map(|value| split_allowed_roots(&value))
        .unwrap_or_default();
    let has_env_override = !env_roots.is_empty();
    roots.extend(env_roots);

    if project_root.is_none() && !has_env_override {
        if let Ok(current_dir) = env::current_dir() {
            roots.push(current_dir);
        }
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

pub(crate) fn ensure_allowed_existing_path(input: &str, project_root: Option<&Path>) -> Result<PathBuf, String> {
    let resolved = resolve_existing_path(input)?;
    ensure_allowed_resolved_path(resolved, project_root)
}

fn ensure_allowed_resolved_path(resolved: PathBuf, project_root: Option<&Path>) -> Result<PathBuf, String> {
    if has_denied_segment(&resolved) {
        return Err(
            "Studio Local blocks protected workspace internals for native filesystem commands."
                .to_string(),
        );
    }

    let roots = allowed_roots(project_root);
    if roots.is_empty() || !roots.iter().any(|root| resolved.starts_with(root)) {
        return Err(format!(
            "Path is outside Studio Local allowed roots. Call set_project_root or configure {ALLOWED_ROOTS_ENV} before granting native filesystem access."
        ));
    }

    Ok(resolved)
}

fn ensure_allowed_write_path(input: &str, project_root: Option<&Path>) -> Result<PathBuf, String> {
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
    ensure_allowed_resolved_path(resolved, project_root)
}

pub(crate) fn locked_project_root(state: &tauri::State<'_, ProjectRootState>) -> Result<Option<PathBuf>, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "Studio Local project root lock is poisoned.".to_string())?;
    Ok(guard.clone())
}

#[tauri::command]
pub fn fs_read(path: String, project_root: tauri::State<'_, ProjectRootState>) -> Result<String, String> {
    let root = locked_project_root(&project_root)?;
    let path = ensure_allowed_existing_path(&path, root.as_deref())?;
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
pub fn fs_write(
    path: String,
    content: String,
    project_root: tauri::State<'_, ProjectRootState>,
) -> Result<(), String> {
    if content.len() > MAX_WRITE_BYTES {
        return Err(format!(
            "Studio Local refuses to write payloads larger than {MAX_WRITE_BYTES} bytes through the UI bridge."
        ));
    }
    let root = locked_project_root(&project_root)?;
    let path = ensure_allowed_write_path(&path, root.as_deref())?;
    fs::write(&path, content).map_err(|error| format!("failed to write file: {error}"))
}

#[tauri::command]
pub fn fs_list(path: String, project_root: tauri::State<'_, ProjectRootState>) -> Result<Vec<FileEntry>, String> {
    let root = locked_project_root(&project_root)?;
    let path = ensure_allowed_existing_path(&path, root.as_deref())?;
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

/// Tarefa 3 (Fim do Limite Web): recursive tree listing so the native
/// `FileService` can hydrate a whole project (tens of thousands of files)
/// in one IPC round-trip instead of one `fs_list` call per directory level —
/// the same shape the web `/api/files/tree` route already returns, so
/// `NativeIDEBackend`'s tree flattening logic on the frontend is identical
/// to the web `FileService`'s.
#[tauri::command]
pub fn fs_tree(
    path: String,
    max_depth: Option<u32>,
    project_root: tauri::State<'_, ProjectRootState>,
) -> Result<Vec<FileTreeNode>, String> {
    let root_state = locked_project_root(&project_root)?;
    let path = ensure_allowed_existing_path(&path, root_state.as_deref())?;
    let metadata =
        fs::metadata(&path).map_err(|error| format!("failed to inspect directory: {error}"))?;
    if !metadata.is_dir() {
        return Err("Studio Local fs_tree only accepts directories.".to_string());
    }

    // Depth is capped even when the caller asks for more: a runaway `max_depth`
    // from a malformed IPC payload should degrade gracefully, not let a
    // pathological symlink/junction farm blow the call up.
    let depth_limit = max_depth.unwrap_or(6).min(32);
    walk_tree(&path, depth_limit)
}

fn walk_tree(dir: &Path, remaining_depth: u32) -> Result<Vec<FileTreeNode>, String> {
    let mut entries = Vec::new();
    for entry in fs::read_dir(dir).map_err(|error| format!("failed to list directory: {error}"))? {
        let entry = entry.map_err(|error| format!("failed to inspect directory entry: {error}"))?;
        let entry_path = entry.path();
        if has_denied_segment(&entry_path) {
            continue;
        }
        let metadata = entry
            .metadata()
            .map_err(|error| format!("failed to inspect directory entry: {error}"))?;
        let name = entry.file_name().to_string_lossy().into_owned();

        if metadata.is_dir() {
            let children = if remaining_depth > 0 {
                Some(walk_tree(&entry_path, remaining_depth - 1)?)
            } else {
                None
            };
            entries.push(FileTreeNode {
                name,
                path: entry_path.display().to_string(),
                entry_type: "directory".to_string(),
                children,
            });
        } else {
            entries.push(FileTreeNode {
                name,
                path: entry_path.display().to_string(),
                entry_type: "file".to_string(),
                children: None,
            });
        }
    }
    entries.sort_by(|left, right| (left.entry_type == "file", &left.name).cmp(&(right.entry_type == "file", &right.name)));
    Ok(entries)
}

#[tauri::command]
pub fn fs_watch(
    path: String,
    app_handle: tauri::AppHandle,
    project_root: tauri::State<'_, ProjectRootState>,
) -> Result<NativeCommandStatus, String> {
    let root = locked_project_root(&project_root)?;
    let path = ensure_allowed_existing_path(&path, root.as_deref())?;

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
        // Falls back to the project root itself so "npm install"/"git status"
        // always run somewhere inside the sandboxed project, never wherever
        // the OS happened to launch the process from.
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

    // `fs_read`/`fs_write`/`fs_list` are now thin `#[tauri::command]` wrappers
    // that pull `ProjectRootState` from Tauri-managed state, which a plain
    // `cargo test` unit test has no running `App` to inject. The actual
    // guarded-path logic they all funnel through — `ensure_allowed_existing_path`
    // / `ensure_allowed_write_path` — is exercised directly here instead, with
    // an explicit `project_root` argument standing in for what Tauri would
    // inject in production.
    #[test]
    fn filesystem_guards_scope_reads_writes_and_listing_to_the_project_root() {
        let root = test_workspace("filesystem");
        let file = root.join("note.txt");

        let write_path = ensure_allowed_write_path(&file.display().to_string(), Some(&root))
            .expect("write path allowed inside project root");
        fs::write(&write_path, "hello from Studio Local").expect("write allowed file");

        let read_path = ensure_allowed_existing_path(&file.display().to_string(), Some(&root))
            .expect("read path allowed inside project root");
        let contents = fs::read_to_string(&read_path).expect("read allowed file");
        assert_eq!(contents, "hello from Studio Local");

        let entries = fs_list_at(&root, Some(&root)).expect("list allowed directory");
        assert!(entries
            .iter()
            .any(|entry| entry.path.ends_with("note.txt") && entry.entry_type == "file"));

        let protected_dir = root.join(".git");
        fs::create_dir_all(&protected_dir).expect("protected dir created");
        let protected_file = protected_dir.join("config");
        fs::write(&protected_file, "secret").expect("protected file created");
        let error = ensure_allowed_existing_path(&protected_file.display().to_string(), Some(&root))
            .expect_err("protected path is blocked");
        assert!(error.contains("protected workspace internals"));

        let outside = env::temp_dir().join(format!(
            "aethel-studio-local-outside-{}",
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0)
        ));
        fs::write(&outside, "should not be reachable").expect("outside file created");
        let outside_error = ensure_allowed_existing_path(&outside.display().to_string(), Some(&root))
            .expect_err("path outside the project root is blocked");
        assert!(outside_error.contains("outside Studio Local allowed roots"));

        let _ = fs::remove_file(outside);
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn fs_tree_builds_a_nested_listing_bounded_by_depth() {
        let root = test_workspace("tree");
        fs::create_dir_all(root.join("nested/deeper")).expect("nested dirs created");
        fs::write(root.join("top.txt"), "top").expect("top file created");
        fs::write(root.join("nested/mid.txt"), "mid").expect("mid file created");
        fs::write(root.join("nested/deeper/leaf.txt"), "leaf").expect("leaf file created");

        let shallow = walk_tree(&root, 1).expect("shallow tree walk");
        let nested_dir = shallow
            .iter()
            .find(|node| node.name == "nested")
            .expect("nested directory present");
        let nested_children = nested_dir
            .children
            .as_ref()
            .expect("nested directory expanded at depth 1");
        assert!(nested_children.iter().any(|node| node.name == "mid.txt"));
        let deeper_dir = nested_children
            .iter()
            .find(|node| node.name == "deeper")
            .expect("deeper directory listed");
        assert!(
            deeper_dir.children.is_none(),
            "depth budget exhausted before expanding 'deeper'"
        );

        let _ = fs::remove_dir_all(root);
    }

    /// Test-only helper mirroring `fs_list`'s body without the Tauri `State`
    /// parameter, so the directory-listing logic can be exercised directly.
    fn fs_list_at(path: &Path, project_root: Option<&Path>) -> Result<Vec<FileEntry>, String> {
        let path = ensure_allowed_existing_path(&path.display().to_string(), project_root)?;
        let mut entries = Vec::new();
        for entry in fs::read_dir(&path).map_err(|error| format!("failed to list directory: {error}"))? {
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
                entry_type: if metadata.is_dir() { "folder".to_string() } else { "file".to_string() },
            });
        }
        entries.sort_by(|left, right| left.path.cmp(&right.path));
        Ok(entries)
    }

    // NOTE: `create_held` (despite the legacy name kept for the small public
    // diff) now spawns a REAL `portable-pty` shell process and requires a
    // live `tauri::AppHandle` to emit `terminal_data_*` events from its
    // reader thread. Constructing a real `AppHandle` needs a running Tauri
    // `App` (see `tauri::test::mock_app` in newer Tauri test features) which
    // this crate does not currently pull in as a dev-dependency. Spawning an
    // actual shell process in a plain `cargo test` unit test is also slow
    // and platform-fragile (different shells/exit codes per CI runner).
    //
    // So this test intentionally only exercises the AppHandle-free error
    // paths (`write_held`/`close` against a session that was never created)
    // — the real spawn path is covered by manual/integration QA against a
    // running Studio Local window. Do not read this test as "PTY spawning is
    // verified" — see `native_kernel.rs`'s `native-pty-contract` entry for
    // the honest capability state instead.
    #[test]
    fn terminal_write_and_close_fail_for_unknown_session() {
        let mut store = TerminalSessionStore::default();

        let write_error = store
            .write_held("missing-session", "echo 42\n")
            .expect_err("writing to an unknown session must fail");
        assert!(write_error.contains("was not found"));

        let close_error = store
            .close("missing-session")
            .expect_err("closing an unknown session must fail");
        assert!(close_error.contains("was not found"));

        let resize_error = store
            .resize_held("missing-session", 40, 120)
            .expect_err("resizing an unknown session must fail");
        assert!(resize_error.contains("was not found"));
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
    fn project_root_state_round_trips_for_host_disk_explorer() {
        let root = test_workspace("project-root");
        let state = ProjectRootState::default();
        {
            let guard = state.0.lock().expect("lock");
            assert!(guard.is_none());
        }
        {
            let mut guard = state.0.lock().expect("lock");
            *guard = Some(root.clone());
        }
        {
            let guard = state.0.lock().expect("lock");
            assert_eq!(
                guard.as_ref().map(|p| p.display().to_string()),
                Some(root.display().to_string())
            );
        }
        let _ = fs::remove_dir_all(root);
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
