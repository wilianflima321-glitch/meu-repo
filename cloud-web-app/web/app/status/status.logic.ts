import type {
  SurfaceCheck,
  SurfaceResult,
  SurfaceState,
  StatusCoverageCard,
  StatusTimelineEntry,
} from './status.types'

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function getNestedRecord(source: Record<string, unknown>, key: string): Record<string, unknown> {
  return asRecord(source[key])
}

function getStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

export function stateStyles(state: SurfaceState) {
  switch (state) {
    case 'healthy':
      return 'border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)] text-[var(--aethel-success-light)]'
    case 'partial':
      return 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
    case 'unhealthy':
      return 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
    default:
      return 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-secondary)]'
  }
}

export function stateLabel(state: SurfaceState) {
  switch (state) {
    case 'healthy':
      return 'Operational'
    case 'partial':
      return 'Partial'
    case 'unhealthy':
      return 'Unavailable'
    default:
      return 'Unknown'
  }
}

export function summarizePayload(
  checkId: string,
  payload: unknown,
  ok: boolean
): { state: SurfaceState; detail: string; latency?: number } {
  const data = asRecord(payload)
  const latency = typeof data.latency === 'number' ? data.latency : undefined
  const ai = getNestedRecord(data, 'ai')
  const database = getNestedRecord(data, 'database')
  const cache = getNestedRecord(data, 'cache')
  const storage = getNestedRecord(data, 'storage')
  const gateway = getNestedRecord(data, 'gateway')
  const provider = getNestedRecord(data, 'provider')
  const stripe = getNestedRecord(data, 'stripe')
  const stats = getNestedRecord(database, 'stats')

  if (checkId === 'runtime') {
    return {
      state: ok ? 'healthy' : 'unhealthy',
      detail: ok ? 'Liveness route is responding.' : 'Base runtime probe failed.',
      latency,
    }
  }

  if (checkId === 'readiness') {
    return {
      state: data.status === 'ready' ? 'healthy' : ok ? 'partial' : 'unhealthy',
      detail:
        data.status === 'ready'
          ? 'Mandatory runtime dependencies are available.'
          : 'Runtime is still missing one or more mandatory dependencies.',
      latency,
    }
  }

  if (checkId === 'ai') {
    if (ai.configured) {
      const providerName = typeof ai.provider === 'string' ? ai.provider : 'configured provider'
      return { state: 'healthy', detail: `Configured via ${providerName}.`, latency }
    }
    return {
      state: data.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: typeof ai.message === 'string' ? ai.message : 'No AI provider configured yet.',
      latency,
    }
  }

  if (checkId === 'database') {
    if (database.connected) {
      const projects = typeof stats.projects === 'number' ? stats.projects : undefined
      return {
        state: 'healthy',
        detail: typeof projects === 'number' ? `Connected. ${projects} visible projects.` : 'Connected.',
        latency,
      }
    }
    return {
      state: 'unhealthy',
      detail: typeof database.error === 'string' ? database.error : 'Database connection failed.',
      latency,
    }
  }

  if (checkId === 'cache') {
    if (cache.configured) return { state: 'healthy', detail: 'Configured and reachable.', latency }
    return {
      state: data.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail:
        typeof cache.message === 'string'
          ? cache.message
          : typeof cache.error === 'string'
            ? cache.error
            : 'Cache is not configured.',
      latency,
    }
  }

  if (checkId === 'storage') {
    if (storage.configured) {
      const storageType = typeof storage.type === 'string' ? storage.type : 'storage'
      return { state: 'healthy', detail: `Configured on ${storageType}.`, latency }
    }
    return {
      state: data.status === 'unknown' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail:
        typeof storage.message === 'string'
          ? storage.message
          : typeof storage.error === 'string'
            ? storage.error
            : 'Storage is not configured.',
      latency,
    }
  }

  if (checkId === 'stripe') {
    if (data.healthy) return { state: 'healthy', detail: 'Stripe gateway ready for checkout.', latency }
    const priceCoverage =
      typeof data.configuredPriceCount === 'number' && typeof data.requiredPriceCount === 'number'
        ? ` prices=${data.configuredPriceCount}/${data.requiredPriceCount}.`
        : ''
    const missingEnv = getStringArray(data.missingEnv)
    const missingEnvDetail = missingEnv.length > 0 ? ` Missing: ${missingEnv.join(', ')}.` : ''
    const gatewayName = typeof data.gateway === 'string' ? data.gateway : 'unknown'
    const providerLabel =
      typeof data.providerLabel === 'string'
        ? data.providerLabel
        : typeof data.provider === 'string'
          ? data.provider
          : 'unknown'
    return {
      state: ok ? 'partial' : 'unhealthy',
      detail: `Gateway=${gatewayName}, checkout=${data.checkoutEnabled ? 'enabled' : 'disabled'}, provider=${providerLabel}.${priceCoverage}${missingEnvDetail}`.trim(),
      latency,
    }
  }

  if (checkId === 'billing') {
    if (data.checkoutReady) return { state: 'healthy', detail: 'Checkout runtime ready.', latency }
    const gatewayName =
      typeof gateway.activeGateway === 'string'
        ? gateway.activeGateway
        : typeof gateway.gateway === 'string'
          ? gateway.gateway
          : 'unknown'
    const providerName =
      typeof provider.label === 'string'
        ? provider.label
        : typeof provider.id === 'string'
          ? provider.id
          : 'unknown'
    const priceCoverage =
      typeof stripe.configuredPriceCount === 'number' && typeof stripe.requiredPriceCount === 'number'
        ? ` prices=${stripe.configuredPriceCount}/${stripe.requiredPriceCount}.`
        : ''
    const missingEnv = getStringArray(stripe.missingEnv)
    const missingEnvDetail = missingEnv.length > 0 ? ` Missing: ${missingEnv.join(', ')}.` : ''
    return {
      state: data.status === 'partial' ? 'partial' : ok ? 'partial' : 'unhealthy',
      detail: `Billing runtime is still partial. Gateway=${gatewayName}, provider=${providerName}.${priceCoverage}${missingEnvDetail}`.trim(),
      latency,
    }
  }

  return {
    state: ok ? 'healthy' : 'unhealthy',
    detail: ok ? 'Operational.' : 'Endpoint failed.',
    latency,
  }
}

