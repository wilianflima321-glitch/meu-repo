'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, RefreshCw, Play, AlertTriangle } from 'lucide-react'

interface TaskStep {
  id: string
  title: string
  status: 'pending' | 'running' | 'blocked' | 'failed' | 'done'
  startedAt?: string
  finishedAt?: string
  notes?: string
}

interface TaskLogEntry {
  timestamp: string
  level: 'info' | 'warning' | 'error'
  message: string
  metadata?: Record<string, unknown>
}

interface TaskRecord {
  id: string
  goal: string
  status: 'pending' | 'planned' | 'running' | 'blocked' | 'failed' | 'done'
  steps: TaskStep[]
  logs: TaskLogEntry[]
  error?: string
  createdAt: string
  updatedAt: string
}

interface TaskOpsPanelProps {
  projectId?: string
  defaultGoal?: string
}

const STATUS_LABELS: Record<TaskRecord['status'], string> = {
  pending: 'pendente',
  planned: 'planejado',
  running: 'executando',
  blocked: 'bloqueado',
  failed: 'falhou',
  done: 'concluído',
}

const STATUS_TONES: Record<TaskRecord['status'], string> = {
  pending: 'text-[var(--aethel-text-tertiary)]',
  planned: 'text-[var(--aethel-info-light)]',
  running: 'text-[var(--aethel-info-light)]',
  blocked: 'text-[var(--aethel-warning-light)]',
  failed: 'text-[var(--aethel-error-light)]',
  done: 'text-[var(--aethel-success-light)]',
}

function getTaskStorageKey(projectId?: string) {
  return `aethel.ai.taskId.${projectId || 'default'}`
}

function formatTimestamp(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  } catch {
    return value
  }
}

export function TaskOpsPanel({ projectId, defaultGoal = '' }: TaskOpsPanelProps) {
  const storageKey = useMemo(() => getTaskStorageKey(projectId), [projectId])
  const [goal, setGoal] = useState(defaultGoal)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [task, setTask] = useState<TaskRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPlanning, setIsPlanning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (!defaultGoal) return
    setGoal((prev) => (prev.trim().length ? prev : defaultGoal))
  }, [defaultGoal])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = window.localStorage.getItem(storageKey)
    if (stored) {
      setTaskId(stored)
    }
  }, [storageKey])

  const loadTask = useCallback(async (id: string) => {
    setIsRefreshing(true)
    setError(null)
    try {
      const response = await fetch(`/api/studio/tasks/${id}`)
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.message || payload?.error || 'Falha ao carregar a tarefa.')
        setTask(null)
        return
      }
      setTask(payload?.task ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar a tarefa.')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (taskId) {
      void loadTask(taskId)
    }
  }, [taskId, loadTask])

  const handlePlan = useCallback(async () => {
    if (!goal.trim()) {
      setError('Defina um objetivo para criar o plano.')
      return
    }
    setIsPlanning(true)
    setError(null)
    try {
      const response = await fetch('/api/studio/tasks/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim(), projectId }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.message || payload?.error || 'Falha ao criar o plano.')
        return
      }
      const nextTask: TaskRecord | null = payload?.metadata?.task ?? null
      if (!nextTask?.id) {
        setError('Plano criado sem ID de tarefa. Verifique o backend.')
        return
      }
      setTaskId(nextTask.id)
      setTask(nextTask)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, nextTask.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao criar o plano.')
    } finally {
      setIsPlanning(false)
    }
  }, [goal, projectId, storageKey])

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)]">
      <div className="flex items-center justify-between border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-4 py-3">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-[var(--aethel-info-light)]" />
          <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Execução real</span>
        </div>
        <button
          type="button"
          onClick={() => taskId && loadTask(taskId)}
          disabled={!taskId || isRefreshing}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_50%,transparent)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      <div className="border-b border-[var(--aethel-border-primary)] p-3">
        <label className="mb-1 block text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">
          Objetivo do plano
        </label>
        <textarea
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_60%,transparent)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] outline-none transition focus:border-[color-mix(in_srgb,var(--aethel-info)_60%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]"
          placeholder="Descreva o que precisa ser executado com evidência real..."
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-[var(--aethel-text-tertiary)]">
            {taskId ? `Tarefa ativa: ${taskId}` : 'Nenhuma tarefa ativa'}
          </span>
          <button
            type="button"
            onClick={handlePlan}
            disabled={isPlanning}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--aethel-primary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:brightness-110 disabled:opacity-60"
          >
            <Play className="h-3.5 w-3.5" />
            Criar plano
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-2 py-1.5 text-[11px] text-[var(--aethel-error-light)]">
            {error}
          </div>
        )}
      </div>

      {!task && (
        <div className="flex flex-1 items-center justify-center p-4 text-xs text-[var(--aethel-text-tertiary)]">
          Crie um plano para acompanhar a execução.
        </div>
      )}

      {task && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--aethel-text-primary)]">{task.goal}</p>
                <p className="text-[10px] text-[var(--aethel-text-tertiary)]">Criado em {formatTimestamp(task.createdAt)}</p>
              </div>
              <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${STATUS_TONES[task.status]}`}>
                {STATUS_LABELS[task.status]}
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Etapas</p>
            <div className="space-y-2">
              {task.steps.map((step) => (
                <div key={step.id} className="flex items-start justify-between rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] px-3 py-2">
                  <div>
                    <p className="text-xs font-medium text-[var(--aethel-text-primary)]">{step.title}</p>
                    <p className="text-[10px] text-[var(--aethel-text-tertiary)]">
                      {formatTimestamp(step.startedAt)} → {formatTimestamp(step.finishedAt)}
                    </p>
                  </div>
                  <span className={`text-[10px] uppercase tracking-[0.12em] ${STATUS_TONES[step.status]}`}>
                    {step.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_70%,transparent)] p-3">
            <p className="mb-2 text-[10px] uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Logs</p>
            {task.logs.length === 0 ? (
              <div className="text-xs text-[var(--aethel-text-tertiary)]">Sem logs registrados.</div>
            ) : (
              <div className="space-y-2">
                {task.logs.map((log, index) => (
                  <div key={`${log.timestamp}-${index}`} className="rounded-md border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-2.5 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-[var(--aethel-text-tertiary)]">{formatTimestamp(log.timestamp)}</span>
                      <span className={`text-[10px] uppercase tracking-[0.12em] ${STATUS_TONES[log.level === 'info' ? 'planned' : log.level === 'warning' ? 'blocked' : 'failed']}`}>
                        {log.level}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--aethel-text-secondary)]">{log.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {task.error && (
            <div className="flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-3 py-2 text-xs text-[var(--aethel-error-light)]">
              <AlertTriangle className="h-4 w-4" />
              {task.error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
