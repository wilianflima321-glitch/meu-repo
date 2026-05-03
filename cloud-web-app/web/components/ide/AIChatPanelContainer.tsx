'use client'

import { useCallback, useState } from 'react'
import AIChatSessionBanner from '@/components/ai-chat/AIChatSessionBanner'
import type { ChatMessage } from '@/components/ai-chat/ai-chat-container.types'
import { useAIChatController } from '@/components/ai-chat/useAIChatController'
import { useAIChatSessionContext } from '@/components/ai-chat/useAIChatSessionContext'
import { useAIProviderPreflight } from '@/components/ai-chat/useAIProviderPreflight'
import AIChatPanelPro from '@/components/ide/AIChatPanelPro'
import AIProviderSetupGuide from '@/components/ai/AIProviderSetupGuide'
import { DEFAULT_MODELS } from '@/components/ide/AIChatPanelPro.types'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

const MODELS = DEFAULT_MODELS

export default function AIChatPanelContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentModel, setCurrentModel] = useState(MODELS[0].id)
  const [isLoading, setIsLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | undefined>(undefined)
  const [mission, setMission] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  useAIChatSessionContext({
    currentModel,
    setMessages,
    setMission,
    setProjectId,
    setSource,
  })

  const { providerGate, providerStatus, setProviderGate } = useAIProviderPreflight()
  const { handleClearChat, handleSendMessage, handleStopGenerating, lastFailedMessage } =
    useAIChatController({
      currentModel,
      isLoading,
      messages,
      projectId,
      providerGate,
      providerStatus,
      setIsLoading,
      setMessages,
      setProviderGate,
    })

  const handleIntent = useCallback(
    (prompt: string) => {
      void handleSendMessage(prompt)
    },
    [handleSendMessage]
  )

  return (
    <div className="flex h-full flex-col">
      {(mission || source || projectId) && (
        <AIChatSessionBanner
          mission={mission}
          source={source}
          projectId={projectId}
          focusClass={focusClass}
          onIntent={handleIntent}
        />
      )}
      {providerGate && (
        <div className="mx-3 mt-3 space-y-2">
          <AIProviderSetupGuide
            source="ide"
            compact
            message={providerGate.message}
            capability={providerGate.capability}
            settingsHref={providerGate.setupUrl}
          />
          {!providerStatus?.configured && !providerStatus?.demoModeEnabled && (
            <div className="rounded border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-info-light)]">
              Demo local disponivel: voce pode enviar ate{' '}
              {typeof providerStatus?.demoDailyLimit === 'number' ? providerStatus.demoDailyLimit : 5} mensagens por dia
              com resposta guiada sem provider real.
            </div>
          )}
        </div>
      )}
      {lastFailedMessage && !isLoading && (
        <div className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-error-light)]">
          <span>Failed to process the last message.</span>
          <button
            type="button"
            onClick={() => void handleSendMessage(lastFailedMessage)}
            aria-label="Tentar novamente a ultima mensagem com falha"
            className={`rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] ${focusClass}`}
          >
            Tentar novamente
          </button>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <AIChatPanelPro
          messages={messages}
          onSendMessage={handleSendMessage}
          onInterrupt={handleStopGenerating}
          onClearChat={handleClearChat}
          isLoading={isLoading}
          currentModel={currentModel}
          models={MODELS}
          onModelChange={setCurrentModel}
          allowAttachments={false}
          projectId={projectId}
        />
      </div>
    </div>
  )
}
