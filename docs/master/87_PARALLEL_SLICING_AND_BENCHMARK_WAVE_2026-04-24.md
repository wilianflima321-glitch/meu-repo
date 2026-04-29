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

## Round Delta On 2026-04-28
This follow-up round focused on real build confidence instead of cosmetic route churn:
- the preview/runtime server edge is now materially calmer for Next's build graph:
  - `cloud-web-app/web/lib/server/e2b-runtime.ts` now centralizes `e2b` loading and sandbox resolution
  - `app/api/preview/runtime-provision/route.ts`, `app/api/preview/runtime-sync/route.ts`, and `app/api/preview/runtime-sync-file/route.ts` now consume that helper instead of each doing their own inline `import('e2b')`
  - `cloud-web-app/web/next.config.js` now externalizes `e2b` through `experimental.serverComponentsExternalPackages`
- the AI context path also stopped pulling the broad server barrel into more routes than necessary:
  - `cloud-web-app/web/lib/server/mention-context.ts` now imports `git-service` and `search-runtime` directly instead of the wider `lib/server` barrel
- the websocket runtime path is slightly more bundler-friendly now:
  - `cloud-web-app/web/lib/server/websocket-server.ts` now loads `y-websocket` helpers through a runtime-only `pathToFileURL(...)` import instead of expression-based `require(...)`
- the public enterprise path also got a lower-risk App Router cleanup:
  - `cloud-web-app/web/app/contact-sales/page.tsx` is now a server wrapper with metadata and explicit `searchParams` parsing
  - `cloud-web-app/web/app/contact-sales/contact-sales-content.tsx` owns the interactive client surface, which removes `useSearchParams()` from a high-value public route without changing the UX
- the compile-mode production path is now freshly revalidated instead of only historically trusted:
  - `cloud-web-app/web/build-probe-2026-04-28-externalized-e2b-runtime.log` completed successfully on `2026-04-28`
  - `cloud-web-app/web/build-probe-2026-04-28-contact-sales-wrapper-compile.log` completed successfully again after the public `contact-sales` route was split into a server wrapper plus client content island
- the prerender probe is still open, but the debugging state is much better:
  - `cloud-web-app/web/build-probe-2026-04-28-contact-sales-wrapper-prerender.log` now reaches `Generating static pages (224/224)` and fails deterministically
  - the remaining families are now explicit:
    - `/404` and `/500`: `<Html> should not be imported outside of pages/_document`
    - wider App Router export cluster: `Cannot read properties of null (reading 'useContext')`

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
- the shared state provider stack is calmer too:
  - `lib/providers/AethelProvider.tsx` now accepts `runtimeReady`, so auth, wallet, onboarding, and websocket work no longer wake up before the shared runtime says the studio lane is ready
  - `components/providers/runtime/FullStudioRuntime.tsx` now passes `deferredActivation.sessionTrackingReady` into `AethelProvider`
  - coverage exists in `__tests__/providers/AethelProvider.runtimeReady.test.tsx`
- the preview/runtime trust lane also advanced again:
  - `usePreviewRuntime.ts`, `previewRuntime.types.ts`, `previewRuntimeState.ts`, `RuntimePreviewSurface.tsx`, and `PreviewLifecycleChrome.tsx` now preserve provider identity, env/setup hints, recommended next action, and clearer failure guidance from `/api/preview/runtime-provision`
  - this moves failed/warming/idle runtime states closer to the trust grammar expected from Replit/Vercel review surfaces
- the deploy/review lane is also less optimistic than before:
  - `app/api/deploy/route.ts` now runs `runQaGate()` during both deploy readiness checks and deploy creation
  - `components/preview/usePreviewDeployTrust.ts` now surfaces release-quality blockers coming back from the API instead of flattening every deploy block into generic missing-config feedback
  - `components/ide/PreviewRuntimeToolbar.tsx` now shows inline `QA:` blocker chips when publish is blocked by quality checks, which is materially closer to a trustworthy Vercel-style release lane than the older binary `Deploy ready` grammar
