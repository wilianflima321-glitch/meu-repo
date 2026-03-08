# 35_L4_L5_COMPLETION_MAP_2026-03-05
Status: ACTIVE COMPLETION MAP
Date: 2026-03-05
Owner: Chief Architecture + Platform + PM

## 1) Purpose
Consolidate the single execution map required to move Aethel from the current asymmetrical state to:
1. `L4` in `Apps`
2. evidence-backed `PARTIAL` readiness in `Preview`, `Onboarding`, `Collaboration`, and `Accessibility`
3. `L5` foundations without inflating claims for Games/Films/browser render parity

This document is a decision map, not a marketing roadmap.

## 2) Current factual state
### 2.1 Product/domain state
1. `Apps`: `L3 Production Ready (Beta)` from `27_DOMAIN_READINESS_SCORECARDS_2026-02-28.md`
2. `Games`: `L2 Experimental`
3. `Films`: `L2 Experimental`
4. Explicit API `NOT_IMPLEMENTED` inventory in active scope: `0`
5. `qa:enterprise-gate`: `PASS`

### 2.2 Core loop evidence state
From `metrics/latest_run-production.json` and `metrics/latest_run-rehearsal.json`:
1. Production sample size: `0`
2. Rehearsal sample size: `24`
3. Rehearsal apply success rate: `0.75`
4. Rehearsal regression rate: `0`
5. Rehearsal feedback coverage: `0.5`
6. L4 promotion is therefore blocked by missing production evidence, insufficient LEARN coverage threshold (`0.6`), and insufficient success rate.

### 2.3 UX/runtime state
1. Managed preview runtime provisioning exists and is `PARTIAL`.
2. Preview runtime now supports:
- auto-discovery
- authenticated provision
- warm-up polling
- multi-endpoint failover
3. Managed HMR parity is still not implemented.
4. First-value telemetry exists, but `<90s` is not yet proven as a canonical achieved SLO.
5. Collaboration has SLO targets documented, but no stress/conflict proof bundle.
6. Accessibility has static gate coverage, but runtime evidence remains `PARTIAL`.
7. Research-to-Forge continuity improved (`Nexus Research -> /ide` handoff payload), but remains `PARTIAL` until end-to-end source-grounded code flow is evidenced in production metrics.
8. Multi-agent UX now supports explicit runtime mode selection (`heuristic` vs `provider-backed`), but provider-backed reliability remains `PARTIAL` pending production evidence.

## 3) Hard truth map
### 3.1 What is actually blocking L4
1. `production_only_for_promotion` has `sampleSize=0`.
2. `LEARN` exists, but production `feedbackCoverage` is effectively `0`.
3. `apply` and `rollback` are operational `PARTIAL`, but not yet evidence-proven at L4 thresholds.
4. Unified acceptance evidence is still spread across gates and run artifacts, not yet a fully operator-closed promotion dossier.

### 3.2 What is not blocking L4 but still blocks market claim quality
1. Managed preview is not HMR-grade.
2. First-value onboarding is instrumented but not yet friction-closed.
3. Collaboration is still claim-gated by missing proof.
4. Runtime accessibility proof is incomplete.
5. Mobile readiness is still not strong enough for broad market-parity claim.

### 3.3 What must stay frozen
1. Games/Films expansion beyond factual L2 execution.
2. Unreal/Sora parity language.
3. New product shells or scope expansion outside `/dashboard` + `/ide`.

## 4) Completion order
### A) L4 Apps closure
1. Generate production evidence through controlled real runs, not drills.
2. Raise production `sampleSize` to promotion floor and then to representative volume.
3. Raise `learnFeedbackCoverage` to at least `0.6`.
4. Raise apply success rate above `0.9`.
5. Keep regression rate below `0.05`.
6. Publish a single operator-readable readiness dossier from existing readiness endpoints and run artifacts.

### B) First-value closure
1. Keep demo mode as the no-provider bridge.
2. Prove first-value SLO with measured windows.
3. Remove remaining runtime friction from preview setup.
4. Ensure provider recovery and preview provisioning remain in-flow, never dead-end.

### C) Market-readiness closure
1. Publish collaboration evidence bundle.
2. Publish runtime accessibility evidence bundle.
3. Close responsive/mobile evidence for entry surfaces.
4. Only after A/B/C are complete, move to market-parity narrative tightening.

### D) L5 foundations
1. Browser/tool automation runtime in sandbox.
2. Credential vault with scoped permissions.
3. Approval policy for external side effects.
4. Cost hard-stop per agent/session.
5. Retry/circuit-breaker/provider-fallback policy.

L5 work starts only after Apps L4 evidence is real.

## 5) Workstreams and exact next steps
### W1 Core Loop evidence
1. Use production probe and real operator flows to create production-sample apply runs.
2. Surface missing LEARN feedback directly after apply/rollback outcomes until coverage target is met.
3. Tighten acceptance-matrix visibility per run:
- lint
- typecheck
- build/smoke
- contract gates
4. Publish rolling evidence snapshots in `metrics/` and admin readiness surfaces.

