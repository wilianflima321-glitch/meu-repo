'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type {
  AIChatPanelProps,
  ModelOption,
} from '@/components/ide/AIChatPanelPro.types'
import { createComponentLogger } from '@/lib/observability/logger'
import type { AgentInfo } from './AgentBoard'

const log = createComponentLogger('AIChatPanelPro')

interface UseAIChatRunStateParams {
  agentCount: number
  currentModel: string
  isLoading: boolean
  models: ModelOption[]
  onRegenerateResponse?: AIChatPanelProps['onRegenerateResponse']
  onSendMessage?: AIChatPanelProps['onSendMessage']
  streamingContent: string
}

export function useAIChatRunState({
  agentCount,
  currentModel,
  isLoading,
  models,
  onRegenerateResponse,
  onSendMessage,
  streamingContent,
}: UseAIChatRunStateParams) {
  const [agents, setAgents] = useState<AgentInfo[]>([])
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

  useEffect(() => {
    if (agentCount > 1 && isAIWorking) {
      const agentRoles = [
        {
          id: '1',
          role: 'Architect',
          name: 'Arquiteto',
          currentTask: 'Analisando requisitos',
          dependency: undefined,
          progress: 75,
          output: 'Estrutura definida',
          confidence: 85,
          cost: 0.0023,
          status: 'working' as const,
        },
        {
          id: '2',
          role: 'Engineer',
          name: 'Engenheiro',
          currentTask: 'Implementando componentes',
          dependency: 'Arquiteto',
          progress: 45,
          output: 'Componentes base criados',
          confidence: 78,
          cost: 0.0045,
          status: 'working' as const,
        },
        {
          id: '3',
          role: 'QA',
          name: 'QA',
          currentTask: 'Aguardando implementacao',
          dependency: 'Engenheiro',
          progress: 0,
          output: undefined,
          confidence: 0,
          cost: 0,
          status: 'idle' as const,
        },
      ]

      setAgents(agentRoles.slice(0, agentCount))
      return
    }

    setAgents([])
  }, [agentCount, isAIWorking])

  const selectedModel = useMemo(
    () => models.find((model) => model.id === currentModel) || models[0],
    [currentModel, models]
  )

  const runDuration = runStartTime ? (Date.now() - runStartTime) / 1000 : undefined
  const estimatedCost =
    runDuration && selectedModel.outputCost
      ? (runDuration * selectedModel.outputCost * 100) / 1000000
      : undefined

  const handleAgentClick = useCallback((agentId: string) => {
    log.info('Agent clicked', { agentId })
  }, [])

  const handleLiveInterrupt = useCallback(() => {
    if (onRegenerateResponse) {
      log.info('Live interrupt triggered')
    }

    setIsAIWorking(false)
  }, [onRegenerateResponse])

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
