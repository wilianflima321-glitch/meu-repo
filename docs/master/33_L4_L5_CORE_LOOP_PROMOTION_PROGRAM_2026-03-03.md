# 33_L4_L5_CORE_LOOP_PROMOTION_PROGRAM_2026-03-03
Status: ACTIVE EXECUTION PROGRAM
Date: 2026-03-03
Owner: Chief Architecture + Platform + PM

## 1) Objective
Promote Aethel from current L2/L3 asymmetry to L4 (supervised autonomy) and prepare L5 foundations without changing business scope.

Scope lock:
1. `/dashboard` stays entry surface.
2. `/ide` stays advanced workbench.
3. No fake-success.
4. No new product shell.
5. Games/Films feature expansion is frozen until Core Loop closure.

## 2) Factual starting state (verified)
1. `qa:canonical-doc-alignment` is PASS.
2. `qa:repo-connectivity` is PASS.
3. `qa:interface-gate` is PASS with `not-implemented-ui=0` and unchanged limit `6`.
4. Explicit API `NOT_IMPLEMENTED` gates in current global register: `0` (runtime gaps normalized under explicit `PARTIAL` contracts).
6. `docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md` exists and is active.
7. Domain scorecards baseline (`27`):
   - Games: `L2 Experimental`
   - Films: `L2 Experimental`
   - Apps: `L3 Production Ready (Beta)`

## 3) Critical blockers to close first
### B1) Interface gate mismatch
1. Status: CLOSED.
2. Result:
- `not-implemented-ui` reduced to `0`, threshold remains `6` (no relaxation).

### B2) Missing Core Loop executors
1. `ai/change/apply` moved to `PARTIAL` (single-file + batch path, rollback token per change).
2. `ai/change/rollback` moved to `PARTIAL` (single-token + batch token restore).
3. Evidence readout now exists via `/api/ai/change/runs` and admin metrics integration.
4. L4 promotion remains blocked until sandboxed multi-file apply + durable run-ledger evidence are operational.
5. Current delta: `ai/change/apply` now supports `executionMode=sandbox` simulation, but still lacks full isolated acceptance matrix execution before promote.

### B3) Evidence quality gap
1. Collaboration remains `PARTIAL` until stress/conflict/reconnect evidence is reproducible.
2. Runtime accessibility evidence still needs runtime axe/lighthouse layer (static gate alone is not enough for full claim).
3. L4 promotion now has explicit operator endpoint (`/api/admin/ai/readiness`) but thresholds are still evidence-gated.

### B4) Readiness telemetry hardening
1. Added shared readiness calculator (`lib/server/core-loop-readiness.ts`) to keep formulas deterministic across operators.
2. `/api/admin/ai/readiness` now emits 24h/7d/30d windows (same thresholds, same formula).
3. Added user-scoped `/api/ai/change/readiness` for direct self-serve evidence in Studio/IDE without admin access.

## 4) Core Loop program (mandatory)
Target loop:
1. `PLAN`
2. `PATCH`
3. `VALIDATE`
4. `APPLY`
5. `ROLLBACK`
6. `LEARN`

Mandatory implementation:
1. Sandboxed execution path per run (no direct unsafe apply in primary workspace).
2. Dependency impact graph before apply for high-risk scopes.
3. Deterministic acceptance matrix per task:
   - lint
   - typecheck
   - build/smoke
   - route/capability contracts.
4. Signed run ledger with artifacts (`plan`, `impact`, `validation`, `result`).
5. Cost/usage trace per run with hard-stop on budget overflow.

## 5) L4 and L5 promotion criteria
### L4 (supervised autonomy)
1. Success rate > 90% across representative runs.
2. Regression rate < 5% on critical journeys.
3. Apply and rollback implemented and used in production-like flow.
4. Cost variance < 10% between estimate and actual.
5. Human approval for high-risk categories (auth, billing, admin, destructive file ops).

### L5 (broad autonomy)
1. All L4 criteria.
2. Tool/browser automation in isolated sandbox with strict scope and approval policy.
3. Continuous self-recovery policies (retry, circuit breaker, provider fallback).
4. Full operational compliance controls and tenant-safe auditability.

## 6) 90-day execution map
### Phase A (weeks 1-2): unblock and normalize
1. Close interface gate mismatch.
2. Keep global gap register and canonical baseline in sync.
3. Freeze non-core expansion work.

### Phase B (weeks 3-5): Core Loop implementation
1. Upgrade `ai/change/apply` from `PARTIAL` single-file mode to sandboxed multi-file mode.
2. Upgrade `ai/change/rollback` from token restore to full run-level rollback.
3. Add dependency impact guard to high-risk flows.

### Phase C (weeks 6-9): evidence and reliability
1. Run controlled apply cycles with full artifacts.
2. Publish success/regression/cost metrics.
3. Gate promotions by evidence only.

