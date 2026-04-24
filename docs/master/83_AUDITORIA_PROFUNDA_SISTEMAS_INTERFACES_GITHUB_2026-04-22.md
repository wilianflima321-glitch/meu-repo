# 83_AUDITORIA_PROFUNDA_SISTEMAS_INTERFACES_GITHUB_2026-04-22
Date: 2026-04-22
Status: ACTIVE (PRIMARY COMPLEMENTARY AUDIT)
Source: imported from `docs/master/assets/auditoria-sistemas-interfaces-github-2026-04-22/auditoria-profunda-sistemas-interfaces-github-2026-04-22.pdf`
Synced branch baseline: `origin/genspark_ai_developer@5760df694`

## Role in the Canonical Set
This document is now one of the primary audit references for Aethel, but it does **not** replace the others.
Use the set together:

1. `docs/master/82_AUDITORIA_V5_AETHEL_ENGINE_DEEP_2026-04-19.md`
   Strategic direction, market benchmark, and quality bar.
2. `docs/master/83_AUDITORIA_PROFUNDA_SISTEMAS_INTERFACES_GITHUB_2026-04-22.md`
   Systems + interfaces deep-dive imported from the PDF audit, reconciled against the current GitHub branch.
3. `docs/master/84_AUDITORIA_PROFUNDA_REPOSITORIO_PLANO_DE_ACAO_2026-04-22.md`
   Repository, CI/CD, root hygiene, and execution-plan complementary audit.
4. `docs/master/81_VALIDATED_PRIORITY_BACKLOG_2026-04-20.md`
   Anti-fake-success factual guardrail for counts, claims, and repo reality.

## Why This Document Exists
The external PDF audit brought two things that are worth preserving in the canonical set:

- a sharper systems-and-interfaces lens, especially around shell quality, route maturity, and UX trust;
- a strong set of visual references embedded in the original PDF.

That said, the PDF also contains claims that were already partially outdated once the latest GitHub improvements landed. This file preserves the value of the audit **without** turning older numbers into fake truth.

## Current Reconciliation State
The local workspace is already synced with the latest upstream changes from `genspark_ai_developer`, including:

- `15c0139ab` `chore(cleanup): remove 24k lines of dead engine libs, fix .aethelrules paths, re-enable next/image`
- `3edf1eb37` `feat(ux): ship ThemeToggle in header + Storybook coverage + tests`
- `5760df694` `feat(round-81): slice god components, seed migrations, wire lighthouse + coverage`

Additional local reconciliation on `2026-04-24`:
- the preview lane is denser and clearer for end users through `cloud-web-app/web/components/ide/PreviewRuntimeToolbar.tsx` and `cloud-web-app/web/components/ide/fullscreen/WorkbenchPreviewPane.tsx`
- the workbench route shell is no longer concentrated in one file: `cloud-web-app/web/components/ide/FullscreenIDE.tsx` is now `379` lines, while route/workspace orchestration was pushed out of `FullscreenIDEWorkspaceBridge.tsx` and now lives mainly in `useFullscreenIDEBridgeSections.ts` (`141`) plus `useFullscreenIDEBridgeProps.types.ts` (`117`), with `useFullscreenIDEBridgeProps.ts` now only `19` lines
- the workbench editor lane is no longer concentrated in one file: `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx` is now `193` lines and delegates the dense editor experience to `WorkbenchEditorSurface.tsx` (`197`), `WorkbenchEditorCanvas.tsx` (`122`), `WorkbenchEditorToolbar.tsx` (`191`), and `WorkbenchEditorSidecar.tsx` (`85`)
- the shell-panel lane is no longer a four-file tangle: `cloud-web-app/web/components/ide/modern-shell/ModernIDEShellPanels.tsx` is now `114` lines after extraction into `ModernIDEShellCenterStack.tsx` (`109`), while `ModernIDEShellChrome.tsx` and `ModernIDEShellSideColumns.tsx` are now thin barrels over dedicated chrome/side-column parts
- the preview authority is no longer concentrated in one four-digit file: `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx` is now a `74`-line variant router, and `SceneViewportSurface.tsx` is down to `98` after extracting `SceneViewportStage.tsx` (`117`), `useSceneViewportSurfaceState.ts` (`149`), and `useSceneViewportPlayback.ts` (`53`)
- terminal density no longer lives in `XTerminal.tsx` or even `BaseXTerminal.tsx`; the barrel remains `11` lines, the shell is now `99`, and the runtime density sits in `cloud-web-app/web/components/terminal/useTerminalRuntime.ts` (`150`) plus extracted transport/sessions/selection/shortcuts/viewport/options/imperative-handle hooks, with session API/connection seams now split into `terminalSessionApi.ts` (`71`) and `terminalSessionConnection.ts` (`61`)
- build-risk mitigations now also include browser-gated SWR keys in `cloud-web-app/web/lib/providers/AethelProvider.tsx`, explicit Drei `Html` aliases across active 3D/editor surfaces, and a root/studio runtime split where `cloud-web-app/web/components/ClientLayout.tsx` is only a `17`-line bootstrap, `cloud-web-app/web/components/providers/CoreUiProviders.tsx` owns theme/toast, `cloud-web-app/web/app/(auth)/layout.tsx` mounts core UI for login/register, and `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx` mounts richer product runtime per route including admin
- production `next build` parity is still open because the latest command-line probes still fail after the core UI split and the admin/auth provider follow-up; the newest explicit evidence now includes `cloud-web-app/web/build-probe-2026-04-24-root-refresh.log`, `cloud-web-app/web/build-probe-2026-04-24-core-ui-split.log`, and `cloud-web-app/web/build-probe-2026-04-24-admin-auth-runtime.log`
- the current best reading of the `useContext` crash is no longer “missing app provider” alone; the active failure still maps to Next internal `usePathname()` / App Router error-boundary code in `.next/server/chunks/66406.js`

