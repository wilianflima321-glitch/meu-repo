'use client'

import React, { useState, useEffect } from 'react'
import { Zap, Loader2, CheckCircle, AlertCircle, Send } from 'lucide-react'

interface AgentStreamMessage {
  agentId: string
  agentType: string
  content: string
  thinking?: string
  timestamp: number
  status: 'pending' | 'streaming' | 'complete'
}

export default function MultiAgentOrchestrator() {
  const [prompt, setPrompt] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [messages, setMessages] = useState<AgentStreamMessage[]>([])
  const [selectedAgents, setSelectedAgents] = useState(['architect', 'designer', 'engineer'])

  const agentOptions = [
    { id: 'architect', label: 'Architect', color: 'text-blue-400' },
    { id: 'designer', label: 'Designer', color: 'text-pink-400' },
    { id: 'engineer', label: 'Engineer', color: 'text-emerald-400' },
    { id: 'qa', label: 'QA', color: 'text-amber-400' },
    { id: 'researcher', label: 'Researcher', color: 'text-purple-400' }
  ]

  const handleStream = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prompt.trim() || selectedAgents.length === 0) return

    setIsStreaming(true)
    setMessages([])

    try {
      const response = await fetch('/api/agents/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          agents: selectedAgents,
          priority: 'high'
        })
      })

      if (!response.ok) throw new Error('Stream failed')

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'complete') {
                setIsStreaming(false)
              } else if (data.type === 'error') {
                console.error('Stream error:', data.error)
                setIsStreaming(false)
              } else {
                setMessages(prev => [...prev, data])
              }
            } catch (e) {
              console.error('Parse error:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error)
      setIsStreaming(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
          <Zap className="text-purple-400" size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold uppercase tracking-wider">Multi-Agent Orchestrator</h2>
          <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-widest">Parallel Execution Engine</p>
        </div>
      </div>

      {/* Agent Selection */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Select Agents</label>
        <div className="flex flex-wrap gap-2">
          {agentOptions.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgents(prev =>
                prev.includes(agent.id)
                  ? prev.filter(a => a !== agent.id)
                  : [...prev, agent.id]
              )}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                selectedAgents.includes(agent.id)
                  ? 'bg-purple-600/30 border border-purple-500/50 text-purple-300'
                  : 'bg-zinc-800/50 border border-zinc-700/50 text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {agent.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <form onSubmit={handleStream} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur opacity-20 group-focus-within:opacity-50 transition duration-500"></div>
        <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-2 pl-4">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your task for the agent squad..."
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-600 text-sm focus:outline-none py-2"
            disabled={isStreaming}
          />
          <button
            type="submit"
            disabled={isStreaming || selectedAgents.length === 0}
            className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-all ml-2 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </form>

      {/* Messages Stream */}
      <div className="flex-1 space-y-4 overflow-y-auto">
        {messages.length === 0 && !isStreaming && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/30">
              <Zap className="text-purple-400" />
            </div>
            <h3 className="text-zinc-100 font-semibold mb-2">Orchestration Ready</h3>
            <p className="text-zinc-500 text-sm max-w-xs">
              Select agents and describe your task to start parallel execution.
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={`${msg.agentId}-${idx}`} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">{msg.agentType}</span>
                {msg.status === 'complete' && <CheckCircle size={12} className="text-emerald-500" />}
                {msg.status === 'streaming' && <Loader2 size={12} className="text-blue-500 animate-spin" />}
              </div>
              <span className="text-[9px] text-zinc-600 font-mono">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </span>
            </div>
            <p className="text-sm text-zinc-200 leading-relaxed">{msg.content}</p>
            {msg.thinking && (
              <div className="mt-2 pt-2 border-t border-zinc-800/50">
                <p className="text-[11px] text-zinc-500 italic">{msg.thinking}</p>
              </div>
            )}
          </div>
        ))}

        {isStreaming && (
          <div className="flex items-center gap-3 p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl animate-pulse">
            <Loader2 size={14} className="text-purple-500 animate-spin" />
            <span className="text-xs text-zinc-400 font-medium">Agents orchestrating...</span>
          </div>
        )}
      </div>
    </div>
  )
}
