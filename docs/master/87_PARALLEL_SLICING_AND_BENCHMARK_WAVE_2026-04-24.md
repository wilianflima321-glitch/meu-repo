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
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx` is now `393`, while route/workspace orchestration moved out of `FullscreenIDEWorkspaceBridge.tsx` and into `useFullscreenIDEBridgeSections.ts` (`141`) plus `useFullscreenIDEBridgeProps.types.ts` (`117`), with `useFullscreenIDEBridgeProps.ts` now only `19`
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
- the dense settings surface was also reduced this wave: `cloud-web-app/web/components/settings/SettingsUI.tsx` is now `162` lines after extracting the catalog into `components/settings/ui/default-settings.ts` (`364`), the provider/store into `components/settings/ui/settings-provider.tsx` (`127`), field renderers into `components/settings/ui/SettingsField.tsx` (`245`), search/category derivation into `components/settings/ui/useSettingsUiState.ts` (`137`), and the denser summary/sidebar/results/popup chrome into `components/settings/ui/SettingsSummaryBar.tsx` (`53`), `SettingsCategorySidebar.tsx` (`94`), `SettingsResultsPane.tsx` (`91`), and `QuickSettingsPopup.tsx`
- the settings shell also picked up benchmark-grade density polish instead of just file-size cleanup: clearer English copy, explicit visible/modified counts, and stronger keyboard-search guidance
- the settings cockpit filter lane is now tighter too: active category/child selection, per-section counts, active-filter summary chips, and a single clear-filters action now read as one system instead of disconnected search + scroll-jump controls
- the current checkout now truly routes `app/dashboard/layout.tsx`, `app/ide/layout.tsx`, `app/settings/layout.tsx`, `app/profile/layout.tsx`, `app/project-settings/layout.tsx`, `app/nexus/layout.tsx`, and `app/marketplace/layout.tsx` through `components/providers/StudioRuntimeRouteLayout.tsx`; the fresh clean rerun in `cloud-web-app/web/build-probe-2026-04-24-settings-wave-route-layout.log` proves the alignment but **does not** close build parity, because the same `/404`, `/500`, `/_not-found`, public/docs, and seven-studio-route export cluster still remained after the run reached `Generating static pages (213/213)`
- the canonical shell also closed one of the most visible remaining benchmark gaps: `cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspace.tsx` now mounts `MultiTerminalPanel.tsx` directly in the main workbench, `ModernIDEShellCenterStack.tsx` now acts as a bottom-lane switcher between `AI Console` and `Terminal`, and the shell chrome now exposes `Terminal` as a separate first-class surface instead of hiding terminal behavior behind the preview console lane
- the shell chrome also stopped bluffing: `cloud-web-app/web/components/ide/modern-shell/chromeStatusBar.tsx` now reads real shell/editor/preview state instead of the old `main / 0 / 0 / Prettier / UTF-8 / Ln 1, Col 1 / AI Ready` placeholder grammar, while `useWorkbenchShellState.ts`, `WorkbenchEditorCanvas.tsx`, and `MonacoEditorPro.tsx` now publish live cursor/selection state so the footer can reflect active file/language, split-pane ownership, diagnostics, collaboration, current lanes, and preview-runtime health honestly
- the shell source-control slice is also no longer filler-only: `cloud-web-app/web/components/ide/modern-shell/useShellSourceControlTruth.ts` now probes the existing git status API from the canonical shell, so `chromeStatusBar.tsx` can surface real branch / ahead-behind / dirty truth when the repo path resolves and can explicitly report `Git indisponivel` when it cannot
- the canonical editor lane also closed another stale benchmark gap: `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx` now mounts `Breadcrumbs.tsx` above the editor toolbar and feeds it with the live cursor line plus current outline symbols, so file-path and symbol breadcrumbs are now part of the real workbench instead of sitting as latent editor capability outside the main shell
- this also corrects part of the historical V6 drift: on the current branch `cloud-web-app/web/components/editor/MonacoEditorPro.tsx` already binds `Cmd/Ctrl+K` to `InlineEditModal`; the real remaining inline-AI gap is still `InlineAIChat.tsx`, which remains a large latent capability rather than a fully productized canonical editor-lane surface
- the keyboard layer is now more honest too: `cloud-web-app/web/lib/keybindings/keybindings-service.ts` no longer pretends `Ctrl+I` opens a productized inline-chat lane; it routes to the canonical `AI Console` instead, while inline chat remains an explicit open gap rather than fake-complete behavior
- the dashboard also closed one of the ugliest hidden-gold gaps from the old audits: `cloud-web-app/web/components/useAethelDashboardRuntime.tsx` now opens `OnboardingWizard` from the persisted `/api/onboarding` welcome state instead of the looser first-value-guide toggle, and `cloud-web-app/web/components/dashboard/useDashboardActions.ts` now syncs wizard complete/skip outcomes back to `/api/onboarding` instead of leaving the wizard as an effectively orphaned surface
- the onboarding loop is now less self-contradictory too: `cloud-web-app/web/app/dashboard/layout.tsx` suppresses the global runtime onboarding chrome through `components/providers/StudioRuntimeRouteLayout.tsx` / `StudioRuntimeProviders.tsx`, so the dashboard wizard no longer competes with a second welcome/checklist layer on the same route
- the onboarding API itself also stopped being memory-only on the main path: `cloud-web-app/web/app/api/onboarding/route.ts` now persists through Prisma `OnboardingProgress` and only falls back to the in-memory map when the table/runtime is unavailable
- preview/deploy trust also moved from latent backend capability into the visible cockpit: `cloud-web-app/web/components/preview/previewDeployTrust.ts` plus `usePreviewDeployTrust.ts` now persist the last known deploy, derive the best share target, and let `PreviewRuntimeToolbar.tsx` + `WorkbenchPreviewRuntimeControls.tsx` start deploys, refresh status, open the deploy site, and copy the strongest available share link from the same preview lane the user is validating
- the deploy status loop is now coherent across surfaces too: `cloud-web-app/web/components/ide/modern-shell/deployTopbarAction.tsx` and `cloud-web-app/web/app/deploy/[id]/page.tsx` now feed the same preview deploy trust store, so top bar, status page, and preview lane all agree on the latest deployment instead of acting like isolated features
- preview/share trust now keeps a stable review target during deploy churn: `previewDeployTrust.ts`, `usePreviewDeployTrust.ts`, `deployTopbarAction.tsx`, and `app/deploy/[id]/page.tsx` preserve `lastReadyUrl` / `lastReadyInspectorUrl`, so the strongest share action keeps pointing at the last ready public deploy while a newer deploy is still building or has errored
- the shared studio route boundary is thinner again: `cloud-web-app/web/components/providers/StudioRuntimeRouteLayout.tsx` now wraps routes directly with `StudioRuntimeProviders`, and the temporary `StudioRuntimeLayoutClient.tsx` hop has been deleted, which removes one more shared client handoff layer across dashboard/ide/settings/profile/project-settings/nexus/marketplace
- that reduction is aligned with the live probe, but it still does **not** close prerender parity: the newest rerun in `cloud-web-app/web/build-probe-2026-04-26-prerender-probe-route-layout-direct.log` still stalls at `Creating an optimized production build ...`
- the hidden inline-AI lane also moved another step toward product seams: `cloud-web-app/web/components/ide/InlineAIChat.tsx` remains the `136`-line shell, `InlineAIChatSections.tsx` is down to `209` lines, and the denser context/message/composer ownership now lives in `InlineAIChatContextSurface.tsx` (`217`), `InlineAIChatMessageSurface.tsx` (`177`), and `InlineAIChatComposerSurface.tsx` (`255`)
- the marketplace creator cockpit joined Wave B too: `cloud-web-app/web/components/marketplace/CreatorDashboard.tsx` is now an `18`-line shell over `useCreatorDashboardController.ts` (`56`), `CreatorDashboardSections.tsx` (`812`), `CreatorDashboardPrimitives.tsx` (`107`), `CreatorDashboard.api.ts` (`88`), `CreatorDashboard.constants.tsx` (`88`), and `CreatorDashboard.types.ts` (`48`), which removes the thousand-line route shell even though the biggest visual section file still needs another pass
- the legacy settings route joined the same wave: `cloud-web-app/web/components/settings/SettingsPage.tsx` is now an `83`-line orchestrator over `SettingsPageSections.tsx` (`313`), `SettingsPageState.ts` (`215`), `SettingsPageData.tsx` (`784`), `SettingsPageInputs.tsx` (`178`), `SettingsPage.types.ts` (`60`), and `useSettingsPageStorage.ts` (`74`), which removes the thousand-line route shell even though the static catalog data still needs a calmer follow-up
- the admin AI monitor route also split cleanly: `cloud-web-app/web/app/admin/ai-monitor/page.tsx` is now a `344`-line SWR/action orchestrator over `ai-monitor-overview.tsx` (`308`), `ai-monitor-sections.tsx` (`691`), and `ai-monitor-calls.tsx` (`207`), which removes the 1.3k-line page shell even though the operational section file remains dense
- the freshest compile-mode reruns stayed viable through that broader Wave B pass: `cloud-web-app/web/build-probe-2026-04-26-compile-mode-marketplace-wave.log`, `cloud-web-app/web/build-probe-2026-04-26-wave-b-settings-admin.log`, and `cloud-web-app/web/build-probe-2026-04-26-wave-b-runtime-pass.log` all completed with the same known `e2b/dist/index.mjs` warning class, while `cloud-web-app/web/build-probe-2026-04-26-wave-b-runtime-prerender.log` still timed out at `Creating an optimized production build ...`
- preview runtime trust itself is now less hand-wavy: `cloud-web-app/web/components/preview/PreviewRuntimeTrustNotice.tsx` now surfaces readiness / health / fallback / next-move guidance above the canonical visual surface, while `PreviewLifecycleChrome.tsx`, `usePreviewRuntime.ts`, `previewRuntimeState.ts`, `previewRuntime.types.ts`, and `usePreviewRuntimeHealthMonitor.ts` now track `lastHealthCheckAt`, `lastHealthyAt`, and `failureCount` so warmup can degrade honestly instead of looking silently stuck forever
- collaboration presence is also less hidden in the cockpit: `cloud-web-app/web/components/collaboration/FilePresenceDot.tsx` now gives the explorer compact file/folder presence stacks, while `FileExplorerPro.tsx`, `WorkbenchSidebar.tsx`, `FullscreenIDEWorkspace.tsx`, and `FullscreenIDEWorkspaceBridge.tsx` now pass `collaborationPeers` into the canonical tree so file presence is visible where users actually decide what to open next
- the public shell also took one more reduction pass: `cloud-web-app/web/components/ui/PublicHeader.tsx` is now a hook-free static header with a CSS-only mobile menu, which removes one more live-browser dependency from the public/docs cluster without overclaiming that prerender parity is solved
- the public shell reduction is now slightly stronger again: `cloud-web-app/web/components/ui/PublicHeader.tsx` no longer needs `'use client'`, so the widest shared public header is back to a server component instead of an unnecessary client boundary
- the shared studio shell also got a low-risk reduction pass instead of growing more route wrappers: `cloud-web-app/web/components/ui/MobileResponsiveLayout.tsx` now exports reusable responsive helpers and isolates escape/body-scroll side effects, while `cloud-web-app/web/components/studio/StudioLayout.tsx` and `StudioGlobalNav.tsx` reuse typed nav/class helpers instead of repeating shell grammar inline
- the bridge composition seam also got one more cleanup pass: `cloud-web-app/web/components/ide/fullscreen/useFullscreenIDEBridgeSections.ts` is now only an `8`-line barrel over `useWorkbenchBridgeChrome.ts`, `useWorkbenchBridgeEditorProps.ts`, and `workbenchBridgeModels.ts`, while `FullscreenIDE.tsx` now delegates route query parsing to `useWorkbenchRouteParams.ts`
- preview runtime polish kept moving inside the same lane instead of ballooning the pane shell: `usePreviewRuntimeHmrBridge.ts` now tracks explicit HMR sub-states (`connecting`, `connected`, `reconnecting`, `disconnected`) plus a short recovery grace window before degrading the lane, and `PreviewLifecycleChrome.tsx` / `RuntimePreviewSurface.tsx` now surface that calmer HMR truth instead of snapping between healthy and warning too aggressively
- the follow-up clean rerun in `cloud-web-app/web/build-probe-2026-04-24-terminal-first-class.log` confirmed that this shell work did not introduce a new failure class: the build still reached `Generating static pages (213/213)` and still failed on the same `<Html>` + `useContext` blocker cluster
- the next root-level build probes stayed honest instead of widening the drift surface: removing the legacy `cloud-web-app/web/pages/404.tsx`, `pages/500.tsx`, `pages/_app.tsx`, `pages/_document.tsx`, and `pages/_error.tsx` fallback chain, stripping `ClientLayout` out of `app/layout.tsx`, and collapsing `app/error.tsx`, `app/global-error.tsx`, and `app/not-found.tsx` to minimal boundaries still did **not** clear the old prerender path; `cloud-web-app/web/build-probe-2026-04-25-pages-fallback-chain-removed.log` and `cloud-web-app/web/build-probe-2026-04-25-root-boundaries-minimal.log` reproduced the same `/404`, `/500`, and `/_not-found` failure class
- the practical mitigation is now explicit instead of implied: `cloud-web-app/web/package.json` points `npm run build` to `next build --experimental-build-mode compile`, while `npm run build:prerender-probe` preserves the older generate path for diagnosis
- this mitigation is backed by real evidence, not wishful wording: `cloud-web-app/web/build-probe-2026-04-25-compile-mode.log` completed successfully, the resulting artifact booted under `next start` with `200` returned for `/` in `cloud-web-app/web/start-probe-2026-04-25-compile-mode.out.log`, and the compile path completed successfully again in `cloud-web-app/web/build-probe-2026-04-26-compile-mode.log`
- that does **not** mean full prerender parity is solved; it means the branch now has a production-viable server-rendered build path while the original `<Html>` / `useContext` export cluster remains open under `npm run build:prerender-probe`
- the freshest local probe remains honest too: `cloud-web-app/web/build-probe-2026-04-26-wave-b-runtime-prerender.log` still timed out at `Creating an optimized production build ...`, while the immediately previous `cloud-web-app/web/build-probe-2026-04-26-wave-b-prerender-probe.log` had advanced into `Linting and checking validity of types ...` before timing out, which keeps prerender parity explicitly open even after the recent Wave B slicing pass
- the public prerender suspect set also got one honest reduction pass this round: `PublicHeader.tsx` no longer depends on `use-browser-pathname.ts`, and `/terms` + `/privacy` now use static last-updated labels instead of runtime date calls; the latest direct rerun still stalled at `Creating an optimized production build ...`, so this is a surface simplification, not a false claim that the broader public-shell blocker is closed

## Round Delta On 2026-04-27
This follow-up round pushed the public trust/buyer path closer to benchmark-grade while also hardening deploy operations:
- `cloud-web-app/web/app/security/page.tsx` (`167`) and `app/compliance/page.tsx` (`167`) now give the product real public trust-center surfaces instead of only footer chips, both mounted on the shared `app/security/trust-center-shared.tsx` shell (`248`)
- `cloud-web-app/web/app/customers/page.tsx` (`221`) plus `app/customers/customerProofContent.ts` (`97`) now turn the earlier benchmark critique into an honest customer-proof surface: beta design partners, use-case fit, public evidence links, and next-step CTAs without fake logos or inflated customer counts
- `cloud-web-app/web/app/status/page.tsx` is now a `311`-line shell over `app/status/status.content.ts` (`46`), `status.logic.ts` (`379`), and `status.types.ts` (`26`), which makes incident grammar, page-coverage truth, and customer-impact framing easier to evolve without regrowing the status route monolith
- the buyer path is materially tighter now:
  - `components/ui/PublicFooter.tsx`, `app/contact-sales/page.tsx`, and `lib/navigation/surfaces.ts` all route users toward `/security`, `/customers`, `/status`, and `/compliance`
  - `app/landing-v3.tsx` now includes customer-proof in the public trust actions, so the commercial narrative no longer jumps directly from landing to pricing/status without any proof-of-fit layer
- deploy credibility also tightened on the backend:
  - `app/api/deploy/route.ts` now requires auth plus `build` entitlements, redacts readiness internals, and emits structured logger events instead of raw `console.error`
  - regression coverage now exists in `__tests__/api/deploy-route.test.ts`
- the public buyer path is deeper now instead of stopping at top-level trust pages:
  - `app/docs/procurement-starter-pack/page.tsx` adds a real procurement reading order, FAQ, and trust-artifact map
  - `app/docs/page.tsx`, `app/contact-sales/page.tsx`, `app/customers/page.tsx`, `app/customers/customerProofContent.ts`, and `components/ui/PublicFooter.tsx` now all route buyers through the same trust -> proof -> procurement -> contact journey
  - `app/roadmap/page.tsx` now gives the public shell an explicit truth-oriented roadmap surface instead of leaving roadmap grammar trapped in audits and landing chips
  - `app/security-policy/page.tsx`, `app/security-acknowledgments/page.tsx`, root `SECURITY.md`, and `public/.well-known/security.txt` now line up around real disclosure and acknowledgment routes instead of broken placeholders
  - `app/compare/page.tsx` plus `app/compare/comparison-content.ts` now expose an honest benchmark surface against Cursor, Windsurf, Replit, Vercel, Linear, and Notion
  - `app/landing-v3.tsx`, `app/docs/page.tsx`, `components/ui/PublicFooter.tsx`, and `lib/navigation/surfaces.ts` now route buyers into that comparison page instead of leaving benchmark framing trapped in audits alone
  - `app/sitemap.ts` now includes `/compare`, `/roadmap`, `/security`, `/compliance`, `/customers`, `/docs/changelog`, `/docs/support`, and `/docs/community`, so the proof/trust surfaces are materially more discoverable
- the AI ops lane also stopped pretending demo data was real telemetry:
  - `components/ai-chat/useAIChatRunState.ts` no longer fabricates architect/engineer/QA progress, cost, and confidence values
  - `components/ai-chat/AgentBoard.tsx` now labels partial telemetry explicitly and only renders detailed metrics when they actually exist
  - `components/ai-chat/AIChatOpsSidebar.tsx` now persists project-scoped operator memories and reflects the live pending diff in the approval lane instead of mounting empty arrays
  - `components/ide/AIChatPanelPro.tsx` also no longer seeds the lane with a canned assistant greeting, so first-load chat history is now empty-state truthful instead of demo-like
  - `app/api/project-rules/route.ts`, `lib/server/project-rules.ts`, `components/ai-chat/AIChatRulesPanel.tsx`, and `components/ai-chat/useAIChatProjectRules.ts` now expose `.aethelrules` as a canonical read/write operator surface instead of a backend-only hidden constraint
- the websocket runtime convergence also moved forward:
  - `server/websocket-server.ts` is now a compatibility wrapper over `lib/server/websocket-server.ts`, which keeps the npm script stable while consolidating runtime behavior in one implementation
  - the shared runtime libs (`bootstrap.ts`, `file-watcher-runtime.ts`, `hot-reload-runtime.ts`, `terminal-pty-runtime.ts`) now use relative logger imports and consistent port resolution
  - `__tests__/server/websocket-runtime-contract.test.ts` now locks the compat export and helper-route contract instead of leaving the convergence untested
- the shared-runtime search space also narrowed one more notch:
  - `app/marketplace/layout.tsx` now mounts `StudioRuntimeRouteLayout` with `surface="light"` and `onboardingChrome={false}`, so the public marketplace no longer opts into the heaviest runtime path by default
  - `components/providers/runtime/useDeferredRuntimeActivation.ts` now stages session tracking, telemetry, service-worker registration, and ambient AI/billing surfaces behind idle or clear user intent instead of enabling all background work at first paint
  - `runtime/FullStudioRuntime.tsx` now uses that staged activation to defer `SessionTrackerProvider`, `TelemetryBootstrap`, `WebVitalsReporter`, `ServiceWorkerProvider`, `LowBalanceModalAuto`, and `AISuggestionBubbleAuto`
  - `lib/analytics.ts` now exports a lazy facade, so the analytics singleton and its 30-second flush interval are only created after a real caller touches analytics instead of on module import
- this improves trust and governance, but it does **not** close the top remaining gaps:
  - public case-study depth is still lighter than the best Vercel/Linear buyer paths
  - the shared compile-mode build path still needs fresh revalidation on each wave; the latest rerun in `cloud-web-app/web/build-probe-2026-04-27-runtime-deferral-compile.log` timed out again at `Creating an optimized production build ...`
  - `npm run build:prerender-probe` remains explicitly open, with the newest evidence in `cloud-web-app/web/build-probe-2026-04-27-runtime-deferral-prerender.log` also stalling at `Creating an optimized production build ...`

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
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx`: `393`
- `cloud-web-app/web/components/dashboard/ProjectsDashboard.tsx`: `56`
- `cloud-web-app/web/components/dashboard/useProjectsDashboardController.ts`: `146`
- `cloud-web-app/web/components/dashboard/ProjectsDashboardCollection.tsx`: `594`
- `cloud-web-app/web/components/dashboard/ProjectsDashboardCreateModal.tsx`: `186`
- `cloud-web-app/web/components/dashboard/ProjectsDashboardSections.tsx`: `172`
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`: `313`
- `cloud-web-app/web/components/ide/InlineAIChat.tsx`: `136`
- `cloud-web-app/web/components/ide/InlineAIChatPrimitives.tsx`: `299`
- `cloud-web-app/web/components/ide/InlineAIChatSections.tsx`: `209`
- `cloud-web-app/web/components/ide/InlineAIChatContextSurface.tsx`: `217`
- `cloud-web-app/web/components/ide/InlineAIChatMessageSurface.tsx`: `177`
- `cloud-web-app/web/components/ide/InlineAIChatComposerSurface.tsx`: `255`
- `cloud-web-app/web/components/ide/modern-shell/chromeStatusBar.tsx`: `454`
- `cloud-web-app/web/components/ide/modern-shell/useShellSourceControlTruth.ts`: `262`
- `cloud-web-app/web/components/ai-chat/AIChatComposer.tsx`: `282`
- `cloud-web-app/web/components/ai-chat/useAIChatComposerState.ts`: `220`
- `cloud-web-app/web/components/ai-chat/useAIChatHistoryMode.ts`: `107`
- `cloud-web-app/web/components/ai-chat/AIChatTimeline.tsx`: `90`
- `cloud-web-app/web/components/ai-chat/AIChatOpsSidebar.tsx`: `152`
- `cloud-web-app/web/components/ai-chat/AgentBoard.tsx`: `160`
- `cloud-web-app/web/components/ai-chat/useAIChatRunState.ts`: `149`
- `cloud-web-app/web/components/ai-chat/useAIChatOpsArtifacts.ts`: `149`
- `cloud-web-app/web/components/ide/fullscreen/useFullscreenIDEBridgeSections.ts`: `8`
- `cloud-web-app/web/components/ide/fullscreen/useWorkbenchBridgeChrome.ts`: `49`
- `cloud-web-app/web/components/ide/fullscreen/useWorkbenchBridgeEditorProps.ts`: `57`
- `cloud-web-app/web/components/ide/fullscreen/workbenchBridgeModels.ts`: `66`
- `cloud-web-app/web/components/ide/fullscreen/useWorkbenchRouteParams.ts`: `16`
- `cloud-web-app/web/components/preview/usePreviewRuntime.ts`: `116`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx`: `219`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`: `99`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.types.ts`: `62`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchSplitEditorSurface.tsx`: `121`
- `cloud-web-app/web/components/preview/previewRuntimeState.ts`: `38`
- `cloud-web-app/web/components/preview/usePreviewRuntimeHealthMonitor.ts`: `57`
- `cloud-web-app/web/components/preview/RuntimePreviewSurface.tsx`: `239`
- `cloud-web-app/web/components/preview/usePreviewRuntimeHmrBridge.ts`: `122`
- `cloud-web-app/web/components/preview/PreviewRuntimeTrustNotice.tsx`: `131`
- `cloud-web-app/web/components/preview/PreviewLifecycleChrome.tsx`: `217`
- `cloud-web-app/web/components/preview/SceneViewportWorkflowDrawer.tsx`: `163`
- `cloud-web-app/web/components/terminal/useTerminalSessions.ts`: `120`
- `cloud-web-app/web/components/terminal/useTerminalRuntime.ts`: `150`
- `cloud-web-app/web/components/preview/useSceneViewportSurfaceState.ts`: `149`
- `cloud-web-app/web/components/terminal/useTerminalTransport.ts`: `145`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx`: `134`
- `cloud-web-app/web/components/editor/MonacoEditorPro.tsx`: `1164`

