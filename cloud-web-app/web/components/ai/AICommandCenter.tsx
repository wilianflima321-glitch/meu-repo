'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'
import {
  AGENTS,
  AgentExecutor,
  AgentExecution,
  AgentStep,
  Agent,
  AgentTask,
} from '../../lib/ai-agent-system'

// ============================================================================
// TIPOS
// ============================================================================

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  execution?: AgentExecution
  isStreaming?: boolean
}

interface CommandSuggestion {
  command: string
  description: string
  agentId: string
}

// ============================================================================
// SUGESTOES DE COMANDOS
// ============================================================================

const COMMAND_SUGGESTIONS: CommandSuggestion[] = [
  { command: 'Crie um cubo 3D vermelho', description: 'Cria objeto com geometria e material', agentId: 'game-designer' },
  { command: 'Gere uma textura de pedra', description: 'Gera textura procedural', agentId: 'artist' },
  { command: 'Crie um script de movimento WASD', description: 'Cria script de controle de personagem', agentId: 'coder' },
  { command: 'Gere musica de fundo ambiente', description: 'Cria trilha sonora', agentId: 'sound-designer' },
  { command: 'Crie um level de teste', description: 'Gera level basico para prototipo', agentId: 'game-designer' },
  { command: 'Analise a arquitetura do projeto', description: 'Revisa estrutura e sugere melhorias', agentId: 'architect' },
  { command: 'Crie um inimigo com IA basica', description: 'Cria personagem com comportamento', agentId: 'universal' },
  { command: 'Otimize o codigo do projeto', description: 'Analisa e melhora performance', agentId: 'coder' },
]

function resolveUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'
  return (
    localStorage.getItem('aethel.user.id') ||
    localStorage.getItem('aethel.auth.userId') ||
    'anonymous'
  )
}