### Phase D (weeks 10-12): controlled autonomy
1. Enable low-risk autonomous apply under policy.
2. Keep high-risk scopes approval-gated.
3. Publish L4 readiness dossier.

## 7) Governance rules
1. External benchmark narratives are directional only until verified in-repo (`EXTERNAL_BENCHMARK_ASSUMPTION`).
2. Capability claims cannot exceed evidence level.
3. If enterprise gate fails, release status is frozen.

## 8) Required artifacts per wave
1. Updated `32_GLOBAL_GAP_REGISTER`.
2. Updated canonical baseline (`26`) if metrics changed.
3. Updated backlog order (`20`) with closure statuses.
4. Updated endpoint matrix (`17`) for any contract/status change.

## 9) Delta 2026-03-04 (core-loop tooling hardening)
1. Added deterministic explicit gate inventory scanner:
- `tools/find-not-implemented.mjs`
- script: `npm run qa:find-not-implemented`
- output: `docs/master/not-implemented-scan.csv`
2. Added dependency-impact matrix generator for apply planning:
- `tools/impact.mjs`
- script: `npm run qa:impact-matrix -- --files <fileA,fileB> --output <impact_matrix.json>`
3. Purpose:
- reduce ambiguity between external audit narratives and in-repo factual status;
- provide machine-readable impact artifact for `PLAN -> PATCH -> VALIDATE -> APPLY` waves.
4. Added rolling core-loop metrics exporter:
- `tools/export-core-loop-metrics.mjs`
- script: `npm run qa:core-loop-metrics`
- artifact: `metrics/latest_run.json` (7-day window baseline).
5. Added admin diagnostics endpoint:
- `/api/admin/ai/core-loop-metrics`
- includes reason histogram + execution mode mix + last-event freshness markers per window.

## 10) Delta 2026-03-04 (dependency-impact guard execution hardening)
1. `app/api/ai/change/apply/route.ts` now executes transitive dependency-impact analysis before apply.
2. New shared analyzer: `cloud-web-app/web/lib/server/dependency-impact-guard.ts`:
- builds local import/dependent graph in scoped workspace;
- computes reverse dependents, impacted tests, impacted endpoints, graph depth and risk.
3. New deterministic approval gate in apply:
- `DEPENDENCY_GRAPH_APPROVAL_REQUIRED` (`409`, `PARTIAL`) when transitive fanout exceeds threshold (`reverseDependents > 80`) and `approvedHighRisk` is not set.
4. Apply metadata now includes project impact summary for both:
- `executionMode=workspace` (committed writes with rollback token),
- `executionMode=sandbox` (isolated simulation).

## 11) Delta 2026-03-04 (LEARN stage instrumentation)
1. Added shared learning stage utility: `lib/server/core-loop-learning.ts`.
2. Operational metrics now expose recommendation-ready diagnostics:
- reason histogram (`reasonCounts`);
- execution mode distribution (`executionModeCounts`);
- dependency risk distribution (`riskCounts`);
- impacted API hotspots (`impactedEndpointCounts`).
3. Readiness endpoints now emit deterministic recommendation list (`recommendations`) derived from thresholds and measured evidence.
4. `/admin/ai-monitor` now surfaces these signals to close the `ROLLBACK -> LEARN` visibility gap for L4 promotion operations.

## 12) Delta 2026-03-04 (LEARN stage operational guidance)
1. Added trend signal (`7d` compared with `30d`) to reduce static-window bias in promotion decisions.
2. Added reason playbook generation from top blocked/failure causes, mapping each reason to a concrete mitigation action.
3. Exposed trend + playbook in:
- `/api/admin/ai/core-loop-metrics`;
- `/api/admin/ai/readiness`;
- `/api/ai/change/readiness`;
- `/admin/ai-monitor` panel.

## 13) Delta 2026-03-04 (audit trail integrity)
1. Change-run ledger now appends hash-chain metadata per event (`eventId`, `prevHash`, `eventHash`).
2. Added integrity verification endpoint:
- `/api/admin/ai/ledger-integrity`.
3. Ops panel now surfaces ledger integrity status and first invalid rows when present.
4. Goal: strengthen evidence immutability posture for L4 promotion and L5 readiness.

