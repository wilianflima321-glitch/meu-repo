# 24_GAMES_FILMS_APPS_GAP_ALIGNMENT_MATRIX_2026-02-28
Status: EXECUTION MATRIX
Date: 2026-02-28
Owner: Multi-agent Chief Review

## 1) Objective
Convert high-level critique into an execution matrix of real gaps for games/films/apps, with explicit priorities, owners, and evidence rules.

Scope lock:
1. same product scope (`/dashboard` entry, `/ide` advanced shell)
2. no fake-success
3. no desktop parity claim without evidence
4. no L4/L5 promotion without operational proof

## 2) Current factual baseline
1. Structural gate: `npm run qa:repo-connectivity` -> PASS.
2. Interface critical sweep:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
3. Dashboard hotspot still large:
- `cloud-web-app/web/components/AethelDashboard.tsx` -> `2850` lines.
4. Canonical drift pressure still exists:
- legacy path references (`audit dicas do emergent usar/*`) still present inside `docs/master`.

## 3) Gap matrix (cross-domain)
| Layer | Games | Films | Apps | Current status | Critical gap |
|---|---|---|---|---|---|
| Orchestration | task decomposition + gameplay checks | shot/task decomposition + continuity checks | multi-file task decomposition + impact checks | PARTIAL | no fully enforced deterministic apply pipeline across all high-impact flows |
| Memory/context | lore + mechanics memory | identity + timeline memory | architecture + dependency memory | PARTIAL | memory/provenance quality depends on ad-hoc flows |
| Validation | gameplay/balance/perf validators | continuity/identity/shot validators | dependency/integration/regression validators | PARTIAL | domain validators are not yet complete/mandatory in all flows |
| Runtime | scene/asset preview + execution | media preview + review runtime | editor/preview/run loop | IMPLEMENTED/PARTIAL | unsupported capabilities still gated and must remain explicit |
| Economics | compute + token budgets | media + token budgets | token + build/runtime budgets | PARTIAL | need tighter per-session/per-agent budget enforcement and reporting |
| Observability | quality and failure telemetry | continuity and failure telemetry | regression and failure telemetry | PARTIAL | no single domain scorecard with promotion thresholds |
| Governance | claim gates | claim gates | claim gates | IMPLEMENTED/PARTIAL | stale historical references still increase interpretation risk |

## 4) Domain-specific lacunas (priority)
## 4.1 Games
1. Missing deterministic gameplay QA loop (objective progression, soft-lock, pacing checks).
2. Missing mandatory asset validation chain (topology, rig, perf budget).
3. Missing stable benchmark loop for runtime quality under long sessions.

## 4.2 Films
1. Missing continuity engine (character identity, prop continuity, scene consistency).
2. Missing shot-control contract (camera motion, temporal coherence checks).
3. Missing mandatory post-process quality gate before "done" status.

## 4.3 Apps
1. Missing mandatory dependency-impact guard for every high-risk multi-file apply.
2. Missing unified acceptance matrix per change type (lint/type/build/smoke/eval).
3. Missing enforced rollback decision policy tied to verification verdict.

## 5) MD alignment gaps that must be closed
1. Canonical docs still contain stale historical statements (old baselines mixed with current deltas).
2. Legacy path references inside active docs still require staged cleanup.
3. Historical docs remain useful for archive, but must not influence active execution decisions.

## 6) Execution blocks (next)
### P0-G Canonical drift cleanup
1. remove stale legacy path references from active docs
2. keep historical context only in explicit historical sections
3. ensure `00_INDEX` and `10` remain the single execution spine

### P0-H Domain readiness scorecards
1. create scorecards for games/films/apps with `IMPLEMENTED|PARTIAL|NOT_IMPLEMENTED`
2. define promotion thresholds and prohibited claims
3. tie each threshold to required evidence artifacts

### P0-I Dashboard split continuation
1. continue extraction from `AethelDashboard` until stable module boundaries
2. keep behavior unchanged while reducing regression risk
3. avoid adding new surface complexity before split is complete

## 7) Evidence policy (mandatory)
1. no status promotion without command output or reproducible artifact
2. no claim beyond L3 without operational proof
3. no UI "success" state for unavailable capabilities
