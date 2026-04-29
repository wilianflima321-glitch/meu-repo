# 85_EXECUTION_STATUS_MAP_2026-04-22
Date: 2026-04-22
Last refreshed: 2026-04-28
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
- `SettingsPage.tsx`: `83` lines
- `SettingsPageSections.tsx`: `313` lines
- `SettingsPageState.ts`: `215` lines
- `SettingsPageData.tsx`: `20` lines
- `SettingsPageData.defaults.ts`: `102` lines
- `SettingsPageData.categories.tsx`: `119` lines
- `SettingsPageData.items.editor.ts`: `135` lines
- `SettingsPageData.items.ai.ts`: `114` lines
- `SettingsPageData.items.workspace.ts`: `76` lines
- `SettingsPageData.items.engine.ts`: `97` lines
- `SettingsPageData.items.appearance.ts`: `71` lines
- `SettingsPageData.items.system.ts`: `90` lines
- `SettingsPageInputs.tsx`: `178` lines
- `SettingsPage.types.ts`: `60` lines
- `useSettingsPageStorage.ts`: `74` lines
- `useSettingsUiState.ts`: `137` lines
- `SettingsCategorySidebar.tsx`: `94` lines
- `SettingsResultsPane.tsx`: `91` lines
- `SettingsSummaryBar.tsx`: `53` lines
- `ProjectsDashboard.tsx`: `56` lines
- `useProjectsDashboardController.ts`: `146` lines
- `ProjectsDashboardCollection.tsx`: `594` lines
- `ProjectsDashboardCreateModal.tsx`: `186` lines
- `ProjectsDashboardSections.tsx`: `172` lines
- `MobileResponsiveLayout.tsx`: `434` lines
- `StudioLayout.tsx`: `91` lines
- `StudioGlobalNav.tsx`: `64` lines
- `SceneViewportWorkflowDrawer.tsx`: `163` lines
- `WorkbenchPreviewRuntimeControls.tsx`: `134` lines
- `PreviewRuntimeToolbar.tsx`: `609` lines
- `previewDeployTrust.ts`: `155` lines
- `usePreviewDeployTrust.ts`: `258` lines
- `useTerminalTransport.ts`: `145` lines
- `chromeResizeHandle.tsx`: `106` lines
- `sceneViewportDerivations.ts`: `89` lines
- `WorkbenchEditorPane.tsx`: `219` lines
- `WorkbenchEditorToolbar.tsx`: `191` lines
- `WorkbenchEditorCanvas.tsx`: `108` lines
- `WorkbenchEditorSidecar.tsx`: `85` lines
- `InlineAIChat.tsx`: `136` lines
- `InlineAIChatPrimitives.tsx`: `299` lines
- `InlineAIChatSections.tsx`: `209` lines
- `InlineAIChatContextSurface.tsx`: `217` lines
- `InlineAIChatMessageSurface.tsx`: `177` lines
- `InlineAIChatComposerSurface.tsx`: `255` lines
- `InlineAIChat.styles.ts`: `23` lines
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
- `MonacoEditorPro.tsx`: `745` lines
- `MonacoEditorPro.actions.ts`: `245` lines
- `MonacoEditorPro.symbols.ts`: `169` lines
- `MonacoEditorPro.theme.ts`: `69` lines
- `StudioRuntimeProviders.tsx`: `26` lines
- `StudioRuntimeRouteLayout.tsx`: `20` lines
- `runtime/FullStudioRuntime.tsx`: `64` lines
- `runtime/LightweightStudioRuntime.tsx`: `20` lines
- `runtime/StudioRuntimeLoadingFallback.tsx`: `18` lines
- `runtime/StudioRuntimeCommandRegistration.tsx`: `8` lines
- `runtime/useDeferredRuntimeActivation.ts`: `83` lines
- `CreatorDashboard.tsx`: `18` lines
- `useCreatorDashboardController.ts`: `56` lines
- `CreatorDashboardSections.tsx`: `79` lines
- `CreatorDashboardTabPanels.tsx`: `232` lines
- `CreatorDashboardAnalyticsCards.tsx`: `264` lines
- `CreatorDashboardAssetCards.tsx`: `309` lines
- `CreatorDashboardPrimitives.tsx`: `107` lines
- `CreatorDashboard.api.ts`: `88` lines
- `CreatorDashboard.constants.tsx`: `88` lines
- `CreatorDashboard.types.ts`: `48` lines
- `app/admin/ai-monitor/page.tsx`: `344` lines
- `app/admin/ai-monitor/ai-monitor-overview.tsx`: `308` lines
- `app/admin/ai-monitor/ai-monitor-sections.tsx`: `16` lines
- `app/admin/ai-monitor/ai-monitor-section-primitives.tsx`: `72` lines
- `app/admin/ai-monitor/ai-monitor-readiness-sections.tsx`: `399` lines
- `app/admin/ai-monitor/ai-monitor-core-loop-sections.tsx`: `284` lines
- `app/admin/ai-monitor/ai-monitor-support-sections.tsx`: `113` lines
- `app/admin/ai-monitor/ai-monitor-calls.tsx`: `207` lines
- `app/security/page.tsx`: `208` lines
- `app/security/trust-center-shared.tsx`: `248` lines
- `app/compliance/page.tsx`: `208` lines
- `app/customers/page.tsx`: `283` lines
- `app/customers/customerProofContent.ts`: `151` lines
- `app/status/page.tsx`: `311` lines
- `app/status/status.content.ts`: `46` lines
- `app/status/status.logic.ts`: `379` lines
- `app/status/status.types.ts`: `26` lines
- `app/docs/page.tsx`: `393` lines
- `app/docs/procurement-starter-pack/page.tsx`: `387` lines
- `app/contact-sales/page.tsx`: `16` lines
- `app/contact-sales/contact-sales-content.tsx`: `488` lines
- `components/ai-chat/AIChatOpsSidebar.tsx`: `154` lines
- `components/ai-chat/AIChatRulesPanel.tsx`: `122` lines
- `components/ai-chat/useAIChatProjectRules.ts`: `136` lines
- `components/ai-chat/AgentBoard.tsx`: `160` lines
- `components/ai-chat/useAIChatRunState.ts`: `149` lines
- `components/ai-chat/useAIChatOpsArtifacts.ts`: `149` lines
- `app/api/project-rules/route.ts`: `93` lines
- `lib/server/project-rules.ts`: `250` lines
- `app/compare/page.tsx`: `298` lines
- `app/compare/comparison-content.ts`: `208` lines
- `__tests__/ai-chat/AIChatOpsSidebar.test.tsx`: `71` lines
- `__tests__/ai-chat/AIChatRulesPanel.test.tsx`: `71` lines
- `__tests__/api/project-rules-route.test.ts`: `99` lines
- `lib/server/websocket-server.ts`: `1420` lines
- `server/websocket-server.ts`: `47` lines
- `app/api/deploy/route.ts`: `245` lines
- `__tests__/api/deploy-route.test.ts`: `207` lines
- `lib/server/e2b-runtime.ts`: `10` lines
- default PR browser pressure exists through `playwright.merge.config.ts`
- last documented local Chromium replay for the merge-pressure suite: `5 passed`
- production build parity is now split into two explicit tracks:
- `npm run build` now uses `next build --experimental-build-mode compile`; it completed successfully again on `2026-04-26` in `cloud-web-app/web/build-probe-2026-04-26-compile-mode.log`, again after the broader Wave B pass in `cloud-web-app/web/build-probe-2026-04-26-wave-b-settings-admin.log`, again after the shared-runtime follow-up in `cloud-web-app/web/build-probe-2026-04-26-wave-b-runtime-pass.log`, again on `2026-04-28` in `cloud-web-app/web/build-probe-2026-04-28-externalized-e2b-runtime.log`, and once more after the `contact-sales` server-wrapper cleanup in `cloud-web-app/web/build-probe-2026-04-28-contact-sales-wrapper-compile.log`
- the latest `2026-04-28` build-confidence slice also materially narrowed the compile blocker surface:
  - `app/api/preview/runtime-provision/route.ts`, `app/api/preview/runtime-sync/route.ts`, and `app/api/preview/runtime-sync-file/route.ts` now load `e2b` through `lib/server/e2b-runtime.ts` instead of inline imports
  - `lib/server/mention-context.ts` now imports `git-service` and `search-runtime` directly instead of pulling the broader `lib/server` barrel into the AI context path
  - `lib/server/websocket-server.ts` now loads `y-websocket` utils through a runtime-only `pathToFileURL(...)` import instead of expression-based `require(...)`
  - `next.config.js` now externalizes `e2b` through `experimental.serverComponentsExternalPackages`
