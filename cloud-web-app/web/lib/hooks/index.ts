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
// Re-export de hooks existentes
// ============================================================================

// Todos os hooks estão exportados acima