### W2 Preview runtime
1. Keep current managed provision path as canonical.
2. Treat current state as `managed runtime bootstrap`, not `real HMR parity`.
3. Next preview milestone:
- provisioned runtime lifecycle visibility
- frontend backoff/circuit behavior
- stable operator telemetry for failover attempts
4. Separate future HMR decision from current readiness claim:
- `webcontainer`
- `managed sandbox`
- custom microVM

### W3 Onboarding and first value
1. Keep demo mode enabled path explicit and budgeted.
2. Tie first-value funnel to:
- signup
- onboarding entry
- first project
- first AI success
- first IDE open
- completed first value
3. Publish actual P50/P95 first-value timing before claiming closure.

### W4 Collaboration
1. Produce evidence for:
- synthetic concurrency
- reconnect replay
- conflict replay
2. Attach proof through existing admin evidence surfaces.
3. Keep claim at `PARTIAL` until reproducible proof exists.

### W5 Accessibility and mobile
1. Runtime evidence for critical flows:
- landing -> auth -> dashboard
- dashboard -> ide -> preview
2. Reduce runtime WCAG threshold over time from permissive baseline.
3. Treat light theme as foundation only until critical-surface contrast evidence exists.

## 6) L4 exit criteria
Apps may be promoted to `L4` only when all are true:
1. production sample is non-zero and representative
2. apply success rate > `0.90`
3. regression rate < `0.05`
4. feedback coverage >= `0.60`
5. apply/rollback evidence is reproducible
6. cost variance is measured and within target
7. enterprise gates remain green during the same wave

## 7) L5 entry criteria
L5 work may be claimed only when:
1. Apps L4 is already evidence-backed
2. external side effects are approval-gated
3. credentials are isolated in scoped vault
4. browser/tool actions run in sandbox
5. audit and rollback are explicit for external actions

## 8) Claim boundaries
### Allowed now
1. `Apps` is the primary L4 candidate.
2. Preview/bootstrap, onboarding, collaboration, and accessibility are active `PARTIAL` closure programs.
3. Games/Films are valuable pre-production and prototyping surfaces, not production engines.

### Prohibited now
1. `Aethel is already L4`
2. `Aethel is L5`
3. `Unreal parity in browser`
4. `Sora/Kling parity`
5. `enterprise-grade collaboration` without proof bundle

## 9) Canonical execution rule
If work competes with this order:
1. Core loop production evidence wins.
2. First-value friction wins next.
3. Collaboration/accessibility/mobile proof comes before new domain ambition.
4. Games/Films remain frozen beyond factual L2 hardening until Apps L4 is closed.

## 10) Delta 2026-03-07
1. First-value path improved with explicit local demo bridge on IDE chat when provider is missing and server demo mode is off.
2. Dashboard shell margin improved (`AethelDashboard.tsx` moved from `1199` to `1190` lines) by extracting initial-state logic to a dedicated helper module.
3. `DUPLICATIONS_AND_CONFLICTS.md` is refreshed and active again; conflict map now tracks open blockers with explicit IDs (`C-01..C-05`).
4. L4 block conditions remain unchanged:
   - production evidence still required;
   - readiness thresholds still mandatory;
   - no claim upgrade allowed by rehearsal-only metrics.
5. IDE chat mention handling now avoids silent degradation:
   - unsupported mention tags are surfaced explicitly as `MENTION_NOT_SUPPORTED`;
   - empty prompts after mention sanitization are blocked before provider call;
   - only documented profile-routing tags remain active (`@studio`, `@delivery`, `@fast`, `@web`, `@agents:1|2|3`).
6. Async polling compatibility aliases were added for generator APIs that already expose `checkStatusUrl`:
   - `GET /api/ai/music/status` now maps to canonical `GET /api/ai/music/generate`;
   - `GET /api/ai/3d/status` now maps to canonical `GET /api/ai/3d/generate`.
7. Audio/music stack remains marked as integration-incomplete at product level:
   - generation endpoints exist;
   - editor-grade audio components exist;
   - end-to-end orchestration in the canonical workbench is still `PARTIAL`.
8. Dashboard `content-creation` surface now moved from placeholder cards to a unified workbench shell:
   - canonical local `Project Graph` store (`assets/scenes/timeline/shots/jobs/audio-policy`);
   - single three-panel workspace (`graph`, `scene/timeline/preview`, `jobs/policy/inspector`);
   - async AI generation queue orchestration for `music`, `voice`, `3d` with status polling and graph import hooks.
9. Product-shell drift remains an active quality risk and must stay explicit:
   - `AethelDashboardSidebar` and `DashboardSidebar` still coexist;
   - `TheForgeUnified.tsx` remains detached from the canonical dashboard path;
   - `LivePreview`, `PreviewPanel`, and `NexusCanvasV2` still represent different preview paradigms.
10. Media orchestration is improved but not yet fully canonical:
   - `MediaStudio.tsx` now supports controlled operation from the `Project Graph` shell;
   - timeline/assets selection can flow through the canonical workbench path;
   - however, full domain unification is still pending because non-media surfaces are not yet bound to the same contract depth;
   - therefore timeline/editor parity should remain `PARTIAL`, not claimed as complete.
