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
