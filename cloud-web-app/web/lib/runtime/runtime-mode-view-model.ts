import {
  STUDIO_LOCAL_RELEASE_MANIFEST,
  type RuntimeReleaseStatus,
  type RuntimeTargetManifest,
} from '@/lib/studio-local/release-manifest'

export type RuntimeModeId = 'browser' | 'local' | 'cloud'
export type RuntimeModeTarget = 'local-main-safe' | 'local-native' | 'cloud-sandbox' | 'held'

export type RuntimeModeViewModel = {
  id: RuntimeModeId
  label: 'Browser' | 'Studio Local' | 'Cloud Stream'
  runtimeTarget: RuntimeModeTarget
  status: RuntimeReleaseStatus
  badge: string
  detail: string
  costNote: string
  fallbackReason?: string
  selectable: boolean
}

type RuntimeModeOptions = {
  pixelStreamUrl?: string | null
}

function findManifestTarget(label: RuntimeTargetManifest['label']) {
  const target = STUDIO_LOCAL_RELEASE_MANIFEST.targets.find((item) => item.label === label)
  if (!target) {
    throw new Error(`Runtime release manifest missing target: ${label}`)
  }
  return target
}

function badgeFor(status: RuntimeReleaseStatus) {
  if (status === 'available') return 'Available'
  if (status === 'beta') return 'Beta'
  if (status === 'held') return 'Held'
  return 'Planned'
}

export function buildRuntimeModeViewModels(options: RuntimeModeOptions = {}): RuntimeModeViewModel[] {
  const browser = findManifestTarget('Browser preview')
  const local = findManifestTarget('Studio Local')
  const cloud = findManifestTarget('Cloud Stream')
  const cloudConfigured = Boolean(options.pixelStreamUrl)

  return [
    {
      id: 'browser',
      label: 'Browser',
      runtimeTarget: 'local-main-safe',
      status: browser.status,
      badge: badgeFor(browser.status),
      detail: browser.detail,
      costNote: browser.costNote ?? 'Included in normal workspace usage.',
      fallbackReason: browser.fallbackReason,
      selectable: true,
    },
    {
      id: 'local',
      label: 'Studio Local',
      runtimeTarget: 'local-native',
      status: local.status,
      badge: badgeFor(local.status),
      detail: local.detail,
      costNote: local.costNote ?? 'Local execution depends on device capability.',
      fallbackReason: local.fallbackReason,
      selectable: true,
    },
    {
      id: 'cloud',
      label: 'Cloud Stream',
      runtimeTarget: cloudConfigured ? 'cloud-sandbox' : 'held',
      status: cloudConfigured ? 'beta' : 'held',
      badge: cloudConfigured ? 'Beta' : 'Held',
      detail: cloud.detail,
      costNote: cloud.costNote ?? 'GPU streaming requires visible per-minute cost.',
      fallbackReason: cloudConfigured ? cloud.fallbackReason : cloud.fallbackReason ?? 'Cloud Stream is held until a governed signaling server is configured.',
      selectable: cloudConfigured,
    },
  ]
}

export function findRuntimeModeById(modes: RuntimeModeViewModel[], id: RuntimeModeId) {
  return modes.find((mode) => mode.id === id) ?? modes[0]
}

export function runtimeModeForTarget(modes: RuntimeModeViewModel[], target: string) {
  if (target === 'cloud-sandbox' || target === 'held') {
    return modes.find((mode) => mode.id === 'cloud') ?? modes[0]
  }
  if (target === 'local-native' || target === 'local-worker') {
    return modes.find((mode) => mode.id === 'local') ?? modes[0]
  }
  return modes.find((mode) => mode.id === 'browser') ?? modes[0]
}
