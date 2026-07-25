'use client'

import { AgentBoard, type AgentInfo } from './AgentBoard'
import { LiveConversationPanel } from './LiveConversationPanel'
import { RunCard } from './RunCard'
import { NexusMissionPhaseStrip } from './NexusMissionPhaseStrip'
import { GraphOperatorReceipt } from '@/components/agents/chat/creative/GraphOperatorReceipt'
import { VideoToMechanicHonestyBanner } from '@/components/agents/chat/creative/VideoToMechanicHonestyBanner'
import { UsdContentHonestyBanner } from '@/components/agents/chat/creative/UsdContentHonestyBanner'
import { BrowserOperatorReceipt } from '@/components/agents/chat/creative/BrowserOperatorReceipt'
import { LiveVoiceReceipt } from '@/components/agents/chat/creative/LiveVoiceReceipt'
import { ReceiptCompletenessStrip } from '@/components/agents/chat/ledger/ReceiptCompletenessStrip'
import type { AIChatConsoleMode } from '@/components/agents/chat/presets'
import type { NexusMissionUiPayload } from '@/lib/production/nexus-mission-phases'
import type { NexusCreativeOperatorHint } from '@/lib/production/nexus-squad-dispatch'
import {
  evaluateCreativeReceiptCompleteness,
  type CreativeReceiptCompletenessInput,
} from '@/lib/production/agents-receipt-completeness'

export interface NexusCreativeReceipt {
  operator: NexusCreativeOperatorHint
  graphId?: string | null
  scaffoldId?: string | null
  fusionTransactionId?: string | null
  nodeCount?: number
  stateCount?: number
  placementCount?: number
  requiresUserWiring?: boolean
  target?: string | null
  blockedReason?: string | null
  /** J.8 BrowserOperator */
  sessionId?: string | null
  runId?: string | null
  sourceCount?: number
  timelineHash?: string | null
  /** J.10 LiveVoice */
  turnId?: string | null
  playbackSource?: string | null
  rms?: number | null
  lipsyncFrames?: number | null
  evidenceReceiptId?: string | null
}

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
  nexus?: NexusMissionUiPayload | null
  /** AI-v1-e — J.5/J.6/J.7 receipts for Nexus chrome */
  creativeReceipt?: NexusCreativeReceipt | null
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
  nexus = null,
  creativeReceipt = null,
}: AIChatActivityDeckProps) {
  const showBoard = agents.length > 0 && (agentCount > 1 || Boolean(nexus?.cells.length))
  const creativeCompleteness = evaluateCreativeReceiptCompleteness(
    creativeReceipt as CreativeReceiptCompletenessInput | null,
  )

  return (
    <>
      <NexusMissionPhaseStrip nexus={nexus} isWorking={isAIWorking && !nexus} />

      {creativeReceipt ? <ReceiptCompletenessStrip report={creativeCompleteness} /> : null}

      {creativeReceipt?.operator.kind === 'graph-operator' && (
        <GraphOperatorReceipt
          graphId={creativeReceipt.graphId}
          target={creativeReceipt.target ?? creativeReceipt.operator.target}
          nodeCount={creativeReceipt.nodeCount}
          fusionTransactionId={creativeReceipt.fusionTransactionId}
          requiresUserWiring={creativeReceipt.requiresUserWiring}
          blockedReason={creativeReceipt.blockedReason}
        />
      )}
      {creativeReceipt?.operator.kind === 'video-to-mechanic' && (
        <VideoToMechanicHonestyBanner
          scaffoldId={creativeReceipt.scaffoldId}
          fusionTransactionId={creativeReceipt.fusionTransactionId}
          stateCount={creativeReceipt.stateCount}
        />
      )}
      {creativeReceipt?.operator.kind === 'usd-integrator' && (
        <UsdContentHonestyBanner
          placementCount={creativeReceipt.placementCount}
          fusionTransactionId={creativeReceipt.fusionTransactionId}
          blockedReason={creativeReceipt.blockedReason}
        />
      )}
      {creativeReceipt?.operator.kind === 'live-voice' && (
        <LiveVoiceReceipt
          sessionId={creativeReceipt.sessionId}
          turnId={creativeReceipt.turnId}
          playbackSource={creativeReceipt.playbackSource}
          rms={creativeReceipt.rms}
          lipsyncFrames={creativeReceipt.lipsyncFrames}
          evidenceReceiptId={creativeReceipt.evidenceReceiptId}
          blockedReason={creativeReceipt.blockedReason}
        />
      )}
      {creativeReceipt?.operator.kind === 'browser-operator' && (
        <BrowserOperatorReceipt
          sessionId={creativeReceipt.sessionId}
          runId={creativeReceipt.runId}
          sourceCount={creativeReceipt.sourceCount}
          timelineHash={creativeReceipt.timelineHash}
          blockedReason={creativeReceipt.blockedReason}
        />
      )}

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

      {showBoard && <AgentBoard agents={agents} onAgentClick={onAgentClick} />}
    </>
  )
}
