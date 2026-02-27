# 42_ACTIVE_DECOMPOSITION_BATCH_PLAN_2026-02-25
Status: DECISION-COMPLETE STRUCTURAL EXECUTION PLAN
Date: 2026-02-25
Source: `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`

## 0) Objective
1. Reduce active medium-size monolith pressure (`>=900` lines) without scope expansion.
2. Keep all capability/error/deprecation contracts unchanged while splitting internals.
3. Execute in bounded batches with low regression risk.

## 1) Baseline
1. Active large-file pressure (`>=900` lines): `136`
2. Hard non-growth lock: `qa:active-large-file-pressure` with `maxFiles=136`
3. Target:
- Batch A: `136 -> 124`
- Batch B: `124 -> 112`
- Batch C: `112 -> 100`

## 2) Batch A (Top 12 Files, P0)
1. `cloud-web-app/web/lib/engine/navigation-ai.ts`
2. `cloud-web-app/web/lib/ai-3d-generation-system.ts`
3. `cloud-web-app/web/lib/behavior-tree.ts`
4. `cloud-web-app/web/lib/input/input-manager.ts`
5. `cloud-web-app/web/components/narrative/QuestEditor.tsx`
6. `cloud-web-app/web/lib/world/world-streaming.tsx`
7. `cloud-web-app/web/lib/ai/behavior-tree-system.tsx`
8. `cloud-web-app/web/lib/terrain-engine.ts`
9. `cloud-web-app/web/lib/collaboration-realtime.ts`
10. `cloud-web-app/web/lib/materials/material-editor.ts`
11. `cloud-web-app/web/lib/cache-system.ts`
12. `cloud-web-app/web/lib/cutscene/cutscene-system.tsx`

Execution rule:
1. Split by domain helpers (`*.types.ts`, `*.runtime.ts`, `*.helpers.ts`, `*.validators.ts`) with explicit re-export where required.

## 3) Batch B (Next 12 Files, P1)
1. `cloud-web-app/web/lib/water-ocean-system.ts`
2. `cloud-web-app/web/lib/engine/asset-pipeline.ts`
3. `cloud-web-app/web/lib/ai-integration-total.ts`
4. `cloud-web-app/web/lib/server/studio-home-store.ts`
5. `cloud-web-app/web/lib/visual-script/runtime.ts`
6. `cloud-web-app/web/components/engine/LandscapeEditor.tsx`
7. `cloud-web-app/web/components/materials/MaterialEditor.tsx`
8. `cloud-web-app/web/lib/capture/capture-system.tsx`
9. `cloud-web-app/web/lib/cloth-simulation.ts`
10. `cloud-web-app/web/lib/save/save-manager.tsx`
11. `cloud-web-app/web/lib/debug/real-debug-adapter.ts`
12. `cloud-web-app/web/lib/achievements/achievement-system.tsx`

## 4) Batch C (Next 12 Files, P1/P2)
1. `cloud-web-app/web/components/video/VideoTimelineEditorPanels.tsx`
2. `cloud-web-app/web/lib/hair-fur-system.ts`
3. `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`
4. `cloud-web-app/web/lib/video-encoder-real.ts`
5. `cloud-web-app/web/components/dashboard/ProjectsDashboard.tsx`
6. `cloud-web-app/web/lib/nanite-virtualized-geometry.ts`
7. `cloud-web-app/web/components/dashboard/AethelDashboardPrimaryTabContent.tsx`
8. `cloud-web-app/web/lib/quests/quest-system.tsx`
9. `cloud-web-app/web/lib/networking-multiplayer.ts`
10. `cloud-web-app/web/lib/replay/replay-system.tsx`
11. `cloud-web-app/web/lib/engine/audio-manager.ts`
12. `cloud-web-app/web/components/audio/AudioProcessing.tsx`

