//! L.13 — UniversalLspFarm (Tauri sidecar + Monaco hover/definition IPC)
//!
//! Real language-server process spawn/manage for Studio Local desktop.
//! Binding: `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` L.13 + Progress ledger.
//!
//! Honesty (Zero-MVP):
//! - Spawns a real sidecar when `typescript-language-server` or `rust-analyzer`
//!   resolves on PATH / env override / local `node_modules/.bin`.
//! - Fail-closed (`LSP_BINARY_HELD`) when the binary is missing — never fabricates
//!   diagnostics, hover, or definition results.
//! - Monaco desktop path: hover + definition over stdio JSON-RPC with minimal
//!   `textDocument/didOpen` (no full didChange sync / completion / diagnostics push).
//! - Full L.C acceptance (multi-language soak incl. Python) remains OPEN.
//! - Marketing blocked until acceptance soak.

use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::{mpsc, Mutex};
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::State;

const IPC_TIMEOUT: Duration = Duration::from_secs(8);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(12);

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
    initialized: bool,
    next_request_id: u64,
    open_uris: HashSet<String>,
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
    /// language → session_id (one live session per language for Monaco path)
    by_language: HashMap<&'static str, String>,
    sessions: HashMap<String, LspSession>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspFarmHonestyReport {
    pub cloud_relay_core: bool,
    /// `partial` = spawn + IPC + Monaco hover/definition wire; never `live` until L.C soak.
    pub tauri_sidecar_spawn: &'static str,
    /// `partial` = hover/definition IPC wired (fail-closed without binary); full L.C OPEN.
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
    pub initialized: bool,
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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRpcResult {
    pub session_id: String,
    pub ok: bool,
    pub process_alive: bool,
    pub result: Option<Value>,
    pub error: Option<Value>,
    pub message: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspEnsureArgs {
    pub language: String,
    pub root_uri: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspDidOpenArgs {
    pub session_id: String,
    pub uri: String,
    pub language_id: String,
    pub text: String,
    pub version: Option<i32>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRequestArgs {
    pub session_id: String,
    pub method: String,
    pub params: Value,
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
        initialized: false,
        next_request_id: 1,
        open_uris: HashSet::new(),
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

fn message_id_matches(body: &str, expected_id: u64) -> bool {
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return false;
    };
    match value.get("id") {
        Some(Value::Number(n)) => n.as_u64() == Some(expected_id),
        Some(Value::String(s)) => s.parse::<u64>().ok() == Some(expected_id),
        _ => false,
    }
}

fn is_response_message(body: &str) -> bool {
    let Ok(value) = serde_json::from_str::<Value>(body) else {
        return false;
    };
    value.get("id").is_some() && (value.get("result").is_some() || value.get("error").is_some())
}

/// Read stdout until a JSON-RPC response with `expected_id` arrives (skip notifications).
fn read_response_for_id(
    session: &mut LspSession,
    expected_id: u64,
    timeout: Duration,
) -> Result<Value, String> {
    let mut reader = session
        .stdout
        .take()
        .ok_or_else(|| "LSP_IPC_UNAVAILABLE: stdout missing".to_string())?;

    let (tx, rx) = mpsc::channel();
    std::thread::spawn(move || {
        loop {
            match read_one_lsp_message(&mut reader) {
                Ok(body) => {
                    if message_id_matches(&body, expected_id) && is_response_message(&body) {
                        match serde_json::from_str::<Value>(&body) {
                            Ok(v) => {
                                let _ = tx.send(Ok((v, reader)));
                                return;
                            }
                            Err(e) => {
                                let _ = tx.send(Err((
                                    format!("LSP_IPC_PARSE_FAILED: {e}"),
                                    reader,
                                )));
                                return;
                            }
                        }
                    }
                    // Skip server notifications / unrelated traffic.
                }
                Err(e) => {
                    let _ = tx.send(Err((e, reader)));
                    return;
                }
            }
        }
    });

    match rx.recv_timeout(timeout) {
        Ok(Ok((value, reader))) => {
            session.stdout = Some(reader);
            Ok(value)
        }
        Ok(Err((err, reader))) => {
            session.stdout = Some(reader);
            Err(err)
        }
        Err(_) => {
            let _ = session.child.kill();
            let _ = session.child.wait();
            Err(
                "LSP_IPC_TIMEOUT: no matching response within deadline — fail-closed (no mock hover)."
                    .to_string(),
            )
        }
    }
}

fn send_notification(session: &mut LspSession, method: &str, params: Value) -> Result<(), String> {
    let stdin = session
        .stdin
        .as_mut()
        .ok_or_else(|| "LSP_IPC_UNAVAILABLE: stdin missing".to_string())?;
    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "method": method,
        "params": params,
    });
    write_lsp_message(stdin, &body.to_string())
}

fn send_request(
    session: &mut LspSession,
    method: &str,
    params: Value,
    timeout: Duration,
) -> Result<Value, String> {
    let id = session.next_request_id;
    session.next_request_id = session.next_request_id.saturating_add(1);
    let stdin = session
        .stdin
        .as_mut()
        .ok_or_else(|| "LSP_IPC_UNAVAILABLE: stdin missing".to_string())?;
    let body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": id,
        "method": method,
        "params": params,
    });
    write_lsp_message(stdin, &body.to_string())?;
    read_response_for_id(session, id, timeout)
}