- the AI review loop is a bit less hidden:
  - `components/ai-chat/AIChatPendingDiffTray.tsx` now surfaces pending file edits directly above the composer with `Open diff`, `Reject`, and `Apply now`
  - `components/ide/AIChatPanelPro.tsx` mounts that tray whenever `editorBridge.pendingDiff` exists, which makes the main artifact-review loop more obvious before the user opens the full ops sidebar
  - focused coverage exists in `__tests__/ai-chat/AIChatPendingDiffTray.test.tsx`
- the inline AI lane also stopped being only a local mock loop:
  - `components/ide/useInlineAIChatSession.ts` now resolves provider status, uses the advanced chat request path when possible, and only falls back to the bounded local demo when providers are absent
  - `components/ide/InlineAIChat.helpers.ts` now builds an explicit inline request envelope with file/project context and parses advanced-chat response payloads
  - `components/ide/InlineAIChat.tsx` now forwards project context into that real session layer
  - focused coverage exists in `__tests__/ide/InlineAIChat.helpers.test.ts`
- the heaviest remaining editor hotspot finally lost a chunk of density:
  - `MonacoEditorPro.tsx` dropped to `667` lines
  - theming moved into `components/editor/MonacoEditorPro.theme.ts`
  - Monaco command/action registration moved into `components/editor/MonacoEditorPro.actions.ts`
  - TS/JS symbol mapping moved into `components/editor/MonacoEditorPro.symbols.ts`
  - focused coverage exists in `__tests__/editor/MonacoEditorPro.symbols.test.ts`


- the public-shell/App Router cleanup moved further again:
  - `app/contact/page.tsx` and `app/docs/page.tsx` are now server wrappers over `contact-content.tsx` and `docs-content.tsx`
  - that keeps metadata at the route boundary while the interactive buyer/docs surfaces live in thinner client islands
- the AI lane now shows proposal review where the operator already is:
  - `components/ai-chat/AIChatProposalPreview.tsx` mounts the diff surface inline in the main chat lane
  - `components/ai-chat/AIChatPendingDiffTray.tsx` now toggles `Open diff` / `Hide review`
  - `components/ide/AIChatPanelPro.tsx` now owns the lighter inline review toggle instead of forcing every review through the deeper ops sidebar
  - focused coverage exists in `__tests__/ai-chat/AIChatProposalPreview.test.tsx`
- the workbench default posture also got denser and more visual-first:
  - `useWorkbenchShellState.ts` now defaults to `previewMode = 'viewport3d'`
  - preview auto-open now starts at `1280px`
  - fallback panel proportions and clamps now bias toward a tighter center lane through `useWorkbenchShellState.ts`, `useModernIDEPanels.ts`, `chromeStyles.ts`, `chromeHeader.tsx`, `chromeBottomDock.tsx`, `sideColumnSidebar.tsx`, `sideColumnPreview.tsx`, `ModernIDEShellCenterStack.tsx`, `WorkbenchPreviewModeHeader.tsx`, and `WorkbenchSidebar.tsx`
- the prerender investigation also crossed an important threshold:
  - removing `app/error.tsx` collapses the broad App Router `useContext` export cluster (`build-probe-2026-04-28-error-disabled-prerender.log`)
  - reintroducing minimal pages fallback files does not solve the residual `/404` + `/500` `<Html>` parity failure and also reopens the wider export cluster (`build-probe-2026-04-28-pages-error-chain-prerender.log`)
  - compile mode stayed healthy after the root-error removal in `build-probe-2026-04-28-error-removed-compile.log`
  - the later density/artifact-first pass also held compile mode green in `build-probe-2026-04-28-artifact-first-compile.log`

### Wave 3 - domain editors
After the workbench/studio shell is calmer:
1. `SceneEditor.tsx`
2. `DetailsPanel.tsx`
3. `ContentBrowser.tsx`
4. domain editors such as audio, terrain, quest, and timeline surfaces

### Wave 4 - arsenal and domain packs
With the current repo and benchmark truth reconciled in `docs/master/88_AI_ARSENAL_AND_DOMAIN_SUPERIORITY_BLUEPRINT_2026-04-28.md`, the next parallel slicing wave should also treat the product as a domain-capable AI operating system, not only a better shell.

