# 00_INDEX
Data: 2026-02-27
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

## Canonical Numbered Set
| Doc | Role | Status |
|---|---|---|
| `00_FONTE_CANONICA.md` | Canonical policy | ✅ |
| `00_REALITY_MATRIX_2026-02-04.md` | Validation snapshot (historical) | 🟡 |
| `10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md` | Master execution contract | ✅ |
| `11_WEB_USER_OWNER_TRIAGE_2026-02-11.md` | Archived into `10` | 🟡 |
| `12_INTERFACE_SYSTEMS_REFACTOR_CONTRACT_2026-02-11.md` | Archived into `10` | 🟡 |
| `13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md` | Limits/quality guardrails | ✅ |
| `14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md` | Cross-domain triage | ✅ |
| `15_AI_LIMITATIONS_SUBSYSTEMS_EXECUTION_2026-02-16.md` | AI limitations and mitigations | ✅ |
| `16_AI_GAMES_FILMS_APPS_SUBSYSTEM_BLUEPRINT_2026-02-16.md` | Blueprint for games/films/apps | ✅ |
| `17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md` | Endpoint capability truth map | ✅ |
| `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md` | UI surface map | ✅ |
| `19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md` | Runtime warning runbook | ✅ |
| `20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17.md` | Prioritized backlog | ✅ |
| `22_REPO_CONNECTIVITY_MATRIX_2026-02-27.md` | Structural connectivity audit | ✅ |

## Core Specs
| Doc | Scope | Status |
|---|---|---|
| `FULL_AUDIT.md` | Base audit | 🟡 historical baseline |
| `DUPLICATIONS_AND_CONFLICTS.md` | Duplication map | 🟡 needs refresh |
| `LIMITATIONS.md` | Non-negotiable technical limits | ✅ |
| `COMPETITIVE_GAP.md` | Competitive decomposition | 🟡 assumptions + facts mixed |
| `WORKBENCH_SPEC.md` | Workbench contract | ✅ |
| `AI_SYSTEM_SPEC.md` | AI system contract | ✅ |
| `EXECUTION_PLAN.md` | Execution reference | 🟡 partially superseded by `10` |
| `8_ADMIN_SYSTEM_SPEC.md` | Admin scope | ✅ |
| `9_BACKEND_SYSTEM_SPEC.md` | Backend scope | ✅ |

## Current Factual Snapshot (2026-02-27)
- Interface critical zeros preserved in `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`:
  - `legacy-accent-tokens=0`
  - `admin-light-theme-tokens=0`
  - `admin-status-light-tokens=0`
  - `blocking-browser-dialogs=0`
- Explicit gated capabilities remain (`NOT_IMPLEMENTED`) by contract (`not-implemented-ui=6` in latest sweep).
- Structural baseline closed for connectivity P0:
  - repo connectivity scanner passes (`npm run qa:repo-connectivity`),
  - root script/config broken-path debt was removed,
  - tracked `.venv` artifacts were removed from versioned source.
- Structural debt still open:
  - very large monolithic files (notably `components/AethelDashboard.tsx`),
  - high markdown volume outside `docs/master` (historical/archival maintenance load),
  - orphan-candidate top-level folders that are not runtime-critical.

## External Benchmark Absorption Rule
- External claims are directional only.
- If not reproducible in this repo, tag as `EXTERNAL_BENCHMARK_ASSUMPTION`.
- Product/roadmap decisions are based on canonical evidence in `docs/master/`.

## Execution Rule for Future AI Agents
- Always start from this file.
- Do not use `docs/archive/` as source-of-truth.
- Do not claim completion without file-level evidence.