### Wave B - dense product surfaces next in line
- `cloud-web-app/web/components/scene-editor/SceneEditor.tsx`: `1193`
- `cloud-web-app/web/components/engine/DetailsPanel.tsx`: `1173`
- `cloud-web-app/web/components/assets/ContentBrowser.tsx`: `1128`
- `cloud-web-app/web/components/marketplace/CreatorDashboardAssetCards.tsx`: `309`
- `cloud-web-app/web/components/marketplace/CreatorDashboardAnalyticsCards.tsx`: `264`
- `cloud-web-app/web/components/marketplace/CreatorDashboardTabPanels.tsx`: `232`
- `cloud-web-app/web/components/marketplace/CreatorDashboardSections.tsx`: `79`
- `cloud-web-app/web/components/marketplace/CreatorDashboardPrimitives.tsx`: `107`
- `cloud-web-app/web/components/marketplace/CreatorDashboard.api.ts`: `88`
- `cloud-web-app/web/components/marketplace/CreatorDashboard.constants.tsx`: `88`
- `cloud-web-app/web/components/marketplace/CreatorDashboard.types.ts`: `48`
- `cloud-web-app/web/components/settings/SettingsPageData.items.editor.ts`: `135`
- `cloud-web-app/web/components/settings/SettingsPageData.categories.tsx`: `119`
- `cloud-web-app/web/components/settings/SettingsPageData.items.ai.ts`: `114`
- `cloud-web-app/web/components/settings/SettingsPageData.defaults.ts`: `102`
- `cloud-web-app/web/components/settings/SettingsPageData.items.engine.ts`: `97`
- `cloud-web-app/web/components/settings/SettingsPageData.items.system.ts`: `90`
- `cloud-web-app/web/components/settings/SettingsPageData.items.workspace.ts`: `76`
- `cloud-web-app/web/components/settings/SettingsPageData.items.appearance.ts`: `71`
- `cloud-web-app/web/app/admin/ai-monitor/ai-monitor-readiness-sections.tsx`: `399`
- `cloud-web-app/web/app/admin/ai-monitor/ai-monitor-core-loop-sections.tsx`: `284`
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

