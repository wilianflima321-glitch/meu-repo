import crypto from 'node:crypto'

export type AiVideoProvider = 'runway' | 'sora' | 'pika' | 'custom-webhook'
export type AiVideoTaskStatus = 'queued' | 'processing' | 'completed' | 'failed'
export type AiVideoAspectRatio = '16:9' | '9:16' | '1:1' | '4:3' | '3:4'
export type AiVideoResolution = '480p' | '720p' | '1080p'

export interface AiVideoGenerateRequest {
  provider?: AiVideoProvider
  prompt: string
  durationSeconds?: number
  aspectRatio?: AiVideoAspectRatio
  resolution?: AiVideoResolution
  style?: string
  referenceImageUrl?: string
  negativePrompt?: string
  seed?: number
  projectId?: string
}

export interface NormalizedAiVideoGenerateRequest extends Required<Pick<AiVideoGenerateRequest, 'prompt'>> {
  provider: AiVideoProvider
  durationSeconds: number
  aspectRatio: AiVideoAspectRatio
  resolution: AiVideoResolution
  style?: string
  referenceImageUrl?: string
  negativePrompt?: string
  seed?: number
  projectId?: string
}

export interface AiVideoProviderStatus {
  id: AiVideoProvider
  name: string
  configured: boolean
  endpointConfigured: boolean
  statusEndpointConfigured: boolean
  requiredEnv: string[]
  missingEnv: string[]
  maxDurationSeconds: number
  supportedAspectRatios: AiVideoAspectRatio[]
  supportedResolutions: AiVideoResolution[]
  notes: string
}

export interface AiVideoGenerateResult {
  provider: AiVideoProvider
  taskId: string
  status: AiVideoTaskStatus
  checkStatusUrl: string
  videoUrl?: string
  metadata: {
    providerMode: 'configured-endpoint' | 'custom-webhook'
    durationSeconds: number
    aspectRatio: AiVideoAspectRatio
    resolution: AiVideoResolution
    costApplies: boolean
    humanReviewRequired: boolean
  }
}

export interface AiVideoStatusResult {
  provider: AiVideoProvider
  taskId: string
  status: AiVideoTaskStatus
  progress?: number
  videoUrl?: string
  error?: string
  rawStatus?: string
}

export class AiVideoProviderUnavailableError extends Error {
  constructor(
    message: string,
    public readonly providerStatuses: AiVideoProviderStatus[],
    public readonly requestedProvider?: AiVideoProvider,
  ) {
    super(message)
    this.name = 'AiVideoProviderUnavailableError'
  }
}

export class AiVideoValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiVideoValidationError'
  }
}

type ProviderConfig = {
  id: AiVideoProvider
  name: string
  apiKeyEnv?: string
  endpointEnv?: string
  statusEndpointEnv?: string
  requiredEnv: string[]
  maxDurationSeconds: number
  supportedAspectRatios: AiVideoAspectRatio[]
  supportedResolutions: AiVideoResolution[]
  notes: string
}

