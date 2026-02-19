# 16_AI_GAMES_FILMS_APPS_SUBSYSTEM_BLUEPRINT_2026-02-16
Status: EXECUTION BLUEPRINT  
Date: 2026-02-16  
Scope: maximize quality/critique with current product scope (no business expansion)

## 0) Canonical scope and evidence
Authoritative references used:
1. `audit dicas do emergent usar/LIMITATIONS.md`
2. `audit dicas do emergent usar/AI_SYSTEM_SPEC.md`
3. `audit dicas do emergent usar/10_AAA_REALITY_EXECUTION_CONTRACT_2026-02-11.md`
4. `audit dicas do emergent usar/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
5. `audit dicas do emergent usar/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`
6. `audit dicas do emergent usar/15_AI_LIMITATIONS_SUBSYSTEMS_EXECUTION_2026-02-16.md`
7. `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
8. current route/component reality in `cloud-web-app/web`

## 1) Factual baseline (this round)
1. Workbench shell remains single entry at `/ide`.
2. Interface critical gates remain clean (`legacy-accent/admin-light/admin-status-light/blocking-dialogs = 0`).
3. `not-implemented-ui` remains explicit and API-scoped.
4. AI unavailability remains explicit by contract (`501 NOT_IMPLEMENTED`) in:
- `/api/ai/chat`
- `/api/ai/complete`
- `/api/ai/action`
- `/api/ai/inline-edit`
5. Legacy routes remain explicit `410 DEPRECATED_ROUTE` with phased telemetry cutoff.

## 1.1 Benchmark absorption policy (2026-02-17)
1. External benchmark claims are directional until proven in canonical evidence.
2. Unsupported external claims must be tagged `EXTERNAL_BENCHMARK_ASSUMPTION`.
3. This blueprint keeps scope fixed:
- no second shell outside `/ide`
- no desktop parity claim for Unreal/Premiere
- no L4/L5 promotion without operational evidence

## 1.2 Reliability delta (2026-02-17)
1. Build/runtime config hardened for restricted environments by sanitizing invalid Next IPC env keys and disabling worker threads locally.
2. Visual regression pipeline moved to stricter execution (no permissive compare/capture bypass in CI script).
3. Core anti-fake-success gates remain mandatory before any subsystem promotion claim.

## 2) Critical limitations to beat (without fake claims)
## 2.1 AI limitations (current generation models)
1. Non-determinism under repeated prompts.
2. Hallucination risk on code/runtime behavior.
3. Degradation in long, multi-step context chains.
4. Cost/latency growth with larger context and agent loops.
5. Provider dependency risk (quota, outage, price changes).

## 2.2 Games/films/apps operational limitations
1. Games: generated logic can pass syntax but fail runtime/balance/perf.
2. Films/media: continuity and timeline coherence are not guaranteed by LLM output alone.
3. Apps: wide refactors can silently break integration boundaries.
4. Assets: generated/imported media requires validation+optimization pipeline to avoid runtime crashes.
5. Web runtime: browser limits still block full desktop parity for heavy 3D/video processing.

## 3) Subsystem blueprint required to overcome these limits
Each subsystem is classified as `IMPLEMENTED`, `PARTIAL`, or `MISSING`.

## 3.1 Control Plane (AI orchestration)
1. Capability contract layer (`IMPLEMENTED`):
- explicit error/deprecation semantics across AI and legacy routes.
2. Agent session persistence (`PARTIAL`):
- some agent/thinking flows still memory/preview-oriented.
3. Deterministic planner-executor-review loop (`MISSING` as enterprise-ready):
- needed before claiming stable L4/L5.

## 3.2 Data Plane (context and grounding)
1. File authority + scoped project access (`IMPLEMENTED`):
- `/api/files/tree`, `/api/files/fs`, workspace scoping.
2. Retrieval/context packing service (`PARTIAL`):
- context assembly not yet formalized as a dedicated bounded service.
3. Provenance ledger for generated outputs (`MISSING`):
- needed for enterprise auditability and rollback confidence.

## 3.3 Runtime Plane (execution and preview)
1. IDE runtime shell + preview routing (`IMPLEMENTED` in P0 scope).
2. Render/job cancellation runtime integration (`MISSING`):
- explicit gate remains in `/api/render/jobs/[jobId]/cancel`.
3. Asset optimization runtime (`PARTIAL`):
- upload contract is explicit, but optimization backend is not always present.

## 3.4 Quality Plane (verification and anti-regression)
1. Static quality gates (`IMPLEMENTED`):
- interface and route contract checks, type/build gates.
2. AI output verification harness (`MISSING` as full system):
- need standardized per-task validate/apply/revert workflow.
3. Domain eval suites (game/film/app) (`MISSING`):
- needed to promote claims above L3.

## 3.5 Cost and Reliability Plane
1. Quota/metering foundations (`IMPLEMENTED` base).
2. Cost-aware policy per feature/path (`PARTIAL`):
- needs unified dashboard thresholds tied to release gates.
3. Failure-mode tests (provider down/rate-limit/timeouts) (`PARTIAL`):
- explicit errors exist; systematic chaos validation is still pending.

