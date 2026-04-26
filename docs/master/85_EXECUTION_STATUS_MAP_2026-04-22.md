# 85_EXECUTION_STATUS_MAP_2026-04-22
Date: 2026-04-22
Last refreshed: 2026-04-26
Status: ACTIVE
Role: short execution snapshot and no-drift scoreboard across the canonical audit set

## Why This Exists
The project already has strong audits.
This file is the short scoreboard that answers:
1. what is truly closed
2. what is partially shipped but not yet proven end to end
3. what is still open and should stay on the board

## Current Snapshot
- `FullscreenIDE.tsx`: `393` lines
- `AIChatPanelPro.tsx`: `313` lines
- `AIChatComposer.tsx`: `282` lines
- `useAIChatComposerState.ts`: `220` lines
- `useAIChatHistoryMode.ts`: `107` lines
- `AIChatTimeline.tsx`: `90` lines
- `useFullscreenIDEBridgeSections.ts`: `8` lines
- `useWorkbenchBridgeChrome.ts`: `49` lines
- `useWorkbenchBridgeEditorProps.ts`: `57` lines
- `workbenchBridgeModels.ts`: `66` lines
- `useWorkbenchRouteParams.ts`: `16` lines
- `WorkbenchPreviewPane.tsx`: `44` lines
- `SceneViewportSurface.tsx`: `98` lines
- `WorkbenchEditorSurface.tsx`: `99` lines
- `useTerminalRuntime.ts`: `150` lines
- `PreviewLifecycleChrome.tsx`: `217` lines
- `usePreviewRuntime.ts`: `116` lines
- `usePreviewRuntimeHmrBridge.ts`: `122` lines
- `RuntimePreviewSurface.tsx`: `239` lines
- `PreviewRuntimeTrustNotice.tsx`: `131` lines
- `SettingsUI.tsx`: `162` lines
- `useSettingsUiState.ts`: `137` lines
- `SettingsCategorySidebar.tsx`: `94` lines
- `SettingsResultsPane.tsx`: `91` lines
- `SettingsSummaryBar.tsx`: `53` lines
- `MobileResponsiveLayout.tsx`: `434` lines
- `StudioLayout.tsx`: `91` lines
- `StudioGlobalNav.tsx`: `64` lines
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
- `ModernIDEShell.tsx`: `213` lines
- `chromeStatusBar.tsx`: `454` lines
- `useShellSourceControlTruth.ts`: `262` lines
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
- `MonacoEditorPro.tsx`: `1164` lines
- default PR browser pressure exists through `playwright.merge.config.ts`
- last documented local Chromium replay for the merge-pressure suite: `5 passed`
- production build parity is now split into two explicit tracks:
- `npm run build` now uses `next build --experimental-build-mode compile`; it completed successfully again on `2026-04-26` in `cloud-web-app/web/build-probe-2026-04-26-compile-mode.log`, and the earlier server artifact smoke test still stands in `cloud-web-app/web/start-probe-2026-04-25-compile-mode.out.log`
- the old prerender path remains open and is now preserved as `npm run build:prerender-probe`; the freshest local evidence is `cloud-web-app/web/build-probe-2026-04-26-prerender-probe.log`, which still stalls at `Creating an optimized production build ...`, while the strongest historical failure evidence remains `cloud-web-app/web/build-probe-2026-04-25-pages-fallback-chain-removed.log` and `cloud-web-app/web/build-probe-2026-04-25-root-boundaries-minimal.log`

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
- the dashboard route now also suppresses duplicate global onboarding chrome through `app/dashboard/layout.tsx` + `components/providers/StudioRuntimeProviders.tsx`, so the wizard is no longer competing with the runtime-level `WelcomeModal` / `OnboardingChecklist` pair on the same surface
- but durable onboarding state and stronger first-run continuity are still open.
- the next honest gap is persistence quality:
  - `app/api/onboarding/route.ts` now persists the primary path through Prisma `OnboardingProgress` and only falls back to the in-memory map when the table/runtime is unavailable
  - this is materially better than the old memory-only path, but full durability still depends on the DB table being present and healthy in every environment

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
  - the share target is now more stable during deploy churn: `lastReadyUrl` / `lastReadyInspectorUrl` survive building/error refreshes, so the review action keeps pointing at the last known public deploy instead of degrading to a status page or local runtime preview mid-rollout
- but still depend on readiness/environment truth.

