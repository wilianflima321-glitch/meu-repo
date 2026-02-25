'use client'

type StudioHomeKpiStripProps = {
  networkOnline: boolean
  sessionStatus?: string
  taskDone: number
  taskTotal: number
  budgetPercent: number
  variableUsageBlocked: boolean
  lastActionAt: string | null
}

export function StudioHomeKpiStrip({
  networkOnline,
  sessionStatus,
  taskDone,
  taskTotal,
  budgetPercent,
  variableUsageBlocked,
  lastActionAt,
}: StudioHomeKpiStripProps) {
  return (
    <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
      <div className="studio-kpi-card">
        <div className="text-slate-500">Network</div>
        <div className={networkOnline ? 'font-semibold text-emerald-200' : 'font-semibold text-rose-200'}>
          {networkOnline ? 'online' : 'offline'}
        </div>
      </div>
      <div className="studio-kpi-card">
        <div className="text-slate-500">Session</div>
        <div className="font-semibold text-slate-100">{sessionStatus || 'idle'}</div>
      </div>
      <div className="studio-kpi-card">
        <div className="text-slate-500">Tasks</div>
        <div className="font-semibold text-slate-100">
          {taskDone}/{taskTotal}
        </div>
      </div>
      <div className="studio-kpi-card">
        <div className="text-slate-500">Budget</div>
        <div className="font-semibold text-slate-100">{budgetPercent}%</div>
      </div>
      <div className="studio-kpi-card">
        <div className={variableUsageBlocked ? 'text-rose-300' : 'text-slate-500'}>Usage</div>
        <div className={variableUsageBlocked ? 'font-semibold text-rose-200' : 'font-semibold text-emerald-200'}>
          {variableUsageBlocked ? 'blocked' : 'available'}
        </div>
      </div>
      <div className="studio-kpi-card">
        <div className="text-slate-500">Last action</div>
        <div className="font-semibold text-slate-100">
          {lastActionAt ? new Date(lastActionAt).toLocaleTimeString() : '-'}
        </div>
      </div>
    </div>
  )
}
