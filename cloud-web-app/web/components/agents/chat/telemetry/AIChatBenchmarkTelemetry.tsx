'use client'

import { AIChatActivityDeck } from '@/components/agents/chat/activity'
import { AIChatQuickPromptStrip } from './AIChatQuickPromptStrip'
import type { AgentInfo } from '@/components/agents/chat/activity'
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
  nexus?: import('@/lib/production/nexus-mission-phases').NexusMissionUiPayload | null
  creativeReceipt?: import('@/components/agents/chat/activity').NexusCreativeReceipt | null
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
  nexus = null,
  creativeReceipt = null,
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
        nexus={nexus}
        creativeReceipt={creativeReceipt}
      />

      {showAdvancedControls && <AIChatQuickPromptStrip onQuickPrompt={onQuickPrompt} prompts={quickPrompts} />}
    </>
  )
}
