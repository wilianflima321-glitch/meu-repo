# 85_EXECUTION_STATUS_MAP_2026-04-22
Date: 2026-04-22
Last refreshed: 2026-04-25
Status: ACTIVE
Role: short execution snapshot and no-drift scoreboard across the canonical audit set

## Why This Exists
The project already has strong audits.
This file is the short scoreboard that answers:
1. what is truly closed
2. what is partially shipped but not yet proven end to end
3. what is still open and should stay on the board

## Current Snapshot
- `FullscreenIDE.tsx`: `379` lines
- `AIChatPanelPro.tsx`: `313` lines
- `AIChatComposer.tsx`: `282` lines
- `useAIChatComposerState.ts`: `220` lines
- `useAIChatHistoryMode.ts`: `107` lines
- `AIChatTimeline.tsx`: `90` lines
- `useFullscreenIDEBridgeSections.ts`: `158` lines
- `WorkbenchPreviewPane.tsx`: `44` lines
- `SceneViewportSurface.tsx`: `98` lines
- `WorkbenchEditorSurface.tsx`: `99` lines
- `useTerminalRuntime.ts`: `150` lines
- `PreviewLifecycleChrome.tsx`: `151` lines
- `usePreviewRuntime.ts`: `107` lines
- `RuntimePreviewSurface.tsx`: `198` lines
- `SettingsUI.tsx`: `159` lines
- `SceneViewportWorkflowDrawer.tsx`: `163` lines
- `WorkbenchPreviewRuntimeControls.tsx`: `134` lines
- `useTerminalTransport.ts`: `145` lines
- `chromeResizeHandle.tsx`: `106` lines
- `sceneViewportDerivations.ts`: `89` lines
- `WorkbenchEditorPane.tsx`: `219` lines
- `WorkbenchEditorToolbar.tsx`: `191` lines
- `WorkbenchEditorCanvas.tsx`: `108` lines
- `WorkbenchEditorSidecar.tsx`: `85` lines
- `AIChatPanelContainer.tsx`: `123` lines
- `ModernIDEShell.tsx`: `205` lines
- `chromeStatusBar.tsx`: `371` lines
- `ModernIDEShellPanels.tsx`: `114` lines
- `ModernIDEShellCenterStack.tsx`: `218` lines
- `FullscreenIDEWorkspaceBridge.tsx`: `89` lines
- `FullscreenIDEWorkspaceBridge.types.ts`: `67` lines
- `useFullscreenIDEBridgeProps.types.ts`: `117` lines
- `WorkbenchPreviewModeHeader.tsx`: `63` lines
- `useViewportExport.ts`: `106` lines
- `BaseXTerminal.tsx`: `105` lines
- `ModernIDEShellChrome.tsx`: `29` lines
- `chromeSecondaryBars.tsx`: `8` lines
- `CanonicalPreviewSurface.tsx`: `89` lines (router)
- `XTerminal.tsx`: `12` lines (barrel)
- `MultiTerminalPanel.tsx`: `70` lines
- `useTerminalSessions.ts`: `120` lines
- `terminalSessionApi.ts`: `71` lines
- `terminalSessionConnection.ts`: `61` lines
- `useSceneViewportSurfaceState.ts`: `149` lines
- `SceneViewportStage.tsx`: `117` lines
- `useTerminalOptions.ts`: `58` lines
- `useTerminalImperativeHandle.ts`: `51` lines
- `useWorkbenchShellState.ts`: `257` lines
- `MonacoEditorPro.tsx`: `867` lines
- default PR browser pressure exists through `playwright.merge.config.ts`
- last documented local Chromium replay for the merge-pressure suite: `5 passed`
- production build parity is now split into two explicit tracks:
  - `npm run build` now uses `next build --experimental-build-mode compile` and completed successfully in `cloud-web-app/web/build-probe-2026-04-25-compile-mode.log`; the resulting server build was also smoke-tested with `next start` and returned `200` for `/` in `cloud-web-app/web/start-probe-2026-04-25-compile-mode.out.log`
  - the old prerender path remains open and is now preserved as `npm run build:prerender-probe`; the latest canonical evidence is `cloud-web-app/web/build-probe-2026-04-25-pages-fallback-chain-removed.log` and `cloud-web-app/web/build-probe-2026-04-25-root-boundaries-minimal.log`, which still fail with the same `/404`, `/500`, `/_not-found`, public/docs, and seven-studio-route export cluster even after removing the legacy `pages/*` fallback chain and simplifying the root App Router boundaries