## 5) Guardrails
1. No capability status promotion during decomposition.
2. No API shape change unless explicitly declared in master contract.
3. Keep routes and error codes stable (`NOT_IMPLEMENTED`, `DEPRECATED_ROUTE`, `PROVIDER_NOT_CONFIGURED`, etc.).
4. Any split must preserve public imports (use compatibility re-exports where needed).

## 6) Done Criteria Per Batch
1. Decomposed files drop below `900` lines for batch targets.
2. `qa:active-large-file-pressure` passes and baseline is tightened only after achieved reduction.
3. `qa:repo-connectivity` remains green.
4. No growth in historical markdown and legacy active references (`qa:canonical-doc-governance`, `qa:legacy-path-references`).

## 7) Operational Note
Heavy end-to-end gates remain deferred per current execution directive. This plan is prepared for fast sequential implementation with low-risk splits first.

## 8) Progress Delta 2026-02-25 (Batch A execution in progress)
Completed:
1. `cloud-web-app/web/lib/engine/navigation-ai.ts`
- extracted math/grid/queue primitives into `cloud-web-app/web/lib/engine/navigation-ai-primitives.ts`
- preserved compatibility via re-exports in `navigation-ai.ts`.
2. `cloud-web-app/web/lib/ai-3d-generation-system.ts`
- split into:
  - `cloud-web-app/web/lib/ai-3d-generation-nerf.ts`
  - `cloud-web-app/web/lib/ai-3d-generation-gaussian.ts`
  - `cloud-web-app/web/lib/ai-3d-generation-meshing.ts`
- kept public surface compatibility through re-exports from `ai-3d-generation-system.ts`.
3. `cloud-web-app/web/lib/behavior-tree.ts`
- extracted action/runtime nodes into `cloud-web-app/web/lib/behavior-tree-action-nodes.ts`
- preserved compatibility through imports/re-exports in `behavior-tree.ts`.
4. `cloud-web-app/web/lib/world/world-streaming.tsx`
- extracted spatial primitives into:
  - `cloud-web-app/web/lib/world/world-streaming-octree.ts`
  - `cloud-web-app/web/lib/world/world-streaming-priority-queue.ts`
