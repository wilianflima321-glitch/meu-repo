//! L.13 — UniversalLspFarm (Tauri sidecar first-light)
//!
//! Real language-server process spawn/manage for Studio Local desktop.
//! Binding: `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` L.13 + Progress ledger.
//!
//! Honesty (Zero-MVP):
//! - Spawns a real sidecar when `typescript-language-server` or `rust-analyzer`
//!   resolves on PATH / env override / local `node_modules/.bin`.
//! - Fail-closed (`LSP_BINARY_HELD`) when the binary is missing — never fabricates
//!   diagnostics, hover, or definition results.
//! - IPC probe speaks stdio JSON-RPC `initialize` and reports only real responses.
//! - Monaco desktop hover/definition acceptance remains **OPEN** (multi-week).

use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::Duration;

use serde::Serialize;
use tauri::State;

const IPC_PROBE_TIMEOUT: Duration = Duration::from_secs(8);

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LspLanguage {
    TypeScript,
    Rust,
}

impl LspLanguage {
    fn parse(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "typescript" | "typescriptreact" | "javascript" | "javascriptreact" | "ts" | "tsx"
            | "js" | "jsx" => Some(Self::TypeScript),
            "rust" | "rs" => Some(Self::Rust),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::TypeScript => "typescript",
            Self::Rust => "rust",
        }
    }

    fn binary_names(self) -> &'static [&'static str] {
        match self {
            Self::TypeScript => &["typescript-language-server"],
            Self::Rust => &["rust-analyzer"],
        }
    }

    fn env_override_keys(self) -> &'static [&'static str] {
        match self {
            Self::TypeScript => &["AETHEL_LSP_TYPESCRIPT", "AETHEL_LSP_TSSERVER"],
            Self::Rust => &["AETHEL_LSP_RUST_ANALYZER", "AETHEL_LSP_RUST"],
        }
    }

    fn spawn_args(self) -> &'static [&'static str] {
        match self {
            // typescript-language-server requires explicit --stdio.
            Self::TypeScript => &["--stdio"],
            // rust-analyzer defaults to stdio LSP when launched without a subcommand.
            Self::Rust => &[],
        }
    }
}

struct LspSession {
    id: String,
    language: LspLanguage,
    binary_path: PathBuf,
    child: Child,
    stdin: Option<ChildStdin>,
    stdout: Option<BufReader<ChildStdout>>,
}