- the old prerender path remains open and is now preserved as `npm run build:prerender-probe`; the freshest local evidence is `cloud-web-app/web/build-probe-2026-04-28-contact-sales-wrapper-prerender.log`, which now reaches `Generating static pages (224/224)` and fails deterministically instead of stalling blindly:
  - `/404` and `/500`: `Error: <Html> should not be imported outside of pages/_document.`
  - wider App Router export cluster: `TypeError: Cannot read properties of null (reading 'useContext')`
  - representative failing routes now include `/_not-found`, `/compare`, `/compliance`, `/contact-sales`, `/customers`, `/dashboard`, `/docs`, `/ide`, `/marketplace`, `/pricing`, `/security`, `/settings`, `/status`, `/terms`, and `/`
- deploy confidence is also stricter than the older audits still imply:
  - `app/api/deploy/route.ts` now runs `runQaGate()` before both `GET ?readiness=true` and `POST /api/deploy`
  - preview deploy readiness now distinguishes infrastructure blockers from release-quality blockers and surfaces `quality gate` failures back to the preview lane
  - `PreviewRuntimeToolbar.tsx` now exposes blocked QA checks inline instead of only showing a generic deploy-ready/deploy-blocked badge
- the freshest `2026-04-28` build evidence after that deploy-trust hardening is:
  - `cloud-web-app/web/build-probe-2026-04-28-deploy-qa-compile.log`: `npm run build` passed again in compile mode
  - `cloud-web-app/web/build-probe-2026-04-28-deploy-qa-prerender.log`: `npm run build:prerender-probe` still fails deterministically with the same two residual classes:
    - `/404` and `/500`: `Error: <Html> should not be imported outside of pages/_document.`
    - wider App Router export cluster: `TypeError: Cannot read properties of null (reading 'useContext')`

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
- the inline lane is materially easier to productize now:
  - `InlineAIChat.tsx` is still the `136`-line shell
  - the old `InlineAIChatSections.tsx` hotspot is down to `209` lines
  - context, transcript, and composer density now live in `InlineAIChatContextSurface.tsx`, `InlineAIChatMessageSurface.tsx`, and `InlineAIChatComposerSurface.tsx`
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
- the advanced ops lane stopped bluffing emptiness as productized truth:
  - `components/ai-chat/AIChatOpsSidebar.tsx` now persists real operator memories per project through `useAIChatOpsArtifacts.ts` instead of mounting `MemoryPanel` with `memories={[]}`
  - the approval tab now reflects the live pending diff bridge instead of rendering `ApprovalCard` with an empty `changes` array
- the ops lane now also exposes project rules in the canonical operator surface:
  - `app/api/project-rules/route.ts` gives authenticated owners a read/write route for `.aethelrules`
  - `lib/server/project-rules.ts` now supports descriptor loading, cache invalidation, and durable writes back to workspace- or repo-scoped rules files
  - `components/ai-chat/AIChatRulesPanel.tsx` + `useAIChatProjectRules.ts` let the operator inspect scope/path, load a starter template, edit rules, save them, and revert drafts without leaving the AI console
- this closes one of the older “hidden gold” gaps from the audits:
  - project rules are no longer only injected silently into backend prompts; they are visible and editable from the canonical AI ops rail
- multi-agent telemetry is now more honest than the old demo scaffold:
  - `useAIChatRunState.ts` no longer fabricates `Architect / Engineer / QA` progress, confidence, and cost values
  - `AgentBoard.tsx` now labels partial telemetry explicitly and only renders per-agent progress/cost/confidence when those numbers actually exist

### Deploy from IDE
- the deploy action and status page exist in the canonical IDE,
- the preview cockpit now mirrors that same deploy truth instead of leaving deploy credibility trapped in the top bar:
  - `components/preview/previewDeployTrust.ts` and `components/preview/usePreviewDeployTrust.ts` now persist the last known deploy, derive the best share target, and let the preview lane start deploys, refresh status, open the live site, and copy the best available share link
  - `WorkbenchPreviewRuntimeControls.tsx`, `PreviewRuntimeToolbar.tsx`, `deployTopbarAction.tsx`, and `app/deploy/[id]/page.tsx` now speak the same deploy/share grammar, so the user sees one deploy story across top bar, preview, and status page
  - the share target is now more stable during deploy churn: `lastReadyUrl` / `lastReadyInspectorUrl` survive building/error refreshes, so the review action keeps pointing at the last known public deploy instead of degrading to a status page or local runtime preview mid-rollout
- but still depend on readiness/environment truth.
- the public deploy API is also materially less porous now:
  - `app/api/deploy/route.ts` now requires auth plus `build` entitlements for create, list, status, and readiness reads
  - readiness responses now redact raw missing-env details into client-safe `deployment configuration` messaging instead of leaking internals through the public payload
  - route logging moved from `console.error` to `createComponentLogger('api-deploy-route')`
  - regression coverage now exists in `__tests__/api/deploy-route.test.ts`
- still open:
  - stronger deploy UI evidence under real production envs
  - clearer plan/entitlement messaging when build access is denied

### Public trust and buyer path
- the public shell now has real trust-center surfaces instead of only roadmap chips:
  - `/security` documents current MFA, status, and governance truth without overclaiming SSO/SAML or certifications
  - `/compliance` now frames procurement/compliance readiness honestly instead of leaving the buyer path implicit
  - `/customers` now gives honest beta design-partner proof and use-case fit without inventing logo walls
  - `/status` is no longer a single dense file; it now uses `status.content.ts`, `status.logic.ts`, and `status.types.ts` to explain incident grammar, page coverage, and customer impact more clearly
- public navigation/footer/contact-sales also now route users toward `/security`, `/customers`, `/status`, and `/compliance`, which materially improves the enterprise evaluation path without pretending trust-center completeness
- still open:
  - case-study depth beyond beta-design-partner framing
  - public trust artifacts like security questionnaires, compliance docs, and richer incident history
- the buyer path now has a real public procurement bridge:
  - `/docs/procurement-starter-pack` exists and is linked from docs, trust pages, customer proof, pricing, contact-sales, and the public footer
  - `/contact-sales` now accepts richer buyer/procurement context instead of a thin generic lead form
  - `/customers` now includes composed evaluation snapshots plus trust/procurement links instead of stopping at generic beta-fit cards
  - `/roadmap` now exists as a public, truth-oriented planning surface instead of leaving roadmap language implicit in audits and landing chips alone
  - `/security-policy` and `/security-acknowledgments` now exist, and `.well-known/security.txt` plus root `SECURITY.md` point at real public routes instead of broken placeholders
  - `/compare` now exists as a public benchmark surface that compares Aethel honestly with Cursor, Windsurf, Replit, Vercel, Linear, and Notion, and that route is now linked from the landing, docs, public nav, public footer, and trust/buyer surfaces
  - `app/sitemap.ts` now includes `/compare`, `/roadmap`, `/security`, `/compliance`, `/customers`, `/docs/changelog`, `/docs/support`, and `/docs/community`, so the public proof surfaces are no longer invisible to search/indexing by default

