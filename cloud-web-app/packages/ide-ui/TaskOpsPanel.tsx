'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ClipboardList, RefreshCw, Play, AlertTriangle, Info, X, CheckCircle2, Clock, Loader2, ArrowRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentStepStatus = 'pending' | 'running' | 'ok' | 'error' | 'skipped'

export interface AgentSession {
  projectId: string
  steps: {
    id: string
    kind: string
    label: string
    detail?: string
    status: AgentStepStatus
  }[]
}

export function buildLocalAgentPlanPreview(ctx: { projectId: string }, goal: string): AgentSession {
  return {
    projectId: ctx.projectId,
    steps: [
      { id: '1', kind: 'PLAN', label: 'Draft plan for: ' + goal, status: 'ok' },
      { id: '2', kind: 'EXECUTE', label: 'Execution requires connected backend.', status: 'skipped' },
    ]
  }
}

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

// ─── Status UI Config ─────────────────────────────────────────────────────────

type StatusConfig = {
  label: string
  color: string
  bg: string
  border: string
  Icon: React.ElementType
}

const TASK_STATUS_CONFIG: Record<TaskRecord['status'], StatusConfig> = {
  pending: { label: 'PENDING', color: 'var(--aethel-text-quaternary)', bg: 'color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)', border: 'color-mix(in srgb, var(--aethel-text-quaternary) 20%, transparent)', Icon: Clock },
  planned: { label: 'PLANNED', color: 'var(--aethel-info)', bg: 'color-mix(in srgb, var(--aethel-info) 10%, transparent)', border: 'color-mix(in srgb, var(--aethel-info) 20%, transparent)', Icon: ClipboardList },
  running: { label: 'RUNNING', color: 'var(--aethel-primary)', bg: 'color-mix(in srgb, var(--aethel-primary) 10%, transparent)', border: 'color-mix(in srgb, var(--aethel-primary) 20%, transparent)', Icon: Loader2 },
  blocked: { label: 'BLOCKED', color: 'var(--aethel-warning)', bg: 'color-mix(in srgb, var(--aethel-warning) 10%, transparent)', border: 'color-mix(in srgb, var(--aethel-warning) 20%, transparent)', Icon: AlertTriangle },
  failed:  { label: 'FAILED',  color: 'var(--aethel-error)', bg: 'color-mix(in srgb, var(--aethel-error) 10%, transparent)',  border: 'color-mix(in srgb, var(--aethel-error) 20%, transparent)',  Icon: X },
  done:    { label: 'DONE',    color: 'var(--aethel-success)', bg: 'color-mix(in srgb, var(--aethel-success) 10%, transparent)',  border: 'color-mix(in srgb, var(--aethel-success) 20%, transparent)',  Icon: CheckCircle2 },
}

const STEP_STATUS_CONFIG: Record<TaskStep['status'], StatusConfig> = TASK_STATUS_CONFIG

function getTaskStorageKey(projectId?: string) {
  return `aethel.ai.taskId.${projectId || 'default'}`
}

function formatTimestamp(value?: string) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })
  } catch {
    return value
  }
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, config }: { status: string; config: StatusConfig }) {
  const { label, color, bg, border, Icon } = config
  const isRunning = status === 'running'
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-md border"
      style={{
        background: bg,
        borderColor: border,
        color: color,
        boxShadow: isRunning ? `0 0 8px ${bg}` : 'none',
      }}
    >
      <Icon size={10} className={isRunning ? 'animate-spin' : ''} />
      <span className="text-[9px] font-bold tracking-widest">{label}</span>
    </div>
  )
}

// ─── TaskOpsPanel ─────────────────────────────────────────────────────────────