## Closed Or Materially Stabilized
### Governance baseline
- `CODEOWNERS`
- Dependabot
- PR templates
- branch protection policy
- canonical audit hierarchy in `README.md` and `docs/master/00_INDEX.md`

### Core truth infrastructure
- anti-fake-success gate
- route contracts gate
- canonical-doc alignment gate
- `qa:enterprise-gate` directly enforced in CI
- blocking browser dialog path removed from `EditorApplyBridgeContext.tsx`

### Design-system/tooling baseline
- Storybook works
- ThemeToggle exists
- design-system consistency gate is green
- canonical component gate is green

## Shipped But Still Partial
### Onboarding
- the funnel exists and is instrumented,
- the dashboard now opens `OnboardingWizard` from the real `/api/onboarding` welcome-state signal instead of the looser first-value-guide toggle, and `?onboarding=1` remains as an explicit manual override for walkthrough/debug runs
- but durable onboarding state and stronger first-run continuity are still open.
- the next honest gap is persistence quality:
  - the server onboarding route still keeps state in memory, so the UX is now more visible but not yet enterprise-durable across full backend restarts

### Inline AI editing
- the canonical inline-edit path is wired and user-facing,
- but still depends on provider/runtime readiness.
- historical audit claims that `Cmd+K` is still unwired are now stale on this branch:
  - `MonacoEditorPro.tsx` already binds `Cmd/Ctrl+K` to `InlineEditModal`
  - the real remaining gap is that `InlineAIChat.tsx` still exists more as latent capability than as a canonical editor-lane surface
- the shell keybinding grammar is also more honest now:
  - `Ctrl+I` routes to the canonical `AI Console` instead of pretending an inline-chat surface is already productized in the editor lane
- the former container hotspot was also reduced:
  - `AIChatPanelContainer.tsx` is now a thin orchestrator backed by extracted session-context, provider-preflight, send-pipeline, and session-banner modules.

### Chat interaction polish
- the chat shell is thinner and no longer needs emergency decomposition:
  - `AIChatPanelPro.tsx` is `313` lines
  - `AIChatComposer.tsx` is `282` lines
  - `useAIChatComposerState.ts` is `220` lines
  - `MessageBubble.tsx` is now a `110`-line orchestrator over `MessageBubbleContent.tsx`, `MessageBubbleActionBar.tsx`, `MessageBubbleCodeActions.tsx`, and `useMessageBubbleCopyActions.ts`
- message copy/apply actions now share calmer feedback grammar, with toast-backed confirmation instead of blocking dialog behavior in the code-action rail
- the composer and live/benchmark lane now route stop/interrupt to the real abort path in `useAIChatController.ts`
- ask/plan/execute/review/live now materially shape the composer, empty state, quick prompts, quick mentions, and a compact `AIChatContextStrip.tsx`, so the operator surface is no longer a single generic prompt box
- the shell also gained `AIChatTimeline.tsx` plus `useAIChatHistoryMode.ts`, which gives users a compact recency rail and cleaner history-sidebar ownership without claiming semantic history search is solved
- still open:
  - richer timeline/artifact context
  - semantic history search
  - shareable threads / stronger conversation information architecture
  - separate backend execution semantics per mode

### Deploy from IDE
- the deploy action and status page exist in the canonical IDE,
- the preview cockpit now mirrors that same deploy truth instead of leaving deploy credibility trapped in the top bar:
  - `components/preview/previewDeployTrust.ts` and `components/preview/usePreviewDeployTrust.ts` now persist the last known deploy, derive the best share target, and let the preview lane start deploys, refresh status, open the live site, and copy the best available share link
  - `WorkbenchPreviewRuntimeControls.tsx`, `PreviewRuntimeToolbar.tsx`, `deployTopbarAction.tsx`, and `app/deploy/[id]/page.tsx` now speak the same deploy/share grammar, so the user sees one deploy story across top bar, preview, and status page
- but still depend on readiness/environment truth.

