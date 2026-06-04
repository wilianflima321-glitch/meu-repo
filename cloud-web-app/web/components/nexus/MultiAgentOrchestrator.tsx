'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle, Loader2, Send, Square, Zap } from 'lucide-react'
import {
  AGENT_ROLE_PROFILES,
  DEFAULT_AGENT_SET,
  SUPPORTED_AGENT_TYPES,
  type AgentType,
} from '@/lib/agent-orchestrator'

interface AgentStreamMessage {
  agentId: string
  agentType: string
  content: string
  thinking?: string
  timestamp: number
  status: 'pending' | 'streaming' | 'complete' | 'error'
}

type ReadyEnvelope = {
  type: 'ready'
  taskId: string
  selectedAgents: string[]
  timestamp: number
  mode?: string
  capability?: string
  capabilityStatus?: string
  disclaimer?: string
  coordination?: {
    nonOverlappingScopes?: boolean
    applyGate?: string
    executionOrder?: string[]
    selectedScopes?: Array<{ role: string; scope: string }>
  }
}

type StreamEnvelope =
  | ReadyEnvelope
  | ({ type: 'complete'; taskId: string; timestamp: number } & Record<string, unknown>)
  | ({ type: 'error'; error: string; taskId?: string; timestamp?: number } & Record<string, unknown>)
  | AgentStreamMessage

function mergeIncomingMessage(previous: AgentStreamMessage[], incoming: AgentStreamMessage): AgentStreamMessage[] {
  if (incoming.status === 'streaming') {
    const lastIndex = [...previous]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(({ message }) => message.agentId === incoming.agentId && message.status === 'streaming')?.index

    if (typeof lastIndex === 'number') {
      const next = [...previous]
      const current = next[lastIndex]
      next[lastIndex] = {
        ...current,
        content: `${current.content}${current.content && incoming.content ? ' ' : ''}${incoming.content}`,
        timestamp: incoming.timestamp,
        thinking: incoming.thinking ?? current.thinking,
      }
      return next
    }
  }

  if (incoming.status === 'complete') {
    const lastIndex = [...previous]
      .map((message, index) => ({ message, index }))
      .reverse()
      .find(({ message }) => message.agentId === incoming.agentId)?.index

    if (typeof lastIndex === 'number') {
      const next = [...previous]
      next[lastIndex] = {
        ...next[lastIndex],
        status: 'complete',
        timestamp: incoming.timestamp,
      }
      return next
    }
  }

  return [...previous, incoming]
}

