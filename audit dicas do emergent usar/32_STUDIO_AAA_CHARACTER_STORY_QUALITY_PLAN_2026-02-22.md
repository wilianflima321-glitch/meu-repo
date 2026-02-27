# 32_STUDIO_AAA_CHARACTER_STORY_QUALITY_PLAN_2026-02-22
Status: DECISION-COMPLETE SUBSYSTEM PLAN (NO SCOPE EXPANSION)
Date: 2026-02-22
Owner: PM Tecnico + Arquiteto-Chefe + AI Architect + UX Lead

## 0) Executive intent
1. Define a complete, realistic plan to deliver high-quality game/film/app creation in Aethel.
2. Keep current product scope: `/dashboard` as entry, `/ide` as advanced mode.
3. Avoid fake claims:
- no "desktop Unreal parity in browser";
- no "zero AI hallucination";
- no L4/L5 production claim without evidence gates.
4. Convert the user objective ("high quality in all areas") into subsystem-level execution with measurable acceptance.

## 1) Factual baseline (2026-02-22)
Source reports:
1. `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
2. `cloud-web-app/web/docs/ARCHITECTURE_CRITICAL_TRIAGE.md`
3. `cloud-web-app/web/docs/ROUTES_INVENTORY.md`
4. `audit dicas do emergent usar/25_REPO_CONNECTIVITY_MATRIX_2026-02-20.md`
5. `audit dicas do emergent usar/26_WORKFLOW_GOVERNANCE_MATRIX_2026-02-20.md`
6. `audit dicas do emergent usar/29_CANONICAL_DOC_GOVERNANCE_MATRIX_2026-02-20.md`
7. `audit dicas do emergent usar/27_CRITICAL_SECRET_SCAN_2026-02-20.md`

Current objective numbers:
1. Interface critical:
- `legacy-accent-tokens=0`
- `admin-light-theme-tokens=0`
- `admin-status-light-tokens=0`
- `blocking-browser-dialogs=0`
- `not-implemented-ui=6`
- `not-implemented-noncritical=2`
2. Architecture:
- `apiRoutes=246`
- `apiNotImplemented=8`
- `fileCompatWrappers=8`
- `nearLimitFiles=37`
- `oversizedFiles=0`
3. Governance:
- connectivity `requiredMissing=0`, `deadScriptReferences=0`, `totalChecks=30`
- workflow governance `issues=0`
- canonical docs `missingListedCanonicalDocs=0`
- secrets `findings=0`
4. Integrated quality:
- `qa:enterprise-gate` PASS.

## 2) Non-negotiable limits (from LIMITATIONS.md)
1. Browser/runtime limits remain real:
- rendering, memory, and GPU ceilings;
- no desktop-equivalent unrestricted pipeline in browser only.
2. AI limits remain real:
- context window constraints;
- hallucination risk;
- latency and cost scaling.
3. Infra limits remain real:
- container cold start and concurrency bounds;
- queue and egress/storage cost pressure.

## 3) What "100% quality" means in this product
This plan defines "100%" as:
1. Studio-grade workflow quality and consistency.
2. Strong deterministic validation gates before apply/export.
3. Explicit capability contracts for unavailable features.
4. High-end production pipeline with hybrid execution (web + backend/local where required).

This plan does NOT define "100%" as:
1. Unlimited browser AAA parity with Unreal desktop.
2. Zero hallucination under all scenarios.
3. Infinite scale without cost/latency tradeoffs.

## 4) Sub-area matrix (current state -> gaps -> closure)
## 4.1 Product and UX flow
Current:
1. `/dashboard` + `/ide` journey is operational and gated.
2. Critical UI consistency is stable.
Gaps:
1. Some capabilities still visible as gated steps.
2. Advanced narrative/character UX still lacks dedicated canon workflows.
Closure:
1. Add explicit "Canon Workspace" panels in Studio Home without new shell.
2. Keep no-CTA for PARTIAL/NOT_IMPLEMENTED actions.

## 4.2 Character identity consistency
Current:
1. No canonical per-project character identity contract is enforced end-to-end.
Gaps:
1. Face/style/personality drift risk across long projects.
Closure:
1. Introduce `Character Identity Pack` per `projectId`:
- visual anchors;
- voice profile;
- personality constraints;
- forbidden contradictions.
2. Add pre-apply consistency validator for character assets/dialogue.

## 4.3 Story/lore continuity
Current:
1. Narrative tooling exists, but continuity is not globally compiled and locked.
Gaps:
1. Timeline and causality contradictions can pass unless manually reviewed.
Closure:
1. Introduce `Story Canon` states:
- `draft`, `approved`, `locked`.
2. Add `Narrative Compile` validation:
- continuity;
- timeline conflicts;
- relationship contradictions.

## 4.4 AI orchestration for creative quality
Current:
1. Multi-agent workflow exists with explicit gating and validation steps.
Gaps:
1. Creative consistency rules are not yet first-class project artifacts.
Closure:
1. Enforce planner/coder/reviewer to read only approved canon artifacts.
2. Require reviewer approval for narrative/character apply, not only code apply.

## 4.5 Asset pipeline (2D/3D/material)
Current:
1. Asset and rendering subsystems exist with explicit limits.
Gaps:
1. Uniform quality gates for topology/rig/LOD/material are not fully centralized.
Closure:
1. Add mandatory `Asset QA Gate` bundle:
- geometry integrity;
- naming/schema;
- texture/material rules;
- performance budget checks.

## 4.6 Audio, voice, and music
Current:
1. Audio systems exist but not all project-level consistency checks are enforced.
Gaps:
1. Voice/personality drift and loudness inconsistency risk.
Closure:
1. Add `Audio QA Gate`:
- loudness range;
- clipping detection;
- voice profile match;
- lip-sync readiness metadata.

## 4.7 Lighting/lookdev/cinematics
Current:
1. Sequencer and visual systems are present.
Gaps:
1. Temporal stability and shot-level quality scoring are not yet formal gates.
Closure:
1. Add `Cinematic QA Gate`:
- shot continuity;
- flicker/drift detection;
- per-sequence lookdev profile lock.

## 4.8 Performance and runtime safety
Current:
1. Build and enterprise gate pass consistently.
Gaps:
1. Near-limit code debt remains (`37`) and impacts maintenance velocity.
Closure:
1. Continue decomposition track to `nearLimitFiles <= 30`.
2. Keep architecture gate tightened each wave.

## 4.9 Cost and entitlement reliability
Current:
1. Capability gating and explicit errors are standardized.
Gaps:
1. Creative-heavy workflows can still create cost spikes if not bounded.
Closure:
1. Per-session and per-task budget caps mandatory.
2. Stage alerts at 50/80/100 with hard stop at overrun.

## 4.10 Security and trust
Current:
1. Secret scans and governance checks are green.
Gaps:
1. Ongoing hardening is still needed as features grow.
Closure:
1. Keep secret/governance scans mandatory in PR gates.
2. Keep explicit audit logs for privileged/full-access operations.

## 4.11 Documentation and canonical control
Current:
1. Canonical docs indexed and validated.
Gaps:
1. High historical markdown volume (`3603`) increases confusion risk.
Closure:
1. Continue canonical-first policy.
2. Add archival batching policy for historical docs to reduce noise over time.

## 5) Capability model for AAA-quality delivery
## 5.1 Level definitions
1. L1: Assisted generation with explicit gates.
2. L2: Structured multi-file/task workflows with deterministic validation.
3. L3: Reliable production pipelines with measurable quality and rollback.
4. L4: Advanced autonomous execution (claim blocked until operational proof).
5. L5: Multi-project autonomous orchestration (claim blocked until operational proof).

## 5.2 Current claim boundary
1. Practical target in this phase: high-confidence L3 in scoped workflows.
2. L4/L5 remain non-claim until evidence gates pass.

## 6) Execution plan by wave (aligned with current repo)
## Wave A - Canon and identity substrate
1. Create project-level canon entities:
- `character_identity_pack`
- `story_canon`
- `continuity_rules`.
2. Wire Studio Home mission/task UX to canon lock states.
Done criteria:
1. No narrative/character apply without canon version reference.

## Wave B - Validation compilers
1. Add narrative continuity compiler.
2. Add character consistency validator.
3. Add audio consistency validator.
Done criteria:
1. Validator outputs are mandatory inputs to reviewer gate.

## Wave C - Asset/cinematic QA gates
1. Centralize asset quality checks.
2. Add cinematic temporal continuity checks.
Done criteria:
1. Export/apply blocked when objective quality checks fail.

## Wave D - Cost and ops hardening
1. Enforce budget policy per session/task.
2. Add quality-vs-cost transparency in Studio Ops Bar.
Done criteria:
1. No hidden overrun behavior in long runs.

## Wave E - Structural debt and reliability
1. Continue near-limit decomposition (`37 -> <=30`).
2. Keep enterprise gate green in each wave.
Done criteria:
1. No regression in interface/contract/governance metrics.

## 7) Acceptance criteria (must-pass)
1. Quality gates:
- `qa:enterprise-gate` PASS
- `qa:architecture-gate` PASS with tightened threshold each wave.
2. Canon consistency:
- every narrative/character apply references a canon version.
3. No fake success:
- blocked capabilities return explicit capability envelope.
4. Cost control:
- budget alerts and hard-stop behavior validated in end-to-end scenarios.
5. User trust:
- no contradictory character identity in approved outputs within same project scope.

## 8) Residual limits that remain even after full execution
1. Browser hardware/runtime constraints remain.
2. AI hallucination risk is reduced, not eliminated.
3. Latency/cost tradeoffs remain and must be actively managed.
4. Desktop-equivalent unrestricted AAA parity remains out-of-scope for web-only runtime.

## 9) P0/P1/P2 backlog snapshot
## P0
1. Canon entities + lock states.
2. Narrative/character validators in reviewer gate.
3. Budget hard-stop and quality-cost transparency.

## P1
1. Asset/cinematic/audio QA depth expansion.
2. Near-limit reduction from `37` to `<=30`.
3. Historical docs hygiene batching.

## P2
1. Advanced L4/L5 readiness experiments behind strict feature flags.
2. Broader autonomy only after hard operational evidence.

## 10) Decision lock
1. The product can deliver high-end studio-grade quality with this architecture.
2. The product must not claim "no limitations".
3. The winning strategy is: deterministic gates + canon memory + hybrid execution + strict governance.