### Preview runtime orchestration
- discovery, provision, sync, and health flows exist,
- the local preview lane is now denser and more product-grade:
  - stronger toolbar hierarchy
  - clearer mode tabs
  - better preview empty-state guidance
  - explicit deploy/share trust actions in the runtime toolbar instead of only local-runtime controls
- the former preview hotspot was also reduced:
  - `CanonicalPreviewSurface.tsx` now acts like a thin variant router over extracted runtime, scene, canvas, lifecycle, and derivation modules
  - `SceneViewportSurface.tsx` is now a smaller viewport seam at `98` lines, with stage/state/playback density pushed into `SceneViewportStage.tsx`, `useSceneViewportSurfaceState.ts`, and `useSceneViewportPlayback.ts`
  - `WorkbenchPreviewPane.tsx` is now a thin orchestrator, with trust/share/status density moved into `WorkbenchPreviewRuntimeControls.tsx`, `WorkbenchPreviewRuntimeSurface.tsx`, and `WorkbenchPreviewModeHeader.tsx`
- but the category is still partial until full shareable proof and build-complete runtime confidence are stable.

### Terminal lane
- the canonical workbench now mounts terminal as a first-class bottom surface instead of leaving terminal credibility trapped in legacy layout references or only in preview-console mode
- `FullscreenIDEWorkspace.tsx` now wires `MultiTerminalPanel.tsx` directly into the main shell, while `ModernIDEShellCenterStack.tsx` now acts as a calmer bottom-lane switcher between `AI Console` and `Terminal`
- the dock/header grammar now makes `AI Console`, `Terminal`, `Visual (3D)`, `Visual (UI)`, and `Console` read as separate operational surfaces instead of one overloaded preview bucket
- the follow-up clean build rerun in `cloud-web-app/web/build-probe-2026-04-24-terminal-first-class.log` reached `Generating static pages (213/213)` and reproduced the same failure class, which is the correct anti-fake-success read: terminal UX improved without changing the unrelated root build blocker
- still open:
  - live status-bar truth for terminal sessions
  - deeper clipboard/viewport/runtime polish in the terminal stack
  - broader proof that the terminal lane is as trustworthy as the editor/preview path end to end

### Shell chrome truthfulness
- the canonical status bar is no longer a placeholder strip:
  - `chromeStatusBar.tsx` now reads real shell/editor/preview state instead of hardcoded branch/encoding/AI-ready filler
  - the bar now reflects active file/language, split pane ownership, live line/column, selection size, current-file diagnostics, active sidebar/bottom/preview lanes, collaboration presence, and preview-runtime health
  - `useWorkbenchShellState.ts`, `WorkbenchEditorCanvas.tsx`, and `MonacoEditorPro.tsx` now publish cursor/selection state cleanly enough for shell chrome to stay truthful when the user moves between primary/secondary editors
- still open:
  - live git branch / source-control truth in the shell chrome
  - formatter / encoding / newline truth if we want VS Code-grade footer semantics
  - stronger session telemetry for terminal/runtime/agent work beyond the current benchmark-grade baseline

### Settings surface polish
- `SettingsUI.tsx` is now a `159`-line shell instead of a `1184`-line dense surface
- the catalog, provider/store, field renderers, UI-state/search derivation, summary bar, category sidebar, results pane, and quick-settings popup now live in dedicated `components/settings/ui/*` seams
- the top bar also got denser benchmark-style guidance with clearer English copy plus explicit visible/modified counts, which makes the surface easier to scan without growing more chrome
- still open:
  - `SettingsPage.tsx` remains a separate thousand-line settings surface
  - persistence/i18n depth is still broader than this slice

### Collaboration
- the workbench editor lane was further decomposed this round:
  - `WorkbenchEditorPane.tsx` now acts as a thin coordinator over `WorkbenchEditorSurface.tsx`, `WorkbenchEditorCanvas.tsx`, `WorkbenchEditorToolbar.tsx`, and `WorkbenchEditorSidecar.tsx`
- the canonical editor context lane is now stronger too:
  - `WorkbenchEditorPane.tsx` mounts `Breadcrumbs.tsx` with live cursor line + current outline symbols, so the path/symbol breadcrumb system is no longer a latent editor capability outside the main workbench flow
