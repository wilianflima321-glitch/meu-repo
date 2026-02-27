# 20_P1_P2_PRIORITY_EXECUTION_LIST_2026-02-17
Status: DECISION-COMPLETE EXECUTION LIST
Date: 2026-02-17
Source Base: `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md`

## 0. Scope
This backlog is limited to P1/P2 hardening on the current product scope:
1. single shell `/ide`
2. explicit capability gates
3. no new product shell
4. no fake success

## 1. P1 Priorities (Execute First)
### P1-00 Studio Home Entry Hardening
1. Objective: make `/dashboard` the professional chat/preview-first mission entry.
2. Files:
- `cloud-web-app/web/app/dashboard/page.tsx`
- `cloud-web-app/web/components/studio/StudioHome.tsx`
- `cloud-web-app/web/lib/server/studio-home-store.ts`
- `cloud-web-app/web/app/api/studio/**/route.ts`
3. Done criteria:
- mission -> plan -> run -> validate -> apply -> rollback works end-to-end
- one-click handoff to `/ide` keeps `projectId`
- full access is scoped, timeboxed and auditable
- no fake CTA on blocked capability

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
- `audit dicas do emergent usar/19_RUNTIME_ENV_WARNING_RUNBOOK_2026-02-17.md`
3. Done criteria:
- warning inventory updated with root-cause status
- no regression in `qa:enterprise-gate`

### P1-06 Studio Home Payload Optimization
1. Objective: reduce default `/dashboard` load without feature regression.
2. Files:
- `cloud-web-app/web/app/dashboard/page.tsx`
- `cloud-web-app/web/app/dashboard/legacy/page.tsx`
- `cloud-web-app/web/components/studio/StudioHome.tsx`
3. Done criteria:
- legacy dashboard isolated behind dedicated fallback route
- runtime preview loaded only on explicit opt-in
- no regression in session orchestration or IDE handoff

### P1-07 Security Baseline (External report absorption)
1. Objective: harden critical auth/AI/billing endpoints with explicit protection.
2. Files:
- `cloud-web-app/web/lib/server/rate-limit.ts`
- `cloud-web-app/web/app/api/**/route.ts` (critical only)
- `cloud-web-app/web/next.config.js`
3. Done criteria:
- rate limit enforced on critical endpoints
- security headers present in `next.config.js`
- input validation for high-risk endpoints

### P1-08 Test Confidence Baseline (External report absorption)
1. Objective: add smoke/e2e coverage on Studio Home and Workbench flows.
2. Files:
- `cloud-web-app/web/tests/**`
- `cloud-web-app/web/playwright.config.ts`
3. Done criteria:
- minimal smoke suite for `/dashboard` and `/ide`
- regression tests flagged in CI (no bypass)

### P1-09 Performance Telemetry Baseline (External report absorption)
1. Objective: capture minimal performance and cost metrics for core flows.
2. Files:
- `cloud-web-app/web/components/studio/StudioHome.tsx`
- `cloud-web-app/web/app/api/studio/cost/live/route.ts`
- `cloud-web-app/web/docs/AI_RUNTIME_SLO.md`
3. Done criteria:
- session cost/latency metrics visible
- performance budget targets documented (no claims without evidence)

## 2. P2 Priorities (After P1 Freeze)
### P2-01 Collaboration Readiness Gate
1. Objective: formalize stability claims before promotion.
2. Files:
- `audit dicas do emergent usar/14_MULTI_AGENT_ENTERPRISE_TRIAGE_2026-02-13.md`
- `cloud-web-app/web/docs/AI_RUNTIME_SLO.md`
3. Done criteria:
- explicit SLO for reconnect/conflict/concurrency
- status remains `PARTIAL` until criteria met

### P2-02 Agentic Promotion Gate (L4/L5)
1. Objective: block inflated claims without evidence.
2. Files:
- `audit dicas do emergent usar/13_CRITICAL_AGENT_LIMITATIONS_QUALITIES_2026-02-13.md`
- `audit dicas do emergent usar/17_CAPABILITY_ENDPOINT_MATRIX_2026-02-16.md`
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
1. P1-00
2. P1-01
2. P1-02
3. P1-03
4. P1-04
5. P1-05
6. P1-06
7. P1-07
8. P1-08
9. P1-09
10. P2-01
11. P2-02
12. P2-03
13. P2-04

## 4. Mandatory Gate Before Marking Any Item Done
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `npm run qa:interface-gate`
5. `npm run qa:architecture-gate`
6. `npm run qa:canonical-components`
7. `npm run qa:route-contracts`
8. `npm run qa:no-fake-success`
9. `npm run qa:mojibake`
10. `npm run qa:enterprise-gate`

## Delta 2026-02-20 - Post-connectivity residual backlog

### P1 (next closure wave)
1. Reduce `LEGACY_ACTIVE` directory footprint (`cloud-admin-ia`, `infra-playwright-ci-agent`, snapshots) with explicit keep/remove decisions.
2. Preserve `oversizedFiles=0` and block regressions in new PRs (no new monoliths `>=1200` lines).
3. Collapse remaining workflow overlap into a single CI authority map with owner + trigger scope.
4. Normalize root historical README encoding/copy drift and keep canonical references only.

### P2 (structural)
1. Evaluate nested `meu-repo/` tree (`EXTERNAL_ONLY`) for extraction/archive to reduce repo cognitive load.
2. Promote connectivity scanner from path checks to include dead-script detection and stale workflow trigger detection.

### Delivered in this wave
1. Added `.github/CODEOWNERS` baseline ownership mapping for critical surfaces (`dashboard`, `ide`, `admin`, `api`, `ai`, `billing`, governance/docs).

### Delivered in this wave (governance)
1. Added workflow governance scan + canonical matrix (`26_WORKFLOW_GOVERNANCE_MATRIX_2026-02-20.md`).
2. Reduced authority workflow governance issues to zero.
3. Added governance gate evidence requirement in PR templates and branch policy.

### Residual governance note
1. Remaining legacy workflow candidate after hardening: `.github/workflows/merge-unrelated-histories.yml` (manual-only utility).

## Delta 2026-02-22 - One-shot closure alignment
1. Added canonical one-shot closure checklist:
- `audit dicas do emergent usar/31_ONE_SHOT_CLOSURE_EXECUTION_2026-02-22.md`
2. Current factual baseline used by closure checklist:
- interface critical: `not-implemented-ui=6`, `not-implemented-noncritical=2`, all high-severity UI metrics at zero
- architecture critical: `apiNotImplemented=8`, `fileCompatWrappers=8`, `oversizedFiles>=1200=0`, `duplicateBasenames=0`
- governance scans: `repo-connectivity=0 missing`, `workflow-governance=0 issues`, `canonical-doc-governance=0 issues`, `critical-secret-scan=0 findings`
3. Remaining hard closure blockers continue to be:
- consolidated freeze gate run (`lint`, `typecheck`, `build`, `qa:enterprise-gate`)
- residual capability gates intentionally explicit in critical APIs (no fake success allowed)

## Delta 2026-02-22 - Subarea matrix binding
1. Bound this backlog to the new detailed subarea source:
- `33_COMPLETE_SUBAREA_ALIGNMENT_AND_GAP_MATRIX_2026-02-22.md`.
2. Rule:
- every P1/P2 item must map to at least one row in doc `33` before status promotion.

## Delta 2026-02-22 - Agentic action safety backlog binding
1. Added canonical guardrail source for parallel autonomy + usability:
- `35_AGENTIC_PARALLEL_CAPABILITIES_AND_USABILITY_GUARDRAILS_2026-02-22.md`.
2. New P1 continuity items:
- keep Full Access action-class policy strict and visible in Studio UX;
- publish connector-level capability matrix (read/write/transaction) before enabling external account automations;
- keep hard block for high-risk classes until compliance gate is complete.

## Delta 2026-02-22 - Active surface hygiene binding
1. Added structural hygiene gate:
- `qa:active-surface-hygiene`
2. Rule:
- empty directories in active product surfaces (`app/components/lib/hooks`) must be zero unless explicitly justified in canonical docs.

## Delta 2026-02-22 - Connector matrix binding
1. Added connector safety source:
- `38_CONNECTOR_CAPABILITY_AND_RISK_MATRIX_2026-02-22.md`.
2. Rule:
- no connector-level "can do anything" claim is allowed without matching action class + policy status in doc `38`.

### Delivered in this wave (architecture debt)
1. Reduced oversized source baseline from `34` to `31` via structural extraction:
- `StudioHome`: types/utils split
- `post-processing-system`: types/shader chunks split
- `HairFurEditor`: shared core split
- `SettingsUI`: models/default settings split
2. Reduced oversized source baseline from `31` to `30` via Hair/Fur runtime contract extraction:
- `lib/hair-fur-types.ts`
- `lib/hair-fur-system.ts` type import/re-export update
3. Reduced oversized source baseline from `30` to `29` via Theme service contract extraction:
- `lib/theme/theme-types.ts`
- `lib/theme/theme-service.ts` type import/re-export update
4. Reduced oversized source baseline from `29` to `28` via Networking runtime contract extraction:
- `lib/networking-multiplayer-types.ts`
- `lib/networking-multiplayer.ts` contract import/re-export update
5. Reduced oversized source baseline from `28` to `25` via multi-module extraction:
- `lib/engine/particle-system-types.ts`
- `lib/engine/physics-engine-types.ts`
- `lib/mcp/aethel-mcp-filesystem.ts`
6. Reduced oversized source baseline from `25` to `24` via physics-system decomposition:
- `lib/physics/physics-system-types.ts`
- `lib/physics/physics-aabb.ts`
- `lib/physics/physics-system.ts` contract import/re-export update
7. Reduced oversized source baseline from `24` to `23` via hot-reload decomposition:
- `lib/hot-reload/hot-reload-server-types.ts`
- `lib/hot-reload/hot-reload-server.ts` contract import/re-export update
8. Reduced oversized source baseline from `23` to `22` via scene-graph decomposition:
- `lib/engine/scene-graph-types.ts`
- `lib/engine/scene-graph-builtins.ts`
- `lib/engine/scene-graph.ts` contract and built-in import/re-export updates
9. Reduced oversized source baseline from `22` to `21` via PBR shader-source decomposition:
- `lib/pbr-shader-sources.ts`
- `lib/pbr-shader-pipeline.ts` shader source import/export compatibility update
10. Reduced oversized source baseline from `21` to `20` via WebXR decomposition:
- `lib/webxr-vr-types.ts`
- `lib/webxr-vr-ui-haptics.ts`
- `lib/webxr-vr-system.ts` contract/runtime import-re-export update
11. Reduced oversized source baseline from `20` to `19` via motion-matching decomposition:
- `lib/motion-matching-types.ts`
- `lib/motion-matching-runtime-helpers.ts`
- `lib/motion-matching-system.ts` contract/runtime import-re-export update
12. Reduced oversized source baseline from `19` to `18` via cloth GPU decomposition:
- `lib/cloth-simulation-gpu.ts`
- `lib/cloth-simulation.ts` runtime import/re-export update
13. Reduced oversized source baseline from `18` to `17` via i18n dictionary sharding:
- `lib/translations-types.ts`
- `lib/translations-locales.ts`

