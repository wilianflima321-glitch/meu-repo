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
- the workbench editor lane is no longer concentrated in one file: `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx` is now `193` lines and delegates the dense editor experience to `WorkbenchEditorSurface.tsx` (`311`), `WorkbenchEditorToolbar.tsx` (`191`), and `WorkbenchEditorSidecar.tsx` (`85`)
- the preview authority is no longer concentrated in one four-digit file: `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx` is now `422` lines after extracting `RuntimePreviewSurface.tsx`, `PreviewLifecycleChrome.tsx`, `usePreviewRuntime.ts`, and `sceneViewportDerivations.ts`
- build-risk mitigations now also include browser-gated SWR keys in `cloud-web-app/web/lib/providers/AethelProvider.tsx`, explicit Drei `Html` aliases across active 3D/editor surfaces, and a root/studio runtime split where `cloud-web-app/web/components/ClientLayout.tsx` keeps only the lightweight root shell while `cloud-web-app/web/components/providers/StudioRuntimeProviders.tsx` mounts richer product runtime per route
- production `next build` parity is still open because the latest command-line probes still timed out before a successful end-to-end completion; the newest probe no longer reprinted the explicit old errors before timeout, but the latest fully actionable error evidence remains in `cloud-web-app/web/build-probe-2026-04-23-studio-runtime-split-v3.log`

## What From the PDF Still Holds Strongly
These points still align with the repo and remain strategic priorities:

- design-system drift is still real, even after ThemeToggle and Storybook progress;
- the workbench remains the core product and still needs deeper shell convergence;
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\FullscreenIDE.tsx` is still too large;
- `C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\cloud-web-app\web\components\ide\AIChatPanelPro.tsx` was reduced, but is still large enough to justify further decomposition;
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

- `AIChatPanelPro.tsx`: about `508` lines, not the older ~1766-line state
- `FullscreenIDE.tsx`: about `540` lines and still a top-priority god component
- `WorkbenchEditorPane.tsx`: about `193` lines after extraction into `WorkbenchEditorSurface.tsx`, `WorkbenchEditorToolbar.tsx`, and `WorkbenchEditorSidecar.tsx`
- `WorkbenchEditorSurface.tsx`: about `311` lines and now the denser editor-surface follow-up target for the workbench lane
- `CanonicalPreviewSurface.tsx`: about `422` lines after extraction into dedicated preview runtime and chrome modules
- `RuntimePreviewSurface.tsx`: about `186` lines and now the clearest place to keep improving preview trust, fallback, and Magic Wand UX without re-growing the canonical preview shell
- `AIChatPanelContainer.tsx`: about `116` lines after extraction into session-context, provider-preflight, send-pipeline, and session-banner modules
- `ModernIDEShell.tsx`: now only `149` lines, with shell structure split into `ModernIDEShellPanels.tsx` (`268`), `ModernIDEShellChrome.tsx` (`196`), and `chromeSecondaryBars.tsx` (`172`)
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
2. Continue slicing the remaining workbench and preview hotspots (`FullscreenIDE`, `AIChatPanelPro`, `XTerminal`, `CanonicalPreviewSurface`, `WorkbenchEditorSurface`).
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
