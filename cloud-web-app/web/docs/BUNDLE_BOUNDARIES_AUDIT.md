# BUNDLE_BOUNDARIES_AUDIT.md
Generated: deterministic local scan

- Files scanned: 2504
- Failures: 0

## Counts
- threeDirect: 0 (max 0)
- reactThreeFiberDirect: 0 (max 2)
- reactThreeDreiDirect: 0 (max 0)
- monacoEditorDirect: 0 (max 0)
- monacoReactDirect: 0 (max 0)
- framerMotionDirect: 0 (max 0)
- dynamicImportsMin: 279 (min 100)

## Top Offenders
### threeDirect
- none
### reactThreeFiberDirect
- none
### reactThreeDreiDirect
- none
### monacoEditorDirect
- none
### monacoReactDirect
- none
### framerMotionDirect
- none

## Async Heavy Boundaries
Files marked with @aethel-heavy-async-boundary are reported separately because they are split behind explicit dynamic boundaries and are not allowed to be imported by public route shells.
### threeDirect
- lib/aaa-asset-pipeline-runtime/importer.ts (1)
- lib/aaa-asset-pipeline-runtime/optimizer.ts (1)
- lib/aaa-material-system.contracts.ts (1)
- lib/aaa-material-system.ts (1)
- lib/aaa-render-configs.ts (1)
- lib/aaa-render-quality-config.ts (1)
- lib/aaa-render-system.ts (1)
- lib/aaa-renderer-impl.ts (1)
- lib/ai/behavior-tree-blackboard.ts (1)
- lib/ai/behavior-tree-system.tsx (1)
- lib/ai-content-generation-mesh.ts (1)
- lib/ai-content-generation.ts (1)
- lib/animation/animation-runtime/player.ts (1)
- lib/asset-import-pipeline.ts (1)
- lib/asset-pipeline.ts (1)
- lib/assets/asset-importer-processing.ts (1)
- lib/assets/asset-importer.loaders.ts (1)
- lib/assets/asset-importer.ts (1)
- lib/assets/asset-preview-mesh-runtime.tsx (1)
- lib/assets/content-browser-loader.ts (1)
- lib/audio/spatial-audio-hooks.ts (1)
- lib/audio/spatial-audio-source.ts (1)
- lib/audio/spatial-audio-system.ts (1)
- lib/camera/camera-path-builder.ts (1)
- lib/camera/camera-system-react.tsx (1)
### reactThreeFiberDirect
- lib/assets/asset-preview-mesh-runtime.tsx (1)
- lib/camera/camera-system-react.tsx (1)
- lib/character/ControlRigEditor.runtime.tsx (1)
- lib/character/FacialAnimationEditor.parts-runtime.tsx (1)
- lib/character/HairFurEditor.parts-runtime.tsx (1)
- lib/character/HairFurEditor.runtime.tsx (1)
- lib/engine/GameViewport.runtime.tsx (1)
- lib/engine/LandscapeEditor.runtime.tsx (1)
- lib/engine/LevelEditor.viewport-runtime.tsx (1)
- lib/engine/NiagaraVFX.runtime.tsx (1)
- lib/engine/NiagaraVFXPanels.runtime.tsx (1)
- lib/environment/FoliagePainterRuntime.tsx (1)
- lib/environment/WaterEditor.parts-runtime.tsx (1)
- lib/environment/WaterEditorRuntime.tsx (1)
- lib/marketplace/AssetModelPreviewRuntime.tsx (1)
- lib/physics/ClothSimulationEditor.runtime.tsx (1)
- lib/physics/ClothSimulationPanels.runtime.tsx (1)
- lib/physics/DestructionEditor.runtime.tsx (1)
- lib/physics/DestructionEditorMesh.runtime.tsx (1)
- lib/physics/FluidSimulationEditor.runtime.tsx (1)
- lib/physics/FluidSimulationPanels.runtime.tsx (1)
- lib/scene-editor/GameSimulation.runtime.tsx (1)
- lib/scene-editor/SceneEditor.canvas-runtime.tsx (1)
- lib/terrain/TerrainSculptingEditor.runtime.tsx (1)
- lib/terrain/TerrainSculptingEditor.scene-runtime.tsx (1)
### reactThreeDreiDirect
- lib/assets/asset-preview-mesh-runtime.tsx (1)
- lib/character/ControlRigEditor.parts-runtime.tsx (1)
- lib/character/ControlRigEditor.runtime.tsx (1)
- lib/character/FacialAnimationEditor.parts-runtime.tsx (1)
- lib/character/HairFurEditor.parts-runtime.tsx (1)
- lib/character/HairFurEditor.runtime.tsx (1)
- lib/engine/GameViewport.runtime.tsx (1)
- lib/engine/LandscapeEditor.runtime.tsx (1)
- lib/engine/LevelEditor.viewport-runtime.tsx (1)
- lib/engine/NiagaraVFX.runtime.tsx (1)
- lib/environment/FoliagePainterRuntime.tsx (1)
- lib/environment/WaterEditorRuntime.tsx (1)
- lib/marketplace/AssetModelPreviewRuntime.tsx (1)
- lib/physics/ClothSimulationEditor.runtime.tsx (1)
- lib/physics/ClothSimulationPanels.runtime.tsx (1)
- lib/physics/DestructionEditor.runtime.tsx (1)
- lib/physics/DestructionEditorMesh.runtime.tsx (1)
- lib/physics/FluidSimulationEditor.runtime.tsx (1)
- lib/physics/FluidSimulationPanels.runtime.tsx (1)
- lib/scene-editor/SceneEditor.canvas-runtime.tsx (1)
- lib/terrain/TerrainSculptingEditor.runtime.tsx (1)
- lib/terrain/TerrainSculptingEditor.scene-runtime.tsx (1)
- lib/viewport/gizmos/TransformGizmoProfessional.tsx (1)
- lib/viewport/ViewportSceneCanvas.runtime.tsx (1)
- lib/viewport/ViewportSceneObjectMesh.tsx (1)
### monacoEditorDirect
- lib/collaboration/collaboration-manager.ts (1)
- lib/monaco-lsp-bridge.maps.ts (1)
- lib/monaco-lsp-bridge.ts (1)
### monacoReactDirect
- lib/editor/MonacoChatDiffPanel.runtime.tsx (1)
- lib/editor/MonacoEditor.runtime.tsx (1)
- lib/editor/MonacoEditorPro.runtime.tsx (1)
### framerMotionDirect
- lib/ui/motion.tsx (1)
- lib/ui/premium.tsx (1)