Primary waves:
1. research plane
   - evidence board
   - contradiction lane
   - replayable research runs
   - artifact exports
2. apps/sites plane
   - chat -> diff -> apply -> review -> rollback unification
   - preview/review/deploy trust
3. games plane
   - asset validation
   - runtime simulation checks
   - render/build queue semantics
4. films plane
   - continuity memory
   - shot/version authority
   - render/export review pipeline
5. economics/governance plane
   - cost capsule
   - budget caps
   - provenance ledger
   - approval-first expensive execution

### Wave 5 - evidence workflow and residual parity narrowing
The newest high-ROI slices are now explicit too:
1. evidence workflow
   - `traceSummary` is no longer backend-only
   - `components/ai-chat/ai-chat-evidence.ts`, `AIChatEvidenceCard.tsx`, and `AIChatEvidencePanel.tsx` now promote research handoffs and advanced-chat traces into visible operator artifacts
   - `useAIChatController.ts`, `useAIChatSessionContext.ts`, `MessageBubble.tsx`, `AIChatOpsSidebar.tsx`, and `AIChatPanelPro.tsx` now keep that evidence attached to the chat lane and the ops lane
2. residual pages-runtime parity experiment
   - minimal `pages/404.tsx` and `pages/500.tsx` now exist as a bounded experiment against the remaining `/404` + `/500` prerender fault
   - unlike the earlier full fallback-chain attempt, `_app`, `_error`, and `_document` remain absent
   - this experiment is currently validated by lint/typecheck/enterprise gate only; it still has no fresh build verdict
3. next benchmark-grade follow-ons from here
   - unify `InlineAIChat` with the visible evidence/review loop
   - keep shrinking the shared-runtime/build search space
   - move preview further from runtime toolbar toward review-surface authority

### Wave 6 - inline convergence and root-boundary isolation
The next measured tightening now looks like this:
1. inline convergence
   - `InlineAIChat.helpers.ts`, `useInlineAIChatSession.ts`, and `InlineAIChatMessageSurface.tsx` now reuse the same evidence grammar as the main AI console
   - this means the lightweight editor lane is no longer blind to `traceSummary`, which narrows the product gap between \"full AI ops\" and \"fast inline action\"
2. root-boundary isolation
   - the latest local read suggests the residual prerender cluster is no longer best explained by missing `/404` or `/500`
   - because the pages manifest already registers those routes, the highest-signal next experiment is now the App Router root boundary in `app/layout.tsx`
   - the honest recommendation is to test one small root-level static/dynamic isolation patch there before spending more cycles on fallback pages

### Wave 7 - review-ready preview lane
The preview/deploy cockpit is now moving from "best available share link" toward an explicit review contract:
1. review target grammar
   - `components/preview/previewDeployTrust.ts` now defines:
     - `review_ready_public`
     - `review_ready_runtime`
     - `ephemeral_runtime`
     - `blocked_stale`
     - `blocked_degraded`
2. review-aware hook layer
   - `components/preview/usePreviewDeployTrust.ts` now resolves a `reviewTarget` from deploy state, runtime health, runtime readiness, and deploy gate status
   - copy feedback now follows the review target instead of only the older generic share target when available
3. operator-facing toolbar
   - `components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx` now forwards runtime health and readiness into the deploy trust hook
   - `components/ide/PreviewRuntimeToolbar.tsx` now surfaces:
     - `Review ready`
     - `Runtime review`
     - `Ephemeral preview`
     - `Review stale`
     - `Review blocked`
   - the copy action now switches between `Copy review link`, `Copy preview link`, and `Copy last public link` instead of one generic label
4. regression proof
   - `__tests__/preview/previewDeployTrust.test.ts`
   - `__tests__/preview/previewDeployTrust.stableShare.test.ts`
5. truthful build state after this slice
   - `cloud-web-app/web/build-probe-2026-04-28-review-ready-compile.log` = compile-mode `PASS`
   - `cloud-web-app/web/build-probe-2026-04-28-review-ready-prerender.log` = still open, but the probe now reaches `Collecting page data ...` before timing out
   - therefore the product lane improved while prerender parity remains explicitly unresolved