## What From the PDF Still Holds Strongly
These points still align with the repo and remain strategic priorities:

- design-system drift is still real, even after ThemeToggle and Storybook progress;
- the workbench remains the core product and still needs deeper shell convergence;
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\FullscreenIDE.tsx` is still too large for a cockpit-grade shell;
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\AIChatPanelPro.tsx` was reduced below `300` lines, so the next work is stabilization and interaction polish rather than emergency decomposition;
- preview and collaboration still lag behind the benchmark set by Cursor, Replit, Windsurf, and Unreal-style workflows;
- admin surface area is still larger than ideal and should continue converging toward fewer canonical areas;
- documentation is a strength, but only when paired with explicit hierarchy and factual reconciliation.

## What Changed Since the PDF Snapshot
The following PDF claims should no longer be treated as current truth without reconciliation:

### Repo scale
- PDF snapshot: `23.653 files · 503 MB`
- Current tracked repo reality: `5512 tracked files / 60.97 MB` in the validated local workspace snapshot
- Meaning: the imported PDF is valuable directionally, but not as a raw numeric snapshot of the current repo.

### Dead engine libs
- PDF framed a large set of dead engine libraries as still present.
- Current branch already removed a major dead-code island, including files like:
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lib\behavior-tree.ts`
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lib\world-partition.ts`
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lib\skeletal-animation.ts`
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lib\collaboration-realtime.ts`