export async function fetchSurface(check: SurfaceCheck): Promise<SurfaceResult> {
  try {
    const response = await fetch(check.endpoint, { cache: 'no-store' })
    const payload = await response.json().catch(() => ({}))
    const summary = summarizePayload(check.id, payload, response.ok)
    return { id: check.id, name: check.name, ...summary }
  } catch (error) {
    return {
      id: check.id,
      name: check.name,
      state: 'unhealthy',
      detail: error instanceof Error ? error.message : 'Request failed.',
    }
  }
}

export function summarizeOverallState(surfaces: SurfaceResult[], checks: SurfaceCheck[]): SurfaceState {
  if (surfaces.length === 0) return 'unknown'
  const requiredIds = new Set(checks.filter((check) => check.required).map((check) => check.id))
  const requiredSurfaces = surfaces.filter((surface) => requiredIds.has(surface.id))
  if (requiredSurfaces.some((surface) => surface.state === 'unhealthy')) return 'unhealthy'
  if (surfaces.some((surface) => surface.state === 'partial')) return 'partial'
  if (surfaces.every((surface) => surface.state === 'healthy')) return 'healthy'
  return 'unknown'
}

export function getStateCounts(surfaces: SurfaceResult[]) {
  return {
    healthy: surfaces.filter((surface) => surface.state === 'healthy').length,
    partial: surfaces.filter((surface) => surface.state === 'partial').length,
    unhealthy: surfaces.filter((surface) => surface.state === 'unhealthy').length,
  }
}

export function getOverallTitle(overall: SurfaceState) {
  if (overall === 'healthy') return 'Public runtime operational'
  if (overall === 'partial') return 'Public runtime partial'
  if (overall === 'unhealthy') return 'Runtime has active blockers'
  return 'Collecting signals'
}

export function getOverallDescription(overall: SurfaceState) {
  if (overall === 'healthy') return 'Configured public checks responded without relevant blockers.'
  if (overall === 'partial') return 'The public base responds, but some subsystems are still partial.'
  if (overall === 'unhealthy') return 'One or more essential runtime blocks failed public verification.'
  return 'Updating operational checks in real time.'
}

export function getCoverageSummary(
  surfaces: SurfaceResult[],
  checks: SurfaceCheck[],
  blockingSurfaces: SurfaceResult[],
  partialSurfaces: SurfaceResult[]
): { customerImpact: string; cards: StatusCoverageCard[] } {
  const requiredCount = checks.filter((check) => check.required).length
  const respondingCount = surfaces.filter((surface) => surface.state !== 'unknown').length

  if (blockingSurfaces.length > 0) {
    return {
      customerImpact:
        'There is potential direct customer impact: at least one mandatory dependency failed the public check.',
      cards: [
        {
          title: 'Coverage proven now',
          detail: `${respondingCount}/${checks.length} checks responded in this round. ${requiredCount} are mandatory for the base experience.`,
        },
        {
          title: 'Commercial reading',
          detail: 'This is not treated as green status. The page declares a public blocker when the app, status, or database checks fail.',
        },
        {
          title: 'Not published yet',
          detail: 'We do not show SLA, rolling uptime, or archived postmortems while that public track does not exist.',
        },
      ],
    }
  }

  if (partialSurfaces.length > 0) {
    return {
      customerImpact:
        'Users can access the public base, but sellable capabilities like billing, AI, or optional dependencies may still vary.',
      cards: [
        {
          title: 'Coverage proven now',
          detail: `${respondingCount}/${checks.length} checks responded. The public base is up, but some checks are still incomplete.`,
        },
        {
          title: 'Commercial reading',
          detail: 'Partial means the journey may work, but still lacks full coverage for credentials, checkout, or storage.',
        },
        {
          title: 'Not published yet',
          detail: 'We do not promise historical reliability beyond what current checks can publicly prove.',
        },
      ],
    }
  }

  return {
    customerImpact:
      'No public blocker appeared in mandatory checks this round, but the page remains limited to what these endpoints can prove.',
    cards: [
      {
        title: 'Coverage proven now',
        detail: `${respondingCount}/${checks.length} checks responded in this round. Mandatory checks did not report an active blocker.`,
      },
      {
        title: 'Commercial reading',
        detail: 'The current status is useful for immediate public health, not as a replacement for formal SLA or incident history.',
      },
      {
        title: 'Not published yet',
        detail: 'We still do not have rolling uptime, a resolved incident archive, or full L4 receipt coverage on this public page.',
      },
    ],
  }
}

