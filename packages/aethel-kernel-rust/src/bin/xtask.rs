//! # Aethel Kernel `xtask` — ferramentas de governança da superfície de IPC.
//!
//! Doutrina #73 (Absolute Supremacy) + doctrine #74 (Adaptação Universal).
//! Round R1 — subcomando `wire-check`: auditoria **fail-closed** do registro
//! S-11 ([`aethel_kernel_rust::kernel_registry`]) contra a realidade do disco.
//!
//! Anti-Hallucination Protocol: este binário **mede** o estado real do sistema
//! de arquivos (nunca chuta). A fonte de verdade é o registro compilado; o disco
//! é a realidade; qualquer deriva entre os dois é uma falha com exit code `!= 0`.
//!
//! ```text
//! cargo run --bin xtask -- wire-check
//! ```
//!
//! Exit code `0` = registro ↔ disco ↔ lib.rs alinhados; `!= 0` = deriva
//! detectada (fail-closed — CI/PR não pode aprovar com superfície de IPC
//! inconsistente, encerrando a era dos 111 compiled-but-unreachable silenciosos).

use std::collections::BTreeSet;
use std::env;
use std::fs;
use std::path::{Path, PathBuf};

use aethel_kernel_rust::kernel_registry::{
    self, ACTIVE_WIRE_MODULES, KERNEL_WIRE_REGISTRY, REACHABLE_WIRE_COUNT, REGISTRY_VERSION,
    WIRES_ON_DISK, WireStatus,
};

/// Raiz do repositório: `CARGO_MANIFEST_DIR` = `<root>/packages/aethel-kernel-rust`.
fn repo_root() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    manifest_dir
        .parent()
        .and_then(Path::parent)
        .expect("CARGO_MANIFEST_DIR must be two levels below the repo root")
        .to_path_buf()
}

/// Acumulador de auditoria — falhas fail-closed + notas informativas.
struct Audit {
    failures: Vec<String>,
    notes: Vec<String>,
}

impl Audit {
    fn new() -> Self {
        Self {
            failures: Vec::new(),
            notes: Vec::new(),
        }
    }

    fn fail(&mut self, message: impl Into<String>) {
        self.failures.push(message.into());
    }

    fn note(&mut self, message: impl Into<String>) {
        self.notes.push(message.into());
    }

    fn ok(&self) -> bool {
        self.failures.is_empty()
    }
}

/// Nomes de módulo `kernel_*_wire` presentes em um diretório (disco).
fn wires_on_disk(dir: &Path) -> Vec<String> {
    let mut out = Vec::new();
    if let Ok(rd) = fs::read_dir(dir) {
        for entry in rd.flatten() {
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.starts_with("kernel_") && name.ends_with("_wire.rs") {
                out.push(name.trim_end_matches(".rs").to_string());
            }
        }
    }
    out.sort();
    out
}

/// Nomes de módulo `kernel_*_wire` declarados como `pub mod` no lib.rs do studio
/// (lado compile — o wire-check cruza com o conjunto do disco).
fn wires_declared_in_lib_rs(lib_rs: &Path) -> Vec<String> {
    let text = match fs::read_to_string(lib_rs) {
        Ok(t) => t,
        Err(_) => return Vec::new(),
    };
    let mut out = Vec::new();
    for line in text.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("pub mod ") {
            if let Some(module) = rest.strip_suffix(';') {
                if module.starts_with("kernel_") && module.ends_with("_wire") {
                    out.push(module.to_string());
                }
            }
        }
    }
    out.sort();
    out
}