### Wave 8 - inline review-first bridge
The next convergence slice now pushes inline suggestions into the same artifact-review posture as the main AI lane:
1. inline action grammar
   - `components/ide/InlineAIChat.helpers.ts` now allows a separate `onReviewCode` path instead of only `onApplyCode`
2. bridge reuse
   - `components/ide/InlineAIChat.tsx` now reuses `useEditorApplyBridge()`
   - when an active workbench file exists, inline code review stages a diff through `stageDiffForActiveFile(code)` and dispatches `aethel.ide.openChatDiff`
3. message/code-block surface
   - `components/ide/InlineAIChatMessageSurface.tsx` now threads both review and apply actions down to code blocks
   - `components/ide/InlineAIChatPrimitives.tsx` now promotes `Review diff` to the primary action, while `Aplicar` remains the explicit fallback
4. regression proof
   - `__tests__/ide/InlineAIChatMessageSurface.test.tsx` now verifies both the new review-first button and the remaining direct-apply fallback
5. truthful build state after this slice
   - `cloud-web-app/web/build-probe-2026-04-28-inline-review-only-compile.log` did not produce a fresh pass and stalled again at `Creating an optimized production build ...`
   - so this slice is a confirmed product improvement, but not a new platform-confidence win

### Wave 9 - preview proposal overlay and root-boundary read
The next user-facing slice pushes pending AI work into the viewport itself:
1. artifact-first preview overlay
   - `components/ide/fullscreen/WorkbenchPreviewProposalOverlay.tsx` now surfaces pending AI proposals directly over the preview/viewport lane
   - `components/ide/fullscreen/WorkbenchPreviewPane.tsx` now mounts that overlay whenever the editor bridge has a `pendingDiff`
   - operators can now `Open review`, `Apply proposal`, or `Dismiss` without leaving the artifact surface
2. why this matters
   - this closes a gap against the target image language where proposal review lives beside the object/viewport, not only in a side rail
   - it also keeps the diff/review workflow visible even when the chat rail is collapsed or out of focus
3. regression proof
   - `__tests__/ide/WorkbenchPreviewProposalOverlay.test.tsx`
4. root-boundary investigation note
   - the smallest App Router root experiment was also tested locally:
     - `app/layout.tsx` with `export const dynamic = 'force-dynamic'`
   - honest outcome:
     - the test did not produce a strong enough durable signal to justify keeping it
     - the committed branch therefore leaves `app/layout.tsx` clean and continues treating shared-runtime/prerender parity as an open investigation below the root boundary
5. truthful validation state
   - targeted vitest/lint/typecheck/enterprise gate are green
   - no fresh compile-mode pass is claimed for this viewport-overlay slice
   - `build:prerender-probe` remains explicitly unresolved

### Wave 10 - light runtime route split
The next platform-confidence slice reduces how many studio routes still mount the full ambient runtime by default:
1. route-shell split
   - `app/dashboard/layout.tsx`
   - `app/settings/layout.tsx`
   - `app/profile/layout.tsx`
   - `app/project-settings/layout.tsx`
   - `app/nexus/layout.tsx`
   - all now use `StudioRuntimeRouteLayout surface="light" onboardingChrome={false}`
2. why this matters
   - these routes still keep the canonical studio shell, but they no longer pay the default cost of `FullStudioRuntime`
   - that means less shared runtime pressure from:
     - `ServiceWorkerProvider`
     - `AethelProvider`
     - session tracking
     - onboarding chrome
     - other ambient runtime mounts
   - it also sharpens the remaining parity search space by leaving the heavy runtime concentrated in the truly interactive studio routes
3. regression proof
   - `__tests__/app/light-runtime-route-layouts.test.tsx`
   - `__tests__/dashboard/dashboardRouteLayout.test.tsx`
   - `__tests__/providers/StudioRuntimeRouteLayout.test.tsx`
   - `__tests__/providers/StudioRuntimeProviders.test.tsx`
