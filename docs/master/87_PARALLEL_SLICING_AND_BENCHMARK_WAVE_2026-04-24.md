# 87_PARALLEL_SLICING_AND_BENCHMARK_WAVE_2026-04-24
Date: 2026-04-24
Status: ACTIVE
Role: parallel slicing wave plan that turns the audit cluster into a concrete, benchmark-aware execution order

## Why This Exists
The canonical audit set already tells us what is wrong.
What it did not yet centralize in one place is the next slicing wave after the latest workbench refactors.

This document exists to answer four practical questions:
1. which large files still carry too much product responsibility
2. which ones most affect the end-user quality bar first
3. how we should split them without losing the benchmark qualities from Cursor, Windsurf, Linear, Vercel, Figma, and Unreal
4. what the next parallel execution waves should be

Use this document together with:
- `docs/master/82_AUDITORIA_V5_AETHEL_ENGINE_DEEP_2026-04-19.md`
- `docs/master/83_AUDITORIA_PROFUNDA_SISTEMAS_INTERFACES_GITHUB_2026-04-22.md`
- `docs/master/84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22.md`
- `docs/master/86_AUDITORIA_V6_SEM_PIEDADE_2026-04-21.md`
- `docs/master/81_VALIDATED_PRIORITY_BACKLOG_2026-04-20.md`
- `docs/master/85_EXECUTION_STATUS_MAP_2026-04-22.md`

## Visual Anchors Read Alongside The Audits
- `docs/master/assets/auditoria-v5-2026-04-19/cursor-ide-composer-multifile.avif`
- `docs/master/assets/auditoria-v5-2026-04-19/windsurf-cascade-agent-timeline.webp`
- `docs/master/assets/auditoria-v5-2026-04-19/vercel-dashboard-design-language.webp`
- `docs/master/assets/auditoria-v5-2026-04-19/linear-density-keyboard-first.webp`
- `docs/master/assets/auditoria-v5-2026-04-19/dashboardapp-vs-linear-gold-standard.webp`
- `docs/master/assets/auditoria-v5-2026-04-19/unreal-viewport-details-inspector-packt.avif`
- `docs/master/assets/auditoria-v5-2026-04-19/unreal-density-inspector-viewport-outliner-forums.avif`

These references should keep driving spacing, density, cockpit hierarchy, and preview-first composition while files are being sliced.