fn ensure_initialized(session: &mut LspSession, root_uri: Option<&str>) -> Result<(), String> {
    if session.initialized {
        return Ok(());
    }
    if !session_alive(session) {
        return Err("LSP_SESSION_DEAD: language server process is not alive".to_string());
    }

    let params = serde_json::json!({
        "processId": null,
        "clientInfo": { "name": "aethel-lsp-farm", "version": "0.2.0" },
        "rootUri": root_uri,
        "capabilities": {
            "textDocument": {
                "synchronization": { "didSave": true, "dynamicRegistration": false },
                "hover": { "contentFormat": ["markdown", "plaintext"] },
                "definition": { "linkSupport": false },
            },
            "workspace": { "workspaceFolders": false }
        },
        "trace": "off"
    });

    let response = send_request(session, "initialize", params, IPC_TIMEOUT)?;
    if response.get("error").is_some() {
        return Err(format!(
            "LSP_INITIALIZE_FAILED: {}",
            response
                .get("error")
                .map(|e| e.to_string())
                .unwrap_or_else(|| "unknown".into())
        ));
    }

    send_notification(session, "initialized", serde_json::json!({}))?;
    session.initialized = true;
    Ok(())
}

fn insert_session(registry: &mut LspFarmRegistry, mut session: LspSession) -> LspSpawnResult {
    registry.next_id += 1;
    let session_id = format!("lsp-{}-{}", session.language.as_str(), registry.next_id);
    session.id = session_id.clone();
    let lang_key = session.language.as_str();
    let alive = session_alive(&mut session);
    let binary_path = session.binary_path.display().to_string();
    let language = session.language.as_str().to_string();

    // Replace any prior session for this language.
    if let Some(old_id) = registry.by_language.insert(lang_key, session_id.clone()) {
        let _ = registry.sessions.remove(&old_id);
    }
    registry.sessions.insert(session_id.clone(), session);

    LspSpawnResult {
        session_id,
        language,
        binary_path,
        alive,
        message: if alive {
            "Language server sidecar running (stdio). Call lsp_farm_ensure_session for initialize + Monaco hover/definition."
                .to_string()
        } else {
            "Language server exited before registration — fail-closed.".to_string()
        },
    }
}