- kept hooks/provider and public surface in `world-streaming.tsx` with compatibility export of `Octree`.
5. `cloud-web-app/web/lib/input/input-manager.ts`
- extracted input contracts/constants to `cloud-web-app/web/lib/input/input-manager-types.ts`
- extracted default mapping presets/registrar to `cloud-web-app/web/lib/input/input-manager-default-mappings.ts`
- kept public compatibility exports in `input-manager.ts`.
6. `cloud-web-app/web/components/narrative/QuestEditor.tsx`
- extracted contracts to `cloud-web-app/web/components/narrative/QuestEditor.types.ts`
- extracted category/objective catalog to `cloud-web-app/web/components/narrative/QuestEditor.catalog.tsx`
- extracted node renderer/types to `cloud-web-app/web/components/narrative/QuestEditor.nodes.tsx`
- kept editor public type exports in `QuestEditor.tsx`.
7. `cloud-web-app/web/lib/terrain-engine.ts`
- extracted terrain contracts to `cloud-web-app/web/lib/terrain-engine.types.ts`
- extracted noise/heightmap generators to `cloud-web-app/web/lib/terrain-engine-noise.ts`
- preserved public surface via re-exports from `terrain-engine.ts`.
8. `cloud-web-app/web/lib/collaboration-realtime.ts`
- extracted websocket/service runtime to `cloud-web-app/web/lib/collaboration-realtime-core.ts`
- kept React context/hooks surface in `collaboration-realtime.ts` and preserved class exports via core re-export.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 128`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Next in Batch A queue:
1. `cloud-web-app/web/lib/ai/behavior-tree-system.tsx`
2. `cloud-web-app/web/lib/materials/material-editor.ts`
3. `cloud-web-app/web/lib/cache-system.ts`

## 9) Progress Delta 2026-02-25 (Batch A continued)
Completed:
1. `cloud-web-app/web/lib/ai/behavior-tree-system.tsx`
- extracted all BT node/runtime definitions to `cloud-web-app/web/lib/ai/behavior-tree-system.nodes.ts`.
- `behavior-tree-system.tsx` now composes from the extracted node module and preserves exported API surface (types + nodes + default export registry compatibility).
2. `cloud-web-app/web/lib/materials/material-editor.ts`
- extracted material contracts to `cloud-web-app/web/lib/materials/material-editor.types.ts`.
- extracted preset catalog to `cloud-web-app/web/lib/materials/material-editor.presets.ts`.
- kept compatibility exports in `material-editor.ts` for existing imports (`DEFAULT_PRESETS` + type surface).

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 126`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=126`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).

Next in Batch A queue:
1. `cloud-web-app/web/lib/cache-system.ts`

## 11) Progress Delta 2026-02-25 (Batch A closure target reached)
Completed:
1. `cloud-web-app/web/lib/cache-system.ts`
- extracted performance runtime to `cloud-web-app/web/lib/cache-system-performance.ts`;
- extracted debounce/throttle hooks to `cloud-web-app/web/lib/cache-system-hooks.ts`;
- `cache-system.ts` now composes these modules with compatibility exports preserved.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 124`.
2. Batch A target reached exactly (`124`).
3. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=124`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Move execution focus to Batch B (`water-ocean-system`, `engine/asset-pipeline`, `ai-integration-total`) while holding non-growth lock.

## 12) Progress Delta 2026-02-25 (Batch B kickoff + extra structural closure)
Completed:
1. `cloud-web-app/web/lib/water-ocean-system.ts`
- extracted FFT simulation core to `cloud-web-app/web/lib/water-ocean-fft.ts`;
- kept compatibility via `FFTOcean` import/re-export in `water-ocean-system.ts`.
2. `cloud-web-app/web/lib/engine/asset-pipeline.ts`
- extracted cache runtime to `cloud-web-app/web/lib/engine/asset-pipeline-cache.ts`;
- extracted importer runtime to `cloud-web-app/web/lib/engine/asset-pipeline-importer.ts`;
- preserved main API surface with compatibility export for `AssetImporter` and `ImportSettings`.
3. `cloud-web-app/web/lib/ai-integration-total.ts`
- extracted integrated workflow tool registrations to `cloud-web-app/web/lib/ai-integration-total-workflows.ts`;
- kept registration behavior through `registerIntegratedWorkflowTools({ aiTools, engineState })`.
4. `cloud-web-app/web/lib/server/studio-home-store.ts`
- extracted normalization/store helper block to `cloud-web-app/web/lib/server/studio-home-store-normalizers.ts`;
- reduced store module to orchestration/runtime flow and preserved exported contracts.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 120`.
2. Batch A target remains preserved and surpassed during Batch B kickoff.
3. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=120`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on remaining top files (`server/studio-home-store` residuals closed, then `visual-script/runtime`, `capture-system`, `cloth-simulation`).

## 13) Progress Delta 2026-02-25 (Batch B continued - visual script runtime split)
Completed:
1. `cloud-web-app/web/lib/visual-script/runtime.ts`
- extracted default node executor registry to `cloud-web-app/web/lib/visual-script/runtime-node-executors.ts`;
- preserved runtime behavior by importing shared `nodeExecutors` and `NodeExecutor` type in `runtime.ts`.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 119`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=119`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B residuals (`capture-system`, `cloth-simulation`, `ai-integration-total` secondary pass if needed).
2. `cloud-web-app/web/lib/cutscene/cutscene-system.tsx`

## 10) Progress Delta 2026-02-25 (Batch A continued - cutscene split)
Completed:
1. `cloud-web-app/web/lib/cutscene/cutscene-system.tsx`
- extracted builder DSL to `cloud-web-app/web/lib/cutscene/cutscene-builder.ts`;
- `cutscene-system.tsx` now composes builder from the extracted module and preserves public API export (`CutsceneBuilder`) and default export compatibility.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 125`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=125`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next in Batch A queue:
1. `cloud-web-app/web/lib/cache-system.ts`

## 14) Progress Delta 2026-02-25 (Batch B continued - capture + cloth structural splits)
Completed:
1. `cloud-web-app/web/lib/capture/capture-system.tsx`
- extracted screenshot/media helper runtime to `cloud-web-app/web/lib/capture/capture-system-media.ts`;
- main capture runtime now composes helper module and preserves existing hook/API exports.
2. `cloud-web-app/web/lib/cloth-simulation.ts`
- extracted cloth primitives/mesh runtime to `cloud-web-app/web/lib/cloth-simulation-core.ts`;
- main simulation module now composes/re-exports core classes with compatibility maintained.
3. Cross-module type stability hardening:
- `cloud-web-app/web/lib/capture/capture-presets.ts` now consumes `ScreenshotEffect` from `capture-types`;
- `cloud-web-app/web/lib/cloth-simulation-gpu.ts` now consumes `ClothConfig` from `cloth-simulation.types`.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 117`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=117`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on current top pressure files:
- `cloud-web-app/web/components/engine/LandscapeEditor.tsx`
- `cloud-web-app/web/components/materials/MaterialEditor.tsx`
- `cloud-web-app/web/lib/save/save-manager.tsx`.

## 15) Progress Delta 2026-02-25 (Batch B continued - LandscapeEditor modular split)
Completed:
1. `cloud-web-app/web/components/engine/LandscapeEditor.tsx`
- extracted scene/runtime block to `cloud-web-app/web/components/engine/LandscapeEditor.scene.tsx`;
- extracted toolbar/brush/layers panels to `cloud-web-app/web/components/engine/LandscapeEditor.panels.tsx`;
- preserved orchestration behavior and type export surface in `LandscapeEditor.tsx`.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 116`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=116`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on next top pressure files:
- `cloud-web-app/web/components/materials/MaterialEditor.tsx`
- `cloud-web-app/web/lib/save/save-manager.tsx`
- `cloud-web-app/web/lib/debug/real-debug-adapter.ts`.

## 16) Progress Delta 2026-02-25 (Batch B continued - MaterialEditor contracts/catalog split)
Completed:
1. `cloud-web-app/web/components/materials/MaterialEditor.tsx`
- extracted contracts/types to `cloud-web-app/web/components/materials/MaterialEditor.types.ts`;
- extracted node catalog to `cloud-web-app/web/components/materials/MaterialEditor.node-definitions.ts`;
- preserved runtime/compiler/editor exports in `MaterialEditor.tsx`.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 115`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=115`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on next top pressure files:
- `cloud-web-app/web/lib/save/save-manager.tsx`
- `cloud-web-app/web/lib/debug/real-debug-adapter.ts`
- `cloud-web-app/web/lib/achievements/achievement-system.tsx`.

## 17) Progress Delta 2026-02-25 (Batch B acceleration - Save/Debug/Achievement split)
Completed:
1. `cloud-web-app/web/lib/save/save-manager.tsx`
- extracted serializer/migration/validation runtime to `save-manager-core.ts`;
- extracted provider/hooks to `save-manager-hooks.tsx`;
- kept compatibility exports in manager shell.
2. `cloud-web-app/web/lib/debug/real-debug-adapter.ts`
- extracted DAP contracts to `real-debug-adapter-types.ts`;
- kept runtime adapter orchestration and type re-export compatibility.
3. `cloud-web-app/web/lib/achievements/achievement-system.tsx`
- extracted contracts to `achievement-system.types.ts`;
- extracted provider/hooks to `achievement-system-hooks.tsx`;
- kept runtime manager/builder exports in orchestration shell.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 112`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=112`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on next top pressure files:
- `cloud-web-app/web/components/video/VideoTimelineEditorPanels.tsx`
- `cloud-web-app/web/lib/hair-fur-system.ts`
- `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`.

## 18) Progress Delta 2026-02-25 (Batch B continuation - video timeline panel split)
Completed:
1. `cloud-web-app/web/components/video/VideoTimelineEditorPanels.tsx`
- extracted clip inspector/effects panel to `VideoTimelineEditorPanels.inspector.tsx`;
- kept timeline/ruler/track/playback components in core module with compatibility re-exports.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 111`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=111`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on next top pressure files:
- `cloud-web-app/web/lib/hair-fur-system.ts`
- `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`
- `cloud-web-app/web/lib/video-encoder-real.ts`.

## 19) Progress Delta 2026-02-25 (Batch B continuation - Hair/Fluid/VideoEncoder decomposition)
Completed:
1. `cloud-web-app/web/lib/hair-fur-system.ts`
- extracted physics runtime to `hair-fur-physics.ts`;
- extracted grooming runtime to `hair-fur-groom.ts`;
- extracted shell-fur runtime to `hair-fur-shell.ts`;
- kept `hair-fur-system.ts` as orchestration shell with compatibility exports.
2. `cloud-web-app/web/components/physics/FluidSimulationEditor.tsx`
- extracted contracts/defaults/runtime to:
  - `fluid-simulation.types.ts`
  - `fluid-simulation.defaults.ts`
  - `fluid-simulation.runtime.ts`;
- extracted settings rail to `FluidSimulationEditorSettingsPanel.tsx`;
- kept main editor file as viewport/state orchestration shell.
3. `cloud-web-app/web/lib/video-encoder-real.ts`
- extracted modules to:
  - `video-encoder-real.types.ts`
  - `video-encoder-real.encoders.ts`
  - `video-encoder-real.muxers.ts`
  - `video-encoder-real.renderer.ts`
  - `video-encoder-real.pipeline.ts`
  - `video-encoder-real.screen-recorder.ts`;
- retained compatibility barrel/factory API in `video-encoder-real.ts`.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 108`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=108`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on next top pressure files from refreshed matrix `41`.
2. Keep heavy freeze suite deferred to final requested pass.

## 20) Progress Delta 2026-02-25 (Batch B continuation - Dashboard + networking core split)
Completed:
1. `cloud-web-app/web/components/dashboard/ProjectsDashboard.tsx`
- extracted dashboard contracts/constants/cards/modal to dedicated files;
- reduced main dashboard file to orchestration shell and preserved surface behavior.
2. `cloud-web-app/web/lib/networking-multiplayer.ts`
- extracted serializer/prediction/interpolation primitives to `networking-multiplayer-core.ts`;
- main networking module now focuses on client/matchmaker/manager orchestration with compatibility re-exports.
3. Removed blocking dialog usage from dashboard delete flow (`window.confirm` no longer used in this surface).

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 106`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=106`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on next top pressure files from refreshed matrix `41`.
2. Keep heavy freeze suite deferred to final requested pass.

## 21) Progress Delta 2026-02-25 (Batch B continuation - fluid runtime + quest builder split)
Completed:
1. `cloud-web-app/web/lib/fluid-simulation-system.ts`
- extracted runtime classes to:
  - `fluid-simulation-spatial-hash.ts`
  - `fluid-simulation-sph.ts`
  - `fluid-simulation-pbf.ts`
  - `fluid-simulation-flip.ts`;
- kept `fluid-simulation-system.ts` as orchestration/factory barrel with compatibility exports.
2. `cloud-web-app/web/lib/quests/quest-system.tsx`
- extracted builder DSL to `quests/quest-builder.ts`;
- retained manager/hooks runtime in `quest-system.tsx` and compatibility re-export for `QuestBuilder`.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 104`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=104`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on next top pressure files from refreshed matrix `41`.
2. Keep heavy freeze suite deferred to final requested pass.

## 22) Progress Delta 2026-02-25 (Batch B continuation - replay decomposition)
Completed:
1. `cloud-web-app/web/lib/replay/replay-system.tsx`
- extracted replay runtime classes to `replay-runtime.ts`;
- extracted manager orchestration to `replay-manager.ts`;
- extracted React provider/hooks to `replay-hooks.tsx`;
- reduced `replay-system.tsx` to composition/compatibility barrel.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 103`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=103`).
2. `cmd /c npm run qa:legacy-path-references` -> PASS (`activeMentions=0`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` + `cmd /c npm run qa:workflow-governance` -> PASS.

