# BUNDLE_BOUNDARIES_AUDIT.md
Generated: deterministic local scan

- Files scanned: 2093
- Failures: 0

## Counts
- threeDirect: 34 (max 34)
- reactThreeFiberDirect: 1 (max 2)
- reactThreeDreiDirect: 0 (max 1)
- monacoEditorDirect: 2 (max 2)
- monacoReactDirect: 3 (max 3)
- framerMotionDirect: 8 (max 9)
- dynamicImportsMin: 258 (min 100)

## Top Offenders
### threeDirect
- lib/ai/behavior-tree-blackboard.ts (1)
- lib/audio/spatial-audio-system.ts (1)
- lib/camera/camera-system.tsx (1)
- lib/cutscene/system/player.ts (1)
- lib/dialogue-cutscene/cutscene-system.ts (1)
- lib/ecs/prefab-system/component-registry.ts (1)
- lib/ecs/prefab-system/prefab-manager.ts (1)
- lib/engine/lod/auto-lod-pipeline.ts (1)
- lib/engine/scene-graph.ts (1)
- lib/facial-animation-system.ts (1)
- lib/fluid-simulation-runtime/kernels.ts (1)
- lib/game-engine-core.ts (1)
- lib/game-loop.ts (1)
- lib/hooks/useRenderPipeline.ts (1)
- lib/level-serialization/serializer.ts (1)
- lib/motion-matching-system.ts (1)
- lib/nanite-virtualized-geometry.ts (1)
- lib/particle-system-real.ts (1)
- lib/particles/advanced-particle-system.ts (1)
- lib/pbr-shader-pipeline.ts (1)
- lib/physics/physics-system.ts (1)
- lib/physics-engine-real.ts (1)
- lib/post-process-volume.ts (1)
- lib/quest-mission-system.ts (1)
- lib/ray-tracing.ts (1)
### reactThreeFiberDirect
- lib/camera/camera-system.tsx (1)
### reactThreeDreiDirect
- none
### monacoEditorDirect
- lib/collaboration/collaboration-manager.ts (1)
- lib/monaco-lsp-bridge.ts (1)
### monacoReactDirect
- components/editor/MonacoEditor.tsx (1)
- components/editor/MonacoEditorPro.tsx (1)
- components/ide/MonacoChatDiffPanel.tsx (1)
### framerMotionDirect
- components/ai/AgentModePanel.tsx (1)
- components/marketplace/MarketplaceBrowser.parts.tsx (1)
- components/studio/AdvancedSettingsPanel.tsx (1)
- components/studio/GamesAndFilmsModule.tsx (1)
- components/ui/GlassmorphismUI.tsx (1)
- components/ui/motion.tsx (1)
- components/ui/premium.tsx (1)
- components/vcs/TimeMachineSlider.tsx (1)

## Async Heavy Boundaries
Files marked with @aethel-heavy-async-boundary are reported separately because they are split behind explicit dynamic boundaries and are not allowed to be imported by public route shells.
### threeDirect
- components/assets/AssetPreviewPanel.tsx (1)
- components/assets/ConnectedModelPreview.tsx (1)
- components/character/control-rig-model.ts (1)
- components/character/ControlRigEditor.parts.tsx (1)
- components/character/ControlRigEditor.tsx (1)
- components/character/FacialAnimationEditor.tsx (1)
- components/character/HairFurEditor.parts.tsx (1)
- components/engine/content-browser-loader.ts (1)
- components/engine/LandscapeEditor.tsx (1)
- components/engine/LevelEditor.tsx (1)
- components/engine/NiagaraVFX.tsx (1)
- components/engine/NiagaraVFXPanels.tsx (1)
- components/environment/FoliagePainter.tsx (1)
- components/environment/FoliagePainterPanels.tsx (1)
- components/environment/WaterEditor.tsx (1)
- components/LivePreview.tsx (1)
- components/marketplace/AssetModelPreview.tsx (1)
- components/materials/MaterialEditor.tsx (1)
- components/nexus/NexusCanvasV2.tsx (1)
- components/physics/ClothSimulationEditor.tsx (1)
- components/physics/ClothSimulationPanels.tsx (1)
- components/physics/DestructionEditor.tsx (1)
- components/physics/fluid-simulation-core.ts (1)
- components/physics/FluidSimulationEditor.tsx (1)
- components/physics/FluidSimulationPanels.tsx (1)
### reactThreeFiberDirect
- components/assets/AssetPreviewPanel.tsx (1)
- components/character/ControlRigEditor.tsx (1)
- components/character/FacialAnimationEditor.tsx (1)
- components/character/HairFurEditor.parts.tsx (1)
- components/character/HairFurEditor.tsx (1)
- components/engine/GameViewport.tsx (1)
- components/engine/LandscapeEditor.tsx (1)
- components/engine/LevelEditor.tsx (1)
- components/engine/NiagaraVFX.tsx (1)
- components/engine/NiagaraVFXPanels.tsx (1)
- components/environment/FoliagePainter.tsx (1)
- components/environment/WaterEditor.tsx (1)
- components/LivePreview.tsx (1)
- components/marketplace/AssetModelPreview.tsx (1)
- components/physics/ClothSimulationEditor.tsx (1)
- components/physics/ClothSimulationPanels.tsx (1)
- components/physics/DestructionEditor.tsx (1)
- components/physics/FluidSimulationEditor.tsx (1)
- components/physics/FluidSimulationPanels.tsx (1)
- components/scene-editor/GameSimulation.tsx (1)
- components/scene-editor/SceneEditor.tsx (1)
- components/terrain/TerrainSculptingEditor.parts.tsx (1)
- components/terrain/TerrainSculptingEditor.tsx (1)
- components/viewport/ViewportCameraPresetApplier.tsx (1)
- components/viewport/ViewportSceneCanvas.tsx (1)
### reactThreeDreiDirect
- components/assets/AssetPreviewPanel.tsx (1)
- components/character/ControlRigEditor.parts.tsx (1)
- components/character/ControlRigEditor.tsx (1)
- components/character/FacialAnimationEditor.tsx (1)
- components/character/HairFurEditor.parts.tsx (1)
- components/character/HairFurEditor.tsx (1)
- components/engine/GameViewport.tsx (1)
- components/engine/LandscapeEditor.tsx (1)
- components/engine/LevelEditor.tsx (1)
- components/engine/NiagaraVFX.tsx (1)
- components/environment/FoliagePainter.tsx (1)
- components/environment/WaterEditor.tsx (1)
- components/LivePreview.tsx (1)
- components/marketplace/AssetModelPreview.tsx (1)
- components/physics/ClothSimulationEditor.tsx (1)
- components/physics/ClothSimulationPanels.tsx (1)
- components/physics/DestructionEditor.tsx (1)
- components/physics/FluidSimulationEditor.tsx (1)
- components/physics/FluidSimulationPanels.tsx (1)
- components/scene-editor/SceneEditor.tsx (1)
- components/terrain/TerrainSculptingEditor.parts.tsx (1)
- components/terrain/TerrainSculptingEditor.tsx (1)
- components/viewport/gizmos/TransformGizmoProfessional.tsx (1)
- components/viewport/ViewportSceneCanvas.tsx (1)
### monacoEditorDirect
- none
### monacoReactDirect
- none
### framerMotionDirect
- components/ai/AISuggestionBubble.tsx (1)
- components/ai/AIThinkingPanel.tsx (1)
- components/ai/DirectorNotePanel.tsx (1)
- components/audio/AudioPreview.tsx (1)
- components/collaboration/CollaborationPanel.tsx (1)
- components/extensions/ExtensionManagerPanel.tsx (1)
- components/git/GitPanel.tsx (1)

