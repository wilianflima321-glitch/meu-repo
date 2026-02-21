# 18_INTERFACE_SURFACE_MAP_FOR_CLAUDE_2026-02-17
Status: EXECUTABLE HANDOFF
Date: 2026-02-17
Owner: Frontend Platform + Product Design + Critical Agent

## 0. Purpose
This document maps the real interface surfaces in the current Aethel Workbench/Admin stack so another AI (Claude) can improve UI/UX without changing scope.

Non-negotiable:
1. Keep `/ide` as single shell.
2. Keep explicit capability gates (`NOT_IMPLEMENTED`, `DEPRECATED_ROUTE`, `QUEUE_BACKEND_UNAVAILABLE`, `AUTH_NOT_CONFIGURED`).
3. Do not create a second app shell.
4. Do not remove deprecation contracts from legacy routes.

## 1. Core Entry Surfaces
1. Studio Home entry: `cloud-web-app/web/app/dashboard/page.tsx`
2. Legacy dashboard fallback route: `cloud-web-app/web/app/dashboard/legacy/page.tsx`
3. Studio Home UI shell: `cloud-web-app/web/components/studio/StudioHome.tsx`
4. Studio Home mission block: `cloud-web-app/web/components/studio/StudioHomeMissionPanel.tsx`
5. Studio Home task board block: `cloud-web-app/web/components/studio/StudioHomeTaskBoard.tsx`
6. Studio Home team chat block: `cloud-web-app/web/components/studio/StudioHomeTeamChat.tsx`
7. Studio Home preview/ops block: `cloud-web-app/web/components/studio/StudioHomeRightRail.tsx`
8. Workbench shell page: `cloud-web-app/web/app/ide/page.tsx`
9. Workbench layout orchestrator: `cloud-web-app/web/components/ide/IDELayout.tsx`
10. Global style/tokens/focus/compact density: `cloud-web-app/web/app/globals.css`
11. Installed app entry and shortcuts: `cloud-web-app/web/app/manifest.ts`
12. Global settings workspace route: `cloud-web-app/web/app/settings/page.tsx`
13. Project settings route: `cloud-web-app/web/app/project-settings/page.tsx`
14. Canonical settings surface: `cloud-web-app/web/components/settings/SettingsPage.tsx`

