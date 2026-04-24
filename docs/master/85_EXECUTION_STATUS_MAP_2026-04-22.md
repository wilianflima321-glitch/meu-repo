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
- `FullscreenIDE.tsx`: `359` lines
- `AIChatPanelPro.tsx`: `262` lines
- `useFullscreenIDEBridgeProps.ts`: `227` lines
- `WorkbenchPreviewPane.tsx`: `39` lines
- `SceneViewportSurface.tsx`: `219` lines
- `WorkbenchEditorSurface.tsx`: `197` lines
- `useTerminalRuntime.ts`: `188` lines
- `PreviewLifecycleChrome.tsx`: `146` lines
- `usePreviewRuntime.ts`: `191` lines
- `RuntimePreviewSurface.tsx`: `186` lines
- `SceneViewportWorkflowDrawer.tsx`: `151` lines
- `WorkbenchPreviewRuntimeControls.tsx`: `128` lines
- `useTerminalTransport.ts`: `121` lines
- `chromeResizeHandle.tsx`: `106` lines
- `sceneViewportDerivations.ts`: `89` lines
- `WorkbenchEditorPane.tsx`: `193` lines
- `WorkbenchEditorToolbar.tsx`: `191` lines
- `WorkbenchEditorCanvas.tsx`: `122` lines
- `WorkbenchEditorSidecar.tsx`: `85` lines
- `AIChatPanelContainer.tsx`: `116` lines
- `ModernIDEShell.tsx`: `149` lines
- `ModernIDEShellPanels.tsx`: `114` lines
- `ModernIDEShellCenterStack.tsx`: `109` lines
- `FullscreenIDEWorkspaceBridge.tsx`: `89` lines
- `FullscreenIDEWorkspaceBridge.types.ts`: `67` lines
- `WorkbenchPreviewModeHeader.tsx`: `63` lines
- `useViewportExport.ts`: `106` lines
- `BaseXTerminal.tsx`: `99` lines
- `ModernIDEShellChrome.tsx`: `29` lines
- `chromeSecondaryBars.tsx`: `8` lines
- `CanonicalPreviewSurface.tsx`: `74` lines (router)
- `XTerminal.tsx`: `11` lines (barrel)
- `MultiTerminalPanel.tsx`: `70` lines
- `useTerminalSessions.ts`: `134` lines
- default PR browser pressure exists through `playwright.merge.config.ts`
- last documented local Chromium replay for the merge-pressure suite: `5 passed`
- production build parity is still open because:
  - `cloud-web-app/web/build-probe-2026-04-23-studio-runtime-split-v3.log` is still the latest fully actionable explicit-failure log and points to prerender failures
  - the newer `cloud-web-app/web/build-probe-2026-04-23-root-boundary-bisect.log` moved the root boundary further toward a pass-through shell and did not reprint those explicit `<Html>`/`useContext` traces before timing out, but it still never completed successfully

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
  - `SceneViewportSurface.tsx` is now a smaller viewport seam at `219` lines, with workflow/export density pushed into `SceneViewportWorkflowDrawer.tsx` and `useViewportExport.ts`
  - `WorkbenchPreviewPane.tsx` is now a thin orchestrator, with trust/share/status density moved into `WorkbenchPreviewRuntimeControls.tsx`, `WorkbenchPreviewRuntimeSurface.tsx`, and `WorkbenchPreviewModeHeader.tsx`
- but the category is still partial until full shareable proof and build-complete runtime confidence are stable.

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
   - primary next isolates now look most likely in root-global providers: `components/ClientLayout.tsx`, `contexts/ThemeContext.tsx`, and `components/ui/toast-system.tsx`
   - secondary or already-bisected suspects remain: `app/layout.tsx`, `components/providers/StudioRuntimeProviders.tsx`, `lib/a11y/accessibility.tsx`, `app/error.tsx`, and `app/not-found.tsx`
2. remaining workbench, preview, and terminal implementation hotspot reduction led by `FullscreenIDE.tsx`, `useFullscreenIDEBridgeProps.ts`, `SceneViewportSurface.tsx`, and `useTerminalRuntime.ts`
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
2. keep slicing `FullscreenIDE.tsx`, `useFullscreenIDEBridgeProps.ts`, `SceneViewportSurface.tsx`, and `useTerminalRuntime.ts`, while stabilizing the new `AIChatPanelPro.tsx` seams and evolving the thinner preview cockpit modules
3. harden preview + deploy into a reliable shareable loop
4. promote collaboration from baseline UX into proven shared-editing confidence
5. continue `console.* -> logger`
6. continue `: any` reduction and move toward `noImplicitAny: true`
7. deepen tests, coverage, admin consolidation, and i18n

## One-Line Truth
The work now is not discovering what to do.
The work is executing the already-known sequence without drift.
