// IDE Components - Unified Export
// Aethel Engine IDE Components
// Canonical workbench: `FullscreenIDE` + `ModernIDEShell`.

// Modern IDE Components (2026 UX Improvements)
export {
  ModernIDEShell,
  ModernIDELoading,
} from './ModernIDEShell'

export {
  InlineAIChat,
} from './InlineAIChat'

// Legacy / compatibility exports
// `IDELayout` permanece no repo apenas como legado documental; evitar novos imports.
export { default as FileExplorerPro } from './FileExplorerPro'
export { default as GitPanelPro } from './GitPanelPro'
export { default as AIChatPanelPro } from './AIChatPanelPro'
export { default as AIAgentsPanelPro } from './AIAgentsPanelPro'
export { default as EngineSettingsPage } from './EngineSettingsPage'
export { default as CommandPalette } from './CommandPalette'
export { default as DebugPanel } from './DebugPanel'
export { default as DiffViewer } from './DiffViewer'
export { default as InlineCompletion } from './InlineCompletion'

// Types
