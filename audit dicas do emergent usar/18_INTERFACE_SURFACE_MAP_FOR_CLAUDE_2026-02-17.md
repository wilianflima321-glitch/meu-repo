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
3. Studio Home UI: `cloud-web-app/web/components/studio/StudioHome.tsx`
4. Workbench shell page: `cloud-web-app/web/app/ide/page.tsx`
5. Workbench layout orchestrator: `cloud-web-app/web/components/ide/IDELayout.tsx`
6. Global style/tokens/focus/compact density: `cloud-web-app/web/app/globals.css`
7. Installed app entry and shortcuts: `cloud-web-app/web/app/manifest.ts`

## 2. IDE UI Surfaces (Primary)
### 2.1 Left/center/bottom shell blocks
1. File explorer: `cloud-web-app/web/components/ide/FileExplorerPro.tsx`
2. Preview panel: `cloud-web-app/web/components/ide/PreviewPanel.tsx`
3. AI side panel container: `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`
4. Command palette (canonical): `cloud-web-app/web/components/ide/CommandPalette.tsx`

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

Admin layout and shared frame:
1. `cloud-web-app/web/app/admin/layout.tsx`

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
