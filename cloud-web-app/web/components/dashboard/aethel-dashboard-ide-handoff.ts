export type IdeHandoffResolution = {
  params: URLSearchParams
  runtimeUrl: string | null
  discoveryStatus: 'stored' | 'found' | 'not-found' | 'error'
}

type ResolveIdeHandoffParamsInput = {
  entry: string
  projectId: string | null
  previewRuntimeStorageKey: string
}

function isValidRuntimeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

export async function resolveIdeHandoffParams(input: ResolveIdeHandoffParamsInput): Promise<IdeHandoffResolution> {
  const params = new URLSearchParams()
  params.set('entry', input.entry)
  if (input.projectId) params.set('projectId', input.projectId)

  if (typeof window === 'undefined') {
    return {
      params,
      runtimeUrl: null,
      discoveryStatus: 'error',
    }
  }

  const storedRuntimeUrl = window.localStorage.getItem(input.previewRuntimeStorageKey)
  if (storedRuntimeUrl && isValidRuntimeUrl(storedRuntimeUrl)) {
    const runtimeUrl = storedRuntimeUrl.trim()
    params.set('previewUrl', runtimeUrl)
    return {
      params,
      runtimeUrl,
      discoveryStatus: 'stored',
    }
  }

  try {
    const response = await fetch('/api/preview/runtime-discover', {
      cache: 'no-store',
    })
    const payload = (await response.json().catch(() => null)) as { preferredRuntimeUrl?: string | null } | null
    const runtimeUrl =
      typeof payload?.preferredRuntimeUrl === 'string' && isValidRuntimeUrl(payload.preferredRuntimeUrl)
        ? payload.preferredRuntimeUrl.trim()
        : ''

    if (!response.ok || !runtimeUrl) {
      return {
        params,
        runtimeUrl: null,
        discoveryStatus: 'not-found',
      }
    }

    params.set('previewUrl', runtimeUrl)
    window.localStorage.setItem(input.previewRuntimeStorageKey, runtimeUrl)
    return {
      params,
      runtimeUrl,
      discoveryStatus: 'found',
    }
  } catch {
    return {
      params,
      runtimeUrl: null,
      discoveryStatus: 'error',
    }
  }
}
