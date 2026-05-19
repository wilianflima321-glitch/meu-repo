import { Database, Zap } from 'lucide-react'

import type { InfrastructureData } from './infrastructure-types'

export function InfrastructureDataStores({ data }: { data: InfrastructureData }) {
  return (
    <div className="grid grid-cols-2 gap-6">
      <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]"><Database className="h-4 w-4" />Database</h3>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-xs text-[var(--aethel-text-tertiary)]">Active</p><p className="text-xl font-bold text-[var(--aethel-primary-light)]">{data.dbConnections.active}</p></div>
          <div><p className="text-xs text-[var(--aethel-text-tertiary)]">Idle</p><p className="text-xl font-bold text-[var(--aethel-text-tertiary)]">{data.dbConnections.idle}</p></div>
          <div><p className="text-xs text-[var(--aethel-text-tertiary)]">Maximum</p><p className="text-xl font-bold text-[var(--aethel-text-primary)]">{data.dbConnections.max}</p></div>
        </div>
        <div className="mt-4 border-t border-[var(--aethel-border-primary)] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--aethel-text-tertiary)]">Average query time</span>
            <span className={`text-sm font-medium ${data.dbQueryTime < 50 ? 'text-[var(--aethel-success)]' : data.dbQueryTime < 200 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-error)]'}`}>{data.dbQueryTime}ms</span>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-secondary)] p-4">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]"><Zap className="h-4 w-4" />Cache (Redis)</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Hit rate</p>
            <p className={`text-xl font-bold ${data.cacheHitRate > 80 ? 'text-[var(--aethel-success)]' : data.cacheHitRate > 50 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-error)]'}`}>{data.cacheHitRate.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Memory used</p>
            <p className="text-xl font-bold text-[var(--aethel-text-primary)]">{(data.cacheMemory / 1024 / 1024).toFixed(0)} MB</p>
          </div>
        </div>
      </div>
    </div>
  )
}