### Preview/runtime follow-through
- `WorkbenchPreviewRuntimeSurface.tsx` is now the authority adapter between the workbench runtime manager and `RuntimePreviewSurface.tsx`
- `RuntimePreviewSurface.tsx` gained optional controlled-runtime inputs so we can keep one runtime lane truthful inside the IDE without breaking standalone runtime consumers
- this specifically reduces the old duplicate-lifecycle problem where the workbench trust notice could say one thing and the nested runtime strip could say `degraded` just because an external URL existed

### Wave 2 - dense product surfaces
After Wave 1 stabilizes:
1. `ProjectsDashboard.tsx`
2. `SettingsPageData.tsx`
3. `CreatorDashboardSections.tsx`
4. `app/admin/ai-monitor/ai-monitor-sections.tsx`
5. `SceneEditor.tsx`

### Wave 2 progress snapshot

- the symbol-truth/editor-context pass is now materially further along:
  - `MonacoEditorPro.tsx` emits authoritative TypeScript/JavaScript document symbols via the Monaco worker
  - `useWorkbenchShellState.ts` now owns per-pane document symbol state
  - `WorkbenchEditorCanvas.tsx`, `WorkbenchEditorSurface.tsx`, `WorkbenchEditorPane.tsx`, `useWorkbenchBridgeEditorProps.ts`, and `useFullscreenIDEBridgeProps.types.ts` now carry that truth through the canonical workbench editor lane
  - `useWorkbenchEditorModel.ts` now prefers authoritative symbol payloads and only falls back to `buildOutlineSymbols(...)` when symbol truth is stale or unavailable