export function TaskOpsPanel({ projectId, defaultGoal = '' }: TaskOpsPanelProps) {
  const storageKey = useMemo(() => getTaskStorageKey(projectId), [projectId])
  const [goal, setGoal] = useState(defaultGoal)
  const [taskId, setTaskId] = useState<string | null>(null)
  const [task, setTask] = useState<TaskRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPlanning, setIsPlanning] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [localAgentPreview, setLocalAgentPreview] = useState<AgentSession | null>(null)

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
        setError(payload?.message || payload?.error || 'Failed to load the task.')
        setTask(null)
        return
      }
      setTask(payload?.task ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load the task.')
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
      setError('Define a goal to create the plan.')
      return
    }
    setIsPlanning(true)
    setError(null)
    setLocalAgentPreview(null)
    try {
      const response = await fetch('/api/studio/tasks/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ goal: goal.trim(), projectId }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        setError(payload?.message || payload?.error || 'Failed to create the plan.')
        setLocalAgentPreview(
          buildLocalAgentPlanPreview({ projectId: projectId || 'default' }, goal.trim())
        )
        return
      }
      const nextTask: TaskRecord | null = payload?.metadata?.task ?? null
      if (!nextTask?.id) {
        setError('Plan was created without a task ID. Check the backend.')
        setLocalAgentPreview(
          buildLocalAgentPlanPreview({ projectId: projectId || 'default' }, goal.trim())
        )
        return
      }
      setTaskId(nextTask.id)
      setTask(nextTask)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, nextTask.id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the plan.')
      setLocalAgentPreview(
        buildLocalAgentPlanPreview({ projectId: projectId || 'default' }, goal.trim())
      )
    } finally {
      setIsPlanning(false)
    }
  }, [goal, projectId, storageKey])

  return (
    <div className="flex h-full flex-col bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] relative">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-4 z-10 flex-shrink-0"
        style={{
          height: 44,
          background: 'color-mix(in srgb, var(--aethel-surface-secondary) 85%, transparent)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md" style={{ background: 'color-mix(in srgb, var(--aethel-primary) 15%, transparent)' }}>
            <ClipboardList size={12} style={{ color: 'var(--aethel-primary-light)' }} />
          </div>
          <span className="text-xs font-bold tracking-wide" style={{ letterSpacing: '0.04em' }}>
            TASK OPS
          </span>
        </div>
        <button
          type="button"
          onClick={() => taskId && loadTask(taskId)}
          disabled={!taskId || isRefreshing}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs transition-all duration-150 disabled:opacity-40"
          style={{ color: 'var(--aethel-text-tertiary)' }}
          onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)'; e.currentTarget.style.color = 'var(--aethel-text-primary)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--aethel-text-tertiary)' }}
        >
          <RefreshCw size={12} className={isRefreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Goal Input Section ── */}
        <div className="p-4 border-b" style={{ borderColor: 'color-mix(in srgb, var(--aethel-text-quaternary) 6%, transparent)' }}>
          <label className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--aethel-text-tertiary)' }}>
            Goal Definition
          </label>
          <textarea
            value={goal}
            onChange={(event) => setGoal(event.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl text-xs outline-none transition-all duration-200"
            style={{
              background: 'color-mix(in srgb, var(--aethel-surface-secondary) 60%, transparent)',
              border: '1px solid color-mix(in srgb, var(--aethel-text-quaternary) 12%, transparent)',
              color: 'var(--aethel-text-primary)',
              padding: '12px 14px',
            }}
            onFocus={e => { e.target.style.borderColor = 'var(--aethel-primary)'; e.target.style.boxShadow = '0 0 0 1px color-mix(in srgb, var(--aethel-primary) 30%, transparent) inset' }}
            onBlur={e => { e.target.style.borderColor = 'color-mix(in srgb, var(--aethel-text-quaternary) 12%, transparent)'; e.target.style.boxShadow = 'none' }}
            placeholder="Describe what needs to run with real evidence..."
          />
          <div className="mt-3 flex items-center justify-between">
            <span className="font-mono text-[9px]" style={{ color: 'var(--aethel-text-quaternary)' }}>
              {taskId ? `ID: ${taskId.split('-')[0]}...` : 'No active task'}
            </span>
            <button
              type="button"
              onClick={handlePlan}
              disabled={isPlanning || !goal.trim()}
              className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-bold transition-all duration-150 disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, var(--aethel-primary) 0%, var(--aethel-primary-dark) 100%)',
                color: 'white',
                boxShadow: '0 4px 12px color-mix(in srgb, var(--aethel-primary) 25%, transparent)',
              }}
            >
              {isPlanning ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              Execute
            </button>
          </div>
          
          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg p-3 text-xs" style={{ background: 'color-mix(in srgb, var(--aethel-error) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--aethel-error) 20%, transparent)', color: 'var(--aethel-error-light)' }}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
              <span style={{ wordBreak: 'break-word' }}>{error}</span>
            </div>
          )}

          {/* Fallback mock UI */}
          {localAgentPreview && (
            <div className="mt-4 rounded-xl p-3 border" style={{ background: 'color-mix(in srgb, var(--aethel-primary) 5%, transparent)', borderColor: 'color-mix(in srgb, var(--aethel-primary) 20%, transparent)' }}>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-start gap-2">
                  <Info size={14} style={{ color: 'var(--aethel-primary-light)', marginTop: 2 }} />
                  <div>
                    <div className="text-[11px] font-bold" style={{ color: 'var(--aethel-primary-light)' }}>Agent Offline Mock</div>
                    <div className="text-[10px] leading-relaxed mt-1" style={{ color: 'var(--aethel-text-tertiary)' }}>
                      Backend unreachable. Showing sample plan structure.
                    </div>
                  </div>
                </div>
                <button onClick={() => setLocalAgentPreview(null)} className="text-[var(--aethel-text-quaternary)] hover:text-white"><X size={14} /></button>
              </div>
              <div className="space-y-1.5">
                {localAgentPreview.steps.map(step => (
                  <div key={step.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: 'color-mix(in srgb, var(--aethel-surface-secondary) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)' }}>{step.kind}</span>
                      <span style={{ color: 'var(--aethel-text-secondary)' }}>{step.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Active Task View ── */}
        {!task && !localAgentPreview && (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <ClipboardList size={32} style={{ color: 'color-mix(in srgb, var(--aethel-text-quaternary) 15%, transparent)', marginBottom: 12 }} />
            <p className="text-xs" style={{ color: 'var(--aethel-text-tertiary)' }}>
              Enter a goal above and click Execute to start a managed task.
            </p>
          </div>
        )}

        {task && (
          <div className="p-4 space-y-6">
            {/* Header Card */}
            <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'color-mix(in srgb, var(--aethel-surface-secondary) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)' }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold leading-relaxed" style={{ color: 'var(--aethel-text-primary)' }}>
                    {task.goal}
                  </div>
                  <div className="flex items-center gap-2 mt-2 font-mono text-[9px]" style={{ color: 'var(--aethel-text-tertiary)' }}>
                    <span>Created {formatTimestamp(task.createdAt)}</span>
                    <span>•</span>
                    <span>Updated {formatTimestamp(task.updatedAt)}</span>
                  </div>
                </div>
                <StatusBadge status={task.status} config={TASK_STATUS_CONFIG[task.status]} />
              </div>
              
              {/* Overall Progress Bar */}
              {task.steps.length > 0 && (
                <div className="mt-1">
                  <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)' }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(task.steps.filter(s => s.status === 'done').length / task.steps.length) * 100}%`,
                        background: TASK_STATUS_CONFIG[task.status].color,
                        boxShadow: `0 0 8px ${TASK_STATUS_CONFIG[task.status].bg}`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Timeline View */}
            <div>
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--aethel-text-tertiary)' }}>
                Execution Pipeline
              </div>
              
              <div className="relative pl-3 space-y-4">
                {/* Vertical line connecting steps */}
                <div className="absolute left-[17px] top-4 bottom-4 w-px" style={{ background: 'color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)' }} />
                
                {task.steps.map((step, idx) => {
                  const cfg = STEP_STATUS_CONFIG[step.status]
                  const isRunning = step.status === 'running'
                  return (
                    <div key={step.id} className="relative flex items-start gap-4 group">
                      {/* Node Dot */}
                      <div
                        className="relative z-10 flex items-center justify-center w-[11px] h-[11px] rounded-full mt-1 shrink-0 transition-all duration-300"
                        style={{
                          background: isRunning ? 'var(--aethel-surface-primary)' : cfg.bg,
                          border: `2px solid ${cfg.color}`,
                          boxShadow: isRunning ? `0 0 10px ${cfg.color}` : 'none',
                          transform: isRunning ? 'scale(1.3)' : 'scale(1)'
                        }}
                      />
                      
                      {/* Content Card */}
                      <div
                        className="flex-1 rounded-xl p-3 transition-all duration-200"
                        style={{
                          background: isRunning ? 'color-mix(in srgb, var(--aethel-surface-secondary) 80%, transparent)' : 'color-mix(in srgb, var(--aethel-surface-secondary) 40%, transparent)',
                          border: `1px solid ${isRunning ? cfg.border : 'color-mix(in srgb, var(--aethel-text-quaternary) 6%, transparent)'}`,
                          boxShadow: isRunning ? `0 4px 12px ${cfg.bg}` : 'none'
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold" style={{ color: isRunning ? 'var(--aethel-text-primary)' : 'var(--aethel-text-secondary)' }}>
                            {step.title}
                          </span>
                          <span className="font-mono text-[9px]" style={{ color: 'var(--aethel-text-quaternary)' }}>
                            {formatTimestamp(step.finishedAt || step.startedAt)}
                          </span>
                        </div>
                        {step.notes && (
                          <div className="text-[11px] mt-2 p-2 rounded bg-[color-mix(in_srgb,black_20%,transparent)] border border-[color-mix(in_srgb,white_2%,transparent)]" style={{ color: 'var(--aethel-text-tertiary)' }}>
                            {step.notes}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Logs Area */}
            <div className="pt-2">
              <div className="mb-3 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--aethel-text-tertiary)' }}>
                System Output
              </div>
              
              <div className="rounded-xl overflow-hidden font-mono text-[10px]" style={{ background: 'var(--aethel-surface-primary)', border: '1px solid color-mix(in srgb, var(--aethel-text-quaternary) 10%, transparent)' }}>
                {task.logs.length === 0 ? (
                  <div className="p-4 text-center" style={{ color: 'var(--aethel-text-quaternary)' }}>
                    No output logs yet.
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto p-2 space-y-0.5">
                    {task.logs.map((log, index) => {
                      let color = 'var(--aethel-text-quaternary)' // info
                      if (log.level === 'warning') color = 'var(--aethel-warning-light)'
                      if (log.level === 'error') color = 'var(--aethel-error-light)'
                      return (
                        <div key={index} className="flex items-start gap-3 hover:bg-[color-mix(in_srgb,white_3%,transparent)] px-2 py-1 rounded">
                          <span className="shrink-0 opacity-50">{formatTimestamp(log.timestamp)}</span>
                          <span className="shrink-0 font-bold" style={{ color }}>[{log.level.toUpperCase()}]</span>
                          <span style={{ color: 'var(--aethel-text-secondary)', wordBreak: 'break-all' }}>{log.message}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {task.error && (
              <div className="flex items-start gap-2 rounded-xl p-3 text-xs" style={{ background: 'color-mix(in srgb, var(--aethel-error) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--aethel-error) 20%, transparent)', color: 'var(--aethel-error-light)' }}>
                <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-500" />
                <span style={{ wordBreak: 'break-word' }}>{task.error}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