## Async Boundary Import References
- components/collaboration/CollaborationPanel.parts.tsx statically imports @/lib/ui/motion -> lib/ui/motion.tsx
- components/marketplace/MarketplaceBrowser.tsx statically imports ./MarketplaceBrowser.parts -> components/marketplace/MarketplaceBrowser.parts.tsx
- components/scene-editor/ScenePropertiesPanel.tsx statically imports ./scene-editor-models -> components/scene-editor/scene-editor-models.ts
- components/studio/AdvancedSettingsPanel.dialogs.tsx statically imports @/lib/ui/motion -> lib/ui/motion.tsx
- components/viewport/AethelViewport3D.tsx statically imports @/lib/hooks/useRenderPipeline -> lib/hooks/useRenderPipeline.ts
- lib/aaa-asset-pipeline-runtime/singletons.ts statically imports ./importer -> lib/aaa-asset-pipeline-runtime/importer.ts
- lib/aaa-asset-pipeline-runtime/singletons.ts statically imports ./optimizer -> lib/aaa-asset-pipeline-runtime/optimizer.ts
- lib/animation/animation-runtime/default-export.ts statically imports ./player -> lib/animation/animation-runtime/player.ts
- lib/animation/animation-runtime/react.ts statically imports ./player -> lib/animation/animation-runtime/player.ts
- lib/animation/animation-runtime/state-machine.ts statically imports ./player -> lib/animation/animation-runtime/player.ts
- lib/assets/asset-importer.react.ts statically imports ./asset-importer -> lib/assets/asset-importer.ts
- lib/cutscene/system/default-export.ts statically imports ./player -> lib/cutscene/system/player.ts
- lib/cutscene/system/manager.ts statically imports ./player -> lib/cutscene/system/player.ts
- lib/dialogue-cutscene/factories.ts statically imports ./cutscene-system -> lib/dialogue-cutscene/cutscene-system.ts
- lib/ecs/prefab-system/default-export.ts statically imports ./component-registry -> lib/ecs/prefab-system/component-registry.ts
- lib/ecs/prefab-system/default-export.ts statically imports ./prefab-manager -> lib/ecs/prefab-system/prefab-manager.ts
- lib/ecs/prefab-system/entity-manager.ts statically imports ./component-registry -> lib/ecs/prefab-system/component-registry.ts
- lib/ecs/prefab-system/react.tsx statically imports ./component-registry -> lib/ecs/prefab-system/component-registry.ts
- lib/ecs/prefab-system/react.tsx statically imports ./prefab-manager -> lib/ecs/prefab-system/prefab-manager.ts
- lib/engine/asset-pipeline-runtime/manager.ts statically imports ./loaders -> lib/engine/asset-pipeline-runtime/loaders.ts
- lib/engine/audio-manager.ts statically imports ./audio-source -> lib/engine/audio-source.ts
- lib/fluid-simulation-runtime/factories.ts statically imports ./flip -> lib/fluid-simulation-runtime/flip.ts
- lib/fluid-simulation-runtime/factories.ts statically imports ./pbf -> lib/fluid-simulation-runtime/pbf.ts
- lib/fluid-simulation-runtime/factories.ts statically imports ./sph -> lib/fluid-simulation-runtime/sph.ts
- lib/hooks/useRenderPipeline.presets.ts statically imports ../aaa-render-system -> lib/aaa-render-system.ts
- lib/materials/material-editor-runtime/default-export.ts statically imports ./factory -> lib/materials/material-editor-runtime/factory.ts
- lib/materials/material-editor-runtime/editor.ts statically imports ./factory -> lib/materials/material-editor-runtime/factory.ts
- lib/networking/multiplayer-runtime/default-export.ts statically imports ./network-manager -> lib/networking/multiplayer-runtime/network-manager.ts
- lib/networking/multiplayer-runtime/react.tsx statically imports ./network-manager -> lib/networking/multiplayer-runtime/network-manager.ts
- lib/particles/advanced-particle-system-react.ts statically imports ./advanced-particle-system -> lib/particles/advanced-particle-system.ts
- lib/postprocessing/system/default-export.ts statically imports ./bloom-pass -> lib/postprocessing/system/bloom-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./chromatic-aberration-pass -> lib/postprocessing/system/chromatic-aberration-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./color-grading-pass -> lib/postprocessing/system/color-grading-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./effect-composer -> lib/postprocessing/system/effect-composer.ts
- lib/postprocessing/system/default-export.ts statically imports ./film-grain-pass -> lib/postprocessing/system/film-grain-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./tonemapping-pass -> lib/postprocessing/system/tonemapping-pass.ts
- lib/postprocessing/system/default-export.ts statically imports ./vignette-pass -> lib/postprocessing/system/vignette-pass.ts
- lib/scene/scene-serializer-runtime/react.ts statically imports ./serializer -> lib/scene/scene-serializer-runtime/serializer.ts

## Public Route Import Violations
- none

## Failures
- none

## Critical Boundaries
- CanonicalPreviewSurface delegates viewport/canvas work to UnifiedViewport.
- UnifiedViewport lazy-loads SceneViewportSurface and CanvasViewportSurface so runtime/live previews do not eagerly pull viewport/Three code.
