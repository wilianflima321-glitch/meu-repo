# 17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16
Status: EXECUTION MATRIX  
Date: 2026-02-16  
Scope: capability truth map for P0 reliability

## 1) Objective
Provide a single factual map of capability status for high-impact APIs and runtime surfaces used by `/ide`.

## 2) Capability matrix (current implementation)
| Surface | Endpoint/File | Status | Contract |
|---|---|---|---|
| AI chat | `app/api/ai/chat/route.ts` | `NOT_IMPLEMENTED` when provider missing; `IMPLEMENTED/PARTIAL` on provider mismatch | explicit `501 NOT_IMPLEMENTED` + capability metadata when no provider; explicit `503 PROVIDER_NOT_CONFIGURED` (`capability=AI_CHAT`) and `400 INVALID_PROVIDER` for unsupported provider input |
| AI chat advanced | `app/api/ai/chat-advanced/route.ts` | `IMPLEMENTED` with explicit provider gates + quality controls | `501 NOT_IMPLEMENTED` on missing provider/model-provider mismatch; supports `qualityMode` + optional benchmark context |
| AI chat panel orchestration | `components/ide/AIChatPanelContainer.tsx` | `IMPLEMENTED/PARTIAL` | routes through `/api/ai/chat-advanced`; auto-selects `qualityMode`/`agentCount`; falls back to single-agent when plan gate blocks multi-agent; renders trace summary telemetry for explainability |
| AI complete | `app/api/ai/complete/route.ts` | `NOT_IMPLEMENTED` when provider missing; `IMPLEMENTED/PARTIAL` on provider mismatch | response canonical `suggestion` + alias `text`; explicit `503 PROVIDER_NOT_CONFIGURED` (`capability=AI_COMPLETE`) and `400 INVALID_PROVIDER` guard |
| AI action | `app/api/ai/action/route.ts` | `NOT_IMPLEMENTED` when provider missing; `IMPLEMENTED/PARTIAL` on provider mismatch | explicit `501 NOT_IMPLEMENTED` + capability metadata when no provider; explicit `503 PROVIDER_NOT_CONFIGURED` (`capability=AI_ACTION`) and `400 INVALID_PROVIDER` guard |
| AI query | `app/api/ai/query/route.ts` | `IMPLEMENTED/PARTIAL` | explicit `503 PROVIDER_NOT_CONFIGURED` + capability metadata when no provider is configured or requested provider is unavailable; `400 INVALID_PROVIDER` for unsupported provider input |
| AI inline edit | `app/api/ai/inline-edit/route.ts` | `NOT_IMPLEMENTED` when provider missing; `IMPLEMENTED/PARTIAL` on provider mismatch | explicit `501 NOT_IMPLEMENTED` + capability metadata when no provider; explicit `503 PROVIDER_NOT_CONFIGURED` (`capability=AI_INLINE_EDIT`) and `400 INVALID_PROVIDER` guard |
| AI inline completion (compat) | `app/api/ai/inline-completion/route.ts` | active compat surface with explicit provider gates | canonical `suggestion` + alias `text`; explicit `503 PROVIDER_NOT_CONFIGURED` (`capability=AI_INLINE_COMPLETION`) and `400 INVALID_PROVIDER` guard |
| AI image generation | `app/api/ai/image/generate/route.ts` | `IMPLEMENTED/PARTIAL` | `503 PROVIDER_NOT_CONFIGURED` + capability metadata when requested provider is not configured |
| AI voice generation | `app/api/ai/voice/generate/route.ts` | `IMPLEMENTED/PARTIAL` | `503 PROVIDER_NOT_CONFIGURED` + capability metadata when requested provider is not configured |
| AI music generation | `app/api/ai/music/generate/route.ts` | `IMPLEMENTED/PARTIAL` | `503 PROVIDER_NOT_CONFIGURED` + capability metadata when requested provider is not configured |
| AI 3D generation | `app/api/ai/3d/generate/route.ts` | `IMPLEMENTED/PARTIAL` | `503 PROVIDER_NOT_CONFIGURED` + capability metadata when requested provider is not configured |
| AI deterministic validation | `app/api/ai/change/validate/route.ts` | `IMPLEMENTED` | returns `canApply`, `verdict`, `checks`, dependency impact |
| AI deterministic apply | `app/api/ai/change/apply/route.ts` | `IMPLEMENTED` | scoped apply with stale-context guard (`409`) + validation gate (`422`) + rollback token |
| AI deterministic rollback | `app/api/ai/change/rollback/route.ts` | `IMPLEMENTED/PARTIAL` | token-based restore with stale-context guard; partial for distributed multi-instance durability |
| Studio session start | `app/api/studio/session/start/route.ts` | `IMPLEMENTED` | creates mission session with quality mode + budget cap; enforces plan-quality policy metadata (`requestedQualityMode`, `appliedQualityMode`, `qualityModeDowngraded`, `allowedQualityModes`) |
| Studio session get | `app/api/studio/session/[id]/route.ts` | `IMPLEMENTED` | returns aggregated session state |
| Studio session stop | `app/api/studio/session/[id]/stop/route.ts` | `IMPLEMENTED` | explicit lifecycle stop contract |
| Studio super plan | `app/api/studio/tasks/plan/route.ts` | `IMPLEMENTED/PARTIAL` | generates baseline plan task set; duplicate plan blocked by default (`409 PLAN_ALREADY_EXISTS`) unless `force=true` |
| Studio task run | `app/api/studio/tasks/[id]/run/route.ts` | `IMPLEMENTED/PARTIAL` | role-sequenced single-task checkpoint run (`executionMode=role-sequenced-single-task`, `overlapGuard=enabled`) with plan-limit gate + explicit `SESSION_NOT_ACTIVE` (`409`), `TASK_RUN_BLOCKED` (`422`), and `TASK_RUN_NOT_ALLOWED` (`422`) |
| Studio task run-wave | `app/api/studio/tasks/run-wave/route.ts` | `IMPLEMENTED/PARTIAL` | role-sequenced planner/coder/reviewer wave execution (`executionMode=role-sequenced-wave`, `overlapGuard=enabled`) with explicit `SESSION_NOT_ACTIVE` (`409`), `RUN_WAVE_REQUIRES_PLAN` (`422`), `RUN_WAVE_ALREADY_COMPLETE` (`409`), and `TASK_RUN_BLOCKED` (`422`) gates |
| Studio task validate | `app/api/studio/tasks/[id]/validate/route.ts` | `IMPLEMENTED/PARTIAL` | deterministic verdict (`passed` or `failed`) with explicit reviewer-only + readiness gates (`REVIEW_GATE_REQUIRED`, `VALIDATION_NOT_READY`) and inactive-session gate (`409 SESSION_NOT_ACTIVE`) |
| Studio task apply | `app/api/studio/tasks/[id]/apply/route.ts` | `IMPLEMENTED/PARTIAL` | blocked until validation pass (`422 VALIDATION_REQUIRED`), inactive-session gate (`409 SESSION_NOT_ACTIVE`), and replay guard (`409 APPLY_ALREADY_COMPLETED`) |
| Studio task rollback | `app/api/studio/tasks/[id]/rollback/route.ts` | `IMPLEMENTED/PARTIAL` | requires prior apply token/state, inactive-session gate (`409 SESSION_NOT_ACTIVE`), and explicit token mismatch gate (`409 ROLLBACK_TOKEN_MISMATCH`) |
| Studio live cost | `app/api/studio/cost/live/route.ts` | `IMPLEMENTED` | per-session cost summary + budget exceeded flag |
| Studio full access grant | `app/api/studio/access/full/route.ts` | `IMPLEMENTED/PARTIAL` | plan-scoped grant policy (`project|workspace|web_tools`) with plan-aware TTL (15-45m), trial/starter scope gate, and inactive-session gate (`409 SESSION_NOT_ACTIVE`) |
| Studio full access revoke | `app/api/studio/access/full/[id]/route.ts` | `IMPLEMENTED` | explicit revoke contract |
| Web search tool | `app/api/web/search/route.ts` | `IMPLEMENTED/PARTIAL` | provider chain (`tavily -> serper -> duckduckgo`) with per-user throttle scope `web-search-post` |
| Web fetch tool | `app/api/web/fetch/route.ts` | `IMPLEMENTED/PARTIAL` | URL safety gating + content extraction with per-user throttle scope `web-fetch-post` |
| Render cancel | `app/api/render/jobs/[jobId]/cancel/route.ts` | `IMPLEMENTED/PARTIAL` | explicit `503 QUEUE_BACKEND_UNAVAILABLE` contract with capability metadata (`reason=queue-runtime-not-wired`) |
| Billing checkout (non-stripe) | `app/api/billing/checkout/route.ts` | `NOT_IMPLEMENTED` branch | `PAYMENT_GATEWAY_NOT_IMPLEMENTED` with capability metadata |
| File tree | `app/api/files/tree/route.ts` | `IMPLEMENTED` | canonical file authority |
| File fs | `app/api/files/fs/route.ts` | `IMPLEMENTED` | canonical file authority |
| Legacy workspace routes | `app/api/workspace/*` | `DEPRECATED` | `410 DEPRECATED_ROUTE` + cycle metadata |
| Legacy auth sessions | `app/api/auth/sessions*` | `DEPRECATED` | `410 DEPRECATED_ROUTE` + cycle metadata |
| Asset upload validation | `app/api/assets/upload/route.ts` + `lib/server/asset-processor.ts` | `IMPLEMENTED/PARTIAL` by class | explicit validation + warnings + capabilityStatus |