impl Drop for LspSession {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

#[derive(Default)]
pub struct LspFarmRegistry {
    next_id: u64,
    sessions: HashMap<String, LspSession>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspFarmHonestyReport {
    pub cloud_relay_core: bool,
    /// `partial` = first-light spawn + IPC probe shipped; never `live` until Monaco acceptance.
    pub tauri_sidecar_spawn: &'static str,
    pub monaco_desktop_hover_definition: &'static str,
    pub marketing_allowed: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspBinaryProbe {
    pub language: String,
    pub command: String,
    pub resolved_path: Option<String>,
    pub available: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspSessionInfo {
    pub session_id: String,
    pub language: String,
    pub binary_path: String,
    pub alive: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspSpawnResult {
    pub session_id: String,
    pub language: String,
    pub binary_path: String,
    pub alive: bool,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspIpcProbeResult {
    pub session_id: String,
    pub ok: bool,
    pub process_alive: bool,
    pub initialize_response: Option<String>,
    pub message: String,
}

fn path_is_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    #[cfg(windows)]
    {
        // On Windows, PATH entries may be .cmd shims; accept any existing file path.
        true
    }
    #[cfg(not(windows))]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::metadata(path)
            .map(|m| m.permissions().mode() & 0o111 != 0)
            .unwrap_or(false)
    }
}

fn which_on_path(command: &str) -> Option<PathBuf> {
    #[cfg(windows)]
    let (finder, arg) = ("where.exe", command);
    #[cfg(not(windows))]
    let (finder, arg) = ("which", command);

    let output = Command::new(finder).arg(arg).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let candidate = PathBuf::from(line.trim());
        if path_is_executable(&candidate) {
            return Some(candidate);
        }
    }
    None
}

fn discover_typescript_node_modules() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;
    let mut dir = cwd.as_path();
    loop {
        let cli = dir
            .join("node_modules")
            .join("typescript-language-server")
            .join("lib")
            .join("cli.js");
        if cli.is_file() {
            return Some(cli);
        }
        let bin = dir
            .join("node_modules")
            .join(".bin")
            .join(if cfg!(windows) {
                "typescript-language-server.cmd"
            } else {
                "typescript-language-server"
            });
        if path_is_executable(&bin) {
            return Some(bin);
        }
        dir = dir.parent()?;
    }
}

fn resolve_binary(language: LspLanguage) -> Result<PathBuf, String> {
    for key in language.env_override_keys() {
        if let Ok(value) = std::env::var(key) {
            let trimmed = value.trim();
            if !trimmed.is_empty() {
                let path = PathBuf::from(trimmed);
                if path_is_executable(&path) {
                    return Ok(path);
                }
                return Err(format!(
                    "LSP_BINARY_HELD: env {key}={trimmed} is set but not an executable file"
                ));
            }
        }
    }

    for name in language.binary_names() {
        if let Some(path) = which_on_path(name) {
            return Ok(path);
        }
    }

    if language == LspLanguage::TypeScript {
        if let Some(path) = discover_typescript_node_modules() {
            return Ok(path);
        }
    }

    Err(format!(
        "LSP_BINARY_HELD: {} not found on PATH (install the language server or set {:?})",
        language.binary_names().first().copied().unwrap_or("language-server"),
        language.env_override_keys()
    ))
}

fn spawn_language_server(language: LspLanguage, binary: &Path) -> Result<LspSession, String> {
    let mut cmd = if binary
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("js"))
    {
        // node_modules/.../cli.js entry — run via node.
        let mut c = Command::new("node");
        c.arg(binary);
        c
    } else {
        Command::new(binary)
    };

    for arg in language.spawn_args() {
        cmd.arg(arg);
    }

    let mut child = cmd
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| {
            format!(
                "LSP_SPAWN_FAILED: could not start {} ({}): {e}",
                language.as_str(),
                binary.display()
            )
        })?;

    let stdin = child
        .stdin
        .take()
        .ok_or_else(|| "LSP_SPAWN_FAILED: stdin pipe unavailable".to_string())?;
    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "LSP_SPAWN_FAILED: stdout pipe unavailable".to_string())?;

    // Confirm the process did not exit immediately (missing runtime / bad args).
    std::thread::sleep(Duration::from_millis(80));
    if let Ok(Some(status)) = child.try_wait() {
        return Err(format!(
            "LSP_SPAWN_FAILED: {} exited immediately with {status}",
            language.as_str()
        ));
    }

    Ok(LspSession {
        id: String::new(), // filled by registry
        language,
        binary_path: binary.to_path_buf(),
        child,
        stdin: Some(stdin),
        stdout: Some(BufReader::new(stdout)),
    })
}

fn write_lsp_message(stdin: &mut ChildStdin, body: &str) -> Result<(), String> {
    let header = format!("Content-Length: {}\r\n\r\n", body.len());
    stdin
        .write_all(header.as_bytes())
        .and_then(|_| stdin.write_all(body.as_bytes()))
        .and_then(|_| stdin.flush())
        .map_err(|e| format!("LSP_IPC_WRITE_FAILED: {e}"))
}

fn read_one_lsp_message(reader: &mut BufReader<ChildStdout>) -> Result<String, String> {
    let mut content_length: Option<usize> = None;
    loop {
        let mut line = String::new();
        let n = reader
            .read_line(&mut line)
            .map_err(|e| format!("LSP_IPC_READ_FAILED: {e}"))?;
        if n == 0 {
            return Err("LSP_IPC_READ_FAILED: language server closed stdout".to_string());
        }
        let trimmed = line.trim_end_matches(['\r', '\n']);
        if trimmed.is_empty() {
            break;
        }
        let lower = trimmed.to_ascii_lowercase();
        if let Some(rest) = lower.strip_prefix("content-length:") {
            content_length = rest.trim().parse::<usize>().ok();
        }
    }

    let len = content_length
        .ok_or_else(|| "LSP_IPC_READ_FAILED: missing Content-Length header".to_string())?;
    if len == 0 || len > 4 * 1024 * 1024 {
        return Err(format!("LSP_IPC_READ_FAILED: unreasonable Content-Length {len}"));
    }

    let mut buf = vec![0u8; len];
    reader
        .read_exact(&mut buf)
        .map_err(|e| format!("LSP_IPC_READ_FAILED: body read: {e}"))?;
    String::from_utf8(buf).map_err(|e| format!("LSP_IPC_READ_FAILED: utf8: {e}"))
}

