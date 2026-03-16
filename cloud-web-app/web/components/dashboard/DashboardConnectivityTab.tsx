type ConnectivityEndpoint = {
  url: string
  healthy: boolean
  latency_ms: number | null
  status_code?: number | null
  error?: string | null
}

type ConnectivityService = {
  name: string
  status: string
  endpoints: ConnectivityEndpoint[]
}

type ConnectivityOverview = {
  overall_status?: string
  timestamp?: string
}

type DashboardConnectivityTabProps = {
  connectivityLoading: boolean
  connectivityError: unknown
  connectivityData: ConnectivityOverview | undefined
  connectivityServices: ConnectivityService[]
  onRefreshConnectivity: () => void
  formatConnectivityStatus: (status?: string | null) => string
}

export function DashboardConnectivityTab({
  connectivityLoading,
  connectivityError,
  connectivityData,
  connectivityServices,
  onRefreshConnectivity,
  formatConnectivityStatus,
}: DashboardConnectivityTabProps) {
  const hasConnectivityError = Boolean(connectivityError)

  return (
    <div className="aethel-p-6 space-y-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between">
        <h2 className="text-2xl font-bold">Monitor de conectividade</h2>
        <button type="button" onClick={onRefreshConnectivity} className="aethel-button aethel-button-secondary text-xs">
          Atualizar
        </button>
      </div>

      {connectivityLoading && (
        <p className="text-sm text-[var(--aethel-text-secondary)]">Monitorando servicos...</p>
      )}

      {hasConnectivityError && (
        <p className="text-sm text-[var(--aethel-error)]">Nao foi possivel consultar os endpoints.</p>
      )}

      {!connectivityLoading && !hasConnectivityError && connectivityData && (
        <div className="space-y-4">
          <div className="aethel-card aethel-p-6 aethel-flex aethel-justify-between aethel-items-center">
            <div>
              <p className="text-sm text-[var(--aethel-text-secondary)]">Status geral</p>
              <p className="text-3xl font-bold">
                {String(formatConnectivityStatus(connectivityData.overall_status)).toUpperCase()}
              </p>
            </div>
            <div className="text-sm text-[var(--aethel-text-secondary)]">
              Atualizado em {connectivityData.timestamp ? new Date(connectivityData.timestamp).toLocaleString() : '—'}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 aethel-gap-4">
            {connectivityServices.map((service) => (
              <div key={service.name} className="aethel-card p-5 space-y-3">
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <h3 className="text-lg font-semibold capitalize">{service.name.replace(/_/g, ' ')}</h3>
                  <span className={`text-xs rounded-full px-2 py-1 ${
                    service.status === 'healthy'
                      ? 'bg-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] text-[var(--aethel-success)]'
                      : service.status === 'degraded'
                      ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning)]'
                      : 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]'
                  }`}>
                    {String(formatConnectivityStatus(service.status)).toUpperCase()}
                  </span>
                </div>

                <div className="space-y-2">
                  {service.endpoints.map((endpoint) => (
                    <div key={`${service.name}-${endpoint.url}`} className="border border-[var(--aethel-border-primary)] aethel-rounded aethel-p-3">
                      <div className="aethel-flex aethel-justify-between aethel-items-center">
                        <span className={`${endpoint.healthy ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-error)]'} text-sm`}>
                          {endpoint.url}
                        </span>
                        <span className="text-xs text-[var(--aethel-text-secondary)]">
                          {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)} ms` : '—'} • {endpoint.status_code ?? '—'}
                        </span>
                      </div>
                      {endpoint.error && (
                        <p className="text-xs text-[var(--aethel-error)] mt-1">{endpoint.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