## 3) P0 guardrails (locked)
1. Any unavailable capability must expose explicit machine-readable status.
2. No capability may claim success if runtime/provider/pipeline is absent.
3. UI must not expose CTA for gated capability in critical user journeys.

## 3.1 Capability envelope contract (2026-02-17)
Mandatory fields for gated/unavailable capability responses:
1. `error`
2. `message`
3. `capability`
4. `capabilityStatus`
5. `metadata` (object, may be empty)
6. `milestone` (when applicable)

Headers (when applicable):
1. `x-aethel-capability`
2. `x-aethel-capability-status`
3. `x-aethel-meta-*` (metadata projection for operational tooling)

Validation status:
1. `qa:route-contracts` PASS
2. `qa:no-fake-success` PASS
3. `qa:critical-rate-limit` enforces rate-limit presence on critical abuse-prone routes (`auth` including `2fa setup/verify/validate/disable/backup-codes/status`, `ai core` including `query/stream` and auxiliary/media routes (`agent`, `change`, `suggestions`, `thinking`, `trace`, `director`, `image`, `voice`, `music`, `3d`), `billing` including `plans/portal/subscription/usage/credits/webhook`, `wallet` + `usage/status`, admin finance/security read-write surfaces, project lifecycle/collaboration/export routes, asset lifecycle routes, `studio session start`, `studio task mutation routes`, and `studio control-plane routes`).
4. `qa:no-fake-success` also enforces:
- `PAYMENT_GATEWAY_NOT_IMPLEMENTED -> 501`
- `AUTH_NOT_CONFIGURED -> 503`
- `QUEUE_BACKEND_UNAVAILABLE -> 503`
5. `AI_CHANGE_APPLY` and `AI_CHANGE_ROLLBACK` blocked states now use capability envelope helper, including `x-aethel-capability*` headers.
6. Studio route contracts include blocked/inactive-edge checks (`checks=32`).
7. Studio task gating routes now use shared capability envelope helper for header parity (`x-aethel-capability*`).
8. Route contract scanner now includes `/api/auth/2fa` aggregate deprecation contract and explicit gate checks for `/api/ai/query` and `/api/ai/stream`.
9. Critical rate-limit scanner now includes canonical + compatibility file routes to enforce abuse protection on file authority surface.
10. Critical rate-limit scanner now also includes billing lifecycle, wallet, usage status, admin payments/security endpoints, project lifecycle/export surfaces, asset upload/download/mutation surfaces, and AI auxiliary/media generation surfaces.
11. Critical rate-limit scanner additionally enforces web-tool ingress surfaces (`/api/web/search`, `/api/web/fetch`) and render control-plane cancel endpoint (`/api/render/jobs/[jobId]/cancel`).
12. AI media generation handlers now rely on shared `enforceRateLimit` only (legacy local `checkRateLimit` duplication removed) to keep throttle policy deterministic.
13. Terminal command execution ingress (`/api/terminal/execute`) is now part of mandatory rate-limit scanner coverage via scope `terminal-execute-post`.
14. Scanner coverage now also includes terminal control/sandbox, chat thread/orchestrator, git operations, and job queue control endpoints.
15. Scanner coverage now also includes marketplace browse/mutation surfaces, favorites/cart routes, and creator analytics endpoints.
16. Scanner coverage now also includes copilot workflow/control routes, dap/lsp routes, workspace search/replace routes, and collaboration room control routes.
17. Scanner coverage now also includes auth recovery/verification routes, contact/email messaging routes, and credits transfer mutation route.
18. Scanner coverage now also includes backup lifecycle routes, test discovery/run routes, and MCP ingress/status routes.
19. Scanner coverage now also includes analytics/experiments, feature-flag management, notifications/onboarding/quotas, templates, task helper routes, and route-level admin reads (`admin/dashboard`, `admin/users`).
20. `withAdminAuth` wrapper now enforces baseline limiter policy for admin routes (permission+method scoped), reducing unthrottled residuals in wrapper-protected surfaces.
21. Studio orchestration scanner coverage now includes run-wave control-plane endpoint (`studio-task-run-wave`) and route-contract gate checks for `tasks/run-wave`.

