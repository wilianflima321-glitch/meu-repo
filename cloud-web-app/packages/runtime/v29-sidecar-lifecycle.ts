export type V29SidecarId =
  | 'wgpu-renderer'
  | 'ffmpeg'
  | 'ffprobe'
  | 'onnx-runtime'
  | 'browser-operator'
  | 'asset-optimizer'
  | 'shader-compiler'
  | 'native-compiler'
  | 'rapier-physics'

export const V29_SIDECAR_LIFECYCLE_REPORT_SETTINGS_KEY = 'aethelV29SidecarLifecycleReport'

export type V29SidecarLifecycleState = 'available' | 'held' | 'blocked' | 'missing' | 'needs-review'
export type V29SidecarOsTarget = 'all' | 'windows' | 'macos' | 'linux'
export type V29SidecarUpdateChannel = 'stable' | 'beta' | 'nightly'

export type V29SidecarLifecycleStage =
  | 'discovered'
  | 'acquired'
  | 'checksum-verified'
  | 'installed'
  | 'health-checked'
  | 'crash-recoverable'
  | 'update-channel-bound'
  | 'human-reviewed'

export type V29SidecarLifecycleEntry = {
  id: V29SidecarId
  label: string
  state: V29SidecarLifecycleState
  os: V29SidecarOsTarget
  requiredFor: string[]
  stages: V29SidecarLifecycleStage[]
  artifact: {
    source: string
    version: string | null
    checksum: string | null
    signatureRef: string | null
  }
  health: {
    lastProbeRef: string | null
    crashStateRef: string | null
    recoveryPolicy: 'restart-once' | 'hold-and-review' | 'manual-only'
  }
  update: {
    channel: V29SidecarUpdateChannel
    updateRef: string | null
  }
  evidenceRefs: string[]
  nextAction: string
}

export type V29SidecarLifecycleReport = {
  version: 1
  capability: 'AETHEL_V29_SIDECAR_LIFECYCLE'
  generatedAt: string
  sidecars: V29SidecarLifecycleEntry[]
  summary: {
    total: number
    available: number
    held: number
    missing: number
    checksumVerified: number
    healthChecked: number
    releaseReady: false
  }
  blockers: string[]
  claimPolicy: {
    allowedClaims: string[]
    prohibitedClaims: string[]
  }
  nextAction: string
}

export const V29_REQUIRED_SIDECARS: V29SidecarId[] = [
  'wgpu-renderer',
  'ffmpeg',
  'ffprobe',
  'onnx-runtime',
  'browser-operator',
  'asset-optimizer',
  'shader-compiler',
  'native-compiler',
  'rapier-physics',
]

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function lifecycleBlockers(entry: V29SidecarLifecycleEntry): string[] {
  const blockers: string[] = []
  if (entry.state === 'missing') blockers.push(`${entry.id}: sidecar is missing`)
  if (entry.state === 'blocked') blockers.push(`${entry.id}: sidecar is blocked`)
  if (entry.state === 'held') blockers.push(`${entry.id}: sidecar is held for human review`)
  if (!entry.artifact.checksum) blockers.push(`${entry.id}: artifact checksum is missing`)
  if (!entry.health.lastProbeRef) blockers.push(`${entry.id}: health probe receipt is missing`)
  if (!entry.health.crashStateRef) blockers.push(`${entry.id}: crash state receipt is missing`)
  if (!entry.update.updateRef) blockers.push(`${entry.id}: update channel receipt is missing`)
  if (!entry.stages.includes('human-reviewed')) blockers.push(`${entry.id}: human review stage is missing`)
  return blockers
}

function lifecycleStructuralErrors(entry: V29SidecarLifecycleEntry): string[] {
  const failures: string[] = []
  if (!entry.label.trim()) failures.push(`${entry.id}: label is required`)
  if (entry.requiredFor.length === 0) failures.push(`${entry.id}: requiredFor lanes are required`)
  if (entry.stages.length === 0) failures.push(`${entry.id}: lifecycle stages are required`)
  if (!entry.artifact.source.trim()) failures.push(`${entry.id}: artifact source is required`)
  if (entry.evidenceRefs.length === 0) failures.push(`${entry.id}: evidence refs are required`)
  if (!entry.nextAction.trim()) failures.push(`${entry.id}: next action is required`)
  return failures
}

