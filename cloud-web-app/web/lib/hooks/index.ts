/**
 * Aethel Engine - Hooks Index
 * 
 * Exportação centralizada de todos os hooks React.
 */

// ============================================================================
// Terminal
// ============================================================================

export {
  useTerminal,
  type UseTerminalOptions,
  type UseTerminalReturn,
  type TerminalTheme,
} from './useTerminal';

// ============================================================================
// Collaboration
// ============================================================================

export {
  useCollaboration,
  type UseCollaborationOptions,
  type UseCollaborationReturn,
} from './useCollaboration';

// ============================================================================
// Extensions
// ============================================================================

export {
  useExtensions,
  type Extension,
  type ExtensionCategory,
  type UseExtensionsOptions,
  type UseExtensionsReturn,
} from './useExtensions';

// ============================================================================
// Multiplayer Networking
// ============================================================================

export {
  useMultiplayerNetworking,
  type UseMultiplayerOptions,
  type ChatMessage,
  type UseMultiplayerResult,
} from './useMultiplayerNetworking';

// ============================================================================
// Gameplay Ability System
// ============================================================================

export {
  useGameplayAbilitySystem,
  PRESET_ABILITIES,
  type AbilityState,
  type EffectState,
  type AttributeState,
  type GASStats,
  type UseGASOptions,
  type UseGASReturn,
} from './useGameplayAbilitySystem';

// ============================================================================
// Render Pipeline
// ============================================================================

export {
  useRenderPipeline,
  detectOptimalQuality,
  type QualityPreset,
  type RenderStats,
  type GPUCapabilities,
  type DynamicQualityConfig,
  type UseRenderPipelineOptions,
  type UseRenderPipelineReturn,
} from './useRenderPipeline';

// ============================================================================
// Render Progress (WebSocket)
// ============================================================================

export {
  useRenderProgress,
  type RenderJob,
  type RenderJobStatus,
  type RenderProgressEvent,
  type UseRenderProgressOptions,
  type UseRenderProgressReturn,
} from './useRenderProgress';

// ============================================================================
// System Health (WebSocket)
// ============================================================================

export {
  useSystemHealth,
  formatBytes,
  formatUptime,
  getStatusColor,
  type SystemHealthData,
  type CPUMetrics,
  type MemoryMetrics,
  type GPUMetrics,
  type DiskMetrics,
  type NetworkMetrics,
  type ServiceHealth,
  type HealthStatus,
  type UseSystemHealthOptions,
  type UseSystemHealthReturn,
} from './useSystemHealth';

// ============================================================================
// Session Tracker
// ============================================================================

export { useSessionTracker } from './use-session-tracker';