/// Executa o subcomando `wire-check`. Retorna o exit code.
fn run_wire_check() -> i32 {
    let root = repo_root();
    let studio_src = root
        .join("apps")
        .join("studio-local")
        .join("src-tauri")
        .join("src");
    let studio_lib = studio_src.join("lib.rs");
    let kernel_src = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("src");

    let mut a = Audit::new();
    a.note(format!("registry version: {REGISTRY_VERSION}"));
    a.note(format!("registry entries: {}", KERNEL_WIRE_REGISTRY.len()));
    a.note(format!("WIRES_ON_DISK const: {WIRES_ON_DISK}"));
    a.note(format!("REACHABLE_WIRE_COUNT const: {REACHABLE_WIRE_COUNT}"));
    a.note(format!("ACTIVE_WIRE_MODULES const: {}", ACTIVE_WIRE_MODULES.len()));

    // 1. Total do registro vs constante auditada (115 medido em R0).
    if KERNEL_WIRE_REGISTRY.len() != WIRES_ON_DISK {
        a.fail(format!(
            "registry total ({}) != WIRES_ON_DISK const ({WIRES_ON_DISK})",
            KERNEL_WIRE_REGISTRY.len()
        ));
    }

    // 2. reachable + orphan == total, e reachable == constante.
    let reachable = kernel_registry::reachable_wires();
    let orphan = kernel_registry::orphan_wires();
    if reachable + orphan != KERNEL_WIRE_REGISTRY.len() {
        a.fail(format!(
            "reachable ({reachable}) + orphan ({orphan}) != registry total ({})",
            KERNEL_WIRE_REGISTRY.len()
        ));
    }
    if reachable != REACHABLE_WIRE_COUNT {
        a.fail(format!(
            "reachable_wires() ({reachable}) != REACHABLE_WIRE_COUNT const ({REACHABLE_WIRE_COUNT})"
        ));
    }

    // 3. Conjunto ACTIVE do registro == ACTIVE_WIRE_MODULES const.
    let active_from_registry: BTreeSet<&str> = KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.status == WireStatus::Active)
        .map(|e| e.wire_module)
        .collect();
    let active_const: BTreeSet<&str> = ACTIVE_WIRE_MODULES.iter().copied().collect();
    if active_from_registry != active_const {
        a.fail(format!(
            "ACTIVE set from registry ({active_from_registry:?}) != ACTIVE_WIRE_MODULES const ({active_const:?})"
        ));
    }
    if active_const.len() != REACHABLE_WIRE_COUNT {
        a.fail(format!(
            "ACTIVE_WIRE_MODULES len ({}) != REACHABLE_WIRE_COUNT ({REACHABLE_WIRE_COUNT})",
            active_const.len()
        ));
    }

    // 4. Nenhuma wire ACTIVE sem letra (dívida de completude S-11 ilegal em Active).
    for e in KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.status == WireStatus::Active)
    {
        if e.letter.is_empty() {
            a.fail(format!(
                "ACTIVE wire {} has no letter (S-11 completeness debt)",
                e.wire_module
            ));
        }
    }

    // 5. Nenhuma wire ACTIVE com reachable_from "unreachable" (contradição).
    for e in KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.status == WireStatus::Active)
    {
        if e.reachable_from.starts_with("unreachable") {
            a.fail(format!(
                "ACTIVE wire {} claims unreachable registration point: {}",
                e.wire_module, e.reachable_from
            ));
        }
    }

    // 6. Letras ausentes: exatamente 3 (estado medido R0), todas Wire.
    let missing = kernel_registry::wires_missing_letter();
    if missing.len() != 3 {
        a.fail(format!(
            "wires_missing_letter() = {} (expected exactly 3 measured), list: {:?}",
            missing.len(),
            missing.iter().map(|e| e.wire_module).collect::<Vec<_>>()
        ));
    }
    for e in &missing {
        if e.status == WireStatus::Active {
            a.fail(format!(
                "wire {} is missing a letter but is ACTIVE — illegal",
                e.wire_module
            ));
        }
    }

    // 7. Letras duplicadas (não-vazias) — colisão de nomenclatura.
    let mut seen: BTreeSet<&str> = BTreeSet::new();
    for e in KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| !e.letter.is_empty())
    {
        if !seen.insert(e.letter) {
            a.fail(format!(
                "duplicate letter '{}' (wire {})",
                e.letter, e.wire_module
            ));
        }
    }

    // 8. Registro ordenado alfabeticamente por wire_module (diffs determinísticos).
    for w in KERNEL_WIRE_REGISTRY.windows(2) {
        if w[0].wire_module > w[1].wire_module {
            a.fail(format!(
                "registry not sorted: '{}' appears after '{}'",
                w[1].wire_module, w[0].wire_module
            ));
        }
    }

    // 9. Disco: wires presentes (studio) — nenhuma wire órfã (sem entrada) e
    //    nenhuma entrada fantasma (sem arquivo).
    let disk = wires_on_disk(&studio_src);
    let disk_set: BTreeSet<&str> = disk.iter().map(String::as_str).collect();
    let reg_set: BTreeSet<&str> = KERNEL_WIRE_REGISTRY.iter().map(|e| e.wire_module).collect();

    let orphan_on_disk: Vec<&str> = disk_set.difference(&reg_set).copied().collect();
    let phantom: Vec<&str> = reg_set.difference(&disk_set).copied().collect();

    if !orphan_on_disk.is_empty() {
        a.fail(format!(
            "{} wire file(s) on disk missing from registry: {}",
            orphan_on_disk.len(),
            orphan_on_disk.join(", ")
        ));
    }
    if !phantom.is_empty() {
        a.fail(format!(
            "{} registry entr(ies) with no file on disk: {}",
            phantom.len(),
            phantom.join(", ")
        ));
    }
    if disk.len() != WIRES_ON_DISK {
        a.fail(format!(
            "wires on disk ({}) != WIRES_ON_DISK const ({WIRES_ON_DISK})",
            disk.len()
        ));
    }

    // 10. Lado compile: `pub mod kernel_*_wire;` no lib.rs do studio == disco.
    let declared = wires_declared_in_lib_rs(&studio_lib);
    let declared_set: BTreeSet<&str> = declared.iter().map(String::as_str).collect();
    if declared_set != disk_set {
        let only_declared: Vec<&str> = declared_set.difference(&disk_set).copied().collect();
        let only_disk: Vec<&str> = disk_set.difference(&declared_set).copied().collect();
        a.fail(format!(
            "studio lib.rs `pub mod` set != disk set (only_declared={only_declared:?}, only_on_disk={only_disk:?})"
        ));
    }

    // 11. kernel_module de cada entrada existe no kernel src (sem phantom de substrate).
    let mut missing_kernel: Vec<&str> = Vec::new();
    for e in KERNEL_WIRE_REGISTRY {
        let p = kernel_src.join(format!("{}.rs", e.kernel_module));
        if !p.is_file() {
            missing_kernel.push(e.kernel_module);
        }
    }
    if !missing_kernel.is_empty() {
        a.fail(format!(
            "{} kernel_module(s) without file in kernel src: {}",
            missing_kernel.len(),
            missing_kernel.join(", ")
        ));
    }

    // 12. Distribuição de status medida — Held é flag interna de wire, não status.
    let active = KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.status == WireStatus::Active)
        .count();
    let wire = KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.status == WireStatus::Wire)
        .count();
    let held = KERNEL_WIRE_REGISTRY
        .iter()
        .filter(|e| e.status == WireStatus::Held)
        .count();
    a.note(format!(
        "status distribution: Active={active} Wire={wire} Held={held}"
    ));
    if held != 0 {
        a.fail(format!(
            "Held status count = {held} (expected 0 — HELD readiness flags are wire-internal)"
        ));
    }

    // ---- Output ----
    println!("=== S-11 wire-check (registry ↔ disk) ===");
    for n in &a.notes {
        println!("  · {n}");
    }
    if a.ok() {
        println!(
            "\nRESULT: OK — registry matches disk reality ({} entries, {} reachable, {} compiled-but-unreachable debt).",
            KERNEL_WIRE_REGISTRY.len(),
            reachable,
            orphan
        );
        0
    } else {
        println!(
            "\nRESULT: FAIL — {} derivation(s) found (fail-closed):",
            a.failures.len()
        );
        for f in &a.failures {
            println!("  ✗ {f}");
        }
        1
    }
}