## 3.2 Build/runtime reliability note (2026-02-17)
1. Local config now sanitizes invalid Next IPC env keys to reduce ambiguous build/runtime IPC behavior.
2. Current local baseline: `npm run build` passes; residual warning remains from Next internal IPC revalidate URL (`localhost:undefined`) and is tracked separately as non-blocking runtime noise.
3. This does not relax API capability/error contracts in this matrix.
4. Rollback token snapshots are now persisted in local runtime temp storage + memory cache with TTL; still not cross-instance durable in distributed deployments.

## 4) Promotion criteria (P1+)
1. Promote `PARTIAL` to `IMPLEMENTED` only after:
- operational test evidence;
- stable error contract under failure modes;
- explicit cost/latency envelope in admin/runtime telemetry.

## 5) Notes
1. This matrix is contract-aligned with `10`, `13`, `14`, `15`, and `16`.
2. If any endpoint behavior changes, this matrix must be updated in the same wave.

## 6) Delta 2026-02-20 - Contract stability under connectivity hardening
1. No public endpoint behavior changed in this wave.
2. Capability/deprecation contracts remain unchanged:
- `501 NOT_IMPLEMENTED` for unavailable AI/runtime capabilities.
- `410 DEPRECATED_ROUTE` with cycle metadata for legacy routes.
3. CI/PR governance now additionally requires repository connectivity gate evidence (`qa:repo-connectivity`) to prevent path-level contract regressions in build/test automation.

