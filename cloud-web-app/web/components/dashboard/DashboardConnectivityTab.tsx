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
  const panelClass =
    'rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.16)]'
  const secondaryButtonClass = `inline-flex min-h-10 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] px-4 py-2 text-xs font-medium text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const endpointCardClass =
    'rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_82%,transparent)] px-4 py-3'

  return (
    <div className={`${CANONICAL_SPACING.page.padding} space-y-6`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className={CANONICAL_TYPOGRAPHY.h1}>Monitor de conectividade</h2>
        <button type="button" onClick={onRefreshConnectivity} aria-label="Refresh monitor de conectividade" className={secondaryButtonClass}>
          Refresh
        </button>
      </div>

      {connectivityLoading && (
        <p className="text-sm text-[var(--aethel-text-secondary)]">Monitoring services...</p>
      )}

      {hasConnectivityError && (
        <p className="text-sm text-[var(--aethel-error)]">Could not query the endpoints.</p>
      )}

      {!connectivityLoading && !hasConnectivityError && connectivityData && (
        <div className="space-y-4">
          <div className={`${panelClass} flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between`}>
            <div>
              <p className="text-sm text-[var(--aethel-text-secondary)]">Overall status</p>
              <p className="text-3xl font-bold">
                {String(formatConnectivityStatus(connectivityData.overall_status)).toUpperCase()}
              </p>
            </div>
            <div className="text-sm text-[var(--aethel-text-secondary)]">
              Updated at {connectivityData.timestamp ? new Date(connectivityData.timestamp).toLocaleString() : '—'}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {connectivityServices.map((service) => (
              <div key={service.name} className={`${panelClass} space-y-3 p-5`}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
                    <div key={`${service.name}-${endpoint.url}`} className={endpointCardClass}>
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
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
import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_SPACING, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'