### Collaboration/runtime server alignment
- the active `npm run ws` path is now being normalized around a compatibility entrypoint:
  - `server/websocket-server.ts` now acts as a thin stable wrapper over `lib/server/websocket-server.ts` so scripts can stay put while runtime behavior converges in one place
  - the shared runtime server also now uses safer relative logger imports and consistent port resolution across `bootstrap.ts`, `file-watcher-runtime.ts`, `hot-reload-runtime.ts`, and `terminal-pty-runtime.ts`
  - focused contract coverage now exists in `__tests__/server/websocket-runtime-contract.test.ts`, covering compat exports plus `/`, `/health`, `/stats`, `/metrics`, and HTTP-only upgrade rejection
- this improves maintainability, but co-editing proof and full runtime validation are still open.

### AI ops honesty
- the AI operator lane is less fake-complete now:
  - `AIChatOpsSidebar.tsx` persists project-scoped memories and routes approval actions through the live pending diff bridge instead of empty placeholders
  - `useAIChatRunState.ts` no longer fabricates named multi-agent telemetry values
  - `AgentBoard.tsx` now labels partial telemetry explicitly and only shows deeper metrics when we actually have them
  - `AIChatPanelPro.tsx` no longer boots with a canned assistant greeting that can be mistaken for a real conversation history

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
  - the settings catalog still deserves one more benchmark-density pass, but it is now distributed across focused `SettingsPageData.*` modules instead of one `784`-line blob
  - persistence/i18n depth is still broader than this slice

### Legacy settings route
- the old `SettingsPage.tsx` monolith is now also split into calmer seams:
  - `SettingsPage.tsx` is an `83`-line orchestrator
  - static catalog data lives in `SettingsPageData.tsx`
  - storage/persistence actions live in `useSettingsPageStorage.ts`
  - row/input rendering lives in `SettingsPageInputs.tsx`
  - shared contracts now live in `SettingsPage.types.ts`
- this means the canonical `/settings` route is no longer carrying a thousand-line page shell even though the data catalog itself remains dense

### Dashboard overview surface
- the old `ProjectsDashboard.tsx` monolith is no longer carrying the whole overview alone:
  - `ProjectsDashboard.tsx` is now a thin `56`-line composition shell
  - data/loading/filter/action ownership moved into `useProjectsDashboardController.ts`
  - toolbar, list/grid, empty state, and result-count grammar now live in `ProjectsDashboardCollection.tsx`
  - create flow and overview header/stats/quick-actions now live in `ProjectsDashboardCreateModal.tsx` and `ProjectsDashboardSections.tsx`
- user-facing quality also improved:
- search now covers both project `name` and `description`
- the dashboard now exposes a visible `resultsLabel`
- `Limpar filtros` exists both in the toolbar and in the filtered empty state, which reduces recovery friction when users stack search + type filters

### Marketplace creator cockpit
- the old creator cockpit monolith also started moving into real seams:
  - `CreatorDashboard.tsx` is now an `18`-line shell
  - fetch/refresh/tab ownership moved into `useCreatorDashboardController.ts`
  - API calls live in `CreatorDashboard.api.ts`
  - shared view-models and copy moved into `CreatorDashboard.types.ts` and `CreatorDashboard.constants.tsx`
  - section chrome, tab orchestration, and visual card density now sit in `CreatorDashboardSections.tsx`, `CreatorDashboardTabPanels.tsx`, `CreatorDashboardAnalyticsCards.tsx`, `CreatorDashboardAssetCards.tsx`, and `CreatorDashboardPrimitives.tsx`
- this is still partial because the densest creator surface is now `CreatorDashboardAssetCards.tsx` at `309` lines, but the route shell and primary section surface are no longer carrying the whole cockpit alone

### Admin AI monitor
- the admin monitor route is no longer a single thousand-line page:
  - `app/admin/ai-monitor/page.tsx` is now a `344`-line state/data orchestrator
  - header, emergency, highlight, and filter chrome moved into `ai-monitor-overview.tsx`
  - readiness/promotion/dossier sections now live in `ai-monitor-readiness-sections.tsx`
  - core-loop and run-ledger sections now live in `ai-monitor-core-loop-sections.tsx`
  - ledger/full-access/model sections now live in `ai-monitor-support-sections.tsx`
  - shared section primitives now live in `ai-monitor-section-primitives.tsx`
  - recent calls and expandable call rows moved into `ai-monitor-calls.tsx`
- this is still partial because `ai-monitor-readiness-sections.tsx` remains the heaviest monitor seam at `399` lines, but the route shell and section barrel are now much easier to evolve and test

### Shared studio route shell
- the route wrapper is thinner than the earlier browser-shell pass:
  - `StudioRuntimeRouteLayout.tsx` now wraps routes directly with `StudioRuntimeProviders`
  - the intermediate `StudioRuntimeLayoutClient.tsx` seam is gone
- this reduces one more shared handoff layer across dashboard/ide/settings/profile/project-settings/nexus/marketplace
- it still does **not** close prerender parity by itself:
  - `build-probe-2026-04-26-prerender-probe-route-layout-direct.log` still stalls at `Creating an optimized production build ...`
- the runtime provider stack itself is also calmer now:
  - `StudioRuntimeProviders.tsx` is down to a `26`-line surface router
  - full/light stacks now live in `runtime/FullStudioRuntime.tsx` and `runtime/LightweightStudioRuntime.tsx`
  - loading and command-registration seams now live in `runtime/StudioRuntimeLoadingFallback.tsx` and `runtime/StudioRuntimeCommandRegistration.tsx`
- regression coverage now exists for the route shell and provider surface selection:
  - `__tests__/providers/StudioRuntimeRouteLayout.test.tsx`
  - `__tests__/providers/StudioRuntimeProviders.test.tsx`
- still open:
  - `ProjectsDashboardCollection.tsx` is still dense enough to deserve another calm pass later
  - duplicate/share actions are still UX-only hooks until stronger backend semantics are wired

### Studio runtime route boundary
- the shared studio route wrapper is now less aggressive:
  - `components/providers/StudioRuntimeRouteLayout.tsx` no longer uses `next/dynamic(..., { ssr: false })` to replace the whole route shell
  - it now renders `StudioRuntimeProviders` directly from the server route layout, which removes the extra `StudioRuntimeLayoutClient.tsx` handoff entirely
- honest current read:
  - this is the right structural reduction according to the live probe triage
  - but it did **not** produce a fresh closed `build:prerender-probe`; the newest rerun still stalls at `Creating an optimized production build ...`