export function getStatusTimeline(
  overall: SurfaceState,
  blockingSurfaces: SurfaceResult[],
  partialSurfaces: SurfaceResult[],
  lastUpdated: string | null
): StatusTimelineEntry[] {
  const timestampLabel = lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-US') : 'now'
  const activeIncidentTitle =
    overall === 'healthy'
      ? 'No active public incident in mandatory checks'
      : overall === 'partial'
        ? 'Active degradation in capabilities that are not fully closed'
        : overall === 'unhealthy'
          ? 'Active public incident on mandatory check'
          : 'Checks are still collecting state'

  const activeIncidentDetail =
    overall === 'healthy'
      ? 'The current reading did not find a blocker in app, status, or database. This does not replace SLA history.'
      : overall === 'partial'
        ? `The base responds, but ${partialSurfaces.map((surface) => surface.name).join(', ') || 'some checks'} are still partial.`
        : overall === 'unhealthy'
          ? `The ${blockingSurfaces.map((surface) => surface.name).join(', ') || 'mandatory'} checks failed the current public check.`
          : 'The first collection is still in progress.'

  return [
    {
      id: 'now',
      label: 'Now',
      title: activeIncidentTitle,
      detail: activeIncidentDetail,
      tone: overall === 'unknown' ? 'unknown' : overall,
      timestampLabel,
    },
    {
      id: 'watch',
      label: 'Commercial reading',
      title: partialSurfaces.length > 0 ? 'Sellable capabilities still under observation' : 'No partial commercial alert this round',
      detail:
        partialSurfaces.length > 0
          ? `The page is being honest about ${partialSurfaces.length} still-partial check(s) to avoid selling coverage the runtime has not proven.`
          : 'No partial commercial alert was needed in this public collection.',
      tone: partialSurfaces.length > 0 ? 'partial' : 'healthy',
      timestampLabel,
    },
    {
      id: 'history-gap',
      label: 'History',
      title: 'Public incident archive still incomplete',
      detail:
        'This page now shows current state with better quality, but it still does not publish closed incident timelines, rolling uptime, or formal postmortems.',
      tone: 'partial',
      timestampLabel: 'open gap',
    },
  ]
}

export function getNextActions(blockingSurfaces: SurfaceResult[], partialSurfaces: SurfaceResult[]) {
  if (blockingSurfaces.some((surface) => surface.id === 'database')) {
    return [
      'Restore database connectivity.',
      'Revalidate app status after the connection returns.',
      'Update this page only when the public check proves recovery.',
    ]
  }

  if (blockingSurfaces.some((surface) => surface.id === 'runtime' || surface.id === 'readiness')) {
    return [
      'Recover app liveness and status before promoting any public narrative.',
      'Run a new check cycle to confirm runtime stability.',
      'Only then consider the capability commercially reliable again.',
    ]
  }

  if (partialSurfaces.some((surface) => surface.id === 'stripe' || surface.id === 'billing')) {
    return [
      'Complete checkout and webhook status before treating billing as sellable.',
      'Validate plans and price IDs with the real billing runtime.',
      'Publish that gain here only when checks stop marking it partial.',
    ]
  }

  if (partialSurfaces.some((surface) => surface.id === 'storage' || surface.id === 'cache' || surface.id === 'ai')) {
    return [
      'Close credentials and configuration for optional dependencies that are still partial.',
      'Run a new public check to confirm the operational coverage gain.',
      'Use the commercial reading to avoid promising an experience that still depends on manual setup.',
    ]
  }

  return [
    'Keep public checks responding and expand real production evidence.',
    'Open a public history of resolved incidents when that track is mature.',
    'Use monitoring admin to close L4 blockers that do not appear here yet.',
  ]
}