### Delivered in this wave (studio reliability)
1. Added explicit variable-usage hard gate in studio execution endpoints (`402 VARIABLE_USAGE_BLOCKED`).
2. Added budget threshold contract (`50/80/100`) to studio telemetry endpoints and surfaced in Studio Ops UI.
3. Reduced near-limit architecture debt by decomposing `lib/server/studio-home-store.ts` helper set into:
- `lib/server/studio-home-runtime-helpers.ts`
4. Updated architecture critical baseline:
- `oversizedFiles>=1200=0`
- `nearLimitFiles(1100-1199)=61`
5. Architecture gate now blocks near-limit regressions:
- `nearLimitFiles <= 61`
- `lib/translations-locale-en.ts`
- `lib/translations-locale-pt.ts`
- `lib/translations-locale-es.ts`
- `lib/translations.ts` compatibility wrapper update
14. Reduced oversized source baseline from `17` to `16` via DetailsPanel editor extraction:
- `components/engine/DetailsPanelEditors.tsx`
- `components/engine/DetailsPanel.tsx` orchestration-only refactor
15. Reduced oversized source baseline from `16` to `15` via Visual Scripting catalog/type extraction:
- `components/visual-scripting/visual-script-types.ts`
- `components/visual-scripting/visual-script-catalog.ts`
- `components/visual-scripting/VisualScriptEditor.tsx` import/re-export compatibility update
16. Reduced oversized source baseline from `15` to `14` via Scene Editor panel extraction:
- `components/scene-editor/SceneEditorPanels.tsx`
- `components/scene-editor/SceneEditor.tsx` runtime/panel concern separation
17. Reduced oversized source baseline from `14` to `13` via AI Chat panel decomposition:
- `components/ide/AIChatPanelPro.types.ts`
- `components/ide/AIChatPanelPro.format.ts`
- `components/ide/AIChatPanelPro.tsx` contract/helper import surface
18. Reduced oversized source baseline from `13` to `12` via Terrain panel decomposition:
- `components/terrain/TerrainSculptingPanels.tsx`
- `components/terrain/TerrainSculptingEditor.tsx` runtime/panel concern separation
19. Reduced oversized source baseline from `12` to `11` via OpenAPI payload decomposition:
- `lib/openapi-spec-paths.ts`
- `lib/openapi-spec-components.ts`
- `lib/openapi-spec.ts` composition update
20. Reduced oversized source baseline from `11` to `10` via Animation Blueprint panel decomposition:
- `components/animation/AnimationBlueprintPanels.tsx`
- `components/animation/AnimationBlueprintEditor.tsx` runtime/panel concern separation
21. Reduced oversized source baseline from `10` to `9` via Level Editor panel decomposition:
- `components/engine/LevelEditorPanels.tsx`
- `components/engine/LevelEditor.tsx` runtime/panel concern separation
22. Reduced oversized source baseline from `9` to `8` via Fluid Simulation Editor panel decomposition:
- `components/physics/FluidSimulationEditorPanels.tsx`
- `components/physics/FluidSimulationEditor.tsx` runtime/panel concern separation
23. Reduced oversized source baseline from `8` to `7` via Quest renderer decomposition:
- `lib/quest-mission-renderers.ts`
- `lib/quest-mission-system.ts` runtime/renderer concern separation
24. Reduced oversized source baseline from `7` to `1` via cross-domain decomposition wave:
- `lib/ai-audio-engine.types.ts`
- `lib/ai-audio-engine-analysis.ts`
- `lib/vfx-graph-builtins.ts`
- `components/video/VideoTimelineEditorPanels.tsx`
- `components/media/MediaStudio.utils.ts`
- `lib/ai/behavior-tree-utility.ts`
- `lib/ai/behavior-tree-react.tsx`
- `lib/fluid-surface-reconstructor.ts`
25. Reduced oversized source baseline from `1` to `0` via dashboard decomposition:
- `components/dashboard/AethelDashboardPrimaryTabContent.tsx`
- `components/dashboard/AethelDashboardSecondaryTabContent.tsx`
- `components/dashboard/useAethelDashboardDerived.ts`
- `components/AethelDashboard.tsx` shell orchestration refactor

## Delta 2026-02-20 - Governance closure update

### Delivered in this wave (governance + security hygiene)
1. Connectivity scanner upgraded with dead script-chain detection (`deadScriptReferences` metric).
2. Workflow governance scanner upgraded with stale trigger-path detection (`staleTriggerPaths` metric).
3. Script-path optional debt removed:
- `desktop:dev` and `desktop:build` now use guarded helper `tools/run-optional-workspace-script.mjs`.
4. New critical secret hygiene gate delivered:
- `tools/critical-secret-scan.mjs`
- `npm run qa:secrets-critical`
- canonical evidence: `27_CRITICAL_SECRET_SCAN_2026-02-20.md`.
5. CI authority wiring updated:
- `.github/workflows/ci.yml`
- `.github/workflows/main.yml`
6. Tracked token artifact removed and ignore policy added:
- deleted `meu-repo/.gh_token`
- `.gitignore` includes `.gh_token` patterns.

### Updated factual baseline
1. `25_REPO_CONNECTIVITY_MATRIX_2026-02-20.md`:
- `requiredMissing=0`
- `optionalMissing=0`
- `deadScriptReferences=0`.
2. `26_WORKFLOW_GOVERNANCE_MATRIX_2026-02-20.md`:
- `staleTriggerPaths=0`
- `issues=0`.
3. `27_CRITICAL_SECRET_SCAN_2026-02-20.md`:
- `findings=0` (active surfaces).

### Residual backlog (unchanged priority)
1. Keep legacy-candidate workflow owner decision explicit (`merge-unrelated-histories.yml`).
2. Decide archival boundary for nested `meu-repo/` tree (`EXTERNAL_ONLY` classification).
3. Run full freeze gates in one batch as planned (deferred by request in this wave).

### Delivered in this wave (Studio Home interface organization)
1. Decomposed `/dashboard` shell UI into focused blocks:
- `cloud-web-app/web/components/studio/StudioHomeMissionPanel.tsx`
- `cloud-web-app/web/components/studio/StudioHomeTaskBoard.tsx`
- `cloud-web-app/web/components/studio/StudioHomeTeamChat.tsx`
- `cloud-web-app/web/components/studio/StudioHomeRightRail.tsx`
2. Preserved `cloud-web-app/web/components/studio/StudioHome.tsx` as orchestration boundary.
3. Updated `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md` with new block-level entry points.
4. Revalidated architecture triage baseline with decomposition preserved (`oversizedFiles=0`, `duplicateBasenames=0`).

### Delivered in this wave (IDE route modularization)
1. Extracted `/ide` route dialog/status hooks into:
- `cloud-web-app/web/components/ide/WorkbenchDialogs.tsx`
2. Extracted shared workbench utils into:
- `cloud-web-app/web/components/ide/workbench-utils.tsx`
3. Extracted entry/query context maps into:
- `cloud-web-app/web/components/ide/workbench-context.ts`
4. Extracted static workbench info panel surfaces into:
- `cloud-web-app/web/components/ide/WorkbenchPanels.tsx`
5. Extracted handoff context banner into:
- `cloud-web-app/web/components/ide/WorkbenchContextBanner.tsx`
6. Updated `cloud-web-app/web/app/ide/page.tsx` to orchestration boundary using the extracted modules.
7. Updated `18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17.md` with new IDE surface boundaries.

### Delivered in this wave (15-agent total audit package)
1. Added canonical closure/audit pack:
- `audit dicas do emergent usar/28_15_AGENT_TOTAL_AUDIT_2026-02-20.md`
2. Registered in canonical index:
- `audit dicas do emergent usar/00_FONTE_CANONICA.md`
3. Refreshed generated governance evidence baselines:
- `25`: `requiredMissing=0`, `optionalMissing=0`, `deadScriptReferences=0`
- `26`: `staleTriggerPaths=0`, `issues=0`
- `27`: `findings=0`

### Delivered in this wave (canonical doc governance hardening)
1. Added scanner:
- `tools/canonical-doc-governance-scan.mjs`
2. Added root gate:
- `npm run qa:canonical-doc-governance`
3. Added CI enforcement:
- `.github/workflows/ci.yml`
- `.github/workflows/main.yml`
4. Added canonical evidence:
- `audit dicas do emergent usar/29_CANONICAL_DOC_GOVERNANCE_MATRIX_2026-02-20.md`
5. Refreshed governance baselines:
- `25`: `totalChecks=31`, `requiredMissing=0`, `optionalMissing=0`, `deadScriptReferences=0`, `markdownTotal=3634`, `markdownCanonical=32`
- `26`: `staleTriggerPaths=0`, `issues=0`
- `27`: `findings=0`
- `29`: `missingListedCanonicalDocs=0`, `canonicalNameConflictsOutside=0`

### Delivered in this wave (IDE first-minute UX hardening)
1. Added interactive empty state actions in IDE editor region:
- `Open File`
- `New File`
2. Added dedicated IDE status bar component with:
- unsaved file counter
- project/workspace/file context
- session hint and shortcut hint
3. Updated surface map (`18`) with `WorkbenchStatusBar.tsx`.

### Delivered in this wave (encoding + canonical governance closure)
1. Reduced `qa:mojibake` findings to zero:
- `cloud-web-app/web/lib/mcp/aethel-mcp-server.ts`
- `cloud-web-app/web/docs/MOJIBAKE_SCAN.md`
2. Hardened canonical parser:
- `tools/canonical-doc-governance-scan.mjs` now handles backtick-listed markdown entries.
3. Canonical governance baseline now reconciled:
- `29`: `canonicalListedDocs=32`, `canonicalMarkdownFiles=32`, `unindexedCanonicalMarkdown=0`.

### Delivered in this wave (Studio Home quality pass)
1. Added normalized mission input handlers in Studio Home:
- project id sanitization
- budget cap clamping
2. Added explicit disabled-state reasoning for mission start and task board actions.
3. Improved professional telemetry readability in Team Chat (role/cost formatting).
4. Aligned ops pressure label with canonical budget-pressure computation.

### Delivered in this wave (Admin enterprise consistency pass)
1. Introduced shared admin primitives:
- `cloud-web-app/web/components/admin/AdminSurface.tsx`
2. Refactored high-traffic admin pages to shared primitives and consistent state handling:
- `cloud-web-app/web/app/admin/page.tsx`
- `cloud-web-app/web/app/admin/payments/page.tsx`
- `cloud-web-app/web/app/admin/apis/page.tsx`
- `cloud-web-app/web/app/admin/security/page.tsx`
3. Standardized operational copy and removed mojibake-prone strings in payment admin flow.

### Delivered in this wave (Admin shell reliability + engine type closure)
1. Updated `cloud-web-app/web/app/admin/layout.tsx`:
- authenticated SWR fetcher for `/api/admin/status` and `/api/admin/quick-stats`
- explicit unavailable-state hints for telemetry gaps
- removed dead-end shell action by targeting `/admin/security`
2. Fixed engine type syntax blocker:
- `cloud-web-app/web/lib/engine/particle-system-types.ts` interface closure restored.

### Delivered in this wave (Emergency operations parity)
1. Added missing emergency admin surface:
- `cloud-web-app/web/app/admin/emergency/page.tsx`
2. Updated admin shell nav + CTA to point to `/admin/emergency` now that the route exists.

### Delivered in this wave (Legacy route guard)
1. Updated `cloud-web-app/web/app/dashboard/legacy/page.tsx`:
- redirect to `/dashboard` unless `NEXT_PUBLIC_ENABLE_LEGACY_DASHBOARD=true`.

### Delivered in this wave (AI monitor cleanup)
1. Refactored `cloud-web-app/web/app/admin/ai-monitor/page.tsx`:
- removed duplicate header/action surfaces
- unified operational copy and emergency CTA
- added explicit authenticated fetch + error/loading states.

