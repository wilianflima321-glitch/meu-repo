'use client'

import React, { useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle, Loader2, Send, Square, Zap } from 'lucide-react'

interface AgentStreamMessage {
  agentId: string
  agentType: string
  content: string
  thinking?: string
  timestamp: number
  status: 'pending' | 'streaming' | 'complete' | 'error'
}

type StreamEnvelope =
  | ({ type: 'ready'; taskId: string; selectedAgents: string[]; timestamp: number } & Record<string, unknown>)
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
  const [selectedAgents, setSelectedAgents] = useState(['architect', 'designer', 'engineer'])
  const [streamError, setStreamError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const agentOptions = [
    { id: 'architect', label: 'Architect' },
    { id: 'designer', label: 'Designer' },
    { id: 'engineer', label: 'Engineer' },
    { id: 'qa', label: 'QA' },
    { id: 'researcher', label: 'Researcher' },
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
    <div className="flex h-full flex-col space-y-4 overflow-y-auto bg-zinc-950 p-6 text-zinc-100">
      <div className="mb-1 flex items-center gap-3">
        <div className="rounded-lg border border-purple-500/30 bg-purple-600/20 p-2">
          <Zap className="text-purple-400" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider">Multi-Agent Orchestrator</h2>
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">Parallel execution with explicit gates</p>
        </div>
      </div>

      {streamError && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <div className="mb-1 flex items-center gap-2 font-semibold">
            <AlertCircle size={14} />
            Capability or runtime gate
          </div>
          <p>{streamError}</p>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-widest text-zinc-500">Select Agents</label>
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
                  ? 'border-purple-500/50 bg-purple-600/30 text-purple-300'
                  : 'border-zinc-700/50 bg-zinc-800/50 text-zinc-500 hover:text-zinc-300'
              }`}
              aria-pressed={selectedAgents.includes(agent.id)}
            >
              {agent.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleStream} className="relative group">
        <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 opacity-20 blur transition duration-500 group-focus-within:opacity-50" />
        <div className="relative flex items-center rounded-xl border border-zinc-800 bg-zinc-900 p-2 pl-4">
          <input
            type="text"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Describe the task for planner/coder/reviewer..."
            className="flex-1 bg-transparent py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none"
            disabled={isStreaming}
          />

          {isStreaming ? (
            <button
              type="button"
              onClick={stopStream}
              className="ml-2 rounded-lg bg-zinc-700 p-2 text-white transition hover:bg-zinc-600"
              aria-label="Stop stream"
            >
              <Square size={18} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!prompt.trim() || selectedAgents.length === 0}
              className="ml-2 rounded-lg bg-purple-600 p-2 text-white transition-all hover:bg-purple-500 disabled:opacity-50"
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
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-500/30 bg-purple-600/20">
              <Zap className="text-purple-400" />
            </div>
            <h3 className="mb-2 font-semibold text-zinc-100">Orchestration Ready</h3>
            <p className="max-w-xs text-sm text-zinc-500">
              Select the agents and start a run. Partial capabilities stay explicitly gated.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={`${message.agentId}-${index}`}
            className="animate-in slide-in-from-bottom-2 fade-in rounded-xl border border-zinc-800 bg-zinc-900 p-4 duration-300"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">{message.agentType}</span>
                {message.status === 'complete' && <CheckCircle size={12} className="text-emerald-500" />}
                {message.status === 'streaming' && <Loader2 size={12} className="animate-spin text-blue-500" />}
                {message.status === 'error' && <AlertCircle size={12} className="text-red-500" />}
              </div>
              <span className="font-mono text-[9px] text-zinc-600">{new Date(message.timestamp).toLocaleTimeString()}</span>
            </div>
            <p className="text-sm leading-relaxed text-zinc-200">{message.content}</p>
            {message.thinking && (
              <div className="mt-2 border-t border-zinc-800/50 pt-2">
                <p className="text-[11px] italic text-zinc-500">{message.thinking}</p>
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex animate-pulse items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <Loader2 size={14} className="animate-spin text-purple-500" />
            <span className="text-xs font-medium text-zinc-400">Agents orchestrating...</span>
          </div>
        )}
      </div>
    </div>
  )
}