const PROVIDERS: Record<AiVideoProvider, ProviderConfig> = {
  runway: {
    id: 'runway',
    name: 'Runway',
    apiKeyEnv: 'RUNWAY_API_KEY',
    endpointEnv: 'RUNWAY_API_URL',
    statusEndpointEnv: 'RUNWAY_STATUS_API_URL',
    requiredEnv: ['RUNWAY_API_KEY', 'RUNWAY_API_URL'],
    maxDurationSeconds: 30,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['720p', '1080p'],
    notes: 'Configured through explicit Runway endpoint env; no default endpoint is assumed.',
  },
  sora: {
    id: 'sora',
    name: 'Sora-compatible endpoint',
    apiKeyEnv: 'OPENAI_API_KEY',
    endpointEnv: 'SORA_API_URL',
    statusEndpointEnv: 'SORA_STATUS_API_URL',
    requiredEnv: ['OPENAI_API_KEY', 'SORA_API_URL'],
    maxDurationSeconds: 20,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['720p', '1080p'],
    notes: 'Requires an explicit video endpoint URL; the route does not assume an unreleased API path.',
  },
  pika: {
    id: 'pika',
    name: 'Pika-compatible endpoint',
    apiKeyEnv: 'PIKA_API_KEY',
    endpointEnv: 'PIKA_API_URL',
    statusEndpointEnv: 'PIKA_STATUS_API_URL',
    requiredEnv: ['PIKA_API_KEY', 'PIKA_API_URL'],
    maxDurationSeconds: 30,
    supportedAspectRatios: ['16:9', '9:16', '1:1'],
    supportedResolutions: ['720p'],
    notes: 'Requires a configured Pika-compatible endpoint before jobs can be created.',
  },
  'custom-webhook': {
    id: 'custom-webhook',
    name: 'Aethel video webhook',
    endpointEnv: 'AETHEL_VIDEO_GENERATION_WEBHOOK_URL',
    statusEndpointEnv: 'AETHEL_VIDEO_STATUS_WEBHOOK_URL',
    requiredEnv: ['AETHEL_VIDEO_GENERATION_WEBHOOK_URL'],
    maxDurationSeconds: 60,
    supportedAspectRatios: ['16:9', '9:16', '1:1', '4:3', '3:4'],
    supportedResolutions: ['480p', '720p', '1080p'],
    notes: 'Preferred integration point for a governed internal video worker or vendor proxy.',
  },
}

const ASPECT_RATIOS: AiVideoAspectRatio[] = ['16:9', '9:16', '1:1', '4:3', '3:4']
const RESOLUTIONS: AiVideoResolution[] = ['480p', '720p', '1080p']

function readEnv(name?: string): string | undefined {
  if (!name) return undefined
  const value = process.env[name]
  return value && value.trim().length > 0 ? value.trim() : undefined
}

function hasConfiguredEndpoint(config: ProviderConfig): boolean {
  return Boolean(readEnv(config.endpointEnv))
}

function getProviderConfig(provider: AiVideoProvider): ProviderConfig {
  return PROVIDERS[provider]
}

function isProviderConfigured(config: ProviderConfig): boolean {
  return config.requiredEnv.every((envName) => Boolean(readEnv(envName)))
}

function clampDuration(value: unknown, maxDurationSeconds: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return Math.min(8, maxDurationSeconds)
  return Math.max(1, Math.min(maxDurationSeconds, Math.floor(value)))
}

function normalizeAspectRatio(value: unknown, config: ProviderConfig): AiVideoAspectRatio {
  const candidate = typeof value === 'string' && ASPECT_RATIOS.includes(value as AiVideoAspectRatio)
    ? (value as AiVideoAspectRatio)
    : '16:9'
  return config.supportedAspectRatios.includes(candidate) ? candidate : config.supportedAspectRatios[0]
}

function normalizeResolution(value: unknown, config: ProviderConfig): AiVideoResolution {
  const candidate = typeof value === 'string' && RESOLUTIONS.includes(value as AiVideoResolution)
    ? (value as AiVideoResolution)
    : '720p'
  return config.supportedResolutions.includes(candidate) ? candidate : config.supportedResolutions[0]
}

function normalizeOptionalString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, maxLength)
}

function normalizeSeed(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(2_147_483_647, Math.floor(value)))
}

function parseRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return undefined
}

function pickStatus(record: Record<string, unknown>): AiVideoTaskStatus {
  const raw = pickString(record, ['status', 'state'])?.toLowerCase()
  if (raw === 'completed' || raw === 'complete' || raw === 'succeeded' || raw === 'success') return 'completed'
  if (raw === 'failed' || raw === 'error' || raw === 'cancelled') return 'failed'
  if (raw === 'queued' || raw === 'pending') return 'queued'
  return 'processing'
}

function pickProgress(record: Record<string, unknown>): number | undefined {
  const value = record.progress
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return Math.max(0, Math.min(100, Math.round(value)))
}