4. truthful build state after this slice
   - `cloud-web-app/web/build-probe-2026-04-28-light-runtime-routes-compile.log` = compile-mode `PASS`
   - `cloud-web-app/web/build-probe-2026-04-28-light-runtime-routes-prerender.log` = still open and timed out after `Linting and checking validity of types ...`
   - therefore the route-shell split is a confirmed platform simplification and a fresh compile-mode win, but not yet the final prerender-parity fix

### Wave 11 - service worker leaf refactor
The next shared-runtime slice removes one more browser-heavy wrapper from the center of the full studio lane:
1. ambient-leaf refactor
   - `components/providers/runtime/FullStudioRuntime.tsx` no longer wraps the entire runtime tree with `ServiceWorkerProvider`
   - `components/ServiceWorkerProvider.tsx` now accepts optional children and can mount as a browser-only leaf for registration, offline messaging, and update prompts
2. why this matters
   - the service-worker lane was one of the most browser-specific parts of the heavy runtime and sat above auth, session tracking, Aethel state, onboarding, and the suspended route tree
   - by moving it to an ambient leaf, the remaining parity search space gets closer to the real shared-runtime pressure instead of keeping SW registration in the middle of the stack
3. regression proof
   - `__tests__/providers/FullStudioRuntime.test.tsx`
   - `__tests__/app/light-runtime-route-layouts.test.tsx`
   - `__tests__/dashboard/dashboardRouteLayout.test.tsx`
4. truthful validation state after this slice
   - targeted vitest coverage is green
   - lint is green
   - direct `tsc --noEmit` is green again after terminating stale timed-out build processes
   - `qa:enterprise-gate` is green again after the same cleanup
   - fresh compile/prerender probe evidence should still be recorded separately after this refactor before claiming a new platform-confidence win

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
2. keep full compile-mode build green while tracing `build:prerender-probe` separately; the freshest honest evidence now includes `cloud-web-app/web/build-probe-2026-04-28-review-ready-compile.log`, and the separate prerender probe is narrower but still explicitly open
3. keep the narrowed parity search focused on the residual `/404` + `/500` pages-runtime fault and the root App Router export cluster that only returns when `app/error.tsx` is present
   - freshest deterministic evidence is now `cloud-web-app/web/build-probe-2026-04-28-review-ready-prerender.log`
   - compile mode remains green in `cloud-web-app/web/build-probe-2026-04-28-review-ready-compile.log`
4. keep reducing shared-runtime noise through `FullStudioRuntime.tsx`, `ServiceWorkerProvider.tsx`, `useServiceWorker.tsx`, and `AethelProvider.tsx`
5. return to `FullscreenIDE.tsx` and the remaining workbench bridge/runtime hotspots
6. keep polishing preview through `usePreviewRuntime.ts`, `RuntimePreviewSurface.tsx`, `SceneViewportWorkflowDrawer.tsx`, and `useSceneViewportSurfaceState.ts`
7. keep moving the AI lane from "strong panel" to "operator surface" through `AIChatPanelPro.tsx`, `AIChatComposer.tsx`, `useAIChatComposerState.ts`, `AIChatTimeline.tsx`, `useAIChatHistoryMode.ts`, and the thinner `InlineAIChat.tsx` seams
8. stabilize `useTerminalRuntime.ts` and `useTerminalSessions.ts`
9. continue Wave B in `ProjectsDashboardCollection.tsx`, `CreatorDashboardSections.tsx`, `app/admin/ai-monitor/ai-monitor-sections.tsx`, and `SettingsPageData.tsx` now that the route shells are calmer
10. promote preview, collaboration, deploy, and public-shell confidence from present to trusted
11. keep expanding the operator plane through cost/governance/research surfaces so even smaller models have budget, evidence, and approval rails by default

## One-Line Reading
The audits no longer leave us with ambiguity.
The fastest honest path is to keep slicing by real UX seams, starting with preview/deploy trust, explorer collaboration visibility, and the remaining workbench core while prerender parity stays explicitly open.


