'use client'

import { AgentBoard, type AgentInfo } from './AgentBoard'
import { LiveConversationPanel } from './LiveConversationPanel'
import { RunCard } from './RunCard'
import type { AIChatConsoleMode } from '@/components/agents/chat/presets'

interface AIChatActivityDeckProps {
  consoleMode: AIChatConsoleMode
  isAIWorking: boolean
  runDuration?: number
  estimatedCost?: number
  selectedModelName: string
  onInterrupt: () => void
  onSendLiveMessage: (message: string) => void
  agentCount: number
  agents: AgentInfo[]
  onAgentClick: (agentId: string) => void
}

export function AIChatActivityDeck({
  consoleMode,
  isAIWorking,
  runDuration,
  estimatedCost,
  selectedModelName,
  onInterrupt,
  onSendLiveMessage,
  agentCount,
  agents,
  onAgentClick,
}: AIChatActivityDeckProps) {
  return (
    <>
      {consoleMode === 'live' && (
        <LiveConversationPanel
          isWorking={isAIWorking}
          onInterrupt={onInterrupt}
          onSendMessage={onSendLiveMessage}
        />
      )}

      {consoleMode !== 'ask' && (
        <RunCard
          status={isAIWorking ? 'running' : 'idle'}
          duration={runDuration ?? 0}
          cost={estimatedCost ?? 0}
          model={selectedModelName}
          onInterrupt={onInterrupt}
        />
      )}

      {agentCount > 1 && <AgentBoard agents={agents} onAgentClick={onAgentClick} />}
    </>
  )
}