### New landing/runtime follow-through
- `app/landing-v3.tsx` is now a server page again, with the mission box isolated in `app/landing-v3-mission-box.tsx`
- that removes `next/navigation`, local state, analytics, and transient animation hooks from the public shell while preserving the interactive workspace-create flow inside a dedicated client island
- the public landing also now carries a more honest benchmark/trust layer instead of only aspirational hero copy: `app/landing-v3.tsx` now exposes direct status/docs/pricing trust actions plus an explicit `Cursor / Windsurf / VS Code`, `Replit / Windsurf / Vercel / v0`, and `Linear / Notion / Vercel` comparison section that explains what the market leaders do, what Aethel already ships, and what remains open
- the public pricing entry is slightly less lossy too: `app/pricing/page.tsx` now fixes the broken `Comecar no Studio` onboarding CTA route and normalizes the visible FAQ punctuation so the commercial page does not lose users on a malformed link or low-signal copy noise
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
  - presentational primitives and larger operator sections now also live in `components/ide/InlineAIChatPrimitives.tsx`, `components/ide/InlineAIChatSections.tsx`, and `components/ide/InlineAIChat.styles.ts`
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

### Public trust and buyer path
- the public trust path is no longer mostly implied:
  - `app/roadmap/page.tsx`
  - `app/security-policy/page.tsx`
  - `app/security-acknowledgments/page.tsx`
  - `SECURITY.md`
  - `public/.well-known/security.txt`
- `landing-v3.tsx`, `docs/page.tsx`, `contact-sales/page.tsx`, `PublicFooter.tsx`, and `lib/navigation/surfaces.ts` now route buyers through real roadmap/security surfaces instead of leaving trust claims detached from public navigation
- this is still a minimum honest trust center, not the same thing as named enterprise case studies or a procurement pack

### Collaboration honesty
- the collaboration lane now communicates real sync truth instead of optimistic presence:
  - `useWorkbenchRealtimeCollaboration.ts` now derives a typed `WorkbenchCollaborationStatus` with `disabled | connecting | syncing | live | reconnecting | error`
  - `WorkbenchEditorToolbar.tsx` now shows `Solo`, `Conectando`, `Sincronizando`, `Ao vivo`, `Reconectando`, or `Sync com erro` explicitly, and only mounts `CollaboratorsBar` after real document sync is confirmed
  - `useWorkbenchBridgeChrome.ts` no longer treats the session as effectively live for higher chrome surfaces while the editor is merely connected but not synced
- coverage now exists for this honesty pass in `__tests__/ide/WorkbenchEditorToolbar.test.tsx`

### Preview runtime guidance
- `usePreviewRuntime.ts`, `previewRuntime.types.ts`, `previewRuntimeState.ts`, `RuntimePreviewSurface.tsx`, and `PreviewLifecycleChrome.tsx` now preserve provider/guidance/setup-env context from `/api/preview/runtime-provision`
- the runtime lane now carries:
  - provider identity
  - recommended next action
  - required env hints
  - clearer managed/local failure guidance
- this means failed/warming/idle preview states are less hand-wavy and closer to the trust grammar expected from Replit/Vercel-style review surfaces

### Monaco editor hotspot reduction
- `MonacoEditorPro.tsx` is no longer carrying all editor theming, action registration, and TypeScript symbol mapping inline
- new seams now own that density:
  - `components/editor/MonacoEditorPro.actions.ts`
  - `components/editor/MonacoEditorPro.symbols.ts`
  - `components/editor/MonacoEditorPro.theme.ts`
- `MonacoEditorPro.tsx` dropped from the historical monolith down to `745` lines, while still keeping:
  - authoritative TS/JS symbol resolution
  - inline-edit apply/validate flow
  - Monaco lifecycle orchestration
- focused symbol coverage now exists in `__tests__/editor/MonacoEditorPro.symbols.test.ts`

### Shared runtime background pressure
- the canonical shared runtime now stages the noisiest ambient work instead of turning everything on at first paint:
  - `components/providers/runtime/useDeferredRuntimeActivation.ts` now delays session tracking, telemetry, service-worker registration, and ambient modal/bubble UI until idle or clear user intent
  - `runtime/FullStudioRuntime.tsx` now waits on that staged activation before enabling `SessionTrackerProvider`, `TelemetryBootstrap`, `WebVitalsReporter`, `ServiceWorkerProvider`, `LowBalanceModalAuto`, and `AISuggestionBubbleAuto`
- `lib/analytics.ts` also stopped instantiating the tracker singleton on import:
  - `analytics` is now a lazy facade, so the 30-second flush interval only starts after a real caller uses analytics
  - failed batch flushes now emit structured logger output instead of raw `console.error`
- `app/marketplace/layout.tsx` now opts into `surface="light"` and `onboardingChrome={false}`, which removes one more public route from the heaviest runtime path
- this does not mean prerender parity is solved, but it materially narrows the shared-runtime search space and reduces benchmark-visible background pressure in the studio shell

### Service worker activation honesty
- the service-worker lane is now less eager and less surprising:
  - `hooks/useServiceWorker.tsx` now delays registration until the page is visible, online, and idle instead of firing immediately on first paint
  - periodic update polling now only runs while the tab is visible and online, and the interval moved away from the noisier hourly cadence
  - `controllerchange` no longer hard-reloads the app unless the user explicitly requested `skipWaiting`, which removes one of the more jarring premium-UX regressions
- `components/ServiceWorkerProvider.tsx` also became calmer and more explicit:
  - update-prompt dismissal now survives route churn for one hour via session storage
  - prompt/offline chrome now keys off the actual gated service-worker enablement path instead of the broader pre-gated `enabled` prop
- focused coverage now exists in `__tests__/service-worker/useServiceWorker.test.tsx`

### Aethel provider runtime gating
- `lib/providers/AethelProvider.tsx` now accepts `runtimeReady`, and the canonical runtime path no longer kicks off auth, wallet, onboarding, or websocket work before the shared runtime says the lane is ready
- `components/providers/runtime/FullStudioRuntime.tsx` now passes `deferredActivation.sessionTrackingReady` into `AethelProvider`, which means the stateful studio provider stack no longer wakes up all authenticated network traffic at the very first paint
- focused coverage now exists in `__tests__/providers/AethelProvider.runtimeReady.test.tsx`

### AI pending edit visibility
- the main AI chat lane now exposes pending edits near the composer instead of hiding the strongest review loop inside the ops sidebar:
  - `components/ai-chat/AIChatPendingDiffTray.tsx` now surfaces file ownership, changed-line count, and first-class `Open diff`, `Reject`, and `Apply now` actions
  - `components/ide/AIChatPanelPro.tsx` now mounts that tray whenever `editorBridge.pendingDiff` exists, while still keeping the deeper diff panel in `AIChatOpsSidebar`
- this is a meaningful benchmark improvement against Cursor/Windsurf because the user no longer has to discover the review loop behind advanced controls before seeing that an edit is ready
- focused coverage now exists in `__tests__/ai-chat/AIChatPendingDiffTray.test.tsx`

### Inline AI backend convergence
- the hidden inline assistant is no longer driven only by a local mock timeout loop:
  - `components/ide/useInlineAIChatSession.ts` now fetches provider status, uses the same advanced-chat request path as the main AI lane when a provider or demo mode is available, and falls back to the bounded local demo only when providers are still absent
  - `components/ide/InlineAIChat.helpers.ts` now builds an explicit `INLINE_FILE_CONTEXT` / `INLINE_PROJECT_CONTEXT` request envelope and can parse advanced-chat responses instead of assuming every answer was locally mocked
  - `components/ide/InlineAIChat.tsx` now passes project context into that real session path
- this does not yet make inline AI fully benchmark-complete, but it materially reduces the old “different brain / demo-only lane” gap versus Cursor/Windsurf
- focused coverage now exists in `__tests__/ide/InlineAIChat.helpers.test.ts`


### Public shell server wrappers
- the shared public lane is less fragile in the App Router now:
  - `app/contact/page.tsx` and `app/docs/page.tsx` are now server wrappers that only export metadata and mount thin client islands
  - the interactive density moved into `app/contact/contact-content.tsx` and `app/docs/docs-content.tsx`