### Delivered in this wave (Admin long-tail consistency)
1. Added shared helper:
- `cloud-web-app/web/components/admin/adminAuthFetch.ts`
2. Refactored:
- `cloud-web-app/web/app/admin/analytics/page.tsx`
- `cloud-web-app/web/app/admin/real-time/page.tsx`
3. Normalized touched admin operation pages to UTF-8 encoding to avoid tooling drift.

### Delivered in this wave (Admin management surfaces)
1. Refactored:
- `cloud-web-app/web/app/admin/ai-upgrades/page.tsx`
- `cloud-web-app/web/app/admin/updates/page.tsx`
2. Applied consistent shell/state patterns and authenticated admin fetch behavior.

### Delivered in this wave (Admin users/support surfaces)
1. Refactored:
- `cloud-web-app/web/app/admin/users/page.tsx`
- `cloud-web-app/web/app/admin/support/page.tsx`
2. Applied shared primitives for table states, filter actions, and authenticated fetch behavior.

### Delivered in this wave (Admin flags/promotions surfaces)
1. Refactored:
- `cloud-web-app/web/app/admin/feature-flags/page.tsx`
- `cloud-web-app/web/app/admin/promotions/page.tsx`
2. Applied shared shell/state patterns and authenticated admin fetch behavior for read/write flows.

### Delta 2026-02-21 - Admin surface closure + gate enforcement
1. Admin surface residual now closed (`missing shell=0`, `missing admin auth fetch=0`).
2. `qa:admin-surface` added to `qa:enterprise-gate` for CI enforcement.

## Delta 2026-02-21 - Admin surface normalization wave

### Delivered in this wave
1. Standardized `cloud-web-app/web/app/admin/notifications/page.tsx` to shared admin UX primitives (`AdminPageShell`, status banner, stat grid, table state rows).
2. Standardized `cloud-web-app/web/app/admin/subscriptions/page.tsx` with authenticated fetch flow and explicit state handling.
3. Standardized `cloud-web-app/web/app/admin/audit-logs/page.tsx` with shared shell, auth fetch, and deterministic export action.
4. Added sweep tooling: `cloud-web-app/web/scripts/admin-surface-scan.mjs` + `cloud-web-app/web/docs/ADMIN_SURFACE_SWEEP.md`.
5. Added scripts in `cloud-web-app/web/package.json`:
- `qa:admin-surface`
- `docs:admin-surface-sweep`

### Current residual from sweep
1. `missing AdminPageShell`: `28`
2. `direct fetch without adminJsonFetch`: `33`
3. `mojibake candidates`: `0`

### Next P1 execution target
1. Prioritize remaining high-traffic admin pages for conversion: `finance`, `automation`, `compliance`, `cost-optimization`, `roles`, `rate-limiting`.
2. Keep scan report regenerated on each admin-hardening wave.

## Delta 2026-02-21 - Admin conversion wave 2

### Delivered in this wave
1. Refactored admin pages to shared enterprise surfaces:
- `cloud-web-app/web/app/admin/automation/page.tsx`
- `cloud-web-app/web/app/admin/compliance/page.tsx`
- `cloud-web-app/web/app/admin/cost-optimization/page.tsx`
- `cloud-web-app/web/app/admin/roles/page.tsx`
- `cloud-web-app/web/app/admin/rate-limiting/page.tsx`
2. All five pages now use:
- `AdminPageShell`
- `adminJsonFetch`
- explicit table/loading/error state patterns.

### Updated residual from `qa:admin-surface`
1. `missing AdminPageShell: 23` (from 28)
2. `direct fetch without adminJsonFetch: 28` (from 33)
3. `mojibake candidates: 0`

### Next target set
1. `finance`
2. `backup`
3. `moderation`
4. `marketplace`
5. `infrastructure`

## Delta 2026-02-21 - Admin conversion wave 3

### Delivered in this wave
1. Refactored admin pages to shared enterprise surfaces:
- `cloud-web-app/web/app/admin/backup/page.tsx`
- `cloud-web-app/web/app/admin/marketplace/page.tsx`
- `cloud-web-app/web/app/admin/ip-registry/page.tsx`
2. Added explicit action feedback and authenticated API handling for backup/restore and IP registry operations.

### Updated residual from `qa:admin-surface`
1. `missing AdminPageShell: 20` (from 23)
2. `direct fetch without adminJsonFetch: 25` (from 28)
3. `mojibake candidates: 0`

## Delta 2026-02-21 - Admin conversion wave 4

### Delivered in this wave
1. Refactored `cloud-web-app/web/app/admin/page.tsx` to use `adminJsonFetch` and removed local token fetcher duplication.
2. Standardized copy and state messaging in the root admin console.

### Updated residual from `qa:admin-surface`
1. `missing AdminPageShell: 20`
2. `direct fetch without adminJsonFetch: 24` (from 25)
3. `mojibake candidates: 0`

## Delta 2026-02-21 - Admin auth-fetch convergence wave

### Delivered in this wave
1. Replaced local token/header fetch patterns with `adminJsonFetch` in:
- `cloud-web-app/web/app/admin/apis/page.tsx`
- `cloud-web-app/web/app/admin/payments/page.tsx`
- `cloud-web-app/web/app/admin/security/page.tsx`
- `cloud-web-app/web/app/admin/emergency/page.tsx`
2. Reduced duplicated auth-header code and standardized API error handling in these high-impact admin pages.

### Updated residual from `qa:admin-surface`
1. `missing AdminPageShell: 20`
2. `direct fetch without adminJsonFetch: 20` (from 24)
3. `mojibake candidates: 0`

## Delta 2026-02-21 - Admin conversion wave 6

### Delivered in this wave
1. Converted to shared admin surfaces and authenticated helper:
- `cloud-web-app/web/app/admin/arpu-churn/page.tsx`
- `cloud-web-app/web/app/admin/onboarding/page.tsx`
- `cloud-web-app/web/app/admin/collaboration/page.tsx`
- `cloud-web-app/web/app/admin/multi-tenancy/page.tsx`
- `cloud-web-app/web/app/admin/chat/page.tsx`
- `cloud-web-app/web/app/admin/indexing/page.tsx`
- `cloud-web-app/web/app/admin/deploy/page.tsx`
2. Standardized explicit loading/error/empty flows and removed route-local fetch/header duplication.

### Updated residual from `qa:admin-surface`
1. `missing AdminPageShell: 13` (from 20)
2. `direct fetch without adminJsonFetch: 13` (from 20)
3. `mojibake candidates: 0`


## Delta 2026-02-22 - Execution tracking update
Closed in this wave:
1. `UX-CTA-01` Remove ambiguous CTA in dashboard gated tabs -> DONE.
2. `ARCH-NEARLIMIT-03` Decompose MediaStudio shell layout -> DONE.
3. `ARCH-NEARLIMIT-04` Reduce top near-limit files count (`61 -> 59`) -> DONE.

Remaining priority queue:
1. Continue decomposition on next top near-limit modules (`AIChatPanelPro.tsx`, `networking-multiplayer.ts`, `behavior-tree.ts`).
2. Freeze full gate suite remains deferred for final consolidation by user policy.


## Delta 2026-02-22 - Execution tracking update (second wave)
Closed in this wave:
1. `ARCH-NEARLIMIT-05` Modularize `AIChatPanelPro` into widgets module -> DONE.
2. `ARCH-NEARLIMIT-06` Reduce near-limit baseline (`59 -> 58`) -> DONE.

Remaining priority queue:
1. Continue decomposition on top near-limit engine/networking modules.
2. Keep freeze suite deferred until final consolidation run by policy.


## Delta 2026-02-22 - Execution tracking update (third wave)
Closed in this wave:
1. `UX-PREVIEW-01` Unify Live Preview controls into docked/organized layout -> DONE.
2. `UX-PREVIEW-02` Add hidden chrome pattern (toggleable bars) -> DONE.
3. `UX-PREVIEW-03` Remove duplicate joystick/control clutter and runtime logs -> DONE.

Remaining queue (P1/P2):
1. Continue convergence of dashboard monolith decomposition.
2. Continue near-limit reductions in engine/networking modules.


## Delta 2026-02-22 - Execution tracking update (fourth wave)
Closed in this wave:
1. `ARCH-NEARLIMIT-07` Modularize `XTerminal` UI shell blocks -> DONE.
2. `ARCH-NEARLIMIT-08` Reduce near-limit baseline (`58 -> 57`) -> DONE.

Remaining queue:
1. Continue decomposition in top engine/networking near-limit files.
2. Keep freeze suite deferred until final consolidated run.


## Delta 2026-02-22 - Execution tracking update (fifth wave)
Closed in this wave:
1. `ARCH-NEARLIMIT-09` Decompose `AethelDashboard` config/types/helpers -> DONE.
2. `ARCH-NEARLIMIT-10` Reduce near-limit baseline (`57 -> 56`) -> DONE.

Remaining queue:
1. Continue decomposition in top engine/networking near-limit files.
2. Keep final freeze suite for consolidated end-of-wave execution.

## Delta 2026-02-22 - Execution tracking update (freeze closure wave)
Closed in this wave:
1. `REL-FREEZE-01` Consolidated full freeze suite execution -> DONE.
2. `REL-FREEZE-02` Enterprise gate closure with build/type/contracts/security scans -> DONE.
3. `REL-FREEZE-03` Canonical closure docs synced with freeze evidence (`10/13/14/31`) -> DONE.

Remaining queue (strictly P1/P2 after freeze):
1. `ARCH-NEARLIMIT-P1` Continue decomposition from `nearLimitFiles=42` toward internal target (`<=30`).
2. `CAPABILITY-P1` Keep explicit gated endpoints visible and non-CTA until runtime implementation exists (AI provider/runtime cancel/billing gateway set).
3. `OPS-P1` Telemetry-driven deprecation follow-up for legacy `410` routes through the 2-cycle policy window.

## Delta 2026-02-22 - Execution tracking update (decomposition wave post-freeze)
Closed in this wave:
1. `ARCH-NEARLIMIT-11` Extract WebRTC transport module from multiplayer monolith -> DONE.
2. `ARCH-NEARLIMIT-12` Extract Marschner shader module from hair/fur monolith -> DONE.
3. `ARCH-NEARLIMIT-13` Tighten architecture gate baseline (`nearLimitFiles 42 -> 40`) -> DONE.

Remaining queue:
1. Continue top-offender decomposition to move from `nearLimitFiles=40` toward `<=30`.
2. Keep capability-gated endpoints explicit and non-CTA until runtime implementation exists.
3. Keep legacy deprecation cutoff policy tied to telemetry windows.

## Delta 2026-02-22 - Execution tracking update (decomposition wave continuation)
Closed in this wave:
1. `ARCH-NEARLIMIT-14` Extract sequencer keyframe interpolator from `sequencer-cinematics` -> DONE.
2. `ARCH-NEARLIMIT-15` Extract SDK public type surface from `aethel-sdk` -> DONE.
3. `ARCH-NEARLIMIT-16` Tighten architecture gate baseline (`nearLimitFiles 40 -> 38`) -> DONE.
4. `DX-CMD-01` Harden root `check:syntax` command in partial local environments -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=38` toward internal target `<=30`.
2. Keep capability gates explicit until runtime-backed implementation exists.
3. Continue canonical/historical docs hygiene wave (historical markdown volume remains high).

## Delta 2026-02-22 - Execution tracking update (cutscene wave)
Closed in this wave:
1. `ARCH-NEARLIMIT-17` Extract cutscene easing map to dedicated module -> DONE.
2. `ARCH-NEARLIMIT-18` Tighten architecture baseline (`nearLimitFiles 38 -> 37`) -> DONE.
3. `REL-GATE-POSTWAVE-03` Re-run full `qa:enterprise-gate` after decomposition -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=37` toward `<=30`.
2. Keep capability gates explicit/non-CTA until implementation exists.
3. Keep governance hygiene track for historical markdown consolidation.