## 14) Delta 2026-03-04 (production vs rehearsal evidence policy)
1. Introduced sample classification in run-ledger:
- `production` (default / real usage);
- `rehearsal` (`runSource=core_loop_drill|qa_harness|synthetic|simulation|test|ci`).
2. Readiness and metrics surfaces now apply **promotion policy**:
- `production_only_for_promotion`.
3. Endpoints updated with split payload:
- `/api/ai/change/readiness`;
- `/api/admin/ai/readiness`;
- `/api/admin/ai/core-loop-metrics`.
4. Added controlled drill endpoint for ops rehearsals:
- `/api/admin/ai/core-loop-drill` (writes rehearsal-only evidence, never counted as production promotion sample).
5. Added CLI rehearsal script:
- `tools/run-core-loop-drill.mjs`;
- script: `npm run qa:core-loop-drill`.
6. Core-loop metrics exporter now supports source scope:
- `--source all|production|rehearsal`.
7. Added promotion verdict endpoint:
- `/api/admin/ai/core-loop-promotion` (single `promotionEligible` + blockers snapshot with production/rehearsal side-by-side metrics).

## 15) Delta 2026-03-04 (Full Access audited window control)
1. Replaced `STUDIO_FULL_ACCESS_GRANT` stub with operational `PARTIAL` endpoint:
- `GET /api/studio/access/full` (caller-scoped grant list);
- `POST /api/studio/access/full` (short-lived scoped grant, reason required, TTL clamp).
2. Replaced `STUDIO_FULL_ACCESS_REVOKE` stub with operational `PARTIAL` endpoint:
- `DELETE /api/studio/access/full/[id]` (ownership-guarded revoke).
3. Added append-only audit ledger for full-access grants:
- `cloud-web-app/web/lib/server/full-access-ledger.ts`;
- artifact path `.aethel/full-access/ledger.ndjson` with hash chaining (`prevHash`, `eventHash`).
4. Dashboard header now exposes `Full Access` toggle with visible active/expiry state to prevent hidden privilege windows.
5. `ai/change/apply` override path now requires active full-access grant for high-risk/dependency override flows (`FULL_ACCESS_GRANT_REQUIRED`), removing client-only boolean bypass risk.
6. `/ide` status bar now exposes the same full-access toggle/expiry state to keep privilege control visible in advanced workbench flow.
7. `MonacoEditorPro` inline edit now executes `validate -> apply` server chain (not only local in-memory patch), tightening PLAN/PATCH/APPLY evidence continuity.
8. Added admin audit endpoint `/api/admin/ai/full-access` and monitor card to track active/revoked/expired temporary privilege windows.
9. Inline-edit error path now exposes direct in-editor `Enable Full Access` CTA for faster high-risk recovery without hidden admin navigation.

## 16) Delta 2026-03-04 (executive text reconciliation)
1. User-provided executive review was reconciled against repository evidence and absorbed in:
- `34_EXECUTIVE_TEXT_VERIFICATION_ALIGNMENT_2026-03-04.md`.
2. Mismatch corrections now canonicalized:
- dashboard shell bound is `1200` (not historical `1322`);
- explicit API `NOT_IMPLEMENTED` inventory is `0`;
- mixed gate-count narratives are now normalized into atomic checks + aggregate chain.
3. Priority order remains unchanged:
- P0-A core loop reliability;
- P0-B first-value onboarding closure;
- P0-C managed preview runtime closure.

## 17) Delta 2026-03-04 (LEARN ingress + batch envelope expansion)
1. Added explicit LEARN ingestion endpoint:
- `POST /api/ai/change/feedback`
- capability: `AI_CHANGE_LEARN`
- accepted feedback: `accepted|rejected|needs_work`
- bound to `runId` and appended as `learn_feedback` event in run ledger.
2. Expanded apply/rollback batch envelopes:
- `ai/change/apply`: from `20` -> `50` changes per request.
- `ai/change/rollback`: from `20` -> `50` rollback tokens per request.
3. Readiness/metrics now expose feedback diagnostics in LEARN payload:
- user readiness: `feedbackCounts` + `allFeedbackCounts`;
- admin readiness: `feedbackCounts`;
- admin metrics: `feedbackCounts` + `allFeedbackCounts`;
- admin promotion: production vs rehearsal feedback counts.

## 18) Delta 2026-03-04 (first-value demo fallback + IDE learn wiring)
1. Added explicit optional demo fallback for provider-missing AI endpoints (guarded by `AETHEL_AI_DEMO_MODE`):
- `/api/ai/chat`
- `/api/ai/chat-advanced`
- `/api/ai/complete`
- `/api/ai/action`
- `/api/ai/inline-edit`
- `/api/ai/inline-completion`
2. Demo fallback keeps anti-fake-success contract explicit:
- responses include `demoMode=true`, `capabilityStatus=PARTIAL`, warning text, provider setup metadata;
- default behavior without demo flag remains `503 AI_PROVIDER_NOT_CONFIGURED`.
3. Provider readiness endpoint now exposes demo state:
- `/api/ai/provider-status` returns `demoModeEnabled` signal.
4. IDE core-loop learn signal now connected to user flow:
- `MonacoEditorPro` posts `accepted` or `needs_work` feedback after inline apply outcome;
- `/ide` rollback action posts `rejected` feedback for the same `runId`.