## 2. IDE UI Surfaces (Primary)
### 2.1 Left/center/bottom shell blocks
1. File explorer: `cloud-web-app/web/components/ide/FileExplorerPro.tsx`
2. Preview panel: `cloud-web-app/web/components/ide/PreviewPanel.tsx`
3. AI side panel container: `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
4. Command palette (canonical): `cloud-web-app/web/components/ide/CommandPalette.tsx`
5. Workbench dialogs/hook contracts: `cloud-web-app/web/components/ide/WorkbenchDialogs.tsx`
6. Workbench shared file-tree/path helpers: `cloud-web-app/web/components/ide/workbench-utils.tsx`
7. Workbench context mapping/query helpers: `cloud-web-app/web/components/ide/workbench-context.ts`
8. Workbench info panels (search/git/output/problems/debug/ports): `cloud-web-app/web/components/ide/WorkbenchPanels.tsx`
9. Workbench handoff banner component: `cloud-web-app/web/components/ide/WorkbenchContextBanner.tsx`
10. Workbench status bar composition: `cloud-web-app/web/components/ide/WorkbenchStatusBar.tsx`

### 2.2 Editor experience
1. Monaco editor core: `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`
2. Inline edit modal: `cloud-web-app/web/components/editor/InlineEditModal.tsx`
3. Ghost text decorations: `cloud-web-app/web/components/editor/GhostTextDecorations.tsx`
4. Tab and split experience:
- `cloud-web-app/web/components/editor/TabBar.tsx`
- `cloud-web-app/web/components/editor/SplitEditor.tsx`
5. Breadcrumb/navigation context: `cloud-web-app/web/components/editor/Breadcrumbs.tsx`

### 2.3 Terminal and run loop
1. Multi terminal panel: `cloud-web-app/web/components/terminal/XTerminal.tsx`
2. Integrated terminal adapter: `cloud-web-app/web/components/terminal/IntegratedTerminal.tsx`
3. Terminal widget/session UI: `cloud-web-app/web/components/terminal/TerminalWidget.tsx`

## 3. Admin Enterprise Surfaces (High Traffic)
Priority admin pages:
1. `cloud-web-app/web/app/admin/page.tsx`
2. `cloud-web-app/web/app/admin/payments/page.tsx`
3. `cloud-web-app/web/app/admin/apis/page.tsx`
4. `cloud-web-app/web/app/admin/security/page.tsx`
5. `cloud-web-app/web/app/admin/emergency/page.tsx`
6. `cloud-web-app/web/app/admin/ai-monitor/page.tsx`
7. `cloud-web-app/web/app/admin/analytics/page.tsx`
8. `cloud-web-app/web/app/admin/real-time/page.tsx`
9. `cloud-web-app/web/app/admin/ai-upgrades/page.tsx`
10. `cloud-web-app/web/app/admin/updates/page.tsx`
11. `cloud-web-app/web/app/admin/users/page.tsx`
12. `cloud-web-app/web/app/admin/support/page.tsx`
13. `cloud-web-app/web/app/admin/feature-flags/page.tsx`
14. `cloud-web-app/web/app/admin/promotions/page.tsx`

Admin layout and shared frame:
1. `cloud-web-app/web/app/admin/layout.tsx`
2. `cloud-web-app/web/components/admin/AdminSurface.tsx`

All other admin surface directories:
1. `cloud-web-app/web/app/admin/*/page.tsx`

## 4. API Contracts That Drive UI State
### 4.1 Canonical file authority
1. `cloud-web-app/web/app/api/files/tree/route.ts`
2. `cloud-web-app/web/app/api/files/fs/route.ts`
3. `cloud-web-app/web/app/api/files/raw/route.ts`

### 4.2 Legacy deprecation (must stay explicit)
1. `cloud-web-app/web/app/api/workspace/tree/route.ts`
2. `cloud-web-app/web/app/api/workspace/files/route.ts`
3. `cloud-web-app/web/app/api/auth/sessions/route.ts`
4. `cloud-web-app/web/app/api/auth/sessions/[id]/route.ts`

### 4.3 AI capability gates
1. `cloud-web-app/web/app/api/ai/chat/route.ts`
2. `cloud-web-app/web/app/api/ai/complete/route.ts`
3. `cloud-web-app/web/app/api/ai/action/route.ts`
4. `cloud-web-app/web/app/api/ai/inline-edit/route.ts`
5. `cloud-web-app/web/lib/server/capability-response.ts`

### 4.4 Payment capability gate
1. `cloud-web-app/web/app/api/billing/checkout/route.ts`
2. `cloud-web-app/web/app/api/admin/payments/gateway/route.ts`

### 4.5 Studio Home capability routes
1. `cloud-web-app/web/app/api/studio/session/start/route.ts`
2. `cloud-web-app/web/app/api/studio/session/[id]/route.ts`
3. `cloud-web-app/web/app/api/studio/session/[id]/stop/route.ts`
4. `cloud-web-app/web/app/api/studio/tasks/plan/route.ts`
5. `cloud-web-app/web/app/api/studio/tasks/[id]/run/route.ts`
6. `cloud-web-app/web/app/api/studio/tasks/[id]/validate/route.ts`
7. `cloud-web-app/web/app/api/studio/tasks/[id]/apply/route.ts`
8. `cloud-web-app/web/app/api/studio/tasks/[id]/rollback/route.ts`
9. `cloud-web-app/web/app/api/studio/cost/live/route.ts`
10. `cloud-web-app/web/app/api/studio/access/full/route.ts`
11. `cloud-web-app/web/app/api/studio/access/full/[id]/route.ts`

## 5. Quality Gates and Scans
Canonical checks (must stay green):
1. `cloud-web-app/web/scripts/interface-critical-gate.mjs`
2. `cloud-web-app/web/scripts/check-canonical-components.mjs`
3. `cloud-web-app/web/scripts/check-route-contracts.mjs`
4. `cloud-web-app/web/scripts/check-no-fake-success.mjs`
5. `cloud-web-app/web/scripts/scan-mojibake.mjs`

Generated evidence docs:
1. `cloud-web-app/web/docs/INTERFACE_CRITICAL_SWEEP.md`
2. `cloud-web-app/web/docs/MOJIBAKE_SCAN.md`

CI workflows:
1. `.github/workflows/ui-audit.yml`
2. `.github/workflows/visual-regression-compare.yml`

## 6. P0 UX Expectations for Any Interface Change
1. Keyboard-first navigation with visible focus.
2. Compact density defaults preserved.
3. Empty/error/loading states explicit and consistent.
4. No blocking browser dialogs.
5. No fake success when capability is unavailable.
6. `/ide` query contract preserved:
- required core: `file`, `entry`, `projectId`
- additive handoff: `sessionId`, `taskId`

## 7. Change Guardrails for Claude
1. Prefer editing canonical components under `components/ide/*` and `components/editor/*`.
2. Do not revive duplicate palette/statusbar variants.
3. Do not route frontend back to `/api/workspace/*`.
4. Keep `not-implemented-ui` explicit for gated capabilities.
5. Run gate suite before claiming completion.
6. Do not reintroduce redirect-alias pages; keep alias policy centralized in `next.config.js`.

## Delta 2026-02-20 - Surface/ownership alignment with repository connectivity

### Surface ownership lock
- `dashboard` (Studio Home): `cloud-web-app/web/app/dashboard/page.tsx` + `cloud-web-app/web/components/studio/*`
- `ide` (advanced shell): `cloud-web-app/web/app/ide/page.tsx` + `cloud-web-app/web/components/ide/*`
- `admin`: `cloud-web-app/web/app/admin/*`
- `api`: `cloud-web-app/web/app/api/*`
- `billing`: `cloud-web-app/web/app/api/billing/*` + `cloud-web-app/web/app/api/admin/payments/*`
- `ai`: `cloud-web-app/web/app/api/ai/*` + `cloud-web-app/web/lib/ai*`
- `repo governance`: root `package.json`, `.github/workflows/*`, `tools/repo-connectivity-scan.mjs`

### Entry contract confirmation
- Entry UX stays `/dashboard`.
- Advanced shell stays `/ide`.
- Handoff query contract remains `projectId`, `file`, `entry`, and optional session context.

### Connectivity note
- Placeholder workflow removed and replaced by blocking connectivity gate.
- Stale root/submodule references removed from canonical root config.

### Workflow governance surface
- scanner: `tools/workflow-governance-scan.mjs`
- report: `audit dicas do emergent usar/26_WORKFLOW_GOVERNANCE_MATRIX_2026-02-20.md`
- gate command: `npm run qa:workflow-governance`

### Secret hygiene surface
- scanner: `tools/critical-secret-scan.mjs`
- report: `audit dicas do emergent usar/27_CRITICAL_SECRET_SCAN_2026-02-20.md`
- gate command: `npm run qa:secrets-critical`

### Canonical docs governance surface
- scanner: `tools/canonical-doc-governance-scan.mjs`
- report: `audit dicas do emergent usar/29_CANONICAL_DOC_GOVERNANCE_MATRIX_2026-02-20.md`
- gate command: `npm run qa:canonical-doc-governance`

### Legacy surface exposure policy
- `cloud-web-app/web/components/studio/StudioHome.tsx` exposes legacy dashboard CTA only when `NEXT_PUBLIC_ENABLE_LEGACY_DASHBOARD=true`.
- Default production path keeps legacy CTA hidden to avoid duplicate primary journey.
- `cloud-web-app/web/app/dashboard/legacy/page.tsx` redirects to `/dashboard` when legacy flag is disabled.

### IDE orchestration modularization
- `cloud-web-app/web/app/ide/page.tsx` remains route orchestrator only.
- Shared query/entry maps moved to `cloud-web-app/web/components/ide/workbench-context.ts`.
- Common panel rendering moved to `cloud-web-app/web/components/ide/WorkbenchPanels.tsx`.
- Prompt/confirm/status hooks moved to `cloud-web-app/web/components/ide/WorkbenchDialogs.tsx`.
- Status line composition moved to `cloud-web-app/web/components/ide/WorkbenchStatusBar.tsx`.

### Admin consistency surface
- Shared shell/section/banner/stat/button/table-state primitives are centralized in:
  - `cloud-web-app/web/components/admin/AdminSurface.tsx`
- Shared authenticated client fetch helper:
  - `cloud-web-app/web/components/admin/adminAuthFetch.ts`
- High-traffic admin pages now use the shared primitives:
  - `cloud-web-app/web/app/admin/page.tsx`
  - `cloud-web-app/web/app/admin/payments/page.tsx`
  - `cloud-web-app/web/app/admin/apis/page.tsx`
  - `cloud-web-app/web/app/admin/security/page.tsx`
- Admin shell reliability updates:
  - `cloud-web-app/web/app/admin/layout.tsx` now uses authenticated SWR fetches for status streams.
  - Shell bottom action targets an existing route (`/admin/security`) to avoid dead-end navigation.