Next queue handoff:
1. Continue Batch B on next top pressure files from refreshed matrix `41`.
2. Keep heavy freeze suite deferred to final requested pass.

## 23) Progress Delta 2026-02-25 (Batch B continuation - UI framework runtime/type split)
Completed:
1. `cloud-web-app/web/lib/ui/ui-framework.tsx`
- extracted shared contracts to `ui-framework.types.ts`;
- extracted runtime manager to `ui-manager.ts`;
- kept `ui-framework.tsx` as provider/hooks/components surface with compatibility-preserving exports.
2. Reduced `ui-framework.tsx` from `1055` to `649` lines.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 78`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=78`).
2. `cmd /c npm run qa:interface-gate` -> PASS (`critical zeros`, `not-implemented-ui=4`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` -> PASS (`unindexedCanonicalMarkdown=0`).

Next queue handoff:
1. Continue Batch B on top pressure files:
- `cloud-web-app/web/lib/nanite-virtualized-geometry.ts`
- `cloud-web-app/web/lib/engine/physics-engine.ts`
- `cloud-web-app/web/lib/ecs-dots-system.ts`.
2. Keep heavy freeze suite deferred to final requested pass.

## 24) Progress Delta 2026-02-25 (Batch B continuation - localization runtime/type/default split)
Completed:
1. `cloud-web-app/web/lib/localization/localization-system.tsx`
- extracted contracts to `localization-types.ts`;
- extracted default locale/plural payload to `localization-defaults.ts`;
- reduced main runtime/hooks/HOC surface to `648` lines with compatibility exports preserved.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 77`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=77`).
2. `cmd /c npm run qa:interface-gate` -> PASS (`critical zeros`, `not-implemented-ui=4`).
3. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
4. `cmd /c npm run qa:canonical-doc-governance` -> PASS (`unindexedCanonicalMarkdown=0`).

Next queue handoff:
1. Continue Batch B on top pressure files:
- `cloud-web-app/web/lib/nanite-virtualized-geometry.ts`
- `cloud-web-app/web/lib/engine/physics-engine.ts`
- `cloud-web-app/web/lib/ecs-dots-system.ts`.
2. Keep heavy freeze suite deferred to final requested pass.

## 25) Progress Delta 2026-02-25 (Batch B continuation - Nanite runtime split)
Completed:
1. `cloud-web-app/web/lib/nanite-virtualized-geometry.ts`
- extracted shared contracts to `nanite-types.ts`;
- extracted culling runtime to `nanite-culling.ts`;
- extracted visibility pass runtime to `nanite-visibility.ts`;
- reduced main file to meshlet-builder + renderer orchestration shell with compatibility exports preserved.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 76`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=76`).
2. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).

Next queue handoff:
1. Continue Batch B on top pressure files:
- `cloud-web-app/web/lib/engine/physics-engine.ts`
- `cloud-web-app/web/lib/ecs-dots-system.ts`
- `cloud-web-app/web/lib/dialogue/dialogue-system.tsx`.
2. Keep heavy freeze suite deferred to final requested pass.

## 26) Progress Delta 2026-02-25 (Batch B continuation - dialogue runtime/type split)
Completed:
1. `cloud-web-app/web/lib/dialogue/dialogue-system.tsx`
- extracted contracts to `dialogue-types.ts`;
- extracted runtime primitives to `dialogue-runtime.ts`;
- reduced main file to dialogue manager + React integration shell with compatibility exports preserved.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 75`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=75`).
2. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).

Next queue handoff:
1. Continue Batch B on top pressure files:
- `cloud-web-app/web/lib/engine/physics-engine.ts`
- `cloud-web-app/web/lib/ecs-dots-system.ts`
- `cloud-web-app/web/lib/hot-reload/hot-reload-server.ts`.
2. Keep heavy freeze suite deferred to final requested pass.

## 27) Progress Delta 2026-02-25 (Batch B continuation - physics runtime split)
Completed:
1. `cloud-web-app/web/lib/engine/physics-engine.ts`
- extracted bodies/colliders to `physics-body.ts`;
- extracted collision/broadphase resolution to `physics-collision.ts`;
- reduced main file to `PhysicsWorld` + `PhysicsEngine` orchestration shell with compatibility exports preserved.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 74`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=74`).
2. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
3. `cmd /c npm run qa:interface-gate` -> PASS (`critical zeros`, `not-implemented-ui=4`).

## 28) Progress Delta 2026-02-25 (Batch B continuation - ECS execution split)
Completed:
1. `cloud-web-app/web/lib/ecs-dots-system.ts`
- extracted system runtime to `ecs-execution.ts` (`SystemScheduler`, `JobSystem`);
- reduced main ECS file below threshold (`1056 -> 899`) and preserved compatibility re-export.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 74`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=74`).
2. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
3. `cmd /c npm run qa:canonical-doc-governance` -> PASS (`unindexedCanonicalMarkdown=0`).

Next queue handoff:
1. Continue Batch B on top pressure files:
- `cloud-web-app/web/lib/hot-reload/hot-reload-server.ts`
- `cloud-web-app/web/lib/aaa-render-system.ts`
- `cloud-web-app/web/lib/ecs/prefab-component-system.tsx`.
2. Keep heavy freeze suite deferred to final requested pass.

## 29) Progress Delta 2026-02-25 (Batch B continuation - hot reload client-script extraction)
Completed:
1. `cloud-web-app/web/lib/hot-reload/hot-reload-server.ts`
- extracted large client payload to `hot-reload-client-script.ts`;
- reduced server core to orchestration + websocket/watch lifecycle.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 73`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=73`).
2. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
3. `cmd /c npm run qa:interface-gate` -> PASS (`critical zeros`, `not-implemented-ui=4`).

Next queue handoff:
1. Continue Batch B on top pressure files:
- `cloud-web-app/web/lib/aaa-render-system.ts`
- `cloud-web-app/web/lib/ecs/prefab-component-system.tsx`
- `cloud-web-app/web/lib/server/extension-host-runtime.ts`.
2. Keep heavy freeze suite deferred to final requested pass.

## 30) Progress Delta 2026-02-25 (Batch B continuation - AAA render config/type split)
Completed:
1. `cloud-web-app/web/lib/aaa-render-system.ts`
- extracted render contracts/default stacks to `aaa-render-types.ts`;
- reduced runtime file to rendering orchestration shell with compatibility exports preserved.

Measured result (from `41_ACTIVE_LARGE_FILE_PRESSURE_MATRIX_2026-02-25.md`):
1. Active large-file pressure (`>=900`): `136 -> 72`.
2. Non-growth lock preserved (`maxFiles=136`, no breach).

Validation snapshot:
1. `cmd /c npm run qa:active-large-file-pressure` -> PASS (`largeFileCount=72`).
2. `cmd /c npm run qa:repo-connectivity` -> PASS (`requiredMissing=0`, `deadScriptReferences=0`).
3. `cmd /c npm run qa:interface-gate` -> PASS (`critical zeros`, `not-implemented-ui=4`).

Next queue handoff:
1. Continue Batch B on top pressure files:
- `cloud-web-app/web/lib/ecs/prefab-component-system.tsx`
- `cloud-web-app/web/lib/server/extension-host-runtime.ts`
- `cloud-web-app/web/lib/state/game-state-manager.tsx`.
2. Keep heavy freeze suite deferred to final requested pass.
