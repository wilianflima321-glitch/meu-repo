//! # xtask — Aethel Kernel Wire-Registry fail-closed gate (round R1, S-11).
//!
//! ## Mandato (contrato R1 — `packages/aethel-kernel-rust/src/kernel_registry.rs`)
//!
//! > O `xtask wire-check` (round R1) lê esta tabela e **falha o build fail-closed**
//! > quando a realidade do disco deriva (wire nova sem entrada, `reachable_from`
//! > obsoleto, letra ausente em wire ACTIVE, contagem divergente).
//!
//! O `wire-check` cruza três fontes de verdade:
//!   1. **Registro declarativo** `KERNEL_WIRE_REGISTRY` (115 entradas) —
//!      `{wire_module, kernel_module, letter, status, reachable_from}`.
//!   2. **Disco do Studio** — arquivos `apps/studio-local/src-tauri/src/kernel_*_wire.rs`
//!      + declarações `pub mod` no `lib.rs`.
//!   3. **Superfície IPC** — comandos registrados via `tauri::generate_handler!`
//!      (legado `main.rs` + corpo do macro `register_commands!` em
//!      `ipc_surface.rs` — round R2) — a única porta real de alcançabilidade.
//!
//! ## Invariantes verificadas (qualquer violação → exit code 1, fail-closed)
//!   - `WIRES_ON_DISK` (const) == contagem real de arquivos `kernel_*_wire.rs`;
//!   - toda wire no disco tem entrada no registro (não há orphans sem dívida);
//!   - toda entrada tem arquivo no disco (sem phantoms);
//!   - toda wire no disco tem `pub mod` no `lib.rs` do studio;
//!   - `REACHABLE_WIRE_COUNT` (const) == wires realmente alcançáveis no handler;
//!   - wire `Active` exige: letra documentada + comando real no handler +
//!     `reachable_from` sem marcador de não-alcançabilidade;
//!   - wire `Wire`/`Held` exige: **não** alcançável no handler +
//!     `reachable_from` declarando a não-alcançabilidade com marcador honesto
//!     ("unreachable", "no command", "glob import", "compiled-only");
//!   - registro ordenado por `wire_module` (diffs determinísticos).
//!
//! ## Subcomandos
//!   - `wire-check`  — gate fail-closed (CI/build).  **Uso:** `cargo xtask wire-check`
//!   - `ipc-check`   — gate fail-closed da superfície unificada S-12 (round R2):
//!     bijection macro `register_commands!` × `IPC_ACL_REGISTRY`, split ACL
//!     documentado (17 AgentDeny / 17 HumanOnly / 76 Public / 16 hot-path),
//!     PTY sempre AgentDeny, hot-path nunca PTY.
//!     **Uso:** `cargo xtask ipc-check`
//!   - `audit-depth` — auditoria de profundidade de funcionamento por wire
//!     (réplica em Rust de `_audit_wire_depth.js`; o R13 aposenta o JS).
//!   - `cross-check` — gate R1.6 (CW7) de cross-compilação real: prova que o
//!     kernel compila e linka sob **ambas** as toolchains Windows (GNU/MinGW +
//!     MSVC, distribuição dual-ABI), exigindo binutils MinGW-w64 para o link
//!     GNU e falhando fail-closed em qualquer deriva.
//!     **Uso:** `cargo xtask cross-check`
//!
//! ## Gates locais
//!   - `cargo check`  --manifest-path xtask/Cargo.toml
//!   - `cargo clippy` --manifest-path xtask/Cargo.toml -- -D warnings
//!   - `cargo test`   --manifest-path xtask/Cargo.toml
//!
//! Ferramenta **zero-dep** (std only) — build instantâneo, sem lockfile, sem
//! conflito com os dois crates independentes do produto.

use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::process::ExitCode;

// ---------------------------------------------------------------------------
// Paths (resolvidos a partir do manifesto do xtask — imune ao CWD).
// ---------------------------------------------------------------------------

const REGISTRY_REL: &str = "packages/aethel-kernel-rust/src/kernel_registry.rs";
const STUDIO_SRC_REL: &str = "apps/studio-local/src-tauri/src";
const STUDIO_LIB_REL: &str = "apps/studio-local/src-tauri/src/lib.rs";
const STUDIO_MAIN_REL: &str = "apps/studio-local/src-tauri/src/main.rs";
const STUDIO_SURFACE_REL: &str = "apps/studio-local/src-tauri/src/ipc_surface.rs";
const KERNEL_SRC_REL: &str = "packages/aethel-kernel-rust/src";
const KERNEL_MANIFEST_REL: &str = "packages/aethel-kernel-rust/Cargo.toml";

/// Raiz do repositório: o xtask vive em `<root>/xtask`, um nível abaixo.
fn repo_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .expect("xtask must live exactly one level below the repo root")
        .to_path_buf()
}

// ---------------------------------------------------------------------------
// Parsing do registro declarativo (std only — sem regex externa).
// ---------------------------------------------------------------------------

/// Entrada declarativa S-11, espelho do `KernelWireEntry` do kernel.
#[derive(Debug, Clone, PartialEq, Eq)]
struct RegistryEntry {
    wire_module: String,
    kernel_module: String,
    letter: String,
    status: String, // "Active" | "Wire" | "Held"
    reachable_from: String,
}

/// Extrai `key: "value"` de um corpo (a primeira ocorrência do campo).
fn extract_field(body: &str, key: &str) -> String {
    let marker = format!("{key}:");
    let Some(idx) = body.find(&marker) else {
        return String::new();
    };
    let rest = body[idx + marker.len()..].trim_start();
    let Some(q) = rest.strip_prefix('"') else {
        return String::new();
    };
    match q.find('"') {
        Some(end) => q[..end].to_string(),
        None => String::new(),
    }
}

/// Extrai `status: WireStatus::Active` → `"Active"`.
fn extract_status(body: &str) -> String {
    const PREFIX: &str = "status: WireStatus::";
    let Some(idx) = body.find(PREFIX) else {
        return String::new();
    };
    let rest = &body[idx + PREFIX.len()..];
    let end = rest
        .find(|c: char| !c.is_ascii_alphanumeric())
        .unwrap_or(rest.len());
    rest[..end].to_string()
}

/// Empurra uma entrada parseada, ignorando corpos sem `wire_module`.
fn push_entry(out: &mut Vec<RegistryEntry>, body: &str) {
    let entry = RegistryEntry {
        wire_module: extract_field(body, "wire_module"),
        kernel_module: extract_field(body, "kernel_module"),
        letter: extract_field(body, "letter"),
        status: extract_status(body),
        reachable_from: extract_field(body, "reachable_from"),
    };
    if !entry.wire_module.is_empty() {
        out.push(entry);
    }
}

