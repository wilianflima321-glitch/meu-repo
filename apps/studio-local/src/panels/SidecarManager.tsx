type Sidecar = {
  kind: string
  available: boolean
  evidenceRef: string
  nextAction: string
}

type SidecarManagerProps = {
  sidecars: Sidecar[]
}

export function SidecarManager({ sidecars }: SidecarManagerProps) {
  const missing = sidecars.filter((sidecar) => !sidecar.available).length

  return (
    <section className="panel">
      <div className="panel-heading">
        <span>Sidecars</span>
        <strong>{sidecars.length ? `${missing} missing` : 'pending'}</strong>
      </div>
      <div className="table-list" role="table" aria-label="Sidecar capability status">
        {sidecars.length ? sidecars.map((sidecar) => (
          <div key={sidecar.kind} className="table-row" data-state={sidecar.available ? 'available' : 'held'} role="row">
            <span>{sidecar.kind}</span>
            <span>{sidecar.available ? 'available' : 'held'}</span>
            <span>{sidecar.nextAction}</span>
          </div>
        )) : (
          <p>No sidecar receipt has been reported yet.</p>
        )}
      </div>
    </section>
  )
}