- this follows the same public-shell reduction already applied to `/contact-sales`, so the buyer/docs path is less likely to drag extra client work into prerender-sensitive boundaries

### Proposal review closer to the artifact
- the main AI lane now exposes a first-class inline proposal surface instead of forcing the user into the deeper ops sidebar:
  - `components/ai-chat/AIChatPendingDiffTray.tsx` now toggles `Open diff` / `Hide review`
  - `components/ide/AIChatPanelPro.tsx` now carries local `showInlineDiffPreview` state
  - `components/ai-chat/AIChatProposalPreview.tsx` now mounts `MonacoChatDiffPanel` directly above the composer when `pendingDiff` exists
- that moves the review/apply moment closer to the benchmark posture from the reference images: proposal visible in the main lane, not hidden behind advanced tooling
- focused coverage now exists in `__tests__/ai-chat/AIChatProposalPreview.test.tsx`

### Prerender isolation breakthrough
- the `2026-04-28` prerender investigation finally produced a high-signal isolation result:
  - removing `app/error.tsx` collapses the widespread App Router `Cannot read properties of null (reading 'useContext')` export cluster
  - with that root boundary removed, `cloud-web-app/web/build-probe-2026-04-28-error-disabled-prerender.log` only fails on `/404` and `/500`
- reintroducing a minimal pages fallback chain (`pages/_app.tsx`, `pages/_document.tsx`, `pages/_error.tsx`, `pages/404.tsx`, `pages/500.tsx`) did **not** solve the remaining pages-runtime fault:
  - `cloud-web-app/web/build-probe-2026-04-28-pages-error-chain-prerender.log` proves the `<Html> should not be imported outside of pages/_document` class still survives
  - that same fallback-chain experiment also brings the App Router `useContext` export cluster back, so it is not a safe permanent mitigation
- the honest highest-confidence local direction now is:
  - keep `app/error.tsx` removed
  - keep pages fallback files absent
  - treat `/404` + `/500` as the separate residual parity class
- compile-mode also stayed healthy after the root error-boundary removal:
  - `cloud-web-app/web/build-probe-2026-04-28-error-removed-compile.log` = PASS

### Artifact-first shell density
- the canonical workbench now leans a bit closer to the target images for new sessions:
  - `useWorkbenchShellState.ts` now defaults `previewMode` to `viewport3d`
  - the no-storage fallback opens preview from `1280px` instead of `1440px`
  - fallback panel proportions now bias more toward a denser center/editor lane and a calmer preview/chat footprint
  - `workbenchPreviewPaneModels.ts` now places `Visual (3D)` and `Visual (UI)` ahead of runtime-only views in the mode selector
- the chrome itself also tightened:
  - `chromeStyles.ts`, `chromeHeader.tsx`, `chromeBottomDock.tsx`, `sideColumnSidebar.tsx`, `sideColumnPreview.tsx`, `ModernIDEShellCenterStack.tsx`, `WorkbenchPreviewModeHeader.tsx`, and `WorkbenchSidebar.tsx` now use smaller paddings/heights/width clamps so the shell feels less inflated and more production-dense
- this is a UX-density move, not a structural rewrite, but it materially improves first-impression parity with the visual references

### Validation note
- `npm run build` passed again on `2026-04-26` in the compile-mode production path
- `npm run typecheck` hit the known transient `.next/types` mismatch while a fresh build was regenerating artifacts, then passed again immediately after the build completed
- the freshest `2026-04-27` compile-mode rerun still did **not** revalidate cleanly; `build-probe-2026-04-27-runtime-deferral-compile.log` stalled again at `Creating an optimized production build ...`
- the early `2026-04-28` reruns stayed honest too:
  - `cloud-web-app/web/build-probe-2026-04-28-service-worker-runtime.log`
  - `cloud-web-app/web/build-probe-2026-04-28-service-worker-prerender.log`
  - `cloud-web-app/web/build-probe-2026-04-28-inline-runtime.log`
  - `cloud-web-app/web/build-probe-2026-04-28-inline-runtime-prerender.log`
  - those still timed out or stalled before a fresh pass, which is why the branch kept build parity explicitly open
- the later `2026-04-28` build-confidence slice materially improved that read:
  - `cloud-web-app/web/build-probe-2026-04-28-externalized-e2b-runtime.log` completed successfully with a fresh compile-mode PASS
  - `cloud-web-app/web/build-probe-2026-04-28-contact-sales-wrapper-compile.log` reconfirmed that PASS after a public-route App Router cleanup
  - `cloud-web-app/web/build-probe-2026-04-28-contact-sales-wrapper-prerender.log` no longer stalled at startup; it reached `Generating static pages (224/224)` and then failed deterministically on `/404`, `/500`, and the wider App Router `useContext` export cluster
- the newest `2026-04-28` isolation wave narrowed that even further:
  - `cloud-web-app/web/build-probe-2026-04-28-proposal-preview-compile.log` passed while the new proposal-review surface was live
  - `cloud-web-app/web/build-probe-2026-04-28-error-removed-compile.log` also passed after removing `app/error.tsx`
  - `cloud-web-app/web/build-probe-2026-04-28-artifact-first-compile.log` reconfirmed compile-mode PASS after the workbench density/artifact-first posture pass
  - `cloud-web-app/web/build-probe-2026-04-28-error-disabled-prerender.log` proved that removing `app/error.tsx` collapses the broad App Router `useContext` export cluster and leaves only `/404` + `/500`
  - `cloud-web-app/web/build-probe-2026-04-28-pages-error-chain-prerender.log` proved that a reintroduced pages fallback chain does not solve the residual `<Html>` parity fault and also reopens the wider App Router failure family
  - `cloud-web-app/web/build-probe-2026-04-28-artifact-first-prerender.log` did not add a stronger signal; it stalled again after `Linting and checking validity of types ...`
- current honest state remains:
  - compile-mode build = freshly reconfirmed production mitigation on `2026-04-28`
  - `build:prerender-probe` = still open, but the current search space is now much narrower:
    - residual pages-runtime `/404` + `/500` `<Html>` fault
    - root App Router export cluster only when `app/error.tsx` is present

