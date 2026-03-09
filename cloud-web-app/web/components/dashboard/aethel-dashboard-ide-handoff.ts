import {
  discoverPreviewRuntimeDetails,
  getPreviewRuntimeReadiness,
  getStoredPreviewRuntimeUrl,
  persistPreviewRuntimeUrl,
  provisionPreviewRuntime,
} from '@/lib/preview/runtime-manager'

export type IdeHandoffResolution = {
  params: URLSearchParams
  runtimeUrl: string | null
  discoveryStatus:
    | 'stored'
    | 'provisioned'
    | 'found'
    | 'not-found'
    | 'provision-error'
    | 'provision-skipped'
    | 'inline'
    | 'error'
}

type ResolveIdeHandoffParamsInput = {
  entry: string
  projectId: string | null
  previewRuntimeStorageKey: string
}

export async function resolveIdeHandoffParams(input: ResolveIdeHandoffParamsInput): Promise<IdeHandoffResolution> {
  const params = new URLSearchParams()
  params.set('entry', input.entry)
  if (input.projectId) params.set('projectId', input.projectId)
  let provisionFailed = false

  if (typeof window === 'undefined') {
    return {
      params,
      runtimeUrl: null,
      discoveryStatus: 'error',
    }
  }

  const storedRuntimeUrl = getStoredPreviewRuntimeUrl(input.previewRuntimeStorageKey)
  if (storedRuntimeUrl) {
    const runtimeUrl = storedRuntimeUrl.trim()
    params.set('previewUrl', runtimeUrl)
    return {
      params,
      runtimeUrl,
      discoveryStatus: 'stored',
    }
  }

  const readiness = await getPreviewRuntimeReadiness().catch(() => null)
  const shouldAttemptProvision =
    readiness?.recommendedAction === 'provision' && readiness.routeProvisionSupported !== false
  const shouldAttemptDiscover =
    readiness?.recommendedAction === 'discover' || (!readiness?.recommendedAction && !shouldAttemptProvision)

  try {
    if (shouldAttemptProvision) {
      const provisionedRuntime = (await provisionPreviewRuntime(input.projectId)).runtimeUrl
      if (provisionedRuntime) {
        params.set('previewUrl', provisionedRuntime)
        persistPreviewRuntimeUrl(provisionedRuntime, input.previewRuntimeStorageKey)
        return {
          params,
          runtimeUrl: provisionedRuntime,
          discoveryStatus: 'provisioned',
        }
      }
    }
  } catch {
    provisionFailed = true
  }

  if (!shouldAttemptDiscover && !provisionFailed) {
    return {
      params,
      runtimeUrl: null,
      discoveryStatus: shouldAttemptProvision ? 'provision-skipped' : 'inline',
    }
  }

  try {
    const discovery = await discoverPreviewRuntimeDetails()
    const runtimeUrl = (discovery.preferredRuntimeUrl || '').trim() || null
    if (!runtimeUrl) {
      return {
        params,
        runtimeUrl: null,
        discoveryStatus:
          readiness?.recommendedAction === 'inline'
            ? 'inline'
            : provisionFailed
              ? 'provision-error'
              : 'not-found',
      }
    }

    params.set('previewUrl', runtimeUrl)
    persistPreviewRuntimeUrl(runtimeUrl, input.previewRuntimeStorageKey)
    return {
      params,
      runtimeUrl,
      discoveryStatus: 'found',
    }
  } catch {
    return {
      params,
      runtimeUrl: null,
      discoveryStatus: provisionFailed ? 'provision-error' : 'error',
    }
  }
}