export default function MultiAgentOrchestrator() {
  const [prompt, setPrompt] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [messages, setMessages] = useState<AgentStreamMessage[]>([])
  const [selectedAgents, setSelectedAgents] = useState<AgentType[]>([...DEFAULT_AGENT_SET])
  const [streamError, setStreamError] = useState<string | null>(null)
  const [runtimeMode, setRuntimeMode] = useState<'heuristic' | 'provider-backed' | 'unknown'>('unknown')
  const [runtimeDisclaimer, setRuntimeDisclaimer] = useState<string | null>(null)
  const [coordinationHint, setCoordinationHint] = useState<string | null>(null)
  const [executionMode, setExecutionMode] = useState<'heuristic' | 'provider-backed'>('heuristic')
  const abortControllerRef = useRef<AbortController | null>(null)

  const agentOptions = SUPPORTED_AGENT_TYPES.map((id) => ({
    id,
    label: AGENT_ROLE_PROFILES[id].name,
  }))

  const presetAgentSets: Array<{ label: string; agents: AgentType[] }> = [
    { label: 'Core', agents: [...DEFAULT_AGENT_SET] },
    {
      label: 'Research',
      agents: ['researcher', 'fact-checker', 'summarizer', 'paper-reader', 'dataset-scout', 'huggingface-curator', 'github-cartographer'],
    },
    {
      label: 'Creative',
      agents: ['game-designer', 'gameplay-engineer', 'cinematic-director', 'audio-composer', 'asset-pipeline', 'qa'],
    },
    {
      label: 'Release',
      agents: ['architect', 'security-auditor', 'performance-engineer', 'cost-governor', 'release-manager', 'devops-operator'],
    },
  ]

  const stopStream = () => {
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setIsStreaming(false)
  }

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
    }
  }, [])

  const handleStream = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!prompt.trim() || selectedAgents.length === 0 || isStreaming) return

    setIsStreaming(true)
    setMessages([])
    setStreamError(null)
    setRuntimeMode('unknown')
    setRuntimeDisclaimer(null)
    setCoordinationHint(null)

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch('/api/agents/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agents: selectedAgents,
          priority: 'high',
          executionMode,
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = payload?.message || payload?.error || `Stream failed with status ${response.status}`
        setStreamError(String(message))
        setIsStreaming(false)
        return
      }

      const reader = response.body?.getReader()
      if (!reader) {
        setStreamError('No streaming reader available.')
        setIsStreaming(false)
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue

          try {
            const payload = JSON.parse(line.slice(6)) as StreamEnvelope
            const envelopeType = (payload as { type?: string }).type

            if (envelopeType === 'ready') {
              const readyPayload = payload as ReadyEnvelope
              setRuntimeMode(
                readyPayload.mode === 'provider-backed'
                  ? 'provider-backed'
                  : readyPayload.mode === 'heuristic'
                    ? 'heuristic'
                    : 'unknown'
              )
              setRuntimeDisclaimer(readyPayload.disclaimer || null)
              if (readyPayload.coordination?.nonOverlappingScopes) {
                const ordered = (readyPayload.coordination.executionOrder || [])
                  .map((value) => value.toUpperCase())
                  .join(' -> ')
                setCoordinationHint(
                  ordered
                    ? `No-overlap enabled. Execution order: ${ordered}. Apply gate: reviewer required.`
                    : 'No-overlap enabled with reviewer-required apply gate.'
                )
              } else {
                setCoordinationHint(null)
              }
              continue
            }
            if (envelopeType === 'complete') {
              setIsStreaming(false)
              continue
            }
            if (envelopeType === 'error') {
              setStreamError(String((payload as Extract<StreamEnvelope, { type: 'error' }>).error || 'Stream error'))
              setIsStreaming(false)
              continue
            }

            const message = payload as AgentStreamMessage
            setMessages((previous) => mergeIncomingMessage(previous, message))
          } catch {
            // Ignore malformed SSE payload and keep stream alive.
          }
        }
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setStreamError(error instanceof Error ? error.message : 'Unexpected stream error')
      }
    } finally {
      abortControllerRef.current = null
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex h-full flex-col space-y-4 overflow-y-auto bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <div className="mb-1 flex items-center gap-3">
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-2">
          <Zap className="text-[var(--aethel-info-light)]" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider">Multi-agent orchestrator</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-[var(--aethel-text-quaternary)]">Parallel execution with explicit gates</p>
        </div>
      </div>

      {streamError && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3 text-sm text-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertCircle size={14} />
            Capability or runtime gate
          </div>
          <p>{streamError}</p>
        </div>
      )}

      {runtimeMode === 'heuristic' && (
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-warning)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-3 text-xs text-[color-mix(in_srgb,var(--aethel-warning-light)_70%,transparent)]">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertCircle size={14} />
            Heuristic mode (PARTIAL capability)
          </div>
          <p>{runtimeDisclaimer || 'Outputs are directional and still require deterministic validation before applying.'}</p>
          {coordinationHint && <p className="mt-1 text-[color-mix(in_srgb,var(--aethel-warning-light)_80%,transparent)]/90">{coordinationHint}</p>}
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[var(--aethel-text-quaternary)]">Execution mode</label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setExecutionMode('heuristic')}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              executionMode === 'heuristic'
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                : 'border-[var(--aethel-border-primary)]/50 bg-[var(--aethel-surface-tertiary)]/50 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            disabled={isStreaming}
            aria-pressed={executionMode === 'heuristic'}
          >
            Heuristico
          </button>
          <button
            type="button"
            onClick={() => setExecutionMode('provider-backed')}
            className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
              executionMode === 'provider-backed'
                ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                : 'border-[var(--aethel-border-primary)]/50 bg-[var(--aethel-surface-tertiary)]/50 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]'
            }`}
            disabled={isStreaming}
            aria-pressed={executionMode === 'provider-backed'}
          >
            Com provider
          </button>
        </div>
        <p className="text-[11px] text-[var(--aethel-text-quaternary)]">
          Heuristic mode is always available. Provider mode requires at least one configured provider.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-[var(--aethel-text-quaternary)]">Select agents</label>
        <div className="flex flex-wrap gap-2">
          {presetAgentSets.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setSelectedAgents(preset.agents)}
              className="rounded-full border border-[var(--aethel-border-primary)]/50 bg-[var(--aethel-surface-tertiary)]/50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-text-tertiary)] transition hover:text-[var(--aethel-text-primary)]"
              disabled={isStreaming}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setSelectedAgents(SUPPORTED_AGENT_TYPES)}
            className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_8%,transparent)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--aethel-info-light)] transition hover:bg-[color-mix(in_srgb,var(--aethel-info)_14%,transparent)]"
            disabled={isStreaming}
          >
            Full fleet ({SUPPORTED_AGENT_TYPES.length})
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {agentOptions.map((agent) => (
            <button
              key={agent.id}
              type="button"
              onClick={() =>
                setSelectedAgents((previous) =>
                  previous.includes(agent.id) ? previous.filter((value) => value !== agent.id) : [...previous, agent.id]
                )
              }
              className={`rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition-all ${
                selectedAgents.includes(agent.id)
                  ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                  : 'border-[var(--aethel-border-primary)]/50 bg-[var(--aethel-surface-tertiary)]/50 text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]'
              }`}
              aria-pressed={selectedAgents.includes(agent.id)}
            >
              {agent.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleStream} className="relative group">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-[var(--aethel-primary)] to-[var(--aethel-info)] opacity-20 blur transition duration-500 group-focus-within:opacity-50" />
        <div className="relative flex items-center rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-2 pl-4">
          <input
            type="text"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the task for planner, coder, and reviewer..."
            className="flex-1 bg-transparent py-2 text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] focus:outline-none"
            disabled={isStreaming}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={stopStream}
              className="ml-2 rounded-lg bg-[var(--aethel-surface-quaternary)] p-2 text-[var(--aethel-text-primary)] transition hover:bg-[var(--aethel-surface-quaternary)]"
              aria-label="Parar stream"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!prompt.trim() || selectedAgents.length === 0}
              className="ml-2 rounded-lg bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] p-2 text-[var(--aethel-text-primary)] transition-all hover:bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] disabled:opacity-50"
              aria-label="Start stream"
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </form>

      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && !isStreaming && !streamError && (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]">
              <Zap className="text-[var(--aethel-info-light)]" />
            </div>
            <h3 className="mb-2 font-semibold text-[var(--aethel-text-primary)]">Orchestration ready</h3>
            <p className="max-w-xs text-sm text-[var(--aethel-text-quaternary)]">
              Select agents and start a run. Partial capabilities remain explicitly labeled.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.agentId}-${index}`}
            className="animate-in slide-in-from-bottom-2 fade-in rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4 duration-300"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[var(--aethel-info-light)]">{message.agentType}</span>
                {message.status === 'complete' && <CheckCircle size={12} className="text-[var(--aethel-success-light)]" />}
                {message.status === 'streaming' && <Loader2 size={12} className="animate-spin text-[var(--aethel-info-light)]" />}
                {message.status === 'error' && <AlertCircle size={12} className="text-[var(--aethel-error-light)]" />}
              </div>
              <span className="font-mono text-[9px] text-[var(--aethel-text-quaternary)]">{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm leading-relaxed text-[var(--aethel-text-primary)]">{message.content}</p>
            {message.thinking && (
              <div className="mt-2 border-t border-[var(--aethel-border-primary)]/50 pt-2">
                <p className="text-[11px] italic text-[var(--aethel-text-quaternary)]">{message.thinking}</p>
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex animate-pulse items-center gap-3 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-4">
            <Loader2 size={14} className="animate-spin text-[var(--aethel-info-light)]" />
            <span className="text-xs font-medium text-[var(--aethel-text-tertiary)]">Agents running...</span>
          </div>
        )}
      </div>
    </div>
  )
}
