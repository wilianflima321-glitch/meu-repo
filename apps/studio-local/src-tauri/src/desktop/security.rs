//! Native security policy, path validation, and project root state.

use std::env;
use std::path::{Component, Path, PathBuf};
use std::sync::Mutex;

pub const MAX_TEXT_FILE_BYTES: u64 = 2 * 1024 * 1024;
pub const MAX_WRITE_BYTES: usize = 2 * 1024 * 1024;
pub const MAX_TERMINAL_INPUT_BYTES: usize = 64 * 1024;
pub const ALLOWED_ROOTS_ENV: &str = "AETHEL_STUDIO_ALLOWED_ROOTS";
pub const DENIED_SEGMENTS: &[&str] = &[".git", "node_modules", ".next", "target"];

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

#[tauri::command]
pub fn pick_project_directory() -> Result<Option<String>, String> {
    let folder = rfd::FileDialog::new()
        .set_title("Open Aethel project folder")
        .pick_folder();
    Ok(folder.map(|path| path.display().to_string()))
}

#[tauri::command]
pub fn get_project_root(state: tauri::State<'_, ProjectRootState>) -> Result<Option<String>, String> {
    let guard = state
        .0
        .lock()
        .map_err(|_| "Studio Local project root lock is poisoned.".to_string())?;
    Ok(guard.as_ref().map(|path| path.display().to_string()))
}

pub(crate) fn split_allowed_roots(value: &str) -> Vec<PathBuf> {
    value
        .split([';', ','])
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(PathBuf::from)
        .collect()
}

pub(crate) fn allowed_roots(project_root: Option<&Path>) -> Vec<PathBuf> {
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

pub(crate) fn has_denied_segment(path: &Path) -> bool {
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

pub(crate) fn resolve_existing_path(input: &str) -> Result<PathBuf, String> {
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

pub(crate) fn ensure_allowed_resolved_path(resolved: PathBuf, project_root: Option<&Path>) -> Result<PathBuf, String> {
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

pub(crate) fn ensure_allowed_write_path(input: &str, project_root: Option<&Path>) -> Result<PathBuf, String> {
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
