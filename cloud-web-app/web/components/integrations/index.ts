/**
 * Aethel Engine - Integrated Systems Export
 * 
 * Exporta todos os novos sistemas criados para fácil importação.
 * Garante que todas as integrações estejam disponíveis em um único ponto.
 */

// ============================================================================
// CONTENT BROWSER & DRAG-DROP
// ============================================================================
export { ContentBrowser } from '../assets/ContentBrowser';
export type { Asset, AssetFolder, AssetType, DragData } from '../assets/ContentBrowser';

// ============================================================================
// ASSET DRAG-DROP INTEGRATION
// ============================================================================
export {
  useAssetDrop,
  useAssetDrag,
  SceneAssetIntegration,
  sceneIntegration,
  createSceneObjectFromAsset,
  generateId,
} from '../../lib/asset-drag-drop';
export type { SceneObject, DropResult, DropHandlerOptions } from '../../lib/asset-drag-drop';

// ============================================================================
// AI SCENE COMMANDS
// ============================================================================
export {
  CommandParser,
  SceneCommandExecutor,
  sceneCommandExecutor,
  executeAISceneCommand,
  PRIMITIVE_GEOMETRIES,
  MATERIAL_COLORS,
  LIGHT_TYPES,
} from '../../lib/ai-scene-commands';
export type { SceneCommand, SceneCommandType, CommandResult } from '../../lib/ai-scene-commands';

// ============================================================================
// DEBUG ATTACH UI
// ============================================================================
export { DebugAttachUI } from '../debug/DebugAttachUI';
export type { AttachableProcess, ProcessType, DebugConfiguration } from '../debug/DebugAttachUI';

// ============================================================================
// ONBOARDING
// ============================================================================
export { default as TourProvider, useTour } from '../onboarding/InteractiveTour';
export type { TourStep, Tour } from '../onboarding/InteractiveTour';

// ============================================================================
// BILLING & USAGE
// ============================================================================
export { UsageDashboard } from '../billing/UsageDashboard';

// ============================================================================
// TEAM MANAGEMENT
// ============================================================================
export { TeamInviteManager } from '../team/TeamInviteManager';

// ============================================================================
// DASHBOARD
// ============================================================================
export { ProjectsDashboard } from '../dashboard/ProjectsDashboard';

// ============================================================================
// TERMINAL PROFILES
// ============================================================================
export { 
  default as TerminalProfilesManager,
  ProfileSelector,
  TerminalTab,
  DEFAULT_TERMINAL_PROFILES,
} from '../terminal/TerminalProfiles';
export type { TerminalProfile, ActiveTerminal } from '../terminal/TerminalProfiles';