/// Parseia o `KERNEL_WIRE_REGISTRY` (entradas single-line ou multi-linha).
fn parse_registry(text: &str) -> Vec<RegistryEntry> {
    let mut out = Vec::new();
    let mut body = String::new();
    let mut in_entry = false;
    for line in text.lines() {
        if line.contains("KernelWireEntry {") {
            body = String::from(line);
            in_entry = true;
            if body.trim_end().ends_with("},") {
                push_entry(&mut out, &body);
                in_entry = false;
            }
            continue;
        }
        if in_entry {
            body.push('\n');
            body.push_str(line);
            if line.trim_end().ends_with("},") {
                push_entry(&mut out, &body);
                in_entry = false;
            }
        }
    }
    out
}

/// Extrai `pub const {name}: usize = 115;` → `Some(115)`.
fn extract_usize_const(text: &str, name: &str) -> Option<usize> {
    let marker = format!("{name}: usize = ");
    text.lines().find_map(|raw| {
        let line = raw.trim();
        let idx = line.find(&marker)?;
        let rest = &line[idx + marker.len()..];
        let end = rest
            .find(|c: char| !c.is_ascii_digit())
            .unwrap_or(rest.len());
        rest[..end].parse().ok()
    })
}

// ---------------------------------------------------------------------------
// Superfícies do studio (lib.rs / main.rs).
// ---------------------------------------------------------------------------

/// Extrai o corpo de `tauri::generate_handler![ ... ]`.
///
/// Usa a **última** ocorrência do literal (`rfind`): o corpo real do macro
/// `register_commands!` em `ipc_surface.rs` é sempre o último, enquanto os
/// doc-comments do mesmo arquivo citam `tauri::generate_handler![...]` antes —
/// `find` (primeira) faria a extração arrancar do doc e vazar structs/braços
/// de match para o corpo. Fechamento robusto por linha: aceita `]` sozinho
/// (corpo do macro — round R2) e `])` legado (`main.rs` pré-R2). Fallback
/// inline para handlers de linha única.
fn extract_handler_text(text: &str) -> &str {
    const OPEN: &str = "tauri::generate_handler![";
    let Some(start) = text.rfind(OPEN) else {
        return "";
    };
    let rest = &text[start + OPEN.len()..];
    let mut offset = 0usize;
    for line in rest.split_inclusive('\n') {
        let trimmed = line.trim().trim_end_matches([')', ',']).trim();
        if trimmed == "]" {
            // O corpo termina antes da linha de fechamento.
            return &rest[..offset];
        }
        offset += line.len();
    }
    // Fallback legado: fechamento `])` inline (handler de linha única).
    match rest.find("])") {
        Some(end) => &rest[..end],
        None => "",
    }
}

/// `true` se algum comando do handler referencia `{wire_module}::`.
fn module_is_reachable(handler: &str, wire_module: &str) -> bool {
    handler.contains(&format!("{wire_module}::"))
}

/// `true` se o `lib.rs` declara `pub mod {module};`.
fn has_pub_mod(lib_text: &str, module: &str) -> bool {
    lib_text.contains(&format!("pub mod {module};"))
}

/// Marcadores honestos de não-alcançabilidade aceitos em `reachable_from`
/// para wires `Wire`/`Held`. A string descreve a dívida (ex.: a wire SVO é
/// glob-importada em `main.rs:82` mas **nenhum comando está registrado** no
/// `generate_handler!`) — o gate verifica a semântica, não uma palavra mágica.
fn declares_unreachable(reachable_from: &str) -> bool {
    const MARKERS: [&str; 4] = [
        "unreachable",
        "no command",
        "glob import",
        "compiled-only",
    ];
    MARKERS.iter().any(|m| reachable_from.contains(m))
}

// ---------------------------------------------------------------------------
// Superfície unificada S-12 — parsing do handler (macro) + IPC_ACL_REGISTRY.
// ---------------------------------------------------------------------------

/// Corpo combinado do handler: legado `main.rs` + superfície unificada
/// (`ipc_surface.rs` round R2). O `wire-check` usa a mesma fonte de verdade
/// que o `ipc-check` — nunca extrai o handler de apenas um arquivo.
fn combined_handler(main_text: &str, surface_text: &str) -> String {
    let mut out = String::new();
    out.push_str(extract_handler_text(main_text));
    out.push('\n');
    out.push_str(extract_handler_text(surface_text));
    out
}

/// Extrai os nomes de comando do corpo do handler (último segmento após `::`).
/// Ignora comentários (`//`) e o fechamento `]` (não terminam em `,`).
fn parse_handler_commands(handler: &str) -> Vec<String> {
    handler
        .lines()
        .map(str::trim)
        .filter(|line| !line.starts_with("//"))
        .filter(|line| line.ends_with(','))
        .filter_map(|line| {
            let name = line.trim_end_matches(',').trim();
            if name.is_empty() {
                return None;
            }
            match name.rsplit("::").next() {
                Some(segment) if !segment.is_empty() => Some(segment.to_string()),
                _ => None,
            }
        })
        .collect()
}

/// Linha do `IPC_ACL_REGISTRY` (`acl_entry("nome", IpcAclClass::X, ...)`).
struct SurfaceRow {
    name: String,
    acl: String,
    category: String,
    hot_path: bool,
}

/// Extrai as linhas `acl_entry("name", IpcAclClass::X, IpcCategory::Y, bool)`.
/// `acl` e `category` guardam o último segmento do caminho (`AgentDeny`, `Pty`).
fn parse_surface_registry(text: &str) -> Vec<SurfaceRow> {
    let mut rows = Vec::new();
    for line in text.lines() {
        let line = line.trim();
        if !line.starts_with("acl_entry(") {
            continue;
        }
        let inner = line.trim_end_matches(',').trim();
        let inner = inner
            .strip_prefix("acl_entry(")
            .and_then(|s| s.strip_suffix(')'))
            .unwrap_or(inner);
        let mut parts = inner.splitn(4, ',');
        let name = parts
            .next()
            .map(|s| s.trim().trim_matches('"').to_string())
            .unwrap_or_default();
        let acl = parts
            .next()
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let category = parts
            .next()
            .map(|s| s.trim().to_string())
            .unwrap_or_default();
        let hot_path = parts.next().map(|s| s.trim() == "true").unwrap_or(false);
        if name.is_empty() || acl.is_empty() {
            continue;
        }
        let acl = acl.rsplit("::").next().unwrap_or("").to_string();
        let category = category.rsplit("::").next().unwrap_or("").to_string();
        rows.push(SurfaceRow {
            name,
            acl,
            category,
            hot_path,
        });
    }
    rows
}