## Async Boundary Import References
- app/nexus/page.tsx statically imports @/components/nexus/NexusCanvasV2 -> components/nexus/NexusCanvasV2.tsx
- components/forge/TheForgeUnified.tsx statically imports ../nexus/NexusCanvasV2 -> components/nexus/NexusCanvasV2.tsx
- components/scene-editor/ScenePropertiesPanel.tsx statically imports ./scene-editor-models -> components/scene-editor/scene-editor-models.ts
- lib/aaa-asset-pipeline-runtime/singletons.ts statically imports ./importer -> lib/aaa-asset-pipeline-runtime/importer.ts
- lib/aaa-asset-pipeline-runtime/singletons.ts statically imports ./optimizer -> lib/aaa-asset-pipeline-runtime/optimizer.ts
- lib/animation/animation-runtime/default-export.ts statically imports ./player -> lib/animation/animation-runtime/player.ts
- lib/animation/animation-runtime/react.ts statically imports ./player -> lib/animation/animation-runtime/player.ts
- lib/animation/animation-runtime/state-machine.ts statically imports ./player -> lib/animation/animation-runtime/player.ts
- lib/engine/asset-pipeline-runtime/manager.ts statically imports ./loaders -> lib/engine/asset-pipeline-runtime/loaders.ts
- lib/engine/scene-graph.ts statically imports ./scene-transform -> lib/engine/scene-transform.ts
- lib/fluid-simulation-runtime/factories.ts statically imports ./flip -> lib/fluid-simulation-runtime/flip.ts
- lib/fluid-simulation-runtime/factories.ts statically imports ./pbf -> lib/fluid-simulation-runtime/pbf.ts
- lib/fluid-simulation-runtime/factories.ts statically imports ./sph -> lib/fluid-simulation-runtime/sph.ts
- lib/game-loop.ts statically imports ./aaa-renderer-impl -> lib/aaa-renderer-impl.ts
- lib/hooks/useRenderPipeline.ts statically imports ../aaa-render-system -> lib/aaa-render-system.ts
- lib/materials/material-editor-runtime/default-export.ts statically imports ./factory -> lib/materials/material-editor-runtime/factory.ts
- lib/materials/material-editor-runtime/editor.ts statically imports ./factory -> lib/materials/material-editor-runtime/factory.ts
- lib/networking/multiplayer-runtime/default-export.ts statically imports ./network-manager -> lib/networking/multiplayer-runtime/network-manager.ts
- lib/networking/multiplayer-runtime/react.tsx statically imports ./network-manager -> lib/networking/multiplayer-runtime/network-manager.ts
- lib/pbr-shader-pipeline.ts statically imports ./pbr-shader-sources -> lib/pbr-shader-sources.ts
- lib/postprocessing/system/default-export.ts statically imports ./bloom-pass -> lib/postprocessing/system/bloom-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./chromatic-aberration-pass -> lib/postprocessing/system/chromatic-aberration-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./color-grading-pass -> lib/postprocessing/system/color-grading-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./effect-composer -> lib/postprocessing/system/effect-composer.ts
- lib/postprocessing/system/default-export.ts statically imports ./film-grain-pass -> lib/postprocessing/system/film-grain-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./tonemapping-pass -> lib/postprocessing/system/tonemapping-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./vignette-pass -> lib/postprocessing/system/vignette-pass.ts
- lib/render-system.ts statically imports ./aaa-renderer-impl -> lib/aaa-renderer-impl.ts
- lib/scene/scene-serializer-runtime/react.ts statically imports ./serializer -> lib/scene/scene-serializer-runtime/serializer.ts

## Public Route Import Violations
- none

## Failures
- none

## Critical Boundaries
- CanonicalPreviewSurface lazy-loads SceneViewportSurface and CanvasViewportSurface so runtime/live previews do not eagerly pull viewport/Three code.
