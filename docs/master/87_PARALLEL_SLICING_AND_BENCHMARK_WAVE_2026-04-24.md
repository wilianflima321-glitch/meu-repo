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
This follow-up round kept cutting the core creation loop and materially reduced the route shell, preview cockpit, shell panels, terminal runtime, and AI sidecar seams:
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx` is now `379`, while route/workspace orchestration moved out of `FullscreenIDEWorkspaceBridge.tsx` and into `useFullscreenIDEBridgeSections.ts` (`141`) plus `useFullscreenIDEBridgeProps.types.ts` (`117`), with `useFullscreenIDEBridgeProps.ts` now only `19`
- `cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.tsx` is now only `89`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx` is now only `44`, with preview cockpit density moved into `WorkbenchPreviewRuntimeControls.tsx` (`134`), `WorkbenchPreviewRuntimeSurface.tsx` (`87`), `WorkbenchPreviewModeHeader.tsx` (`70`), and `workbenchPreviewPaneModels.ts` (`56`)
- `cloud-web-app/web/components/preview/SceneViewportSurface.tsx` is now `98` after extracting `SceneViewportStage.tsx` (`117`), `useSceneViewportSurfaceState.ts` (`149`), and `useSceneViewportPlayback.ts` (`53`)
- `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellPanels.tsx` is now `114`, while `ModernIDEShellChrome.tsx` (`29`) and `ModernIDEShellSideColumns.tsx` (`8`) are thin barrels over dedicated chrome/side-column parts
- `cloud-web-app/web/components/terminal/BaseXTerminal.tsx` is now `105`, with terminal runtime density moved into `useTerminalRuntime.ts` (`150`), `useTerminalTransport.ts` (`145`), `useTerminalSessions.ts` (`120`), `terminalSessionApi.ts` (`71`), `terminalSessionConnection.ts` (`61`), `useTerminalSelection.ts` (`64`), `useTerminalShortcuts.ts` (`51`), `useTerminalViewport.ts` (`66`), `useTerminalOptions.ts` (`58`), and `useTerminalImperativeHandle.ts` (`51`)
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx` remains `292`, with calmer seams now split into `AIChatHistoryModeRail.tsx`, `AIChatBenchmarkTelemetry.tsx`, `AIChatContextStrip.tsx`, and `useAIChatPanelUiState.ts`
- the chat artifact lane also picked up stronger operator grammar: `MessageBubble.tsx` is now `110`, with message/code actions split into `MessageBubbleContent.tsx` (`82`), `MessageBubbleActionBar.tsx` (`93`), `MessageBubbleCodeActions.tsx` (`208`), and `useMessageBubbleCopyActions.ts` (`56`), while `AIChatComposer.tsx` (`282`) plus `useAIChatComposerState.ts` (`235`) now drive mode-specific placeholders, helper copy, quick prompts, quick mentions, and request biasing for ask/plan/execute/review/live instead of reading as one generic prompt box
- the root UI provider stack was also isolated: `cloud-web-app/web/components/ClientLayout.tsx` is now a `17`-line bootstrap, `cloud-web-app/web/components/providers/CoreUiProviders.tsx` owns theme/toast, `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx` now supports `full` and `light` route surfaces, `cloud-web-app/web/components/providers/StudioRuntimeRouteLayout.tsx` now provides browser-only route shells for dashboard/ide/settings/profile/project-settings/nexus/marketplace, `cloud-web-app/web/app/(auth)/layout.tsx` is now a pass-through shell, `login-v2.tsx` / `register-v2.tsx` mount `CoreUiProviders` browser-side under `force-dynamic` + `ssr: false`, and `cloud-web-app/web/app/admin/layout.tsx` plus `cloud-web-app/web/app/billing/layout.tsx` now browser-load light-runtime shells
- build hygiene also tightened: `cloud-web-app/web/package.json` now forces `NODE_ENV=production` for `build` / `build:analyze`, and the canonical env templates no longer pin `NODE_ENV=development`
- public/auth edge surfaces were isolated one wave further: `app/verify-email/layout.tsx` and `app/design-system-demo/layout.tsx` are now pass-through, while `/verify-email`, `/reset-password`, `/forgot-password`, `/design-system-demo`, `/billing/checkout`, and `/billing/success` now render browser-only content under `force-dynamic` + `ssr: false`

This is real progress.
It does **not** mean the workbench is solved.
It means the next cuts are now safer and more localized.
It also does **not** mean production build parity is closed: the latest evidence across `cloud-web-app/web/build-probe-2026-04-24-public-auth-browser-isolation.log`, `cloud-web-app/web/build-probe-2026-04-24-admin-billing-light-runtime.log`, and `cloud-web-app/web/build-probe-2026-04-24-studio-route-layout-browser-shells.log` still reproduces the same `<Html>` / `useContext` prerender failure class after the root split, auth-route isolation, fallback-page experiment, the admin/billing light-runtime pass, and broader studio-route browser shells; the latest passes removed `/login`, `/register`, `/verify-email`, `/reset-password`, `/forgot-password`, `/design-system-demo`, `/billing/checkout`, `/billing/success`, `/admin`, `/admin/*`, `/billing`, `/billing/cancel`, and `/billing/invoices` from the final export list, but the broader App Router failure remained.

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
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx`: `379`
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`: `292`
- `cloud-web-app/web/components/ai-chat/AIChatComposer.tsx`: `282`
- `cloud-web-app/web/components/ai-chat/useAIChatComposerState.ts`: `235`
- `cloud-web-app/web/components/ide/fullscreen/useFullscreenIDEBridgeSections.ts`: `141`
- `cloud-web-app/web/components/preview/usePreviewRuntime.ts`: `107`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`: `99`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.types.ts`: `62`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchSplitEditorSurface.tsx`: `121`
- `cloud-web-app/web/components/preview/previewRuntimeState.ts`: `38`
- `cloud-web-app/web/components/preview/usePreviewRuntimeHealthMonitor.ts`: `57`
- `cloud-web-app/web/components/preview/usePreviewRuntimeHmrBridge.ts`: `78`
- `cloud-web-app/web/components/preview/RuntimePreviewSurface.tsx`: `198`
- `cloud-web-app/web/components/preview/SceneViewportWorkflowDrawer.tsx`: `163`
- `cloud-web-app/web/components/terminal/useTerminalSessions.ts`: `120`
- `cloud-web-app/web/components/terminal/useTerminalRuntime.ts`: `150`
- `cloud-web-app/web/components/preview/useSceneViewportSurfaceState.ts`: `149`
- `cloud-web-app/web/components/terminal/useTerminalTransport.ts`: `145`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx`: `134`

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
### 1. `FullscreenIDE.tsx`
Why now:
- it is still the densest user-facing shell in the canonical workbench
- mode transitions, file state, preview handoff, and AI/artifact routing still meet here too closely

Recommended seams:
- `components/ide/fullscreen/useWorkbenchFileSession.ts`
- `components/ide/fullscreen/useWorkbenchModeRouting.ts`
- `components/ide/fullscreen/WorkbenchMainGrid.tsx`
- `components/ide/fullscreen/WorkbenchActivityStatus.tsx`

User-facing quality target:
- the workbench should feel like a fast cockpit with obvious mode ownership, not one shell deciding everything

### 2. `useFullscreenIDEBridgeSections.ts`
Why now:
- route/workspace orchestration is no longer in the bridge component, but it still lives in one dense section-builder seam
- this is the new place where fullscreen bridge composition can become calmer and easier to test

Recommended seams:
- `components/ide/fullscreen/useWorkbenchBridgeChrome.ts`
- `components/ide/fullscreen/useWorkbenchBridgeEditorProps.ts`
- `components/ide/fullscreen/useWorkbenchBridgePreviewProps.ts`
- `components/ide/fullscreen/workbenchBridgeModels.ts`

User-facing quality target:
- keep the route shell fast and predictable so the user feels one coherent cockpit, not a handoff chain of ad-hoc prop plumbing

### 3. `usePreviewRuntime.ts` + preview runtime seams
Why now:
- the preview lane is no longer blocked by one giant surface, which means the next work can focus on runtime trust, fallback states, and share confidence
- viewport polish is now distributed across `RuntimePreviewSurface.tsx`, `SceneViewportWorkflowDrawer.tsx`, `useSceneViewportSurfaceState.ts`, and `WorkbenchPreviewRuntimeControls.tsx`

Recommended seams:
- `components/preview/usePreviewSessionState.ts`
- `components/preview/PreviewRuntimeHealthRail.tsx`
- `components/preview/PreviewFallbackState.tsx`
- keep `SceneViewportWorkflowDrawer.tsx`, `RuntimePreviewSurface.tsx`, and `useSceneViewportSurfaceState.ts` stable as dedicated seams

User-facing quality target:
- preview should feel trustworthy, shareable, and more like a primary validation cockpit than a debug attachment

### 4. `useTerminalRuntime.ts` + terminal session seams
Why now:
- terminal credibility now lives in runtime/session behavior, not in the shell wrapper
- the remaining density is transport, buffer, and session lifecycle logic that should be easier to test and easier to evolve once split

Recommended seams:
- keep `useTerminalTransport.ts`, `useTerminalSessions.ts`, `useTerminalSelection.ts`, `useTerminalShortcuts.ts`, `useTerminalViewport.ts`, `useTerminalOptions.ts`, and `useTerminalImperativeHandle.ts` stable as dedicated seams
- add `components/terminal/TerminalViewport.tsx`
- add `components/terminal/useTerminalClipboardState.ts`
- add `components/terminal/workbenchTerminalModels.ts`

User-facing quality target:
- terminal should feel stable, legible, and closer to the surrounding project context instead of like an embedded utility block

### 5. `AIChatPanelPro.tsx`
Why now:
- it is no longer an emergency monolith, which means the next step can be calmer and more benchmark-driven
- the remaining leverage is in context grammar, artifact attachment, clearer advanced-controls discoverability, and a richer timeline than the current stop/copy/action polish pass

Recommended seams:
- `components/ai-chat/AIChatTimeline.tsx`
- `components/ai-chat/useAIChatHistoryMode.ts`
- `components/ai-chat/useAIChatBenchmarkTelemetry.ts`
- stabilize `components/ai-chat/AIChatComposer.tsx` and `components/ai-chat/useAIChatComposerState.ts`

User-facing quality target:
- preserve the feeling of AI glued to the current artifact, while making the smaller shell easier to test and easier to scan
- keep the calmer bubble/action grammar and real interrupt affordance, but avoid claiming benchmark parity until timeline/context/history depth catches up

### 6. `WorkbenchPreviewRuntimeControls.tsx` and `WorkbenchPreviewRuntimeSurface.tsx`
Why now:
- `WorkbenchPreviewPane.tsx` is now thin, so the real preview cockpit leverage sits in these extracted modules
- this is where trust, share, runtime health, and action grammar can now be benchmark-polished without re-growing the pane shell

Recommended seams:
- `components/ide/fullscreen/PreviewTrustStrip.tsx`
- `components/ide/fullscreen/PreviewShareActions.tsx`
- `components/ide/fullscreen/PreviewStatusRail.tsx`
- `components/ide/fullscreen/useWorkbenchPreviewSession.ts`

User-facing quality target:
- preview should feel trustworthy, shareable, and one click closer to deploy

## Parallel Execution Waves
### Wave 1 - parallel work with disjoint write scopes
Run in parallel where write scopes do not overlap:
1. `useTerminalRuntime.ts` / `useTerminalSessions.ts`
2. `usePreviewRuntime.ts` / `RuntimePreviewSurface.tsx`
3. `AIChatPanelPro.tsx`
4. `WorkbenchPreviewRuntimeControls.tsx` / `WorkbenchPreviewRuntimeSurface.tsx`
5. `ModernIDEShellChrome.tsx` and the extracted chrome parts

### Wave 1.5 - core route-shell bridge
Run sequentially because the write scope is shared:
1. `useFullscreenIDEBridgeSections.ts`
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
2. shrink `FullscreenIDE.tsx` and then `useFullscreenIDEBridgeSections.ts`
3. keep polishing preview through `usePreviewRuntime.ts`, `RuntimePreviewSurface.tsx`, `SceneViewportWorkflowDrawer.tsx`, and `useSceneViewportSurfaceState.ts`
4. keep stabilizing `useTerminalRuntime.ts` and `useTerminalSessions.ts`
5. turn the thinner fullscreen preview modules into the trust/share cockpit the benchmark set expects
6. stabilize `AIChatPanelPro.tsx`, `AIChatComposer.tsx`, and `useAIChatComposerState.ts` and turn the smaller shell into a benchmark-grade artifact lane
7. keep shell-density passes in `ModernIDEShellChrome.tsx` and the extracted chrome/side-column parts
8. promote preview, collaboration, and deploy from present to trusted

## One-Line Reading
The audits no longer leave us with ambiguity.
The fastest honest path is to keep slicing by real UX seams, starting with preview and the remaining workbench core.