## Delta 2026-02-22 - Execution tracking update (AAA character/story plan ingestion)
Added tracked items from canonical plan `32_STUDIO_AAA_CHARACTER_STORY_QUALITY_PLAN_2026-02-22.md`:
1. `CANON-P0-01` Add project-level `Character Identity Pack` and lock states.
2. `CANON-P0-02` Add project-level `Story Canon` with `draft/approved/locked`.
3. `VALID-P0-01` Add narrative continuity validator in reviewer gate.
4. `VALID-P0-02` Add character consistency validator in reviewer gate.
5. `VALID-P1-03` Add cinematic temporal consistency checks.
6. `AUDIO-P1-01` Add voice/loudness consistency checks for production pipeline.

## Delta 2026-02-23 - Execution tracking update (studio checkpoint realism + bounded context)
Closed in this wave:
1. `STUDIO-P0-REALITY-01` Normalize studio task mutation claims to `PARTIAL` where execution is orchestration-checkpoint only -> DONE.
2. `STUDIO-P0-REALITY-02` Enforce `executionReality=orchestration-checkpoint` markers in route-contract scanner -> DONE.
3. `STUDIO-P0-STABILITY-01` Add bounded retention for tasks/runs/messages in studio session store -> DONE.
4. `UX-P0-TRANSPARENCY-02` Add explicit no-fake-success checkpoint copy in Studio Task Board -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=36` toward internal target `<=30`.
2. Expand reviewer validators from checkpoint semantics to real artifact checks for games/films/apps tracks.
3. Keep capability gates explicit/non-CTA until runtime implementation exists.

## Delta 2026-02-23 - Execution tracking update (wave strategy refinement)
Closed in this wave:
1. `STUDIO-P0-COST-04` Added `run-wave` strategy contract (`balanced|cost_guarded|quality_first`) with explicit telemetry (`maxStepsApplied`, `strategyReason`) -> DONE.
2. `STUDIO-P0-UX-03` Added Task Board strategy selector + persistence and explanatory copy -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=36` toward internal target `<=30`.
2. Expand reviewer validators from checkpoint semantics to real artifact checks for games/films/apps tracks.
3. Keep capability gates explicit/non-CTA until runtime implementation exists.

## Delta 2026-02-23 - Execution tracking update (reviewer deterministic gate)
Closed in this wave:
1. `STUDIO-P0-VALID-02` Replaced marker-only reviewer validation with deterministic multi-check gate -> DONE.
2. `STUDIO-P0-TRACE-01` Added explicit failure report emission in session timeline for validation diagnostics -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=36` toward internal target `<=30`.
2. Expand reviewer validators from orchestration checks to real artifact/runtime evidence per domain (games/films/apps).
3. Keep capability gates explicit/non-CTA until runtime implementation exists.

## Delta 2026-02-23 - Execution tracking update (domain-aware reviewer checks)
Closed in this wave:
1. `STUDIO-P0-VALID-03` Added domain marker validation (`[domain:<missionDomain>]`) for reviewer outputs -> DONE.
2. `STUDIO-P0-TRACE-02` Added task-level validation report payload and UI visibility in task board -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=36` toward internal target `<=30`.
2. Move reviewer validation from orchestration/context checks to artifact/runtime probes per domain (games/films/apps).
3. Keep capability gates explicit/non-CTA until runtime implementation exists.

## Delta 2026-02-23 - Execution tracking update (near-limit reduction to 35)
Closed in this wave:
1. `ARCH-NEARLIMIT-19` Split Niagara VFX runtime logic into dedicated runtime module -> DONE.
2. `ARCH-NEARLIMIT-20` Split reviewer validation evaluation logic from studio store to helper module -> DONE.
3. `ARCH-NEARLIMIT-21` Tighten architecture gate baseline (`nearLimitFiles 36 -> 35`) -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=35` toward internal target `<=30`.
2. Move reviewer validation from orchestration/context checks to artifact/runtime probes per domain (games/films/apps).
3. Keep capability gates explicit/non-CTA until runtime implementation exists.

## Delta 2026-02-23 - Execution tracking update (near-limit reduction to 34)
Closed in this wave:
1. `ARCH-NEARLIMIT-22` Extract Animation Blueprint node rendering into dedicated module -> DONE.
2. `ARCH-NEARLIMIT-23` Remove dead transition-label node block in Animation Blueprint editor -> DONE.
3. `ARCH-NEARLIMIT-24` Tighten architecture gate baseline (`nearLimitFiles 35 -> 34`) -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=34` toward internal target `<=30`.
2. Move reviewer validation from orchestration/context checks to artifact/runtime probes per domain (games/films/apps).
3. Keep capability gates explicit/non-CTA until runtime implementation exists.

## Delta 2026-02-23 - Execution tracking update (near-limit reduction to 33)
Closed in this wave:
1. `ARCH-NEARLIMIT-25` Extract AI audio music helper logic to dedicated module -> DONE.
2. `ARCH-NEARLIMIT-26` Tighten architecture gate baseline (`nearLimitFiles 34 -> 33`) -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=33` toward internal target `<=30`.
2. Move reviewer validation from orchestration/context checks to artifact/runtime probes per domain (games/films/apps).
3. Keep capability gates explicit/non-CTA until runtime implementation exists.

## Delta 2026-02-23 - Execution tracking update (declutter + decomposition to 27)
Closed in this wave:
1. `UX-STUDIO-DECLUTTER-01` Reduced Studio Home top-level action noise and moved secondary controls into compact disclosures -> DONE.
2. `UX-IDE-STATUS-01` Reduced persistent Workbench status bar chrome noise with primary/secondary disclosure split -> DONE.
3. `ARCH-NEARLIMIT-27` Extracted motion matching search/blending core to dedicated module -> DONE.
4. `ARCH-NEARLIMIT-28` Extracted audio synthesis effect stack to dedicated module -> DONE.
5. `ARCH-NEARLIMIT-29` Tightened architecture baseline (`nearLimitFiles 33 -> 27`) -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=27` toward internal target `<=20`.
2. Reduce remaining `NOT_IMPLEMENTED` critical footprint with explicit path-level UX gating (no CTA on non-runnable capabilities).
3. Move reviewer validation from orchestration/context checks to artifact/runtime probes per domain (games/films/apps).

## Delta 2026-02-23 - Execution tracking update (behavior tree core extraction to 26)
Closed in this wave:
1. `ARCH-NEARLIMIT-30` Extracted behavior-tree foundational primitives to `cloud-web-app/web/lib/behavior-tree-core.ts` -> DONE.
2. `ARCH-NEARLIMIT-31` Reduced `cloud-web-app/web/lib/behavior-tree.ts` below near-limit and preserved API via explicit re-exports -> DONE.
3. `ARCH-NEARLIMIT-32` Tightened architecture baseline (`nearLimitFiles 27 -> 26`) -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=26` toward internal target `<=20`, prioritizing:
- `cloud-web-app/web/lib/ai/behavior-tree-system.tsx`
- `cloud-web-app/web/lib/physics/physics-system.ts`
- `cloud-web-app/web/lib/ui/ui-framework.tsx`
2. Keep endpoint capability claims factual (`IMPLEMENTED|PARTIAL|NOT_IMPLEMENTED`) and remove any residual CTA ambiguity.
3. Keep freeze suite deferred to final consolidated run per execution policy.

## Delta 2026-02-23 - Execution tracking update (AI runtime decomposition to 25)
Closed in this wave:
1. `ARCH-NEARLIMIT-33` Extracted blackboard/perception config block from `cloud-web-app/web/lib/ai/behavior-tree-system.tsx` to `cloud-web-app/web/lib/ai/behavior-tree-system.blackboard.ts` -> DONE.
2. `ARCH-NEARLIMIT-34` Tightened architecture baseline (`nearLimitFiles 26 -> 25`) -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=25` toward internal target `<=20`, prioritizing:
- `cloud-web-app/web/lib/physics/physics-system.ts`
- `cloud-web-app/web/lib/ui/ui-framework.tsx`
- `cloud-web-app/web/lib/engine/physics-engine.ts`
2. Keep endpoint capability claims factual (`IMPLEMENTED|PARTIAL|NOT_IMPLEMENTED`) and remove residual CTA ambiguity in critical journeys.
3. Keep freeze suite deferred to final consolidated run per execution policy.