- the settings-route convergence gap also moved this round:
  - `app/settings/page.tsx` now routes its primary editor tab through `SettingsUI` + `SettingsProvider`, which means the thinner settings cockpit is no longer stranded outside the live `/settings` route
- new focused tests now lock the recent preview/runtime and editor fallback seams:
  - `__tests__/ide/RuntimePreviewSurface.test.tsx`
  - `__tests__/ide/WorkbenchPreviewRuntimeSurface.test.tsx`
  - `__tests__/ide/useWorkbenchEditorModel.test.ts`
- `SettingsPage.tsx` is no longer carrying its own filter/search orchestration alone:
  - `components/settings/SettingsPageState.ts` now owns category/subcategory/search state
  - `components/settings/SettingsPageSections.tsx` now exposes counts, grouped rendering, and clearer operator affordances
- the legacy settings surface moved further again:
  - `components/settings/SettingsPage.tsx` is now the `83`-line route shell
  - `components/settings/SettingsPageData.tsx`, `SettingsPageData.defaults.ts`, `SettingsPageData.categories.tsx`, `SettingsPageData.items.*`, `SettingsPageInputs.tsx`, `SettingsPage.types.ts`, and `useSettingsPageStorage.ts` now hold the catalog, row controls, contracts, and persistence seams separately