function configuredStatusOrigins(): Set<string> {
  const origins = new Set<string>()
  for (const config of Object.values(PROVIDERS)) {
    for (const envName of [config.endpointEnv, config.statusEndpointEnv]) {
      const endpoint = readEnv(envName)
      if (!endpoint) continue
      try {
        origins.add(new URL(endpoint).origin)
      } catch {
        // Invalid provider configuration is handled by the fetch path.
      }
    }
  }
  return origins
}

function assertConfiguredStatusUrl(statusUrl: string): void {
  const origins = configuredStatusOrigins()
  let parsed: URL
  try {
    parsed = new URL(statusUrl)
  } catch {
    throw new AiVideoValidationError('Invalid statusUrl. Provide a valid provider status URL or use provider/taskId.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || !origins.has(parsed.origin)) {
    throw new AiVideoValidationError('statusUrl must match a configured video provider endpoint origin.')
  }
}

export function getAiVideoProviderStatuses(): AiVideoProviderStatus[] {
  return Object.values(PROVIDERS).map((config) => {
    const missingEnv = config.requiredEnv.filter((envName) => !readEnv(envName))
    return {
      id: config.id,
      name: config.name,
      configured: missingEnv.length === 0,
      endpointConfigured: hasConfiguredEndpoint(config),
      statusEndpointConfigured: Boolean(readEnv(config.statusEndpointEnv)),
      requiredEnv: config.requiredEnv,
      missingEnv,
      maxDurationSeconds: config.maxDurationSeconds,
      supportedAspectRatios: config.supportedAspectRatios,
      supportedResolutions: config.supportedResolutions,
      notes: config.notes,
    }
  })
}

export function isAiVideoProvider(value: unknown): value is AiVideoProvider {
  return typeof value === 'string' && value in PROVIDERS
}

export function chooseDefaultAiVideoProvider(requested?: unknown): AiVideoProvider {
  if (isAiVideoProvider(requested)) return requested
  const configured = getAiVideoProviderStatuses().find((provider) => provider.configured)
  return configured?.id ?? 'custom-webhook'
}

export function normalizeAiVideoGenerateRequest(body: unknown): NormalizedAiVideoGenerateRequest {
  const record = parseRecord(body)
  const prompt = normalizeOptionalString(record.prompt, 4_000)
  if (!prompt) throw new AiVideoValidationError('Missing prompt')
  if (record.provider !== undefined && !isAiVideoProvider(record.provider)) {
    throw new AiVideoValidationError('Invalid provider. Use runway, sora, pika, or custom-webhook.')
  }

  const provider = chooseDefaultAiVideoProvider(record.provider)
  const config = getProviderConfig(provider)
  return {
    provider,
    prompt,
    durationSeconds: clampDuration(record.durationSeconds ?? record.duration, config.maxDurationSeconds),
    aspectRatio: normalizeAspectRatio(record.aspectRatio, config),
    resolution: normalizeResolution(record.resolution, config),
    style: normalizeOptionalString(record.style, 180),
    referenceImageUrl: normalizeOptionalString(record.referenceImageUrl, 2_000),
    negativePrompt: normalizeOptionalString(record.negativePrompt, 1_000),
    seed: normalizeSeed(record.seed),
    projectId: normalizeOptionalString(record.projectId, 200),
  }
}

function unavailable(provider?: AiVideoProvider): AiVideoProviderUnavailableError {
  const statuses = getAiVideoProviderStatuses()
  const requested = provider ? ` Requested provider: ${provider}.` : ''
  return new AiVideoProviderUnavailableError(
    `No configured AI video provider is available.${requested} Configure AETHEL_VIDEO_GENERATION_WEBHOOK_URL or a provider API key plus explicit endpoint URL.`,
    statuses,
    provider,
  )
}

async function postJson(endpoint: string, headers: Record<string, string>, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  let response: Response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    })
  } catch (error) {
    throw new Error(`AI video provider request failed: ${error instanceof Error ? error.message : 'network error'}`)
  }

  const payload = parseRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    const message = pickString(payload, ['message', 'error', 'detail']) ?? `AI video provider returned ${response.status}`
    throw new Error(message)
  }
  return payload
}

