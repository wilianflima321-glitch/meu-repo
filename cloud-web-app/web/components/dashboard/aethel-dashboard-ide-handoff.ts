import {
  discoverPreviewRuntime,
  getStoredPreviewRuntimeUrl,
  persistPreviewRuntimeUrl,
  provisionPreviewRuntime,
} from '@/lib/preview/runtime-manager'

export type IdeHandoffResolution = {
  params: URLSearchParams
  runtimeUrl: string | null
  discoveryStatus: 'stored' | 'provisioned' | 'found' | 'not-found' | 'provision-error' | 'error'
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

  try {
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
  } catch {
    provisionFailed = true
  }

  try {
    const runtimeUrl = await discoverPreviewRuntime()
    if (!runtimeUrl) {
      return {
        params,
        runtimeUrl: null,
        discoveryStatus: provisionFailed ? 'provision-error' : 'not-found',
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