- the dashboard overview also moved from one dense surface into real seams:
  - `components/dashboard/ProjectsDashboard.tsx` is now a thin composition shell
  - `components/dashboard/useProjectsDashboardController.ts` now owns fetch/filter/stats/action state
  - `components/dashboard/ProjectsDashboardCollection.tsx` now owns toolbar/list-grid/empty-state/result-label behavior
  - `components/dashboard/ProjectsDashboardCreateModal.tsx` and `components/dashboard/ProjectsDashboardSections.tsx` now own creation flow plus overview chrome
  - search now covers both `name` and `description`, and `Limpar filtros` exists in both the toolbar and filtered empty state
- `InlineAIChat.tsx` also moved from single-file density toward product seams:
  - `components/ide/useInlineAIChatSession.ts`
  - `components/ide/InlineAIChat.helpers.ts`
  - `components/ide/InlineAIChatPrimitives.tsx`
  - `components/ide/InlineAIChatSections.tsx`
  - `components/ide/InlineAIChat.styles.ts`
- the inline lane is thinner again now:
  - `components/ide/InlineAIChatContextSurface.tsx`
  - `components/ide/InlineAIChatMessageSurface.tsx`
  - `components/ide/InlineAIChatComposerSurface.tsx`
- the admin AI monitor route also left the Wave B monolith bucket:
  - `app/admin/ai-monitor/page.tsx` is now the orchestration shell
  - `app/admin/ai-monitor/ai-monitor-overview.tsx` and `ai-monitor-calls.tsx` now own the operator chrome and recent-call table
  - `app/admin/ai-monitor/ai-monitor-readiness-sections.tsx`, `ai-monitor-core-loop-sections.tsx`, `ai-monitor-support-sections.tsx`, and `ai-monitor-section-primitives.tsx` now own the heavy audit sections