## 3.6 Safety and Governance Plane
1. Canonical execution contract (`IMPLEMENTED`).
2. Claim governance (`PARTIAL`):
- L4/L5 still requires stricter evidence rubric.
3. Daily owner runbook (`MISSING`):
- enterprise operation needs repeatable operational checklist.

## 4) Highest-impact actions (attack order)
## P0 (immediate)
1. Keep API capability truth explicit on every unavailable AI/runtime branch.
2. Remove ambiguous UX paths that imply unavailable enterprise capability.
3. Stabilize preview/runtime behavior with controlled execution and clear unsupported gates.
4. Keep deprecation telemetry active for 2-cycle cutover policy.

## P1 (readiness)
1. Build verification harness for AI-generated patches (validate/apply/revert).
2. Promote asset pipeline from explicit-partial to real optimization backend.
3. Define and enforce claim gates for L4/L5 and collaboration readiness.

## P2 (scale and differentiation)
1. Domain-specific eval suites (games/films/apps) in release gates.
2. Provider-router fallback policy with deterministic disclosure (no hidden behavior).
3. Provenance/audit ledger for generated code/assets.

## 5) Hard boundaries (must remain)
1. No claim of full Unreal/Premiere desktop parity in browser.
2. No fake success for unavailable capabilities.
3. No expansion to second shell/product outside `/ide`.
4. No L4/L5 production claim without operational evidence.

## 6) Exit criteria for this blueprint
1. Every AI/runtime gap is either:
- implemented with evidence, or
- explicitly gated with capability metadata and clear message.
2. Canonical docs (`10/13/14/15/16`) remain numerically consistent.
3. Residual backlog is prioritized by impact on user trust, not by UI volume.

## 7) Implementation delta recorded in this wave
1. `AI_CHANGE_VALIDATE` subsystem implemented:
- `app/api/ai/change/validate/route.ts`
- `lib/server/change-validation.ts`
2. Inline edit apply now runs deterministic validation before code mutation:
- `components/editor/MonacoEditorPro.tsx`
- `components/editor/InlineEditModal.tsx`
3. Ghost text generation moved to canonical backend endpoint:
- `lib/ai/ghost-text.ts`
- `app/api/ai/inline-completion/route.ts`
4. Asset pipeline now classifies media/model constraints with explicit `PARTIAL` warnings:
- `lib/server/asset-processor.ts`
- `app/api/assets/upload/route.ts`
5. Advanced chat orchestration now enforces quality mode + self-questioning checklist + optional benchmark references, with explicit provider gates:
- `app/api/ai/chat-advanced/route.ts`
6. Workbench AI panel is now wired to advanced orchestration route for runtime use:
- `components/ide/AIChatPanelContainer.tsx`
7. Deterministic inline edit execution now includes scoped server apply + rollback token issuance:
- `app/api/ai/change/apply/route.ts`
- `app/api/ai/change/rollback/route.ts`
- `lib/server/change-apply-runtime.ts`
- `components/editor/MonacoEditorPro.tsx`
8. Rollback snapshots now persist to local runtime temp storage (TTL) for improved continuity across local restarts:
- `lib/server/change-apply-runtime.ts`
9. Media/3D generation routes now fail explicitly on missing provider config (`503 PROVIDER_NOT_CONFIGURED`, `capabilityStatus=PARTIAL`, metadata) instead of implicit provider fallback:
- `app/api/ai/image/generate/route.ts`
- `app/api/ai/voice/generate/route.ts`
- `app/api/ai/music/generate/route.ts`
- `app/api/ai/3d/generate/route.ts`

## 8) Delta 2026-02-18 - Studio Home orchestration bridge
1. Added Studio Home entry as orchestration bridge between conversational flow and deterministic engineering flow.
2. Added session/task APIs for mission lifecycle:
- start
- plan
- run
- validate
- apply
- rollback
- stop
3. Added scoped, timeboxed full-access grant API with explicit plan gate.
4. Current persistence strategy reuses `copilotWorkflow.context`:
- operationally viable in this wave
- still `PARTIAL` for distributed durability and dedicated ledger-grade storage.

## 9) Delta 2026-02-19 - Domain-quality bridge for games/films/apps in Studio orchestration
1. Studio session now stores domain classification (`games|films|apps|general`) derived from mission context.
2. Studio plan/task execution now carries a domain-specific quality checklist to keep outputs aligned with:
- deterministic gameplay/runtime constraints (games)
- temporal/render constraints (films)
- multi-file/API/UX consistency constraints (apps)
3. New `tasks/run-wave` endpoint executes planner/coder/reviewer in queued wave mode with explicit gates and no fake success.
4. Cost-pressure-aware execution profile now reduces model/cost intensity when remaining budget drops, preserving quality policy while avoiding runaway consumption.
