/**
 * Aethel Engine Components - Index
 * 
 * Exporta todos os componentes do engine de forma organizada.
 */

// ============================================================================
// CORE ENGINE COMPONENTS
// ============================================================================

export { default as WorldOutliner } from './WorldOutliner';
export { default as DetailsPanel } from './DetailsPanel';
export { default as LevelEditor } from './LevelEditor';
export { default as LandscapeEditor } from './LandscapeEditor';
export { default as AnimationBlueprint } from './AnimationBlueprint';
export { default as NiagaraVFX } from './NiagaraVFX';
export { default as ProjectSettings } from './ProjectSettings';
export { default as GameViewport } from './GameViewport';
export { default as BlueprintEditor } from './BlueprintEditor';
export { default as AbilityEditor } from './AbilityEditor'; // GAS Editor

// ============================================================================
// TYPES RE-EXPORTS
// ============================================================================

// World Outliner Types
export type {
  SceneObject,
  SceneObjectType,
} from './WorldOutliner';

// Details Panel Types
export type {
  PropertyType,
  ComponentDefinition,
  InspectedObject,
} from './DetailsPanel';
