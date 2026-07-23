//! Filesystem tree, read, write, and watcher IPC commands.

use std::fs;
use std::path::Path;
use std::sync::mpsc::channel;
use std::thread;

use notify::{RecursiveMode, Watcher};
use serde::Serialize;

use super::security::{
    ensure_allowed_existing_path, ensure_allowed_write_path, has_denied_segment,
    locked_project_root, ProjectRootState, MAX_TEXT_FILE_BYTES, MAX_WRITE_BYTES,
};
use super::window_commands::NativeCommandStatus;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileTreeNode {
    pub name: String,
    pub path: String,
    #[serde(rename = "type")]
    pub entry_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileTreeNode>>,
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

    let depth_limit = max_depth.unwrap_or(6).min(32);
    walk_tree(&path, depth_limit)
}

pub(crate) fn walk_tree(dir: &Path, remaining_depth: u32) -> Result<Vec<FileTreeNode>, String> {
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
