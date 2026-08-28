# Retired Governance Scripts

**Aposentados em 2026-08-16 (round 1.4cc / R13 — Code, no UI; no % bump; execução R0→R14).**

Estes scripts de governança legados foram **removidos da raiz do repositório** e arquivados aqui
para auditoria histórica (Zero Amnesia). A varredura do R13 confirmou **0 referências funcionais**
(package.json, `.github/workflows`, `.aethelrules`, `.cursorrules`, docs/architecture canônicos) —
todos são one-shot de governança já absorvidos por ferramentas compiladas ou manuais.

## Substituições ativas (NUNCA restaurar na raiz — usar estes)

| Função | Substituto canônico |
|--------|---------------------|
| Auditar profundidade dos wires S-11 (Deep/Medium/Shallow + STUB-RISK + missing/phantom) | `cargo xtask audit-depth` ([`xtask/src/main.rs`](../xtask/src/main.rs) `run_audit_depth`) |
| Auditar registro S-11 × disco × surface (fail-closed, exit != 0 on drift) | `cargo xtask wire-check` |
| Auditar surface IPC S-12 (fail-closed, ACL, hot-paths) | `cargo xtask ipc-check` |
| QA web/TS (design-system, cores, botões, canonical docs) | `npm run qa:*` → `tools/check-*.mjs` |
| Correção de erros de compilação | Gates Law XI: `cargo check` + `cargo clippy -- -D warnings` + `cargo test` |

## Inventário arquivado

| Script | Função histórica | Motivo da aposentadoria |
|--------|------------------|-------------------------|
| `_audit_wire_depth.js` | Auditoria regex de profundidade dos wires (Deep/Medium/Shallow) | Replicado em Rust por `cargo xtask audit-depth` (desde R1, row 1.4bp) |
| `_extract_wires.js` | Extração de wires do disco | One-shot; registry S-11 + `cargo xtask wire-check` cobrem |
| `analyze_plans.js` | Análise/parse de planos | One-shot; planejamento fechado (Planning 100%, execução = Master Map) |
| `append_gy.js` | Append de letter `gy` | One-shot de letter-hygiene; registry S-11 detém as letters |
| `append_md.js` | Append de trecho MD | One-shot; doc sync manual via rounds |
| `fix_errors.js` | Correção automática de erros | One-shot; gates Law XI substituem |
| `fix_structs.js` … `fix_structs5.js` | Fixes one-shot de structs | One-shot; substratos corrigidos/verificados nas rodadas R0–R12 |
| `fix_vol.js` | Fix de volume | One-shot |
| `purge_honesty.js` … `purge_honesty6.js` | Purga de flags booleanas de honesty | One-shot (Phase 1 "Kernel Honesty Debt Purged CLOSED") |
| `revert_honesty.js` | Reverter purga de honesty | One-shot de contingência |
| `update_master_map.js` | Update do Master Map | One-shot; doc sync manual via rounds |
| `update_progress.js` | Update do Focus Progress | One-shot |
| `update_wire.py` | Update de wire | One-shot |
| `update_entropy.py` | Update de entropia | One-shot |
| `script.js` / `script.py` | Experimento one-shot de `#[repr(align(64))]` no `lattice_boltzmann_fluid_solver.rs` | Já aplicado/verificado |
| `test_align.rs` / `test_align.exe` | Teste one-shot de `CacheLine` alinhado | Já aplicado/verificado |
| `.tmp_run_zst.ps1` | Scan temporário zst/thin | Temporário de diagnóstico |
| `=` | Dump acidental de saída de erro do QA gate (589 KB) | Lixo de shell |
| `5)break` | Arquivo vazio acidental | Lixo de shell |

## Regra

NÃO restaurar scripts de governança na raiz. Toda governança de kernel/registry/IPC roda via
`cargo xtask` (Rust, fail-closed) ou `tools/*.mjs` (QA web). Qualquer nova necessidade de
governança deve ser implementada como comando `xtask` ou tool `tools/*.mjs`, nunca como script
solto na raiz.