fn session_alive(session: &mut LspSession) -> bool {
    match session.child.try_wait() {
        Ok(None) => true,
        Ok(Some(_)) | Err(_) => false,
    }
}

/// Honesty surface for desktop L.13 first-light (never claims Monaco acceptance).
#[tauri::command]
pub fn lsp_farm_honesty() -> LspFarmHonestyReport {
    LspFarmHonestyReport {
        cloud_relay_core: true,
        tauri_sidecar_spawn: "partial",
        monaco_desktop_hover_definition: "open",
        marketing_allowed: false,
        message: "L.13 Tauri lsp_farm first-light: real binary discovery + sidecar spawn + stdio initialize IPC probe. Monaco desktop hover/definition acceptance still OPEN. Marketing blocked.".to_string(),
    }
}

/// Probe PATH/env for supported language servers without spawning.
#[tauri::command]
pub fn lsp_farm_probe() -> Vec<LspBinaryProbe> {
    [LspLanguage::TypeScript, LspLanguage::Rust]
        .into_iter()
        .map(|language| {
            let command = language
                .binary_names()
                .first()
                .copied()
                .unwrap_or("language-server")
                .to_string();
            match resolve_binary(language) {
                Ok(path) => LspBinaryProbe {
                    language: language.as_str().to_string(),
                    command,
                    resolved_path: Some(path.display().to_string()),
                    available: true,
                    message: format!("{} resolvable — spawn allowed", language.as_str()),
                },
                Err(message) => LspBinaryProbe {
                    language: language.as_str().to_string(),
                    command,
                    resolved_path: None,
                    available: false,
                    message,
                },
            }
        })
        .collect()
}

