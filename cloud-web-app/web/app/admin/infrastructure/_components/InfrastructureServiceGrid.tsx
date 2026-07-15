import type { ServiceHealth } from './infrastructure-types'
import { InfrastructureStatusBadge } from './InfrastructureStatusBadge'

function ServiceCard({ service }: { service: ServiceHealth }) {
  const borderClass = service.status === 'healthy'
    ? 'border-[var(--aethel-border-primary)]'
    : service.status === 'degraded'
      ? 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]'
      : 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]'

  return (
    <div className={`rounded-lg border bg-[var(--aethel-surface-secondary)] p-4 ${borderClass}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-[var(--aethel-text-primary)]">{service.name}</h3>
        <InfrastructureStatusBadge status={service.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 text-xs">
        {service.latency !== undefined ? (
          <div>
            <span className="text-[var(--aethel-text-tertiary)]">Latency</span>
            <p className={`text-sm font-medium ${service.latency < 100 ? 'text-[var(--aethel-success)]' : service.latency < 500 ? 'text-[var(--aethel-warning)]' : 'text-[var(--aethel-error)]'}`}>{service.latency}ms</p>
          </div>
        ) : null}

        {service.uptime !== undefined ? (
          <div>
            <span className="text-[var(--aethel-text-tertiary)]">Availability</span>
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">{service.uptime.toFixed(2)}%</p>
          </div>
        ) : null}
      </div>

      {service.details ? <p className="mt-3 text-xs text-[var(--aethel-text-tertiary)]">{service.details}</p> : null}
      <p className="mt-3 text-[10px] text-[var(--aethel-text-secondary)]">Last check: {new Date(service.lastCheck).toLocaleTimeString()}</p>
    </div>
  )
}

export function InfrastructureServiceGrid({ services }: { services: ServiceHealth[] }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-medium text-[var(--aethel-text-tertiary)]">Services</h2>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{services.map((service) => <ServiceCard key={service.name} service={service} />)}</div>
    </div>
  )
}