## Delta 2026-02-23 - Execution tracking update (decomposition to 22)
Closed in this wave:
1. `ARCH-NEARLIMIT-35` Extracted `CollisionDetector` from `cloud-web-app/web/lib/physics/physics-system.ts` -> DONE.
2. `ARCH-NEARLIMIT-36` Extracted UI framework theme constants to `cloud-web-app/web/lib/ui/ui-framework-themes.ts` -> DONE.
3. `ARCH-NEARLIMIT-37` Extracted engine math primitives to `cloud-web-app/web/lib/engine/physics-engine-math.ts` -> DONE.
4. `ARCH-NEARLIMIT-38` Tightened architecture baseline (`nearLimitFiles 25 -> 22`) -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=22` toward internal target `<=20`, prioritizing:
- `cloud-web-app/web/lib/hot-reload/hot-reload-server.ts`
- `cloud-web-app/web/lib/inventory/inventory-system.tsx`
- `cloud-web-app/web/lib/engine/particle-system.ts`
2. Keep endpoint capability claims factual (`IMPLEMENTED|PARTIAL|NOT_IMPLEMENTED`) and remove residual CTA ambiguity in critical journeys.
3. Keep freeze suite deferred to final consolidated run per execution policy.

## Delta 2026-02-23 - Execution tracking update (decomposition to 21)
Closed in this wave:
1. `ARCH-NEARLIMIT-39` Extracted hot reload helper classes to `cloud-web-app/web/lib/hot-reload/hot-reload-server-runtime-helpers.ts` -> DONE.
2. `ARCH-NEARLIMIT-40` Tightened architecture baseline (`nearLimitFiles 22 -> 21`) -> DONE.

Remaining queue:
1. Continue decomposition from `nearLimitFiles=21` toward internal target `<=20`, prioritizing:
- `cloud-web-app/web/lib/inventory/inventory-system.tsx`
- `cloud-web-app/web/lib/engine/particle-system.ts`
- `cloud-web-app/web/lib/engine/scene-graph.ts`
2. Keep endpoint capability claims factual (`IMPLEMENTED|PARTIAL|NOT_IMPLEMENTED`) and remove residual CTA ambiguity in critical journeys.
3. Keep freeze suite deferred to final consolidated run per execution policy.

## Delta 2026-02-24 - Execution tracking update (near-limit closure to 0)
Closed in this wave:
1. `ARCH-NEARLIMIT-71` Extracted multiplayer transport layer to `cloud-web-app/web/lib/networking/multiplayer-transport.ts` and kept re-export compatibility in `multiplayer-system.tsx` -> DONE.
2. `ARCH-NEARLIMIT-72` Tightened architecture gate ceiling to `nearLimitFiles <= 0` -> DONE.
3. `REL-TARGETED-09` Revalidated targeted non-regression gates (`architecture-gate`, `route-contracts`, `no-fake-success`, `canonical-components`, `mojibake`, `interface-critical`) -> DONE.

Remaining queue:
1. Keep endpoint capability claims factual (`IMPLEMENTED|PARTIAL|NOT_IMPLEMENTED`) and remove residual CTA ambiguity in critical journeys.
2. Execute the deferred full freeze suite when requested (`lint`, `typecheck`, `build`, `qa:enterprise-gate`).
3. Maintain legacy deprecation policy by telemetry window (`410 DEPRECATED_ROUTE` until cutoff criteria are met).

## Delta 2026-02-24 - Execution tracking update (full freeze completed)
Closed in this wave:
1. `REL-FREEZE-01` Full freeze suite executed in `cloud-web-app/web` (`lint`, `typecheck`, `build`, `qa:enterprise-gate`) -> DONE.
2. `REL-FREEZE-02` Root governance/security suite executed (`repo-connectivity`, `workflow-governance`, `canonical-doc-governance`, `secrets-critical`) -> DONE.
3. `REL-FREEZE-03` Type regressions from modularization wave corrected across core modules -> DONE.

Remaining queue:
1. `CAP-P0-01` Reduce `not-implemented-ui` in critical journey (`5 -> lower`) by implementing or hard-gating remaining capability surfaces.
2. `CAP-P0-02` Keep route capability/deprecation contracts explicit while preparing telemetry-backed legacy cutoff.
3. `DOC-GOV-01` Continue historical markdown governance hygiene (`historical=3603`) without changing canonical source policy.

## Delta 2026-02-24 - Execution tracking update (non-core AI gate precision)
Closed in this wave:
1. `CAP-P0-03` Query non-core gate migrated from `501 NOT_IMPLEMENTED` to explicit `503 PROVIDER_NOT_CONFIGURED` (`AI_QUERY`) -> DONE.
2. `CAP-P0-04` Stream non-core gate migrated from `501 NOT_IMPLEMENTED` to explicit `503 AI_BACKEND_NOT_CONFIGURED` (`AI_STREAM_BACKEND`) -> DONE.
3. `REL-METRIC-05` Route inventory scanner normalized to exact `NOT_IMPLEMENTED` error-code counting -> DONE.

Remaining queue:
1. `CAP-P0-01` Reduce remaining critical `NOT_IMPLEMENTED` footprint (`5`) only via real implementation or policy-approved critical gate retention.
2. `CAP-P0-02` Keep route capability/deprecation contracts explicit while preparing telemetry-backed legacy cutoff.
3. `DOC-GOV-01` Continue historical markdown governance hygiene (`historical=3603`) without changing canonical source policy.

## Delta 2026-02-24 - Execution tracking update (inline completion precision)
Closed in this wave:
1. `CAP-P0-05` Inline completion gate migrated from generic `NOT_IMPLEMENTED` to explicit `503 PROVIDER_NOT_CONFIGURED` (`AI_INLINE_COMPLETION`) -> DONE.
2. `REL-METRIC-06` Enterprise freeze rerun confirmed green after capability contract precision changes -> DONE.

Remaining queue:
1. `CAP-P0-01` Reduce remaining critical `NOT_IMPLEMENTED` footprint (`4`) only via real implementation or policy-approved critical gate retention.
2. `CAP-P0-02` Keep route capability/deprecation contracts explicit while preparing telemetry-backed legacy cutoff.
3. `DOC-GOV-01` Continue historical markdown governance hygiene (`historical=3603`) without changing canonical source policy.

## Delta 2026-02-24 - Execution tracking update (capability observability expansion)
Closed in this wave:
1. `REL-METRIC-07` Added explicit interface metrics for `PROVIDER_NOT_CONFIGURED` and `QUEUE_BACKEND_UNAVAILABLE` -> DONE.
2. `REL-METRIC-08` Expanded route inventory to include exact capability error-code distribution -> DONE.
3. `REL-FREEZE-04` Reconfirmed full enterprise gate green after reporting expansion -> DONE.

Remaining queue:
1. `CAP-P0-01` Reduce remaining critical `NOT_IMPLEMENTED` footprint (`4`) only via real implementation or policy-approved critical gate retention.
2. `CAP-P0-02` Keep route capability/deprecation contracts explicit while preparing telemetry-backed legacy cutoff.
3. `DOC-GOV-01` Continue historical markdown governance hygiene (`historical=3603`) without changing canonical source policy.

## Delta 2026-02-24 - Execution tracking update (threshold hardening)
Closed in this wave:
1. `REL-THRESHOLD-01` Tightened architecture gate baseline (`apiNotImplemented <= 4`) -> DONE.
2. `REL-THRESHOLD-02` Tightened interface gate baseline (`not-implemented-ui <= 4`, `not-implemented-noncritical <= 0`) -> DONE.
3. `REL-THRESHOLD-03` Revalidated enterprise gate with tightened baselines -> DONE.

Remaining queue:
1. `CAP-P0-01` Reduce remaining critical `NOT_IMPLEMENTED` footprint (`4`) only via real implementation or policy-approved critical gate retention.
2. `CAP-P0-02` Keep route capability/deprecation contracts explicit while preparing telemetry-backed legacy cutoff.
3. `DOC-GOV-01` Continue historical markdown governance hygiene (`historical=3603`) without changing canonical source policy.

## Delta 2026-02-25 - Execution tracking update (policy boundary lock + cutoff contract hardening)
Closed in this wave:
1. `CAP-P0-01` Locked remaining critical `NOT_IMPLEMENTED` footprint by dedicated policy gate:
- `qa:not-implemented-policy` added and wired into `qa:enterprise-gate`;
- allowed scope fixed to 4 core AI routes only -> DONE.
2. `CAP-P0-02` Hardened legacy cutoff contracts:
- route-contract checks now enforce exact deprecation cycle metadata on all legacy `410` routes;
- `/api/admin/compatibility-routes` cutoff policy markers now contract-checked (`requiredSilentDays=14`, `deprecationMode=phaseout_after_2_cycles`, `removalCandidates`) -> DONE.
3. `DOC-GOV-02` Governance baselines refreshed:
- `qa:canonical-doc-governance` PASS (`canonical=41`, `historical=3603`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:workflow-governance` PASS (`issues=0`) -> DONE.

Remaining queue:
1. `DOC-GOV-01` Continue historical markdown governance hygiene (`historical=3603`) with reduction-only policy (growth hard-locked by gate).
2. Keep telemetry window monitoring active for legacy cutoff execution (2-cycle policy unchanged).