export function buildV29SidecarLifecycleReport(params: {
  generatedAt?: string
  sidecars: V29SidecarLifecycleEntry[]
}): V29SidecarLifecycleReport {
  const blockers = unique([
    ...params.sidecars.flatMap(lifecycleBlockers),
    'Human review is required before claiming desktop sidecars are production ready.',
  ])

  return {
    version: 1,
    capability: 'AETHEL_V29_SIDECAR_LIFECYCLE',
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    sidecars: params.sidecars,
    summary: {
      total: params.sidecars.length,
      available: params.sidecars.filter((entry) => entry.state === 'available').length,
      held: params.sidecars.filter((entry) => entry.state === 'held').length,
      missing: params.sidecars.filter((entry) => entry.state === 'missing').length,
      checksumVerified: params.sidecars.filter((entry) => entry.stages.includes('checksum-verified')).length,
      healthChecked: params.sidecars.filter((entry) => entry.stages.includes('health-checked')).length,
      releaseReady: false,
    },
    blockers,
    claimPolicy: {
      allowedClaims: [
        'sidecar lifecycle measured',
        'sidecar health is gated by receipts',
        'sidecar release remains human-reviewed',
      ],
      prohibitedClaims: [
        'desktop ready',
        'native renderer ready',
        'signed installer',
        'production ready',
        'releaseReady=true',
        'autonomous execution ready',
        'Unreal-grade',
      ],
    },
    nextAction:
      blockers.length > 1
        ? 'Attach checksum, probe, crash, update, and human-review receipts before enabling heavier desktop lanes.'
        : 'Sidecar lifecycle has evidence; keep public release claims held until release approval.',
  }
}

export function validateV29SidecarLifecycleReport(report: V29SidecarLifecycleReport): string[] {
  const failures: string[] = []
  if (report.version !== 1) failures.push('invalid sidecar lifecycle report version')
  if (report.capability !== 'AETHEL_V29_SIDECAR_LIFECYCLE') failures.push('invalid sidecar lifecycle capability')
  if (report.summary.releaseReady !== false) failures.push('sidecar lifecycle cannot set releaseReady=true')
  const present = new Set(report.sidecars.map((entry) => entry.id))
  for (const id of V29_REQUIRED_SIDECARS) {
    if (!present.has(id)) failures.push(`missing required sidecar lifecycle entry: ${id}`)
  }
  if (!report.claimPolicy.prohibitedClaims.includes('native renderer ready')) {
    failures.push('native renderer ready claim must be prohibited')
  }
  if (!report.claimPolicy.prohibitedClaims.includes('signed installer')) {
    failures.push('signed installer claim must be prohibited')
  }
  if (!report.blockers.some((blocker) => blocker.includes('Human review is required'))) {
    failures.push('human review blocker is required')
  }
  for (const entry of report.sidecars) failures.push(...lifecycleStructuralErrors(entry))
  return unique(failures)
}

export function buildV29SidecarLifecycleEntry(params: {
  id: V29SidecarId
  label?: string
  state: V29SidecarLifecycleState
  os?: V29SidecarOsTarget
  requiredFor: string[]
  stages?: V29SidecarLifecycleStage[]
  source?: string
  version?: string | null
  checksum?: string | null
  signatureRef?: string | null
  lastProbeRef?: string | null
  crashStateRef?: string | null
  recoveryPolicy?: V29SidecarLifecycleEntry['health']['recoveryPolicy']
  channel?: V29SidecarUpdateChannel
  updateRef?: string | null
  evidenceRefs: string[]
  nextAction?: string
}): V29SidecarLifecycleEntry {
  return {
    id: params.id,
    label: params.label ?? params.id,
    state: params.state,
    os: params.os ?? 'all',
    requiredFor: params.requiredFor,
    stages: params.stages ?? ['discovered'],
    artifact: {
      source: params.source ?? `runtime-sidecar:${params.id}`,
      version: params.version ?? null,
      checksum: params.checksum ?? null,
      signatureRef: params.signatureRef ?? null,
    },
    health: {
      lastProbeRef: params.lastProbeRef ?? null,
      crashStateRef: params.crashStateRef ?? null,
      recoveryPolicy: params.recoveryPolicy ?? 'hold-and-review',
    },
    update: {
      channel: params.channel ?? 'beta',
      updateRef: params.updateRef ?? null,
    },
    evidenceRefs: params.evidenceRefs,
    nextAction:
      params.nextAction ??
      'Attach lifecycle receipts and keep heavy desktop execution claims held until human review.',
  }
}

export function readV29SidecarLifecycleReportFromSettings(settings: unknown): V29SidecarLifecycleReport | null {
  if (!isRecord(settings)) return null
  const candidate = settings[V29_SIDECAR_LIFECYCLE_REPORT_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1 || candidate.capability !== 'AETHEL_V29_SIDECAR_LIFECYCLE') return null
  return candidate as unknown as V29SidecarLifecycleReport
}

export function writeV29SidecarLifecycleReportToSettings(
  settings: unknown,
  report: V29SidecarLifecycleReport,
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [V29_SIDECAR_LIFECYCLE_REPORT_SETTINGS_KEY]: report,
  }
}