### Preview runtime orchestration
- discovery, provision, sync, and health flows exist,
- the local preview lane is now denser and more product-grade:
  - stronger toolbar hierarchy
  - clearer mode tabs
  - better preview empty-state guidance
  - explicit deploy/share trust actions in the runtime toolbar instead of only local-runtime controls
  - `PreviewRuntimeTrustNotice.tsx` now exposes readiness, fallback, health, and next-action grammar directly above the canonical preview surface instead of leaving runtime trust implicit inside toolbar copy
  - `PreviewLifecycleChrome.tsx` plus `usePreviewRuntime.ts` now surface `lastHealthCheckAt`, `lastHealthyAt`, and `failureCount`, so warmup no longer reads as a silent hang when the managed runtime stops responding
  - the HMR lane now has its own calmer truth state (`connecting`, `connected`, `reconnecting`, `disconnected`) via `usePreviewRuntimeHmrBridge.ts`, so short reconnect turbulence no longer snaps the preview immediately into a misleading degraded state
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
- source-control truth is now partially live in the canonical shell:
  - `useShellSourceControlTruth.ts` probes the existing git status API from the workbench shell and feeds real branch / ahead-behind / dirty-count truth into `chromeStatusBar.tsx`
  - repo detection now falls back to the active absolute file path when available, and JWT identity decoding is base64url-safe instead of assuming legacy `atob`-friendly payloads
  - the shell now stays honest when git state is unavailable by showing `Git indisponivel` instead of fake branch filler
- still open:
  - formatter / encoding / newline truth if we want VS Code-grade footer semantics
  - stronger session telemetry for terminal/runtime/agent work beyond the current benchmark-grade baseline

### Settings surface polish
- `SettingsUI.tsx` is now a `162`-line shell instead of a `1184`-line dense surface
- the catalog, provider/store, field renderers, UI-state/search derivation, summary bar, category sidebar, results pane, and quick-settings popup now live in dedicated `components/settings/ui/*` seams
- the top bar also got denser benchmark-style guidance with clearer English copy plus explicit visible/modified counts, which makes the surface easier to scan without growing more chrome
- the cockpit filter lane is now more coherent:
  - `useSettingsUiState.ts` now owns active category/child selection plus a unified clear-filters action
  - `SettingsCategorySidebar.tsx` now exposes `All settings`, per-section counts, and active child filtering instead of only scroll-jump behavior
  - `SettingsSummaryBar.tsx` and `SettingsResultsPane.tsx` now show the active filter label and a single clear-filters affordance, so search + category filters no longer feel like disconnected controls
- still open:
  - `SettingsPage.tsx` remains a separate thousand-line settings surface
  - persistence/i18n depth is still broader than this slice

### New landing/runtime follow-through
- `app/landing-v3.tsx` is now a server page again, with the mission box isolated in `app/landing-v3-mission-box.tsx`
- that removes `next/navigation`, local state, analytics, and transient animation hooks from the public shell while preserving the interactive workspace-create flow inside a dedicated client island
- `components/ServiceWorkerProvider.tsx` no longer guesses enablement from `useBrowserPathname`; `components/providers/StudioRuntimeProviders.tsx` now opts it in explicitly for full studio runtime
- `lib/providers/AethelProvider.tsx` no longer writes `localStorage` from inside the reducer; preferences persistence moved back into an effect, which makes the provider less brittle and closer to reducer-purity

### Hidden-gold activation progress
- `components/settings/SettingsPage.tsx` now delegates search/filter orchestration to `components/settings/SettingsPageState.ts`
- the legacy settings page now has:
  - `All settings`
  - scoped result counts
  - grouped results
  - `Cmd/Ctrl+F` focus for search
  - filter/search behavior that composes instead of mutually overriding
- `components/ide/InlineAIChat.tsx` was productized without changing its outer contract:
  - session logic moved into `components/ide/useInlineAIChatSession.ts`
  - message/context/mock helpers moved into `components/ide/InlineAIChat.helpers.ts`
  - the panel now has clearer operator affordances, explicit manual-apply messaging, safer formatted rendering, and cleaner context-shift/system messages

### Shared studio shell
- the shared studio shell is calmer without regrowing the route surfaces:
  - `MobileResponsiveLayout.tsx` now exports reusable mobile-nav/max-width helpers, isolates escape/body-scroll side effects, and centralizes breakpoint derivation
  - `StudioLayout.tsx` now reuses typed mobile-nav items and a single content-class helper instead of repeating responsive shell grammar inline
  - `StudioGlobalNav.tsx` now normalizes pathname fallback and reuses a single `NavLinkRow` seam for primary + secondary link rendering
- this is quality/predictability work, not a fake claim that the broader root prerender cluster is solved

### Bridge/workbench orchestration
- the bridge composition seam is no longer a dense single mapper:
  - `useFullscreenIDEBridgeSections.ts` is now only a thin barrel
  - chrome/editor/file/preview composition moved into `useWorkbenchBridgeChrome.ts`, `useWorkbenchBridgeEditorProps.ts`, and `workbenchBridgeModels.ts`
- `FullscreenIDE.tsx` also dropped its inline query parsing in favor of `useWorkbenchRouteParams.ts`, keeping the route bootstrap closer to orchestration-only