/// Spawn a language server sidecar when the binary is available (fail-closed otherwise).
#[tauri::command]
pub fn lsp_farm_spawn(
    language: String,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspSpawnResult, String> {
    let lang = LspLanguage::parse(&language).ok_or_else(|| {
        format!(
            "UNSUPPORTED_LANGUAGE: {language} (first-light supports typescript/javascript and rust)"
        )
    })?;
    let binary = resolve_binary(lang)?;
    let mut session = spawn_language_server(lang, &binary)?;

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    guard.next_id += 1;
    let session_id = format!("lsp-{}-{}", lang.as_str(), guard.next_id);
    session.id = session_id.clone();
    let alive = session_alive(&mut session);
    let binary_path = session.binary_path.display().to_string();
    guard.sessions.insert(session_id.clone(), session);

    Ok(LspSpawnResult {
        session_id,
        language: lang.as_str().to_string(),
        binary_path,
        alive,
        message: if alive {
            "Language server sidecar running (stdio). Use lsp_farm_ipc_probe for initialize handshake. Monaco hover acceptance still OPEN.".to_string()
        } else {
            "Language server exited before registration — fail-closed.".to_string()
        },
    })
}

/// List live farm sessions (alive flag from try_wait — no fabricated diagnostics).
#[tauri::command]
pub fn lsp_farm_list(registry: State<'_, Mutex<LspFarmRegistry>>) -> Result<Vec<LspSessionInfo>, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    let mut out = Vec::with_capacity(guard.sessions.len());
    for session in guard.sessions.values_mut() {
        out.push(LspSessionInfo {
            session_id: session.id.clone(),
            language: session.language.as_str().to_string(),
            binary_path: session.binary_path.display().to_string(),
            alive: session_alive(session),
        });
    }
    Ok(out)
}

/// Stop and remove a farm session (best-effort kill).
#[tauri::command]
pub fn lsp_farm_stop(
    session_id: String,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspSessionInfo, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    let mut session = guard
        .sessions
        .remove(&session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {session_id}"))?;
    let alive_before = session_alive(&mut session);
    let info = LspSessionInfo {
        session_id: session.id.clone(),
        language: session.language.as_str().to_string(),
        binary_path: session.binary_path.display().to_string(),
        alive: alive_before,
    };
    drop(session); // Drop kills the child
    Ok(info)
}

/// Stdio JSON-RPC initialize probe — returns only a real server response (or fail-closed).
#[tauri::command]
pub fn lsp_farm_ipc_probe(
    session_id: String,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspIpcProbeResult, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    let session = guard
        .sessions
        .get_mut(&session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {session_id}"))?;

    if !session_alive(session) {
        return Ok(LspIpcProbeResult {
            session_id,
            ok: false,
            process_alive: false,
            initialize_response: None,
            message: "Language server process is not alive — fail-closed (no mock hover)."
                .to_string(),
        });
    }

    let stdin = session
        .stdin
        .as_mut()
        .ok_or_else(|| "LSP_IPC_UNAVAILABLE: stdin missing".to_string())?;
    let initialize_body = r#"{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"processId":null,"clientInfo":{"name":"aethel-lsp-farm","version":"0.1.0"},"rootUri":null,"capabilities":{},"trace":"off"}}"#;
    write_lsp_message(stdin, initialize_body)?;

    let mut reader = session
        .stdout
        .take()
        .ok_or_else(|| "LSP_IPC_UNAVAILABLE: stdout missing".to_string())?;

    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        let result = read_one_lsp_message(&mut reader);
        let _ = tx.send((result, reader));
    });

    match rx.recv_timeout(IPC_PROBE_TIMEOUT) {
        Ok((Ok(body), reader)) => {
            session.stdout = Some(reader);
            let looks_like_response = body.contains("\"id\":1") || body.contains("\"result\"");
            Ok(LspIpcProbeResult {
                session_id,
                ok: looks_like_response,
                process_alive: session_alive(session),
                initialize_response: Some(body),
                message: if looks_like_response {
                    "Stdio initialize handshake succeeded. Monaco desktop hover/definition still OPEN."
                        .to_string()
                } else {
                    "Received stdout payload but it did not look like an initialize result — fail-closed."
                        .to_string()
                },
            })
        }
        Ok((Err(err), reader)) => {
            session.stdout = Some(reader);
            Ok(LspIpcProbeResult {
                session_id,
                ok: false,
                process_alive: session_alive(session),
                initialize_response: None,
                message: err,
            })
        }
        Err(_) => {
            // Timeout: kill the stuck session so the blocked reader thread can exit.
            let _ = session.child.kill();
            let _ = session.child.wait();
            Ok(LspIpcProbeResult {
                session_id,
                ok: false,
                process_alive: false,
                initialize_response: None,
                message: "LSP_IPC_TIMEOUT: no initialize response within deadline — fail-closed (no mock hover)."
                    .to_string(),
            })
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_language_aliases() {
        assert_eq!(LspLanguage::parse("typescriptreact"), Some(LspLanguage::TypeScript));
        assert_eq!(LspLanguage::parse("rs"), Some(LspLanguage::Rust));
        assert_eq!(LspLanguage::parse("cobol"), None);
    }

    #[test]
    fn missing_binary_is_held_not_fabricated() {
        // Force a language that won't resolve via a nonsense env override path.
        std::env::set_var(
            "AETHEL_LSP_RUST_ANALYZER",
            "E:\\definitely-missing-rust-analyzer-binary.exe",
        );
        let err = resolve_binary(LspLanguage::Rust).expect_err("must fail-closed");
        assert!(err.contains("LSP_BINARY_HELD"), "{err}");
        std::env::remove_var("AETHEL_LSP_RUST_ANALYZER");
    }

    #[test]
    fn honesty_never_allows_marketing_or_claims_monaco() {
        let report = lsp_farm_honesty();
        assert_eq!(report.tauri_sidecar_spawn, "partial");
        assert_eq!(report.monaco_desktop_hover_definition, "open");
        assert!(!report.marketing_allowed);
    }
}