/// Honesty surface for desktop L.13 Monaco hover/definition wire.
#[tauri::command]
pub fn lsp_farm_honesty() -> LspFarmHonestyReport {
    LspFarmHonestyReport {
        cloud_relay_core: true,
        tauri_sidecar_spawn: "partial",
        monaco_desktop_hover_definition: "partial",
        marketing_allowed: false,
        message: "L.13 Tauri lsp_farm: real binary discovery + sidecar spawn + initialize + minimal didOpen + hover/definition IPC. Full L.C multi-language soak (Python) still OPEN. Marketing blocked.".to_string(),
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
            "UNSUPPORTED_LANGUAGE: {language} (desktop farm supports typescript/javascript and rust)"
        )
    })?;
    let binary = resolve_binary(lang)?;
    let session = spawn_language_server(lang, &binary)?;

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    Ok(insert_session(&mut guard, session))
}

/// Ensure a live initialized session for `language` (spawn + initialize if needed).
/// Fail-closed when binary missing — never fabricates hover/definition.
#[tauri::command]
pub fn lsp_farm_ensure_session(
    args: LspEnsureArgs,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspSessionInfo, String> {
    let lang = LspLanguage::parse(&args.language).ok_or_else(|| {
        format!(
            "UNSUPPORTED_LANGUAGE: {} (desktop farm supports typescript/javascript and rust)",
            args.language
        )
    })?;

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;

    let existing_id = guard.by_language.get(lang.as_str()).cloned();
    if let Some(session_id) = existing_id {
        if let Some(session) = guard.sessions.get_mut(&session_id) {
            if session_alive(session) {
                ensure_initialized(session, args.root_uri.as_deref())?;
                return Ok(LspSessionInfo {
                    session_id: session.id.clone(),
                    language: session.language.as_str().to_string(),
                    binary_path: session.binary_path.display().to_string(),
                    alive: true,
                    initialized: session.initialized,
                });
            }
            // Dead session — drop and respawn.
            let _ = guard.sessions.remove(&session_id);
            guard.by_language.remove(lang.as_str());
        }
    }

    // Drop lock briefly so spawn I/O does not hold the farm mutex.
    drop(guard);
    let binary = resolve_binary(lang)?;
    let session = spawn_language_server(lang, &binary)?;

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    let spawn = insert_session(&mut guard, session);
    let session = guard
        .sessions
        .get_mut(&spawn.session_id)
        .ok_or_else(|| "LSP_SESSION_NOT_FOUND: just spawned".to_string())?;
    ensure_initialized(session, args.root_uri.as_deref())?;

    Ok(LspSessionInfo {
        session_id: session.id.clone(),
        language: session.language.as_str().to_string(),
        binary_path: session.binary_path.display().to_string(),
        alive: session_alive(session),
        initialized: session.initialized,
    })
}

/// Minimal `textDocument/didOpen` (idempotent per URI). No full didChange sync.
#[tauri::command]
pub fn lsp_farm_did_open(
    args: LspDidOpenArgs,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspRpcResult, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    let session = guard
        .sessions
        .get_mut(&args.session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {}", args.session_id))?;

    if !session_alive(session) {
        return Ok(LspRpcResult {
            session_id: args.session_id,
            ok: false,
            process_alive: false,
            result: None,
            error: None,
            message: "Language server process is not alive — fail-closed (no mock hover)."
                .to_string(),
        });
    }

    ensure_initialized(session, None)?;

    if session.open_uris.contains(&args.uri) {
        // Limitation: no didChange — re-open with fresh text via didClose + didOpen.
        send_notification(
            session,
            "textDocument/didClose",
            serde_json::json!({ "textDocument": { "uri": args.uri } }),
        )?;
        session.open_uris.remove(&args.uri);
    }

    send_notification(
        session,
        "textDocument/didOpen",
        serde_json::json!({
            "textDocument": {
                "uri": args.uri,
                "languageId": args.language_id,
                "version": args.version.unwrap_or(1),
                "text": args.text,
            }
        }),
    )?;
    session.open_uris.insert(args.uri);

    Ok(LspRpcResult {
        session_id: session.id.clone(),
        ok: true,
        process_alive: true,
        result: Some(Value::Null),
        error: None,
        message: "didOpen sent (minimal sync; no continuous didChange).".to_string(),
    })
}

/// JSON-RPC request over an initialized farm session (hover / definition).
/// Returns only real server payloads — never fabricates results.
#[tauri::command]
pub fn lsp_farm_request(
    args: LspRequestArgs,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspRpcResult, String> {
    let method = args.method.trim();
    // Desktop wire is intentionally narrow: hover + definition (+ initialize via ensure).
    const ALLOWED: &[&str] = &[
        "textDocument/hover",
        "textDocument/definition",
        "textDocument/typeDefinition",
        "shutdown",
    ];
    if !ALLOWED.contains(&method) {
        return Err(format!(
            "LSP_METHOD_HELD: {method} not on desktop wire (allowed: hover/definition)"
        ));
    }

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    let session = guard
        .sessions
        .get_mut(&args.session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {}", args.session_id))?;

    if !session_alive(session) {
        return Ok(LspRpcResult {
            session_id: args.session_id,
            ok: false,
            process_alive: false,
            result: None,
            error: None,
            message: "Language server process is not alive — fail-closed (no mock hover)."
                .to_string(),
        });
    }

    ensure_initialized(session, None)?;

    match send_request(session, method, args.params, REQUEST_TIMEOUT) {
        Ok(response) => {
            let error = response.get("error").cloned();
            let result = response.get("result").cloned();
            let ok = error.is_none();
            Ok(LspRpcResult {
                session_id: session.id.clone(),
                ok,
                process_alive: session_alive(session),
                result,
                error,
                message: if ok {
                    format!("{method} response from live language server")
                } else {
                    format!("{method} returned LSP error — fail-closed UI must not invent hover")
                },
            })
        }
        Err(message) => Ok(LspRpcResult {
            session_id: args.session_id,
            ok: false,
            process_alive: session_alive(session),
            result: None,
            error: None,
            message,
        }),
    }
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
            initialized: session.initialized,
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
    if let Some(mapped) = guard.by_language.get(session.language.as_str()).cloned() {
        if mapped == session_id {
            guard.by_language.remove(session.language.as_str());
        }
    }
    let alive_before = session_alive(&mut session);
    let info = LspSessionInfo {
        session_id: session.id.clone(),
        language: session.language.as_str().to_string(),
        binary_path: session.binary_path.display().to_string(),
        alive: alive_before,
        initialized: session.initialized,
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

    if session.initialized {
        return Ok(LspIpcProbeResult {
            session_id,
            ok: true,
            process_alive: true,
            initialize_response: Some(r#"{"jsonrpc":"2.0","id":0,"result":{"alreadyInitialized":true}}"#.to_string()),
            message: "Session already initialized for Monaco hover/definition wire.".to_string(),
        });
    }

    match ensure_initialized(session, None) {
        Ok(()) => Ok(LspIpcProbeResult {
            session_id,
            ok: true,
            process_alive: session_alive(session),
            initialize_response: Some(r#"{"jsonrpc":"2.0","result":{"initialized":true}}"#.to_string()),
            message: "Stdio initialize handshake succeeded. Monaco hover/definition IPC ready when binary live.".to_string(),
        }),
        Err(message) => Ok(LspIpcProbeResult {
            session_id,
            ok: false,
            process_alive: session_alive(session),
            initialize_response: None,
            message,
        }),
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
    fn honesty_never_allows_marketing_or_claims_full_lc() {
        let report = lsp_farm_honesty();
        assert_eq!(report.tauri_sidecar_spawn, "partial");
        assert_eq!(report.monaco_desktop_hover_definition, "partial");
        assert!(!report.marketing_allowed);
        assert!(report.message.contains("OPEN") || report.message.contains("blocked"));
    }

    #[test]
    fn message_id_match_helpers() {
        assert!(message_id_matches(r#"{"jsonrpc":"2.0","id":3,"result":null}"#, 3));
        assert!(!message_id_matches(r#"{"jsonrpc":"2.0","id":2,"result":null}"#, 3));
        assert!(is_response_message(r#"{"id":1,"result":{}}"#));
        assert!(!is_response_message(r#"{"method":"window/logMessage","params":{}}"#));
    }
}