## Delta 2026-02-25 - Execution tracking update (full repo deep sweep + legacy-path active lock)
Closed in this wave:
1. `GOV-P0-09` Added repository-wide legacy path reference scanner and canonical matrix (`39`) -> DONE.
2. `GOV-P0-10` Reduced active-surface legacy path mentions (`6 -> 3`) by removing hardcoded missing-path CI step usage -> DONE.
3. `GOV-P0-11` Added hard non-growth guard for active legacy references (`qa:legacy-path-references` with `max-active-hits=3`) -> DONE.
4. `ARCH-P0-12` Published full repo deep-audit and closure matrix (`40`) with quantified footprint and risk queue -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Reduce active medium-size pressure (`>=900` lines) from `136` by decomposing top-priority runtime modules.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (active legacy refs to zero)
Closed in this wave:
1. `GOV-P0-12` Removed residual active missing-path literals from root operational scripts by dynamic ai-ide workspace resolution -> DONE.
2. `GOV-P0-13` Tightened legacy-path gate from tolerance to strict zero (`max-active-hits=0`) -> DONE.
3. `GOV-P0-14` Revalidated governance baseline after tightening (`repo-connectivity`, `canonical-doc-governance`, `workflow-governance`, `legacy-path-references`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Reduce active medium-size pressure (`>=900` lines) from `136` by decomposing top-priority runtime modules.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (large-file pressure baseline lock)
Closed in this wave:
1. `STRUCT-P0-02` Added active large-file pressure scanner + gate (`>=900` lines) with canonical reporting -> DONE.
2. `STRUCT-P0-03` Established non-growth hard baseline (`maxFiles=136`) for active large-file pressure -> DONE.
3. `STRUCT-P0-04` Published decision-complete decomposition batches for next structural wave:
- `42_ACTIVE_DECOMPOSITION_BATCH_PLAN_2026-02-25.md` -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Reduce active medium-size pressure (`>=900` lines) from `136` by decomposing top-priority runtime modules.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Batch A first two decompositions)
Closed in this wave:
1. `STRUCT-P0-05` Decomposed `cloud-web-app/web/lib/engine/navigation-ai.ts` by extracting primitives to `navigation-ai-primitives.ts` with compatibility-preserving re-exports -> DONE.
2. `STRUCT-P0-06` Decomposed `cloud-web-app/web/lib/ai-3d-generation-system.ts` into dedicated modules (`ai-3d-generation-nerf.ts`, `ai-3d-generation-gaussian.ts`, `ai-3d-generation-meshing.ts`) while preserving public imports via re-exports -> DONE.
3. `STRUCT-P0-07` Refreshed active large-file pressure report and confirmed reduction (`136 -> 134`) under unchanged hard ceiling (`maxFiles=136`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Continue Batch A decomposition on next priority files:
- `cloud-web-app/web/lib/behavior-tree.ts`
- `cloud-web-app/web/lib/input/input-manager.ts`
- `cloud-web-app/web/components/narrative/QuestEditor.tsx`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (behavior tree decomposition + pressure 133)
Closed in this wave:
1. `STRUCT-P0-08` Extracted behavior action nodes to `cloud-web-app/web/lib/behavior-tree-action-nodes.ts` -> DONE.
2. `STRUCT-P0-09` Reduced `cloud-web-app/web/lib/behavior-tree.ts` below pressure threshold (`1097 -> 760`) while preserving compatibility exports -> DONE.
3. `STRUCT-P0-10` Revalidated pressure and governance gates:
- `qa:active-large-file-pressure` PASS (`largeFileCount=133`, baseline lock `maxFiles=136`);
- `qa:legacy-path-references` PASS (`activeMentions=0`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Continue Batch A decomposition on next priority files:
- `cloud-web-app/web/lib/input/input-manager.ts`
- `cloud-web-app/web/components/narrative/QuestEditor.tsx`
- `cloud-web-app/web/lib/world/world-streaming.tsx`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (world streaming decomposition + pressure 132)
Closed in this wave:
1. `STRUCT-P0-11` Extracted world streaming spatial primitives to:
- `cloud-web-app/web/lib/world/world-streaming-octree.ts`
- `cloud-web-app/web/lib/world/world-streaming-priority-queue.ts` -> DONE.
2. `STRUCT-P0-12` Reduced `cloud-web-app/web/lib/world/world-streaming.tsx` below pressure threshold (`1095 -> 854`) with compatibility-preserving imports/exports -> DONE.
3. `STRUCT-P0-13` Revalidated pressure and legacy reference governance:
- `qa:active-large-file-pressure` PASS (`largeFileCount=132`, lock `maxFiles=136`);
- `qa:legacy-path-references` PASS (`activeMentions=0`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Continue Batch A decomposition on next priority files:
- `cloud-web-app/web/components/narrative/QuestEditor.tsx`
- `cloud-web-app/web/lib/ai/behavior-tree-system.tsx`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (input manager decomposition + pressure 131)
Closed in this wave:
1. `STRUCT-P0-14` Extracted input manager contracts/maps to `cloud-web-app/web/lib/input/input-manager-types.ts` -> DONE.
2. `STRUCT-P0-15` Extracted default input mappings to `cloud-web-app/web/lib/input/input-manager-default-mappings.ts` and reduced `input-manager.ts` below threshold (`1097 -> 876`) -> DONE.
3. `STRUCT-P0-16` Revalidated structural + governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=131`);
- `qa:legacy-path-references` PASS (`activeMentions=0`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Continue Batch A decomposition on next priority files:
- `cloud-web-app/web/components/narrative/QuestEditor.tsx`
- `cloud-web-app/web/lib/ai/behavior-tree-system.tsx`
- `cloud-web-app/web/lib/terrain-engine.ts`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (QuestEditor + TerrainEngine decomposition + pressure 129)
Closed in this wave:
1. `STRUCT-P0-17` Reduced `cloud-web-app/web/components/narrative/QuestEditor.tsx` below threshold (`1095 -> 878`) by extracting:
- `QuestEditor.types.ts`
- `QuestEditor.catalog.tsx`
- `QuestEditor.nodes.tsx` -> DONE.
2. `STRUCT-P0-18` Reduced `cloud-web-app/web/lib/terrain-engine.ts` below threshold (`1093 -> 631`) by extracting:
- `terrain-engine.types.ts`
- `terrain-engine-noise.ts` -> DONE.
3. `STRUCT-P0-19` Revalidated structural + legacy governance:
- `qa:active-large-file-pressure` PASS (`largeFileCount=129`);
- `qa:legacy-path-references` PASS (`activeMentions=0`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Continue Batch A decomposition on next priority files:
- `cloud-web-app/web/lib/ai/behavior-tree-system.tsx`
- `cloud-web-app/web/lib/collaboration-realtime.ts`
- `cloud-web-app/web/lib/materials/material-editor.ts`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (collaboration core split + pressure 128)
Closed in this wave:
1. `STRUCT-P0-20` Extracted collaboration runtime core (socket + service) to `cloud-web-app/web/lib/collaboration-realtime-core.ts` -> DONE.
2. `STRUCT-P0-21` Reduced `cloud-web-app/web/lib/collaboration-realtime.ts` below threshold (`1090 -> 416`) while preserving exported collaboration classes -> DONE.
3. `STRUCT-P0-22` Revalidated structural/governance checks:
- `qa:active-large-file-pressure` PASS (`largeFileCount=128`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Continue Batch A decomposition on next priority files:
- `cloud-web-app/web/lib/ai/behavior-tree-system.tsx`
- `cloud-web-app/web/lib/materials/material-editor.ts`
- `cloud-web-app/web/lib/cache-system.ts`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (behavior tree system + material editor split + pressure 126)
Closed in this wave:
1. `STRUCT-P0-23` Extracted BT node/runtime layer to `cloud-web-app/web/lib/ai/behavior-tree-system.nodes.ts` and reduced `behavior-tree-system.tsx` below the `>=900` pressure threshold with export compatibility preserved -> DONE.
2. `STRUCT-P0-24` Extracted material editor contracts/presets to:
- `cloud-web-app/web/lib/materials/material-editor.types.ts`
- `cloud-web-app/web/lib/materials/material-editor.presets.ts`;
- reduced `material-editor.ts` (`1091 -> 786`) with compatibility exports -> DONE.
3. `STRUCT-P0-25` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=126`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Continue Batch A decomposition on next priority files:
- `cloud-web-app/web/lib/cache-system.ts`
- `cloud-web-app/web/lib/cutscene/cutscene-system.tsx`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (cutscene builder split + pressure 125)
Closed in this wave:
1. `STRUCT-P0-26` Extracted cutscene builder DSL to `cloud-web-app/web/lib/cutscene/cutscene-builder.ts` -> DONE.
2. `STRUCT-P0-27` Reduced `cloud-web-app/web/lib/cutscene/cutscene-system.tsx` below the `>=900` threshold with compatibility-preserving export wiring -> DONE.
3. `STRUCT-P0-28` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=125`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`) -> DONE.

Remaining queue:
1. `STRUCT-P0-01` Continue Batch A decomposition on next priority file:
- `cloud-web-app/web/lib/cache-system.ts`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (cache-system split + Batch A target reached)
Closed in this wave:
1. `STRUCT-P0-29` Extracted cache performance runtime/contracts to `cloud-web-app/web/lib/cache-system-performance.ts` -> DONE.
2. `STRUCT-P0-30` Extracted debounce/throttle hooks to `cloud-web-app/web/lib/cache-system-hooks.ts` and reduced `cache-system.ts` below threshold (`>=900`) -> DONE.
3. `STRUCT-P0-31` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=124`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-01` Start Batch B decomposition priorities:
- `cloud-web-app/web/lib/water-ocean-system.ts`
- `cloud-web-app/web/lib/engine/asset-pipeline.ts`
- `cloud-web-app/web/lib/ai-integration-total.ts`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Batch B kickoff + pressure 120)
Closed in this wave:
1. `STRUCT-P1-02` Extracted FFT runtime from `water-ocean-system.ts` to `water-ocean-fft.ts` and reduced main file below threshold -> DONE.
2. `STRUCT-P1-03` Extracted `asset-pipeline` cache/importer runtimes to:
- `asset-pipeline-cache.ts`
- `asset-pipeline-importer.ts`
with compatibility exports preserved in `asset-pipeline.ts` -> DONE.
3. `STRUCT-P1-04` Extracted integrated workflow registration block from `ai-integration-total.ts` to `ai-integration-total-workflows.ts` -> DONE.
4. `STRUCT-P1-05` Extracted studio-home normalization/store helper block to `studio-home-store-normalizers.ts` and reduced `studio-home-store.ts` below threshold -> DONE.
5. `STRUCT-P1-06` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=120`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-07` Continue Batch B residual decomposition:
- `cloud-web-app/web/lib/visual-script/runtime.ts`
- `cloud-web-app/web/lib/capture/capture-system.tsx`
- `cloud-web-app/web/lib/cloth-simulation.ts`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (visual script runtime split + pressure 119)
Closed in this wave:
1. `STRUCT-P1-08` Extracted visual script default executor registry to `cloud-web-app/web/lib/visual-script/runtime-node-executors.ts` -> DONE.
2. `STRUCT-P1-09` Reduced `cloud-web-app/web/lib/visual-script/runtime.ts` below threshold by moving executor catalog out of runtime orchestration module -> DONE.
3. `STRUCT-P1-10` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=119`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-11` Continue Batch B residual decomposition:
- `cloud-web-app/web/lib/capture/capture-system.tsx`
- `cloud-web-app/web/lib/cloth-simulation.ts`
- `cloud-web-app/web/lib/server/studio-home-store.ts` secondary cleanup pass (optional).
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (capture + cloth decomposition + pressure 117)
Closed in this wave:
1. `STRUCT-P1-12` Extracted capture screenshot/media helper runtime to `cloud-web-app/web/lib/capture/capture-system-media.ts` and reduced `capture-system.tsx` below threshold (`>=900`) -> DONE.
2. `STRUCT-P1-13` Extracted cloth simulation primitives/mesh runtime to `cloud-web-app/web/lib/cloth-simulation-core.ts` and reduced `cloth-simulation.ts` below threshold -> DONE.
3. `STRUCT-P1-14` Updated dependency wiring for type stability:
- `capture-presets.ts` now imports `ScreenshotEffect` from `capture-types`;
- `cloth-simulation-gpu.ts` now imports `ClothConfig` from `cloth-simulation.types` -> DONE.
4. `STRUCT-P1-15` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=117`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-16` Continue Batch B decomposition on top remaining pressure files:
- `cloud-web-app/web/components/engine/LandscapeEditor.tsx`
- `cloud-web-app/web/components/materials/MaterialEditor.tsx`
- `cloud-web-app/web/lib/save/save-manager.tsx`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (LandscapeEditor scene/panel split + pressure 116)
Closed in this wave:
1. `STRUCT-P1-17` Extracted scene/runtime from `LandscapeEditor.tsx` to `LandscapeEditor.scene.tsx` -> DONE.
2. `STRUCT-P1-18` Extracted toolbar/brush/layers panels from `LandscapeEditor.tsx` to `LandscapeEditor.panels.tsx` -> DONE.
3. `STRUCT-P1-19` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=116`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-20` Continue Batch B decomposition on next top pressure files:
- `cloud-web-app/web/components/materials/MaterialEditor.tsx`
- `cloud-web-app/web/lib/save/save-manager.tsx`
- `cloud-web-app/web/lib/debug/real-debug-adapter.ts`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (MaterialEditor catalog split + pressure 115)
Closed in this wave:
1. `STRUCT-P1-21` Extracted material editor contracts to `MaterialEditor.types.ts` -> DONE.
2. `STRUCT-P1-22` Extracted node definition catalog to `MaterialEditor.node-definitions.ts` and reduced `MaterialEditor.tsx` below threshold (`>=900`) -> DONE.
3. `STRUCT-P1-23` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=115`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-24` Continue Batch B decomposition on next top pressure files:
- `cloud-web-app/web/lib/save/save-manager.tsx`
- `cloud-web-app/web/lib/debug/real-debug-adapter.ts`
- `cloud-web-app/web/lib/achievements/achievement-system.tsx`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Save/Debug/Achievement split + pressure 112)
Closed in this wave:
1. `STRUCT-P1-25` Extracted save runtime helper modules:
- `save-manager-core.ts`
- `save-manager-hooks.tsx`
and reduced `save-manager.tsx` below threshold -> DONE.
2. `STRUCT-P1-26` Extracted DAP protocol contracts to `real-debug-adapter-types.ts` and reduced `real-debug-adapter.ts` below threshold -> DONE.
3. `STRUCT-P1-27` Extracted achievement contracts/hooks to:
- `achievement-system.types.ts`
- `achievement-system-hooks.tsx`
and reduced `achievement-system.tsx` below threshold -> DONE.
4. `STRUCT-P1-28` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=112`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-29` Continue Batch B decomposition on next top pressure files:
- `cloud-web-app/web/components/video/VideoTimelineEditorPanels.tsx`
- `cloud-web-app/web/lib/hair-fur-system.ts`
- `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Video timeline panel split + pressure 111)
Closed in this wave:
1. `STRUCT-P1-30` Extracted inspector/effects block to `VideoTimelineEditorPanels.inspector.tsx` and reduced `VideoTimelineEditorPanels.tsx` below threshold -> DONE.
2. `STRUCT-P1-31` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=111`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-32` Continue Batch B decomposition on next top pressure files:
- `cloud-web-app/web/lib/hair-fur-system.ts`
- `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`
- `cloud-web-app/web/lib/video-encoder-real.ts`.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Hair/Fluid/VideoEncoder decomposition + pressure 108)
Closed in this wave:
1. `STRUCT-P1-33` Decomposed `hair-fur-system.ts` into focused runtime modules:
- `hair-fur-physics.ts`
- `hair-fur-groom.ts`
- `hair-fur-shell.ts`
and retained compatibility orchestration exports in `hair-fur-system.ts` -> DONE.
2. `STRUCT-P1-34` Decomposed `FluidSimulationEditor.tsx` into:
- `fluid-simulation.types.ts`
- `fluid-simulation.defaults.ts`
- `fluid-simulation.runtime.ts`
- `FluidSimulationEditorSettingsPanel.tsx`
with editor shell retained in `FluidSimulationEditor.tsx` -> DONE.
3. `STRUCT-P1-35` Decomposed `video-encoder-real.ts` into:
- `video-encoder-real.types.ts`
- `video-encoder-real.encoders.ts`
- `video-encoder-real.muxers.ts`
- `video-encoder-real.renderer.ts`
- `video-encoder-real.pipeline.ts`
- `video-encoder-real.screen-recorder.ts`
with compatibility barrel retained in `video-encoder-real.ts` -> DONE.
4. `STRUCT-P1-36` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=108`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-37` Continue Batch B decomposition on next top pressure files from refreshed matrix (`41`).
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Dashboard + networking split + pressure 106)
Closed in this wave:
1. `STRUCT-P1-37` Decomposed `ProjectsDashboard.tsx` into:
- `ProjectsDashboard.types.ts`
- `ProjectsDashboard.constants.tsx`
- `ProjectsDashboard.cards.tsx`
- `ProjectsDashboard.modal.tsx`
with dashboard shell retained in `ProjectsDashboard.tsx` -> DONE.
2. `STRUCT-P1-38` Decomposed `networking-multiplayer.ts` by extracting shared primitives to `networking-multiplayer-core.ts` and retaining orchestration/compatibility exports in main module -> DONE.
3. `STRUCT-P1-39` Removed blocking confirmation from dashboard delete path (non-blocking UX hardening) -> DONE.
4. `STRUCT-P1-40` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=106`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-41` Continue Batch B decomposition on next top pressure files from refreshed matrix (`41`).
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (fluid runtime + quest builder split + pressure 104)
Closed in this wave:
1. `STRUCT-P1-41` Decomposed `fluid-simulation-system.ts` into:
- `fluid-simulation-spatial-hash.ts`
- `fluid-simulation-sph.ts`
- `fluid-simulation-pbf.ts`
- `fluid-simulation-flip.ts`
with orchestration barrel retained in `fluid-simulation-system.ts` -> DONE.
2. `STRUCT-P1-42` Extracted quest builder DSL from `quest-system.tsx` to `quests/quest-builder.ts`, preserving compatibility re-export -> DONE.
3. `STRUCT-P1-43` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=104`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-44` Continue Batch B decomposition on next top pressure files from refreshed matrix (`41`).
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (replay decomposition + pressure 103)
Closed in this wave:
1. `STRUCT-P1-45` Decomposed `replay-system.tsx` into:
- `replay-runtime.ts`
- `replay-manager.ts`
- `replay-hooks.tsx`
with composition/compatibility barrel retained in `replay-system.tsx` -> DONE.
2. `STRUCT-P1-46` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=103`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-47` Continue Batch B decomposition on next top pressure files from refreshed matrix (`41`).
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Studio Home surface split + interface monolith metric)
Closed in this wave:
1. `STRUCT-P1-47` Split Studio Home top surface into dedicated modules:
- `components/studio/StudioHomeHeader.tsx`
- `components/studio/StudioHomeKpiStrip.tsx`
with `StudioHome.tsx` kept as orchestration shell -> DONE.
2. `UX-P0-LEGACY-01` Hardened legacy-entry clarity:
- `components/AethelDashboardGateway.tsx` now shows legacy transition banner + return action to `/dashboard` -> DONE.
3. `STRUCT-P1-48` Added explicit interface structural pressure metric in `interface-critical-scan.mjs`:
- `ui-monolith-files-gte-650` summary;
- `UI Monolith Pressure` table in `docs/INTERFACE_CRITICAL_SWEEP.md` -> DONE.
4. `STRUCT-P1-50` Reduced creator dashboard maintenance pressure:
- extracted shared view blocks into `components/marketplace/CreatorDashboard.shared.tsx`;
- reduced `components/marketplace/CreatorDashboard.tsx` to `888` lines (`<900`) -> DONE.
5. `STRUCT-P1-49` Revalidated structural/governance controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=102`);
- `qa:legacy-path-references` PASS (`activeMentions=0`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS;
- `qa:workflow-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-51` Burn down top `ui-monolith-files-gte-650` offenders in user-facing surfaces:
- `components/dashboard/AethelDashboardPrimaryTabContent.tsx`
- `components/media/MediaStudio.tsx`
- `components/marketplace/CreatorDashboard.tsx`
- `components/engine/ProjectSettings.tsx`
in compatibility-preserving slices.
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (dashboard tab extraction + pressure 101)
Closed in this wave:
1. `STRUCT-P1-51` Decomposed `AethelDashboardPrimaryTabContent.tsx` by extracting:
- `components/dashboard/AethelDashboardWalletTab.tsx`
- `components/dashboard/AethelDashboardBillingTab.tsx`
and reducing orchestrator to `577` lines -> DONE.
2. `STRUCT-P1-52` Continued marketplace decomposition:
- added `components/marketplace/CreatorDashboard.shared.tsx`
- reduced `components/marketplace/CreatorDashboard.tsx` to `888` lines (`<900` pressure threshold) -> DONE.
3. `STRUCT-P1-53` Revalidated structural controls:
- `qa:interface-gate` PASS;
- `qa:active-large-file-pressure` PASS (`largeFileCount=101`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-54` Continue `ui-monolith-files-gte-650` burn-down focusing:
- `components/media/MediaStudio.tsx`
- `components/engine/ProjectSettings.tsx`
- `components/audio/AudioProcessing.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (creator dashboard sections split + pressure 100)
Closed in this wave:
1. `STRUCT-P1-54` Split creator dashboard into orchestration + sections:
- `components/marketplace/CreatorDashboard.sections.tsx` (charts/tables/sales sections)
- `components/marketplace/CreatorDashboard.tsx` reduced to `398` lines -> DONE.
2. `STRUCT-P1-55` Revalidated structural controls:
- `qa:interface-gate` PASS;
- `qa:active-large-file-pressure` PASS (`largeFileCount=100`);
- interface monolith scan now `ui-monolith-files-gte-650=84` -> DONE.

Remaining queue:
1. `STRUCT-P1-56` Continue monolith burn-down on:
- `components/media/MediaStudio.tsx`
- `components/engine/ProjectSettings.tsx`
- `components/audio/AudioProcessing.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (dashboard render-data hook extraction)
Closed in this wave:
1. `STRUCT-P1-56` Extracted render/currency formatting domain from `AethelDashboard.tsx` to:
- `components/dashboard/useAethelDashboardRenderData.ts` -> DONE.
2. `STRUCT-P1-57` Reduced `AethelDashboard.tsx` line pressure:
- `696 -> 644` lines (below 650 structural threshold) -> DONE.
3. `STRUCT-P1-58` Revalidated structural controls:
- `qa:interface-gate` PASS;
- `qa:active-large-file-pressure` PASS (`largeFileCount=100`) -> DONE.

Remaining queue:
1. `STRUCT-P1-59` Continue monolith burn-down on:
- `components/media/MediaStudio.tsx`
- `components/engine/ProjectSettings.tsx`
- `components/audio/AudioProcessing.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (media/project settings decomposition + pressure 99)
Closed in this wave:
1. `STRUCT-P1-59` MediaStudio split:
- extracted `components/media/MediaStudio.initial-project.ts`;
- reduced `components/media/MediaStudio.tsx` to `876` lines -> DONE.
2. `STRUCT-P1-60` ProjectSettings schema split:
- extracted `components/engine/ProjectSettings.schema.ts`;
- reduced `components/engine/ProjectSettings.tsx` to `714` lines -> DONE.
3. `STRUCT-P1-61` Revalidated structural controls:
- `qa:interface-gate` PASS;
- `qa:active-large-file-pressure` PASS (`largeFileCount=99`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-62` Continue monolith burn-down on:
- `components/audio/AudioProcessing.tsx`
- `components/physics/ClothSimulationEditor.tsx`
- `components/engine/AnimationBlueprint.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (cloth editor decomposition + pressure 97)
Closed in this wave:
1. `STRUCT-P1-62` Decomposed cloth editor surface:
- added `components/physics/ClothSimulationEditor.controls.tsx`;
- added `components/physics/ClothSimulationEditor.viewport.tsx`;
- added `components/physics/cloth-simulation-editor.types.ts`;
- reduced `components/physics/ClothSimulationEditor.tsx` from `1033` to `249` lines -> DONE.
2. `STRUCT-P1-63` Cleanup pass on extracted audio core:
- removed stale trailing placeholder from `components/audio/AudioProcessing.core.ts` -> DONE.
3. `STRUCT-P1-64` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=97`);
- `qa:interface-gate` PASS (`ui-monolith-files-gte-650=82`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-65` Continue monolith burn-down on:
- `components/engine/AnimationBlueprint.tsx`
- `components/engine/WorldOutliner.tsx`
- `components/video/VideoTimelineEditor.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (animation/world outliner split + pressure 95)
Closed in this wave:
1. `STRUCT-P1-65` Decomposed `AnimationBlueprint.tsx`:
- extracted `components/engine/AnimationBlueprint.data.ts`;
- extracted `components/engine/AnimationBlueprint.panels.tsx`;
- reduced main orchestrator from `1028` to `370` lines -> DONE.
2. `STRUCT-P1-66` Decomposed `WorldOutliner.tsx`:
- extracted `components/engine/WorldOutliner.types.ts`;
- extracted `components/engine/WorldOutliner.panels.tsx`;
- reduced main orchestrator from `1013` to `355` lines -> DONE.
3. `STRUCT-P1-67` Decomposed timeline panel module:
- extracted `components/video/VideoTimelineEditorPanels.timeline.tsx`;
- extracted `components/video/VideoTimelineEditorPanels.playback.tsx`;
- converted `components/video/VideoTimelineEditorPanels.tsx` to barrel exports -> DONE.
4. `STRUCT-P1-68` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=95`);
- `qa:interface-gate` PASS (`ui-monolith-files-gte-650=79`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-69` Continue monolith burn-down on:
- `components/character/HairFurEditor.tsx`
- `components/assets/ContentBrowser.tsx`
- `components/video/VideoTimeline.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (hair/content browser split + pressure 93)
Closed in this wave:
1. `STRUCT-P1-69` Decomposed `HairFurEditor.tsx`:
- extracted `components/character/HairFurEditor.viewport.tsx`;
- extracted `components/character/HairFurEditor.controls.tsx`;
- reduced main file from `949` to `617` lines -> DONE.
2. `STRUCT-P1-70` Decomposed `ContentBrowser.tsx`:
- extracted `components/assets/ContentBrowser.types.ts`;
- extracted `components/assets/ContentBrowser.ui.tsx`;
- reduced main file from `950` to `493` lines -> DONE.
3. `STRUCT-P1-71` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=93`);
- `qa:interface-gate` PASS (`ui-monolith-files-gte-650=78`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-72` Continue monolith burn-down on:
- `components/video/VideoTimeline.tsx`
- `components/sequencer/SequencerTimeline.tsx`
- `components/engine/LevelEditor.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (video/sequencer timeline decomposition + pressure 91)
Closed in this wave:
1. `STRUCT-P1-72` Decomposed `VideoTimeline.tsx`:
- extracted `components/video/VideoTimeline.types.ts`;
- extracted `components/video/VideoTimeline.helpers.ts`;
- extracted `components/video/VideoPreview.tsx`;
- reduced main file from `900` to `760` lines -> DONE.
2. `STRUCT-P1-73` Decomposed `SequencerTimeline.tsx`:
- extracted `components/sequencer/SequencerTimeline.types.ts`;
- extracted `components/sequencer/SequencerTimeline.helpers.ts`;
- reduced main file from `979` to `824` lines -> DONE.
3. `STRUCT-P1-74` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=91`);
- `qa:interface-gate` PASS (`ui-monolith-files-gte-650=78`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-75` Continue monolith burn-down on:
- `components/engine/LevelEditor.tsx`
- `components/terminal/XTerminal.tsx`
- `components/media/MediaStudio.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (level editor + terminal themes split + pressure 89)
Closed in this wave:
1. `STRUCT-P1-75` Decomposed `LevelEditor.tsx`:
- extracted `components/engine/LevelEditor.types.ts`;
- extracted `components/engine/LevelEditor.runtime.ts`;
- extracted `components/engine/LevelEditor.viewport.tsx`;
- updated `components/engine/LevelEditorPanels.tsx` to shared contracts;
- reduced main file from `956` to `448` lines -> DONE.
2. `STRUCT-P1-76` Decomposed `XTerminal.tsx` theme payload:
- extracted `components/terminal/XTerminal.themes.ts`;
- reduced main file from `920` to `809` lines -> DONE.
3. `STRUCT-P1-77` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=89`);
- `qa:interface-gate` PASS (`critical zeros` preserved, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS (`requiredMissing=0`, `deadScriptReferences=0`);
- `qa:canonical-doc-governance` PASS (`unindexedCanonicalMarkdown=0`) -> DONE.

Remaining queue:
1. `STRUCT-P1-78` Continue monolith burn-down on:
- `components/media/MediaStudio.tsx`
- `components/environment/FoliagePainter.tsx`
- `components/git/GitPanel.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (foliage/git decomposition + pressure 87)
Closed in this wave:
1. `STRUCT-P1-78` Decomposed `FoliagePainter.tsx` UI primitives:
- extracted `components/environment/FoliagePainter.ui.tsx` (`Slider`, `CollapsibleSection`);
- reduced main file from `930` to `858` lines -> DONE.
2. `STRUCT-P1-79` Decomposed `GitPanel.tsx` style payload:
- extracted `components/git/GitPanel.theme.ts`;
- reduced main file from `906` to `886` lines -> DONE.
3. `STRUCT-P1-80` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=87`);
- `qa:interface-gate` PASS (`critical zeros`, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-81` Continue monolith burn-down on:
- `components/media/MediaStudio.tsx`
- `components/settings/SettingsPanel.tsx`
- `components/marketplace/MarketplaceBrowser.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (settings panel split + pressure 86)
Closed in this wave:
1. `STRUCT-P1-81` Decomposed `SettingsPanel.tsx`:
- extracted `components/settings/SettingsPanel.theme.ts`;
- extracted `components/settings/SettingsPanel.input.tsx`;
- reduced main file from `936` to `719` lines -> DONE.
2. `STRUCT-P1-82` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=86`);
- `qa:interface-gate` PASS (`critical zeros`, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-83` Continue monolith burn-down on:
- `components/media/MediaStudio.tsx`
- `components/marketplace/MarketplaceBrowser.tsx`
- `components/project/ProjectPersistence.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (marketplace browser split + pressure 85)
Closed in this wave:
1. `STRUCT-P1-83` Decomposed `MarketplaceBrowser.tsx` constants payload:
- extracted `components/marketplace/MarketplaceBrowser.constants.tsx`;
- reduced main file from `920` to `882` lines -> DONE.
2. `STRUCT-P1-84` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=85`);
- `qa:interface-gate` PASS (`critical zeros`, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-85` Continue monolith burn-down on:
- `components/media/MediaStudio.tsx`
- `components/project/ProjectPersistence.tsx`
- `components/team/TeamInviteManager.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (team invite + project persistence split + pressure 83)
Closed in this wave:
1. `STRUCT-P1-85` Decomposed `TeamInviteManager.tsx`:
- extracted `components/team/TeamInviteManager.types.ts`;
- extracted `components/team/TeamInviteManager.theme.ts`;
- extracted `components/team/TeamInviteManager.primitives.tsx`;
- reduced main file from `993` to `827` lines -> DONE.
2. `STRUCT-P1-86` Decomposed `ProjectPersistence.tsx`:
- extracted `components/project/ProjectPersistence.types.ts`;
- reduced main file from `970` to `861` lines -> DONE.
3. `STRUCT-P1-87` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=83`);
- `qa:interface-gate` PASS (`critical zeros`, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-88` Continue monolith burn-down on:
- `components/media/MediaStudio.tsx`
- `components/profiler/AdvancedProfiler.tsx`
- `lib/engine/audio-manager.ts`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (media/profiler/audio split + pressure 80)
Closed in this wave:
1. `STRUCT-P1-88` Decomposed `MediaStudio.tsx`:
- extracted `components/media/MediaStudio.sidebar.tsx`;
- reduced main file from `1007` to `688` lines -> DONE.
2. `STRUCT-P1-89` Decomposed `AdvancedProfiler.tsx`:
- extracted `components/profiler/AdvancedProfiler.types.ts`;
- extracted `components/profiler/AdvancedProfiler.timeline.tsx`;
- reduced main file from `1028` to `774` lines -> DONE.
3. `STRUCT-P1-90` Decomposed `lib/engine/audio-manager.ts`:
- extracted `lib/engine/audio-manager.types.ts`;
- extracted `lib/engine/audio-source.ts`;
- extracted `lib/engine/audio-group.ts`;
- extracted `lib/engine/audio-reverb.ts`;
- reduced main file from `1059` to `510` lines with compatibility-preserving exports -> DONE.
4. `STRUCT-P1-91` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=80`);
- `qa:interface-gate` PASS (`critical zeros`, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-92` Continue monolith burn-down on:
- `lib/nanite-virtualized-geometry.ts`
- `lib/engine/physics-engine.ts`
- `lib/debug/debug-console.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (debug console perf split + pressure 79)
Closed in this wave:
1. `STRUCT-P1-92` Decomposed `lib/debug/debug-console.tsx`:
- extracted `lib/debug/debug-performance.ts` with `PerformanceMonitor` and `StatsOverlay`;
- reduced main file from `1050` to `883` lines -> DONE.
2. `STRUCT-P1-93` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=79`);
- `qa:interface-gate` PASS (`critical zeros`, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-94` Continue monolith burn-down on:
- `lib/nanite-virtualized-geometry.ts`
- `lib/engine/physics-engine.ts`
- `lib/ui/ui-framework.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (UI framework split + pressure 78)
Closed in this wave:
1. `STRUCT-P1-94` partial closure on `lib/ui/ui-framework.tsx`:
- extracted `lib/ui/ui-framework.types.ts`;
- extracted `lib/ui/ui-manager.ts`;
- reduced `ui-framework.tsx` from `1055` to `649` lines with compatibility-preserving exports -> DONE for this file.
2. `STRUCT-P1-95` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=78`);
- `qa:interface-gate` PASS (`critical zeros`, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-96` Continue monolith burn-down on:
- `lib/nanite-virtualized-geometry.ts`
- `lib/engine/physics-engine.ts`
- `lib/ecs-dots-system.ts`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (localization split + pressure 77)
Closed in this wave:
1. `STRUCT-P1-96` Decomposed `lib/localization/localization-system.tsx`:
- extracted `lib/localization/localization-types.ts`;
- extracted `lib/localization/localization-defaults.ts`;
- reduced main file from `901` to `648` lines with compatibility-preserving re-exports -> DONE for this file.
2. `STRUCT-P1-97` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=77`);
- `qa:interface-gate` PASS (`critical zeros`, `not-implemented-ui=4`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-98` Continue monolith burn-down on:
- `lib/nanite-virtualized-geometry.ts`
- `lib/engine/physics-engine.ts`
- `lib/ecs-dots-system.ts`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Nanite split + pressure 76)
Closed in this wave:
1. `STRUCT-P1-98` Decomposed `lib/nanite-virtualized-geometry.ts`:
- extracted `lib/nanite-types.ts`;
- extracted `lib/nanite-culling.ts`;
- extracted `lib/nanite-visibility.ts`;
- reduced main file from `1063` to `562` lines while preserving factory exports -> DONE for this file.
2. `STRUCT-P1-99` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=76`);
- `qa:repo-connectivity` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-100` Continue monolith burn-down on:
- `lib/engine/physics-engine.ts`
- `lib/ecs-dots-system.ts`
- `lib/dialogue/dialogue-system.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Dialogue split + pressure 75)
Closed in this wave:
1. `STRUCT-P1-100` Decomposed `lib/dialogue/dialogue-system.tsx`:
- extracted `lib/dialogue/dialogue-types.ts`;
- extracted `lib/dialogue/dialogue-runtime.ts`;
- reduced main file from `1053` to `734` lines with compatibility-preserving re-exports -> DONE for this file.
2. `STRUCT-P1-101` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=75`);
- `qa:repo-connectivity` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-102` Continue monolith burn-down on:
- `lib/engine/physics-engine.ts`
- `lib/ecs-dots-system.ts`
- `lib/hot-reload/hot-reload-server.ts`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Physics split + pressure 74)
Closed in this wave:
1. `STRUCT-P1-102` Decomposed `lib/engine/physics-engine.ts`:
- extracted `lib/engine/physics-body.ts`;
- extracted `lib/engine/physics-collision.ts`;
- reduced main file from `1042` to `364` lines with compatibility-preserving re-exports -> DONE for this file.
2. `STRUCT-P1-103` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=74`);
- `qa:repo-connectivity` PASS;
- `qa:interface-gate` PASS (`critical zeros`) -> DONE.

## Delta 2026-02-25 - Execution tracking update (ECS execution split + pressure 74)
Closed in this wave:
1. `STRUCT-P1-104` Decomposed `lib/ecs-dots-system.ts`:
- extracted `lib/ecs-execution.ts` (`SystemScheduler`, `JobSystem`);
- reduced main file from `1056` to `899` lines with compatibility-preserving re-export -> DONE for this file.
2. `STRUCT-P1-105` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=74`);
- `qa:repo-connectivity` PASS;
- `qa:canonical-doc-governance` PASS -> DONE.