// ---------------------------------------------------------------------------
// wire-check — gate fail-closed.
// ---------------------------------------------------------------------------

/// Mede e valida o estado do disco × registro. Retorna o número de violações.
fn run_wire_check() -> usize {
    let root = repo_root();

    let reg_text = read_or_fatal(&root.join(REGISTRY_REL), "registry");
    let lib_text = read_or_fatal(&root.join(STUDIO_LIB_REL), "studio lib.rs");
    let main_text = read_or_fatal(&root.join(STUDIO_MAIN_REL), "studio main.rs");
    let surface_text = read_or_fatal(&root.join(STUDIO_SURFACE_REL), "studio ipc_surface.rs");

    let entries = parse_registry(&reg_text);
    let wires_on_disk_const = extract_usize_const(&reg_text, "WIRES_ON_DISK").unwrap_or(0);
    let reachable_count_const = extract_usize_const(&reg_text, "REACHABLE_WIRE_COUNT").unwrap_or(0);

    // --- 1. Disco real: arquivos kernel_*_wire.rs no studio ---
    let mut disk_modules: Vec<String> = Vec::new();
    if let Ok(rd) = fs::read_dir(root.join(STUDIO_SRC_REL)) {
        for dirent in rd.flatten() {
            let name = dirent.file_name().to_string_lossy().into_owned();
            if name.starts_with("kernel_") && name.ends_with("_wire.rs") {
                disk_modules.push(name.trim_end_matches(".rs").to_string());
            }
        }
    }
    disk_modules.sort();
    disk_modules.dedup();

    let registry_set: BTreeSet<&str> = entries.iter().map(|e| e.wire_module.as_str()).collect();
    let disk_set: BTreeSet<&str> = disk_modules.iter().map(|s| s.as_str()).collect();

    let handler = combined_handler(&main_text, &surface_text);
    let mut errors: Vec<String> = Vec::new();
    let mut reachable_measured = 0usize;
    let mut missing_letters = 0usize;

    // Contagem de wires no disco vs const declarada.
    if wires_on_disk_const != disk_modules.len() {
        errors.push(format!(
            "WIRES_ON_DISK const={wires_on_disk_const} != measured disk files={}",
            disk_modules.len()
        ));
    }

    // Wire no disco sem entrada no registro (orphan sem dívida).
    for m in disk_set.difference(&registry_set) {
        errors.push(format!("wire on disk but MISSING from registry: {m}"));
    }

    // Entrada no registro sem arquivo (phantom).
    for m in registry_set.difference(&disk_set) {
        errors.push(format!("phantom registry entry (no file on disk): {m}"));
    }

    // Wire no disco sem `pub mod` no lib.rs.
    for m in &disk_modules {
        if !has_pub_mod(&lib_text, m) {
            errors.push(format!("wire file lacks `pub mod {m};` in studio lib.rs"));
        }
    }

    // Invariantes por entrada.
    let mut prev: Option<&str> = None;
    let mut sorted_ok = true;
    for e in &entries {
        if let Some(p) = prev {
            if p > e.wire_module.as_str() {
                sorted_ok = false;
            }
        }
        prev = Some(e.wire_module.as_str());

        let reachable_now = module_is_reachable(&handler, &e.wire_module);
        if reachable_now {
            reachable_measured += 1;
        }
        if e.letter.is_empty() {
            missing_letters += 1;
        }

        if e.status == "Active" {
            if e.letter.is_empty() {
                errors.push(format!("ACTIVE wire missing letter: {}", e.wire_module));
            }
            if !reachable_now {
                errors.push(format!(
                    "ACTIVE wire has no command in generate_handler: {}",
                    e.wire_module
                ));
            }
            if declares_unreachable(&e.reachable_from) {
                errors.push(format!(
                    "reachable_from stale (declares non-reachability but ACTIVE): {}",
                    e.wire_module
                ));
            }
        } else {
            if reachable_now {
                errors.push(format!(
                    "non-ACTIVE ({}) wire IS reachable in handler — reachable_from obsolete: {}",
                    e.status, e.wire_module
                ));
            }
            if !declares_unreachable(&e.reachable_from) {
                errors.push(format!(
                    "reachable_from does not declare non-reachability for non-ACTIVE wire: {}",
                    e.wire_module
                ));
            }
        }
    }

    if !sorted_ok {
        errors.push(
            "KERNEL_WIRE_REGISTRY not sorted by wire_module (deterministic diff violated)".to_string(),
        );
    }
    if reachable_measured != reachable_count_const {
        errors.push(format!(
            "REACHABLE_WIRE_COUNT const={reachable_count_const} != measured reachable={reachable_measured}"
        ));
    }

    // --- Relatório ---
    let active = entries.iter().filter(|e| e.status == "Active").count();
    let wire = entries.iter().filter(|e| e.status == "Wire").count();
    let held = entries.iter().filter(|e| e.status == "Held").count();

    println!("=== S-11 WIRE-CHECK (fail-closed, measured) ===");
    println!("  registry entries parsed:     {}", entries.len());
    println!("  wire files on disk (studio): {}", disk_modules.len());
    println!("  reachable wires (handler):   {reachable_measured}");
    println!("  status distribution:         Active={active} Wire={wire} Held={held}");
    println!("  wires missing letter:        {missing_letters}");
    if errors.is_empty() {
        println!("  RESULT: PASS — registry matches disk reality");
    } else {
        println!("  RESULT: FAIL — {} invariant(s) violated", errors.len());
        for e in &errors {
            println!("    ✗ {e}");
        }
    }
    errors.len()
}

// ---------------------------------------------------------------------------
// ipc-check — gate fail-closed da superfície unificada S-12 (round R2).
// ---------------------------------------------------------------------------

