'use client'

import { AIChatActivityDeck } from '@/components/ai-chat/AIChatActivityDeck'
import { AIChatQuickPromptStrip } from '@/components/ai-chat/AIChatQuickPromptStrip'
import type { AgentInfo } from '@/components/ai-chat/AgentBoard'
import type { AIChatConsoleMode, QuickPromptDefinition } from '@/components/agents/chat/presets'

interface AIChatBenchmarkTelemetryProps {
  agents: AgentInfo[]
  agentCount: number
  consoleMode: AIChatConsoleMode
  estimatedCost?: number
  isAIWorking: boolean
  onAgentClick: (agentId: string) => void
  onInterrupt: () => void
  onQuickPrompt: (prompt: string) => void
  onSendLiveMessage: (message: string) => void
  quickPrompts: QuickPromptDefinition[]
  runDuration?: number
  selectedModelName: string
  showAdvancedControls: boolean
}

export function AIChatBenchmarkTelemetry({
  agents,
  agentCount,
  consoleMode,
  estimatedCost,
  isAIWorking,
  onAgentClick,
  onInterrupt,
  onQuickPrompt,
  onSendLiveMessage,
  quickPrompts,
  runDuration,
  selectedModelName,
  showAdvancedControls,
}: AIChatBenchmarkTelemetryProps) {
  return (
    <>
      <AIChatActivityDeck
        consoleMode={consoleMode}
        isAIWorking={isAIWorking}
        runDuration={runDuration}
        estimatedCost={estimatedCost}
        selectedModelName={selectedModelName}
        onInterrupt={onInterrupt}
        onSendLiveMessage={onSendLiveMessage}
        agentCount={agentCount}
        agents={agents}
        onAgentClick={onAgentClick}
      />

      {showAdvancedControls && <AIChatQuickPromptStrip onQuickPrompt={onQuickPrompt} prompts={quickPrompts} />}
    </>
  )
}