## Still Open
### P0
1. production build parity
   - `npm run build` passed again on `2026-04-26` in the compile-mode production path (`cloud-web-app/web/build-probe-2026-04-26-compile-mode.log`) and was freshly revalidated on `2026-04-28` in both `cloud-web-app/web/build-probe-2026-04-28-externalized-e2b-runtime.log` and `cloud-web-app/web/build-probe-2026-04-28-contact-sales-wrapper-compile.log`
   - that compile-mode mitigation is still the best honest production path we have today
   - the old `e2b/dist/index.mjs` warning class is now materially reduced by `lib/server/e2b-runtime.ts`, direct imports in `lib/server/mention-context.ts`, runtime-only `y-websocket` util loading in `lib/server/websocket-server.ts`, and `experimental.serverComponentsExternalPackages: ['e2b']` in `next.config.js`
   - `npm run build:prerender-probe` remains the open track; the freshest useful local reruns now fail deterministically instead of stalling:
     - `/404` and `/500`: `<Html> should not be imported outside of pages/_document`
     - shared export cluster: `Cannot read properties of null (reading 'useContext')` only when `app/error.tsx` is present
   - `cloud-web-app/web/build-probe-2026-04-28-error-disabled-prerender.log` is the strongest current isolation proof:
     - with `app/error.tsx` removed, the shared App Router `useContext` cluster disappears and only `/404` + `/500` remain
   - `cloud-web-app/web/build-probe-2026-04-28-pages-error-chain-prerender.log` shows that reintroducing minimal pages fallback files is not a valid permanent fix:
     - `/404` and `/500` still fail with the `<Html>` parity fault
     - the wider App Router `useContext` cluster returns
   - the root provider split into `components/providers/CoreUiProviders.tsx` was tested and did not clear the blocker
  - `components/providers/StudioRuntimeProviders.tsx` now supports `full` and `light` runtime surfaces through extracted runtime modules, `app/admin/layout.tsx` and `app/billing/layout.tsx` now browser-load light-runtime shells, and `app/dashboard/layout.tsx`, `app/ide/layout.tsx`, `app/settings/layout.tsx`, `app/profile/layout.tsx`, `app/project-settings/layout.tsx`, `app/nexus/layout.tsx`, and `app/marketplace/layout.tsx` now route through `components/providers/StudioRuntimeRouteLayout.tsx`, but the broader blocker remained
  - tested-but-insufficient suspects now include: `components/ClientLayout.tsx`, `contexts/ThemeContext.tsx`, and `components/ui/toast-system.tsx`
  - highest-confidence studio/runtime cluster now includes: `components/providers/StudioRuntimeRouteLayout.tsx`, `components/providers/StudioRuntimeProviders.tsx`, `components/providers/runtime/FullStudioRuntime.tsx`, `lib/a11y/accessibility.tsx`, `components/ServiceWorkerProvider.tsx`, `contexts/AuthContext.tsx`, and `lib/providers/AethelProvider.tsx`
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

## Delta 2026-04-28 - Canonical arsenal blueprint
- a new canonical strategy document now exists:
  - `docs/master/88_AI_ARSENAL_AND_DOMAIN_SUPERIORITY_BLUEPRINT_2026-04-28.md`
- this closes a real synthesis gap that had remained open across `15`, `16`, `23`, `24`, `25`, `27`, `45`, `46`, `57`, `65`, `66`, `76`, `77`, `79`, `85`, `86`, and `87`:
  - one place for domain packs
  - one place for market benchmark truth
  - one place for user triage
  - one place for \"how weaker models become robust\" through orchestration
  - one place for margin-safe execution rules
- the new document does not change the immediate P0:
  - `build:prerender-probe` remains the main platform-confidence blocker
- but it now makes the next strategic work much harder to lose:
  1. research plane
  2. memory plane
  3. validation plane
  4. games pack
  5. films pack
  6. apps/sites pack
  7. economics and governance plane

## Delta 2026-04-28 - Evidence capsules and residual pages probe
- the AI lane now surfaces evidence as a first-class artifact instead of hidden prompt stuffing:
  - `components/ai-chat/ai-chat-evidence.ts`
  - `components/ai-chat/AIChatEvidenceCard.tsx`
  - `components/ai-chat/AIChatEvidencePanel.tsx`
  - `components/ai-chat/useAIChatController.ts`
  - `components/ai-chat/useAIChatSessionContext.ts`
  - `components/ide/AIChatPanelPro.tsx`
  - `components/ai-chat/AIChatOpsSidebar.tsx`
  - `components/ai-chat/MessageBubble.tsx`
- practical effect:
  - assistant replies can now carry `traceSummary` provenance into the visible chat lane
  - Nexus research handoffs now arrive with a visible research capsule instead of disappearing into a system prompt only
  - the ops sidebar now has an `Evidence` lane for the freshest trace or research artifact
- focused coverage exists in:
  - `__tests__/ai-chat/ai-chat-evidence.test.ts`
  - `__tests__/ai-chat/AIChatEvidenceCard.test.tsx`
  - `__tests__/ai-chat/AIChatOpsSidebar.test.tsx`
- the residual pages-runtime probe also moved one step:
  - minimal `pages/404.tsx` and `pages/500.tsx` now exist as a narrow compatibility experiment for the remaining `/404` + `/500` prerender fault
  - this experiment is currently safe against lint/typecheck/enterprise gates
  - but it still has **no fresh build PASS** attached to it yet
- freshest honest local build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-28-evidence-capsule-compile.log` still stalled at `Creating an optimized production build ...`
  - `cloud-web-app/web/build-probe-2026-04-28-evidence-capsule-prerender.log` and `cloud-web-app/web/build-probe-2026-04-28-evidence-capsule-prerender-long.log` advanced to `Linting and checking validity of types ...` but did not close with a final verdict inside the time window
- therefore the honest state remains:
  - compile-mode build viability still relies on the earlier `2026-04-28` PASS logs
  - `build:prerender-probe` remains open
  - the new evidence workflow is a confirmed product improvement, while the pages residual experiment is still only a bounded parity attempt

## Delta 2026-04-28 - Inline evidence convergence
- the new evidence grammar is no longer limited to the main AI console:
  - `components/ide/InlineAIChat.helpers.ts`
  - `components/ide/useInlineAIChatSession.ts`
  - `components/ide/InlineAIChatMessageSurface.tsx`
- practical effect:
  - inline AI now extracts `traceSummary` into the same evidence artifact shape already used by the main ops lane
  - assistant replies in the inline lane can show provenance, evidence counts, risk/tool telemetry, and model/provider hints directly next to the suggested code
  - this closes a real gap between the full AI console and the lightweight inline lane, moving both toward the same `research -> answer -> evidence -> apply` workflow
- focused regression coverage now exists in:
  - `__tests__/ide/InlineAIChat.helpers.test.ts`
  - `__tests__/ide/InlineAIChatMessageSurface.test.tsx`
- the latest residual parity reading also got sharper:
  - because `.next/server/pages-manifest.json` now registers `/404` and `/500`, the residual prerender cluster is less likely to be a simple missing-pages fallback problem
  - the highest-signal next isolation experiment is now the root App Router boundary in `app/layout.tsx`, not more churn in `pages/404.tsx` or `pages/500.tsx`

## Delta 2026-04-28 - Review-ready preview contract
- the preview/deploy lane now distinguishes review intent instead of flattening every share action into one generic link:
  - `components/preview/previewDeployTrust.ts`
  - `components/preview/usePreviewDeployTrust.ts`
  - `components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx`
  - `components/ide/PreviewRuntimeToolbar.tsx`
- the new review grammar now separates:
  - `review_ready_public`
  - `review_ready_runtime`
  - `ephemeral_runtime`
  - `blocked_stale`
  - `blocked_degraded`
- practical effect:
  - stable public deploys now surface as explicit review-ready links
  - reachable runtime previews now surface as internal review targets instead of generic share targets
  - stale last-good deploys stay available with honest labeling when the current publish lane is blocked
  - degraded runtime or QA-blocked publish states no longer present as safe review handoff targets
- focused regression coverage now exists in:
  - `__tests__/preview/previewDeployTrust.test.ts`
  - `__tests__/preview/previewDeployTrust.stableShare.test.ts`
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-28-review-ready-compile.log` = fresh compile-mode `PASS`
  - `cloud-web-app/web/build-probe-2026-04-28-review-ready-prerender.log` = still open, but now reaches `Collecting page data ...` before timing out inside the execution window
- current honest state after this wave:
  - compile-mode production mitigation is freshly revalidated on `2026-04-28`
  - `build:prerender-probe` remains open
  - preview sharing is materially closer to a trustworthy review lane instead of a generic runtime/deploy link picker

## Delta 2026-04-28 - Inline review-first code actions
- the lightweight inline AI lane now hands code suggestions toward the same review grammar instead of defaulting to direct apply:
  - `components/ide/InlineAIChat.helpers.ts`
  - `components/ide/InlineAIChat.tsx`
  - `components/ide/InlineAIChatMessageSurface.tsx`
  - `components/ide/InlineAIChatPrimitives.tsx`