## 7) Delta 2026-02-22 - Dynamic route-context hardening
1. No endpoint payload contract changes in this wave.
2. Studio orchestration and render-cancel dynamic handlers now consume awaited route params (`params: Promise<...>`) for runtime consistency.
3. Capability/deprecation/error envelopes are unchanged and remain authoritative.

## 8) Delta 2026-02-22 - AI query capability/error parity
1. `POST /api/ai/query` now enforces explicit invalid-body (`400 INVALID_BODY`), missing-query (`400 MISSING_QUERY`), and unsupported-provider (`400 INVALID_PROVIDER`) contracts.
2. Provider absence remains `501 NOT_IMPLEMENTED` (`AI_QUERY`) with capability metadata.
3. Requested provider not configured now returns explicit capability envelope (`503 PROVIDER_NOT_CONFIGURED`, `capability=AI_QUERY`, `capabilityStatus=PARTIAL`) instead of ambiguous generic server error.

## 9) Delta 2026-02-22 - Job queue contract normalization
1. `/api/jobs/[id]`, `/api/jobs/[id]/cancel`, and `/api/jobs/[id]/retry` now validate `jobId` consistently and consume awaited dynamic params.
2. Queue backend unavailability on these routes now uses canonical capability envelope semantics (`QUEUE_BACKEND_UNAVAILABLE`, status `503`).
3. No deprecation/feature-claim promotion introduced in this wave.

## 10) Delta 2026-02-22 - Project collaboration route normalization
1. `/api/projects/[id]/share`, `/api/projects/[id]/duplicate`, `/api/projects/[id]/invite-links`, `/api/projects/[id]/invite-links/[linkId]`, `/api/projects/[id]/members`, `/api/projects/[id]/members/[memberId]`, `/api/collaboration/rooms/[id]`, `/api/auth/oauth/[provider]`, and `/api/auth/oauth/[provider]/callback` now consume awaited dynamic params.
2. Input validation and operator-facing error copy are normalized across these endpoints.
3. Existing capability-gated collaboration behavior remains unchanged (`PROJECT_SHARE`, `PROJECT_INVITE_LINKS`).

