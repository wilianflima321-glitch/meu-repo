//! Missão Suprema 4 — Memory-Mapped Files (Zero-Copy Streaming).
//!
//! Loading a huge asset (a baked physics world, a terrain heightmap, a giant
//! glTF binary blob) by `fs::read`-ing it into a `Vec<u8>` pays for a full
//! up-front read and a second in-memory copy before a single byte is
//! usable. Memory-mapping the file instead lets the OS page it in on
//! demand — the same core idea DirectStorage-style streaming relies on:
//! "the whole asset is addressable memory, faulted in lazily", just without
//! DirectStorage's GPU-side decompression stage, which is a much larger,
//! separate effort tied to a specific compression codec and is not claimed
//! here.
use std::collections::HashMap;
use std::fs::File;
use std::path::PathBuf;
use std::sync::Mutex;

use base64::engine::general_purpose::STANDARD as BASE64_STANDARD;
use base64::Engine as _;
use memmap2::Mmap;
use serde::Serialize;
use tauri::State;

use crate::desktop_commands::{ensure_allowed_existing_path, locked_project_root, ProjectRootState};

#[derive(Default)]
pub struct MmapRegistry {
    open_maps: HashMap<String, (Mmap, PathBuf)>,
    next_handle: u64,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MmapOpenResult {
    pub handle: String,
    pub size_bytes: u64,
    pub path: String,
}

fn lock<'a>(state: &'a State<'a, Mutex<MmapRegistry>>) -> Result<std::sync::MutexGuard<'a, MmapRegistry>, String> {
    state.lock().map_err(|_| "Studio Local mmap registry lock is poisoned.".to_string())
}

/// Opens a read-only memory mapping for `path` and returns an opaque handle
/// the frontend can pass to `mmap_read_range` / `mmap_close` — the file's
/// bytes are never fully copied into a JS-visible buffer up front, only the
/// specific byte ranges the caller actually asks for.
#[tauri::command]
pub fn mmap_open(
    path: String,
    project_root: State<'_, ProjectRootState>,
    registry: State<'_, Mutex<MmapRegistry>>,
) -> Result<MmapOpenResult, String> {
    let root = locked_project_root(&project_root)?;
    let resolved = ensure_allowed_existing_path(&path, root.as_deref())?;

    let file = File::open(&resolved).map_err(|error| format!("failed to open file for mmap: {error}"))?;
    let metadata = file
        .metadata()
        .map_err(|error| format!("failed to inspect file for mmap: {error}"))?;
    if !metadata.is_file() {
        return Err("Studio Local mmap_open only accepts regular files.".to_string());
    }

    // SAFETY: the mapped file must not be truncated or rewritten by another
    // process while the mapping is open, or reads through it become
    // undefined behaviour. This is the standard mmap caveat every
    // zero-copy asset loader accepts for files treated as immutable once
    // cooked (which is exactly how baked physics worlds / terrain / mesh
    // blobs are produced in this engine).
    let mmap = unsafe { Mmap::map(&file).map_err(|error| format!("failed to memory-map file: {error}"))? };
    let size_bytes = metadata.len();

    let mut guard = lock(&registry)?;
    guard.next_handle += 1;
    let handle = format!("mmap-{}", guard.next_handle);
    guard.open_maps.insert(handle.clone(), (mmap, resolved.clone()));

    Ok(MmapOpenResult {
        handle,
        size_bytes,
        path: resolved.display().to_string(),
    })
}

/// Reads `length` bytes starting at `offset` from an already-open mapping,
/// base64-encoded for the IPC round-trip (Tauri's default `invoke()` JSON
/// channel has no zero-copy binary transport to the webview; the zero-copy
/// win here is entirely on the native side — the OS never materializes the
/// whole file in this process's heap, only the touched pages).
#[tauri::command]
pub fn mmap_read_range(
    handle: String,
    offset: usize,
    length: usize,
    registry: State<'_, Mutex<MmapRegistry>>,
) -> Result<String, String> {
    const MAX_RANGE_BYTES: usize = 16 * 1024 * 1024;
    if length > MAX_RANGE_BYTES {
        return Err(format!(
            "Studio Local refuses to shuttle more than {MAX_RANGE_BYTES} mmap bytes across IPC in one call; issue multiple ranged reads instead."
        ));
    }

    let guard = lock(&registry)?;
    let (mmap, _path) = guard
        .open_maps
        .get(&handle)
        .ok_or_else(|| format!("unknown mmap handle: {handle}"))?;

    let end = offset
        .checked_add(length)
        .ok_or_else(|| "mmap range overflow".to_string())?;
    let slice = mmap
        .get(offset..end)
        .ok_or_else(|| format!("mmap range {offset}..{end} is out of bounds (file is {} bytes)", mmap.len()))?;

    Ok(BASE64_STANDARD.encode(slice))
}

#[tauri::command]
pub fn mmap_close(handle: String, registry: State<'_, Mutex<MmapRegistry>>) -> Result<bool, String> {
    let mut guard = lock(&registry)?;
    Ok(guard.open_maps.remove(&handle).is_some())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    fn temp_file_with(bytes: &[u8]) -> PathBuf {
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let path = std::env::temp_dir().join(format!("aethel-mmap-test-{nonce}.bin"));
        let mut file = File::create(&path).expect("temp file created");
        file.write_all(bytes).expect("temp file written");
        path
    }

    #[test]
    fn mapping_a_file_and_reading_a_range_returns_the_expected_bytes() {
        let path = temp_file_with(b"hello native mmap world");
        let file = File::open(&path).expect("file opened");
        let mmap = unsafe { Mmap::map(&file).expect("mmap succeeds") };

        assert_eq!(&mmap[0..5], b"hello");
        assert_eq!(&mmap[6..12], b"native");
        assert_eq!(mmap.len(), 23);

        let _ = std::fs::remove_file(path);
    }

    #[test]
    fn registry_tracks_and_releases_handles() {
        let path = temp_file_with(b"registry test payload");
        let file = File::open(&path).expect("file opened");
        let mmap = unsafe { Mmap::map(&file).expect("mmap succeeds") };

        let mut registry = MmapRegistry::default();
        registry.next_handle += 1;
        let handle = format!("mmap-{}", registry.next_handle);
        registry.open_maps.insert(handle.clone(), (mmap, path.clone()));

        assert!(registry.open_maps.contains_key(&handle));
        assert!(registry.open_maps.remove(&handle).is_some());
        assert!(!registry.open_maps.contains_key(&handle));

        let _ = std::fs::remove_file(path);
    }
}
