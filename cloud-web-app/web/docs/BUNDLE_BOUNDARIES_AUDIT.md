# BUNDLE_BOUNDARIES_AUDIT.md
Generated: deterministic local scan

- Files scanned: 1852
- Failures: 0

## Counts
- threeDirect: 84 (max 86)
- reactThreeFiberDirect: 17 (max 19)
- reactThreeDreiDirect: 15 (max 17)
- monacoEditorDirect: 3 (max 6)
- monacoReactDirect: 4 (max 5)
- framerMotionDirect: 21 (max 23)
- dynamicImportsMin: 243 (min 80)

## Top Offenders
### threeDirect
- components/assets/AssetPreviewPanel.tsx (1)
- components/assets/ContentBrowserConnected.tsx (1)
- components/character/control-rig-model.ts (1)
- components/character/ControlRigEditor.parts.tsx (1)
- components/character/ControlRigEditor.tsx (1)
- components/character/HairFurEditor.parts.tsx (1)
- components/engine/content-browser-core.ts (1)
- components/engine/DetailsPanel.tsx (1)
- components/engine/LevelEditor.tsx (1)
- components/engine/NiagaraVFXPanels.tsx (1)
- components/engine/WorldOutliner.tsx (1)
- components/environment/FoliagePainterPanels.tsx (1)
- components/materials/MaterialEditor.tsx (1)
- components/nexus/NexusCanvasV2.tsx (1)
- components/physics/ClothSimulationPanels.tsx (1)
- components/physics/DestructionEditor.model.ts (1)
- components/physics/DestructionEditor.tsx (1)
- components/physics/fluid-simulation-core.ts (1)
- components/physics/FluidSimulationEditor.tsx (1)
- components/physics/FluidSimulationPanels.tsx (1)
- components/scene-editor/GameSimulation.tsx (1)
- components/scene-editor/scene-editor-models.ts (1)
- components/scene-editor/SceneEditor.tsx (1)
- components/terrain/TerrainSculptingEditor.parts.tsx (1)
- components/viewport/gizmos/TransformGizmoProfessional.tsx (1)
### reactThreeFiberDirect
- components/assets/AssetPreviewPanel.tsx (1)
- components/character/ControlRigEditor.tsx (1)
- components/character/HairFurEditor.parts.tsx (1)
- components/engine/GameViewport.tsx (1)
- components/engine/LevelEditor.tsx (1)
- components/engine/NiagaraVFXPanels.tsx (1)
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
- lib/camera/camera-system.tsx (1)
### reactThreeDreiDirect
- components/assets/AssetPreviewPanel.tsx (1)
- components/character/ControlRigEditor.parts.tsx (1)
- components/character/ControlRigEditor.tsx (1)
- components/character/HairFurEditor.parts.tsx (1)
- components/engine/GameViewport.tsx (1)
- components/engine/LevelEditor.tsx (1)
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
- components/editor/GhostTextDecorations.tsx (1)
- lib/collaboration/collaboration-manager.ts (1)
- lib/monaco-lsp-bridge.ts (1)
### monacoReactDirect
- components/editor/MonacoEditor.tsx (1)
- components/editor/MonacoEditorPro.theme.ts (1)
- components/editor/MonacoEditorPro.tsx (1)
- components/ide/MonacoChatDiffPanel.tsx (1)
### framerMotionDirect
- components/ai/AgentModePanel.tsx (1)
- components/ai/AISuggestionBubble.tsx (1)
- components/ai/AIThinkingPanel.tsx (1)
- components/ai/DirectorNotePanel.tsx (1)
- components/billing/LowBalanceModal.tsx (1)
- components/collaboration/VersionHistorySlider.tsx (1)
- components/editor/GhostTextDecorations.tsx (1)
- components/editor/InlineEditModal.tsx (1)
- components/marketplace/MarketplaceBrowser.parts.tsx (1)
- components/marketplace/MarketplaceBrowser.tsx (1)
- components/marketplace/UserLibrary.tsx (1)
- components/settings/SettingsPanel.parts.tsx (1)
- components/settings/SettingsPanel.tsx (1)
- components/studio/AdvancedSettingsPanel.tsx (1)
- components/studio/GamesAndFilmsModule.tsx (1)
- components/ui/GlassmorphismUI.tsx (1)
- components/ui/motion.tsx (1)
- components/ui/premium.tsx (1)
- components/ui/PremiumSkeleton.tsx (1)
- components/vcs/TimeMachineSlider.tsx (1)
- lib/debug/devtools-provider.tsx (1)

## Async Heavy Boundaries
Files marked with @aethel-heavy-async-boundary are reported separately because they are split behind explicit dynamic boundaries and are not allowed to be imported by public route shells.
### threeDirect
- components/character/FacialAnimationEditor.tsx (1)
- components/engine/LandscapeEditor.tsx (1)
- components/engine/NiagaraVFX.tsx (1)
- components/environment/FoliagePainter.tsx (1)
- components/environment/WaterEditor.tsx (1)
- components/LivePreview.tsx (1)
- components/marketplace/AssetModelPreview.tsx (1)
- components/physics/ClothSimulationEditor.tsx (1)
### reactThreeFiberDirect
- components/character/FacialAnimationEditor.tsx (1)
- components/character/HairFurEditor.tsx (1)
- components/engine/LandscapeEditor.tsx (1)
- components/engine/NiagaraVFX.tsx (1)
- components/environment/FoliagePainter.tsx (1)
- components/environment/WaterEditor.tsx (1)
- components/LivePreview.tsx (1)
- components/marketplace/AssetModelPreview.tsx (1)
- components/physics/ClothSimulationEditor.tsx (1)
### reactThreeDreiDirect
- components/character/FacialAnimationEditor.tsx (1)
- components/character/HairFurEditor.tsx (1)
- components/engine/LandscapeEditor.tsx (1)
- components/engine/NiagaraVFX.tsx (1)
- components/environment/FoliagePainter.tsx (1)
- components/environment/WaterEditor.tsx (1)
- components/LivePreview.tsx (1)
- components/marketplace/AssetModelPreview.tsx (1)
- components/physics/ClothSimulationEditor.tsx (1)
### monacoEditorDirect
- none
### monacoReactDirect
- none
### framerMotionDirect
- components/audio/AudioPreview.tsx (1)
- components/collaboration/CollaborationPanel.tsx (1)
- components/extensions/ExtensionManagerPanel.tsx (1)
- components/git/GitPanel.tsx (1)

## Failures
- none

## Critical Boundaries
- CanonicalPreviewSurface lazy-loads SceneViewportSurface and CanvasViewportSurface so runtime/live previews do not eagerly pull viewport/Three code.
