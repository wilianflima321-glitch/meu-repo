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
This round closed one of the previously documented editor hotspots and materially reduced the preview hotspot:
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorPane.tsx` moved from the old hotspot bucket into a thin coordinator at `193` lines
- the editor lane is now split into:
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx` (`311`)
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorToolbar.tsx` (`191`)
  - `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSidecar.tsx` (`85`)
- `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx` moved from `1016` lines to `422`
- the preview runtime lane is now split into:
  - `cloud-web-app/web/components/preview/RuntimePreviewSurface.tsx` (`186`)
  - `cloud-web-app/web/components/preview/PreviewLifecycleChrome.tsx` (`146`)
  - `cloud-web-app/web/components/preview/usePreviewRuntime.ts` (`191`)
  - `cloud-web-app/web/components/preview/sceneViewportDerivations.ts` (`89`)

This is real progress.
It does **not** mean the workbench is solved.
It means the next cuts are now safer and more localized.

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
- `cloud-web-app/web/components/ide/FullscreenIDE.tsx`: `540`
- `cloud-web-app/web/components/ide/AIChatPanelPro.tsx`: `508`
- `cloud-web-app/web/components/terminal/XTerminal.tsx`: `506`
- `cloud-web-app/web/components/preview/CanonicalPreviewSurface.tsx`: `422`
- `cloud-web-app/web/components/ide/fullscreen/WorkbenchEditorSurface.tsx`: `311`

### Wave B - dense product surfaces next in line
- `cloud-web-app/web/app/admin/ai-monitor/page.tsx`: `1249`
- `cloud-web-app/web/components/settings/SettingsUI.tsx`: `1184`
- `cloud-web-app/web/components/scene-editor/SceneEditor.tsx`: `1193`
- `cloud-web-app/web/components/engine/DetailsPanel.tsx`: `1173`
- `cloud-web-app/web/components/assets/ContentBrowser.tsx`: `1051`
- `cloud-web-app/web/components/marketplace/CreatorDashboard.tsx`: `1060`
- `cloud-web-app/web/components/settings/SettingsPage.tsx`: `1039`
- `cloud-web-app/web/components/dashboard/ProjectsDashboard.tsx`: `1006`

### Wave C - specialist editors and lower-priority breadth
- `cloud-web-app/web/components/audio/SoundCueEditor.tsx`: `1247`
- `cloud-web-app/web/components/engine/LevelEditor.tsx`: `1217`
- `cloud-web-app/web/components/terrain/TerrainSculptingEditor.tsx`: `1202`
- `cloud-web-app/web/components/narrative/QuestEditor.tsx`: `1196`
- `cloud-web-app/web/components/video/VideoTimelineEditor.tsx`: `1194`

## Best Next Slicing Seams
### 1. `CanonicalPreviewSurface.tsx`
Why still matters:
- it still carries the variant router for the entire preview trust story, which the audits repeatedly flag as a market gap
- the runtime lane is now smaller, so the next cuts can focus on viewport and scene responsibilities with less risk

Recommended seams:
- `components/preview/PreviewSurfaceHeader.tsx`
- `components/preview/PreviewSurfaceViewport.tsx`
- `components/preview/PreviewSurfaceStatePanel.tsx`
- `components/preview/PreviewSurfaceDeviceRail.tsx`
- `components/preview/usePreviewSurfaceState.ts`

User-facing quality target:
- preview should feel like a primary validation cockpit with clearer trust, device, share, deploy, and runtime health grammar

### 2. `FullscreenIDE.tsx`
Why next:
- it still owns too much orchestration across file state, preview, AI bridges, and mode transitions
- it remains a top workbench shell blocker in every audit cluster

Recommended seams:
- `components/ide/fullscreen/useWorkbenchFileSession.ts`
- `components/ide/fullscreen/useWorkbenchModeRouting.ts`
- `components/ide/fullscreen/WorkbenchMainGrid.tsx`
- `components/ide/fullscreen/WorkbenchActivityStatus.tsx`

User-facing quality target:
- the workbench should read more like a cockpit and less like one component deciding everything

### 3. `AIChatPanelPro.tsx`
Why next:
- it is already smaller than before, but still too responsible for one artifact-facing AI surface
- benchmark pressure from Cursor and Windsurf is about compositional, context-rich AI, not one giant sidebar file

Recommended seams:
- `components/ai-chat/AIChatTimeline.tsx`
- `components/ai-chat/AIChatComposerRail.tsx`
- `components/ai-chat/AIChatContextStrip.tsx`
- `components/ai-chat/AIChatOpsBar.tsx`

User-facing quality target:
- preserve the feeling of AI glued to the current artifact, with faster message scanning and clearer apply/agent/context grammar

### 4. `XTerminal.tsx`
Why next:
- terminal quality is part of workbench credibility
- the current file is still too dense for session lifecycle, chrome, transport, and presence logic together

Recommended seams:
- `components/terminal/TerminalSessionRail.tsx`
- `components/terminal/TerminalViewport.tsx`
- `components/terminal/useTerminalSessionLifecycle.ts`
- `components/terminal/useTerminalTransport.ts`

User-facing quality target:
- terminal should feel stable, legible, and close to the workbench context instead of like an embedded utility block

### 5. `WorkbenchEditorSurface.tsx`
Why now:
- the latest split turned the old pane monolith into a cleaner set of seams
- this is now the correct follow-up target for editor surface density and clarity

Recommended seams:
- `components/ide/fullscreen/EditorCanvas.tsx`
- `components/ide/fullscreen/SplitEditorCanvas.tsx`
- `components/ide/fullscreen/useEditorPresenceBridge.ts`

User-facing quality target:
- keep split editing, cursor presence, and inline AI responsive while shrinking editor-surface complexity further

## Parallel Execution Waves
### Wave 1 - core creation loop
Run in parallel where write scopes do not overlap:
1. `FullscreenIDE.tsx`
2. `AIChatPanelPro.tsx`
3. `XTerminal.tsx`
4. `CanonicalPreviewSurface.tsx`

### Wave 2 - dense product surfaces
After Wave 1 stabilizes:
1. `ProjectsDashboard.tsx`
2. `SettingsUI.tsx`
3. `SettingsPage.tsx`
4. `CreatorDashboard.tsx`
5. `app/admin/ai-monitor/page.tsx`

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
1. keep production build parity open until `next build` proves end-to-end success
2. continue shrinking `FullscreenIDE.tsx`
3. continue shrinking `AIChatPanelPro.tsx`
4. continue shrinking `XTerminal.tsx`
5. keep reducing `CanonicalPreviewSurface.tsx` by extracting scene and viewport seams
6. promote preview, collaboration, and deploy from present to trusted

## One-Line Reading
The audits no longer leave us with ambiguity.
The fastest honest path is to keep slicing by real UX seams, starting with preview and the remaining workbench core.
