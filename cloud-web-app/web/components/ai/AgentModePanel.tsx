'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  Play,
  Pause,
  Square,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Brain,
  Zap,
  MessageSquare,
  Terminal,
  FileCode,
  Search,
  Settings,
  Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Textarea } from '@/components/ui/Textarea'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { AutonomousAgent, AgentTask, AgentStep } from '@/lib/ai/agent-mode'

/**
 * Agent Mode Panel - Interface do modo agente autonomo
 */

interface AgentModePanelProps {
  isOpen: boolean
  onClose: () => void
}

export function AgentModePanel({ isOpen, onClose }: AgentModePanelProps) {
  const [input, setInput] = useState('')
  const [agent] = useState(
    () =>
      new AutonomousAgent({
        autonomyLevel: 'semi-autonomous',
        requireApproval: true,
        enableSelfCorrection: true,
      }),
  )

  const [task, setTask] = useState<AgentTask | null>(null)
  const [steps, setSteps] = useState<AgentStep[]>([])
  const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'failed'>('idle')
  const [progress, setProgress] = useState(0)
  const [pendingApproval, setPendingApproval] = useState<any>(null)
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleTaskStarted = (t: AgentTask) => {
      setTask(t)
      setStatus('running')
    }

    const handleTaskCompleted = (t: AgentTask) => {
      setTask(t)
      setStatus('completed')
    }

    const handleTaskFailed = (t: AgentTask) => {
      setTask(t)
      setStatus('failed')
    }

    const handleStepAdded = (step: AgentStep) => {
      setSteps((prev) => [...prev, step])
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
      }, 100)
    }

    const handleProgress = ({ progress: p }: { progress: number }) => {
      setProgress(p)
    }

    const handleApprovalNeeded = (approval: any) => {
      setPendingApproval(approval)
    }

    const handlePaused = () => {
      setStatus('paused')
    }

    const handleResumed = () => {
      setStatus('running')
    }

    agent.on('task:started', handleTaskStarted)
    agent.on('task:completed', handleTaskCompleted)
    agent.on('task:failed', handleTaskFailed)
    agent.on('step:added', handleStepAdded)
    agent.on('agent:progress', handleProgress)
    agent.on('agent:approval_needed', handleApprovalNeeded)
    agent.on('agent:paused', handlePaused)
    agent.on('agent:resumed', handleResumed)

    return () => {
      agent.removeAllListeners()
    }
  }, [agent])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || status === 'running') return

    setSteps([])
    setProgress(0)
    setPendingApproval(null)

    await agent.execute(input.trim())
    setInput('')
  }, [input, status, agent])

  const handleApprove = () => {
    if (pendingApproval) {
      pendingApproval.approve()
      setPendingApproval(null)
    }
  }

  const handleReject = () => {
    if (pendingApproval) {
      pendingApproval.reject()
      setPendingApproval(null)
    }
  }

  const handlePause = () => {
    agent.pause()
  }

  const handleResume = () => {
    agent.resume()
  }

  const handleStop = () => {
    agent.stop()
    setStatus('idle')
  }

  const toggleStepExpand = (stepId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(stepId)) {
        next.delete(stepId)
      } else {
        next.add(stepId)
      }
      return next
    })
  }

  const getStepIcon = (type: AgentStep['type']) => {
    switch (type) {
      case 'think':
        return Brain
      case 'plan':
        return FileCode
      case 'execute':
        return Zap
      case 'observe':
        return Search
      case 'reflect':
        return MessageSquare
      case 'correct':
        return Settings
      default:
        return ChevronRight
    }
  }

  const getStatusLabel = (s: typeof status) => {
    switch (s) {
      case 'running':
        return 'EM EXECUCAO'
      case 'paused':
        return 'PAUSADO'
      case 'completed':
        return 'CONCLUIDO'
      case 'failed':
        return 'FALHOU'
      default:
        return 'OCIOSO'
    }
  }

  const getStatusColor = (s: string) => {
    switch (s) {
      case 'running':
        return 'text-[var(--aethel-info-light)]'
      case 'paused':
        return 'text-[var(--aethel-warning-light)]'
      case 'completed':
        return 'text-[var(--aethel-success-light)]'
      case 'failed':
        return 'text-[var(--aethel-error-light)]'
      default:
        return 'text-[var(--aethel-text-quaternary)]'
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 bottom-0 z-50 flex w-[500px] flex-col border-l border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[var(--aethel-info-light)]" />
          <span className="font-semibold text-[var(--aethel-text-primary)]">Modo agente</span>
          <span className={cn('rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)] px-2 py-0.5 text-xs', getStatusColor(status))}>
            {getStatusLabel(status)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {status === 'running' && (
            <button type="button" variant="ghost" size="icon" onClick={handlePause} className="h-8 w-8">
              <Pause className="h-4 w-4" />
            </Button>
          )}
          {status === 'paused' && (
            <button type="button" variant="ghost" size="icon" onClick={handleResume} className="h-8 w-8">
              <Play className="h-4 w-4" />
            </Button>
          )}
          {(status === 'running' || status === 'paused') && (
            <button type="button" variant="ghost" size="icon" onClick={handleStop} className="h-8 w-8 text-[var(--aethel-error-light)]">
              <Square className="h-4 w-4" />
            </Button>
          )}
          <button type="button" variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            X
          </Button>
        </div>
      </div>

      {status === 'running' && (
        <div className="h-1 bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)]">
          <motion.div
            className="h-full bg-[var(--aethel-info)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {task && (
        <div className="border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_3%,transparent)] px-4 py-3">
          <div className="mb-2 flex items-center gap-2">
            {task.status === 'completed' && <CheckCircle className="h-4 w-4 text-[var(--aethel-success-light)]" />}
            {task.status === 'failed' && <XCircle className="h-4 w-4 text-[var(--aethel-error-light)]" />}
            {(task.status === 'executing' || task.status === 'planning') && (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--aethel-info-light)]" />
            )}
            <span className="text-sm font-medium text-[var(--aethel-text-primary)]">{task.description.slice(0, 50)}...</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-[var(--aethel-text-quaternary)]">
            <span>{task.subtasks.length} subtarefas</span>
            <span>{steps.length} passos</span>
            <span>{progress}% completo</span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {pendingApproval && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-4 mt-4 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-[var(--aethel-warning-light)]" />
              <span className="text-sm font-semibold text-[var(--aethel-warning-light)]">Aprovacao necessaria</span>
            </div>
            <p className="mb-2 text-xs text-[var(--aethel-text-secondary)]">{pendingApproval.thinking}</p>
            <div className="mb-3 rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)] p-2 text-xs font-mono text-[var(--aethel-text-tertiary)]">
              {pendingApproval.action.tool}: {JSON.stringify(pendingApproval.action.input)}
            </div>
            <div className="flex gap-2">
              <button type="button" size="sm" onClick={handleApprove} className="bg-[var(--aethel-success-dark)] hover:bg-[var(--aethel-success)]">
                <CheckCircle className="mr-1 h-3 w-3" />
                Aprovar
              </Button>
              <button type="button" size="sm" variant="outline" onClick={handleReject} className="border-[var(--aethel-error)] text-[var(--aethel-error-light)]">
                <XCircle className="mr-1 h-3 w-3" />
                Rejeitar
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-2">
          {steps.map((step) => {
            const StepIcon = getStepIcon(step.type)
            const isExpanded = expandedSteps.has(step.id)

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="overflow-hidden rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_3%,transparent)]"
              >
                <button type="button"
                  onClick={() => toggleStepExpand(step.id)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_82%,transparent)]"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-[var(--aethel-text-quaternary)]" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-[var(--aethel-text-quaternary)]" />
                  )}
                  <StepIcon
                    className={cn(
                      'h-4 w-4',
                      step.type === 'think' && 'text-[var(--aethel-info-light)]',
                      step.type === 'plan' && 'text-[var(--aethel-info-light)]',
                      step.type === 'execute' && 'text-[var(--aethel-success-light)]',
                      step.type === 'observe' && 'text-[var(--aethel-warning-light)]',
                      step.type === 'reflect' && 'text-[var(--aethel-info-light)]',
                      step.type === 'correct' && 'text-[var(--aethel-warning-light)]',
                    )}
                  />
                  <span className="font-medium text-[var(--aethel-text-secondary)] capitalize">{step.type}</span>
                  <span className="flex-1 truncate text-[var(--aethel-text-quaternary)]">{step.content.slice(0, 40)}...</span>
                  <span className="text-[var(--aethel-text-quaternary)]">{new Date(step.timestamp).toLocaleTimeString()}</span>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                      <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_2%,transparent)] px-3 py-2">
                        <p className="whitespace-pre-wrap text-xs text-[var(--aethel-text-tertiary)]">{step.content}</p>

                        {step.toolCalls && step.toolCalls.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {step.toolCalls.map((tc) => (
                              <div key={tc.id} className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_5%,transparent)] p-2 text-xs">
                                <div className="mb-1 flex items-center gap-2">
                                  <Terminal className="h-3 w-3 text-[var(--aethel-text-quaternary)]" />
                                  <span className="font-mono text-[var(--aethel-info-light)]">{tc.tool}</span>
                                  <span
                                    className={cn(
                                      'rounded px-1 py-0.5 text-[10px]',
                                      tc.status === 'success' && 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success-light)]',
                                      tc.status === 'failed' && 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error-light)]',
                                      tc.status === 'running' && 'bg-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)] text-[var(--aethel-info-light)]',
                                    )}
                                  >
                                    {tc.status}
                                  </span>
                                </div>
                                <pre className="max-h-20 overflow-auto text-[var(--aethel-text-quaternary)]">
                                  {JSON.stringify(tc.input, null, 2)}
                                </pre>
                                {tc.output && (
                                  <pre className="mt-1 max-h-20 overflow-auto text-[var(--aethel-success-light)]">
                                    {typeof tc.output === 'string'
                                      ? tc.output.slice(0, 200)
                                      : JSON.stringify(tc.output, null, 2).slice(0, 200)}
                                  </pre>
                                )}
                                {tc.error && <pre className="mt-1 text-[var(--aethel-error-light)]">{tc.error}</pre>}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          {steps.length === 0 && status === 'idle' && (
            <div className="py-12 text-center">
              <Bot className="mx-auto mb-4 h-12 w-12 text-[var(--aethel-text-primary)]/20" />
              <p className="text-sm text-[var(--aethel-text-quaternary)]">Descreva uma tarefa e o agente vai executar autonomamente</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="border-t border-[var(--aethel-border-primary)] p-4">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Descreva a tarefa para o agente executar..."
            className="min-h-[80px] border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_3%,transparent)] text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] pr-12"
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault()
                handleSubmit()
              }
            }}
            disabled={status === 'running'}
          />
          <button type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={!input.trim() || status === 'running'}
            className="absolute bottom-2 right-2 h-8 w-8 bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-primary-dark)]"
          >
            {status === 'running' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--aethel-text-quaternary)]">
          Pressione <kbd className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)] px-1">Ctrl</kbd> +{' '}
          <kbd className="rounded bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_10%,transparent)] px-1">Enter</kbd> para enviar
        </p>
      </div>
    </motion.div>
  )
}

export default AgentModePanel