fn print_help() {
    println!(
        "Aethel Kernel xtask\n\nsubcommands:\n  wire-check   audit S-11 registry against disk (fail-closed)\n  help         show this help\n"
    );
}

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let cmd = args.first().map(String::as_str).unwrap_or("help");
    let code = match cmd {
        "wire-check" => run_wire_check(),
        "help" | "--help" | "-h" => {
            print_help();
            0
        }
        other => {
            eprintln!("unknown subcommand: {other}");
            print_help();
            2
        }
    };
    std::process::exit(code);
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn registry_total_matches_measured_constant() {
        assert_eq!(KERNEL_WIRE_REGISTRY.len(), WIRES_ON_DISK);
        assert_eq!(kernel_registry::registry_total(), WIRES_ON_DISK);
    }

    #[test]
    fn reachable_matches_active_and_constant() {
        assert_eq!(kernel_registry::reachable_wires(), REACHABLE_WIRE_COUNT);
        assert_eq!(ACTIVE_WIRE_MODULES.len(), REACHABLE_WIRE_COUNT);
    }

    #[test]
    fn active_set_matches_active_wire_modules() {
        let from_registry: BTreeSet<&str> = KERNEL_WIRE_REGISTRY
            .iter()
            .filter(|e| e.status == WireStatus::Active)
            .map(|e| e.wire_module)
            .collect();
        let from_const: BTreeSet<&str> = ACTIVE_WIRE_MODULES.iter().copied().collect();
        assert_eq!(from_registry, from_const);
    }

    #[test]
    fn active_wires_all_have_letters_and_real_registration() {
        for e in KERNEL_WIRE_REGISTRY
            .iter()
            .filter(|e| e.status == WireStatus::Active)
        {
            assert!(
                !e.letter.is_empty(),
                "ACTIVE wire {} missing letter",
                e.wire_module
            );
            assert!(
                !e.reachable_from.starts_with("unreachable"),
                "ACTIVE wire {} claims unreachable registration: {}",
                e.wire_module,
                e.reachable_from
            );
        }
    }

    #[test]
    fn missing_letters_exactly_three_and_all_wire() {
        let missing = kernel_registry::wires_missing_letter();
        assert_eq!(missing.len(), 3, "measured S-11 completeness debt is exactly 3");
        for e in &missing {
            assert_eq!(
                e.status,
                WireStatus::Wire,
                "wire {} must not be Active without a letter",
                e.wire_module
            );
        }
    }

    #[test]
    fn no_duplicate_non_empty_letters() {
        let mut seen = BTreeSet::new();
        for e in KERNEL_WIRE_REGISTRY
            .iter()
            .filter(|e| !e.letter.is_empty())
        {
            assert!(seen.insert(e.letter), "duplicate letter {}", e.letter);
        }
    }

    #[test]
    fn registry_is_sorted_by_wire_module() {
        for w in KERNEL_WIRE_REGISTRY.windows(2) {
            assert!(
                w[0].wire_module <= w[1].wire_module,
                "{} appears after {}",
                w[1].wire_module,
                w[0].wire_module
            );
        }
    }

    #[test]
    fn entries_have_non_empty_wire_and_kernel_modules() {
        for e in KERNEL_WIRE_REGISTRY {
            assert!(!e.wire_module.is_empty());
            assert!(!e.kernel_module.is_empty());
        }
    }
}