## Round Delta On 2026-04-24
This follow-up round kept cutting the core creation loop and materially reduced the route shell, preview cockpit, shell panels, and terminal runtime hotspots:
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx` is now `356` after moving route/workspace orchestration into `cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.tsx` (`373`)
- `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellPanels.tsx` is now `114` after extracting `ModernIDEShellCenterStack.tsx` (`109`) and `ModernIDEShellSideColumns.tsx` (`149`)
- `cloud-web-app/web/components/preview/SceneViewportSurface.tsx` is now `219` after extracting `SceneViewportWorkflowDrawer.tsx` (`151`) and `useViewportExport.ts` (`106`)
- `cloud-web-app/web/components/terminal/BaseXTerminal.tsx` is now `99`, with terminal runtime density moved into `useTerminalRuntime.ts` (`290`)
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx` remains `260`, which means the next work is benchmark-grade polish and artifact attachment rather than emergency decomposition
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx` remains `249` and is now the clearest top-level preview cockpit seam for trust, share, and deploy grammar

This is real progress.
It does **not** mean the workbench is solved.
It means the next cuts are now safer and more localized.

## Benchmark Rules We Must Preserve While Slicing
### Cursor and Windsurf
- AI should feel attached to the artifact, not parked in a generic sidebar
- editor actions should remain keyboard-first and fast to parse
- the shell should keep a strong sense of active context, not just generic tabs and panels

### Linear and Vercel
- density should increase without becoming noisy
- primary actions should read instantly from spacing and hierarchy, not from verbose labels
- toolbars should feel intentional and compact, not like a checklist of toggles

### Unreal
- preview must continue moving toward a primary creation surface, not a secondary debug panel
- inspector, outliner, and viewport responsibilities need cleaner separation
- state, selection, and context should feel spatial and immediate

### Figma
- design-system coherence matters as much as feature count
- sliced files should align to real UI seams: shell, chrome, surface, inspector, state, empty-state, and error-state

## Current Measured User-Facing Hotspots
### Wave A - highest leverage for user perception
- `cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.tsx`: `373`
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx`: `356`
- `cloud-web-app/web/components/terminal/useTerminalRuntime.ts`: `290`
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`: `260`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx`: `249`
- `cloud-web-app/web/components/preview/SceneViewportSurface.tsx`: `219`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`: `197`
- `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellChrome.tsx`: `196`
- `cloud-web-app/web/components/preview/usePreviewRuntime.ts`: `191`
- `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellSideColumns.tsx`: `149`

### Wave B - dense product surfaces next in line
- `cloud-web-app/web/app/admin/ai-monitor/page.tsx`: `1249`
- `cloud-web-app/web/components/settings/SettingsUI.tsx`: `1184`
- `cloud-web-app/web/components/scene-editor/SceneEditor.tsx`: `1193`
- `cloud-web-app/web/components/engine/DetailsPanel.tsx`: `1173`
- `cloud-web-app/web/components/assets/ContentBrowser.tsx`: `1051`
- `cloud-web-app/web/components/marketplace/CreatorDashboard.tsx`: `1060`
- `cloud-web-app/web/components/settings/SettingsPage.tsx`: `1039`
- `cloud-web-app/web/components/dashboard/ProjectsDashboard.tsx`: `1006`

### Wave C - specialist editors and lower-priority breadth
- `cloud-web-app/web/components/audio/SoundCueEditor.tsx`: `1247`
- `cloud-web-app/web/components/engine/LevelEditor.tsx`: `1217`
- `cloud-web-app/web/components/terrain/TerrainSculptingEditor.tsx`: `1202`
- `cloud-web-app/web/components/narrative/QuestEditor.tsx`: `1196`
- `cloud-web-app/web/components/video/VideoTimelineEditor.tsx`: `1194`

## Best Next Slicing Seams
### 1. `FullscreenIDEWorkspaceBridge.tsx`
Why now:
- it now carries the densest route/workspace orchestration seam in the canonical workbench
- this is where file session, mode routing, bridge callbacks, preview handoff, and AI/apply context still meet too closely

Recommended seams:
- `components/ide/fullscreen/useWorkbenchFileSession.ts`
- `components/ide/fullscreen/useWorkbenchModeRouting.ts`
- `components/ide/fullscreen/useWorkbenchWorkspaceRoute.ts`
- `components/ide/fullscreen/WorkbenchMainGrid.tsx`

User-facing quality target:
- the workbench should feel like a fast cockpit with obvious mode ownership, not a route bridge that still decides too much

### 2. `useTerminalRuntime.ts`
Why next:
- terminal credibility now lives in runtime/session behavior, not in the shell wrapper
- the remaining density is transport, buffer, and session lifecycle logic that should be easier to test and easier to evolve once split

Recommended seams:
- `components/terminal/useTerminalTransport.ts`
- `components/terminal/useTerminalSelection.ts`
- `components/terminal/useTerminalShortcuts.ts`
- `components/terminal/TerminalViewport.tsx`

User-facing quality target:
- terminal should feel stable, legible, and closer to the surrounding project context instead of like an embedded utility block

### 3. `WorkbenchPreviewPane.tsx`
Why now:
- preview trust, share, deploy, and runtime-health grammar are now more valuable to users than shaving a few more lines off the raw scene viewport
- this seam decides whether preview reads like a primary validation cockpit or just another panel

Recommended seams:
- `components/ide/fullscreen/useWorkbenchPreviewSession.ts`
- `components/ide/fullscreen/PreviewTrustStrip.tsx`
- `components/ide/fullscreen/PreviewShareActions.tsx`
- `components/ide/fullscreen/PreviewStatusRail.tsx`

User-facing quality target:
- preview should feel trustworthy, shareable, and one click closer to deploy

### 4. `SceneViewportSurface.tsx`
Why now:
- it is no longer a giant file, which means the next work can focus on viewport polish instead of brute-force decomposition
- inspector, outliner, and workflow drawer behavior can now be refined without re-growing the canonical router

Recommended seams:
- `components/preview/useSceneViewportSession.ts`
- `components/preview/SceneViewportChrome.tsx`
- `components/preview/SceneViewportSelectionRail.tsx`
- keep `SceneViewportWorkflowDrawer.tsx` and `useViewportExport.ts` stable as dedicated seams

User-facing quality target:
- the viewport should keep moving toward the Unreal-style primary creation surface described by the benchmark set

### 5. `AIChatPanelPro.tsx`
Why now:
- it is no longer an emergency monolith, which means the next step can be calmer and more benchmark-driven
- the remaining leverage is in context grammar, artifact attachment, and clearer advanced-controls discoverability

Recommended seams:
- `components/ai-chat/AIChatTimeline.tsx`
- `components/ai-chat/AIChatContextStrip.tsx`
- `components/ai-chat/useAIChatHistoryMode.ts`
- `components/ai-chat/useAIChatBenchmarkTelemetry.ts`

User-facing quality target:
- preserve the feeling of AI glued to the current artifact, while making the smaller shell easier to test and easier to scan

### 6. `ModernIDEShellChrome.tsx` and `ModernIDEShellSideColumns.tsx`
Why now:
- the shell is now modular enough that the next gains are density and navigation quality, not just file size
- this is where benchmark-grade cockpit hierarchy from Linear, Vercel, Cursor, and Unreal still needs one more pass

Recommended seams:
- `components/ide/modern-shell/useWorkbenchPanelDensity.ts`
- `components/ide/modern-shell/WorkbenchStatusCluster.tsx`
- `components/ide/modern-shell/WorkbenchActivityRail.tsx`

User-facing quality target:
- keep navigation, panel density, and active-context grammar compact and cockpit-like while the workbench stays readable

## Parallel Execution Waves
### Wave 1 - parallel work with disjoint write scopes
Run in parallel where write scopes do not overlap:
1. `useTerminalRuntime.ts`
2. `WorkbenchPreviewPane.tsx`
3. `SceneViewportSurface.tsx`
4. `AIChatPanelPro.tsx`
5. `ModernIDEShellChrome.tsx` / `ModernIDEShellSideColumns.tsx`

### Wave 1.5 - core route-shell bridge
Run sequentially because the write scope is shared:
1. `FullscreenIDEWorkspaceBridge.tsx`
2. `FullscreenIDE.tsx`

### Wave 2 - dense product surfaces
After Wave 1 stabilizes:
1. `ProjectsDashboard.tsx`
2. `SettingsUI.tsx`
3. `SettingsPage.tsx`
4. `CreatorDashboard.tsx`
5. `app/admin/ai-monitor/page.tsx`

### Wave 3 - domain editors
After the workbench/studio shell is calmer:
1. `SceneEditor.tsx`
2. `DetailsPanel.tsx`
3. `ContentBrowser.tsx`
4. domain editors such as audio, terrain, quest, and timeline surfaces

## Definition Of Done For Every Slice
A slice is only complete when all of this remains true:
- lint passes
- typecheck passes
- `qa:enterprise-gate` stays green
- the user-facing interaction grammar gets better, not just smaller
- no loss of shortcuts, presence, preview trust states, or artifact context
- the parent file becomes more obviously orchestration-only

## Current Truthful Next Order
1. keep production build parity open until `next build` proves end-to-end success
2. shrink `FullscreenIDEWorkspaceBridge.tsx` and then `FullscreenIDE.tsx`
3. keep stabilizing `useTerminalRuntime.ts`
4. turn `WorkbenchPreviewPane.tsx` into the trust/share cockpit the benchmark set expects
5. keep polishing `SceneViewportSurface.tsx` through its extracted workflow/export seams
6. stabilize `AIChatPanelPro.tsx` and turn the smaller shell into a benchmark-grade artifact lane
7. keep shell-density passes in `ModernIDEShellChrome.tsx` and `ModernIDEShellSideColumns.tsx`
8. promote preview, collaboration, and deploy from present to trusted

## One-Line Reading
The audits no longer leave us with ambiguity.
The fastest honest path is to keep slicing by real UX seams, starting with preview and the remaining workbench core.
