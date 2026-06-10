'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AIChatPanelProps,
  ModelOption,
} from '@/components/ide/AIChatPanelPro.types'
import { createComponentLogger } from '@/lib/observability/logger'
import type { AgentInfo } from '@/components/agents/chat/activity'

const log = createComponentLogger('AIChatPanelPro')

interface UseAIChatRunStateParams {
  agentCount: number
  currentModel: string
  isLoading: boolean
  models: ModelOption[]
  onInterrupt?: () => void
  onRegenerateResponse?: AIChatPanelProps['onRegenerateResponse']
  onSendMessage?: AIChatPanelProps['onSendMessage']
  streamingContent: string
}

export function useAIChatRunState({
  agentCount,
  currentModel,
  isLoading,
  models,
  onInterrupt,
  onRegenerateResponse,
  onSendMessage,
  streamingContent,
}: UseAIChatRunStateParams) {
  const [isAIWorking, setIsAIWorking] = useState(false)
  const [runStartTime, setRunStartTime] = useState<number | null>(null)

  useEffect(() => {
    setIsAIWorking(isLoading || streamingContent.length > 0)

    if (isLoading && !runStartTime) {
      setRunStartTime(Date.now())
    } else if (!isLoading && !streamingContent && runStartTime) {
      setRunStartTime(null)
    }
  }, [isLoading, runStartTime, streamingContent])

  const selectedModel = useMemo(
    () => models.find((model) => model.id === currentModel) || models[0],
    [currentModel, models]
  )

  const agents = useMemo<AgentInfo[]>(() => {
    if (agentCount <= 1) return []

    const blueprints = [
      {
        id: 'planner',
        role: 'Planner lane',
        name: 'Planner',
        idleTask: 'Ready to structure the next execution.',
        activeTask: 'Consolidating response context and goals.',
      },
      {
        id: 'builder',
        role: 'Builder lane',
        name: 'Builder',
        idleTask: 'Waiting for an execution with deep telemetry.',
        activeTask: 'Lane reserved for execution and artifact application.',
      },
      {
        id: 'reviewer',
        role: 'Reviewer lane',
        name: 'Reviewer',
        idleTask: 'Waiting for diff, tests, or additional validation.',
        activeTask: 'Lane reserved for review and loop closure.',
      },
    ] as const

    return blueprints.slice(0, agentCount).map((blueprint, index) => {
      if (!isAIWorking) {
        return {
          id: blueprint.id,
          role: blueprint.role,
          name: blueprint.name,
          currentTask: blueprint.idleTask,
          dependency: index > 0 ? blueprints[index - 1]?.name : undefined,
          status: 'idle',
          telemetry: 'unavailable',
        }
      }

      if (index === 0) {
        return {
          id: blueprint.id,
          role: blueprint.role,
          name: blueprint.name,
          currentTask: blueprint.activeTask,
          dependency: undefined,
          status: 'working',
          telemetry: 'estimated',
        }
      }

      return {
        id: blueprint.id,
        role: blueprint.role,
        name: blueprint.name,
        currentTask: 'Per-agent telemetry has not been exposed for this execution yet.',
        dependency: blueprints[index - 1]?.name,
        status: 'queued',
        telemetry: 'unavailable',
      }
    })
  }, [agentCount, isAIWorking])

  const runDuration = runStartTime ? (Date.now() - runStartTime) / 1000 : undefined
  const estimatedCost =
    runDuration && selectedModel.outputCost
      ? (runDuration * selectedModel.outputCost * 100) / 1000000
      : undefined

  const handleAgentClick = useCallback((agentId: string) => {
    log.info('Agent clicked', { agentId })
  }, [])

  const handleLiveInterrupt = useCallback(() => {
    log.info('Live interrupt triggered')
    onInterrupt?.()
  }, [onInterrupt])

  const handleLiveSendMessage = useCallback(
    (message: string) => {
      onSendMessage?.(message)
    },
    [onSendMessage]
  )

  return {
    agents,
    estimatedCost,
    handleAgentClick,
    handleLiveInterrupt,
    handleLiveSendMessage,
    isAIWorking,
    runDuration,
    selectedModel,
  }
}