### Wave 12 - economics plane in the operator rail
The next benchmark-grade slice closes a real operator gap: the AI lane now exposes budget and billing truth instead of leaving economics hidden behind backend helpers.
1. real economics endpoint
   - `app/api/studio/cost/live/route.ts` no longer returns `studioNotImplemented(...)`
   - it now resolves:
     - authenticated user wallet balance from `CreditLedgerEntry`
     - live emergency metrics from `emergencyController.updateMetrics()`
     - billing readiness from `getBillingRuntimeState()`
     - policy/budget guidance for the current operator session
2. canonical AI ops surface
   - `components/ai-chat/AIChatEconomicsPanel.tsx` mounts as a live `Economics` tab inside `AIChatOpsSidebar.tsx`
   - `components/ide/AIChatPanelPro.tsx` now forwards the live run estimate into that panel
   - `lib/api.ts` now exposes `StudioCostLive` + `getStudioCostLive(...)` for the canonical client facade
3. user-facing quality improvements
   - operator tabs now scroll horizontally instead of compressing each tab into unreadable width after adding `Economics`
   - the economics panel shows:
     - wallet balance
     - current run estimate
     - hourly/daily/monthly budget meters
     - billing blockers
     - fallback/policy guidance
4. regression proof
   - `__tests__/api/studio-cost-live-route.test.ts`
   - `__tests__/ai-chat/AIChatEconomicsPanel.test.tsx`
   - `__tests__/ai-chat/AIChatOpsSidebar.test.tsx`
5. truthful build state after this slice
   - `cloud-web-app/web/build-probe-2026-04-28-economics-plane-compile.log` timed out at `Creating an optimized production build ...`
   - `cloud-web-app/web/build-probe-2026-04-28-economics-plane-prerender.log` also timed out at the same early phase
   - therefore this wave is a confirmed product/ops improvement, but not a fresh platform-confidence win

### Wave 13 - command center and compact cockpit chrome
The next user-facing slice improves information density without collapsing the product into tiny controls:
1. command center promotion
   - `components/ide/modern-shell/chromeHeaderParts.tsx`
   - the header no longer exposes only two small palette buttons
   - it now shows a proper `Command Center` affordance with a clearer primary action for `Cmd+K` plus a dedicated `Files` quick-open button for `Cmd+P`
2. preview chrome compaction
   - `components/ide/PreviewRuntimeToolbar.tsx`
   - `components/preview/PreviewRuntimeTrustNotice.tsx`
   - `components/ide/fullscreen/WorkbenchPreviewModeHeader.tsx`
   - `components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx`
   - the runtime trust notice stays compact inside the workbench lane
   - the preview mode selector is now a denser segmented control
   - the runtime toolbar uses smaller metrics, shorter copy, and less vertical overhead
3. AI lane compaction
   - `components/ai-chat/AIChatContextStrip.tsx`
   - `components/ai-chat/AIChatTimeline.tsx`
   - the context strip now carries the current goal inline as a chip instead of spending a larger second row on the same information
   - the operational timeline cards are smaller and more glanceable, which returns more space to the message and artifact lanes
4. regression proof
   - `__tests__/ide/chromeHeaderParts.test.tsx`
   - `__tests__/ide/WorkbenchPreviewRuntimeSurface.test.tsx`
5. truthful build state after this slice
   - `cloud-web-app/web/build-probe-2026-04-29-command-center-compact-compile.log` = compile-mode `PASS`
   - `cloud-web-app/web/build-probe-2026-04-29-command-center-compact-prerender.log` = still open and timed out after `Linting and checking validity of types ...`
   - therefore this wave is a confirmed UX/shell-density win and a fresh compile-mode revalidation, but not the final prerender-parity fix

### Wave 14 - AI execution ledger strip
The next premium slice reduces stacked AI chrome and moves operator truth closer to the main conversation:
1. compact operator ledger
   - `components/ai-chat/AIChatLedgerStrip.tsx`
   - `components/ide/AIChatPanelPro.tsx`
   - the main chat lane now surfaces a compact ledger for:
     - active mode
     - execution state
     - agent count
     - evidence-ready state
     - pending diff review
     - run estimate / economics jump
   - this keeps execution/review signals inside the primary lane instead of forcing users into the side rail for every serious action
