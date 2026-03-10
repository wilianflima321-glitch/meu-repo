# 20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17
Status: DECISION-COMPLETE EXECUTION LIST
Date: 2026-02-17
Source Base: `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md`

## 0.1 Current Freeze Snapshot (2026-03-01)
1. `>=1200` code hotspots in `cloud-web-app/web`: `0` (`AethelDashboardRuntime.tsx` at `1191`, `AethelDashboard.tsx` shell at `7`).
2. Blocking dialogs in active scope: `0`.
3. Blocking dialogs in deprecated scope: `0`.
4. Canonical read-order drift: `0`.
5. Remaining structural pressures:
- non-canonical markdown volume (`3585`)
- explicit runtime-gated capabilities still under `PARTIAL` promotion threshold evidence

## 0. Scope
This backlog is limited to P1/P2 hardening on the current product scope:
1. single product shell model with `/ide` as advanced workbench
2. `dashboard`/home as entry surface with canonical handoff to `/ide`
3. explicit capability gates
4. no new product shell
5. no fake success

## 1. P1 Priorities (Execute First)
### P1-01 Workbench Usability Consistency
1. Objective: make primary `/ide` journeys predictable and fast.
2. Files:
- `cloud-web-app/web/app/ide/page.tsx`
- `cloud-web-app/web/components/ide/IDELayout.tsx`
- `cloud-web-app/web/components/ide/FileExplorerPro.tsx`
3. Done criteria:
- no dead-end CTA in critical editor flow
- clear empty/error/loading states in explorer/editor/preview
- keyboard flow remains intact

### P1-02 Editor-Native AI Clarity
1. Objective: keep AI assist in editor as primary, chat as secondary.
2. Files:
- `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
- `cloud-web-app/web/components/editor/InlineEditModal.tsx`
- `cloud-web-app/web/components/editor/GhostTextDecorations.tsx`
- `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
3. Done criteria:
- inline suggestions visible and non-intrusive
- apply/edit path shows deterministic validation result
- no success UI on gated provider paths

### P1-03 Preview Runtime Stability
1. Objective: improve reliability/perf of supported preview modes.
2. Files:
- `cloud-web-app/web/components/ide/PreviewPanel.tsx`
- `cloud-web-app/web/app/api/files/raw/route.ts`
3. Done criteria:
- supported file types render consistently
- large payload gate stays explicit
- unsupported types remain explicit without fake CTA

### P1-04 Admin Actionability
1. Objective: admin pages remain enterprise and operational.
2. Files:
- `cloud-web-app/web/app/admin/page.tsx`
- `cloud-web-app/web/app/admin/payments/page.tsx`
- `cloud-web-app/web/app/admin/apis/page.tsx`
- `cloud-web-app/web/app/admin/security/page.tsx`
3. Done criteria:
- no decorative widget without action
- every critical action returns transactable success/error feedback
- keyboard and focus visibility preserved

### P1-05 Runtime Warning Control
1. Objective: reduce operational noise while preserving strict gates.
2. Files:
- `cloud-web-app/web/next.config.js`
- `cloud-web-app/web/app/api/**/route.ts` (runtime-sensitive only)
- `docs/master/19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md`
3. Done criteria:
- warning inventory updated with root-cause status
- no regression in `qa:enterprise-gate`

## 2. P2 Priorities (After P1 Freeze)
### P2-01 Collaboration Readiness Gate
1. Objective: formalize stability claims before promotion.
2. Files:
- `docs/master/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`
- `cloud-web-app/web/docs/AI_RUNTIME_SLO.md`
3. Done criteria:
- explicit SLO for reconnect/conflict/concurrency
- status remains `PARTIAL` until criteria met

