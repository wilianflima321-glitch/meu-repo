use std::env;
use std::fs;
use std::path::{Component, Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::Window;

const MAX_TEXT_FILE_BYTES: u64 = 2 * 1024 * 1024;
const MAX_WRITE_BYTES: usize = 2 * 1024 * 1024;
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
            .map(|segment| DENIED_SEGMENTS.iter().any(|denied| segment.eq_ignore_ascii_case(denied)))
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
        return Err("Studio Local blocks protected workspace internals for native filesystem commands.".to_string());
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

    let parent = absolute
        .parent()
        .ok_or_else(|| "Studio Local requires a parent directory before native writes.".to_string())?;
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
    let metadata = fs::metadata(&path).map_err(|error| format!("failed to inspect file: {error}"))?;
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
    let metadata = fs::metadata(&path).map_err(|error| format!("failed to inspect directory: {error}"))?;
    if !metadata.is_dir() {
        return Err("Studio Local fs_list only accepts directories.".to_string());
    }

    let mut entries = Vec::new();
    for entry in fs::read_dir(&path).map_err(|error| format!("failed to list directory: {error}"))? {
        let entry = entry.map_err(|error| format!("failed to inspect directory entry: {error}"))?;
        let entry_path = entry.path();
        if has_denied_segment(&entry_path) {
            continue;
        }
        let metadata = entry.metadata().map_err(|error| format!("failed to inspect directory entry: {error}"))?;
        entries.push(FileEntry {
            path: entry_path.display().to_string(),
            entry_type: if metadata.is_dir() { "folder".to_string() } else { "file".to_string() },
        });
    }
    entries.sort_by(|left, right| left.path.cmp(&right.path));
    Ok(entries)
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
    window.minimize().map_err(|error| format!("failed to minimize window: {error}"))
}

#[tauri::command]
pub fn window_toggle_maximize(window: Window) -> Result<(), String> {
    let is_maximized = window
        .is_maximized()
        .map_err(|error| format!("failed to inspect window state: {error}"))?;
    if is_maximized {
        window.unmaximize().map_err(|error| format!("failed to unmaximize window: {error}"))
    } else {
        window.maximize().map_err(|error| format!("failed to maximize window: {error}"))
    }
}

#[tauri::command]
pub fn window_close(window: Window) -> Result<(), String> {
    window.close().map_err(|error| format!("failed to close window: {error}"))
}