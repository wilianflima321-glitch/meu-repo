# 81_VALIDATED_PRIORITY_BACKLOG_2026-04-20
Date: 2026-04-20
Last refreshed: 2026-04-24
Status: ACTIVE
Purpose: factual anti-fake-success guardrail for the current branch state.

Canonical set reference:
- `docs/master/82_AUDITORIA_V5_AETHEL_ENGINE_DEEP_2026-04-19.md` = primary direction
- `docs/master/83_AUDITORIA_PROFUNDA_SISTEMAS_INTERFACES_GITHUB_2026-04-22.md` = systems and interfaces
- `docs/master/84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22.md` = repo, CI/CD, and governance
- `docs/master/86_AUDITORIA_V6_SEM_PIEDADE_2026-04-21.md` = accountability and execution-gap lens
- `docs/master/85_EXECUTION_STATUS_MAP_2026-04-22.md` = short execution scoreboard

## Executive Summary
- The older audits still describe the right macro story: design-system drift, workbench shell debt, preview and collaboration still needing end-to-end proof, tests and i18n still materially behind.
- Several literal numbers inside older audits are now stale because the branch has moved: workbench monoliths are smaller, deploy-from-IDE is surfaced, inline AI is wired, and collaboration is visible in the canonical IDE.
- This file is the place where measured repository state wins over narrative summaries.

## Factual Snapshot Verified On 2026-04-24
- Git tracked files: `5512`
- Git tracked size: `60.97 MB`
- `cloud-web-app/web/app/**/page.tsx` in the current workspace: `81`
- `cloud-web-app/web/app/api/**/route.ts`: `320`
- `cloud-web-app/web/app/admin/**/page.tsx`: `46`
- `cloud-web-app/web/components/**/*.tsx` in the current workspace: `325`
- `cloud-web-app/web/lib/**/*.ts` in the current workspace: `347`
- `docs/master/*` direct files: `107`
- `docs/master/**/*` recursive files: `131`
- Curated tracked executable test/spec files: `49`
- `cloud-web-app/web/tsconfig.json`: `"strict": true`, `"noImplicitAny": false`
- Git-grep line counts in the current workspace:
  - `: any`: `1056`
  - raw hex in component TS/TSX: `810`
  - `console.*` in `lib`: `269`
  - `console.*` in `components`: `92`
