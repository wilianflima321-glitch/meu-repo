import type { ModelOption } from '@/components/ide/AIChatPanelPro.types'
import type { AIChatConsoleMode } from '@/components/agents/chat/presets'
import type { ActiveContextItem } from '@/components/ide/ActiveContextBadge'

export interface AIChatHeaderProps {
  consoleMode: AIChatConsoleMode
  onConsoleModeChange: (mode: AIChatConsoleMode) => void
  hasHistory: boolean
  showHistorySidebar: boolean
  onToggleHistorySidebar: () => void
  selectedModel: ModelOption
  currentModel: string
  models: ModelOption[]
  showModelSelector: boolean
  onToggleModelSelector: () => void
  onCloseModelSelector: () => void
  onModelChange?: (model: string) => void
  showAdvancedControls: boolean
  modelTierLabel: string
  agentCount: number
  onAgentCountChange: (count: number) => void
  isLiveMode: boolean
  onToggleLiveMode?: () => void
  isSpeaking: boolean
  onToggleSpeaking: () => void
  onClearChat?: () => void
  onToggleAdvancedControls: () => void
  /** Active context items shown as chips in the header — replaces internal badge */
  activeContextItems?: ActiveContextItem[]
  /** Whether calm mode is active (hides telemetry panels by default) */
  calmMode?: boolean
  /** Toggle calm mode */
  onToggleCalmMode?: () => void
}

export type AIChatModeMenuProps = Pick<
  AIChatHeaderProps,
  'consoleMode' | 'onConsoleModeChange'
>

export type AIChatModelPickerProps = Pick<
  AIChatHeaderProps,
  | 'selectedModel'
  | 'currentModel'
  | 'models'
  | 'showModelSelector'
  | 'onToggleModelSelector'
  | 'onCloseModelSelector'
  | 'onModelChange'
  | 'showAdvancedControls'
  | 'modelTierLabel'
  | 'agentCount'
>

export type AIChatHeaderActionsProps = Pick<
  AIChatHeaderProps,
  | 'selectedModel'
  | 'showAdvancedControls'
  | 'agentCount'
  | 'onAgentCountChange'
  | 'isLiveMode'
  | 'onToggleLiveMode'
  | 'isSpeaking'
  | 'onToggleSpeaking'
  | 'onClearChat'
  | 'onToggleAdvancedControls'
>

export type AIChatAgentLaneProps = Pick<
  AIChatHeaderProps,
  'showAdvancedControls' | 'selectedModel'
>