11. Preview authority is now partially centralized for dashboard-facing surfaces:
   - `CanonicalPreviewSurface.tsx` now fronts `live`, `scene`, and `runtime` preview variants;
   - dashboard overview, creation workbench, and `/ide` now route through this preview authority instead of importing primitives directly;
   - shared runtime helpers now exist in `lib/preview/runtime-manager.ts` for normalize/discover/provision/health/persist flows;
   - `/ide` runtime state/orchestration is now routed through `hooks/usePreviewRuntimeManager.ts` instead of remaining fully inline in `FullscreenIDE.tsx`;
   - preview consolidation remains `PARTIAL` because dashboard handoff/bootstrap and detached legacy shells are still not fully collapsed into one runtime authority.
12. Provider integration coverage improved:
   - `OPENROUTER_API_KEY` is now recognized as a first-class configured provider in runtime/admin status surfaces;
   - `aiService` now supports OpenRouter through the OpenAI-compatible API path with explicit `provider: openrouter`;
   - `aiService.selectProvider()` now prefers OpenRouter when it is the only configured provider instead of falsely failing with "Nenhum provider";
   - `lib/ai/advanced-ai-provider.ts` and `lib/ai/inline-completion.ts` now also recognize OpenRouter instead of keeping older OpenAI-only assumptions in deeper AI infrastructure layers;
   - live direct validation succeeded for routed models `google/gemini-3.1-flash-lite-preview`, `openai/gpt-4o-mini`, and `anthropic/claude-3.5-haiku`;
   - low-cost real completion was validated against a live OpenRouter model (`google/gemini-3.1-flash-lite-preview`);
   - setup and settings UX now surface OpenRouter as a first-class operator-facing option instead of backend-only support;
   - `inline-edit` provider validation now accepts `openrouter`;
   - IDE chat model presets and provider gate messaging now include OpenRouter-oriented defaults so the product shell is less biased toward direct OpenAI-only wording;
   - provider cost metadata now includes routed OpenRouter variants in `aiService` and emergency-mode controls so cost/allowance logic is less inconsistent;
   - `plan-limits.ts` now normalizes provider-prefixed/routed model identifiers so `checkModelAccess` no longer rejects OpenRouter-backed models that the UX exposes;
   - readiness and promotion routes now count `OPENROUTER_API_KEY` as factual provider configuration instead of under-reporting configured state in core-loop/admin surfaces;
   - default AI settings now bias toward routed OpenRouter models in operator-facing settings surfaces instead of hard-defaulting to direct OpenAI choices;
   - provider configuration truth is now centralized in `lib/ai-provider-config.ts` and consumed by health/provider-status/readiness routes to reduce future env-check drift;
   - provider labels/setup wording now also draw from centralized provider config so demo/setup copy is less likely to drift from runtime truth;
   - this improves factual provider readiness but does not change L4 promotion criteria, which still require production evidence.
13. Local production-style validation remains blocked by environment prerequisites:
   - direct provider validation is real and passing, but full protected-route validation still requires a real app runtime with `DATABASE_URL`, `JWT_SECRET`, and a valid authenticated token for `/api/admin/ai/core-loop-production-probe`;
   - current local environment still lacks `cloud-web-app/web/.env.local`, does not expose `DATABASE_URL`/`JWT_SECRET`, and does not have a running Docker daemon for the heavier sandbox path;
   - therefore provider readiness improved materially, but production readiness remains `PARTIAL` until authenticated end-to-end probes run against a live runtime.
14. Security/readiness hardening improved:
   - `lib/rbac.ts` no longer accepts an implicit fallback admin JWT secret and now fails closed with `AUTH_NOT_CONFIGURED` instead of silently trusting a baked-in development secret;
   - `lib/rbac-middleware.ts` now also fails closed when `JWT_SECRET` is absent instead of accepting `aethel-secret-key`;
   - `lib/security/csrf-middleware.ts` no longer signs tokens with a fallback secret and now reports `CSRF_NOT_CONFIGURED` when server secrets are absent;
   - `app/api/admin/ai/readiness/route.ts` now exposes runtime prerequisites through `runtimeReadiness` so admin operators can distinguish provider readiness from real production-probe readiness.
15. AI chat/stream runtime consistency improved:
   - `/api/ai/chat` now enforces model access checks for requested models and returns explicit provider-setup capability metadata when a model implies an unavailable provider;
   - `/api/ai/stream` no longer hard-depends on `NEXT_PUBLIC_API_URL`; it can now stream directly through internal providers when no external AI backend proxy is configured;
   - `/api/ai/stream` also mirrors demo-mode/provider-missing behavior instead of failing as a backend-only dead-end, which reduces one production readiness gap for the local runtime path.
16. Production preflight is now executable instead of implicit:
   - `tools/check-production-runtime-readiness.mjs` provides a deterministic local preflight for `.env.local`, `DATABASE_URL`, `JWT_SECRET`, `CSRF_SECRET`, Docker CLI, and Docker daemon state;
   - `npm run qa:production-runtime-readiness` now fails with explicit blockers instead of leaving operators to infer why production probes cannot start.
