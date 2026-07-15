import { ENGINE_SPINE_MODULES } from './engine-spine-modules.data';
import type {
  EngineSpineDecisionMatrixRow,
  EngineSpineLoadStrategy,
  EngineSpineModule,
  EngineSpineReadinessModel,
  EngineSpineStatus,
} from './engine-spine-modules.types';

export { ENGINE_SPINE_MODULES } from './engine-spine-modules.data';
export type * from './engine-spine-modules.types';

export function getEngineSpineSummary() {
  const totalLoc = ENGINE_SPINE_MODULES.reduce((sum, engineModule) => sum + engineModule.estimatedLoc, 0)
  const ready = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'ready-to-wire').length
  const held = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'worker-held').length
  const adapterNeeded = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'adapter-needed').length
  const heavyHeld = ENGINE_SPINE_MODULES.filter((engineModule) =>
    engineModule.loadStrategy === 'worker-or-sidecar' || engineModule.loadStrategy === 'native-or-cloud'
  ).length

  return {
    totalModules: ENGINE_SPINE_MODULES.length,
    totalLoc,
    ready,
    held,
    adapterNeeded,
    heavyHeld,
  }
}

export function getEngineSpineModulesByIds(ids: readonly string[]) {
  const wanted = new Set(ids)
  return ENGINE_SPINE_MODULES.filter((engineModule) => wanted.has(engineModule.id))
}

function countLoc(modules: readonly EngineSpineModule[]) {
  return modules.reduce((sum, engineModule) => sum + engineModule.estimatedLoc, 0)
}

function countHighRisk(modules: readonly EngineSpineModule[]) {
  return modules.filter((engineModule) => engineModule.risk === 'high').length
}

export function getEngineSpineDecisionMatrix(groupBy: 'domain' | 'status' | 'loadStrategy' = 'domain'): EngineSpineDecisionMatrixRow[] {
  const labels: Record<string, string> = {
    render: 'Render',
    world: 'World',
    film: 'Film',
    systems: 'Systems',
    network: 'Network',
    assets: 'Assets',
    native: 'Native',
    visible: 'Visible',
    'ready-to-wire': 'Ready to wire',
    'adapter-needed': 'Adapter needed',
    'worker-held': 'Worker held',
    'already-visible': 'Already visible',
    'dynamic-client-only': 'Dynamic client only',
    'summary-adapter': 'Summary adapter',
    'worker-or-sidecar': 'Worker or sidecar',
    'native-or-cloud': 'Native or cloud',
  }
  const grouped = new Map<string, EngineSpineModule[]>()

  for (const engineModule of ENGINE_SPINE_MODULES) {
    const key = engineModule[groupBy]
    grouped.set(key, [...(grouped.get(key) ?? []), engineModule])
  }

  return [...grouped.entries()]
    .map(([key, modules]) => ({
      key,
      label: labels[key] ?? key,
      modules,
      totalLoc: countLoc(modules),
      highRisk: countHighRisk(modules),
    }))
    .sort((left, right) => right.highRisk - left.highRisk || right.totalLoc - left.totalLoc || left.label.localeCompare(right.label))
}

export function getEngineSpinePriorityModules(limit = 6): EngineSpineModule[] {
  const statusWeight: Record<EngineSpineStatus, number> = {
    'worker-held': 40,
    'adapter-needed': 30,
    'ready-to-wire': 20,
    visible: 5,
  }
  const riskWeight: Record<EngineSpineModule['risk'], number> = {
    high: 30,
    medium: 15,
    low: 5,
  }
  const loadWeight: Record<EngineSpineLoadStrategy, number> = {
    'worker-or-sidecar': 16,
    'native-or-cloud': 14,
    'summary-adapter': 10,
    'dynamic-client-only': 7,
    'already-visible': 0,
  }

  return [...ENGINE_SPINE_MODULES]
    .sort((left, right) => {
      const rightScore = statusWeight[right.status] + riskWeight[right.risk] + loadWeight[right.loadStrategy] + right.estimatedLoc / 1000
      const leftScore = statusWeight[left.status] + riskWeight[left.risk] + loadWeight[left.loadStrategy] + left.estimatedLoc / 1000
      return rightScore - leftScore || right.estimatedLoc - left.estimatedLoc || left.label.localeCompare(right.label)
    })
    .slice(0, limit)
}

export function getEngineSpineReadinessModel(): EngineSpineReadinessModel {
  const summary = getEngineSpineSummary()
  const workerHeld = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'worker-held')
  const adapterNeeded = ENGINE_SPINE_MODULES.filter((engineModule) => engineModule.status === 'adapter-needed')
  const blockers: string[] = []

  if (workerHeld.length > 0) {
    blockers.push(`${workerHeld.length} module(s) require worker, sidecar, native, or cloud boundaries before execution.`)
  }
  if (adapterNeeded.length > 0) {
    blockers.push(`${adapterNeeded.length} module(s) need read-only adapters before product writes are safe.`)
  }
  if (summary.heavyHeld > 0) {
    blockers.push(`${summary.heavyHeld} heavy module(s) must not be loaded directly in public, dashboard, or default Studio bundles.`)
  }

  if (workerHeld.length > 0) {
    return {
      state: 'worker-held',
      label: 'Worker held',
      summary: 'The engine spine is valuable, but high-risk modules are still held behind runtime boundaries.',
      blockers,
      nextAction: 'Build read-only adapters first, then route heavy execution through worker, sidecar, Studio Local, or Cloud Stream capabilities.',
    }
  }

  if (adapterNeeded.length > 0) {
    return {
      state: 'needs-adapters',
      label: 'Needs adapters',
      summary: 'The next safe move is adapter exposure, not direct runtime execution.',
      blockers,
      nextAction: 'Expose owner surface, evidence signals, and rollback contract for each module before enabling agent writes.',
    }
  }

  if (summary.ready > 0) {
    return {
      state: 'needs-review',
      label: 'Needs review',
      summary: 'Ready modules can be surfaced, but still require evidence review before writes or exports.',
      blockers,
      nextAction: 'Wire read-only panels into their Studio surfaces and keep mutations review-gated.',
    }
  }

  return {
    state: 'ready',
    label: 'Ready',
    summary: 'All tracked modules have visible boundaries.',
    blockers,
    nextAction: 'Keep gates active and only expand runtime execution when capability evidence exists.',
  }
}
