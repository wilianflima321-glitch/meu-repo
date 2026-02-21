'use client'

import type { StudioSession } from './studio-home.types'
import { canApplyTask, canRollbackTask, canRunTask, canValidateTask, roleLabel, statusTone } from './studio-home.utils'

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
  taskProgress: TaskProgress
  onCreateSuperPlan: () => void | Promise<void>
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
  taskProgress,
  onCreateSuperPlan,
  onRunWave,
  onRunTask,
  onValidateTask,
  onApplyTask,
  onRollbackTask,
}: StudioHomeTaskBoardProps) {
  const canCreateSuperPlan =
    !!session && !busy && session.status === 'active' && !variableUsageBlocked && session.tasks.length === 0
  const canRunWaveNow =
    !!session &&
    !busy &&
    session.status === 'active' &&
    !variableUsageBlocked &&
    session.tasks.length > 0 &&
    !session.tasks.every((task) => task.status === 'done')
  const actionHint = (() => {
    if (!session) return 'Start a session to unlock planning and execution actions.'
    if (session.status !== 'active') return `Session is ${session.status}. Start a new mission to resume execution.`
    if (variableUsageBlocked) return 'Variable AI usage is blocked. Restore credits to run planner/coder/reviewer.'
    return null
  })()

  return (
    <div className="rounded border border-slate-800 bg-slate-900/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Task Board</div>
        <div className="flex items-center gap-1">
          <button
            disabled={!canCreateSuperPlan}
            onClick={onCreateSuperPlan}
            className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Super Plan
          </button>
          <button
            disabled={!canRunWaveNow}
            onClick={onRunWave}
            className="rounded border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-[11px] font-semibold text-sky-100 hover:bg-sky-500/25 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          >
            Run Wave
          </button>
        </div>
      </div>
      {taskProgress.total > 0 && (
        <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1.5 text-[11px] text-slate-400">
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
      )}
      {session?.tasks.length ? (
        <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-400">
          Super plan already created for this session. Complete or stop this session before opening a new plan.
        </div>
      ) : null}
      {actionHint ? (
        <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-500">
          {actionHint}
        </div>
      ) : null}
      <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-500">
        Validation/apply/rollback are restricted to reviewer checkpoints.
      </div>
      {session?.orchestration ? (
        <div className="mb-2 rounded border border-slate-800 bg-slate-950 px-2 py-1 text-[11px] text-slate-400">
          Orchestration: {session.orchestration.mode} | policy: {session.orchestration.applyPolicy}
          {session.orchestration.lastWaveAt
            ? ` | last wave: ${new Date(session.orchestration.lastWaveAt).toLocaleTimeString()}`
            : ''}
        </div>
      ) : null}
      {session?.tasks.length && session.tasks.every((task) => task.status === 'done') ? (
        <div className="mb-2 rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-200">
          Wave execution complete. Validate/apply reviewer checkpoint or start a new mission.
        </div>
      ) : null}
      <div className="space-y-2">
        {(session?.tasks || []).map((task) => (
          <div key={task.id} className={`rounded border px-3 py-2 text-xs ${statusTone(task.status)}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-medium text-slate-100">{task.title}</div>
              <div className="text-[10px] uppercase tracking-wide">{task.status}</div>
            </div>
            <div className="mt-1 text-[11px] text-slate-300">
              {roleLabel(task.ownerRole)} | {task.estimateCredits} credits | {task.estimateSeconds}s | verdict:{' '}
              {task.validationVerdict}
            </div>
            {task.result ? (
              <div className="mt-1 text-[11px] text-slate-400">
                {task.result.length > 180 ? `${task.result.slice(0, 180)}…` : task.result}
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap gap-1">
              <button
                disabled={busy || !session || variableUsageBlocked || !canRunTask(task, session.status, session.tasks)}
                onClick={() => onRunTask(task.id)}
                className="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Run
              </button>
              <button
                disabled={busy || !session || variableUsageBlocked || !canValidateTask(task, session.status)}
                onClick={() => onValidateTask(task.id)}
                className="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Validate
              </button>
              <button
                disabled={busy || !session || !canApplyTask(task, session.status)}
                onClick={() => onApplyTask(task.id)}
                className="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Apply
              </button>
              <button
                disabled={busy || !session || !canRollbackTask(task, session.status)}
                onClick={() => onRollbackTask(task.id, task.applyToken)}
                className="rounded border border-slate-600 px-2 py-1 text-[10px] hover:bg-slate-800 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
              >
                Rollback
              </button>
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
