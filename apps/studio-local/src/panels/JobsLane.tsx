import type { RuntimeAdapter, RuntimeLane } from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types'
import { useState } from 'react'

export type JobRecord = {
  id: string
  kind: string
  lane: RuntimeLane
  reason: string
  state: string
  requiresHumanApproval?: boolean
}

type JobsLaneProps = {
  adapter: RuntimeAdapter
  jobs: JobRecord[]
  onJobsChange: (jobs: JobRecord[]) => void
}

const LANES = ['asset-import', 'viewport-render', 'render-queue', 'playtest'] as const

export function JobsLane({ adapter, jobs, onJobsChange }: JobsLaneProps) {
  const [error, setError] = useState<string | null>(null)

  async function route(kind: string) {
    try {
      const result = await adapter.runtime.routeJob(kind) as JobRecord
      setError(null)
      onJobsChange([
        {
          id: result.id ?? `${kind}-${Date.now()}`,
          kind,
          lane: result.lane,
          reason: result.reason,
          state: result.state ?? 'held',
          requiresHumanApproval: result.requiresHumanApproval,
        },
        ...jobs,
      ])
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Studio Local bridge failed to route this job.'
      setError(reason)
      onJobsChange([
        {
          id: `${kind}-blocked-${Date.now()}`,
          kind,
          lane: 'held',
          reason,
          state: 'blocked',
          requiresHumanApproval: true,
        },
        ...jobs,
      ])
    }
  }

  return (
    <section className="panel panel-wide">
      <div className="panel-heading">
        <span>Runtime lanes</span>
        <strong>{jobs.length} receipts</strong>
      </div>
      <div className="button-row" role="toolbar" aria-label="Route local runtime jobs">
        {LANES.map((lane) => (
          <button key={lane} type="button" onClick={() => void route(lane)}>
            {lane}
          </button>
        ))}
      </div>
      {error ? <p className="error-note">{error}</p> : null}
      <div className="table-list" role="table" aria-label="Recent job routing receipts">
        {jobs.length ? jobs.map((job) => (
          <div key={job.id} className="table-row" data-state={job.state} role="row">
            <span>{job.kind}</span>
            <span>{job.lane}</span>
            <span>{job.reason}</span>
          </div>
        )) : (
          <p>Route a job to create the first local/cloud/held receipt.</p>
        )}
      </div>
    </section>
  )
}
