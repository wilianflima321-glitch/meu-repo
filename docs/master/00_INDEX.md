# 00_INDEX
Date: 2026-02-28
Status: CANONICAL ENTRYPOINT

## Read Order (Required)
1. `docs/master/00_INDEX.md`
2. `docs/master/00_FONTE_CANONICA.md`
3. `docs/master/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
4. `docs/master/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
5. `docs/master/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`
6. `docs/master/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md`
7. `docs/master/18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md`
8. `docs/master/20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md`
9. `docs/master/22_REPO_CONNECTIVITY_MATRIX_2026-02-27.md`
10. `docs/master/23_CRITICAL_LIMITATIONS_AND_MARKET_SUPERIORITY_PLAN_2026-02-28.md`
11. `docs/master/24_GAMES_FILMS_APPS_GAP_ALIGNMENT_MATRIX_2026-02-28.md`
12. `docs/master/25_MARKET_LIMITATIONS_PARITY_PLAYBOOK_2026-02-28.md`

## Canonical Numbered Set
| Doc | Role | Status |
|---|---|---|
| `00_FONTE_CANONICA.md` | Canonical policy | ACTIVE |
| `00_REALITY_MATRIX_2026-02-04.md` | Validation snapshot (historical) | HISTORICAL |
| `10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md` | Master execution contract | ACTIVE |
| `11_WEB_USER_OWNER_TRIAGE_2026-02-11.md` | Archived into `10` | HISTORICAL |
| `12_INTERFACE_SYSTEMS_REFACTOR_CONTRACT_2026-02-11.md` | Archived into `10` | HISTORICAL |
| `13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md` | Limits/quality guardrails | ACTIVE |
| `14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md` | Cross-domain triage | ACTIVE |
| `15_AI_LIMITATIONS_SUBSYSTEMS_EXECUTION_2026-02-16.md` | AI limitations and mitigations | ACTIVE |
| `16_AI_GAMES_FILMS_APPS_SUBSYSTEM_BLUEPRINT_2026-02-16.md` | Blueprint for games/films/apps | ACTIVE |
| `17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md` | Endpoint capability truth map | ACTIVE |
| `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md` | UI surface map | ACTIVE |
| `19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md` | Runtime warning runbook | ACTIVE |
| `20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md` | Prioritized backlog | ACTIVE |
| `22_REPO_CONNECTIVITY_MATRIX_2026-02-27.md` | Structural connectivity audit | ACTIVE |
| `23_CRITICAL_LIMITATIONS_AND_MARKET_SUPERIORITY_PLAN_2026-02-28.md` | Consolidated limitations + superiority plan | ACTIVE |
| `24_GAMES_FILMS_APPS_GAP_ALIGNMENT_MATRIX_2026-02-28.md` | Cross-domain gap alignment matrix | ACTIVE |
| `25_MARKET_LIMITATIONS_PARITY_PLAYBOOK_2026-02-28.md` | Market parity/superiority comparison playbook | ACTIVE |

## Core Specs
| Doc | Scope | Status |
|---|---|---|
| `FULL_AUDIT.md` | Base audit | HISTORICAL BASELINE |
| `DUPLICATIONS_AND_CONFLICTS.md` | Duplication map | NEEDS REFRESH |
| `LIMITATIONS.md` | Non-negotiable technical limits | ACTIVE |
| `COMPETITIVE_GAP.md` | Competitive decomposition | MIXED FACTS+ASSUMPTIONS |
| `WORKBENCH_SPEC.md` | Workbench contract | ACTIVE |
| `AI_SYSTEM_SPEC.md` | AI system contract | ACTIVE |
| `EXECUTION_PLAN.md` | Execution reference | PARTIALLY SUPERSEDED BY `10` |
| `8_ADMIN_SYSTEM_SPEC.md` | Admin scope | ACTIVE |
| `9_BACKEND_SYSTEM_SPEC.md` | Backend scope | ACTIVE |

## Current Factual Snapshot (2026-02-28)
- Interface critical sweep (`cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`):
  - `legacy-accent-tokens=0`
  - `admin-light-theme-tokens=0`
  - `admin-status-light-tokens=0`
  - `blocking-browser-dialogs=0`
  - `not-implemented-ui=6`
- Structural baseline closed for connectivity P0:
  - `npm run qa:repo-connectivity` passes.
  - Broken root path references and tracked `.venv` artifacts were removed.
- Structural debt still open:
  - very large monolithic files (notably `components/AethelDashboard.tsx`),
  - high markdown volume outside `docs/master`,
  - orphan-candidate top-level folders not in runtime-critical flow.

## External Benchmark Absorption Rule
- External claims are directional only.
- If not reproducible in this repo, tag as `EXTERNAL_BENCHMARK_ASSUMPTION`.
- Product/roadmap decisions must be based on canonical evidence in `docs/master/`.

## Execution Rule for Future AI Agents
- Always start from this file.
- Do not use `docs/archive/` as source of truth.
- Do not claim completion without file-level evidence.
