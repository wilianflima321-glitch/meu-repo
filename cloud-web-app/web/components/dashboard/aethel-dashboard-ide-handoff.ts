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

function isValidRuntimeUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

async function tryProvisionRuntime(projectId: string | null): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const token = window.localStorage.getItem('aethel-token')
  if (!token) return null

  const response = await fetch('/api/preview/runtime-provision', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ projectId }),
  })
  const payload = (await response.json().catch(() => null)) as { runtimeUrl?: string | null } | null
  if (!response.ok) return null
  if (typeof payload?.runtimeUrl !== 'string') return null
  return isValidRuntimeUrl(payload.runtimeUrl) ? payload.runtimeUrl.trim() : null
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
    const provisionedRuntime = await tryProvisionRuntime(input.projectId)
    if (provisionedRuntime) {
      params.set('previewUrl', provisionedRuntime)
      window.localStorage.setItem(input.previewRuntimeStorageKey, provisionedRuntime)
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
        discoveryStatus: provisionFailed ? 'provision-error' : 'not-found',
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
      discoveryStatus: provisionFailed ? 'provision-error' : 'error',
    }
  }
}