function buildProviderPayload(request: NormalizedAiVideoGenerateRequest): Record<string, unknown> {
  return {
    prompt: request.prompt,
    durationSeconds: request.durationSeconds,
    aspectRatio: request.aspectRatio,
    resolution: request.resolution,
    style: request.style,
    referenceImageUrl: request.referenceImageUrl,
    negativePrompt: request.negativePrompt,
    seed: request.seed,
    projectId: request.projectId,
    safety: {
      draftAssetsAreNotFinal: true,
      humanReviewRequired: true,
      costApplies: true,
    },
  }
}

function mapGenerationResult(
  request: NormalizedAiVideoGenerateRequest,
  payload: Record<string, unknown>,
  providerMode: AiVideoGenerateResult['metadata']['providerMode'],
): AiVideoGenerateResult {
  const taskId = pickString(payload, ['taskId', 'id', 'predictionId', 'jobId']) ?? crypto.randomUUID()
  const status = pickStatus(payload)
  const videoUrl = pickString(payload, ['videoUrl', 'outputUrl', 'url'])
  return {
    provider: request.provider,
    taskId,
    status,
    checkStatusUrl: `/api/ai/video/status?provider=${request.provider}&taskId=${encodeURIComponent(taskId)}`,
    ...(videoUrl ? { videoUrl } : {}),
    metadata: {
      providerMode,
      durationSeconds: request.durationSeconds,
      aspectRatio: request.aspectRatio,
      resolution: request.resolution,
      costApplies: true,
      humanReviewRequired: true,
    },
  }
}

export async function generateAiVideo(request: NormalizedAiVideoGenerateRequest): Promise<AiVideoGenerateResult> {
  const config = getProviderConfig(request.provider)
  if (!isProviderConfigured(config)) throw unavailable(request.provider)

  const endpoint = readEnv(config.endpointEnv)
  if (!endpoint) throw unavailable(request.provider)

  const apiKey = readEnv(config.apiKeyEnv)
  const providerMode: AiVideoGenerateResult['metadata']['providerMode'] =
    request.provider === 'custom-webhook' ? 'custom-webhook' : 'configured-endpoint'
  const payload = await postJson(endpoint, apiKey ? { Authorization: `Bearer ${apiKey}` } : {}, buildProviderPayload(request))
  return mapGenerationResult(request, payload, providerMode)
}

export async function getAiVideoStatus(options: {
  provider?: AiVideoProvider
  taskId?: string
  statusUrl?: string
}): Promise<AiVideoStatusResult> {
  const provider = options.provider ?? chooseDefaultAiVideoProvider()
  const config = getProviderConfig(provider)
  const taskId = options.taskId?.trim()
  if (!taskId && !options.statusUrl) throw new AiVideoValidationError('Missing taskId or statusUrl')

  let endpoint: string | undefined
  if (options.statusUrl) {
    assertConfiguredStatusUrl(options.statusUrl)
    endpoint = options.statusUrl
  } else {
    const statusEndpoint = readEnv(config.statusEndpointEnv)
    endpoint = statusEndpoint && taskId ? `${statusEndpoint.replace(/\/$/, '')}/${encodeURIComponent(taskId)}` : undefined
  }

  if (!endpoint) throw unavailable(provider)

  const apiKey = readEnv(config.apiKeyEnv)
  const response = await fetch(endpoint, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  })
  const payload = parseRecord(await response.json().catch(() => ({})))
  if (!response.ok) {
    const message = pickString(payload, ['message', 'error', 'detail']) ?? `AI video status provider returned ${response.status}`
    throw new Error(message)
  }

  return {
    provider,
    taskId: taskId ?? pickString(payload, ['taskId', 'id', 'predictionId', 'jobId']) ?? 'external-status-url',
    status: pickStatus(payload),
    progress: pickProgress(payload),
    videoUrl: pickString(payload, ['videoUrl', 'outputUrl', 'url']),
    error: pickString(payload, ['error', 'message']),
    rawStatus: pickString(payload, ['status', 'state']),
  }
}