## 11) Delta 2026-02-22 - Core AI provider gate parity
1. `POST /api/ai/chat|complete|action|inline-edit|inline-completion` now enforce unsupported provider input as `400 INVALID_PROVIDER`.
2. Explicit requested-provider mismatch now returns capability envelope `503 PROVIDER_NOT_CONFIGURED` (capability-specific metadata) instead of ambiguous generic errors.
3. Existing no-provider global gate remains unchanged: `501 NOT_IMPLEMENTED`.

## 12) Delta 2026-02-22 - Plan-quality policy visibility
1. Studio session start now enforces plan-aware quality-mode normalization and returns explicit metadata (`requestedQualityMode`, `appliedQualityMode`, `qualityModeDowngraded`, `allowedQualityModes`).
2. Advanced chat response now propagates quality-mode normalization metadata for UI transparency.
3. Route contract scanner now enforces Studio session quality-policy metadata keys.

## 13) Delta 2026-02-22 - Studio budget alert + variable-usage hard gate
1. `GET /api/studio/cost/live` now returns `budgetAlert` contract metadata (`level`, `percentUsed`, `thresholdReached`, `nextThreshold`, `message`) to make 50/80/100 budget stages explicit in UI.
2. `GET /api/studio/session/[id]` now includes `metadata.budgetAlert` using the same server-side calculation contract.
3. `POST /api/studio/tasks/[id]/run` and `POST /api/studio/tasks/run-wave` now enforce explicit variable-usage gate when credits are exhausted:
- status `402`
- `error: VARIABLE_USAGE_BLOCKED`
- `capability: STUDIO_HOME_VARIABLE_USAGE`
- `capabilityStatus: PARTIAL`
- metadata includes `creditBalance`, `blockedReason`, and policy marker.
4. Route contract scanner now validates these studio-route contract markers to prevent silent regression.

## 14) Delta 2026-02-22 - Full Access action-class policy contract
1. `POST /api/studio/access/full` now supports optional `intendedActionClass` and `confirmManualAction` to evaluate safety policy before grant.
2. New explicit contract outcomes:
- `400 INVALID_ACTION_CLASS`
- `403 ACTION_CLASS_BLOCKED`
- `403 ACTION_CLASS_NOT_ALLOWED_FOR_SCOPE`
- `409 MANUAL_CONFIRMATION_REQUIRED`
3. Successful grant responses now include policy summary metadata:
- `allowedActionClasses`
- `manualConfirmActionClasses`
- `blockedActionClasses`
4. Hard-risk classes remain blocked by policy (`financial_transaction`, `account_security_change`, `credential_export`).

## 15) Delta 2026-02-22 - Connector capability/risk canonical matrix
1. Published connector matrix for external-action boundaries:
- `38_CONNECTOR_CAPABILITY_AND_RISK_MATRIX_2026-02-22.md`.
2. Matrix binds connector-level claims to action classes and policy outcomes (`IMPLEMENTED/PARTIAL/BLOCKED`).

## 16) Delta 2026-02-23 - Studio task endpoint claim hardening
1. Studio task mutation routes now advertise orchestration reality explicitly to prevent inflated automation claims:
- `/api/studio/tasks/plan` -> `capabilityStatus=PARTIAL`, `metadata.planMode=template-heuristic`, `executionReality=orchestration-checkpoint`.
- `/api/studio/tasks/[id]/run` -> retains `PARTIAL` and now includes `executionReality=orchestration-checkpoint`.
- `/api/studio/tasks/run-wave` -> now `capabilityStatus=PARTIAL` with orchestration-reality metadata plus strategy contract (`balanced|cost_guarded|quality_first`, `requestedStrategy`, `maxStepsApplied`, `strategyReason`).
- `/api/studio/tasks/[id]/validate` -> now `capabilityStatus=PARTIAL` with deterministic-checkpoint metadata.
- `/api/studio/tasks/[id]/apply` -> now `capabilityStatus=PARTIAL`, `externalApplyRequired=true`.
- `/api/studio/tasks/[id]/rollback` -> now `capabilityStatus=PARTIAL` with checkpoint rollback metadata.
2. `check-route-contracts` scanner now enforces these Studio realism markers to block regression.
3. Session persistence bounds added in runtime store (`tasks/runs/messages`) to preserve long-session stability without changing public endpoint shape.