2. timeline compaction
   - `components/ai-chat/AIChatTimeline.tsx`
   - the old horizontal scroller of cards is now a compact vertical ledger
   - only the top three events stay visible in the default lane, while the component explicitly advertises the rest through the history rail
3. reduced default chrome
   - `AIChatBenchmarkTelemetry` is now shown only when advanced controls are enabled
   - this returns more height to the actual conversation, diff, and artifact loops in the default premium posture
4. regression proof
   - `__tests__/ai-chat/AIChatLedgerStrip.test.tsx`
   - `__tests__/ai-chat/AIChatTimeline.test.tsx`
5. truthful build state after this slice
   - `cloud-web-app/web/build-probe-2026-04-29-ledger-strip-compile.log` reached `Collecting build traces ...` but did not close with a fresh pass before the execution window expired
   - `cloud-web-app/web/build-probe-2026-04-29-global-error-prerender-experiment.log` also remained open after a temporary `app/global-error.tsx` removal experiment
   - therefore this wave is a confirmed AI-lane UX/ergonomics win, but not a fresh platform-confidence win

### Wave 15 - compact preview trust rail
The next cockpit slice returns more stage space to the viewport by making runtime trust details progressive instead of permanently tall:
1. compact-by-default runtime trust
   - `components/ide/PreviewRuntimeToolbar.tsx`
   - the default preview lane now keeps `Deploy trust`, review/share actions, and recommended runtime action visible
   - the three quick-fact metric cards only render when runtime settings are expanded
2. why this matters
   - the user still sees the trust grammar and the handoff path
   - but the preview lane stops spending that vertical space before the operator asks for detailed runtime mechanics
   - this is closer to the target image posture where the viewport stays primary and chrome becomes secondary
3. regression proof
   - `__tests__/ide/PreviewRuntimeToolbar.test.tsx`
4. truthful build state after this slice
   - `cloud-web-app/web/build-probe-2026-04-29-preview-compact-compile.log` = compile-mode `PASS`
   - the freshest prerender search-signal remains `cloud-web-app/web/build-probe-2026-04-29-global-error-prerender-experiment.log`, which stayed open even after a temporary `app/global-error.tsx` removal
   - therefore this wave is a confirmed preview-density win and a fresh compile-mode revalidation, but not the final prerender-parity fix

### Wave 16 - AI lane density and action-first ledger
The next premium slice reduces stacked chrome in the main assistant lane and gives more stage back to conversation plus review:
1. action-first operator rail
   - `components/ide/AIChatPanelPro.tsx`
   - `components/ai-chat/AIChatLedgerStrip.tsx`
   - the ledger now sits before the timeline and behaves more like a review rail than a status badge shelf
   - it prioritizes the strongest user actions:
     - `Review diff`
     - `Inspect trace/research`
     - `Budget`
   - generic duplicate chips were removed in favor of a calmer execution summary
2. single-row context strip
   - `components/ai-chat/AIChatContextStrip.tsx`
   - the old second helper line is gone
   - the current objective or operating context now stays inline as a compact chip
3. timeline starts collapsed
   - `components/ai-chat/AIChatTimeline.tsx`
   - the lane now opens with just the latest event visible
   - users can expand into the top three events only when they want detail
   - this makes the AI lane feel more like a working surface and less like a vertical stack of operator dashboards
4. regression proof
   - `__tests__/ai-chat/AIChatLedgerStrip.test.tsx`
   - `__tests__/ai-chat/AIChatTimeline.test.tsx`
5. truthful build state after this slice
   - `cloud-web-app/web/build-probe-2026-04-29-ai-lane-density-compile.log` remained stuck in `Creating an optimized production build ...` before the execution window expired
   - the freshest compile-mode `PASS` still remains `cloud-web-app/web/build-probe-2026-04-29-preview-compact-compile.log`
   - therefore this wave is a confirmed AI-lane density and usability win, but not a fresh platform-confidence revalidation
