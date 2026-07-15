import { Layers } from 'lucide-react'

import type { QueueMetrics } from './infrastructure-types'

function QueueCard({ queue }: { queue: QueueMetrics }) {
  const total = queue.waiting + queue.active + queue.completed + queue.failed
  const failRate = total > 0 ? (queue.failed / total) * 100 : 0

  return (
    <div className={`rounded-lg border bg-[var(--aethel-surface-secondary)] p-4 ${queue.isPaused ? 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]' : 'border-[var(--aethel-border-primary)]'}`}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-medium capitalize text-[var(--aethel-text-primary)]">{queue.name.replace(/_/g, ' ')}</h4>
        {queue.isPaused ? <span className="rounded bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-2 py-0.5 text-xs text-[var(--aethel-warning)]">Paused</span> : null}
      </div>

      <div className="grid grid-cols-4 gap-2 text-center">
        <div><p className="text-lg font-bold text-[var(--aethel-warning)]">{queue.waiting}</p><p className="text-[10px] text-[var(--aethel-text-tertiary)]">Waiting</p></div>
        <div><p className="text-lg font-bold text-[var(--aethel-primary-light)]">{queue.active}</p><p className="text-[10px] text-[var(--aethel-text-tertiary)]">Active</p></div>
        <div><p className="text-lg font-bold text-[var(--aethel-success)]">{queue.completed}</p><p className="text-[10px] text-[var(--aethel-text-tertiary)]">Completed</p></div>
        <div><p className={`text-lg font-bold ${failRate > 5 ? 'text-[var(--aethel-error)]' : 'text-[var(--aethel-text-tertiary)]'}`}>{queue.failed}</p><p className="text-[10px] text-[var(--aethel-text-tertiary)]">Failed</p></div>
      </div>
    </div>
  )
}

export function InfrastructureQueues({ queues }: { queues: QueueMetrics[] }) {
  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-tertiary)]"><Layers className="h-4 w-4" />Task queues</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{queues.map((queue) => <QueueCard key={queue.name} queue={queue} />)}</div>
    </div>
  )
}