## 17) Delta 2026-02-23 - Reviewer validation deterministic gate expansion
1. Reviewer validation semantics now rely on deterministic session checks (not marker-only):
- planner/coder completion prerequisites
- successful run presence by role
- quality checklist/domain readiness
- budget-cap compliance
2. Public route contract shape for `/api/studio/tasks/[id]/validate` remains unchanged (`PARTIAL` on failure paths, `IMPLEMENTED` success payload), but decision quality is stricter.
3. Validation outcomes are now explicitly tagged in task result (`[validation:passed|failed]`) and failure details are emitted as system messages for operator traceability.
4. `/api/studio/tasks/[id]/validate` metadata now exposes deterministic check summary (`totalChecks`, `failedIds`) on both failed and passed responses.

## 18) Delta 2026-02-23 - Domain-aware validation report contract
1. Reviewer validation now enforces domain marker presence in reviewer output (`[domain:<missionDomain>]`).
2. Session task payload now may include `validationReport` for reviewer checkpoints:
- `totalChecks`
- `failedIds`
- `failedMessages`
3. This report is informational for operator UX and does not bypass existing capability/validation/apply gates.

## 19) Delta 2026-02-23 - Validation metadata parity
1. `POST /api/studio/tasks/[id]/validate` now includes deterministic check summary metadata (`totalChecks`, `failedIds`) on both success and failure responses.
2. This adds observability only; gate logic and capability status semantics remain unchanged.

## 20) Delta 2026-02-24 - AI query/stream + render cancel capability precision
1. `POST /api/ai/query` no longer uses `501 NOT_IMPLEMENTED` on missing provider; it now returns explicit `503 PROVIDER_NOT_CONFIGURED` with capability metadata (`AI_QUERY`, `PARTIAL`).
2. `POST /api/ai/stream` no longer uses `501 NOT_IMPLEMENTED` on missing backend URL; it now returns explicit `503 AI_BACKEND_NOT_CONFIGURED` with capability metadata (`AI_STREAM_BACKEND`, `PARTIAL`).
3. `POST /api/ai/inline-completion` no longer uses `501 NOT_IMPLEMENTED` on missing provider; it now returns explicit `503 PROVIDER_NOT_CONFIGURED` with capability metadata (`AI_INLINE_COMPLETION`, `PARTIAL`).
4. `POST /api/render/jobs/[jobId]/cancel` now returns explicit `503 QUEUE_BACKEND_UNAVAILABLE` with capability metadata instead of generic not-implemented semantics.
5. Route-contract scanner coverage was updated to enforce these refined contracts.

## 21) Delta 2026-02-24 - Capability observability metrics expansion
1. Interface critical scanner now tracks explicit capability-unavailable markers for:
- `PROVIDER_NOT_CONFIGURED`
- `QUEUE_BACKEND_UNAVAILABLE`.
2. Routes inventory summary now publishes exact counts for:
- `NOT_IMPLEMENTED`
- `PAYMENT_GATEWAY_NOT_IMPLEMENTED`
- `PROVIDER_NOT_CONFIGURED`
- `QUEUE_BACKEND_UNAVAILABLE`.
3. This is observability-only hardening; no public API behavior changed by this delta.

## 22) Delta 2026-02-25 - Not-implemented boundary governance + legacy cutoff report contract
1. Added hard policy gate for `NOT_IMPLEMENTED` usage:
- only `POST /api/ai/chat|complete|action|inline-edit` are allowed to emit `501 NOT_IMPLEMENTED` in provider-absent flow.
2. Legacy deprecation route contracts are now enforced with exact cycle metadata values:
- `deprecatedSince: '2026-02-11'`
- `removalCycleTarget: '2026-cycle-2'`
- `deprecationPolicy: 'phaseout_after_2_cycles'`.
3. Admin compatibility route telemetry contract is now explicitly validated:
- `candidateForRemoval`
- `removalCandidates`
- `requiredSilentDays: 14`
- `deprecationMode: 'phaseout_after_2_cycles'`.
4. This delta adds governance precision and does not introduce any breaking API/interface change.
