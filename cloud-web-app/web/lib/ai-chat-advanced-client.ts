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

export type AdvancedChatStreamMeta = {
  traceId?: string
  model?: string
  estimatedTokens?: number
  spendLane?: string
  noticeCode?: string
}

export type AdvancedChatStreamResult = {
  content: string
  tokensUsed?: number
  traceId?: string
  meta?: AdvancedChatStreamMeta
  /** True when the client aborted mid-stream (partial content may be present). */
  aborted: boolean
}

function parseSseDataBlocks(buffer: string): { events: string[]; rest: string } {
  const events: string[] = []
  let rest = buffer
  let sep = rest.indexOf('\n\n')
  while (sep >= 0) {
    const block = rest.slice(0, sep)
    rest = rest.slice(sep + 2)
    const dataLines = block
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trimStart())
    if (dataLines.length > 0) {
      events.push(dataLines.join('\n'))
    }
    sep = rest.indexOf('\n\n')
  }
  return { events, rest }
}

/**
 * Token streaming for AIChatPanelPro / advanced chat (single-agent path).
 * Uses `/api/ai/chat-advanced` with `stream: true` → SSE deltas from chatStream.
 * Multi-agent / Apex MoA remain JSON (server fail-closes STREAM_NOT_SUPPORTED_*).
 * Do not fake a typewriter over a completed JSON fetch.
 */
export async function streamAdvancedChat(options: {
  message: string
  model: string
  messages: ChatAdvancedMessage[]
  projectId?: string
  headers?: Record<string, string>
  signal?: AbortSignal
  profileOverride?: AdvancedProfile
  onDelta: (chunk: string, accumulated: string) => void
  onMeta?: (meta: AdvancedChatStreamMeta) => void
}): Promise<AdvancedChatStreamResult> {
  const profile = options.profileOverride ?? inferAdvancedProfile(options.message)
  if (profile.agentCount > 1) {
    throw new AdvancedChatRequestError({
      code: 'STREAM_NOT_SUPPORTED_FOR_MULTI_ROLE',
      message: 'Streaming is not supported in multi-role mode yet.',
      status: 400,
    })
  }

  const byokHeaders = getByokHeaders()
  const response = await fetch('/api/ai/chat-advanced', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...byokHeaders,
      ...(options.headers || {}),
    },
    body: JSON.stringify({
      model: options.model,
      messages: options.messages,
      projectId: options.projectId,
      qualityMode: profile.qualityMode,
      agentCount: 1 as const,
      enableWebResearch: profile.enableWebResearch,
      includeTrace: true,
      stream: true,
    }),
    signal: options.signal,
  })

  if (!response.ok) {
    const raw = await response.text()
    throw parseAdvancedChatError(raw, response.status)
  }

  const contentType = response.headers.get('content-type') || ''
  if (!response.body || !contentType.includes('text/event-stream')) {
    // Fail-closed: do not invent token theater over a completed JSON body.
    throw new AdvancedChatRequestError({
      code: 'AI_STREAM_UNAVAILABLE',
      message: 'Advanced chat did not return an event-stream body.',
      status: 502,
    })
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let content = ''
  let tokensUsed: number | undefined
  let traceId: string | undefined
  let meta: AdvancedChatStreamMeta | undefined
  let aborted = false

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parsed = parseSseDataBlocks(buffer)
      buffer = parsed.rest

      for (const rawEvent of parsed.events) {
        let event: Record<string, unknown>
        try {
          event = JSON.parse(rawEvent) as Record<string, unknown>
        } catch {
          continue
        }
        const type = typeof event.type === 'string' ? event.type : ''
        if (type === 'meta') {
          meta = {
            traceId: typeof event.traceId === 'string' ? event.traceId : undefined,
            model: typeof event.model === 'string' ? event.model : undefined,
            estimatedTokens:
              typeof event.estimatedTokens === 'number' ? event.estimatedTokens : undefined,
            spendLane: typeof event.spendLane === 'string' ? event.spendLane : undefined,
            noticeCode: typeof event.noticeCode === 'string' ? event.noticeCode : undefined,
          }
          if (meta.traceId) traceId = meta.traceId
          options.onMeta?.(meta)
          continue
        }
        if (type === 'content') {
          const delta =
            typeof event.delta === 'string'
              ? event.delta
              : typeof event.content === 'string' && event.content.startsWith(content)
                ? event.content.slice(content.length)
                : typeof event.content === 'string'
                  ? event.content
                  : ''
          if (!delta) continue
          content += delta
          options.onDelta(delta, content)
          continue
        }
        if (type === 'done') {
          if (typeof event.tokensUsed === 'number') tokensUsed = event.tokensUsed
          if (typeof event.traceId === 'string') traceId = event.traceId
          if (typeof event.content === 'string' && event.content.length > content.length) {
            const tail = event.content.slice(content.length)
            if (tail) {
              content = event.content
              options.onDelta(tail, content)
            }
          }
          continue
        }
        if (type === 'error') {
          const code =
            typeof event.error === 'string' ? event.error : 'AI_STREAM_ERROR'
          const message =
            typeof event.message === 'string'
              ? event.message
              : typeof event.error === 'string'
                ? event.error
                : 'Advanced chat stream failed.'
          throw new AdvancedChatRequestError({
            code,
            message,
            status: 502,
            metadata: event,
          })
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      aborted = true
      return { content, tokensUsed, traceId, meta, aborted }
    }
    throw err
  }

  return { content, tokensUsed, traceId, meta, aborted }
}
