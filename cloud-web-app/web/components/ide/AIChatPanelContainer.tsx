'use client'

import { useCallback, useState } from 'react'
import AgentsWindow from '@/components/agents/AgentsWindow'
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

type AIChatPanelContainerProps = {
  projectId?: string
}

export default function AIChatPanelContainer({ projectId: workspaceProjectId }: AIChatPanelContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentModel, setCurrentModel] = useState(MODELS[0].id)
  const [isLoading, setIsLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | undefined>(workspaceProjectId)
  const [mission, setMission] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [activeRail, setActiveRail] = useState<'composer' | 'agents'>('composer')
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  useAIChatSessionContext({
    currentModel,
    fallbackProjectId: workspaceProjectId,
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

  const rails = [
    { id: 'composer' as const, label: 'Composer', hint: 'Chat, voice, files' },
    { id: 'agents' as const, label: 'Agents', hint: 'Locks, replay, cost' },
  ]

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-1 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_84%,transparent)] px-3 py-2" role="tablist" aria-label="AI cockpit rail">
        {rails.map((rail) => {
          const active = activeRail === rail.id
          return (
            <button
              key={rail.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveRail(rail.id)}
              className={`rounded-lg px-3 py-1.5 text-left ${focusClass} ${
                active
                  ? 'bg-[var(--aethel-surface-elevated)] text-[var(--aethel-text-primary)] shadow-[var(--aethel-shadow-soft)]'
                  : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]'
              }`}
            >
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em]">{rail.label}</span>
              <span className="block text-[10px] normal-case tracking-normal text-[var(--aethel-text-muted)]">{rail.hint}</span>
            </button>
          )
        })}
      </div>

      {activeRail === 'agents' ? (
        <AgentsWindow projectId={projectId} />
      ) : (
        <>
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
                  Local demo available: you can send up to{' '}
                  {typeof providerStatus?.demoDailyLimit === 'number' ? providerStatus.demoDailyLimit : 5} guided replies per day without a live provider.
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
                aria-label="Retry the last failed message"
                className={`rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-error-light)] hover:bg-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] ${focusClass}`}
              >
                Retry
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
        </>
      )}
    </div>
  )
}