- Current hotspot line counts:
  - `cloud-web-app/web/components/ide/FullscreenIDE.tsx`: `379`
  - `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`: `313`
  - `cloud-web-app/web/components/preview/usePreviewRuntime.ts`: `107`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`: `99`
  - `cloud-web-app/web/components/preview/RuntimePreviewSurface.tsx`: `198`
  - `cloud-web-app/web/components/preview/SceneViewportWorkflowDrawer.tsx`: `163`
  - `cloud-web-app/web/components/terminal/useTerminalSessions.ts`: `120`
  - `cloud-web-app/web/components/preview/PreviewLifecycleChrome.tsx`: `151`
  - `cloud-web-app/web/components/terminal/useTerminalRuntime.ts`: `150`
  - `cloud-web-app/web/components/preview/useSceneViewportSurfaceState.ts`: `149`
  - `cloud-web-app/web/components/terminal/useTerminalTransport.ts`: `145`
  - `cloud-web-app/web/components/ide/fullscreen/useFullscreenIDEBridgeSections.ts`: `141`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx`: `134`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorCanvas.tsx`: `96`
  - `cloud-web-app/web/components/ide/fullscreen/useFullscreenIDEBridgeProps.types.ts`: `117`
  - `cloud-web-app/web/components/preview/SceneViewportStage.tsx`: `117`
  - `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`: `123`
  - `cloud-web-app/web/components/ide/modern-shell/chromeResizeHandle.tsx`: `106`
  - `cloud-web-app/web/components/preview/SceneViewportSurface.tsx`: `98`
  - `cloud-web-app/web/components/terminal/BaseXTerminal.tsx`: `105`
  - `cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.tsx`: `89`
  - `cloud-web-app/web/components/preview/sceneViewportDerivations.ts`: `89`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx`: `79`
  - `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`: `89`
  - `cloud-web-app/web/components/ide/modern-shell/sideColumnChromeParts.tsx`: `69`
  - `cloud-web-app/web/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.types.ts`: `67`
  - `cloud-web-app/web/components/ide/modern-shell/chromeHeader.tsx`: `67`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewModeHeader.tsx`: `63`
  - `cloud-web-app/web/components/terminal/MultiTerminalPanel.tsx`: `70`
  - `cloud-web-app/web/components/terminal/terminalSessionApi.ts`: `71`
  - `cloud-web-app/web/components/ai-chat/AIChatHistoryModeRail.tsx`: `57`
  - `cloud-web-app/web/components/terminal/useTerminalSelection.ts`: `57`
  - `cloud-web-app/web/components/ide/fullscreen/workbenchPreviewPaneModels.ts`: `56`
  - `cloud-web-app/web/components/ai-chat/AIChatComposer.tsx`: `282`
  - `cloud-web-app/web/components/ai-chat/useAIChatComposerState.ts`: `220`
  - `cloud-web-app/web/components/ai-chat/useAIChatHistoryMode.ts`: `107`
  - `cloud-web-app/web/components/ai-chat/AIChatContextStrip.tsx`: `78`
  - `cloud-web-app/web/components/ai-chat/AIChatBenchmarkTelemetry.tsx`: `57`
  - `cloud-web-app/web/components/ai-chat/AIChatTimeline.tsx`: `90`
  - `cloud-web-app/web/components/terminal/useTerminalViewport.ts`: `52`
  - `cloud-web-app/web/components/terminal/terminalSessionConnection.ts`: `61`
  - `cloud-web-app/web/components/terminal/useTerminalShortcuts.ts`: `45`
  - `cloud-web-app/web/components/ide/fullscreen/useFullscreenIDEBridgeProps.ts`: `19`
  - `cloud-web-app/web/components/preview/CanvasViewportSurface.tsx`: `24`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx`: `44`
  - `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellChrome.tsx`: `29`
  - `cloud-web-app/web/components/ai-chat/useAIChatPanelUiState.ts`: `33`
  - `cloud-web-app/web/components/terminal/XTerminal.tsx`: `12`
  - `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellSideColumns.tsx`: `8`
  - `cloud-web-app/web/components/ide/modern-shell/chromeSecondaryBars.tsx`: `8`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSidecar.tsx`: `85`

## Capability Truth Labels
### PARTIAL
- Onboarding funnel:
  - the flow is real across register -> dashboard -> wizard and is instrumented for first-value,
  - but onboarding state is still not durable enough to call fully solved.
- Canonical inline AI editing:
  - `Cmd/Ctrl+K` wiring, validate/apply/rollback, and project-aware context exist,
  - but runtime/provider readiness still gates the full experience.
- Deploy from IDE:
  - the canonical workbench header now surfaces a deploy action and a deploy status page,
  - but the capability remains environment/readiness gated.
- Preview runtime orchestration:
  - discovery, provision, sync, health, toolbar controls, denser mode switching, and a stronger preview empty-state are real,
  - the local preview lane now reads more like a primary validation surface and less like a loose debug panel,
  - but managed-runtime readiness and shareable proof are still not consistently proven end to end.
- Chat operator UX:
  - ask/plan/execute/review/live now drive mode-specific composer copy, quick prompts, quick mentions, contextual empty-state guidance, and a compact context strip,
  - non-ask sends are now biased with explicit plan/execute/review/live framing before the shared controller path,
  - but execution remains shared underneath, so mode-specific backend behavior should still be treated as partial.

### COMPLETE BASELINE
- Live collaboration baseline:
  - presence, collaborator avatars, denser workbench collaboration strips, project-scoped rooms, and remote cursors are wired in the canonical IDE.
  - Treat reliability promotion, reconnect confidence, shared-text proof, and file-tree presence as still open.
- Enterprise, billing, and operator truth surfaces:
  - billing readiness, operator readiness, and anti-fake-success truth UX are already user-facing and should be audited as shipped.

## Claims That Still Match Reality
- The Aethel thesis is coherent: one studio, one workbench, one AI operational layer, one preview lane, one project model.
- Admin is still too large at `46` pages.
- Tests are still too small for the platform surface.
- i18n is still too shallow for a global-first product.
- Storybook is working and useful, but still early in story breadth.
- The default PR browser lane now exists and is useful, but it is not the full Playwright matrix.
- The anti-fake-success policy is real and backed by scripts and runtime-truth surfaces.

## Claims That Need Downgrade Or Correction
- Do not use older repo-size claims like `503 MB` or similar tracked-source numbers from older snapshots. The current tracked repo is `60.97 MB`.
- Do not describe collaboration as absent. Baseline IDE collaboration is shipped; reliability and wider proof are the unfinished part.
- Do not describe deploy as backend-only anymore. The IDE now surfaces deploy and deploy-status UX, but the capability is still readiness gated.
- Do not describe inline AI editing as a dark feature with no trigger. It is now wired, but still partial because runtime/provider readiness can block it.
- Do not describe Storybook as seeded-but-broken. It is working, but not broad enough to count as full design-system coverage.
- Do not describe `AIChatPanelContainer.tsx` as a remaining god component. It is now a thin orchestrator after extracting session context, provider preflight, send pipeline, and session banner modules.
- Do not describe `WorkbenchEditorPane.tsx` as a remaining workbench monolith. It is now a thin coordinator backed by `WorkbenchEditorSurface.tsx`, `WorkbenchEditorCanvas.tsx`, `WorkbenchEditorToolbar.tsx`, and `WorkbenchEditorSidecar.tsx`.
- Do not describe `CanonicalPreviewSurface.tsx` as the remaining preview hotspot anymore. It is now a thin variant router over `RuntimePreviewSurface.tsx`, `SceneViewportSurface.tsx`, `CanvasViewportSurface.tsx`, `PreviewLifecycleChrome.tsx`, `usePreviewRuntime.ts`, and `sceneViewportDerivations.ts`.
- Do not describe `SceneViewportSurface.tsx` as a three-hundred-line preview monolith anymore. It now sits at `98` lines and delegates stage/state/playback density into `SceneViewportStage.tsx`, `useSceneViewportSurfaceState.ts`, and `useSceneViewportPlayback.ts`.
- Do not describe `WorkbenchPreviewPane.tsx` as the remaining preview cockpit hotspot. It is now a `44`-line orchestrator backed by `WorkbenchPreviewRuntimeControls.tsx`, `WorkbenchPreviewRuntimeSurface.tsx`, `WorkbenchPreviewModeHeader.tsx`, and `workbenchPreviewPaneModels.ts`.
- Do not describe `XTerminal.tsx` as the remaining terminal hotspot. It is now a thin barrel, `BaseXTerminal.tsx` is now only a `105`-line shell, and the runtime density now lives in `useTerminalRuntime.ts`, `useTerminalTransport.ts`, `useTerminalSessions.ts`, `terminalSessionApi.ts`, `terminalSessionConnection.ts`, `useTerminalSelection.ts`, `useTerminalShortcuts.ts`, `useTerminalViewport.ts`, `useTerminalOptions.ts`, and `useTerminalImperativeHandle.ts`.
- Do not describe `ModernIDEShellChrome.tsx` or `ModernIDEShellSideColumns.tsx` as shell hotspots anymore. They are now thin barrels over dedicated chrome and side-column parts.
- Do not describe `AIChatPanelPro.tsx` as a five-hundred-line emergency monolith anymore. It now sits just above `300` lines and delegates composer, timeline, history-mode, run-state, ops-state, context actions, speech playback, mode presets, and quick-prompt chrome into dedicated `components/ai-chat/*` modules.
- Do not describe the chat shell as a generic prompt box anymore. The composer, empty state, benchmark strip, timeline, and context summary now change by ask/plan/execute/review/live mode, but the shared controller path means backend behavior is still only PARTIAL by mode.
- Do not describe `FullscreenIDEWorkspaceBridge.tsx` as the remaining route-shell hotspot. It is now a `89`-line orchestrator backed by `FullscreenIDEWorkspaceBridge.types.ts` and `useFullscreenIDEBridgeProps.ts`.
- Do not describe `useFullscreenIDEBridgeProps.ts` as the remaining dense bridge seam anymore. It is now a `19`-line orchestrator over `useFullscreenIDEBridgeProps.types.ts` and `useFullscreenIDEBridgeSections.ts`.
- Do not describe `FullscreenIDE.tsx` as the only remaining workbench hotspot. It now shares orchestration density with `useFullscreenIDEBridgeSections.ts`, so follow-up slicing needs to treat the shell and the bridge sections separately.

## Production Build Parity Status
- `next build` is still OPEN.
- The latest canonical evidence now spans `cloud-web-app/web/build-probe-2026-04-24-public-auth-browser-isolation.log`, `cloud-web-app/web/build-probe-2026-04-24-admin-billing-light-runtime.log`, and `cloud-web-app/web/build-probe-2026-04-24-studio-route-layout-browser-shells.log`, with the older `build-probe-*.log` files retained as historical context.
- Additional mitigations landed on `2026-04-23`:
  - `cloud-web-app/web/next.config.js` now forces `experimental.workerThreads=false`
  - `cloud-web-app/web/package.json` now forces `NODE_ENV=production` for `build` and `build:analyze`, and the canonical env templates (`.env.example`, `.env.local.example`, `.env.web.example`) no longer pin `NODE_ENV=development`
  - `cloud-web-app/web/components/ClientLayout.tsx` remains a `17`-line CSS custom-property bootstrap, `cloud-web-app/web/components/providers/CoreUiProviders.tsx` owns `ThemeProvider` and `ToastProvider`, `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx` now supports `full` and `light` route surfaces, and `cloud-web-app/web/components/providers/StudioRuntimeRouteLayout.tsx` now provides browser-only route shells for studio surfaces that still need the richer runtime
  - `app/admin/layout.tsx` and `app/billing/layout.tsx` are now `force-dynamic` server shells that browser-load `admin-ops-layout-client.tsx` and `billing-runtime-layout.tsx` under `ssr: false` with the lighter runtime surface, while `app/dashboard/layout.tsx`, `app/ide/layout.tsx`, `app/settings/layout.tsx`, `app/profile/layout.tsx`, `app/project-settings/layout.tsx`, `app/nexus/layout.tsx`, and `app/marketplace/layout.tsx` now route through `StudioRuntimeRouteLayout.tsx`
  - `app/(auth)/layout.tsx`, `app/verify-email/layout.tsx`, and `app/design-system-demo/layout.tsx` are pass-through shells, while `/verify-email`, `/reset-password`, `/forgot-password`, `/design-system-demo`, `/billing/checkout`, and `/billing/success` now load browser-only route content under `force-dynamic` + `ssr: false` wrappers
  - `cloud-web-app/web/lib/providers/AethelProvider.tsx` now gates SWR keys to the browser so the global app provider does not try to resolve relative API keys during server work
  - Drei `Html` usage is now explicitly aliased to `DreiHtml` across the active 3D/editor surfaces, which reduces render-stack ambiguity around the historical `<Html>` prerender error class
- Current reruns still do not justify closure:
  - repeated local `next build` probes still failed to finish within extended `15`, `20`, and `15+` minute timeouts
  - the latest reruns still reproduce explicit export failures across `/404`, `/500`, `/_not-found`, docs, public, and selected studio surfaces; the newer runtime probes removed `/admin`, `/admin/*`, `/billing`, `/billing/cancel`, `/billing/invoices`, `/billing/checkout`, and `/billing/success` from the final export list, but `/dashboard`, `/ide`, `/marketplace`, `/nexus`, `/profile`, `/project-settings`, and `/settings` still remained after the broader route-shell browser isolation pass
  - the newer runtime/provider experiments improved shell clarity but still did not justify closure because the failure class remained anchored in Next internal App Router code rather than moving to a clean success state
- The active failure classes are:
  - `Error: <Html> should not be imported outside of pages/_document.` while prerendering `/404` and `/500`
  - `TypeError: Cannot read properties of null (reading 'useContext')` while prerendering public, docs, `/_not-found`, and the remaining studio/profile/settings/project surfaces that still fail export
- Multiple probes already ruled out simple userland explanations:
  - bare `app/layout.tsx`
  - removing `app/error.tsx`
  - removing `app/not-found.tsx`
  - adding temporary `pages/_app.tsx`, `pages/_document.tsx`, `pages/_error.tsx`, `pages/404.tsx`, and `pages/500.tsx`
- Therefore the current truthful read is:
  - App Router hook leakage was mitigated in shared shell code,
  - the heavy studio runtime is no longer global: `cloud-web-app/web/components/ClientLayout.tsx` now only boots CSS custom properties, `cloud-web-app/web/components/providers/CoreUiProviders.tsx` owns theme/toast context, and `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx` mounts the richer product runtime per route,
  - browser-only SWR keys reduced SSR/provider fetch risk inside `cloud-web-app/web/lib/providers/AethelProvider.tsx`,
  - Drei `Html` aliasing reduced naming ambiguity across the active 3D/editor stack,
  - worker-thread concurrency was reduced for Windows build determinism,
  - admin and billing now run through browser-only light-runtime shells, while dashboard/ide/settings/profile/project-settings/nexus/marketplace now route through browser-only studio shells and auth/public-edge routes keep the pass-through plus browser-only content pattern,
  - but the current `useContext` null now maps most strongly to Next internal `usePathname()` usage inside the App Router error-boundary chunk (`.next/server/chunks/66406.js`), so userland provider nulls are no longer the only plausible explanation,
  - but full production build parity is still blocked and should not be marked solved.
- Current highest-value suspects to isolate next:
  - tested but not sufficient to clear the blocker:
    - `cloud-web-app/web/components/ClientLayout.tsx`
    - `cloud-web-app/web/contexts/ThemeContext.tsx`
    - `cloud-web-app/web/components/ui/toast-system.tsx`
    - `cloud-web-app/web/pages/_document.tsx`
  - highest-confidence studio/runtime cluster now under watch:
    - `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx`
    - `cloud-web-app/web/components/providers/StudioRuntimeRouteLayout.tsx`
    - `cloud-web-app/web/lib/a11y/accessibility.tsx`
    - `cloud-web-app/web/components/ServiceWorkerProvider.tsx`
    - `cloud-web-app/web/contexts/AuthContext.tsx`
    - `cloud-web-app/web/lib/providers/AethelProvider.tsx`
  - separate public/auth cluster still under watch:
    - `cloud-web-app/web/components/ui/PublicHeader.tsx`
    - `cloud-web-app/web/components/ui/PublicFooter.tsx`
    - `cloud-web-app/web/lib/navigation/use-browser-pathname.ts`
    - `cloud-web-app/web/pages/404.tsx`
    - `cloud-web-app/web/pages/500.tsx`
    - `cloud-web-app/web/pages/_error.tsx`

## Priority Order (Validated)
1. Close production build parity without regressing the current browser merge-pressure lane.
2. Continue slicing the remaining workbench/runtime seams:
  - `cloud-web-app/web/components/ide/FullscreenIDE.tsx`
  - `cloud-web-app/web/components/ide/fullscreen/useFullscreenIDEBridgeSections.ts`
  - `cloud-web-app/web/components/preview/usePreviewRuntime.ts`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`
  - `cloud-web-app/web/components/preview/RuntimePreviewSurface.tsx`
   - `cloud-web-app/web/components/terminal/useTerminalSessions.ts`
   - `cloud-web-app/web/components/terminal/useTerminalRuntime.ts`
   - stabilize `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`
   - keep evolving the preview cockpit through `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewRuntimeControls.tsx`, `cloud-web-app/web/components/preview/SceneViewportWorkflowDrawer.tsx`, and `cloud-web-app/web/components/preview/useSceneViewportSurfaceState.ts`
3. Turn preview + deploy into a trustworthy shareable workflow.
4. Promote collaboration from baseline presence/cursors to full shared-editing confidence and file-tree presence.
5. Keep moving `console.*` to structured logging.
6. Push toward `noImplicitAny: true` and shrink the `: any` inventory.
7. Finish design-system convergence and remove broad raw-hex drift.
8. Expand tests and coverage pressure.
9. Reduce admin sprawl.
10. Upgrade i18n from proof-of-concept to product-grade.

## Working Rule
If a future audit conflicts with this file:
- prefer measured repository state
- prefer current QA output
- prefer active canonical docs over narrative summaries
