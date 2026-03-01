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
    <div className="aethel-p-6 aethel-space-y-6">
      <div className="aethel-flex aethel-items-center aethel-justify-between">
        <h2 className="aethel-text-2xl aethel-font-bold">Monitor de conectividade</h2>
        <button type="button" onClick={onRefreshConnectivity} className="aethel-button aethel-button-secondary aethel-text-xs">
          Atualizar
        </button>
      </div>

      {connectivityLoading && (
        <p className="aethel-text-sm aethel-text-slate-400">Monitorando servicos...</p>
      )}

      {hasConnectivityError && (
        <p className="aethel-text-sm aethel-text-red-400">Nao foi possivel consultar os endpoints.</p>
      )}

      {!connectivityLoading && !hasConnectivityError && connectivityData && (
        <div className="aethel-space-y-4">
          <div className="aethel-card aethel-p-6 aethel-flex aethel-justify-between aethel-items-center">
            <div>
              <p className="aethel-text-sm aethel-text-slate-400">Status geral</p>
              <p className="aethel-text-3xl aethel-font-bold">
                {String(formatConnectivityStatus(connectivityData.overall_status)).toUpperCase()}
              </p>
            </div>
            <div className="aethel-text-sm aethel-text-slate-400">
              Atualizado em {connectivityData.timestamp ? new Date(connectivityData.timestamp).toLocaleString() : '—'}
            </div>
          </div>

          <div className="aethel-grid aethel-grid-cols-1 lg:aethel-grid-cols-2 aethel-gap-4">
            {connectivityServices.map((service) => (
              <div key={service.name} className="aethel-card aethel-p-5 aethel-space-y-3">
                <div className="aethel-flex aethel-justify-between aethel-items-center">
                  <h3 className="aethel-text-lg aethel-font-semibold aethel-capitalize">{service.name.replace(/_/g, ' ')}</h3>
                  <span className={`aethel-text-xs aethel-rounded-full aethel-px-2 aethel-py-1 ${
                    service.status === 'healthy'
                      ? 'aethel-bg-emerald-500/20 aethel-text-emerald-300'
                      : service.status === 'degraded'
                      ? 'aethel-bg-amber-500/20 aethel-text-amber-300'
                      : 'aethel-bg-red-500/20 aethel-text-red-300'
                  }`}>
                    {String(formatConnectivityStatus(service.status)).toUpperCase()}
                  </span>
                </div>

                <div className="aethel-space-y-2">
                  {service.endpoints.map((endpoint) => (
                    <div key={`${service.name}-${endpoint.url}`} className="aethel-border aethel-border-slate-800 aethel-rounded aethel-p-3">
                      <div className="aethel-flex aethel-justify-between aethel-items-center">
                        <span className={`${endpoint.healthy ? 'aethel-text-emerald-300' : 'aethel-text-red-300'} aethel-text-sm`}>
                          {endpoint.url}
                        </span>
                        <span className="aethel-text-xs aethel-text-slate-400">
                          {endpoint.latency_ms !== null ? `${endpoint.latency_ms.toFixed(0)} ms` : '—'} • {endpoint.status_code ?? '—'}
                        </span>
                      </div>
                      {endpoint.error && (
                        <p className="aethel-text-xs aethel-text-red-300 aethel-mt-1">{endpoint.error}</p>
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
