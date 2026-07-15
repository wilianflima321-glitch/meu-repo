import type { RuntimeProbe } from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types'

type LocalRuntimeStatusProps = {
  probe: RuntimeProbe | null
  error: string | null
}

export function LocalRuntimeStatus({ probe, error }: LocalRuntimeStatusProps) {
  const state = error ? 'blocked' : probe?.available ? 'available' : 'held'

  return (
    <section className="panel" data-state={state}>
      <div className="panel-heading">
        <span>Runtime</span>
        <strong>{state}</strong>
      </div>
      <dl className="metric-list">
        <div>
          <dt>Lane</dt>
          <dd>{probe?.lane ?? 'held'}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>{probe?.checkedAt ? new Date(probe.checkedAt).toLocaleTimeString() : 'pending'}</dd>
        </div>
      </dl>
      <p>{error ?? probe?.reason ?? 'Waiting for the native bridge to report machine capability.'}</p>
    </section>
  )
}
