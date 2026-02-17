import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'

type RouteStatus = 'compatibility-wrapper' | 'deprecated'

export type CompatibilityRouteMetric = {
  route: string
  replacement: string
  status: RouteStatus
  hits: number
  lastHitAt: string
  deprecatedSince?: string
  removalCycleTarget?: string
  deprecationPolicy?: string
}

type CompatibilityRouteStore = Record<string, CompatibilityRouteMetric>

type PersistedPayload = {
  version: 1
  updatedAt: string
  routes: CompatibilityRouteMetric[]
}

const METRICS_KEY = 'compatibility.route.metrics.v1'
const METRICS_SCOPE = 'global'
const DEFAULT_DEPRECATION_POLICY = 'phaseout_after_2_cycles'

const KNOWN_DEPRECATED_ROUTES: Array<{
  route: string
  replacement: string
  deprecatedSince: string
  removalCycleTarget: string
  deprecationPolicy: string
}> = [
  {
    route: '/api/workspace/tree',
    replacement: '/api/files/tree',
    deprecatedSince: '2026-02-11',
    removalCycleTarget: '2026-cycle-2',
    deprecationPolicy: DEFAULT_DEPRECATION_POLICY,
  },
  {
    route: '/api/workspace/files',
    replacement: '/api/files/fs?action=list',
    deprecatedSince: '2026-02-11',
    removalCycleTarget: '2026-cycle-2',
    deprecationPolicy: DEFAULT_DEPRECATION_POLICY,
  },
  {
    route: '/api/auth/sessions',
    replacement: 'JWT auth endpoints',
    deprecatedSince: '2026-02-11',
    removalCycleTarget: '2026-cycle-2',
    deprecationPolicy: DEFAULT_DEPRECATION_POLICY,
  },
  {
    route: '/api/auth/sessions/[id]',
    replacement: 'JWT auth endpoints',
    deprecatedSince: '2026-02-11',
    removalCycleTarget: '2026-cycle-2',
    deprecationPolicy: DEFAULT_DEPRECATION_POLICY,
  },
]

declare global {
  // eslint-disable-next-line no-var
  var __aethelCompatibilityRouteStore: CompatibilityRouteStore | undefined
  // eslint-disable-next-line no-var
  var __aethelCompatibilityPersistQueue: Promise<void> | undefined
}

function getStore(): CompatibilityRouteStore {
  if (!globalThis.__aethelCompatibilityRouteStore) {
    globalThis.__aethelCompatibilityRouteStore = {}
  }
  return globalThis.__aethelCompatibilityRouteStore
}

function getStoreKey(route: string, replacement: string, status: RouteStatus): string {
  return `${status}:${route}:${replacement}`
}

function mergeMetric(store: CompatibilityRouteStore, metric: CompatibilityRouteMetric) {
  const key = getStoreKey(metric.route, metric.replacement, metric.status)
  const existing = store[key]
  if (!existing) {
    store[key] = { ...metric }
    return
  }
  existing.hits = Math.max(existing.hits, metric.hits)
  existing.lastHitAt = existing.lastHitAt > metric.lastHitAt ? existing.lastHitAt : metric.lastHitAt
  existing.deprecatedSince = existing.deprecatedSince || metric.deprecatedSince
  existing.removalCycleTarget = existing.removalCycleTarget || metric.removalCycleTarget
  existing.deprecationPolicy = existing.deprecationPolicy || metric.deprecationPolicy
}

async function readPersistedMetrics(): Promise<CompatibilityRouteMetric[]> {
  const ideSetting = (prisma as any).ideSetting
  if (!ideSetting) return []

  const row = await ideSetting.findUnique({
    where: {
      key_scope: {
        key: METRICS_KEY,
        scope: METRICS_SCOPE,
      },
    },
    select: { value: true },
  })

  const raw = row?.value as PersistedPayload | undefined
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.routes)) return []
  return raw.routes.filter(
    (item): item is CompatibilityRouteMetric =>
      !!item &&
      typeof item.route === 'string' &&
      typeof item.replacement === 'string' &&
      typeof item.status === 'string' &&
      typeof item.hits === 'number' &&
      typeof item.lastHitAt === 'string'
  )
}

