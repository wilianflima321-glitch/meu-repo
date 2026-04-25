# 85_EXECUTION_STATUS_MAP_2026-04-22
Date: 2026-04-22
Last refreshed: 2026-04-24
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
- `useFullscreenIDEBridgeSections.ts`: `141` lines
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
- `WorkbenchEditorPane.tsx`: `193` lines
- `WorkbenchEditorToolbar.tsx`: `191` lines
- `WorkbenchEditorCanvas.tsx`: `96` lines
- `WorkbenchEditorSidecar.tsx`: `85` lines
- `AIChatPanelContainer.tsx`: `123` lines
- `ModernIDEShell.tsx`: `149` lines
- `ModernIDEShellPanels.tsx`: `114` lines
- `ModernIDEShellCenterStack.tsx`: `109` lines
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
- default PR browser pressure exists through `playwright.merge.config.ts`
- last documented local Chromium replay for the merge-pressure suite: `5 passed`
- production build parity is still open because:
  - the latest canonical evidence is now `cloud-web-app/web/build-probe-2026-04-24-public-auth-browser-isolation.log`, `cloud-web-app/web/build-probe-2026-04-24-admin-billing-light-runtime.log`, `cloud-web-app/web/build-probe-2026-04-24-studio-route-layout-browser-shells.log`, and `cloud-web-app/web/build-probe-2026-04-24-settings-wave-route-layout.log`
  - the newer provider/layout experiments clarified the root/runtime split, moved build scripts to `NODE_ENV=production`, removed `NODE_ENV=development` from the env templates, dropped `/admin`, `/admin/*`, `/billing`, `/billing/cancel`, `/billing/invoices`, `/billing/checkout`, and `/billing/success` from the final export list, and the current checkout now truly routes `/dashboard`, `/ide`, `/settings`, `/profile`, `/project-settings`, `/nexus`, and `/marketplace` through `StudioRuntimeRouteLayout.tsx`, but the latest clean rerun still failed with the same `/404`, `/500`, `/_not-found`, public/docs, and seven-studio-route export cluster after reaching `Generating static pages (213/213)`

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
- but durable onboarding state and stronger first-run continuity are still open.

### Inline AI editing
- the canonical inline-edit path is wired and user-facing,
- but still depends on provider/runtime readiness.
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
- but still depend on readiness/environment truth.

### Preview runtime orchestration
- discovery, provision, sync, and health flows exist,
- the local preview lane is now denser and more product-grade:
  - stronger toolbar hierarchy
  - clearer mode tabs
  - better preview empty-state guidance
- the former preview hotspot was also reduced:
  - `CanonicalPreviewSurface.tsx` now acts like a thin variant router over extracted runtime, scene, canvas, lifecycle, and derivation modules
  - `SceneViewportSurface.tsx` is now a smaller viewport seam at `98` lines, with stage/state/playback density pushed into `SceneViewportStage.tsx`, `useSceneViewportSurfaceState.ts`, and `useSceneViewportPlayback.ts`
  - `WorkbenchPreviewPane.tsx` is now a thin orchestrator, with trust/share/status density moved into `WorkbenchPreviewRuntimeControls.tsx`, `WorkbenchPreviewRuntimeSurface.tsx`, and `WorkbenchPreviewModeHeader.tsx`
- but the category is still partial until full shareable proof and build-complete runtime confidence are stable.

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
- baseline collaboration is shipped in the canonical IDE:
  - collaborator presence
  - header avatars
  - denser workbench collaboration strips in header and editor toolbar
  - remote cursors
- still open:
  - file-tree presence
  - broader shared-text proof
  - stronger reconnect/reliability evidence

## Still Open
### P0
1. production build parity
   - the root provider split into `components/providers/CoreUiProviders.tsx` was tested and did not clear the blocker
   - `components/providers/StudioRuntimeProviders.tsx` now supports `full` and `light` runtime surfaces, `app/admin/layout.tsx` and `app/billing/layout.tsx` now browser-load light-runtime shells, and `app/dashboard/layout.tsx`, `app/ide/layout.tsx`, `app/settings/layout.tsx`, `app/profile/layout.tsx`, `app/project-settings/layout.tsx`, `app/nexus/layout.tsx`, and `app/marketplace/layout.tsx` now route through `components/providers/StudioRuntimeRouteLayout.tsx`, but the broader blocker remained
   - tested-but-insufficient suspects now include: `components/ClientLayout.tsx`, `contexts/ThemeContext.tsx`, and `components/ui/toast-system.tsx`
   - highest-confidence studio/runtime cluster now includes: `components/providers/StudioRuntimeProviders.tsx`, `components/providers/StudioRuntimeRouteLayout.tsx`, `lib/a11y/accessibility.tsx`, `components/ServiceWorkerProvider.tsx`, `contexts/AuthContext.tsx`, and `lib/providers/AethelProvider.tsx`
   - separate public/auth cluster still includes: `components/ui/PublicHeader.tsx`, `components/ui/PublicFooter.tsx`, `lib/navigation/use-browser-pathname.ts`, and the legacy `pages/404.tsx` / `pages/500.tsx` / `pages/_error.tsx` / `pages/_document.tsx` fallback chain; the newer runtime/browser passes removed `/login`, `/register`, `/verify-email`, `/reset-password`, `/forgot-password`, `/design-system-demo`, `/billing/checkout`, `/billing/success`, `/admin`, `/admin/*`, `/billing`, `/billing/cancel`, and `/billing/invoices` from the final export list without clearing the broader App Router failure class
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