### Preview runtime ownership
- the workbench preview lane is now less split-brain:
  - `WorkbenchPreviewRuntimeSurface.tsx` derives a controlled runtime model from the workbench runtime manager instead of letting `RuntimePreviewSurface.tsx` invent a second lifecycle story for the same lane
  - `RuntimePreviewSurface.tsx` now accepts optional runtime overrides plus explicit provision/fallback callbacks, which lets the workbench stay the authority while standalone runtime surfaces keep their autonomous lifecycle path
  - the inner lifecycle bar is now hidden in the workbench runtime lane, so trust/readiness UI no longer conflicts with a second, partially synthetic lifecycle strip underneath
- `CanonicalPreviewSurface.tsx` was also corrected to describe runtime lifecycle ownership more honestly

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


### Editor symbol truth
- the workbench editor lane now has a real symbol-truth seam instead of only regex outline fallbacks:
  - `MonacoEditorPro.tsx` now resolves authoritative TypeScript/JavaScript navigation-tree symbols through the Monaco worker and emits them with file-path ownership
  - `useWorkbenchShellState.ts` now keeps per-pane document symbol state
  - `WorkbenchEditorCanvas.tsx`, `WorkbenchEditorSurface.tsx`, `WorkbenchEditorPane.tsx`, `useWorkbenchBridgeEditorProps.ts`, and `useFullscreenIDEBridgeProps.types.ts` now carry that per-pane symbol truth through the canonical IDE path
  - `useWorkbenchEditorModel.ts` now prefers authoritative symbol payloads and falls back to `buildOutlineSymbols(...)` only when symbol truth is stale, missing, or non-authoritative
- this finally moves breadcrumbs + outline closer to editor truth instead of treating the regex parser as the primary source forever
- coverage now exists for the controlled-preview seam and the editor symbol fallback seam:
  - `__tests__/ide/RuntimePreviewSurface.test.tsx`
  - `__tests__/ide/WorkbenchPreviewRuntimeSurface.test.tsx`
  - `__tests__/ide/useWorkbenchEditorModel.test.ts`

### Settings route convergence
- `/settings` is no longer pointing its primary editor tab at the old monolithic `components/SettingsEditor.tsx`
- `app/settings/page.tsx` now mounts the canonical `SettingsUI` inside `SettingsProvider`, so the thinner settings cockpit is finally the live route surface instead of a sidecar implementation that only existed in parallel
- this does not yet remove the older `SettingsPage.tsx` / `SettingsEditor.tsx` debt, but it does close one of the biggest truth gaps between the audits and the real route

### Validation note
- `npm run build` passed again on `2026-04-26` in the compile-mode production path
- `npm run typecheck` hit the known transient `.next/types` mismatch while a fresh build was regenerating artifacts, then passed again immediately after the build completed
- current honest state remains:
  - compile-mode build = validated production mitigation
  - `build:prerender-probe` = still open, with the newest local rerun still stuck at `Creating an optimized production build ...`

## Still Open
### P0
1. production build parity
   - `npm run build` passed again on `2026-04-26` in the compile-mode production path (`cloud-web-app/web/build-probe-2026-04-26-compile-mode.log`)
   - current compile-mode build is therefore still a fresh validated mitigation, not only an older cached success
   - build still emits the known `e2b/dist/index.mjs` critical-dependency warning through `app/api/preview/runtime-provision/route.ts`
   - `npm run build:prerender-probe` remains the open track; the freshest local rerun (`cloud-web-app/web/build-probe-2026-04-26-prerender-probe.log`) still did not clear `Creating an optimized production build ...`
   - the root provider split into `components/providers/CoreUiProviders.tsx` was tested and did not clear the blocker
   - `components/providers/StudioRuntimeProviders.tsx` now supports `full` and `light` runtime surfaces, `app/admin/layout.tsx` and `app/billing/layout.tsx` now browser-load light-runtime shells, and `app/dashboard/layout.tsx`, `app/ide/layout.tsx`, `app/settings/layout.tsx`, `app/profile/layout.tsx`, `app/project-settings/layout.tsx`, `app/nexus/layout.tsx`, and `app/marketplace/layout.tsx` now route through `components/providers/StudioRuntimeRouteLayout.tsx`, but the broader blocker remained
   - tested-but-insufficient suspects now include: `components/ClientLayout.tsx`, `contexts/ThemeContext.tsx`, and `components/ui/toast-system.tsx`
   - highest-confidence studio/runtime cluster now includes: `components/providers/StudioRuntimeRouteLayout.tsx`, `components/providers/StudioRuntimeLayoutClient.tsx`, `components/providers/StudioRuntimeProviders.tsx`, `lib/a11y/accessibility.tsx`, `components/ServiceWorkerProvider.tsx`, `contexts/AuthContext.tsx`, and `lib/providers/AethelProvider.tsx`
   - the public/auth cluster is narrower but still open: `PublicHeader.tsx` is now also a server component instead of an unnecessary client surface, and `/terms` + `/privacy` now render static last-updated labels instead of runtime date calls, but the broader public-shell/prerender lane still lacks fresh end-to-end proof and the legacy `/404` + `/500` failure class has not been cleared by those reductions alone
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