async function persistMetricsSnapshot(snapshot: CompatibilityRouteMetric[]) {
  const ideSetting = (prisma as any).ideSetting
  if (!ideSetting) return

  const payload: PersistedPayload = {
    version: 1,
    updatedAt: new Date().toISOString(),
    routes: snapshot,
  }

  await ideSetting.upsert({
    where: {
      key_scope: {
        key: METRICS_KEY,
        scope: METRICS_SCOPE,
      },
    },
    update: {
      value: payload,
      updatedBy: 'system:compatibility-route-telemetry',
    },
    create: {
      key: METRICS_KEY,
      scope: METRICS_SCOPE,
      value: payload,
      updatedBy: 'system:compatibility-route-telemetry',
    },
  })
}

function queuePersistSnapshot() {
  const store = getStore()
  const snapshot = Object.values(store)
  const queue = globalThis.__aethelCompatibilityPersistQueue || Promise.resolve()

  globalThis.__aethelCompatibilityPersistQueue = queue
    .then(async () => {
      await persistMetricsSnapshot(snapshot)
    })
    .catch((error) => {
      console.warn('[compat-route] persist failed:', error instanceof Error ? error.message : String(error))
    })
}

export function trackCompatibilityRouteHit(params: {
  request: NextRequest
  route: string
  replacement: string
  status: RouteStatus
  deprecatedSince?: string
  removalCycleTarget?: string
  deprecationPolicy?: string
}): Record<string, string> {
  const { request, route, replacement, status, deprecatedSince, removalCycleTarget, deprecationPolicy } = params
  const now = new Date().toISOString()
  const key = getStoreKey(route, replacement, status)
  const store = getStore()

  if (!store[key]) {
    store[key] = {
      route,
      replacement,
      status,
      hits: 0,
      lastHitAt: now,
      deprecatedSince,
      removalCycleTarget,
      deprecationPolicy,
    }
  }

  store[key].hits += 1
  store[key].lastHitAt = now
  if (deprecatedSince) store[key].deprecatedSince = deprecatedSince
  if (removalCycleTarget) store[key].removalCycleTarget = removalCycleTarget
  if (deprecationPolicy) store[key].deprecationPolicy = deprecationPolicy
  queuePersistSnapshot()

  const ua = request.headers.get('user-agent') || 'unknown'
  console.warn(
    `[compat-route] status=${status} route=${route} replacement=${replacement} hits=${store[key].hits} ua=${ua.slice(0, 60)}`
  )

  const headers: Record<string, string> = {
    'x-aethel-route-status': status,
    'x-aethel-compat-route': route,
    'x-aethel-compat-replacement': replacement,
  }

  if (deprecatedSince) headers['x-aethel-deprecated-since'] = deprecatedSince
  if (removalCycleTarget) headers['x-aethel-removal-cycle-target'] = removalCycleTarget
  if (deprecationPolicy) headers['x-aethel-deprecation-policy'] = deprecationPolicy

  return headers
}

export async function getCompatibilityRouteMetrics(): Promise<CompatibilityRouteMetric[]> {
  const inMemory = getStore()
  const merged: CompatibilityRouteStore = { ...inMemory }

  try {
    const persisted = await readPersistedMetrics()
    for (const metric of persisted) {
      mergeMetric(merged, metric)
    }
  } catch (error) {
    console.warn('[compat-route] read persisted metrics failed:', error instanceof Error ? error.message : String(error))
  }

  // Ensure known deprecated routes appear even with zero hits, so cutoff dashboards remain actionable.
  for (const route of KNOWN_DEPRECATED_ROUTES) {
    const key = getStoreKey(route.route, route.replacement, 'deprecated')
    if (!merged[key]) {
      merged[key] = {
        route: route.route,
        replacement: route.replacement,
        status: 'deprecated',
        hits: 0,
        lastHitAt: '',
        deprecatedSince: route.deprecatedSince,
        removalCycleTarget: route.removalCycleTarget,
        deprecationPolicy: route.deprecationPolicy,
      }
      continue
    }

    merged[key].deprecatedSince = merged[key].deprecatedSince || route.deprecatedSince
    merged[key].removalCycleTarget = merged[key].removalCycleTarget || route.removalCycleTarget
    merged[key].deprecationPolicy = merged[key].deprecationPolicy || route.deprecationPolicy
  }

  return Object.values(merged).sort((a, b) => {
    if (b.hits !== a.hits) return b.hits - a.hits
    return a.route.localeCompare(b.route)
  })
}
