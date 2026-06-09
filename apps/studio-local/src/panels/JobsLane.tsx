import type { RuntimeAdapter, RuntimeLane } from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types'

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
  async function route(kind: string) {
    const result = await adapter.runtime.routeJob(kind) as JobRecord
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
