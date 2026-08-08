import { CAPABILITY_STATUS_NOT_IMPLEMENTED } from '@/lib/capability-constants'

export type ChatAdvancedMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export type AdvancedProfile = {
  qualityMode: 'standard' | 'delivery' | 'studio'
  agentCount: 1 | 2 | 3
  enableWebResearch: boolean
}

export class AdvancedChatRequestError extends Error {
  code: string
  status: number
  capability?: string
  capabilityStatus?: string
  setupUrl?: string
  setupAction?: string
  metadata?: Record<string, unknown>

  constructor(options: {
    code: string
    message: string
    status: number
    capability?: string
    capabilityStatus?: string
    setupUrl?: string
    setupAction?: string
    metadata?: Record<string, unknown>
  }) {
    super(options.message)
    this.name = 'AdvancedChatRequestError'
    this.code = options.code
    this.status = options.status
    this.capability = options.capability
    this.capabilityStatus = options.capabilityStatus
    this.setupUrl = options.setupUrl
    this.setupAction = options.setupAction
    this.metadata = options.metadata
  }
}

export function inferAdvancedProfile(message: string): AdvancedProfile {
  const lower = message.toLowerCase()
  const asksForDeepAudit = [
    'auditoria',
    'triagem',
    'benchmark',
    'pesquise',
    'research',
    'critique',
    'crítica',
    'arquitet',
    'studio',
  ].some((token) => lower.includes(token))

  if (asksForDeepAudit) {
    return {
      qualityMode: 'studio',
      agentCount: 3,
      enableWebResearch: true,
    }
  }

  const asksForImplementation = ['implemente', 'implement', 'corrija', 'refactor', 'fix', 'build', 'deploy'].some(
    (token) => lower.includes(token)
  )

  if (asksForImplementation) {
    return {
      qualityMode: 'delivery',
      agentCount: 2,
      enableWebResearch: false,
    }
  }

  return {
    qualityMode: 'standard',
    agentCount: 1,
    enableWebResearch: false,
  }
}

export function isProviderSetupError(error: {
  code: string
  status?: number
  capability?: string
  capabilityStatus?: string
}): boolean {
  return (
    error.code === 'AI_PROVIDER_UNAVAILABLE' ||
    error.code === 'AI_PROVIDER_NOT_CONFIGURED' ||
    error.code === CAPABILITY_STATUS_NOT_IMPLEMENTED ||
    error.status === 503 ||
    error.capability === 'AI_PROVIDER_CONFIG' ||
    error.capabilityStatus === CAPABILITY_STATUS_NOT_IMPLEMENTED
  )
}

function isAgentGateError(code: string): boolean {
  return code === 'FEATURE_NOT_ALLOWED' || code === 'AGENTS_LIMIT_EXCEEDED'
}

function parseAdvancedChatError(raw: string, status: number): AdvancedChatRequestError {
  try {
    const data = JSON.parse(raw)
    const code =
      typeof data?.error === 'string' ? data.error : status === 501 ? 'AI_PROVIDER_UNAVAILABLE' : 'AI_REQUEST_FAILED'
    const message =
      typeof data?.message === 'string'
        ? data.message
        : typeof data?.detail === 'string'
          ? data.detail
          : raw || `Request failed with HTTP ${status}.`
    const capability = typeof data?.capability === 'string' ? data.capability : undefined
    const capabilityStatus = typeof data?.capabilityStatus === 'string' ? data.capabilityStatus : undefined
    const metadata =
      typeof data?.metadata === 'object' && data.metadata !== null
        ? { ...(data.metadata as Record<string, unknown>), quotaBody: data }
        : ({ quotaBody: data } as Record<string, any>)
    const setupUrl =
      typeof data?.setupUrl === 'string'
        ? data.setupUrl
        : typeof metadata?.setupUrl === 'string'
          ? metadata.setupUrl
          : undefined
    const setupAction =
      typeof data?.setupAction === 'string'
        ? data.setupAction
        : typeof metadata?.setupAction === 'string'
          ? metadata.setupAction
          : undefined
    return new AdvancedChatRequestError({
      code,
      message,
      status,
      capability,
      capabilityStatus,
      setupUrl,
      setupAction,
      metadata,
    })
  } catch {
    return new AdvancedChatRequestError({
      code: status === 501 ? 'AI_PROVIDER_UNAVAILABLE' : 'AI_REQUEST_FAILED',
      message: raw || `Request failed with HTTP ${status}.`,
      status,
    })
  }
}

import { getByokHeaders } from '@/lib/ai'

export async function requestAdvancedChat(options: {
  message: string
  model: string
  messages: ChatAdvancedMessage[]
  projectId?: string
  agentId?: string
  headers?: Record<string, string>
  signal?: AbortSignal
  profileOverride?: AdvancedProfile
}) {
  const profile = options.profileOverride ?? inferAdvancedProfile(options.message)
  const endpoint = '/api/ai/chat-advanced'
  const byokHeaders = getByokHeaders()

  const post = async (payload: {
    qualityMode: AdvancedProfile['qualityMode']
    agentCount: AdvancedProfile['agentCount']
    enableWebResearch: boolean
  }) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...byokHeaders,
        ...(options.headers || {}),
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        projectId: options.projectId,
        agentId: options.agentId,
        qualityMode: payload.qualityMode,
        agentCount: payload.agentCount,
        enableWebResearch: payload.enableWebResearch,
        includeTrace: true,
      }),
      signal: options.signal,
    })
    const raw = await response.text()
    return { response, raw }
  }

  const first = await post(profile)
  if (first.response.ok) {
    return {
      raw: first.raw,
      usedFallback: false,
      profile,
    }
  }

  const firstError = parseAdvancedChatError(first.raw, first.response.status)
  if (!isAgentGateError(firstError.code) || profile.agentCount <= 1) {
    throw firstError
  }

  const second = await post({
    qualityMode: profile.qualityMode,
    agentCount: 1,
    enableWebResearch: false,
  })
  if (second.response.ok) {
    return {
      raw: second.raw,
      usedFallback: true,
      profile,
    }
  }

  throw parseAdvancedChatError(second.raw, second.response.status)
}

/**
 * Token streaming for Inline AI (Cursor-class UX).
 * Uses `/api/ai/stream` — plain text chunks from `aiService.chatStream`.
 * Do not fake a typewriter over a completed JSON fetch.
 */
export async function streamPlainChat(options: {
  messages: ChatAdvancedMessage[]
  model: string
  signal?: AbortSignal
  headers?: Record<string, string>
  onDelta: (chunk: string) => void
}): Promise<{ content: string }> {
  const byokHeaders = getByokHeaders()
  const response = await fetch('/api/ai/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...byokHeaders,
      ...(options.headers || {}),
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const raw = await response.text()
    throw parseAdvancedChatError(raw, response.status)
  }

  if (!response.body) {
    throw new AdvancedChatRequestError({
      code: 'AI_STREAM_UNAVAILABLE',
      message: 'Streaming response body missing.',
      status: 502,
    })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let content = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    if (!chunk) continue
    content += chunk
    options.onDelta(chunk)
  }

  return { content }
}
