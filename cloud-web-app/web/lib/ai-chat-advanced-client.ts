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
        ? (data.metadata as Record<string, unknown>)
        : undefined
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

export async function requestAdvancedChat(options: {
  message: string
  model: string
  messages: ChatAdvancedMessage[]
  projectId?: string
  headers?: Record<string, string>
  signal?: AbortSignal
  profileOverride?: AdvancedProfile
}) {
  const profile = options.profileOverride ?? inferAdvancedProfile(options.message)
  const endpoint = '/api/ai/chat-advanced'

  const post = async (payload: {
    qualityMode: AdvancedProfile['qualityMode']
    agentCount: AdvancedProfile['agentCount']
    enableWebResearch: boolean
  }) => {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        projectId: options.projectId,
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
