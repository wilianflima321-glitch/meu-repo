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
  - `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`: `459`
  - `cloud-web-app/web/components/terminal/BaseXTerminal.tsx`: `441`
  - `cloud-web-app/web/components/ide/FullscreenIDE.tsx`: `437`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`: `326`
  - `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`: `274`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx`: `263`
  - `cloud-web-app/web/components/preview/RuntimePreviewSurface.tsx`: `186`
  - `cloud-web-app/web/components/preview/PreviewLifecycleChrome.tsx`: `146`
  - `cloud-web-app/web/components/preview/usePreviewRuntime.ts`: `191`
  - `cloud-web-app/web/components/preview/sceneViewportDerivations.ts`: `89`
  - `cloud-web-app/web/components/terminal/XTerminal.tsx`: `13`
  - `cloud-web-app/web/components/terminal/MultiTerminalPanel.tsx`: `82`
  - `cloud-web-app/web/components/ide/AIChatPanelContainer.tsx`: `116`
  - `cloud-web-app/web/components/ide/ModernIDEShell.tsx`: `149`
  - `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellPanels.tsx`: `268`
  - `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellChrome.tsx`: `196`
  - `cloud-web-app/web/components/ide/modern-shell/chromeSecondaryBars.tsx`: `172`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx`: `193`
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorToolbar.tsx`: `191`
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
- Do not describe `WorkbenchEditorPane.tsx` as a remaining workbench monolith. It is now a thin coordinator backed by `WorkbenchEditorSurface.tsx`, `WorkbenchEditorToolbar.tsx`, and `WorkbenchEditorSidecar.tsx`.
- Do not describe `CanonicalPreviewSurface.tsx` as a four-digit preview monolith anymore. The runtime lane was extracted into `RuntimePreviewSurface.tsx`, `PreviewLifecycleChrome.tsx`, `usePreviewRuntime.ts`, and `sceneViewportDerivations.ts`, even though preview still remains a high-leverage product surface.
- Do not describe `XTerminal.tsx` as the remaining terminal hotspot. It is now a thin barrel over `BaseXTerminal.tsx` and `MultiTerminalPanel.tsx`, so terminal density should be tracked against those implementation seams instead.
- Do not describe `AIChatPanelPro.tsx` as a five-hundred-line emergency monolith anymore. It now sits below `300` lines and delegates composer, run-state, ops-state, context actions, speech playback, and quick-prompt chrome into dedicated `components/ai-chat/*` modules.

## Production Build Parity Status
- `next build` is still OPEN.
- The latest canonical evidence now spans `cloud-web-app/web/build-probe-2026-04-23-studio-runtime-split-v3.log` and `cloud-web-app/web/build-probe-2026-04-23-root-boundary-bisect.log`, with older `build-probe-*.log` files retained as historical context.
- Additional mitigations landed on `2026-04-23`:
  - `cloud-web-app/web/next.config.js` now forces `experimental.workerThreads=false`
  - `cloud-web-app/web/components/ClientLayout.tsx` now mounts only the lightweight root shell (`ThemeProvider`, `ToastProvider`, and CSS custom-property bootstrap), while `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx` owns route-scoped studio runtime for dashboard, IDE, billing, settings, profile, nexus, marketplace, and project-settings surfaces
  - `cloud-web-app/web/lib/providers/AethelProvider.tsx` now gates SWR keys to the browser so the global app provider does not try to resolve relative API keys during server work
  - Drei `Html` usage is now explicitly aliased to `DreiHtml` across the active 3D/editor surfaces, which reduces render-stack ambiguity around the historical `<Html>` prerender error class
- Current reruns still do not justify closure:
- repeated local `next build` probes still failed to finish within extended `15`, `20`, and `15+` minute timeouts
- `cloud-web-app/web/build-probe-2026-04-23-studio-runtime-split-v3.log` is still the latest fully actionable explicit failure log and reproduces prerender errors around `/404`, `/500`, `/_not-found`, `/login`, `/register`, multiple `/docs/*`, many `/admin/*`, and several public/studio/profile/settings surfaces
- the newer `cloud-web-app/web/build-probe-2026-04-23-root-boundary-bisect.log` moved the root shell closer to a pass-through boundary and stayed alive through compile plus type validation without reprinting those explicit `<Html>` / `useContext` traces before timing out, which is promising but still not enough to mark parity closed
- The active failure classes are:
  - `Error: <Html> should not be imported outside of pages/_document.` while prerendering `/404` and `/500`
- `TypeError: Cannot read properties of null (reading 'useContext')` while prerendering auth, public, docs, studio, profile/settings/project surfaces, and many `/admin/*` routes
- Multiple probes already ruled out simple userland explanations:
  - bare `app/layout.tsx`
  - removing `app/error.tsx`
  - removing `app/not-found.tsx`
  - adding temporary `pages/_document.tsx`, `pages/404.tsx`, and `pages/500.tsx`
- Therefore the current truthful read is:
  - App Router hook leakage was mitigated in shared shell code,
- the heavy studio runtime is no longer global: `cloud-web-app/web/components/ClientLayout.tsx` now keeps only the lightweight root shell, while `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx` mounts the richer product runtime per route,
  - browser-only SWR keys reduced SSR/provider fetch risk inside `cloud-web-app/web/lib/providers/AethelProvider.tsx`,
  - Drei `Html` aliasing reduced naming ambiguity across the active 3D/editor stack,
  - worker-thread concurrency was reduced for Windows build determinism,
  - but full production build parity is still blocked and should not be marked solved.
- Current highest-value suspects to isolate next:
  - `cloud-web-app/web/app/layout.tsx`
  - `cloud-web-app/web/components/ClientLayout.tsx`
  - `cloud-web-app/web/lib/a11y/accessibility.tsx`
  - `cloud-web-app/web/contexts/ThemeContext.tsx`
  - `cloud-web-app/web/components/ui/toast-system.tsx`

## Priority Order (Validated)
1. Close production build parity without regressing the current browser merge-pressure lane.
2. Continue slicing the remaining workbench and preview hotspots:
   - `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`
   - `cloud-web-app/web/components/terminal/BaseXTerminal.tsx`
   - `cloud-web-app/web/components/ide/FullscreenIDE.tsx`
   - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`
   - stabilize `cloud-web-app/web/components/ide/AIChatPanelPro.tsx` instead of treating it as an emergency monolith
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