### Next/Image and performance baseline
- PDF flagged `images.unoptimized: true` as a critical performance bug.
- Current branch already re-enabled modern image behavior in:
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\next.config.js`
- That specific blocker is no longer an active current-state claim.

### `.aethelrules`
- PDF criticized absolute-path usage in `.aethelrules`.
- Current branch already fixed this in:
  - `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\.aethelrules`

### Testing and quality pressure
- PDF described the test story as critically weak.
- That concern still exists directionally, but current reality improved:
  - tracked test files are now `49`
  - `collectCoverage` is now wired in CI-sensitive form in `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\jest.config.ts`
  - Lighthouse configuration now exists in `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\lighthouserc.js`
  - Prisma migrations are now seeded at `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\prisma\migrations\`

### Admin page count
- PDF cites `47` admin pages.
- Current tracked repo count is `46` admin `page.tsx` routes.
- Still too high, but not the same number.

## Current Factual Anchors After Sync
These are the reality points this audit should now be interpreted against:

- `FullscreenIDE.tsx`: about `379` lines and still a top-priority cockpit orchestrator
- `useFullscreenIDEBridgeSections.ts`: about `141` lines and now the densest route/workspace bridge seam backing the fullscreen shell
- `AIChatPanelPro.tsx`: about `273` lines, now backed by extracted composer, run-state, ops-state, context-action, speech-playback, quick-prompt, history-rail, benchmark-telemetry, and panel-ui-state modules
- `WorkbenchEditorPane.tsx`: about `193` lines after extraction into `WorkbenchEditorSurface.tsx`, `WorkbenchEditorCanvas.tsx`, `WorkbenchEditorToolbar.tsx`, and `WorkbenchEditorSidecar.tsx`
- `WorkbenchEditorSurface.tsx`: about `197` lines and now much closer to a stable surface/orchestrator seam
- `WorkbenchPreviewPane.tsx`: about `39` lines and now a thin preview orchestrator over `WorkbenchPreviewRuntimeControls.tsx`, `WorkbenchPreviewRuntimeSurface.tsx`, `WorkbenchPreviewModeHeader.tsx`, and `workbenchPreviewPaneModels.ts`
- `SceneViewportSurface.tsx`: about `98` lines and no longer a three-hundred-line hotspot after stage/state/playback extraction into `SceneViewportStage.tsx`, `useSceneViewportSurfaceState.ts`, and `useSceneViewportPlayback.ts`
- `CanonicalPreviewSurface.tsx`: about `74` lines as the thin variant router over preview runtime and viewport seams
- `RuntimePreviewSurface.tsx`: about `198` lines and now the clearest place to keep improving preview trust, fallback, and Magic Wand UX without re-growing the canonical preview shell
- `AIChatPanelContainer.tsx`: about `116` lines after extraction into session-context, provider-preflight, send-pipeline, and session-banner modules
- `ModernIDEShell.tsx`: now only `149` lines, with shell structure split into `ModernIDEShellPanels.tsx` (`114`), `ModernIDEShellCenterStack.tsx` (`109`), and thin chrome/side-column barrels backed by `chromeHeader.tsx`, `chromeResizeHandle.tsx`, `chromeBottomDock.tsx`, `chromeStatusBar.tsx`, and `sideColumnChromeParts.tsx`
- `XTerminal.tsx`: now an `11`-line barrel; terminal density should be read in `useTerminalRuntime.ts` (`150`), `useTerminalTransport.ts` (`145`), `useTerminalSessions.ts` (`120`), `terminalSessionApi.ts` (`71`), `terminalSessionConnection.ts` (`61`), `useTerminalSelection.ts` (`64`), `useTerminalShortcuts.ts` (`51`), `useTerminalViewport.ts` (`66`), `useTerminalOptions.ts` (`58`), `useTerminalImperativeHandle.ts` (`51`), `BaseXTerminal.tsx` (`99`), and `MultiTerminalPanel.tsx` (`70`)
- volatile test, console, `: any`, and raw-hex inventories should defer to `docs/master/81_VALIDATED_PRIORITY_BACKLOG_2026-04-20.md` instead of this imported audit
- admin pages: see `81` for the current measured count
- API routes: see `81` for the current measured count

If these numbers change, `81_VALIDATED_PRIORITY_BACKLOG_2026-04-20.md` should be refreshed again instead of silently mutating the meaning of this imported audit.

## How to Use This Audit Operationally
Use this audit for:

- product and interface critique;
- benchmark framing against Cursor, Linear, Replit, Windsurf, Unreal, and Vercel;
- identifying where the product still feels aspirational instead of inevitable;
- deciding what quality bar the user should feel on landing, auth, dashboard, workbench, preview, and admin.

Do **not** use this audit alone for:

- exact current-state counts;
- declaring blockers closed;
- claiming parity already achieved.

For those, always pair it with `81_VALIDATED_PRIORITY_BACKLOG_2026-04-20.md` and current code inspection.

## Priority Direction Confirmed by This Audit Set
Across `81`, `82`, and this imported systems/interfaces audit, the shared execution order remains:

1. Keep the design system converging toward one visual language.
2. Continue slicing the remaining workbench/runtime seams (`FullscreenIDE`, `useFullscreenIDEBridgeSections`, `usePreviewRuntime`, `RuntimePreviewSurface`, `useTerminalRuntime`, and then stabilize `AIChatPanelPro` while evolving the thinner preview cockpit modules).
3. Turn collaboration from infrastructure into visible product UX.
4. Turn preview into a trust-building, shareable creation surface.
5. Keep replacing runtime ambiguity with evidence, tests, and structured observability.

Current reconciliation note:
- collaboration is no longer only infra + header presence;
- remote cursor overlays are now wired into the Monaco editor flow through the workbench editor pane;
- the remaining gap is no longer "make collaboration visible at all", but "turn visible cursor presence into a fully trusted shared-editing path".
- the curated merge-pressure browser lane is also now validated locally end-to-end in a real browser run; what is still not proven is local production-build parity, which currently fails with separate prerender/runtime issues outside the browser-gate lane.

## Embedded Figures Imported From the PDF
These assets were extracted from the PDF so the audit remains portable inside the repository.

### Figure 1
![Figure 1](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-01-p1-2560x1627.jpeg)

### Figure 2
![Figure 2](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-02-p1-2560x1439.jpeg)

### Figure 3
![Figure 3](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-03-p1-2560x1537.png)

### Figure 4
![Figure 4](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-04-p1-2048x1023.png)

### Figure 5
![Figure 5](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-05-p1-2560x1603.png)

### Figure 6
![Figure 6](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-06-p1-2036x1488.png)

### Figure 7
![Figure 7](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-07-p1-2560x1541.jpeg)

### Figure 8
![Figure 8](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-08-p1-1400x912.png)

### Figure 9
![Figure 9](assets/auditoria-sistemas-interfaces-github-2026-04-22/image-09-p1-1282x626.jpeg)

## Source Preservation
Original imported source preserved at:

- `docs/master/assets/auditoria-sistemas-interfaces-github-2026-04-22/auditoria-profunda-sistemas-interfaces-github-2026-04-22.pdf`

This allows future reconciliation passes without losing the source artifact.