Remaining queue:
1. `STRUCT-P1-106` Continue monolith burn-down on:
- `lib/hot-reload/hot-reload-server.ts`
- `lib/aaa-render-system.ts`
- `lib/ecs/prefab-component-system.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (Hot-reload script extraction + pressure 73)
Closed in this wave:
1. `STRUCT-P1-106` Decomposed `lib/hot-reload/hot-reload-server.ts`:
- extracted `lib/hot-reload/hot-reload-client-script.ts`;
- reduced main server file from `1053` to `825` lines with same endpoint contract -> DONE for this file.
2. `STRUCT-P1-107` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=73`);
- `qa:repo-connectivity` PASS;
- `qa:interface-gate` PASS (`critical zeros`) -> DONE.

Remaining queue:
1. `STRUCT-P1-108` Continue monolith burn-down on:
- `lib/aaa-render-system.ts`
- `lib/ecs/prefab-component-system.tsx`
- `lib/server/extension-host-runtime.ts`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).

## Delta 2026-02-25 - Execution tracking update (AAA render split + pressure 72)
Closed in this wave:
1. `STRUCT-P1-108` Decomposed `lib/aaa-render-system.ts`:
- extracted `lib/aaa-render-types.ts` (contracts + default configs);
- reduced main file from `1047` to `509` lines with compatibility-preserving re-exports -> DONE for this file.
2. `STRUCT-P1-109` Revalidated structural controls:
- `qa:active-large-file-pressure` PASS (`largeFileCount=72`);
- `qa:repo-connectivity` PASS;
- `qa:interface-gate` PASS (`critical zeros`) -> DONE.

Remaining queue:
1. `STRUCT-P1-110` Continue monolith burn-down on:
- `lib/ecs/prefab-component-system.tsx`
- `lib/server/extension-host-runtime.ts`
- `lib/state/game-state-manager.tsx`
2. `DOC-GOV-01` Reduce historical markdown volume (`3603`) in controlled waves while preserving canonical authority policy.
3. `CAP-P0-02` Keep legacy deprecation cutoff tracking active (2-cycle telemetry policy unchanged).