- the creator marketplace cockpit also moved further inside Wave B:
  - `components/marketplace/CreatorDashboardTabPanels.tsx`, `CreatorDashboardAnalyticsCards.tsx`, and `CreatorDashboardAssetCards.tsx` now own the denser tab and card surfaces instead of leaving that density inside `CreatorDashboardSections.tsx`
- the shared runtime axis also got a calmer seam pass:
  - `components/providers/StudioRuntimeProviders.tsx` is now a thin surface router
  - `components/providers/runtime/FullStudioRuntime.tsx`, `LightweightStudioRuntime.tsx`, `StudioRuntimeLoadingFallback.tsx`, and `StudioRuntimeCommandRegistration.tsx` now hold the real runtime stack seams
  - `__tests__/providers/StudioRuntimeRouteLayout.test.tsx` and `__tests__/providers/StudioRuntimeProviders.test.tsx` now pin the route-shell forwarding and light/full surface selection
- the public landing shell was reduced in parallel:
  - `app/landing-v3.tsx` is back to a server page
  - `app/landing-v3-mission-box.tsx` now holds the interactive workspace-generation flow
  - the same landing shell now carries a more benchmark-aware public story instead of only aspirational hero language: direct trust actions for status/docs/pricing plus an explicit three-card comparison against `Cursor / Windsurf / VS Code`, `Replit / Windsurf / Vercel / v0`, and `Linear / Notion / Vercel`
  - `app/pricing/page.tsx` also fixed the malformed onboarding CTA route and cleaned the visible FAQ grammar, which is small work but meaningful because these are first-impression commercial surfaces