- practical effect:
  - code blocks in the inline lane now expose `Review diff` as the primary artifact action
  - when the workbench editor bridge is available, inline review stages a pending diff and opens the same `aethel.ide.openChatDiff` path already used by the main AI console
  - direct apply remains available as a fallback instead of being the default path
- focused regression coverage now exists in:
  - `__tests__/ide/InlineAIChatMessageSurface.test.tsx`
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-28-inline-review-only-compile.log` did not close with a fresh pass and stalled again at `Creating an optimized production build ...`
- current honest state after this wave:
  - the product lane improved by converging inline suggestions with the review-first artifact workflow
  - no fresh compile-mode pass was revalidated after this specific inline-review slice
  - `build:prerender-probe` remains open

## Delta 2026-04-28 - Artifact-first preview proposal overlay
- the viewport lane now surfaces pending AI proposals directly over the artifact instead of hiding every patch inside chat-only chrome:
  - `components/ide/fullscreen/WorkbenchPreviewProposalOverlay.tsx`
  - `components/ide/fullscreen/WorkbenchPreviewPane.tsx`
- practical effect:
  - when a pending diff exists, the preview surface shows an `AI proposal preview` capsule with:
    - target file
    - changed-line count
    - `Open review`
    - `Apply proposal`
    - `Dismiss`
  - this moves the cockpit closer to the image-driven `artifact-first` posture where proposal review lives beside the viewport, not only inside the chat rail
- focused regression coverage now exists in:
  - `__tests__/ide/WorkbenchPreviewProposalOverlay.test.tsx`
- freshest honest validation after this wave:
  - targeted vitest/lint/typecheck/enterprise gate all pass
  - no fresh compile-mode pass has been revalidated for this specific slice yet
  - `build:prerender-probe` remains open

## Investigation note - root App Router boundary
- the current highest-signal root experiment was tested locally and then deliberately not kept:
  - adding `export const dynamic = 'force-dynamic'` to `app/layout.tsx`
- honest read:
  - it did not produce a strong enough durable win to justify leaving the root layout in that state
  - the committed branch therefore keeps the root layout clean while the real shared-runtime/prerender search space remains open below it

## Delta 2026-04-28 - Light runtime route split
- the shared studio runtime is now narrower in the routes that mostly need shell consistency, not the full ambient runtime stack:
  - `app/dashboard/layout.tsx`
  - `app/settings/layout.tsx`
  - `app/profile/layout.tsx`
  - `app/project-settings/layout.tsx`
  - `app/nexus/layout.tsx`
- these routes now explicitly use:
  - `surface="light"`
  - `onboardingChrome={false}`
- practical effect:
  - dashboard, settings, profile, project settings, and nexus no longer mount the full studio runtime stack by default
  - the heavy lane is now more concentrated around the routes that actually need it most, instead of being the default for nearly every studio surface
  - this reduces shared-runtime pressure without sacrificing the canonical studio shell
- focused regression coverage now exists in:
  - `__tests__/app/light-runtime-route-layouts.test.tsx`
  - `__tests__/dashboard/dashboardRouteLayout.test.tsx`
  - `__tests__/providers/StudioRuntimeRouteLayout.test.tsx`
  - `__tests__/providers/StudioRuntimeProviders.test.tsx`
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-28-light-runtime-routes-compile.log` = fresh compile-mode `PASS`
  - `cloud-web-app/web/build-probe-2026-04-28-light-runtime-routes-prerender.log` = still open and timed out after reaching `Linting and checking validity of types ...`
- current honest state after this wave:
  - compile-mode production mitigation is freshly revalidated again on `2026-04-28`
  - `build:prerender-probe` remains open
  - the highest-value remaining parity search space is now even more focused on the residual shared-runtime/App Router interaction instead of these lighter route shells

## Delta 2026-04-28 - Service worker as ambient leaf
- the full studio runtime now treats service-worker concerns as ambient UI instead of a global wrapper around the entire runtime tree:
  - `components/providers/runtime/FullStudioRuntime.tsx`
  - `components/ServiceWorkerProvider.tsx`
- practical effect:
  - the service-worker lane no longer wraps auth, session tracking, Aethel state, onboarding, and the suspended page subtree
  - `ServiceWorkerProvider` now behaves like a browser-only leaf for offline/update affordances and SW registration, which narrows shared-runtime surface area without removing the feature
- focused regression coverage now exists in:
  - `__tests__/providers/FullStudioRuntime.test.tsx`
- validation note:
  - targeted vitest coverage, lint, direct typecheck, `qa:enterprise-gate`, and canonical-doc alignment all pass after killing stale timed-out build processes before rerunning the heavy checks
- freshest honest build read for this exact slice is still pending:
  - the next compile/prerender probes should be treated as the source of truth after this leaf refactor
- current honest state after this slice:
  - platform pressure is lower
  - the remaining parity investigation is even more centered on the true heavy lane rather than service-worker wrapping semantics

## One-Line Truth
The work now is not discovering what to do.
The work is executing the already-known sequence without drift.


## Delta 2026-04-28 - Economics plane in the AI ops rail
- the operator lane now exposes a real economics surface instead of leaving cost/billing readiness hidden behind scattered runtime files:
  - `app/api/studio/cost/live/route.ts`
  - `components/ai-chat/AIChatEconomicsPanel.tsx`
  - `components/ai-chat/AIChatOpsSidebar.tsx`
  - `components/ide/AIChatPanelPro.tsx`
  - `lib/api.ts`
- practical effect:
  - `/api/studio/cost/live` now returns authenticated, entitled live state for wallet balance, emergency budgets, billing readiness, model policy, and operator guidance
  - the AI ops rail now has an `Economics` tab with live budget meters, current run estimate, billing blockers, and policy guidance
  - the tab strip now scrolls horizontally instead of compressing every operator tab into unreadable micro-buttons
- focused regression coverage now exists in:
  - `__tests__/api/studio-cost-live-route.test.ts`
  - `__tests__/ai-chat/AIChatEconomicsPanel.test.tsx`
  - `__tests__/ai-chat/AIChatOpsSidebar.test.tsx`
- honest validation state after this wave:
  - targeted vitest coverage is green
  - lint is green
  - direct typecheck is green
  - `qa:enterprise-gate` is green
  - `qa:canonical-doc-alignment` is green
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-28-economics-plane-compile.log` did not produce a fresh pass and timed out at `Creating an optimized production build ...`
  - `cloud-web-app/web/build-probe-2026-04-28-economics-plane-prerender.log` also timed out at the same early build phase
- current honest state after this wave:
  - the product lane improved materially for operator cost/governance awareness
  - no fresh compile-mode pass is claimed for this economics slice
  - `build:prerender-probe` remains open

## Delta 2026-04-29 - Command center and compact cockpit chrome
- the shell and preview lane now spend less vertical space on chrome and more on the artifact, while promoting a benchmark-grade command surface:
  - `components/ide/modern-shell/chromeHeaderParts.tsx`
  - `components/ide/PreviewRuntimeToolbar.tsx`
  - `components/preview/PreviewRuntimeTrustNotice.tsx`
  - `components/ide/fullscreen/WorkbenchPreviewModeHeader.tsx`
  - `components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx`
  - `components/ai-chat/AIChatContextStrip.tsx`
  - `components/ai-chat/AIChatTimeline.tsx`
- practical effect:
  - the old pair of tiny command-palette buttons is now a real `Command Center` bar with a stronger affordance for `Cmd+K`, plus a dedicated `Files` quick-open button for `Cmd+P`
  - the preview trust notice stays in a compact inline grammar inside the workbench
  - the preview mode selector is now a denser segmented control instead of tall per-mode cards
  - the preview runtime toolbar now uses smaller metrics, shorter copy, and less vertical weight
  - the AI context strip and timeline consume less space while preserving operator truth
- focused regression coverage now exists in:
  - `__tests__/ide/chromeHeaderParts.test.tsx`
  - `__tests__/ide/WorkbenchPreviewRuntimeSurface.test.tsx`
- honest validation state after this wave:
  - targeted vitest coverage is green
  - lint is green
  - direct typecheck is green
  - `qa:enterprise-gate` is green
  - `qa:canonical-doc-alignment` is green
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-29-command-center-compact-compile.log` = compile-mode `PASS`
  - `cloud-web-app/web/build-probe-2026-04-29-command-center-compact-prerender.log` = still open and timed out after `Linting and checking validity of types ...`
