export type ManagedPreviewProviderId = 'custom-endpoint' | 'e2b' | 'webcontainers'

export type ManagedPreviewProviderConfig = {
  id: ManagedPreviewProviderId
  label: string
  setupEnv: string[]
  routeProvisionSupported: boolean
  mode: 'route-managed' | 'browser-side'
}

const PROVIDERS: Record<ManagedPreviewProviderId, ManagedPreviewProviderConfig> = {
  'custom-endpoint': {
    id: 'custom-endpoint',
    label: 'Custom endpoint',
    setupEnv: ['AETHEL_PREVIEW_PROVISION_ENDPOINT', 'AETHEL_PREVIEW_PROVISION_ENDPOINTS', 'AETHEL_PREVIEW_PROVISION_TOKEN'],
    routeProvisionSupported: true,
    mode: 'route-managed',
  },
  e2b: {
    id: 'e2b',
    label: 'E2B',
    setupEnv: ['AETHEL_PREVIEW_PROVIDER', 'AETHEL_PREVIEW_PROVISION_ENDPOINT', 'AETHEL_PREVIEW_PROVISION_TOKEN'],
    routeProvisionSupported: true,
    mode: 'route-managed',
  },
  webcontainers: {
    id: 'webcontainers',
    label: 'WebContainers',
    setupEnv: ['AETHEL_PREVIEW_PROVIDER'],
    routeProvisionSupported: false,
    mode: 'browser-side',
  },
}

export function parseManagedPreviewProvider(raw: string | undefined): ManagedPreviewProviderId | null {
  const value = String(raw ?? '').trim().toLowerCase()
  if (!value) return null
  if (value === 'e2b') return 'e2b'
  if (value === 'webcontainers') return 'webcontainers'
  return 'custom-endpoint'
}

export function getManagedPreviewProviderConfig(raw: string | undefined) {
  const providerId = parseManagedPreviewProvider(raw)
  if (!providerId) return null
  return PROVIDERS[providerId]
}

export function parseConfiguredProvisionEndpoints(rawSingle: string, rawList: string): string[] {
  const values = [rawSingle, ...rawList.split(',')]
    .map((entry) => entry.trim())
    .filter(Boolean)
  const unique: string[] = []
  const seen = new Set<string>()
  for (const entry of values) {
    let normalized = entry
    try {
      normalized = new URL(entry).toString()
    } catch {
      // Keep original to surface invalid endpoint issues explicitly in the provision route.
    }
    if (seen.has(normalized)) continue
    seen.add(normalized)
    unique.push(normalized)
  }
  return unique
}