/// Mede e valida a bijection macro `register_commands!` × `IPC_ACL_REGISTRY`.
/// Qualquer violação → exit 1 (fail-closed), espelhando o `wire-check`.
fn run_ipc_check() -> usize {
    let root = repo_root();
    let main_text = read_or_fatal(&root.join(STUDIO_MAIN_REL), "studio main.rs");
    let surface_text = read_or_fatal(&root.join(STUDIO_SURFACE_REL), "studio ipc_surface.rs");

    let registered_const =
        extract_usize_const(&surface_text, "REGISTERED_COMMAND_COUNT").unwrap_or(0);
    let agent_deny_const =
        extract_usize_const(&surface_text, "AGENT_DENY_COMMAND_COUNT").unwrap_or(0);
    let human_only_const =
        extract_usize_const(&surface_text, "HUMAN_ONLY_COMMAND_COUNT").unwrap_or(0);
    let public_const = extract_usize_const(&surface_text, "PUBLIC_COMMAND_COUNT").unwrap_or(0);
    let hot_path_const =
        extract_usize_const(&surface_text, "HOT_PATH_COMMAND_COUNT").unwrap_or(0);

    let handler = combined_handler(&main_text, &surface_text);
    let mut macro_commands = parse_handler_commands(&handler);
    macro_commands.sort();
    macro_commands.dedup();

    let registry = parse_surface_registry(&surface_text);
    let mut registry_names: Vec<String> = registry.iter().map(|r| r.name.clone()).collect();
    registry_names.sort();
    registry_names.dedup();

    let mut errors: Vec<String> = Vec::new();

    // 1. Const de contagem == linhas reais do macro (sem drift silencioso).
    if registered_const != macro_commands.len() {
        errors.push(format!(
            "REGISTERED_COMMAND_COUNT const={registered_const} != macro commands measured={}",
            macro_commands.len()
        ));
    }

    // 2. Bijection macro ↔ registry (nenhum lado pode ter órfão).
    let macro_set: BTreeSet<&str> = macro_commands.iter().map(|s| s.as_str()).collect();
    let reg_set: BTreeSet<&str> = registry_names.iter().map(|s| s.as_str()).collect();
    for name in macro_set.difference(&reg_set) {
        errors.push(format!(
            "command in register_commands! macro but MISSING from IPC_ACL_REGISTRY: {name}"
        ));
    }
    for name in reg_set.difference(&macro_set) {
        errors.push(format!(
            "registry entry with NO command in register_commands! macro: {name}"
        ));
    }

    // 3. Registry ordenado por nome (diffs determinísticos).
    if !registry_names.windows(2).all(|w| w[0] <= w[1]) {
        errors.push(
            "IPC_ACL_REGISTRY not sorted by name (deterministic diff violated)".to_string(),
        );
    }

    // 4. Split ACL documentado == registrado (Law #48 + SAB).
    let agent_deny = registry.iter().filter(|r| r.acl == "AgentDeny").count();
    let human_only = registry.iter().filter(|r| r.acl == "HumanOnly").count();
    let public = registry.iter().filter(|r| r.acl == "Public").count();
    let hot_paths = registry.iter().filter(|r| r.hot_path).count();
    if agent_deny != agent_deny_const {
        errors.push(format!(
            "AgentDeny count measured={agent_deny} != const={agent_deny_const}"
        ));
    }
    if human_only != human_only_const {
        errors.push(format!(
            "HumanOnly count measured={human_only} != const={human_only_const}"
        ));
    }
    if public != public_const {
        errors.push(format!("Public count measured={public} != const={public_const}"));
    }
    if hot_paths != hot_path_const {
        errors.push(format!(
            "hot-path count measured={hot_paths} != const={hot_path_const}"
        ));
    }

    // 5. Invariantes de segurança da superfície.
    for row in &registry {
        if row.category == "Pty" && row.acl != "AgentDeny" {
            errors.push(format!("PTY command not AgentDeny: {}", row.name));
        }
        if row.hot_path && row.category == "Pty" {
            errors.push(format!(
                "PTY command flagged as hot path (Law I — no JSON in tick): {}",
                row.name
            ));
        }
        if row.acl.is_empty() {
            errors.push(format!("registry row without ACL class: {}", row.name));
        }
    }

    // --- Relatório ---
    println!("=== S-12 IPC-CHECK (fail-closed, macro × ACL registry bijection) ===");
    println!("  REGISTERED_COMMAND_COUNT const: {registered_const}");
    println!("  commands in register_commands!:  {}", macro_commands.len());
    println!("  IPC_ACL_REGISTRY rows:           {}", registry.len());
    println!(
        "  ACL split:                       AgentDeny={agent_deny} HumanOnly={human_only} Public={public}"
    );
    println!("  hot-path commands:               {hot_paths}");
    if errors.is_empty() {
        println!("  RESULT: PASS — unified IPC surface is a bijection with the ACL registry");
    } else {
        println!("  RESULT: FAIL — {} invariant(s) violated", errors.len());
        for e in &errors {
            println!("    ✗ {e}");
        }
    }
    errors.len()
}

// ---------------------------------------------------------------------------
// audit-depth — réplica em Rust de `_audit_wire_depth.js` (para o R13).
// ---------------------------------------------------------------------------

fn count_lines(text: &str) -> usize {
    if text.is_empty() {
        0
    } else {
        text.lines().count()
    }
}

fn contains_any(needles: &[&str], text: &str) -> bool {
    needles.iter().any(|n| text.contains(n))
}

/// Classificação de profundidade (conservadora, evidence-first — igual ao JS).
fn depth_for(kernel_lines: usize, has_soak_report: bool, has_tests: bool) -> &'static str {
    if kernel_lines >= 300 && has_soak_report && has_tests {
        "Deep"
    } else if kernel_lines >= 100 && (has_soak_report || has_tests) {
        "Medium"
    } else {
        "Shallow"
    }
}

/// Sinaliza substrato fino (kernel module pequeno ou sem soak/tests).
fn stub_risk(status: &str, kernel_lines: usize, has_soak_report: bool, has_tests: bool) -> bool {
    status != "Active"
        && (kernel_lines < 60 || (!has_soak_report && !has_tests && kernel_lines < 150))
}