- current honest state after this wave:
  - the cockpit is more aligned with the target artifact-first images and benchmark shell density
  - compile-mode is freshly revalidated again on `2026-04-29`
  - `build:prerender-probe` remains open

## Delta 2026-04-29 - AI execution ledger strip
- the main AI lane now exposes a compact execution ledger above the conversation instead of forcing every operator cue into side rails or secondary panels:
  - `components/ai-chat/AIChatLedgerStrip.tsx`
  - `components/ai-chat/AIChatTimeline.tsx`
  - `components/ide/AIChatPanelPro.tsx`
- practical effect:
  - the conversation now surfaces a compact operator rail for:
    - active mode
    - execution state
    - agent count
    - latest evidence
    - pending diff review
    - run estimate / economics jump
  - the timeline no longer uses a horizontal card scroller; it now shows the top three events as a compact vertical ledger and explicitly advertises hidden history
  - `AIChatBenchmarkTelemetry` now stays behind advanced controls instead of consuming permanent height in the default lane
- focused regression coverage now exists in:
  - `__tests__/ai-chat/AIChatLedgerStrip.test.tsx`
  - `__tests__/ai-chat/AIChatTimeline.test.tsx`
- honest validation state after this wave:
  - targeted vitest coverage is green
  - lint is green
  - direct typecheck is green
  - `qa:enterprise-gate` is green
  - `qa:canonical-doc-alignment` is green
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-29-ledger-strip-compile.log` advanced through `Collecting build traces ...` but did not close with a fresh pass before the execution window expired
  - `cloud-web-app/web/build-probe-2026-04-29-global-error-prerender-experiment.log` also remained open after temporarily removing `app/global-error.tsx`, so that experiment did not yet provide a decisive parity win
- current honest state after this wave:
  - the AI lane is materially closer to an execution/review ledger instead of a stacked chat dashboard
  - no fresh compile-mode pass is claimed for this specific ledger slice
  - `build:prerender-probe` remains open

## Delta 2026-04-29 - Preview trust rail compact by default
- the preview lane now hides its heavier runtime metrics until the operator explicitly expands runtime settings:
  - `components/ide/PreviewRuntimeToolbar.tsx`
- practical effect:
  - `Deploy trust` stays visible in the compact default lane together with review/share actions
  - the three runtime quick-fact cards now appear only when runtime settings are expanded
  - this returns more vertical space to the viewport without sacrificing trust or actionability
- focused regression coverage now exists in:
  - `__tests__/ide/PreviewRuntimeToolbar.test.tsx`
- honest validation state after this wave:
  - targeted vitest coverage is green
  - lint is green
  - direct typecheck is green
  - `qa:enterprise-gate` is green
  - `qa:canonical-doc-alignment` is green
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-29-preview-compact-compile.log` = compile-mode `PASS`
  - the freshest root-cause experiment for prerender remains `cloud-web-app/web/build-probe-2026-04-29-global-error-prerender-experiment.log`, which stayed open even after temporarily removing `app/global-error.tsx`
- current honest state after this wave:
  - the preview lane is more artifact-first by default
  - compile-mode is freshly revalidated again on `2026-04-29`
  - `build:prerender-probe` remains open

## Delta 2026-04-29 - AI lane density and action-first review rail
- the main AI lane now spends less height on stacked chrome and more on the conversation, diff, and artifact loop:
  - `components/ide/AIChatPanelPro.tsx`
  - `components/ai-chat/AIChatContextStrip.tsx`
  - `components/ai-chat/AIChatLedgerStrip.tsx`
  - `components/ai-chat/AIChatTimeline.tsx`
- practical effect:
  - the execution ledger now sits before the timeline so the first post-header rail is action-first instead of feed-first
  - the ledger no longer repeats generic state pills; it now focuses on the highest-value actions:
    - `Review diff`
    - `Inspect trace/research`
    - `Budget`
  - the context strip is now a single compact row with inline objective/context chips instead of a second descriptive line
  - the timeline now starts compact with the latest event only and expands on demand, which returns more vertical stage to messages and proposals
- focused regression coverage now exists in:
  - `__tests__/ai-chat/AIChatLedgerStrip.test.tsx`
  - `__tests__/ai-chat/AIChatTimeline.test.tsx`
- honest validation state after this wave:
  - targeted vitest coverage is green
  - lint is green
  - direct typecheck is green
  - `qa:enterprise-gate` is green
  - `qa:canonical-doc-alignment` is green
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-29-ai-lane-density-compile.log` remained stuck in `Creating an optimized production build ...` before the execution window expired
  - the freshest compile-mode `PASS` still remains `cloud-web-app/web/build-probe-2026-04-29-preview-compact-compile.log`
- current honest state after this wave:
  - the AI lane is materially calmer and more action-first for end users
  - no fresh compile-mode pass is claimed for this specific density slice
  - `build:prerender-probe` remains open

## Delta 2026-04-29 - Proposal ghost preview in the workbench lane
- the runtime preview lane can now switch between the live artifact and the pending AI proposal for the active file before the patch is applied:
  - `components/ide/fullscreen/WorkbenchPreviewPane.tsx`
  - `components/ide/fullscreen/WorkbenchPreviewProposalOverlay.tsx`
  - `components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx`
  - `components/preview/PreviewRuntimeTrustNotice.tsx`
- practical effect:
  - pending AI edits for the active file now render as a proposal artifact inside the preview lane instead of only showing a floating patch card
  - the operator can explicitly toggle:
    - `View proposal`
    - `Back to live`
    - `Open review`
    - `Apply proposal`
    - `Dismiss`
  - the compact runtime trust notice now tells the truth about which artifact is on stage:
    - `Artifact live`
    - `Artifact proposal`
- focused regression coverage now exists in:
  - `__tests__/ide/WorkbenchPreviewProposalOverlay.test.tsx`
  - `__tests__/ide/WorkbenchPreviewRuntimeSurface.test.tsx`
- honest validation state after this wave:
  - focused vitest coverage is green
  - lint is green
  - direct typecheck is green
  - `qa:enterprise-gate` is green
  - `qa:canonical-doc-alignment` is green
- freshest honest build read after this wave:
  - `cloud-web-app/web/build-probe-2026-04-29-proposal-ghost-compile.log` = compile-mode `PASS`
  - `cloud-web-app/web/build-probe-2026-04-29-proposal-ghost-prerender.log` still timed out after reaching `Linting and checking validity of types ...`
- current honest state after this wave:
  - the preview lane is more artifact-first and materially closer to the target imagery
  - compile-mode is freshly revalidated again on `2026-04-29`
  - `build:prerender-probe` remains open