function resolveProjectId(): string {
  if (typeof window === 'undefined') return 'default'
  const params = new URLSearchParams(window.location.search)
  const queryProjectId = params.get('projectId')
  return queryProjectId || localStorage.getItem('aethel.workbench.lastProjectId') || 'default'
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export function AICommandCenter() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<string>('universal')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [activeExecution, setActiveExecution] = useState<AgentExecution | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll para ultima mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Mensagem de boas-vindas
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'system',
          content:
            'Bem-vindo a Central de Comandos de IA. Sou o assistente do Aethel Engine. Posso ajudar a criar assets, scripts, texturas, sons, analisar codigo e projetar mecanicas. Selecione um agente especializado ou use o agente universal para tarefas complexas.',
          timestamp: new Date(),
        },
      ])
    }
  }, [messages.length])

  const processCommand = useCallback(
    async (command: string) => {
      if (!command.trim() || isProcessing) return

      setShowSuggestions(false)
      setIsProcessing(true)

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: command,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, userMessage])
      setInput('')

      const assistantMessageId = `assistant-${Date.now()}`
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: 'Processando...',
        timestamp: new Date(),
        isStreaming: true,
      }
      setMessages((prev) => [...prev, assistantMessage])

      try {
        const executor = new AgentExecutor(selectedAgent)
        const task: AgentTask = {
          id: `task-${Date.now()}`,
          description: command,
          executionContext: {
            userId: resolveUserId(),
            projectId: resolveProjectId(),
          },
        }

        const execution = await executor.execute(task)
        setActiveExecution(execution)

        const resultContent = formatExecutionResult(execution)
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: resultContent, execution, isStreaming: false } : msg
          )
        )
      } catch (error) {
        const errorContent = `Erro: ${
          error instanceof Error ? error.message : 'Erro desconhecido'
        }`
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId ? { ...msg, content: errorContent, isStreaming: false } : msg
          )
        )
      } finally {
        setIsProcessing(false)
      }
    },
    [selectedAgent, isProcessing]
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    processCommand(input)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      processCommand(input)
    }
  }

  const handleSuggestion = (suggestion: CommandSuggestion) => {
    setSelectedAgent(suggestion.agentId)
    processCommand(suggestion.command)
  }

  const agentList = Object.values(AGENTS)
  const selectedAgentDetails = AGENTS[selectedAgent]
  const shellClass = [
    'flex h-full flex-col overflow-hidden rounded-[24px] border border-[var(--aethel-border-subtle)]',
    'bg-[linear-gradient(180deg,color-mix(in_srgb,var(--aethel-surface-secondary)_92%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent))]',
    'shadow-[0_24px_80px_rgba(0,0,0,0.18)]',
  ].join(' ')
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  return (
    <div className={`${shellClass} text-[var(--aethel-text-primary)]`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Central de Comandos de IA</h2>
            <p className="text-xs text-[var(--aethel-text-quaternary)]">
              Agente: <span className="text-[var(--aethel-info-light)]">{AGENTS[selectedAgent]?.name}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col items-end gap-1">
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className={`rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-3 py-1.5 text-sm text-[var(--aethel-text-secondary)] ${focusClass}`}
            aria-label="Selecionar agente"
          >
            {agentList.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
          {selectedAgentDetails?.description && (
            <span className="text-[11px] text-[var(--aethel-text-quaternary)]">
              {selectedAgentDetails.description}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {showSuggestions && messages.length <= 1 && (
          <div className="mt-6">
            <p className="mb-3 text-sm text-[var(--aethel-text-tertiary)]">Sugestoes de comandos:</p>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {COMMAND_SUGGESTIONS.map((suggestion, i) => (
                <button type="button" aria-label={`Executar sugestao ${suggestion.command} com agente ${suggestion.agentId}`}
                  key={i}
                  onClick={() => handleSuggestion(suggestion)}
                  className={`group rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-3 text-left hover:border-[var(--aethel-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_85%,transparent)] ${focusClass}`}
                >
                  <p className="text-sm text-[var(--aethel-text-secondary)] group-hover:text-[var(--aethel-text-primary)]">
                    {suggestion.command}
                  </p>
                  <p className="mt-1 text-xs text-[var(--aethel-text-quaternary)]">{suggestion.description}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Execution Details */}
      {activeExecution && activeExecution.steps.length > 0 && (
        <ExecutionPanel execution={activeExecution} onClose={() => setActiveExecution(null)} />
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4"
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Descreva a tarefa... (Shift+Enter para nova linha)"
              disabled={isProcessing}
              rows={2}
              className={`w-full resize-none rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-tertiary)] px-4 py-3 text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)] disabled:opacity-50 ${focusClass}`}
              aria-label="Descrever tarefa para a central de comandos de IA"
            />
            <p className="mt-1 text-[11px] text-[var(--aethel-text-quaternary)]">
              Enter para executar | Shift+Enter para nova linha
            </p>
          </div>
          <button aria-label={isProcessing ? 'Executando agente selecionado' : 'Executar comando com o agente selecionado'}
            type="submit"
            disabled={isProcessing || !input.trim()}
            className={`flex items-center gap-2 rounded-lg bg-[var(--aethel-primary)] px-6 py-3 font-medium text-[var(--aethel-text-primary)] hover:brightness-110 disabled:cursor-not-allowed disabled:bg-[var(--aethel-surface-tertiary)] ${focusClass}`}
          >
            {isProcessing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Executando agente...
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                Executar
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

// ============================================================================
// SUB-COMPONENTES
// ============================================================================

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-lg p-4 ${
 isUser
 ? 'bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]'
 : isSystem
 ? 'bg-[var(--aethel-surface-tertiary)] border border-[var(--aethel-border-primary)]'
 : 'bg-[var(--aethel-surface-secondary)] border border-[var(--aethel-border-primary)]'
 } ${message.isStreaming ? 'animate-pulse' : ''}`}
      >
        <div
          className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap text-sm"
          dangerouslySetInnerHTML={{ __html: formatMarkdown(message.content) }}
        />
        <p className="mt-2 text-xs opacity-60">{message.timestamp.toLocaleTimeString()}</p>
      </div>
    </div>
  )
}

function ExecutionPanel({
  execution,
  onClose,
}: {
  execution: AgentExecution
  onClose: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const focusClass = `${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  return (
    <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)]">
      <button type="button" aria-label={expanded ? 'Recolher detalhes de execucao do agente' : 'Expandir detalhes de execucao do agente'}
        onClick={() => setExpanded(!expanded)}
        className={`flex w-full items-center justify-between px-4 py-2 text-sm hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] ${focusClass}`}
        aria-expanded={expanded}
        aria-controls="ai-execution-panel"
      >
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 text-[var(--aethel-info-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          {execution.steps.length} passos executados
          {execution.artifacts.length > 0 && (
            <span className="text-[var(--aethel-success-light)]">| {execution.artifacts.length} artefatos</span>
          )}
        </span>
        <svg
          className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div id="ai-execution-panel" className="max-h-64 space-y-3 overflow-y-auto px-4 pb-4">
          {execution.steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}

          {execution.artifacts.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs text-[var(--aethel-text-quaternary)]">Artefatos:</p>
              <div className="flex flex-wrap gap-2">
                {execution.artifacts.map((artifact, i) => (
                  <span
                    key={i}
                    className="rounded bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] px-2 py-1 text-xs text-[var(--aethel-success-light)]"
                  >
                    {artifact.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function StepCard({ step, index }: { step: AgentStep; index: number }) {
  return (
    <div className="rounded border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-3">
      <div className="flex items-start gap-2">
        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--aethel-surface-tertiary)] text-xs text-[var(--aethel-text-secondary)]">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--aethel-text-secondary)]">{step.thought}</p>
          {step.action && (
            <p className="mt-1 text-xs text-[var(--aethel-info-light)]">
              {'->'} {step.action.tool}
            </p>
          )}
          {step.observation && (
            <p className="mt-1 truncate text-xs text-[var(--aethel-text-quaternary)]">
              {step.observation.substring(0, 100)}...
            </p>
          )}
        </div>
        {step.result?.success !== undefined && (
          <span className={`text-xs ${step.result.success ? 'text-[var(--aethel-success-light)]' : 'text-[var(--aethel-error-light)]'}`}>
            {step.result.success ? 'ok' : 'falha'}
          </span>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// UTILIDADES
// ============================================================================

function formatExecutionResult(execution: AgentExecution): string {
  if (execution.error) {
    return `**Falha:** ${execution.error}`
  }

  if (execution.finalAnswer) {
    return execution.finalAnswer
  }

  const artifactList = execution.artifacts?.length
    ? `\n\n**Artefatos**\n${execution.artifacts.map((artifact) => `- ${artifact.name}`).join('\n')}`
    : ''

  const statusMap: Record<string, string> = {
    completed: 'concluida',
    running: 'em execucao',
    pending: 'pendente',
    failed: 'falhou',
  }

  const statusLine = execution.status === 'completed'
    ? 'Execucao concluida.'
    : `Status atual: ${statusMap[execution.status] || execution.status}.`

  return `${statusLine}${artifactList}`
}

function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*|)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*|)\*/g, '<em>$1</em>')
    .replace(/`(.*|)`/g, '<code class="bg-[var(--aethel-surface-tertiary)] px-1 rounded">$1</code>')
    .replace(/\n/g, '<br/>')
}

export default AICommandCenter


