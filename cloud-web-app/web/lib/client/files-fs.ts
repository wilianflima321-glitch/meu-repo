type FileFsAction =
  | 'list'
  | 'read'
  | 'write'
  | 'delete'
  | 'copy'
  | 'move'
  | 'mkdir'
  | 'info'
  | 'exists'
  | 'hash'
  | 'compress'
  | 'decompress'

type FileFsPayload = {
  action: FileFsAction
  path: string
  content?: string
  destination?: string
  options?: Record<string, unknown>
}

type FileFsRequestOptions = {
  projectId?: string
  signal?: AbortSignal
}

const WORKBENCH_PROJECT_STORAGE_KEY = 'aethel.workbench.lastProjectId'

function sanitizeProjectId(value: string | null | undefined): string {
  const raw = String(value || '').trim()
  if (!raw) return 'default'
  const sanitized = raw.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
  return sanitized || 'default'
}

function getClientProjectId(projectId?: string): string {
  if (projectId) return sanitizeProjectId(projectId)
  if (typeof window === 'undefined') return 'default'

  try {
    const queryProjectId = new URLSearchParams(window.location.search).get('projectId')
    if (queryProjectId?.trim()) return sanitizeProjectId(queryProjectId)
  } catch {
    // ignore query parsing errors
  }

  try {
    const stored = window.localStorage.getItem(WORKBENCH_PROJECT_STORAGE_KEY)
    if (stored?.trim()) return sanitizeProjectId(stored)
  } catch {
    // ignore storage errors
  }

  return 'default'
}

function getClientAuthToken(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem('aethel-token')
  } catch {
    return null
  }
}

async function parseError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    try {
      const payload = (await response.json()) as Record<string, unknown>
      const message =
        (typeof payload.message === 'string' && payload.message) ||
        (typeof payload.error === 'string' && payload.error) ||
        ''
      if (message) return message
    } catch {
      // ignore json parse errors
    }
  }

  const text = await response.text().catch(() => '')
  return text || `Request failed with ${response.status}`
}

export async function requestFileFs<T = Record<string, unknown>>(
  payload: FileFsPayload,
  options: FileFsRequestOptions = {}
): Promise<T> {
  const projectId = getClientProjectId(options.projectId)
  const token = getClientAuthToken()

  const response = await fetch('/api/files/fs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-project-id': projectId,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      ...payload,
      projectId,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    throw new Error(await parseError(response))
  }

  return (await response.json()) as T
}

export async function readFileViaFs(path: string, options: FileFsRequestOptions = {}): Promise<string> {
  const result = await requestFileFs<{ content?: unknown }>({ action: 'read', path }, options)
  if (typeof result.content !== 'string') return ''
  return result.content
}

export async function writeFileViaFs(
  path: string,
  content: string,
  options: FileFsRequestOptions & { writeOptions?: Record<string, unknown> } = {}
): Promise<void> {
  await requestFileFs(
    {
      action: 'write',
      path,
      content,
      options: options.writeOptions,
    },
    options
  )
}