### P2-02 Agentic Promotion Gate (L4/L5)
1. Objective: block inflated claims without evidence.
2. Files:
- `docs/master/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
- `docs/master/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md`
3. Done criteria:
- promotion rubric documented
- no L4/L5 claim without reproducible operational evidence

### P2-03 Legacy Route Cutoff Completion
1. Objective: complete phaseout safely by telemetry.
2. Files:
- `cloud-web-app/web/app/api/workspace/tree/route.ts`
- `cloud-web-app/web/app/api/workspace/files/route.ts`
- `cloud-web-app/web/app/api/auth/sessions/route.ts`
- `cloud-web-app/web/app/api/auth/sessions/[id]/route.ts`
3. Done criteria:
- 2-cycle policy executed
- removal only after usage criteria

### P2-04 Visual Regression Maturity
1. Objective: keep studio-quality UI stable across releases.
2. Files:
- `.github/workflows/ui-audit.yml`
- `.github/workflows/visual-regression-compare.yml`
- `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
3. Done criteria:
- visual and contract gates fail PR on regressions
- no manual bypass in normal flow

## 3. Execution Order (Strict)
1. P1-01
2. P1-02
3. P1-03
4. P1-04
5. P1-05
6. P2-01
7. P2-02
8. P2-03
9. P2-04