fn run_audit_depth() {
    let root = repo_root();
    let reg_text = match fs::read_to_string(root.join(REGISTRY_REL)) {
        Ok(t) => t,
        Err(e) => {
            eprintln!("FATAL: registry not found: {} ({e})", root.join(REGISTRY_REL).display());
            std::process::exit(1);
        }
    };
    let entries = parse_registry(&reg_text);
    let studio_src = root.join(STUDIO_SRC_REL);
    let kernel_src = root.join(KERNEL_SRC_REL);

    // Cross-check de presença (mesmo invariante do wire-check).
    let mut disk_modules: Vec<String> = Vec::new();
    if let Ok(rd) = fs::read_dir(&studio_src) {
        for dirent in rd.flatten() {
            let name = dirent.file_name().to_string_lossy().into_owned();
            if name.starts_with("kernel_") && name.ends_with("_wire.rs") {
                disk_modules.push(name.trim_end_matches(".rs").to_string());
            }
        }
    }
    disk_modules.sort();
    let registry_set: BTreeSet<&str> = entries.iter().map(|e| e.wire_module.as_str()).collect();
    let disk_set: BTreeSet<&str> = disk_modules.iter().map(|s| s.as_str()).collect();
    let missing: Vec<&str> = disk_set.difference(&registry_set).copied().collect();
    let phantom: Vec<&str> = registry_set.difference(&disk_set).copied().collect();

    struct Row {
        wire_module: String,
        kernel_module: String,
        letter: String,
        status: String,
        wire_lines: usize,
        kernel_lines: usize,
        has_soak_report: bool,
        has_tests: bool,
        has_evidence: bool,
        depth: &'static str,
        stub: bool,
    }

    let mut rows = Vec::new();
    for e in &entries {
        let kernel_path = kernel_src.join(format!("{}.rs", e.kernel_module));
        let kernel_text = fs::read_to_string(&kernel_path).unwrap_or_default();
        let wire_path = studio_src.join(format!("{}.rs", e.wire_module));
        let wire_text = fs::read_to_string(&wire_path).unwrap_or_default();

        let kernel_lines = count_lines(&kernel_text);
        let wire_lines = count_lines(&wire_text);
        let has_soak_report = contains_any(&["SoakReport", "ProbeReport"], &kernel_text);
        let has_tests = kernel_text.contains("mod tests");
        let has_evidence =
            kernel_text.contains("evidence_fingerprint") || kernel_text.contains("fingerprint");
        let depth = depth_for(kernel_lines, has_soak_report, has_tests);
        let stub = stub_risk(&e.status, kernel_lines, has_soak_report, has_tests);

        rows.push(Row {
            wire_module: e.wire_module.clone(),
            kernel_module: e.kernel_module.clone(),
            letter: e.letter.clone(),
            status: e.status.clone(),
            wire_lines,
            kernel_lines,
            has_soak_report,
            has_tests,
            has_evidence,
            depth,
            stub,
        });
    }
    rows.sort_by_key(|a| a.kernel_lines);

    let mut counts = (0usize, 0usize, 0usize); // Deep, Medium, Shallow
    for r in &rows {
        match r.depth {
            "Deep" => counts.0 += 1,
            "Medium" => counts.1 += 1,
            _ => counts.2 += 1,
        }
    }
    let stubs = rows.iter().filter(|r| r.stub).count();
    let with_letter = rows.iter().filter(|r| !r.letter.is_empty()).count();

    println!("=== S-11 WIRE DEPTH AUDIT (measured, never assumed) ===\n");
    println!("Registry entries parsed:          {}", entries.len());
    println!("Wire files on disk (studio):      {}", disk_modules.len());
    println!(
        "Wires on disk MISSING from registry: {} {}",
        missing.len(),
        if missing.is_empty() {
            String::new()
        } else {
            format!("→ {}", missing.join(", "))
        }
    );
    println!(
        "Phantom registry entries (no file):  {} {}",
        phantom.len(),
        if phantom.is_empty() {
            String::new()
        } else {
            format!("→ {}", phantom.iter().map(|s| s.to_string()).collect::<Vec<_>>().join(", "))
        }
    );
    println!("Wires with documented letter:      {with_letter}");
    println!("Wires missing letter:              {}", rows.len() - with_letter);
    println!("\nDepth distribution (kernel-module line-count based):");
    println!("  Deep   (>=300L + soak report + tests): {}", counts.0);
    println!("  Medium (>=100L + soak or tests):       {}", counts.1);
    println!("  Shallow (<100L or no soak/tests):      {}", counts.2);
    println!("  STUB-RISK wires (thin kernel substrate): {stubs}\n");

    if stubs > 0 {
        println!("--- STUB-RISK wires (need deepening or unification) ---");
        for r in rows.iter().filter(|r| r.stub) {
            println!(
                "  {}  →  {}.rs ({}L, letter {}, soakReport={} tests={})",
                r.wire_module,
                r.kernel_module,
                r.kernel_lines,
                if r.letter.is_empty() {
                    "—".to_string()
                } else {
                    r.letter.clone()
                },
                r.has_soak_report,
                r.has_tests
            );
        }
        println!();
    }

    println!("--- FULL TABLE (shallowest first) ---");
    println!("wire | kernel | L(wire) | L(kernel) | soak | tests | evidence | letter | status | depth | stub");
    for r in &rows {
        println!(
            "{} | {}.rs | {} | {} | {} | {} | {} | {} | {} | {} | {}",
            r.wire_module,
            r.kernel_module,
            r.wire_lines,
            r.kernel_lines,
            if r.has_soak_report { "Y" } else { "n" },
            if r.has_tests { "Y" } else { "n" },
            if r.has_evidence { "Y" } else { "n" },
            if r.letter.is_empty() { "—" } else { r.letter.as_str() },
            r.status,
            r.depth,
            if r.stub { "STUB" } else { "" }
        );
    }
}

// ---------------------------------------------------------------------------
// Cross-compilation gate (R1.6, CW7 — dual-ABI distribution: GNU + MSVC).
// ---------------------------------------------------------------------------

/// Toolchain GNU canônica — ABI MinGW-w64 (MSVCRT), a alternativa da
/// distribuição dual-ABI.
const TOOLCHAIN_GNU: &str = "stable-x86_64-pc-windows-gnu";
/// Toolchain MSVC canônica — ABI MSVC (link.exe), o default do produto.
const TOOLCHAIN_MSVC: &str = "stable-x86_64-pc-windows-msvc";
/// Binutils MinGW-w64 exigidos pelo link GNU (ausência = falha fail-closed).
const MINGW_LINKER_BINS: &[&str] = &["dlltool.exe", "gcc.exe"];

/// Resultado de uma etapa (check/build) sob uma toolchain.
struct CrossStep {
    label: String,
    ok: bool,
    detail: String,
}

/// Classifica a ABI de uma toolchain pela terminação canônica do nome.
fn toolchain_abi(name: &str) -> &'static str {
    if name.ends_with("-windows-gnu") {
        "gnu"
    } else if name.ends_with("-windows-msvc") {
        "msvc"
    } else {
        "unknown"
    }
}

