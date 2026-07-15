import type { RuntimeProbe } from '../../../../packages/aethel-ide-shared/src/runtime-adapter/types'

type CloudHandoffBridgeProps = {
  probe: RuntimeProbe | null
}

export function CloudHandoffBridge({ probe }: CloudHandoffBridgeProps) {
  const shouldHold = !probe?.available || probe.lane === 'held'

  return (
    <section className="panel">
      <div className="panel-heading">
        <span>Cloud handoff</span>
        <strong>{shouldHold ? 'held' : 'available'}</strong>
      </div>
      <p>
        Heavy work can move to cloud only with cost, teardown, rollback, and evidence receipts.
      </p>
      <a href="https://aethel.dev/evidence" target="_blank" rel="noreferrer">
        View evidence policy
      </a>
    </section>
  )
}