## 4. Mandatory Gate Before Marking Any Item Done
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run qa:interface-gate`
5. `npm run qa:canonical-components`
6. `npm run qa:route-contracts`
7. `npm run qa:no-fake-success`
8. `npm run qa:wcag-critical`
9. `npm run qa:dashboard-shell`
10. `npm run qa:mojibake`
11. `npm run qa:enterprise-gate`

## 5. Delta 2026-02-27 (new blocking order)
### P0-A Repo Connectivity Hardening
1. Fix root script/config references to missing paths.
2. Remove committed local runtime artifacts (`.venv`) and enforce ignore.
3. Resolve orphan submodule/tsconfig references.

### P0-B IDE Critical Path Integrity
1. Remove mock data dependency from `/ide` workbench flow.
2. Enforce real file read/write path (`/api/files/*`) with explicit error state.

### P0-C Surface Consolidation
1. Define canonical component for duplicate pairs (Nexus, notifications, dashboard blocks).
2. Decompose top monoliths with owner scope.

### P0 completion note (2026-02-27)
1. `/ide` main bridge (`components/ide/FullscreenIDE.tsx`) now uses canonical file API instead of local mock tree in critical flow.
2. URL handoff contract (`projectId`, `file`, `entry`) is consumed in runtime bridge.

## 6. Delta 2026-02-28 (next blocking order)
### Closed
1. Repo connectivity scanner hardened and passing (`qa:repo-connectivity`).
2. Visual workflows now include connectivity gate before browser stages.
3. Root command surface now mirrors canonical freeze gates (`lint/typecheck/build` + `qa:*` passthroughs).
4. Dashboard monolith decomposition advanced with extracted modules:
- `aethel-dashboard-model.ts`
- `aethel-dashboard-defaults.ts`
- `aethel-dashboard-session-utils.ts`
- `aethel-dashboard-project-utils.ts`
- `aethel-dashboard-wallet-utils.ts`
- `aethel-dashboard-livepreview-ai-utils.ts`
- `aethel-dashboard-billing-utils.ts`
- `aethel-dashboard-copilot-utils.ts`
- `TrialBanner.tsx`
- `DashboardHeader.tsx`
- `AethelDashboardSidebar.tsx`
- `DashboardOverviewTab.tsx`
- `DashboardProjectsTab.tsx`
- `DashboardCopilotWorkflowBar.tsx`
- `DashboardAIChatTab.tsx`
- `DashboardWalletTab.tsx`
- `DashboardConnectivityTab.tsx`
- `DashboardContentCreationTab.tsx`
- `DashboardUnrealTab.tsx`

### Remaining block sequence
1. `P0-D`: continue `AethelDashboard` split into UI blocks (`header`, `mission`, `chat`, `preview`, `ops`) with stable props contracts.
 - status update: `chat`, `wallet`, `connectivity`, `content-creation`, `unreal` extracted; remaining heavy blocks: `billing`, `download`, `templates`, `use-cases`, `admin`, `agent-canvas`.
2. `P0-E`: run full freeze gate suite and publish evidence bundle.
3. `P1-01..P1-05`: execute only after `P0-D/P0-E` close.
4. `P0-F`: canonical doc drift cleanup:
- replace stale legacy path references in active docs;
- keep historical docs explicitly marked as non-execution sources.
5. `P0-G`: execute cross-domain gap closure blocks from `24_GAMES_FILMS_APPS_GAP_ALIGNMENT_MATRIX_2026-02-28.md`:
- domain readiness scorecards (`games/films/apps`);
- promotion threshold evidence gates;
- no-claim enforcement for unsupported capabilities.
6. `P0-H`: apply market comparator policy from `25_MARKET_LIMITATIONS_PARITY_PLAYBOOK_2026-02-28.md`:
- classify any new external claim as factual or `EXTERNAL_BENCHMARK_ASSUMPTION`;
- block "equal/superior" narrative if evidence gate is missing.
7. `P0-I`: enforce active baseline consistency from `26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md` across all active canonical docs.
8. `P0-J`: keep canonical-doc-alignment gate green:
- `npm run qa:canonical-doc-alignment`
- block merge if canonical baseline/doc references drift.

## 7. Delta 2026-02-28 (executive closure order from canonical gap review)
### New immediate blockers (before broad P1 rollout)
1. `P0-K` Product telemetry baseline:
- instrument funnel (`landing -> signup -> dashboard -> first project -> first AI action`);
- publish canonical metrics source and dashboards.
 - status 2026-03-01: `ADVANCED` (batch ingest endpoint `app/api/analytics/batch/route.ts` + dashboard/chat baseline events wired; auth flows now emit `register/login` checkpoints and admin baseline dashboard now exposes signup/login funnel counters via `app/api/admin/analytics/baseline/route.ts` and `app/admin/analytics/page.tsx`).
2. `P0-L` AI provider setup recovery UX:
- every AI `NOT_IMPLEMENTED` gate must provide direct setup CTA and verification path;
- no dead-end error state in critical journey.
 - status 2026-03-01: `ADVANCED` (`components/ai/AIProviderSetupGuide.tsx` unified in IDE/Studio chat surfaces; `/api/ai/provider-status` operational; canonical recovery path now `/settings?tab=api`; critical `/api/ai/*` gates now emit setup metadata for deterministic recovery routing).
3. `P0-M` Preview runtime real-time closure:
- move from static-perceived preview to true runtime update loop (HMR-grade where supported);
- keep unsupported/runtime-limited types explicitly gated.
 - status 2026-03-01: `ADVANCED` (`FullscreenIDE` runtime controls + health probe + fallback; `PreviewPanel` supports forced inline fallback and explicit runtime-unavailable banner; save now auto-refreshes preview).

## 8. Delta 2026-03-04 (full-access governance execution)
1. `P0-N` Full Access audited window:
- status: `ADVANCED`.
- deliverables:
  - `/api/studio/access/full` (`GET` + `POST`) operational with reason-required short-lived grants;
  - `/api/studio/access/full/[id]` (`DELETE`) operational with ownership guard;
  - append-only audit ledger at `.aethel/full-access/ledger.ndjson` with hash chain.
2. Dashboard header now exposes Full Access toggle with active/expiry visibility; no hidden privilege window in primary Studio entry surface.
3. `/ide` status bar now mirrors Full Access control for advanced-workbench parity.
4. Monaco inline edit flow now persists through server `validate -> apply` chain, reducing local-only patch drift.
5. `P0-A` reliability wave advanced:
- added LEARN ingress endpoint (`/api/ai/change/feedback`) with run-bound feedback evidence;
- expanded apply/rollback request envelope (`20 -> 50`) for controlled multi-file waves;
- readiness payloads now expose feedback diagnostics to support promotion decisions.
6. `P0-N` Onboarding first-value flow:
- deterministic first project path with clear progress and first successful outcome.
 - status 2026-02-28: `PARTIAL` (`components/AethelDashboard.tsx` now shows first-value action rail with direct path for project creation, provider setup, and IDE live preview handoff; `app/landing-v2.tsx` now seeds mission via `/dashboard?mission=`).
 - status 2026-03-01: `ADVANCED` (`app/(auth)/register/register-v2.tsx` now routes new users to `/dashboard?onboarding=1&source=register&mission=...`; `app/(auth)/login/login-v2.tsx` now routes to deterministic dashboard/next target with transactional states; `components/AethelDashboard.tsx` now consumes onboarding/source query context and starts first-value guide without dead-end entry).
7. `P0-O` Responsive entry surface hardening:
- `/dashboard` and landing must meet defined mobile/tablet acceptance.
 - status 2026-02-28: `PARTIAL` (`components/dashboard/AethelDashboardSidebar.tsx` + `components/AethelDashboard.tsx` now include mobile close behavior and backdrop handling).
 - status 2026-03-01: `PARTIAL` (`components/dashboard/DashboardHeader.tsx` now has mobile-safe density (`text`, action visibility, compact `IDE` CTA), and `AethelDashboard` routes header IDE open through canonical context handoff without fake desktop CTA).
 - status 2026-03-01-b: `ADVANCED` (`app/landing-v2.tsx` now includes mobile-first mission shortcuts + skip-link landmark flow; `app/dashboard/page.tsx` now has deterministic loading state; `components/AethelDashboard.tsx` replaces blank auth bootstrap with explicit loading state and responsive toast placement; `AethelDashboardSidebar` now includes mobile close control and bounded drawer width for tablet/phone).
8. `P0-P` Complete dashboard monolith decomposition:
- extract remaining heavy tab blocks and finalize stable prop contracts.
 - status 2026-03-01: `ADVANCED` (`AethelDashboardRuntime.tsx` at ~1191 lines; first-value rail extracted to `components/dashboard/FirstValueGuide.tsx`; chat request/fallback logic unified via `lib/ai-chat-advanced-client.ts`; dashboard shell remains below >=1200 hotspot cutoff).
9. `P1-Q` Collaboration readiness evidence:
- publish SLO (`p95 latency`, reconnect, conflict handling) and stress-test baseline.
 - status 2026-03-01: `PARTIAL` (SLO baseline published in `cloud-web-app/web/docs/COLLAB_RUNTIME_SLO.md`; readiness now aggregates audit-backed evidence history; new ledger endpoint `app/api/admin/collaboration/evidence/route.ts` plus admin controls in `app/admin/collaboration/page.tsx`; external stress proof bundle still pending).
 - status 2026-03-01-b: `ADVANCED` (stress-proof attachment endpoint added at `app/api/admin/collaboration/evidence/stress-proof/route.ts`; readiness gate now requires stress-proof presence for promotion eligibility; admin collaboration surface now supports proof registration and visible attached/pending state).
10. `P1-R` Light theme + accessibility completion:
- add light-theme token strategy and WCAG evidence for critical surfaces.
 - status 2026-03-01: `PARTIAL` (light-theme token overrides available in `styles/globals.css`; critical-surface evidence baseline published at `cloud-web-app/web/docs/WCAG_CRITICAL_SURFACE_AUDIT.md`; automated WCAG gate and full sweep still pending).
 - status 2026-03-01-b: `ADVANCED` (static accessibility gate operational via `npm run qa:wcag-critical` backed by `cloud-web-app/web/scripts/check-wcag-critical-surfaces.mjs`; `qa:enterprise-gate` now includes this check; runtime axe/lighthouse sweep still pending for full completion).
11. `P1-S` Empty-state and micro-interaction consistency:
- unify loading/error/empty/success patterns across dashboard/ide/admin.
 - status 2026-03-01: `ADVANCED` (shared state classes now include success feedback in `styles/globals.css`; parity pass applied to `components/ide/FileExplorerPro.tsx`, `app/admin/apis/page.tsx`, `app/admin/collaboration/page.tsx`, `components/dashboard/DashboardAIChatTab.tsx`, and `app/settings/page.tsx` with explicit loading/error/empty/success contracts and no ambiguous partial CTA in canvas mode).
12. `P1-T` Performance metrics baseline:
- publish TTI/FCP/LCP + AI stream latency and track against targets.
 - status 2026-03-01: `ADVANCED` (route-level web vitals and AI latency telemetry integrated; `admin/analytics` now consumes `/api/admin/analytics/baseline` with P50/P95 + target comparisons + funnel checkpoints; `/dashboard` non-critical tabs are now lazy-loaded to reduce initial bundle pressure).
 - status 2026-03-01-b: `ADVANCED` (dashboard heavy runtime dependencies moved behind tab-local boundaries: `AgentCanvasTab` now owns React Flow state and `DashboardOverviewTab` lazy-loads `LivePreview`; local production build reduced `/dashboard` first-load JS from ~495kB to ~174kB in current profile output).
 - status 2026-03-01-c: `ADVANCED` (full `qa:enterprise-gate` executed green with new `qa:wcag-critical` stage and updated performance profile preserved in freeze evidence).
 - status 2026-03-01-d: `ADVANCED` (new `qa:dashboard-shell` guard enforces `AethelDashboard.tsx <= 1200` lines and blocks direct `@xyflow/react` coupling in shell path; gate wired in local enterprise chain and CI pre-audit/pre-compare workflows).
 - status 2026-03-01-e: `ADVANCED` (freeze chain revalidated after IPC cache-env hardening in `next.config.js`; full `qa:enterprise-gate` green with no `revalidateTag localhost:undefined` build crash).

### Gate for market-level UX claim
1. No "best in market" claim before:
- P0-K/P0-L/P0-M/P0-N/P0-O/P0-P evidence is published.

## 8. Delta 2026-03-01 (global repo gap wave)
### New immediate blockers from `32_GLOBAL_GAP_REGISTER_2026-03-01.md`
1. `P0-U` Large-file pressure wave:
- reduce `>=1200` file count from `26` by splitting top 10 hotspots in `lib/*` and `components/*`.
2. `P0-V` Blocking-dialog eradication:
- replace active `window.alert/confirm/prompt` usage (`32` hits) with canonical modal/toast flows.
3. `P0-W` Canonical read-order drift:
- include all active execution docs in `00_INDEX` read-order (current missing count: `0`, keep it stable).
4. `P0-X` Explicit NOT_IMPLEMENTED governance:
- keep `18` gated API surfaces explicit and documented; no silent fallback.

### Execution order extension
1. `P0-U`
2. `P0-V`
3. `P0-W`
4. `P0-X`
5. Continue `P1-Q..P1-T` only after the four blockers above are evidence-closed.

### Immediate closure note (2026-03-01)
1. `P0-W` is now closed in this wave:
- active canonical docs missing from `00_INDEX` read-order moved from `8` to `0` via `qa:global-gap-scan`.
2. `P0-V` is now closed in active runtime surfaces:
- blocking dialogs (`window.alert/confirm/prompt`) moved from `32` to `0` in active scope (deprecated-only residual = `4`).
3. `P0-U` progressed in this wave:
- large-file pressure reduced from `54` to `26` via shell/component/runtime decomposition and structural compaction.

## 9. Delta 2026-03-03 (L4/L5 core-loop blocking order)
### New blockers (strict order)
1. `P0-Y` Interface gate unblock:
- status: CLOSED (`not-implemented-ui=5`, threshold `6`, no threshold relaxation).
2. `P0-Z` Core-loop implementation:
- ship `ai/change/apply` and `ai/change/rollback` with deterministic artifacts and rollback safety.
3. `P1-U` Dependency-impact guard:
- mandatory impact analysis for high-risk scopes before apply.
4. `P1-V` Sandboxed execution path:
- execute plan/patch/validate/apply in isolated workspace with auditable run ledger.
5. `P1-W` Evidence-grade promotion telemetry:
- publish success/regression/cost metrics for L4 criteria.

### Scope freeze policy
1. Freeze new Games/Films/render-expansion work until `P0-Y` + `P0-Z` are closed.
2. Keep capability claims capped to current evidence (`L3 apps beta`, `L2 games/films`).

### Canonical references for this wave
1. `docs/master/26_CANONICAL_ALIGNMENT_BASELINE_2026-02-28.md`
2. `docs/master/32_GLOBAL_GAP_REGISTER_2026-03-01.md`
3. `docs/master/33_L4_L5_CORE_LOOP_PROMOTION_PROGRAM_2026-03-03.md`

### P0-Z status update (2026-03-03-b)
1. `ai/change/apply` now `PARTIAL` implemented:
- deterministic validation gate + single-file atomic write
- rollback snapshot token generated per apply.
2. `ai/change/rollback` now `PARTIAL` implemented:
- token ownership/ttl/single-use checks
- optional hash guard and deterministic restore.
3. `ai/change/apply` now includes first dependency-impact approval guard:
- blocks high fanout (`localImports > 40`) unless explicit approval field is present.
4. Batch capability now available in partial mode:
- apply supports `changes[]` up to 20 changes per request with per-change rollback token issuance;
- rollback supports `rollbackTokens[]` up to 20 tokens with deterministic pre-validation.
5. Evidence visibility added:
- `/api/ai/change/runs` now exposes per-user run history/summary;
- `/api/admin/ai/metrics` now reports change-run summary + samples.
6. Remaining to close full `P0-Z`:
- sandboxed multi-file apply path
- run-ledger artifacts + dependency-impact enforcement in apply flow.

### P0-X status update (2026-03-03-c)
1. AI provider-missing gates were normalized from hard `NOT_IMPLEMENTED` to explicit partial runtime gate:
- `error=AI_PROVIDER_NOT_CONFIGURED`
- `status=503`
- `capabilityStatus=PARTIAL`
2. Endpoints covered:
- `/api/ai/chat`
- `/api/ai/chat-advanced`
- `/api/ai/complete`
- `/api/ai/action`
- `/api/ai/inline-edit`
- `/api/ai/inline-completion`
3. Explicit `NOT_IMPLEMENTED` inventory now `2` (billing runtime branches only), per `32_GLOBAL_GAP_REGISTER_2026-03-01.md`.

### P0-Z status update (2026-03-03-c)
1. `ai/change/apply` now includes optional `executionMode=sandbox`:
- simulates apply in isolated temp workspace;
- returns deterministic hash/evidence payload;
- keeps primary workspace immutable in sandbox runs.
2. Remaining closure to full P0-Z:
- sandbox promotion from simulation to fully integrated isolated run with acceptance matrix execution (`lint/typecheck/build/smoke`) before apply promotion.
3. Evidence layer advanced:
- `change-runs` now includes grouped run view (`runGroups`) for faster operator triage.
4. Rollback orchestration advanced:
- `ai/change/rollback` now supports `runId` to restore full apply runs without manual token fanout.
5. Promotion telemetry visibility advanced:
- `/api/admin/ai/readiness` now publishes L4 gate metrics (`applySuccessRate`, `regressionRate`, `sandboxCoverage`, `sampleSize`) and `promotionEligible`.

### P0-A/P0-B status update (2026-03-04)
1. LEARN loop ingestion is now connected to IDE user behavior:
- inline apply success emits `accepted` feedback;
- inline apply rejection emits `needs_work` feedback when `runId` is available;
- manual rollback emits `rejected` feedback.
2. Apply/rollback batch envelope widened (`20 -> 50`) for controlled large waves without contract break.
3. Optional onboarding demo fallback added for provider-missing flows (guarded by `AETHEL_AI_DEMO_MODE`) across core AI endpoints, preserving explicit `PARTIAL` contract and setup guidance.
4. Provider preflight now exposes `demoModeEnabled` via `/api/ai/provider-status`; IDE/dashboard suppress hard provider gate when demo is enabled to keep first-value path unblocked.
5. Demo fallback now includes per-user daily budget enforcement with explicit overflow contract (`429 AI_DEMO_LIMIT_REACHED`) to keep cost/risk bounded while preserving first-value access.