/// A toolchain GNU exige binutils MinGW-w64 no PATH para o link final.
fn requires_mingw_binutils(name: &str) -> bool {
    toolchain_abi(name) == "gnu"
}

/// Parseia a saída de `rustup toolchain list` (stdout) em nomes canônicos,
/// ordenados e deduplicados (determinístico).
fn parse_toolchain_lines(text: &str) -> Vec<String> {
    let mut out: Vec<String> = text
        .lines()
        .filter_map(|line| line.split_whitespace().next())
        .filter(|name| !name.is_empty() && name.contains('-'))
        .map(|name| name.to_string())
        .collect();
    out.sort();
    out.dedup();
    out
}

/// True se `bin` estiver alcançável no PATH do processo (lookup de arquivo).
fn on_path(bin: &str) -> bool {
    let Some(path) = env::var_os("PATH") else {
        return false;
    };
    env::split_paths(&path).any(|dir| dir.join(bin).is_file())
}

/// Lista as toolchains instaladas via `rustup toolchain list`.
fn installed_toolchains() -> Vec<String> {
    let Ok(output) = Command::new("rustup").args(["toolchain", "list"]).output() else {
        return Vec::new();
    };
    if !output.status.success() {
        return Vec::new();
    }
    parse_toolchain_lines(&String::from_utf8_lossy(&output.stdout))
}

/// Executa `cargo check` ou `cargo build` do kernel sob uma toolchain.
fn run_cargo_step(toolchain: &str, mode: &str, manifest: &Path) -> CrossStep {
    let label = format!("{toolchain} {mode}");
    let arg = format!("+{toolchain}");
    let manifest_arg = manifest.display().to_string();
    let output = Command::new("cargo")
        .arg(&arg)
        .arg(mode)
        .args(["--manifest-path", manifest_arg.as_str()])
        .current_dir(repo_root())
        .output();
    let (ok, detail) = match output {
        Ok(out) if out.status.success() => (true, "PASS".to_string()),
        Ok(out) => {
            let stderr = String::from_utf8_lossy(&out.stderr);
            let lines: Vec<&str> = stderr.lines().collect();
            let start = lines.len().saturating_sub(6);
            let tail = lines[start..].join("\n");
            (false, format!("FAIL\n{tail}"))
        }
        Err(e) => (false, format!("spawn failed: {e}")),
    };
    CrossStep { label, ok, detail }
}

/// Gate R1.6 (CW7) — prova de cross-compilação real (dual-ABI GNU + MSVC).
///
/// Executa `cargo check` + `cargo build` do kernel sob **ambas** as toolchains
/// canônicas. Falha fail-closed se: qualquer toolchain obrigatória faltar,
/// binutils MinGW-w64 estiverem ausentes para o link GNU, ou qualquer etapa
/// check/build falhar. Retorna o número de violações (0 = PASS).
fn run_cross_check() -> usize {
    let root = repo_root();
    let manifest = root.join(KERNEL_MANIFEST_REL);
    let toolchains = installed_toolchains();

    println!("=== Cross-Compile (R1.6, CW7 — dual-ABI GNU + MSVC) ===");

    if toolchains.is_empty() {
        eprintln!("  VIOLATION: nenhuma toolchain detectada via rustup — fail-closed");
        println!("  RESULT: FAIL (1 violação)");
        return 1;
    }

    let gnu_installed = toolchains.iter().any(|t| t == TOOLCHAIN_GNU);
    let msvc_installed = toolchains.iter().any(|t| t == TOOLCHAIN_MSVC);
    println!(
        "  toolchains: {} | gnu={gnu_installed} msvc={msvc_installed}",
        toolchains.join(", ")
    );

    let mut violations = 0usize;
    for (name, present) in [
        (TOOLCHAIN_GNU, gnu_installed),
        (TOOLCHAIN_MSVC, msvc_installed),
    ] {
        if !present {
            eprintln!("  VIOLATION: toolchain {name} ausente — dual-ABI incompleto");
            violations += 1;
        }
    }

    let mut steps: Vec<CrossStep> = Vec::new();
    for tc in [TOOLCHAIN_GNU, TOOLCHAIN_MSVC] {
        let installed = if tc == TOOLCHAIN_GNU {
            gnu_installed
        } else {
            msvc_installed
        };
        if !installed {
            continue;
        }
        println!("  [{tc}]");
        let check = run_cargo_step(tc, "check", &manifest);
        println!("    check: {}", if check.ok { "PASS" } else { "FAIL" });
        steps.push(check);
        let build = run_cargo_step(tc, "build", &manifest);
        println!("    build: {}", if build.ok { "PASS" } else { "FAIL" });
        steps.push(build);
    }

    for tc in [TOOLCHAIN_GNU, TOOLCHAIN_MSVC] {
        if !requires_mingw_binutils(tc) {
            continue;
        }
        let missing: Vec<&str> = MINGW_LINKER_BINS
            .iter()
            .copied()
            .filter(|b| !on_path(b))
            .collect();
        if missing.is_empty() {
            println!("  [{tc}] mingw binutils no PATH: OK (dlltool.exe, gcc.exe)");
        } else {
            eprintln!(
                "  VIOLATION: binutils MinGW-w64 ausentes no PATH para {tc}: {}",
                missing.join(", ")
            );
            violations += 1;
        }
    }

    for s in &steps {
        if !s.ok {
            violations += 1;
            eprintln!("  VIOLATION: {}\n{}", s.label, s.detail);
        }
    }

    if violations == 0 {
        println!("  RESULT: PASS — kernel compila e linka sob GNU (MSVCRT) e MSVC");
    } else {
        println!("  RESULT: FAIL ({violations} violação(ões))");
    }
    violations
}

// ---------------------------------------------------------------------------
// CLI.
// ---------------------------------------------------------------------------

fn print_help() {
    println!(
        "xtask — Aethel IPC wire-registry fail-closed gates (R1, S-11 + R2, S-12)\n\n\
         USAGE:\n  \
         cargo xtask wire-check     gate fail-closed: registry × disco × lib.rs × handler\n  \
         cargo xtask ipc-check      gate fail-closed S-12: macro × IPC_ACL_REGISTRY bijection\n  \
         cargo xtask audit-depth    réplica em Rust de _audit_wire_depth.js\n  \
         cargo xtask cross-check    gate R1.6 CW7: kernel build GNU + MSVC dual-ABI\n  \
         cargo xtask help\n\n\
         GATES:\n  \
         cargo check --manifest-path xtask/Cargo.toml\n  \
         cargo clippy --manifest-path xtask/Cargo.toml -- -D warnings\n  \
         cargo test --manifest-path xtask/Cargo.toml"
    );
}

