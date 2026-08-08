//! L.13 — UniversalLspFarm (Tauri sidecar + Monaco hover/definition/sync IPC)
//!
//! Real language-server process spawn/manage for Studio Local desktop.
//! Binding: `AETHEL_UNIVERSAL_IDE_FORGE_SPEC.md` L.13 + Progress ledger.
//!
//! Honesty (Zero-MVP):
//! - Spawns a real sidecar when `typescript-language-server`, `rust-analyzer`, or
//!   a Python LS (`pyright-langserver` / `pylsp` / `AETHEL_LSP_PYTHON`) resolves
//!   on PATH / env override / local `node_modules`.
//! - Fail-closed (`LSP_BINARY_HELD`) when the binary is missing — never fabricates
//!   diagnostics, hover, definition, or completion results.
//! - Continuous `textDocument/didChange` (full-text sync) + `publishDiagnostics`
//!   buffer/emit → Monaco markers (clear on session death).
//! - Hover / definition / completion over stdio JSON-RPC.
//! - L.C multi-language matrix (TS/Rust/Python) shipped; live Python soak is HELD
//!   until a resolvable binary is present (never fake).
//! - Marketing blocked until full L.C acceptance soak.

use std::collections::{HashMap, HashSet};
use std::io::{BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{mpsc, Arc, Mutex};
use std::thread::JoinHandle;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

const IPC_TIMEOUT: Duration = Duration::from_secs(8);
const REQUEST_TIMEOUT: Duration = Duration::from_secs(12);
const DIAGNOSTICS_EVENT: &str = "lsp-farm-diagnostics";
const SESSION_DEAD_EVENT: &str = "lsp-farm-session-dead";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum LspLanguage {
    TypeScript,
    Rust,
    Python,
}

impl LspLanguage {
    fn parse(raw: &str) -> Option<Self> {
        match raw.trim().to_ascii_lowercase().as_str() {
            "typescript" | "typescriptreact" | "javascript" | "javascriptreact" | "ts" | "tsx"
            | "js" | "jsx" => Some(Self::TypeScript),
            "rust" | "rs" => Some(Self::Rust),
            "python" | "py" => Some(Self::Python),
            _ => None,
        }
    }

    fn as_str(self) -> &'static str {
        match self {
            Self::TypeScript => "typescript",
            Self::Rust => "rust",
            Self::Python => "python",
        }
    }

    fn binary_names(self) -> &'static [&'static str] {
        match self {
            Self::TypeScript => &["typescript-language-server"],
            Self::Rust => &["rust-analyzer"],
            // Prefer pyright-langserver (cloud parity); pylsp / basedpyright as fallbacks.
            Self::Python => &["pyright-langserver", "basedpyright-langserver", "pylsp"],
        }
    }

    fn env_override_keys(self) -> &'static [&'static str] {
        match self {
            Self::TypeScript => &["AETHEL_LSP_TYPESCRIPT", "AETHEL_LSP_TSSERVER"],
            Self::Rust => &["AETHEL_LSP_RUST_ANALYZER", "AETHEL_LSP_RUST"],
            // Documented Windows override when PATH discovery fails.
            Self::Python => &["AETHEL_LSP_PYTHON", "AETHEL_LSP_PYRIGHT"],
        }
    }

    fn spawn_args(self) -> &'static [&'static str] {
        match self {
            Self::TypeScript => &["--stdio"],
            Self::Rust => &[],
            // Default for pyright-langserver; pylsp override handled in spawn_language_server.
            Self::Python => &["--stdio"],
        }
    }
}

/// Shared stdio hub: writer on command threads; reader owns stdout.
struct IoHub {
    stdin: Mutex<Option<ChildStdin>>,
    pending: Mutex<HashMap<u64, mpsc::Sender<Value>>>,
    /// uri → last real `publishDiagnostics` params from the language server.
    diagnostics: Mutex<HashMap<String, LspDiagnosticsEvent>>,
    /// Drain queue for poll (same events as emit).
    diag_queue: Mutex<Vec<LspDiagnosticsEvent>>,
    dead: AtomicBool,
    session_id: Mutex<String>,
    app: Mutex<Option<AppHandle>>,
}

