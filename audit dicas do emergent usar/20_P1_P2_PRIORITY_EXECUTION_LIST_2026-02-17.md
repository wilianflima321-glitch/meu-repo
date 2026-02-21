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
7. P2-01
8. P2-02
9. P2-03
10. P2-04

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