/// Lê um arquivo obrigatório; aborta com fail-closed se ausente/ilegível.
fn read_or_fatal(path: &PathBuf, what: &str) -> String {
    match fs::read_to_string(path) {
        Ok(text) => text,
        Err(e) => {
            eprintln!("FATAL: {what} unreadable at {} ({e})", path.display());
            std::process::exit(1);
        }
    }
}

fn main() -> ExitCode {
    let cmd = env::args().nth(1).unwrap_or_else(|| "wire-check".to_string());
    match cmd.as_str() {
        "wire-check" => {
            let violations = run_wire_check();
            if violations == 0 {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(1)
            }
        }
        "ipc-check" => {
            let violations = run_ipc_check();
            if violations == 0 {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(1)
            }
        }
        "audit-depth" => {
            run_audit_depth();
            ExitCode::SUCCESS
        }
        "cross-check" => {
            let violations = run_cross_check();
            if violations == 0 {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(1)
            }
        }
        "help" | "--help" | "-h" => {
            print_help();
            ExitCode::SUCCESS
        }
        other => {
            eprintln!("unknown subcommand: {other}\n");
            print_help();
            ExitCode::from(2)
        }
    }
}

// ---------------------------------------------------------------------------
// Testes unit — funções puras de parsing e invariantes.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_field_handles_single_line_entry() {
        let body = r#"KernelWireEntry { wire_module: "kernel_a_wire", kernel_module: "a", letter: "gf", status: WireStatus::Wire, reachable_from: "unreachable (P2g)" }"#;
        assert_eq!(extract_field(body, "wire_module"), "kernel_a_wire");
        assert_eq!(extract_field(body, "kernel_module"), "a");
        assert_eq!(extract_field(body, "letter"), "gf");
        assert_eq!(extract_status(body), "Wire");
        assert_eq!(extract_field(body, "reachable_from"), "unreachable (P2g)");
    }

    #[test]
    fn extract_field_returns_empty_when_field_missing() {
        let body = r#"KernelWireEntry { wire_module: "kernel_a_wire" }"#;
        assert_eq!(extract_field(body, "letter"), "");
        assert_eq!(extract_status(body), "");
    }

    #[test]
    fn parse_registry_handles_multiline_entries() {
        let text = "pub const KERNEL_WIRE_REGISTRY: &[KernelWireEntry] = &[\n\
            KernelWireEntry {\n\
                wire_module: \"kernel_a_wire\",\n\
                kernel_module: \"a\",\n\
                letter: \"gf\",\n\
                status: WireStatus::Active,\n\
                reachable_from: \"main.rs\"\n\
            },\n\
            KernelWireEntry { wire_module: \"kernel_b_wire\", kernel_module: \"b\", letter: \"hb\", status: WireStatus::Wire, reachable_from: \"unreachable (P2g)\" },\n\
        ];";
        let parsed = parse_registry(text);
        assert_eq!(parsed.len(), 2);
        assert_eq!(parsed[0].wire_module, "kernel_a_wire");
        assert_eq!(parsed[0].status, "Active");
        assert_eq!(parsed[1].status, "Wire");
        assert_eq!(parsed[1].letter, "hb");
    }

    #[test]
    fn parse_registry_ignores_type_declaration_line() {
        let text = "pub const KERNEL_WIRE_REGISTRY: &[KernelWireEntry] = &[\n    KernelWireEntry { wire_module: \"kernel_a_wire\", kernel_module: \"a\", letter: \"\", status: WireStatus::Held, reachable_from: \"unreachable (held)\" },\n];";
        let parsed = parse_registry(text);
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].status, "Held");
    }

    #[test]
    fn extract_usize_const_parses_trailing_semicolon() {
        let text = "pub const WIRES_ON_DISK: usize = 115;\npub const REACHABLE_WIRE_COUNT: usize = 4;";
        assert_eq!(extract_usize_const(text, "WIRES_ON_DISK"), Some(115));
        assert_eq!(extract_usize_const(text, "REACHABLE_WIRE_COUNT"), Some(4));
        assert_eq!(extract_usize_const(text, "NOPE"), None);
    }

    #[test]
    fn extract_handler_text_isolates_command_list() {
        let text = "fn main() {\n  tauri::generate_handler![\n    a::foo,\n    b::bar,\n  ])\n}";
        let handler = extract_handler_text(text);
        assert!(handler.contains("a::foo"));
        assert!(handler.contains("b::bar"));
        assert!(!handler.contains("generate_handler"));
    }

    #[test]
    fn module_is_reachable_only_matches_full_module_path() {
        let handler = "aethel_studio_local::kernel_position_based_dynamics_wire::probe_cmd";
        assert!(module_is_reachable(handler, "kernel_position_based_dynamics_wire"));
        // Um nome que seja prefixo do path NÃO deve casar (falta `::`).
        assert!(!module_is_reachable(handler, "kernel_position"));
    }

    #[test]
    fn has_pub_mod_detects_declaration() {
        let lib = "pub mod kernel_foundation_honesty_wire;\n// kernel_micro_poly_cull_wire commented\npub mod kernel_micro_poly_cull_wire;";
        assert!(has_pub_mod(lib, "kernel_foundation_honesty_wire"));
        assert!(has_pub_mod(lib, "kernel_micro_poly_cull_wire"));
        assert!(!has_pub_mod(lib, "kernel_ghost_wire"));
    }

    #[test]
    fn depth_classification_matches_js_thresholds() {
        assert_eq!(depth_for(300, true, true), "Deep");
        assert_eq!(depth_for(299, true, true), "Medium");
        assert_eq!(depth_for(100, true, false), "Medium");
        assert_eq!(depth_for(99, true, false), "Shallow");
        assert_eq!(depth_for(500, false, false), "Shallow");
    }

    #[test]
    fn stub_risk_matches_js_rule() {
        assert!(stub_risk("Wire", 40, false, false));
        assert!(stub_risk("Held", 120, false, false)); // <150 sem soak/tests
        assert!(!stub_risk("Wire", 120, true, false)); // tem soak → não é stub
        assert!(!stub_risk("Active", 10, false, false)); // Active nunca é stub
        assert!(!stub_risk("Wire", 160, false, false)); // >=150 e sem soak/tests → não
    }

    #[test]
    fn registry_entry_roundtrip_is_deterministic() {
        let text = "pub const KERNEL_WIRE_REGISTRY: &[KernelWireEntry] = &[\n\
            KernelWireEntry {\n\
                wire_module: \"kernel_zzz_wire\",\n\
                kernel_module: \"zzz\",\n\
                letter: \"ha\",\n\
                status: WireStatus::Wire,\n\
                reachable_from: \"unreachable (compiled-only — P2g disconnection, S-11 debt)\",\n\
            },\n\
        ];";
        let parsed = parse_registry(text);
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0].wire_module, "kernel_zzz_wire");
        assert_eq!(parsed[0].kernel_module, "zzz");
        assert_eq!(parsed[0].letter, "ha");
        assert!(parsed[0].reachable_from.contains("unreachable"));
    }

    #[test]
    fn declares_unreachable_accepts_all_honest_markers() {
        // A wire SVO: glob-importada em main.rs:82, mas nenhum comando registrado.
        assert!(declares_unreachable(
            "main.rs:82 glob import — no command registered (S-11 debt)"
        ));
        assert!(declares_unreachable("unreachable (P2g disconnection)"));
        assert!(declares_unreachable("compiled-only — no command yet"));
        assert!(declares_unreachable("no command registered in generate_handler"));
        // Um registro real de alcançabilidade NÃO deve ser confundido.
        assert!(!declares_unreachable("registered as probe_foo_cmd"));
        assert!(!declares_unreachable("main.rs:425 — active command"));
    }

    #[test]
    fn extract_handler_text_handles_standalone_bracket_macro_style() {
        // O corpo do macro `register_commands!` (ipc_surface.rs round R2) fecha
        // com `]` sozinho na própria linha — NÃO com o legado `])`. Um
        // doc-comment ANTES citando `tauri::generate_handler![...]` não pode
        // sequestrar a extração (rfind → último = corpo real).
        let text = "//! doc cita o literal `tauri::generate_handler![...]` antes do macro\n\
            macro_rules! register_commands {\n    ($app:ident) => {\n        $app.invoke_handler(tauri::generate_handler![\n            desktop_commands::fs_read,\n            desktop_commands::fs_write,\n        ]);\n    };\n}";
        let handler = extract_handler_text(text);
        assert!(handler.contains("desktop_commands::fs_read"));
        assert!(handler.contains("desktop_commands::fs_write"));
        assert!(!handler.contains("generate_handler"));
        assert!(!handler.contains(']'));
    }

    #[test]
    fn parse_handler_commands_extracts_last_segments_and_skips_comments() {
        let handler = "// Round R2: superfície unificada.\n\
            aethel_studio_local::kernel_position_based_dynamics_wire::probe_cmd,\n\
            desktop_commands::fs_read,\n\
            ]";
        let commands = parse_handler_commands(handler);
        assert_eq!(commands, vec!["probe_cmd", "fs_read"]);
    }

    #[test]
    fn parse_surface_registry_extracts_rows_and_class_segments() {
        let text = "pub const IPC_ACL_REGISTRY: &[IpcAclEntry] = &[\n\
            acl_entry(\"fs_read\", IpcAclClass::Public, IpcCategory::Filesystem, true),\n\
            acl_entry(\"terminal_create\", IpcAclClass::AgentDeny, IpcCategory::Pty, false),\n\
            acl_entry(\"window_minimize\", IpcAclClass::HumanOnly, IpcCategory::Window, false),\n\
        ];";
        let rows = parse_surface_registry(text);
        assert_eq!(rows.len(), 3);
        assert_eq!(rows[0].name, "fs_read");
        assert_eq!(rows[0].acl, "Public");
        assert_eq!(rows[0].category, "Filesystem");
        assert!(rows[0].hot_path);
        assert_eq!(rows[1].name, "terminal_create");
        assert_eq!(rows[1].acl, "AgentDeny");
        assert_eq!(rows[1].category, "Pty");
        assert!(!rows[1].hot_path);
        assert_eq!(rows[2].name, "window_minimize");
        assert_eq!(rows[2].acl, "HumanOnly");
        assert_eq!(rows[2].category, "Window");
        assert!(!rows[2].hot_path);
    }

    #[test]
    fn parse_surface_registry_ignores_non_acl_entry_lines() {
        let text = "pub const IPC_ACL_REGISTRY: &[IpcAclEntry] = &[\n\
            acl_entry(\"fs_read\", IpcAclClass::Public, IpcCategory::Filesystem, true),\n\
            // comentário não é linha acl_entry\n\
        ];";
        let rows = parse_surface_registry(text);
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].name, "fs_read");
    }

    #[test]
    fn parse_toolchain_lines_extracts_canonical_names() {
        let text = "stable-x86_64-pc-windows-gnu (default)\nstable-x86_64-pc-windows-msvc\n";
        let names = parse_toolchain_lines(text);
        assert_eq!(
            names,
            vec![
                "stable-x86_64-pc-windows-gnu".to_string(),
                "stable-x86_64-pc-windows-msvc".to_string()
            ]
        );
    }

    #[test]
    fn parse_toolchain_lines_dedups_and_sorts() {
        let text = "stable-x86_64-pc-windows-msvc\nstable-x86_64-pc-windows-gnu\nstable-x86_64-pc-windows-msvc\n";
        let names = parse_toolchain_lines(text);
        assert_eq!(names.len(), 2);
        assert!(names[0].ends_with("-windows-gnu"));
        assert!(names[1].ends_with("-windows-msvc"));
    }

    #[test]
    fn toolchain_abi_classifies_gnu_msvc_and_unknown() {
        assert_eq!(toolchain_abi("stable-x86_64-pc-windows-gnu"), "gnu");
        assert_eq!(toolchain_abi("stable-x86_64-pc-windows-msvc"), "msvc");
        assert_eq!(toolchain_abi("nightly-x86_64-pc-windows-gnu"), "gnu");
        assert_eq!(toolchain_abi("1.80.0-x86_64-pc-windows-msvc"), "msvc");
        assert_eq!(toolchain_abi("stable-x86_64-unknown-linux-gnu"), "unknown");
        assert_eq!(toolchain_abi(""), "unknown");
    }

    #[test]
    fn requires_mingw_binutils_only_for_gnu() {
        assert!(requires_mingw_binutils("stable-x86_64-pc-windows-gnu"));
        assert!(!requires_mingw_binutils("stable-x86_64-pc-windows-msvc"));
        assert!(!requires_mingw_binutils("stable-x86_64-unknown-linux-gnu"));
    }
}