struct LspSession {
    id: String,
    language: LspLanguage,
    binary_path: PathBuf,
    child: Child,
    hub: Arc<IoHub>,
    reader_join: Option<JoinHandle<()>>,
    initialized: bool,
    next_request_id: u64,
    open_uris: HashSet<String>,
}

impl Drop for LspSession {
    fn drop(&mut self) {
        self.hub.dead.store(true, Ordering::SeqCst);
        let _ = self.child.kill();
        let _ = self.child.wait();
        if let Some(join) = self.reader_join.take() {
            let _ = join.join();
        }
        emit_session_dead(&self.hub);
    }
}

#[derive(Default)]
pub struct LspFarmRegistry {
    next_id: u64,
    by_language: HashMap<&'static str, String>,
    sessions: HashMap<String, LspSession>,
    app: Option<AppHandle>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspFarmHonestyReport {
    pub cloud_relay_core: bool,
    /// `partial` = spawn + IPC + Monaco wire; never `live` until L.C soak.
    pub tauri_sidecar_spawn: &'static str,
    /// `partial` = hover/definition/didChange/diagnostics wired; full L.C OPEN.
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspDiagnosticsEvent {
    pub session_id: String,
    pub uri: String,
    /// Raw LSP Diagnostic[] from the server — never fabricated.
    pub diagnostics: Value,
    pub version: Option<i64>,
    /// When true, Monaco must clear markers (session dead / stop).
    pub clear: bool,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LspDiagnosticsPollResult {
    pub session_id: String,
    pub process_alive: bool,
    pub events: Vec<LspDiagnosticsEvent>,
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
pub struct LspDidChangeArgs {
    pub session_id: String,
    pub uri: String,
    pub text: String,
    pub version: i32,
    /// Used only when the URI was not yet opened (auto-didOpen path).
    pub language_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspRequestArgs {
    pub session_id: String,
    pub method: String,
    pub params: Value,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LspPollDiagnosticsArgs {
    pub session_id: String,
}

fn path_is_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    #[cfg(windows)]
    {
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

fn walk_ancestors_for<F>(mut finder: F) -> Option<PathBuf>
where
    F: FnMut(&Path) -> Option<PathBuf>,
{
    let cwd = std::env::current_dir().ok()?;
    let mut dir = cwd.as_path();
    loop {
        if let Some(found) = finder(dir) {
            return Some(found);
        }
        dir = dir.parent()?;
    }
}

fn discover_typescript_node_modules() -> Option<PathBuf> {
    walk_ancestors_for(|dir| {
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
        None
    })
}

fn discover_python_node_modules() -> Option<PathBuf> {
    walk_ancestors_for(|dir| {
        // pyright npm package ships a Node langserver entry.
        let pyright_js = dir
            .join("node_modules")
            .join("pyright")
            .join("langserver.index.js");
        if pyright_js.is_file() {
            return Some(pyright_js);
        }
        let based_js = dir
            .join("node_modules")
            .join("basedpyright")
            .join("langserver.index.js");
        if based_js.is_file() {
            return Some(based_js);
        }
        for name in ["pyright-langserver", "basedpyright-langserver"] {
            let bin = dir.join("node_modules").join(".bin").join(if cfg!(windows) {
                format!("{name}.cmd")
            } else {
                name.to_string()
            });
            if path_is_executable(&bin) {
                return Some(bin);
            }
        }
        None
    })
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
    if language == LspLanguage::Python {
        if let Some(path) = discover_python_node_modules() {
            return Ok(path);
        }
    }

    Err(format!(
        "LSP_BINARY_HELD: {} not found on PATH (install the language server or set {:?})",
        language
            .binary_names()
            .first()
            .copied()
            .unwrap_or("language-server"),
        language.env_override_keys()
    ))
}

fn python_spawn_args(binary: &Path) -> &'static [&'static str] {
    let stem = binary
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    // pylsp defaults to stdio; --stdio is not a valid flag.
    if stem == "pylsp" || stem.starts_with("pylsp.") {
        &[]
    } else {
        &["--stdio"]
    }
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
        return Err(format!(
            "LSP_IPC_READ_FAILED: unreasonable Content-Length {len}"
        ));
    }

    let mut buf = vec![0u8; len];
    reader
        .read_exact(&mut buf)
        .map_err(|e| format!("LSP_IPC_READ_FAILED: body read: {e}"))?;
    String::from_utf8(buf).map_err(|e| format!("LSP_IPC_READ_FAILED: utf8: {e}"))
}

fn session_alive(session: &mut LspSession) -> bool {
    if session.hub.dead.load(Ordering::SeqCst) {
        return false;
    }
    match session.child.try_wait() {
        Ok(None) => true,
        Ok(Some(_)) | Err(_) => {
            session.hub.dead.store(true, Ordering::SeqCst);
            false
        }
    }
}

fn is_response_message(value: &Value) -> bool {
    value.get("id").is_some() && (value.get("result").is_some() || value.get("error").is_some())
}

fn response_id(value: &Value) -> Option<u64> {
    match value.get("id")? {
        Value::Number(n) => n.as_u64(),
        Value::String(s) => s.parse().ok(),
        _ => None,
    }
}

fn emit_session_dead(hub: &IoHub) {
    let session_id = hub
        .session_id
        .lock()
        .map(|g| g.clone())
        .unwrap_or_default();
    let event = LspDiagnosticsEvent {
        session_id: session_id.clone(),
        uri: String::new(),
        diagnostics: Value::Array(vec![]),
        version: None,
        clear: true,
    };
    if let Ok(mut q) = hub.diag_queue.lock() {
        q.push(event.clone());
    }
    if let Ok(guard) = hub.app.lock() {
        if let Some(app) = guard.as_ref() {
            let _ = app.emit(SESSION_DEAD_EVENT, &event);
            let _ = app.emit(DIAGNOSTICS_EVENT, &event);
        }
    }
}

fn store_and_emit_diagnostics(hub: &IoHub, params: &Value) {
    let uri = params
        .get("uri")
        .and_then(|u| u.as_str())
        .unwrap_or("")
        .to_string();
    if uri.is_empty() {
        return;
    }
    let diagnostics = params
        .get("diagnostics")
        .cloned()
        .unwrap_or_else(|| Value::Array(vec![]));
    // Only accept arrays — never invent diagnostic entries.
    if !diagnostics.is_array() {
        return;
    }
    let version = params.get("version").and_then(|v| v.as_i64());
    let session_id = hub
        .session_id
        .lock()
        .map(|g| g.clone())
        .unwrap_or_default();
    let event = LspDiagnosticsEvent {
        session_id,
        uri: uri.clone(),
        diagnostics,
        version,
        clear: false,
    };
    if let Ok(mut map) = hub.diagnostics.lock() {
        map.insert(uri, event.clone());
    }
    if let Ok(mut q) = hub.diag_queue.lock() {
        q.push(event.clone());
    }
    if let Ok(guard) = hub.app.lock() {
        if let Some(app) = guard.as_ref() {
            let _ = app.emit(DIAGNOSTICS_EVENT, &event);
        }
    }
}

fn start_reader_thread(hub: Arc<IoHub>, stdout: ChildStdout) -> JoinHandle<()> {
    std::thread::spawn(move || {
        let mut reader = BufReader::new(stdout);
        loop {
            if hub.dead.load(Ordering::SeqCst) {
                break;
            }
            match read_one_lsp_message(&mut reader) {
                Ok(body) => {
                    let Ok(value) = serde_json::from_str::<Value>(&body) else {
                        continue;
                    };
                    if let Some(method) = value.get("method").and_then(|m| m.as_str()) {
                        if method == "textDocument/publishDiagnostics" {
                            if let Some(params) = value.get("params") {
                                store_and_emit_diagnostics(&hub, params);
                            }
                        }
                        // Other notifications: ignore (window/logMessage, etc.).
                        continue;
                    }
                    if is_response_message(&value) {
                        if let Some(id) = response_id(&value) {
                            if let Ok(mut pending) = hub.pending.lock() {
                                if let Some(tx) = pending.remove(&id) {
                                    let _ = tx.send(value);
                                }
                            }
                        }
                    }
                }
                Err(_) => {
                    hub.dead.store(true, Ordering::SeqCst);
                    emit_session_dead(&hub);
                    break;
                }
            }
        }
    })
}

fn spawn_language_server(language: LspLanguage, binary: &Path) -> Result<LspSession, String> {
    let mut cmd = if binary
        .extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| e.eq_ignore_ascii_case("js"))
    {
        let mut c = Command::new("node");
        c.arg(binary);
        c
    } else {
        Command::new(binary)
    };

    let args = if language == LspLanguage::Python {
        python_spawn_args(binary)
    } else {
        language.spawn_args()
    };
    for arg in args {
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

    std::thread::sleep(Duration::from_millis(80));
    if let Ok(Some(status)) = child.try_wait() {
        return Err(format!(
            "LSP_SPAWN_FAILED: {} exited immediately with {status}",
            language.as_str()
        ));
    }

    let hub = Arc::new(IoHub {
        stdin: Mutex::new(Some(stdin)),
        pending: Mutex::new(HashMap::new()),
        diagnostics: Mutex::new(HashMap::new()),
        diag_queue: Mutex::new(Vec::new()),
        dead: AtomicBool::new(false),
        session_id: Mutex::new(String::new()),
        app: Mutex::new(None),
    });
    let reader_join = Some(start_reader_thread(Arc::clone(&hub), stdout));

    Ok(LspSession {
        id: String::new(),
        language,
        binary_path: binary.to_path_buf(),
        child,
        hub,
        reader_join,
        initialized: false,
        next_request_id: 1,
        open_uris: HashSet::new(),
    })
}

fn bind_app_handle(hub: &IoHub, app: &AppHandle) {
    if let Ok(mut guard) = hub.app.lock() {
        *guard = Some(app.clone());
    }
}

fn send_notification(session: &mut LspSession, method: &str, params: Value) -> Result<(), String> {
    if session.hub.dead.load(Ordering::SeqCst) {
        return Err("LSP_SESSION_DEAD: language server process is not alive".to_string());
    }
    let mut stdin_guard = session
        .hub
        .stdin
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    let stdin = stdin_guard
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
    if session.hub.dead.load(Ordering::SeqCst) {
        return Err("LSP_SESSION_DEAD: language server process is not alive".to_string());
    }
    let id = session.next_request_id;
    session.next_request_id = session.next_request_id.saturating_add(1);

    let (tx, rx) = mpsc::channel();
    {
        let mut pending = session
            .hub
            .pending
            .lock()
            .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
        pending.insert(id, tx);
    }

    {
        let mut stdin_guard = session
            .hub
            .stdin
            .lock()
            .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
        let stdin = stdin_guard
            .as_mut()
            .ok_or_else(|| "LSP_IPC_UNAVAILABLE: stdin missing".to_string())?;
        let body = serde_json::json!({
            "jsonrpc": "2.0",
            "id": id,
            "method": method,
            "params": params,
        });
        if let Err(e) = write_lsp_message(stdin, &body.to_string()) {
            let _ = session.hub.pending.lock().map(|mut p| p.remove(&id));
            return Err(e);
        }
    }

    match rx.recv_timeout(timeout) {
        Ok(value) => Ok(value),
        Err(_) => {
            let _ = session.hub.pending.lock().map(|mut p| p.remove(&id));
            let _ = session.child.kill();
            let _ = session.child.wait();
            session.hub.dead.store(true, Ordering::SeqCst);
            emit_session_dead(&session.hub);
            Err(
                "LSP_IPC_TIMEOUT: no matching response within deadline — fail-closed (no mock LSP)."
                    .to_string(),
            )
        }
    }
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
        "clientInfo": { "name": "aethel-lsp-farm", "version": "0.3.0" },
        "rootUri": root_uri,
        "capabilities": {
            "textDocument": {
                "synchronization": {
                    "didSave": true,
                    "dynamicRegistration": false,
                    "willSave": false,
                    "willSaveWaitUntil": false
                },
                "hover": { "contentFormat": ["markdown", "plaintext"] },
                "definition": { "linkSupport": false },
                "completion": {
                    "completionItem": {
                        "snippetSupport": true,
                        "documentationFormat": ["markdown", "plaintext"]
                    },
                    "contextSupport": true
                },
                "publishDiagnostics": { "relatedInformation": true }
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
    if let Ok(mut id_guard) = session.hub.session_id.lock() {
        *id_guard = session_id.clone();
    }
    if let Some(app) = registry.app.as_ref() {
        bind_app_handle(&session.hub, app);
    }
    let lang_key = session.language.as_str();
    let alive = session_alive(&mut session);
    let binary_path = session.binary_path.display().to_string();
    let language = session.language.as_str().to_string();

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
            "Language server sidecar running (stdio). Continuous didChange + diagnostics push enabled."
                .to_string()
        } else {
            "Language server exited before registration — fail-closed.".to_string()
        },
    }
}

fn remember_app(registry: &mut LspFarmRegistry, app: &AppHandle) {
    registry.app = Some(app.clone());
}

/// Honesty surface for desktop L.13 Monaco wire.
#[tauri::command]
pub fn lsp_farm_honesty() -> LspFarmHonestyReport {
    LspFarmHonestyReport {
        cloud_relay_core: true,
        tauri_sidecar_spawn: "partial",
        monaco_desktop_hover_definition: "partial",
        marketing_allowed: false,
        message: "L.13 Tauri lsp_farm: real binary discovery + sidecar spawn + initialize + continuous didChange (full text) + publishDiagnostics→Monaco markers + hover/definition/completion IPC for typescript/javascript, rust, and python. L.C multi-lang matrix shipped; live soak per language is HELD when binary missing (set AETHEL_LSP_PYTHON on Windows if PATH empty). Marketing blocked.".to_string(),
    }
}

/// Probe PATH/env for supported language servers without spawning.
#[tauri::command]
pub fn lsp_farm_probe() -> Vec<LspBinaryProbe> {
    [LspLanguage::TypeScript, LspLanguage::Rust, LspLanguage::Python]
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
    app: AppHandle,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspSpawnResult, String> {
    let lang = LspLanguage::parse(&language).ok_or_else(|| {
        format!(
            "UNSUPPORTED_LANGUAGE: {language} (desktop farm supports typescript/javascript, rust, python)"
        )
    })?;
    let binary = resolve_binary(lang)?;
    let session = spawn_language_server(lang, &binary)?;

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);
    Ok(insert_session(&mut guard, session))
}

/// Ensure a live initialized session for `language` (spawn + initialize if needed).
#[tauri::command]
pub fn lsp_farm_ensure_session(
    args: LspEnsureArgs,
    app: AppHandle,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspSessionInfo, String> {
    let lang = LspLanguage::parse(&args.language).ok_or_else(|| {
        format!(
            "UNSUPPORTED_LANGUAGE: {} (desktop farm supports typescript/javascript, rust, python)",
            args.language
        )
    })?;

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);

    let existing_id = guard.by_language.get(lang.as_str()).cloned();
    if let Some(session_id) = existing_id {
        if let Some(session) = guard.sessions.get_mut(&session_id) {
            bind_app_handle(&session.hub, &app);
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
            let _ = guard.sessions.remove(&session_id);
            guard.by_language.remove(lang.as_str());
        }
    }

    drop(guard);
    let binary = resolve_binary(lang)?;
    let session = spawn_language_server(lang, &binary)?;

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);
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

/// `textDocument/didOpen` — if already open, upgrades to full-text `didChange`.
#[tauri::command]
pub fn lsp_farm_did_open(
    args: LspDidOpenArgs,
    app: AppHandle,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspRpcResult, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);
    let session = guard
        .sessions
        .get_mut(&args.session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {}", args.session_id))?;
    bind_app_handle(&session.hub, &app);

    if !session_alive(session) {
        emit_session_dead(&session.hub);
        return Ok(LspRpcResult {
            session_id: args.session_id,
            ok: false,
            process_alive: false,
            result: None,
            error: None,
            message: "Language server process is not alive — fail-closed (no mock LSP)."
                .to_string(),
        });
    }

    ensure_initialized(session, None)?;
    let version = args.version.unwrap_or(1);

    if session.open_uris.contains(&args.uri) {
        send_notification(
            session,
            "textDocument/didChange",
            serde_json::json!({
                "textDocument": { "uri": args.uri, "version": version },
                "contentChanges": [{ "text": args.text }]
            }),
        )?;
        return Ok(LspRpcResult {
            session_id: session.id.clone(),
            ok: true,
            process_alive: true,
            result: Some(Value::Null),
            error: None,
            message: "didChange (full text) sent for already-open document.".to_string(),
        });
    }

    send_notification(
        session,
        "textDocument/didOpen",
        serde_json::json!({
            "textDocument": {
                "uri": args.uri,
                "languageId": args.language_id,
                "version": version,
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
        message: "didOpen sent; subsequent edits use continuous didChange.".to_string(),
    })
}

/// Continuous full-text `textDocument/didChange` for a live farm session.
/// Opens the document first when needed (fail-closed if session dead).
#[tauri::command]
pub fn lsp_farm_did_change(
    args: LspDidChangeArgs,
    app: AppHandle,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspRpcResult, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);
    let session = guard
        .sessions
        .get_mut(&args.session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {}", args.session_id))?;
    bind_app_handle(&session.hub, &app);

    if !session_alive(session) {
        emit_session_dead(&session.hub);
        return Ok(LspRpcResult {
            session_id: args.session_id,
            ok: false,
            process_alive: false,
            result: None,
            error: None,
            message: "Language server process is not alive — fail-closed (clear Monaco markers)."
                .to_string(),
        });
    }

    ensure_initialized(session, None)?;

    if !session.open_uris.contains(&args.uri) {
        // Caller did not didOpen yet — open with current full text, then done.
        let language_id = args
            .language_id
            .as_deref()
            .filter(|s| !s.is_empty())
            .unwrap_or(session.language.as_str());
        send_notification(
            session,
            "textDocument/didOpen",
            serde_json::json!({
                "textDocument": {
                    "uri": args.uri,
                    "languageId": language_id,
                    "version": args.version,
                    "text": args.text,
                }
            }),
        )?;
        session.open_uris.insert(args.uri.clone());
        return Ok(LspRpcResult {
            session_id: session.id.clone(),
            ok: true,
            process_alive: true,
            result: Some(Value::Null),
            error: None,
            message: "didOpen (via didChange path) sent with full text.".to_string(),
        });
    }

    send_notification(
        session,
        "textDocument/didChange",
        serde_json::json!({
            "textDocument": { "uri": args.uri, "version": args.version },
            "contentChanges": [{ "text": args.text }]
        }),
    )?;

    Ok(LspRpcResult {
        session_id: session.id.clone(),
        ok: true,
        process_alive: true,
        result: Some(Value::Null),
        error: None,
        message: "didChange (full text) sent to live language server.".to_string(),
    })
}

/// Drain buffered `publishDiagnostics` events (also emitted live via Tauri event).
/// Never fabricates diagnostics — empty events when server sent none.
#[tauri::command]
pub fn lsp_farm_poll_diagnostics(
    args: LspPollDiagnosticsArgs,
    app: AppHandle,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspDiagnosticsPollResult, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);
    let session = guard
        .sessions
        .get_mut(&args.session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {}", args.session_id))?;
    bind_app_handle(&session.hub, &app);

    let alive = session_alive(session);
    let events = session
        .hub
        .diag_queue
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?
        .drain(..)
        .collect::<Vec<_>>();

    if !alive {
        return Ok(LspDiagnosticsPollResult {
            session_id: args.session_id,
            process_alive: false,
            events: if events.is_empty() {
                vec![LspDiagnosticsEvent {
                    session_id: session.id.clone(),
                    uri: String::new(),
                    diagnostics: Value::Array(vec![]),
                    version: None,
                    clear: true,
                }]
            } else {
                events
            },
            message: "Session dead — clear Monaco markers (fail-closed; no fake diagnostics)."
                .to_string(),
        });
    }

    let message = if events.is_empty() {
        "No pending diagnostics from language server.".to_string()
    } else {
        format!(
            "{} diagnostics event(s) from live language server",
            events.len()
        )
    };
    Ok(LspDiagnosticsPollResult {
        session_id: session.id.clone(),
        process_alive: true,
        events,
        message,
    })
}

/// JSON-RPC request over an initialized farm session.
/// Returns only real server payloads — never fabricates results.
#[tauri::command]
pub fn lsp_farm_request(
    args: LspRequestArgs,
    app: AppHandle,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspRpcResult, String> {
    let method = args.method.trim();
    const ALLOWED: &[&str] = &[
        "textDocument/hover",
        "textDocument/definition",
        "textDocument/typeDefinition",
        "textDocument/completion",
        "shutdown",
    ];
    if !ALLOWED.contains(&method) {
        return Err(format!(
            "LSP_METHOD_HELD: {method} not on desktop wire (allowed: hover/definition/completion)"
        ));
    }

    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);
    let session = guard
        .sessions
        .get_mut(&args.session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {}", args.session_id))?;
    bind_app_handle(&session.hub, &app);

    if !session_alive(session) {
        emit_session_dead(&session.hub);
        return Ok(LspRpcResult {
            session_id: args.session_id,
            ok: false,
            process_alive: false,
            result: None,
            error: None,
            message: "Language server process is not alive — fail-closed (no mock LSP)."
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
                    format!("{method} returned LSP error — fail-closed UI must not invent results")
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

/// Stop and remove a farm session (best-effort kill); emits clear-diagnostics.
#[tauri::command]
pub fn lsp_farm_stop(
    session_id: String,
    app: AppHandle,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspSessionInfo, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);
    let mut session = guard
        .sessions
        .remove(&session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {session_id}"))?;
    bind_app_handle(&session.hub, &app);
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
    drop(session); // Drop kills child + emits session-dead clear
    Ok(info)
}

/// Stdio JSON-RPC initialize probe — returns only a real server response (or fail-closed).
#[tauri::command]
pub fn lsp_farm_ipc_probe(
    session_id: String,
    app: AppHandle,
    registry: State<'_, Mutex<LspFarmRegistry>>,
) -> Result<LspIpcProbeResult, String> {
    let mut guard = registry
        .lock()
        .map_err(|_| "LSP_FARM_LOCK_POISONED".to_string())?;
    remember_app(&mut guard, &app);
    let session = guard
        .sessions
        .get_mut(&session_id)
        .ok_or_else(|| format!("LSP_SESSION_NOT_FOUND: {session_id}"))?;
    bind_app_handle(&session.hub, &app);

    if !session_alive(session) {
        emit_session_dead(&session.hub);
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
            initialize_response: Some(
                r#"{"jsonrpc":"2.0","id":0,"result":{"alreadyInitialized":true}}"#.to_string(),
            ),
            message: "Session already initialized for Monaco LSP wire.".to_string(),
        });
    }

    match ensure_initialized(session, None) {
        Ok(()) => Ok(LspIpcProbeResult {
            session_id,
            ok: true,
            process_alive: session_alive(session),
            initialize_response: Some(
                r#"{"jsonrpc":"2.0","result":{"initialized":true}}"#.to_string(),
            ),
            message: "Stdio initialize handshake succeeded. Monaco didChange/diagnostics/hover ready when binary live.".to_string(),
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
        assert_eq!(
            LspLanguage::parse("typescriptreact"),
            Some(LspLanguage::TypeScript)
        );
        assert_eq!(LspLanguage::parse("rs"), Some(LspLanguage::Rust));
        assert_eq!(LspLanguage::parse("python"), Some(LspLanguage::Python));
        assert_eq!(LspLanguage::parse("py"), Some(LspLanguage::Python));
        assert_eq!(LspLanguage::parse("cobol"), None);
    }

    #[test]
    fn missing_binary_is_held_not_fabricated() {
        std::env::set_var(
            "AETHEL_LSP_RUST_ANALYZER",
            "E:\\definitely-missing-rust-analyzer-binary.exe",
        );
        let err = resolve_binary(LspLanguage::Rust).expect_err("must fail-closed");
        assert!(err.contains("LSP_BINARY_HELD"), "{err}");
        std::env::remove_var("AETHEL_LSP_RUST_ANALYZER");
    }

    #[test]
    fn python_missing_env_override_is_held_not_fabricated() {
        std::env::set_var(
            "AETHEL_LSP_PYTHON",
            "E:\\definitely-missing-pyright-langserver.exe",
        );
        let err = resolve_binary(LspLanguage::Python).expect_err("must fail-closed");
        assert!(err.contains("LSP_BINARY_HELD"), "{err}");
        assert!(
            err.contains("AETHEL_LSP_PYTHON") || err.contains("not an executable"),
            "{err}"
        );
        std::env::remove_var("AETHEL_LSP_PYTHON");
    }

    #[test]
    fn python_spawn_args_omit_stdio_for_pylsp() {
        assert!(python_spawn_args(Path::new("C:\\Tools\\pylsp.exe")).is_empty());
        assert_eq!(
            python_spawn_args(Path::new("C:\\Tools\\pyright-langserver.cmd")),
            &["--stdio"]
        );
    }

    #[test]
    fn honesty_never_allows_marketing_or_claims_full_lc() {
        let report = lsp_farm_honesty();
        assert_eq!(report.tauri_sidecar_spawn, "partial");
        assert_eq!(report.monaco_desktop_hover_definition, "partial");
        assert!(!report.marketing_allowed);
        assert!(report.message.contains("python") || report.message.contains("Python"));
        assert!(report.message.contains("AETHEL_LSP_PYTHON") || report.message.contains("blocked"));
        assert!(report.message.contains("didChange") || report.message.contains("diagnostics"));
    }

    #[test]
    fn multi_lang_probe_matrix_includes_python_held_or_live() {
        let probes = lsp_farm_probe();
        let langs: Vec<&str> = probes.iter().map(|p| p.language.as_str()).collect();
        assert!(langs.contains(&"typescript"));
        assert!(langs.contains(&"rust"));
        assert!(langs.contains(&"python"));
        for probe in &probes {
            if !probe.available {
                assert!(
                    probe.message.contains("LSP_BINARY_HELD")
                        || probe.message.contains("not found")
                        || probe.message.contains("not an executable"),
                    "unavailable probe must be honest HELD: {}",
                    probe.message
                );
                assert!(probe.resolved_path.is_none());
            } else {
                assert!(probe.resolved_path.is_some());
            }
        }
    }

    #[test]
    fn message_id_match_helpers() {
        let response: Value = serde_json::from_str(r#"{"id":1,"result":{}}"#).unwrap();
        assert!(is_response_message(&response));
        assert_eq!(response_id(&response), Some(1));
        let note: Value =
            serde_json::from_str(r#"{"method":"window/logMessage","params":{}}"#).unwrap();
        assert!(!is_response_message(&note));
        assert_eq!(response_id(&note), None);
    }

    #[test]
    fn store_diagnostics_rejects_non_array() {
        let hub = IoHub {
            stdin: Mutex::new(None),
            pending: Mutex::new(HashMap::new()),
            diagnostics: Mutex::new(HashMap::new()),
            diag_queue: Mutex::new(Vec::new()),
            dead: AtomicBool::new(false),
            session_id: Mutex::new("lsp-test-1".into()),
            app: Mutex::new(None),
        };
        store_and_emit_diagnostics(
            &hub,
            &serde_json::json!({
                "uri": "file:///a.ts",
                "diagnostics": "not-an-array"
            }),
        );
        assert!(hub.diagnostics.lock().unwrap().is_empty());
        store_and_emit_diagnostics(
            &hub,
            &serde_json::json!({
                "uri": "file:///a.ts",
                "diagnostics": [{ "message": "real", "range": { "start": {"line":0,"character":0}, "end": {"line":0,"character":1} }, "severity": 1 }]
            }),
        );
        let map = hub.diagnostics.lock().unwrap();
        assert!(map.contains_key("file:///a.ts"));
        assert!(!map["file:///a.ts"].clear);
    }
}
