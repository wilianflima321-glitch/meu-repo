// IDE Components - Unified Export
// Aethel Engine IDE Components
// Canonical workbench: `FullscreenIDE` + `ModernIDEShell`.

// Global Toast System (use anywhere in the app)
export { ToastProvider, useToast } from './ToastProvider'
export type { ToastVariant, ToastOptions } from './ToastProvider'

// Modern IDE Shell
export {
  ModernIDEShell,
  ModernIDELoading,
} from './ModernIDEShell'

// Inline AI Chat
export {
  InlineAIChat,
} from './InlineAIChat'

// 3D / Game Engine Panels
export { Outliner3D } from './Outliner3D'
export type { SceneNode } from './Outliner3D'
export { Timeline3D } from './Timeline3D'
export { PropertiesPanel3D } from './PropertiesPanel3D'
export type { PropertiesPanelProps, PropertySection, Property } from './PropertiesPanel3D'
export { FluidPlaytestViewportConsumer } from './FluidPlaytestViewportConsumer'
export type { FluidParticle, FluidPlaytestProps } from './FluidPlaytestViewportConsumer'

// Source Control
export { GitIntegration } from './GitIntegration'

// Agent / AI Approval Flow
export { ApprovalCard } from './ApprovalCard'
export { TaskOpsPanel } from './TaskOpsPanel'

// UI Primitives
export { Sparkline } from './Sparkline'
export { KeyboardShortcutsDialog } from './KeyboardShortcutsDialog'
export { CommandPaletteProvider, useCommandPalette, useRegisterCommand } from './CommandPalette'
export type { FileItem } from './CommandPalette'

// Legacy / compatibility exports kept only for still-mounted workbench panes.
export { default as FileExplorerPro } from './FileExplorerPro'
export { default as AIChatPanelPro } from './AIChatPanelPro'
export { default as DebugPanel } from './DebugPanel'
export { default as InlineCompletion } from './InlineCompletion'

// Types
