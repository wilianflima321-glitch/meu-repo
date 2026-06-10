'use client'

import { useCallback, useEffect, useState } from 'react'
import AgentsWindow from '@/components/agents/AgentsWindow'
import AIChatSessionBanner from '@/components/ai-chat/AIChatSessionBanner'
import type { ChatMessage } from '@/components/agents/chat/session-types'
import { useAIChatController } from '@/components/ai-chat/useAIChatController'
import { useAIChatSessionContext } from '@/components/ai-chat/useAIChatSessionContext'
import { useAIProviderPreflight } from '@/components/ai-chat/useAIProviderPreflight'
import AIChatPanelPro from '@/components/ide/AIChatPanelPro'
import AIProviderSetupGuide from '@/components/ai/AIProviderSetupGuide'
import { DEFAULT_MODELS } from '@/components/ide/AIChatPanelPro.types'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

const MODELS = DEFAULT_MODELS

type Rail = 'composer' | 'agents'

type PreviewInspectDetail = {
  message?: string
  projectId?: string
  filePath?: string
  title?: string
  source?: string
  elementInfo?: { tag: string; id?: string; className?: string; textContent?: string }
}

export type AgentsWorkspaceContainerProps = { projectId?: string }

const RAILS: { id: Rail; label: string; shortcut: string }[] = [
  { id: 'composer', label: 'Copilot', shortcut: 'Alt+C' },
  { id: 'agents', label: 'Agents', shortcut: 'Alt+A' },
]

export default function AgentsWorkspaceContainer({ projectId: workspaceProjectId }: AgentsWorkspaceContainerProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [currentModel, setCurrentModel] = useState(MODELS[0].id)
  const [isLoading, setIsLoading] = useState(false)
  const [projectId, setProjectId] = useState<string | undefined>(workspaceProjectId)
  const [mission, setMission] = useState<string | null>(null)
  const [source, setSource] = useState<string | null>(null)
  const [activeRail, setActiveRail] = useState<Rail>('composer')
  const [designMode, setDesignMode] = useState(false)

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
    (prompt: string) => { void handleSendMessage(prompt) },
    [handleSendMessage],
  )

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('aethel.preview.designMode', {
      detail: { enabled: designMode, source: 'ai-chat' },
    }))

    return () => {
      window.dispatchEvent(new CustomEvent('aethel.preview.designMode', {
        detail: { enabled: false, source: 'ai-chat' },
      }))
    }
  }, [designMode])

  // Preview inspector bridge. It stays inert until Design Mode is armed.
  useEffect(() => {
    const handler = (event: Event) => {
      if (!designMode) return

      const detail = (event as CustomEvent<PreviewInspectDetail>).detail
      if (!detail?.message) return

      const el = detail.elementInfo
      const selector = el
        ? [el.tag, el.id ? `#${el.id}` : '', el.className ? `.${el.className}` : ''].join('')
        : 'selected element'
      const prompt = [
        `Design inspect: ${detail.message}`,
        `Target: ${selector}`,
        detail.filePath ? `File: ${detail.filePath}` : null,
        el?.textContent ? `Visible text: "${el.textContent}"` : null,
        'Return the smallest safe diff with validation steps, rollback note, and evidence.',
      ].filter(Boolean).join('\n')

      setActiveRail('composer')
      setSource(detail.source ?? 'design-inspector')
      setMission(detail.message)
      if (detail.projectId) setProjectId(detail.projectId)
      void handleSendMessage(prompt)
    }

    window.addEventListener('aethel.preview.inspectRequest', handler)
    return () => window.removeEventListener('aethel.preview.inspectRequest', handler)
  }, [designMode, handleSendMessage])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.altKey) return
      if (e.key.toLowerCase() === 'c') { e.preventDefault(); setActiveRail('composer') }
      if (e.key.toLowerCase() === 'a') { e.preventDefault(); setActiveRail('agents') }
      if (e.key.toLowerCase() === 'd') { e.preventDefault(); setDesignMode((v) => !v) }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-full min-h-0 flex-col" data-ai-cockpit-rail="compact">
      <div
        className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_84%,transparent)] px-2.5 py-1.5"
        role="tablist"
        aria-label="AI panel rail"
      >
        <div className="flex items-center gap-1 rounded-xl border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] p-0.5">
          {RAILS.map(({ id, label }) => {
            const active = activeRail === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveRail(id)}
                title={`${label} (${RAILS.find((rail) => rail.id === id)?.shortcut ?? ''})`}
                className={[
                  'rounded-lg px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.13em] transition-all',
                  focusClass,
                  active
                    ? 'bg-[var(--aethel-surface-elevated)] text-[var(--aethel-text-primary)] shadow-[var(--aethel-shadow-soft)]'
                    : 'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            title="Design Mode: arm preview inspect events (Alt+D)"
            onClick={() => setDesignMode((v) => !v)}
            aria-pressed={designMode}
            className={[
              'rounded-md border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all',
              focusClass,
              designMode
                ? 'border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_14%,transparent)] text-[var(--aethel-primary-light)]'
                : 'border-[var(--aethel-border-subtle)] text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]',
            ].join(' ')}
          >
            {designMode ? 'Design' : 'Inspect'}
          </button>

          <div className="hidden items-center gap-1 sm:flex">
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
              cost metered
            </span>
            <span className="rounded-full border border-[var(--aethel-border-subtle)] px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] text-[var(--aethel-text-quaternary)]">
              replay ready
            </span>
          </div>
        </div>
      </div>

      {designMode && (
        <div className="flex shrink-0 items-center gap-2 border-b border-[color-mix(in_srgb,var(--aethel-primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_8%,transparent)] px-3 py-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aethel-primary-light)]" aria-hidden="true" />
          <p className="text-[11px] text-[var(--aethel-primary-light)]">
            <strong className="font-semibold">Design Mode active</strong> - preview inspect events create scoped edit requests here.
          </p>
          <button
            type="button"
            onClick={() => setDesignMode(false)}
            className={`ml-auto rounded text-[10px] text-[var(--aethel-primary-light)] hover:opacity-70 ${focusClass}`}
            aria-label="Exit Design Mode"
          >
            Exit
          </button>
        </div>
      )}

      {activeRail === 'agents' ? (
        <AgentsWindow projectId={projectId} className="min-h-0 flex-1" />
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
                <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-info-light)]">
                  Demo available:{' '}
                  {typeof providerStatus?.demoDailyLimit === 'number' ? providerStatus.demoDailyLimit : 5} guided replies/day without a provider.
                </div>
              )}
            </div>
          )}

          {lastFailedMessage && !isLoading && (
            <div className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-error)_26%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] px-3 py-2 text-[11px] text-[var(--aethel-error-light)]">
              <span>Last message failed to send.</span>
              <button
                type="button"
                onClick={() => void handleSendMessage(lastFailedMessage)}
                aria-label="Retry failed message"
                className={`rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_18%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] hover:opacity-80 ${focusClass}`}
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
