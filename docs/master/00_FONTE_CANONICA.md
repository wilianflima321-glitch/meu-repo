# 00_FONTE_CANONICA
Data: 2026-02-27
Status: CANONICAL

## Purpose
This file defines the canonical source of truth for Aethel.
The canonical directory is `docs/master/`.
Any Markdown outside `docs/master/` is historical unless explicitly referenced by a canonical document.

## Mandatory First Read
1. `docs/master/00_INDEX.md`
2. `docs/master/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
3. `docs/master/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
4. `docs/master/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`

## Canonical Documents (Execution Scope)
- `FULL_AUDIT.md`
- `DUPLICATIONS_AND_CONFLICTS.md`
- `LIMITATIONS.md`
- `COMPETITIVE_GAP.md`
- `WORKBENCH_SPEC.md`
- `AI_SYSTEM_SPEC.md`
- `EXECUTION_PLAN.md`
- `8_ADMIN_SYSTEM_SPEC.md`
- `9_BACKEND_SYSTEM_SPEC.md`
- `00_REALITY_MATRIX_2026-02-04.md`
- `10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
- `11_WEB_USER_OWNER_TRIAGE_2026-02-11.md`
- `12_INTERFACE_SYSTEMS_REFACTOR_CONTRACT_2026-02-11.md`
- `13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
- `14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`
- `15_AI_LIMITATIONS_SUBSYSTEMS_EXECUTION_2026-02-16.md`
- `16_AI_GAMES_FILMS_APPS_SUBSYSTEM_BLUEPRINT_2026-02-16.md`
- `17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md`
- `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md`
- `19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md`
- `20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md`
- `22_REPO_CONNECTIVITY_MATRIX_2026-02-27.md`
- `23_CRITICAL_LIMITATIONS_AND_MARKET_SUPERIORITY_PLAN_2026-02-28.md`
- `24_GAMES_FILMS_APPS_GAP_ALIGNMENT_MATRIX_2026-02-28.md`
- `25_MARKET_LIMITATIONS_PARITY_PLAYBOOK_2026-02-28.md`

## Historical note
- `Relatorio_de_Continuacao_Auditoria_Multi-Agente.md` is historical and contains legacy path references (`audit dicas do emergent usar/*`); do not use it for current execution decisions.

## Master Contract Policy
- `10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md` is the single execution master.
- `11` and `12` remain historical compatibility records and are superseded by `10`.
- New execution deltas must be appended to `10` and reflected in `13/14/17/18/20` when applicable.

## Non-Negotiable Rules
- No mock, placeholder, or fake success in critical user journeys.
- Unavailable capability must remain explicit (`NOT_IMPLEMENTED`, `DEPRECATED_ROUTE`, etc.).
- Conflicts between docs are resolved by `00_INDEX` + `10` + latest dated delta.
- External benchmark claims only enter canonical docs as `EXTERNAL_BENCHMARK_ASSUMPTION` until verified in-repo.

## Execution Baseline
- Entry UX: `dashboard`/home journey; `/ide` remains advanced workbench.
- Product scope is fixed (no new parallel product shell).
- AI capability claims above L3 are blocked without operational evidence.

