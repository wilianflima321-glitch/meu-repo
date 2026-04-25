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
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx` is now `313`, with calmer seams now split into `AIChatHistoryModeRail.tsx`, `AIChatBenchmarkTelemetry.tsx`, `AIChatContextStrip.tsx`, `AIChatTimeline.tsx`, `useAIChatHistoryMode.ts`, and `useAIChatPanelUiState.ts`
- the chat artifact lane also picked up stronger operator grammar: `MessageBubble.tsx` is now `110`, with message/code actions split into `MessageBubbleContent.tsx` (`82`), `MessageBubbleActionBar.tsx` (`93`), `MessageBubbleCodeActions.tsx` (`208`), and `useMessageBubbleCopyActions.ts` (`56`), while `AIChatComposer.tsx` (`282`) plus `useAIChatComposerState.ts` (`220`) now drive mode-specific placeholders, helper copy, quick prompts, quick mentions, and request shaping for ask/plan/execute/review/live instead of reading as one generic prompt box
- the root UI provider stack was also isolated: `cloud-web-app/web/components/ClientLayout.tsx` is now a `17`-line bootstrap, `cloud-web-app/web/components/providers/CoreUiProviders.tsx` owns theme/toast, `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx` now supports `full` and `light` route surfaces, `cloud-web-app/web/components/providers/StudioRuntimeRouteLayout.tsx` now provides browser-only route shells for dashboard/ide/settings/profile/project-settings/nexus/marketplace, `cloud-web-app/web/app/(auth)/layout.tsx` is now a pass-through shell, `login-v2.tsx` / `register-v2.tsx` mount `CoreUiProviders` browser-side under `force-dynamic` + `ssr: false`, and `cloud-web-app/web/app/admin/layout.tsx` plus `cloud-web-app/web/app/billing/layout.tsx` now browser-load light-runtime shells
- build hygiene also tightened: `cloud-web-app/web/package.json` now forces `NODE_ENV=production` for `build` / `build:analyze`, and the canonical env templates no longer pin `NODE_ENV=development`
- public/auth edge surfaces were isolated one wave further: `app/verify-email/layout.tsx` and `app/design-system-demo/layout.tsx` are now pass-through, while `/verify-email`, `/reset-password`, `/forgot-password`, `/design-system-demo`, `/billing/checkout`, and `/billing/success` now render browser-only content under `force-dynamic` + `ssr: false`
- the dense settings surface was also reduced this wave: `cloud-web-app/web/components/settings/SettingsUI.tsx` is now `159` lines after extracting the catalog into `components/settings/ui/default-settings.ts` (`364`), the provider/store into `components/settings/ui/settings-provider.tsx` (`121`), field renderers into `components/settings/ui/SettingsField.tsx` (`245`), search/category derivation into `components/settings/ui/useSettingsUiState.ts` (`86`), and the denser summary/sidebar/results/popup chrome into `components/settings/ui/SettingsSummaryBar.tsx`, `SettingsCategorySidebar.tsx`, `SettingsResultsPane.tsx`, and `QuickSettingsPopup.tsx`
- the settings shell also picked up benchmark-grade density polish instead of just file-size cleanup: clearer English copy, explicit visible/modified counts, and stronger keyboard-search guidance
- the current checkout now truly routes `app/dashboard/layout.tsx`, `app/ide/layout.tsx`, `app/settings/layout.tsx`, `app/profile/layout.tsx`, `app/project-settings/layout.tsx`, `app/nexus/layout.tsx`, and `app/marketplace/layout.tsx` through `components/providers/StudioRuntimeRouteLayout.tsx`; the fresh clean rerun in `cloud-web-app/web/build-probe-2026-04-24-settings-wave-route-layout.log` proves the alignment but **does not** close build parity, because the same `/404`, `/500`, `/_not-found`, public/docs, and seven-studio-route export cluster still remained after the run reached `Generating static pages (213/213)`
- the canonical shell also closed one of the most visible remaining benchmark gaps: `cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx` now mounts `MultiTerminalPanel.tsx` directly in the main workbench, `ModernIDEShellCenterStack.tsx` now acts as a bottom-lane switcher between `AI Console` and `Terminal`, and the shell chrome now exposes `Terminal` as a separate first-class surface instead of hiding terminal behavior behind the preview console lane
- the shell chrome also stopped bluffing: `cloud-web-app/web/components/ide/modern-shell/chromeStatusBar.tsx` now reads real shell/editor/preview state instead of the old `main / 0 / 0 / Prettier / UTF-8 / Ln 1, Col 1 / AI Ready` placeholder grammar, while `useWorkbenchShellState.ts`, `WorkbenchEditorCanvas.tsx`, and `MonacoEditorPro.tsx` now publish live cursor/selection state so the footer can reflect active file/language, split-pane ownership, diagnostics, collaboration, current lanes, and preview-runtime health honestly
- the shell source-control slice is also no longer filler-only: `cloud-web-app/web/components/ide/modern-shell/useShellSourceControlTruth.ts` now probes the existing git status API from the canonical shell, so `chromeStatusBar.tsx` can surface real branch / ahead-behind / dirty truth when the repo path resolves and can explicitly report `Git indisponivel` when it cannot
- the canonical editor lane also closed another stale benchmark gap: `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx` now mounts `Breadcrumbs.tsx` above the editor toolbar and feeds it with the live cursor line plus current outline symbols, so file-path and symbol breadcrumbs are now part of the real workbench instead of sitting as latent editor capability outside the main shell
- this also corrects part of the historical V6 drift: on the current branch `cloud-web-app/web/components/editor/MonacoEditorPro.tsx` is `867` lines and already binds `Cmd/Ctrl+K` to `InlineEditModal`; the real remaining inline-AI gap is `InlineAIChat.tsx`, which still exists more as latent capability than as a productized canonical editor-lane surface
- the keyboard layer is now more honest too: `cloud-web-app/web/lib/keybindings/keybindings-service.ts` no longer pretends `Ctrl+I` opens a productized inline-chat lane; it routes to the canonical `AI Console` instead, while inline chat remains an explicit open gap rather than fake-complete behavior
- the dashboard also closed one of the ugliest hidden-gold gaps from the old audits: `cloud-web-app/web/components/useAethelDashboardRuntime.tsx` now opens `OnboardingWizard` from the persisted `/api/onboarding` welcome state instead of the looser first-value-guide toggle, and `cloud-web-app/web/components/dashboard/useDashboardActions.ts` now syncs wizard complete/skip outcomes back to `/api/onboarding` instead of leaving the wizard as an effectively orphaned surface
- preview/deploy trust also moved from latent backend capability into the visible cockpit: `cloud-web-app/web/components/preview/previewDeployTrust.ts` plus `usePreviewDeployTrust.ts` now persist the last known deploy, derive the best share target, and let `PreviewRuntimeToolbar.tsx` + `WorkbenchPreviewRuntimeControls.tsx` start deploys, refresh status, open the deploy site, and copy the strongest available share link from the same preview lane the user is validating
- the deploy status loop is now coherent across surfaces too: `cloud-web-app/web/components/ide/modern-shell/deployTopbarAction.tsx` and `cloud-web-app/web/app/deploy/[id]/page.tsx` now feed the same preview deploy trust store, so top bar, status page, and preview lane all agree on the latest deployment instead of acting like isolated features
- preview runtime trust itself is now less hand-wavy: `cloud-web-app/web/components/preview/PreviewRuntimeTrustNotice.tsx` now surfaces readiness / health / fallback / next-move guidance above the canonical visual surface, while `PreviewLifecycleChrome.tsx`, `usePreviewRuntime.ts`, `previewRuntimeState.ts`, `previewRuntime.types.ts`, and `usePreviewRuntimeHealthMonitor.ts` now track `lastHealthCheckAt`, `lastHealthyAt`, and `failureCount` so warmup can degrade honestly instead of looking silently stuck forever
- collaboration presence is also less hidden in the cockpit: `cloud-web-app/web/components/collaboration/FilePresenceDot.tsx` now gives the explorer compact file/folder presence stacks, while `FileExplorerPro.tsx`, `WorkbenchSidebar.tsx`, `FullscreenIDEWorkspace.tsx`, and `FullscreenIDEWorkspaceBridge.tsx` now pass `collaborationPeers` into the canonical tree so file presence is visible where users actually decide what to open next
- the public shell also took one more reduction pass: `cloud-web-app/web/components/ui/PublicHeader.tsx` is now a hook-free static header with a CSS-only mobile menu, which removes one more live-browser dependency from the public/docs cluster without overclaiming that prerender parity is solved
- the follow-up clean rerun in `cloud-web-app/web/build-probe-2026-04-24-terminal-first-class.log` confirmed that this shell work did not introduce a new failure class: the build still reached `Generating static pages (213/213)` and still failed on the same `<Html>` + `useContext` blocker cluster
- the next root-level build probes stayed honest instead of widening the drift surface: removing the legacy `cloud-web-app/web/pages/404.tsx`, `pages/500.tsx`, `pages/_app.tsx`, `pages/_document.tsx`, and `pages/_error.tsx` fallback chain, stripping `ClientLayout` out of `app/layout.tsx`, and collapsing `app/error.tsx`, `app/global-error.tsx`, and `app/not-found.tsx` to minimal boundaries still did **not** clear the old prerender path; `cloud-web-app/web/build-probe-2026-04-25-pages-fallback-chain-removed.log` and `cloud-web-app/web/build-probe-2026-04-25-root-boundaries-minimal.log` reproduced the same `/404`, `/500`, and `/_not-found` failure class
- the practical mitigation is now explicit instead of implied: `cloud-web-app/web/package.json` points `npm run build` to `next build --experimental-build-mode compile`, while `npm run build:prerender-probe` preserves the older generate path for diagnosis
- this mitigation is backed by real evidence, not wishful wording: `cloud-web-app/web/build-probe-2026-04-25-compile-mode.log` completed successfully, and the resulting artifact booted under `next start` with `200` returned for `/` in `cloud-web-app/web/start-probe-2026-04-25-compile-mode.out.log`
- that does **not** mean full prerender parity is solved; it means the branch now has a production-viable server-rendered build path while the original `<Html>` / `useContext` export cluster remains open under `npm run build:prerender-probe`
- the public prerender suspect set also got one honest reduction pass this round: `PublicHeader.tsx` no longer depends on `use-browser-pathname.ts`, and `/terms` + `/privacy` now use static last-updated labels instead of runtime date calls; the latest direct rerun still stalled at `Creating an optimized production build ...`, so this is a surface simplification, not a false claim that the broader public-shell blocker is closed

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
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`: `313`
- `cloud-web-app/web/components/ide/modern-shell/chromeStatusBar.tsx`: `454`
- `cloud-web-app/web/components/ide/modern-shell/useShellSourceControlTruth.ts`: `262`
- `cloud-web-app/web/components/ai-chat/AIChatComposer.tsx`: `282`
- `cloud-web-app/web/components/ai-chat/useAIChatComposerState.ts`: `220`
- `cloud-web-app/web/components/ai-chat/useAIChatHistoryMode.ts`: `107`
- `cloud-web-app/web/components/ai-chat/AIChatTimeline.tsx`: `90`
- `cloud-web-app/web/components/ide/fullscreen/useFullscreenIDEBridgeSections.ts`: `158`
- `cloud-web-app/web/components/preview/usePreviewRuntime.ts`: `116`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx`: `219`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`: `99`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.types.ts`: `62`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchSplitEditorSurface.tsx`: `121`
- `cloud-web-app/web/components/preview/previewRuntimeState.ts`: `38`
- `cloud-web-app/web/components/preview/usePreviewRuntimeHealthMonitor.ts`: `57`
- `cloud-web-app/web/components/preview/usePreviewRuntimeHmrBridge.ts`: `78`
- `cloud-web-app/web/components/preview/RuntimePreviewSurface.tsx`: `235`
- `cloud-web-app/web/components/preview/PreviewRuntimeTrustNotice.tsx`: `131`
- `cloud-web-app/web/components/preview/SceneViewportWorkflowDrawer.tsx`: `163`
- `cloud-web-app/web/components/terminal/useTerminalSessions.ts`: `120`
- `cloud-web-app/web/components/terminal/useTerminalRuntime.ts`: `150`
- `cloud-web-app/web/components/preview/useSceneViewportSurfaceState.ts`: `149`
- `cloud-web-app/web/components/terminal/useTerminalTransport.ts`: `145`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx`: `134`
- `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`: `867`

### Wave B - dense product surfaces next in line
- `cloud-web-app/web/app/admin/ai-monitor/page.tsx`: `1249`
- `cloud-web-app/web/components/scene-editor/SceneEditor.tsx`: `1193`
- `cloud-web-app/web/components/engine/DetailsPanel.tsx`: `1173`
- `cloud-web-app/web/components/assets/ContentBrowser.tsx`: `1128`
- `cloud-web-app/web/components/marketplace/CreatorDashboard.tsx`: `1120`
- `cloud-web-app/web/components/settings/SettingsPage.tsx`: `1086`
- `cloud-web-app/web/components/dashboard/ProjectsDashboard.tsx`: `1076`
- `cloud-web-app/web/components/engine/ProjectSettings.tsx`: `1054`

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
- the canonical shell now exposes terminal as a real bottom-lane peer to `AI Console`, so the next quality bar is no longer â€œmake terminal visibleâ€ but â€œmake terminal feel just as trustworthy as editor + previewâ€

### 5. `AIChatPanelPro.tsx`
Why now:
- it is no longer an emergency monolith, which means the next step can be calmer and more benchmark-driven
- the remaining leverage is in context grammar, artifact attachment, clearer advanced-controls discoverability, and a richer timeline than the current stop/copy/action polish pass

Recommended seams:
- `components/ai-chat/useAIChatBenchmarkTelemetry.ts`
- stabilize `components/ai-chat/AIChatComposer.tsx` and `components/ai-chat/useAIChatComposerState.ts`
- keep `components/ai-chat/AIChatTimeline.tsx` and `components/ai-chat/useAIChatHistoryMode.ts` stable as dedicated recency/history seams

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
2. `SettingsPage.tsx`
3. `CreatorDashboard.tsx`
4. `app/admin/ai-monitor/page.tsx`
5. `SceneEditor.tsx`

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
1. keep full prerender parity open until `npm run build:prerender-probe` proves end-to-end success, while treating compile-mode build success as the current honest production mitigation
2. shrink `FullscreenIDE.tsx` and then `useFullscreenIDEBridgeSections.ts`
3. keep polishing preview through `usePreviewRuntime.ts`, `RuntimePreviewSurface.tsx`, `SceneViewportWorkflowDrawer.tsx`, and `useSceneViewportSurfaceState.ts`
4. keep stabilizing `useTerminalRuntime.ts` and `useTerminalSessions.ts`
5. turn the thinner fullscreen preview modules into the trust/share cockpit the benchmark set expects
6. stabilize `AIChatPanelPro.tsx`, `AIChatComposer.tsx`, `useAIChatComposerState.ts`, `AIChatTimeline.tsx`, and `useAIChatHistoryMode.ts` and turn the smaller shell into a benchmark-grade artifact lane
7. keep shell-density passes in `ModernIDEShellChrome.tsx` and the extracted chrome/side-column parts
8. move the next Wave B density pass to `ProjectsDashboard.tsx`, `SettingsPage.tsx`, `CreatorDashboard.tsx`, and `app/admin/ai-monitor/page.tsx` now that `SettingsUI.tsx` is out of the thousand-line set
9. promote preview, collaboration, and deploy from present to trusted

## One-Line Reading
The audits no longer leave us with ambiguity.
The fastest honest path is to keep slicing by real UX seams, starting with preview/deploy trust, explorer collaboration visibility, and the remaining workbench core while prerender parity stays explicitly open.