- baseline collaboration is shipped in the canonical IDE:
  - collaborator presence
  - header avatars
  - denser workbench collaboration strips in header and editor toolbar
  - remote cursors
- the explorer now also shows file and folder presence:
  - `FilePresenceDot.tsx` gives the canonical explorer compact peer stacks driven by `cursor.filePath` and `selection.filePath`
  - `FileExplorerPro.tsx`, `WorkbenchSidebar.tsx`, `FullscreenIDEWorkspace.tsx`, and `FullscreenIDEWorkspaceBridge.tsx` now pass `collaborationPeers` all the way into the visible tree instead of keeping file presence implicit
- still open:
  - broader shared-text proof
  - stronger reconnect/reliability evidence

## Still Open
### P0
1. production build parity
   - the root provider split into `components/providers/CoreUiProviders.tsx` was tested and did not clear the blocker
   - `components/providers/StudioRuntimeProviders.tsx` now supports `full` and `light` runtime surfaces, `app/admin/layout.tsx` and `app/billing/layout.tsx` now browser-load light-runtime shells, and `app/dashboard/layout.tsx`, `app/ide/layout.tsx`, `app/settings/layout.tsx`, `app/profile/layout.tsx`, `app/project-settings/layout.tsx`, `app/nexus/layout.tsx`, and `app/marketplace/layout.tsx` now route through `components/providers/StudioRuntimeRouteLayout.tsx`, but the broader blocker remained
   - tested-but-insufficient suspects now include: `components/ClientLayout.tsx`, `contexts/ThemeContext.tsx`, and `components/ui/toast-system.tsx`
   - highest-confidence studio/runtime cluster now includes: `components/providers/StudioRuntimeProviders.tsx`, `components/providers/StudioRuntimeRouteLayout.tsx`, `lib/a11y/accessibility.tsx`, `components/ServiceWorkerProvider.tsx`, `contexts/AuthContext.tsx`, and `lib/providers/AethelProvider.tsx`
   - the public/auth cluster is narrower but still open: `PublicHeader.tsx` no longer depends on `use-browser-pathname.ts`, and `/terms` + `/privacy` now render static last-updated labels instead of runtime date calls, but the broader public-shell/prerender lane still lacks fresh end-to-end proof and the legacy `/404` + `/500` failure class has not been cleared by those reductions alone
2. remaining workbench, preview, and terminal implementation hotspot reduction led by `FullscreenIDE.tsx`, `useFullscreenIDEBridgeSections.ts`, `usePreviewRuntime.ts`, `WorkbenchEditorSurface.tsx`, `RuntimePreviewSurface.tsx`, `SceneViewportWorkflowDrawer.tsx`, `useTerminalSessions.ts`, and `useTerminalRuntime.ts`
3. `noImplicitAny: false`
4. full-matrix Playwright not yet default required pressure

### P1
1. raw visual drift from tracked raw-hex usage
2. `console.*` still present in tracked code
3. admin sprawl at `46` pages
4. preview not yet proven as a premium public/share workflow
5. dashboard density is improving, but still not yet at the tighter Linear/Vercel bar across all overview surfaces

### P2
1. i18n depth
2. broader coverage pressure
3. further root hygiene cleanup

## Best Next Order
1. close `next build`
2. keep slicing `FullscreenIDE.tsx`, `useFullscreenIDEBridgeSections.ts`, `usePreviewRuntime.ts`, `WorkbenchEditorSurface.tsx`, `RuntimePreviewSurface.tsx`, `SceneViewportWorkflowDrawer.tsx`, `useTerminalSessions.ts`, and `useTerminalRuntime.ts`, while stabilizing the new chat seams in `AIChatComposer.tsx`, `useAIChatComposerState.ts`, `AIChatTimeline.tsx`, and `useAIChatHistoryMode.ts` and evolving the thinner preview cockpit modules
3. harden preview + deploy into a reliable shareable loop
4. promote collaboration from baseline UX into proven shared-editing confidence
5. continue `console.* -> logger`
6. continue `: any` reduction and move toward `noImplicitAny: true`
7. deepen tests, coverage, admin consolidation, and i18n

## One-Line Truth
The work now is not discovering what to do.
The work is executing the already-known sequence without drift.