- the shared studio runtime is a bit less magic:
  - `components/ServiceWorkerProvider.tsx` now relies on explicit enablement instead of pathname inference
  - `lib/providers/AethelProvider.tsx` no longer persists preferences from inside the reducer
  - `app/dashboard/layout.tsx` now opts out of duplicate onboarding chrome through `StudioRuntimeRouteLayout`, which keeps dashboard onboarding in one lane instead of two
- the public buyer/trust path is materially less hollow now:
  - `app/roadmap/page.tsx`
  - `app/security-policy/page.tsx`
  - `app/security-acknowledgments/page.tsx`
  - `SECURITY.md`
  - `public/.well-known/security.txt`
  - plus public-nav/footer/docs/contact-sales/landing wiring into those trust routes
- the collaboration lane is also more honest than the earlier optimistic-presence version:
  - `useWorkbenchRealtimeCollaboration.ts` now derives `disabled | connecting | syncing | live | reconnecting | error`
  - `WorkbenchEditorToolbar.tsx` now only shows live collaborator avatars after sync confirmation, and otherwise surfaces the real state (`Solo`, `Conectando`, `Sincronizando`, `Reconectando`, `Sync com erro`)
  - `useWorkbenchBridgeChrome.ts` no longer promotes collaboration as effectively live before the editor lane is actually synced
  - coverage exists in `__tests__/ide/WorkbenchEditorToolbar.test.tsx`
