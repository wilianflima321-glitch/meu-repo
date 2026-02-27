'use client'

import type { StudioSession } from './studio-home.types'
import {
  canApplyTask,
  canRollbackTask,
  canRunTask,
  canValidateTask,
  orchestrationModeLabel,
  roleLabel,
  statusTone,
} from './studio-home.utils'

type TaskProgress = {
  total: number
  done: number
  blocked: number
  failed: number
  active: number
  percent: number
}

type StudioHomeTaskBoardProps = {
  session: StudioSession | null
  busy: boolean
  variableUsageBlocked: boolean
  waveStrategy: 'balanced' | 'cost_guarded' | 'quality_first'
  taskProgress: TaskProgress
  onCreateSuperPlan: () => void | Promise<void>
  onChangeWaveStrategy: (strategy: 'balanced' | 'cost_guarded' | 'quality_first') => void
  onRunWave: () => void | Promise<void>
  onRunTask: (taskId: string) => void | Promise<void>
  onValidateTask: (taskId: string) => void | Promise<void>
  onApplyTask: (taskId: string) => void | Promise<void>
  onRollbackTask: (taskId: string, applyToken?: string) => void | Promise<void>
}

export function StudioHomeTaskBoard({
  session,
  busy,
  variableUsageBlocked,
  waveStrategy,
  taskProgress,
  onCreateSuperPlan,
  onChangeWaveStrategy,
  onRunWave,
  onRunTask,
  onValidateTask,
  onApplyTask,
  onRollbackTask,
}: StudioHomeTaskBoardProps) {
  const hasRunnableTask = Boolean(
    session?.tasks.some((task) => canRunTask(task, session.status, session.tasks))
  )
  const canCreateSuperPlan =
    !!session && !busy && session.status === 'active' && !variableUsageBlocked && session.tasks.length === 0
  const canRunWaveNow =
    !!session &&
    !busy &&
    session.status === 'active' &&
    !variableUsageBlocked &&
    session.tasks.length > 0 &&
    !session.tasks.every((task) => task.status === 'done') &&
    hasRunnableTask
  const actionHint = (() => {
    if (!session) return 'Start a session to unlock planning and execution actions.'
    if (session.status !== 'active') return `Session is ${session.status}. Start a new mission to resume execution.`
    if (variableUsageBlocked) return 'Variable AI usage is blocked. Restore credits to run planner/coder/reviewer.'
    return null
  })()
  const queueByRole = (() => {
    if (!session) return { planner: 0, coder: 0, reviewer: 0 }
    return session.tasks.reduce(
      (acc, task) => {
        if (task.status === 'queued' || task.status === 'blocked' || task.status === 'error') {
          acc[task.ownerRole] += 1
        }
        return acc
      },
      { planner: 0, coder: 0, reviewer: 0 } as Record<'planner' | 'coder' | 'reviewer', number>
    )
  })()
  const nextRunnableRole = (() => {
    if (!session) return null
    const roleOrder: Array<'planner' | 'coder' | 'reviewer'> = ['planner', 'coder', 'reviewer']
    for (const role of roleOrder) {
      const candidate = session.tasks.find((task) =>
        task.ownerRole === role && canRunTask(task, session.status, session.tasks)
      )
      if (candidate) return roleLabel(role)
    }
    return null
  })()
  const pipelineStatus = (() => {
    if (!session) return { validated: 0, applied: 0, pendingValidation: 0 }
    let validated = 0
    let applied = 0
    let pendingValidation = 0
    for (const task of session.tasks) {
      if (task.ownerRole !== 'reviewer') continue
      if (task.validationVerdict === 'passed') validated += 1
      if (task.applyToken) applied += 1
      if (task.status === 'done' && task.validationVerdict === 'pending') pendingValidation += 1
    }
    return { validated, applied, pendingValidation }
  })()
  const strategyDescription =
    waveStrategy === 'cost_guarded'
      ? 'Cost Guarded - caps wave burst under budget pressure.'
      : waveStrategy === 'quality_first'
        ? 'Quality First - single-step wave cadence for stricter review.'
        : 'Balanced - standard role-sequenced wave cadence.'
  const advisories: Array<{ tone: 'neutral' | 'warning' | 'error' | 'success'; message: string }> = []
  if (session?.tasks.length) {
    advisories.push({
      tone: 'neutral',
      message: 'Planner, Coder and Reviewer runs are checkpoints. Apply and rollback remain explicit and manual.',
    })
  }
  if (actionHint) {
    advisories.push({
      tone: variableUsageBlocked || session?.status === 'stopped' ? 'warning' : 'neutral',
      message: actionHint,
    })
  }
  if (session && session.tasks.length > 0 && !hasRunnableTask && !variableUsageBlocked) {
    advisories.push({
      tone: 'warning',
      message: 'No runnable task right now. Complete upstream checkpoints or restore budget to continue.',
    })
  }
  if (session?.tasks.length && session.tasks.every((task) => task.status === 'done')) {
    advisories.push({
      tone: 'success',
      message: 'Wave execution complete. Validate/apply reviewer checkpoint or start a new mission.',
    })
  }
  const advisoryClass = (tone: 'neutral' | 'warning' | 'error' | 'success') => {
    if (tone === 'error') return 'border-rose-500/30 bg-rose-500/10 text-rose-100'
    if (tone === 'warning') return 'border-amber-500/30 bg-amber-500/10 text-amber-100'
    if (tone === 'success') return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
    return 'border-slate-800 bg-slate-950 text-slate-400'
  }

  const taskActionReason = (
    action: 'run' | 'validate' | 'apply' | 'rollback',
    task: StudioSession['tasks'][number]
  ): string | null => {
    if (busy) return 'Another action is currently running.'
    if (!session) return 'Start a session first.'
    if (session.status !== 'active') return `Session is ${session.status}.`
    if (variableUsageBlocked && (action === 'run' || action === 'validate')) {
      return 'Variable usage is blocked. Restore credits to continue.'
    }
    if (action === 'run' && !canRunTask(task, session.status, session.tasks)) return 'Blocked by role sequence or current task state.'
    if (action === 'validate' && !canValidateTask(task, session.status)) return 'Only completed reviewer tasks can be validated.'
    if (action === 'apply' && !canApplyTask(task, session.status)) return 'Apply requires a reviewer task with passed validation.'
    if (action === 'rollback' && !canRollbackTask(task, session.status)) return 'Rollback is available only after a successful apply.'
    return null
  }

  return (
    <div className="studio-panel p-4">
      <div className="studio-panel-header">
        <div>Task Board</div>
        <div className="flex items-center gap-1">
          <select
            aria-label="Wave strategy"
            value={waveStrategy}
            onChange={(event) => onChangeWaveStrategy(event.target.value as 'balanced' | 'cost_guarded' | 'quality_first')}
            className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            <option value="balanced">Balanced</option>
            <option value="cost_guarded">Cost Guarded</option>
            <option value="quality_first">Quality First</option>
          </select>
          <button
            disabled={!canCreateSuperPlan}
            onClick={onCreateSuperPlan}
            className="studio-action-primary px-2 py-1 text-[11px]"
          >
            Super Plan
          </button>
          <button
            disabled={!canRunWaveNow}
            onClick={onRunWave}
            className="studio-action-primary px-2 py-1 text-[11px]"
          >
            Run Wave
          </button>
        </div>
      </div>
      {session?.tasks.length ? (
        <div className="studio-muted-block mb-2 px-2 py-1">
          Super plan already created for this session. Complete or stop this session before opening a new plan.
        </div>
      ) : null}
      {(taskProgress.total > 0 || session) && (
        <div className="mb-2 grid grid-cols-1 gap-2 lg:grid-cols-2">
          <div className="studio-muted-block px-2 py-1.5">
            <div className="mb-1 flex items-center justify-between">
              <span>
                Progress: {taskProgress.done}/{taskProgress.total} ({taskProgress.percent}%)
              </span>
              <span>
                active {taskProgress.active} | blocked {taskProgress.blocked} | failed {taskProgress.failed}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded bg-slate-800">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${taskProgress.percent}%` }} />
            </div>
          </div>
          <div className="studio-muted-block px-2 py-1.5 text-slate-500">
            <div>
              Orchestration: {session?.orchestration ? orchestrationModeLabel(session.orchestration.mode) : 'serial'} |
              policy: {session?.orchestration?.applyPolicy || 'serial_after_validation'}
              {session?.orchestration?.lastWaveAt
                ? ` | last wave ${new Date(session.orchestration.lastWaveAt).toLocaleTimeString()}`
                : ''}
            </div>
            <div className="mt-1">
              Queue: planner {queueByRole.planner} | coder {queueByRole.coder} | reviewer {queueByRole.reviewer}
              {nextRunnableRole ? ` | next ${nextRunnableRole}` : ' | no runnable role'}
            </div>
            <div className="mt-1">Strategy: {strategyDescription}</div>
            <div className="mt-1">
              Reviewer pipeline: validated {pipelineStatus.validated} | applied {pipelineStatus.applied} | pending{' '}
              {pipelineStatus.pendingValidation}
            </div>
          </div>
        </div>
      )}
      {advisories.map((advisory, index) => (
        <div
          key={`${advisory.tone}-${index}`}
          className={`mb-2 rounded border px-2 py-1 text-[11px] ${advisoryClass(advisory.tone)}`}
        >
          {advisory.message}
        </div>
      ))}
      <div aria-label="Task list" className="studio-scroll max-h-[560px] space-y-2 pr-1">
        {(session?.tasks || []).map((task) => (
          <div key={task.id} className={`rounded border px-3 py-2 text-xs transition-colors hover:border-slate-500/60 ${statusTone(task.status)}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-slate-100">{task.title}</div>
              <div className="text-[10px] uppercase tracking-wide">{task.status}</div>
            </div>
            <div className="mt-1 text-[11px] text-slate-300">
              {roleLabel(task.ownerRole)} | {task.estimateCredits} credits | {task.estimateSeconds}s | verdict:{' '}
              {task.validationVerdict}
            </div>
            {task.validationReport ? (
              <div className="mt-1 text-[11px] text-slate-400">
                validation checks: {task.validationReport.totalChecks} | failed:{' '}
                {task.validationReport.failedIds.length}
              </div>
            ) : null}
            {task.result ? (
              <div className="mt-1 text-[11px] text-slate-400">
                {task.result.length > 180 ? `${task.result.slice(0, 180)}...` : task.result}
              </div>
            ) : null}
            {task.validationReport && task.validationReport.failedMessages.length > 0 ? (
              <div className="mt-1 rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-100">
                {task.validationReport.failedMessages[0]}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              {(() => {
                const runReason = taskActionReason('run', task)
                const validateReason = taskActionReason('validate', task)
                const applyReason = taskActionReason('apply', task)
                const rollbackReason = taskActionReason('rollback', task)
                return (
                  <>
                    <button
                      disabled={Boolean(runReason)}
                      title={runReason || undefined}
                      onClick={() => onRunTask(task.id)}
                      className="studio-action-secondary px-2 py-1 text-[10px]"
                    >
                      Run
                    </button>
                    <button
                      disabled={Boolean(validateReason)}
                      title={validateReason || undefined}
                      onClick={() => onValidateTask(task.id)}
                      className="studio-action-primary px-2 py-1 text-[10px]"
                    >
                      Validate
                    </button>
                    <button
                      disabled={Boolean(applyReason)}
                      title={applyReason || undefined}
                      onClick={() => onApplyTask(task.id)}
                      className="rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      Apply
                    </button>
                    <button
                      disabled={Boolean(rollbackReason)}
                      title={rollbackReason || undefined}
                      onClick={() => onRollbackTask(task.id, task.applyToken)}
                      className="studio-action-warn px-2 py-1 text-[10px]"
                    >
                      Rollback
                    </button>
                  </>
                )
              })()}
            </div>
          </div>
        ))}
        {!session?.tasks?.length && (
          <div className="rounded border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500">
            No tasks yet. Start session and generate Super Plan.
          </div>
        )}
      </div>
    </div>
  )
}

