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
6. `POST /api/studio/tasks/run-wave`
7. `POST /api/studio/tasks/{id}/validate`
8. `POST /api/studio/tasks/{id}/apply`
9. `POST /api/studio/tasks/{id}/rollback`
10. `GET /api/studio/cost/live?sessionId=...`
11. `POST /api/studio/access/full`
12. `DELETE /api/studio/access/full/{id}?sessionId=...`
13. Contract detail for edge states:
- `tasks/plan` blocks duplicate plan by default (`409 PLAN_ALREADY_EXISTS`) unless `force=true`
- `tasks/run|run-wave|validate|apply|rollback|access/full` return explicit inactive-session gate (`409 SESSION_NOT_ACTIVE`)
- `tasks/run` returns explicit blocked gate (`422 TASK_RUN_BLOCKED`) for orchestration failures
- `tasks/run` returns explicit not-runnable gate (`422 TASK_RUN_NOT_ALLOWED`) for invalid state transitions
- `tasks/run-wave` returns explicit missing-plan gate (`422 RUN_WAVE_REQUIRES_PLAN`) before orchestration execution
- `tasks/run-wave` returns explicit completion gate (`409 RUN_WAVE_ALREADY_COMPLETE`) when no runnable steps remain
- `tasks/validate` is reviewer-only and ready-state only (`REVIEW_GATE_REQUIRED`, `VALIDATION_NOT_READY`)
- `tasks/apply` blocks replay (`409 APPLY_ALREADY_COMPLETED`) until rollback
- `tasks/rollback` returns explicit token mismatch gate (`409 ROLLBACK_TOKEN_MISMATCH`)

## 6) Runtime/data persistence strategy (phase-safe)
1. Uses existing `copilotWorkflow.context` as storage container for studio session state.
2. No schema migration in this wave.
3. Marked as `IMPLEMENTED/PARTIAL` for multi-instance durability until dedicated tables are introduced.
4. Studio task run is role-sequenced single-task orchestration (`executionMode=role-sequenced-single-task`, `capabilityStatus=PARTIAL`) with deterministic reviewer gate before apply.
5. Rollback is strictly token-gated and requires prior apply token (`applyToken`) to avoid false-positive rollback semantics.

