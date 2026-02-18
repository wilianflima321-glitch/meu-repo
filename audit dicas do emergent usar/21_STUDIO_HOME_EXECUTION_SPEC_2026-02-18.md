# 21_STUDIO_HOME_EXECUTION_SPEC_2026-02-18
Status: EXECUTION SPEC
Date: 2026-02-18
Owner: Product + Frontend Platform + Backend + Critical Agent

## 0) Purpose
Define the execution spec for Studio Home as the authenticated entrypoint (`/dashboard`) with chat/preview-first workflow, while preserving `/ide` as advanced mode.

## 1) Non-negotiable constraints
1. `/ide` remains the single advanced shell.
2. No fake success for unavailable capability.
3. Legacy deprecation contracts (`/api/workspace/*`, `/api/auth/sessions*`) remain explicit.
4. No L4/L5 claims without operational evidence.

## 2) UX contract
1. Studio Home blocks:
- Mission
- Team Chat Live
- Plan Board
- Interactive Preview
- Ops Bar (cost, limits, stop, full-access)
2. Primary path:
- mission -> super plan -> run -> validate -> apply -> rollback
3. One-click handoff:
- `Open IDE` sends `projectId` and keeps context.
4. Gating behavior:
- partial features are visible but never exposed as fake CTA.

## 3) Agent orchestration contract
1. Fixed roles:
- planner
- coder
- reviewer
2. Apply is serial and blocked until validation verdict = `passed`.
3. Session messages include role/status trail.

## 4) Economic contract (entitlement split)
1. Plan entitlement (time-based): feature access until cycle end.
2. Usage entitlement (credit-based): variable IA/compute usage.
3. Zero credit in paid plan:
- block variable-cost operations
- keep paid feature access until period end.
4. Free/trial:
- strict daily cap
- no rollover
- hard stop.

## 5) API contract introduced in this wave
1. `POST /api/studio/session/start`
2. `GET /api/studio/session/{id}`
3. `POST /api/studio/session/{id}/stop`
4. `POST /api/studio/tasks/plan`
5. `POST /api/studio/tasks/{id}/run`
6. `POST /api/studio/tasks/{id}/validate`
7. `POST /api/studio/tasks/{id}/apply`
8. `POST /api/studio/tasks/{id}/rollback`
9. `GET /api/studio/cost/live?sessionId=...`
10. `POST /api/studio/access/full`
11. `DELETE /api/studio/access/full/{id}?sessionId=...`
12. Contract detail for edge states:
- `tasks/plan` blocks duplicate plan by default (`409 PLAN_ALREADY_EXISTS`) unless `force=true`
- `tasks/run|validate|apply|rollback|access/full` return explicit inactive-session gate (`409 SESSION_NOT_ACTIVE`)
- `tasks/run` returns explicit blocked gate (`422 TASK_RUN_BLOCKED`) for orchestration failures
- `tasks/run` returns explicit not-runnable gate (`422 TASK_RUN_NOT_ALLOWED`) for invalid state transitions
- `tasks/validate` is reviewer-only and ready-state only (`REVIEW_GATE_REQUIRED`, `VALIDATION_NOT_READY`)
- `tasks/apply` blocks replay (`409 APPLY_ALREADY_COMPLETED`) until rollback
- `tasks/rollback` returns explicit token mismatch gate (`409 ROLLBACK_TOKEN_MISMATCH`)

## 6) Runtime/data persistence strategy (phase-safe)
1. Uses existing `copilotWorkflow.context` as storage container for studio session state.
2. No schema migration in this wave.
3. Marked as `IMPLEMENTED/PARTIAL` for multi-instance durability until dedicated tables are introduced.
4. Studio task run is orchestration-only (`capabilityStatus=PARTIAL`), with deterministic reviewer gate before apply.
5. Rollback is strictly token-gated and requires prior apply token (`applyToken`) to avoid false-positive rollback semantics.

## 7) Validation and gates
Mandatory before completion:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run qa:interface-gate`
5. `npm run qa:canonical-components`
6. `npm run qa:route-contracts`
7. `npm run qa:no-fake-success`
8. `npm run qa:mojibake`
9. `npm run qa:enterprise-gate`

## 8) Residual risk
1. Session state persistence currently reuses workflow JSON and is not yet isolated in dedicated tables.
2. Full access is timeboxed and auditable but does not yet enforce domain-specific policy packs per tool class.
3. Cost model is operationally explicit but final pricing freeze still depends on shadow billing.

## 9) Latest factual snapshot (2026-02-18)
1. `lint` PASS (`0 warnings`).
2. `typecheck` PASS.
3. `build` PASS.
4. `qa:route-contracts` PASS (`checks=32`).
5. `qa:no-fake-success` PASS.
6. `qa:interface-gate` PASS with critical metrics at zero and `not-implemented-ui=6`.
7. Residual non-blocking local warnings during build:
- missing Upstash env in local mode
- Docker unavailable fallback.
8. Studio Home preview mode is lite-first with explicit runtime-preview opt-in.
9. Build split confirms lightweight default entry:
- `/dashboard` now loads as lightweight shell
- legacy-heavy surface moved to `/dashboard/legacy`.
10. Active Studio session can be resumed on reload; stopped sessions are not auto-resumed.
11. Task run enforces server-side budget cap before orchestration execution.
12. Super Plan creation is single-shot per active session by default; regeneration requires explicit `force`.
13. Studio task/plan gates are normalized through shared capability-response helper for consistent telemetry headers.
14. Route-contract scan covers rollback gate and gate-state replay markers.
