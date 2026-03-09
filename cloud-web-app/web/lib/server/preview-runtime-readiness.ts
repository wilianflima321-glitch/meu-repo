import { DEFAULT_RUNTIME_CANDIDATES, discoverPreviewRuntime } from '@/lib/server/preview-runtime'
import {
  getManagedPreviewProviderConfig,
  parseConfiguredProvisionEndpoints,
} from '@/lib/server/preview-provider-config'

export type PreviewRuntimeReadiness = {
  status: 'ready' | 'partial'
  strategy: 'managed' | 'local' | 'inline'
  recommendedAction: 'provision' | 'discover' | 'inline'
  managedConfigured: boolean
  managedProvider: string | null
  managedProviderLabel: string | null
  managedProviderMode: 'route-managed' | 'browser-side' | 'unknown'
  managedSetupEnv: string[]
  routeProvisionSupported: boolean
  preferredRuntimeUrl: string | null
  readyForManagedProvision: boolean
  blockers: string[]
  instructions: string[]
  recommendedCommands: string[]
  metadata: {
    configuredEndpoints: string[]
    localDiscovery: {
      preferredRuntimeUrl: string | null
      reachableCandidates: number
      totalCandidates: number
    }
  }
}

export async function getPreviewRuntimeReadiness(): Promise<PreviewRuntimeReadiness> {
  const isRuntimeConfigured = (value: string | undefined) => {
    const normalized = String(value ?? '').trim()
    if (!normalized) return false
    const lowered = normalized.toLowerCase()
    if (lowered.includes('replace_me') || lowered.includes('replace-with')) return false
    if (lowered.includes('example.com')) return false
    return true
  }
  const configuredEndpoints = parseConfiguredProvisionEndpoints(
    isRuntimeConfigured(process.env.AETHEL_PREVIEW_PROVISION_ENDPOINT)
      ? String(process.env.AETHEL_PREVIEW_PROVISION_ENDPOINT || '').trim()
      : '',
    isRuntimeConfigured(process.env.AETHEL_PREVIEW_PROVISION_ENDPOINTS)
      ? String(process.env.AETHEL_PREVIEW_PROVISION_ENDPOINTS || '').trim()
      : ''
  )
  const providerConfig =
    getManagedPreviewProviderConfig(process.env.AETHEL_PREVIEW_PROVIDER) ||
    (configuredEndpoints.length > 0 ? getManagedPreviewProviderConfig('custom-endpoint') : null)
  const managedConfigured = Boolean(providerConfig) || configuredEndpoints.length > 0
  const managedProvider = providerConfig?.id || null
  const managedProviderLabel = providerConfig?.label || (configuredEndpoints.length > 0 ? 'Custom endpoint' : null)
  const managedProviderMode = providerConfig?.mode || (configuredEndpoints.length > 0 ? 'route-managed' : 'unknown')
  const managedSetupEnv = providerConfig?.setupEnv || []
  const discovery = await discoverPreviewRuntime(DEFAULT_RUNTIME_CANDIDATES, 1200)
  const preferredRuntimeUrl = discovery.preferredRuntimeUrl
  const instructions: string[] = []
  const recommendedCommands: string[] = []

  const blockers: string[] = []
  let strategy: PreviewRuntimeReadiness['strategy'] = 'inline'

  if (managedConfigured) {
    strategy = 'managed'
    instructions.push(`Managed preview provider: ${providerConfig?.label || managedProvider || 'custom-endpoint'}.`)
    if (providerConfig && !providerConfig.routeProvisionSupported) {
      instructions.push('WebContainers path is declared, but runtime wiring still depends on browser-side integration.')
      recommendedCommands.push('Set NEXT_PUBLIC_PREVIEW_RUNTIME_URL or implement browser-side WebContainers boot path.')
    } else if (!isRuntimeConfigured(process.env.AETHEL_PREVIEW_PROVISION_TOKEN)) {
      blockers.push('AETHEL_PREVIEW_PROVISION_TOKEN_MISSING')
      instructions.push('Set AETHEL_PREVIEW_PROVISION_TOKEN to enable managed provisioning.')
      recommendedCommands.push('npm run setup:preview-runtime')
      recommendedCommands.push('Populate preview envs in cloud-web-app/web/.env.local')
    } else {
      instructions.push('Use Provision runtime to create a managed preview session.')
      recommendedCommands.push('Provision runtime from the IDE preview toolbar')
    }
  } else if (preferredRuntimeUrl) {
    strategy = 'local'
    instructions.push('A local dev runtime was detected.')
    instructions.push('Use Detect runtime to bind the preferred local preview URL.')
    recommendedCommands.push('Open the IDE and use Detect runtime')
  } else {
    blockers.push('MANAGED_PREVIEW_NOT_CONFIGURED')
    blockers.push('LOCAL_RUNTIME_NOT_DETECTED')
    instructions.push('Start a local dev server or configure a managed preview endpoint.')
    instructions.push('Inline preview remains the current fallback until runtime provisioning is available.')
    recommendedCommands.push('npm --prefix cloud-web-app/web run dev')
    recommendedCommands.push('npm run setup:preview-runtime')
    recommendedCommands.push('Populate preview envs in cloud-web-app/web/.env.local')
  }

  const readyForManagedProvision =
    managedConfigured &&
    providerConfig?.routeProvisionSupported !== false &&
    !blockers.includes('AETHEL_PREVIEW_PROVISION_TOKEN_MISSING')

  return {
    status:
      strategy === 'managed' && readyForManagedProvision
        ? 'ready'
        : strategy === 'local'
          ? 'ready'
          : 'partial',
    strategy,
    recommendedAction:
      strategy === 'managed' && readyForManagedProvision
        ? 'provision'
        : preferredRuntimeUrl
          ? 'discover'
          : 'inline',
    managedConfigured,
    managedProvider,
    managedProviderLabel,
    managedProviderMode,
    managedSetupEnv,
    routeProvisionSupported: providerConfig?.routeProvisionSupported !== false,
    preferredRuntimeUrl,
    readyForManagedProvision,
    blockers,
    instructions,
    recommendedCommands: Array.from(new Set(recommendedCommands)),
    metadata: {
      configuredEndpoints,
      localDiscovery: {
        preferredRuntimeUrl,
        reachableCandidates: discovery.summary.reachable,
        totalCandidates: discovery.summary.total,
      },
    },
  }
}