## 7) Validation and gates
Mandatory before completion:
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run qa:interface-gate`
5. `npm run qa:canonical-components`
6. `npm run qa:route-contracts`
7. `npm run qa:architecture-gate`
8. `npm run qa:no-fake-success`
9. `npm run qa:mojibake`
10. `npm run qa:enterprise-gate`

## 8) Residual risk
1. Session state persistence currently reuses workflow JSON and is not yet isolated in dedicated tables.
2. Full access is timeboxed and auditable but does not yet enforce domain-specific policy packs per tool class.
3. Cost model is operationally explicit but final pricing freeze still depends on shadow billing.
4. Full Access grant policy is plan-scoped and TTL-tiered (15-45 minutes) but still does not enforce tool-class policy packs.

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
15. Studio run-wave endpoint is active with explicit gate contracts and scanner enforcement (`qa:route-contracts`, `qa:critical-rate-limit`).
16. Studio session payload now includes mission domain/checklist metadata and orchestration mode/last-wave visibility for quality governance.
17. IDE chat panel now surfaces trace summaries from advanced chat responses for decision/cost transparency.
18. Full Access grant route now enforces plan-scoped allowed scopes and TTL policy (`starter/trial=project@15m`, `basic<=workspace@20m`, `pro/studio=all@30m`, `enterprise=all@45m`).
19. Studio Home now mirrors Full Access policy in UI via scope selector, plan-aware disabled options, and scope+TTL feedback from API metadata.
20. Interface baseline recovered to zero on high-severity tracks after Studio Home accent drift correction.
21. Interface scan now tracks auxiliary AI `NOT_IMPLEMENTED` surfaces separately (`not-implemented-noncritical=2`) while preserving critical UI ceiling (`not-implemented-ui=6`).
22. Visual regression PR workflow now fails when baseline/report are missing (no compare skip path in normal flow).
23. UI audit and visual compare workflows now require real web-app readiness (no static fallback path).
24. Architecture drift gate is active (`qa:architecture-gate`) and currently passing on baseline thresholds.
25. Enterprise gate now includes architecture drift checks as mandatory pre-release contract.
26. Duplicate component drift was reduced to zero (`duplicate basenames 10 -> 0`) after removal of residual unused legacy duplicates.
27. Architecture gate duplicate threshold was tightened to `duplicateBasenames <= 0` to prevent reintroduction.
28. Architecture gate oversized-module threshold was tightened to `oversizedFiles <= 34` to freeze current monolith debt ceiling.
29. Canonical component scan now blocks imports to removed duplicate paths (`engine/debug/dashboard/admin/vcs`) and enforces canonical replacements.
30. Export subsystem preset catalog was split from `ExportSystem.tsx`, reducing architecture oversized debt baseline.
31. Facial animation static data tables were split from `FacialAnimationEditor.tsx`, reducing oversized debt baseline.
32. Extension host shared interfaces were split from `extension-host-runtime.ts` into `extension-host-types.ts`, reducing oversized debt baseline.
33. Sequencer easing curves were split from `sequencer-cinematics.ts` into `sequencer-easings.ts`, reducing oversized debt baseline.
34. Workspace store contract types were split into `workspace-store-types.ts` and cloth editor presets/controls were split into `cloth-editor-controls.tsx`, reducing oversized debt baseline.
35. Boss/coward behavior preset builders were split into `behavior-tree-boss-preset.ts`, reducing oversized debt baseline.
36. Cutscene type contracts were split into `cutscene-types.ts`, reducing oversized debt baseline.
37. Capture photo filter presets were split into `capture-presets.ts`, reducing oversized debt baseline.
38. Skeletal animation contracts were split into `skeletal-animation-types.ts`, reducing oversized debt baseline.
39. Animation blueprint editor contracts were split into `animation-blueprint-types.ts`, reducing oversized debt baseline and tightening limit to `oversizedFiles <= 44`.
40. Sound cue graph contracts and node-definition catalog were split into `sound-cue-definitions.ts`, reducing oversized debt baseline and tightening limit to `oversizedFiles <= 43`.
41. Dialogue/cutscene shared contracts were split into `dialogue-cutscene-types.ts`, reducing oversized debt baseline and tightening limit to `oversizedFiles <= 42`.
42. Audio synthesis shared contracts/preset catalog were split into `audio-synthesis-types.ts` and `audio-synthesis-presets.ts`, reducing oversized debt baseline and tightening limit to `oversizedFiles <= 41`.
43. Integrated profiler shared contracts were split into `profiler-integrated-types.ts`, reducing oversized debt baseline and tightening limit to `oversizedFiles <= 40`.
44. Save manager/settings runtime/advanced particle shared contracts and settings-page static config were split into dedicated modules (`save-manager-types.ts`, `settings-types.ts`, `advanced-particle-types.ts`, `settings-page-config.ts`), reducing oversized debt baseline and tightening limit to `oversizedFiles <= 36`.
45. Replay/Niagara shared contracts and default graph/config surfaces were split into dedicated modules (`replay-types.ts`, `replay-input-serializer.ts`, `niagara-vfx-types.ts`, `niagara-vfx-defaults.ts`), reducing oversized debt baseline and tightening limit to `oversizedFiles <= 34`.
46. Studio session start now accepts an optional `missionDomain` override (`games|films|apps|general`) to lock checklist/governance when auto-inference is not desired.
47. Studio Home now surfaces recent per-agent execution telemetry (model, latency, token counts, cost) and a budget-pressure progress bar to keep cost decisions visible during session runtime.
48. Settings information architecture is now explicit: `/settings` for global preferences and `/project-settings` for project-scoped runtime controls, both linked from Studio Home and IDE surfaces.
49. Studio session start and advanced chat now expose plan-quality normalization metadata (`requestedQualityMode`, `appliedQualityMode`, `qualityModeDowngraded`, `allowedQualityModes`) and IDE chat surfaces downgrade notices when quality mode is adjusted by plan policy.
50. Studio cost/session APIs now expose server-calculated `budgetAlert` metadata for explicit threshold states (`50/80/100`) and operator guidance.
51. Studio task execution APIs (`tasks/[id]/run`, `tasks/run-wave`) now enforce explicit `402 VARIABLE_USAGE_BLOCKED` capability gate when variable usage is exhausted, matching paid-plan dual entitlement policy.
52. Studio persistence/orchestration module was structurally split with helper extraction (`studio-home-runtime-helpers.ts`) to reduce monolith risk while preserving runtime contracts.
53. Studio task orchestration endpoints now explicitly expose checkpoint-reality metadata and remain `PARTIAL` where autonomous code-apply is not present (`plan/run/run-wave/validate/apply/rollback`).
54. Long-session persistence bounds are now enforced in runtime store (`tasks<=60`, `agentRuns<=300`, `messages<=500`) to keep session payload growth controlled.
55. `tasks/run-wave` now supports execution strategy input (`balanced|cost_guarded|quality_first`) and returns `requestedStrategy`, `maxStepsApplied` + `strategyReason` for cost/transparency telemetry.
56. Reviewer validation now uses deterministic session checks (not marker-only), and failed checks are written to the session feed for operator diagnostics before apply.
57. Reviewer validation is now domain-aware (`[domain:<missionDomain>]`) and surfaces task-level `validationReport` summary for UI actionability.
58. Validate API now exposes deterministic-check summary metadata (`totalChecks`, `failedIds`) on both pass/fail paths for operator observability.