- the service-worker/runtime edge is also less eager now:
  - `hooks/useServiceWorker.tsx` defers registration until the document is visible, online, and idle
  - controller changes only trigger a full reload after an explicit user-driven `skipWaiting` action
  - `components/ServiceWorkerProvider.tsx` now persists update-prompt dismissal for one hour and keys its prompt/offline chrome off the truly gated enablement path
  - coverage exists in `__tests__/service-worker/useServiceWorker.test.tsx`
- the preview/runtime trust lane also advanced again:
  - `usePreviewRuntime.ts`, `previewRuntime.types.ts`, `previewRuntimeState.ts`, `RuntimePreviewSurface.tsx`, and `PreviewLifecycleChrome.tsx` now preserve provider identity, env/setup hints, recommended next action, and clearer failure guidance from `/api/preview/runtime-provision`
  - this moves failed/warming/idle runtime states closer to the trust grammar expected from Replit/Vercel review surfaces
- the AI review loop is a bit less hidden:
  - `components/ai-chat/AIChatPendingDiffTray.tsx` now surfaces pending file edits directly above the composer with `Open diff`, `Reject`, and `Apply now`
  - `components/ide/AIChatPanelPro.tsx` mounts that tray whenever `editorBridge.pendingDiff` exists, which makes the main artifact-review loop more obvious before the user opens the full ops sidebar
  - focused coverage exists in `__tests__/ai-chat/AIChatPendingDiffTray.test.tsx`
- the heaviest remaining editor hotspot finally lost a chunk of density:
  - `MonacoEditorPro.tsx` dropped to `667` lines
  - theming moved into `components/editor/MonacoEditorPro.theme.ts`
  - Monaco command/action registration moved into `components/editor/MonacoEditorPro.actions.ts`
  - TS/JS symbol mapping moved into `components/editor/MonacoEditorPro.symbols.ts`
  - focused coverage exists in `__tests__/editor/MonacoEditorPro.symbols.test.ts`

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
2. keep full compile-mode build green while tracing `build:prerender-probe` separately, but note that the freshest `2026-04-28` compile-mode rerun still did **not** revalidate with a new PASS and again stalled at `Creating an optimized production build ...`
3. keep reducing shared-runtime noise through `FullStudioRuntime.tsx`, `ServiceWorkerProvider.tsx`, `useServiceWorker.tsx`, and `AethelProvider.tsx`
4. return to `FullscreenIDE.tsx` and the remaining workbench bridge/runtime hotspots
5. keep polishing preview through `usePreviewRuntime.ts`, `RuntimePreviewSurface.tsx`, `SceneViewportWorkflowDrawer.tsx`, and `useSceneViewportSurfaceState.ts`
6. keep moving the AI lane from "strong panel" to "operator surface" through `AIChatPanelPro.tsx`, `AIChatComposer.tsx`, `useAIChatComposerState.ts`, `AIChatTimeline.tsx`, `useAIChatHistoryMode.ts`, and the thinner `InlineAIChat.tsx` seams
7. stabilize `useTerminalRuntime.ts` and `useTerminalSessions.ts`
8. continue Wave B in `ProjectsDashboardCollection.tsx`, `CreatorDashboardSections.tsx`, `app/admin/ai-monitor/ai-monitor-sections.tsx`, and `SettingsPageData.tsx` now that the route shells are calmer
9. promote preview, collaboration, deploy, and public-shell confidence from present to trusted

## One-Line Reading
The audits no longer leave us with ambiguity.
The fastest honest path is to keep slicing by real UX seams, starting with preview/deploy trust, explorer collaboration visibility, and the remaining workbench core while prerender parity stays explicitly open.
