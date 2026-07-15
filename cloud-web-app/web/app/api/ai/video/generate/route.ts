import { NextRequest, NextResponse } from 'next/server'

import { requireAuth, type AuthUser } from '@/lib/auth-server'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  AI_EXPENSIVE_VIDEO_RATE_LIMIT,
  AI_STATUS_RATE_LIMIT,
  enforceAiCoreRateLimit,
} from '@/lib/server/ai-core-rate-limit'
import {
  AiVideoProviderUnavailableError,
  AiVideoValidationError,
  chooseDefaultAiVideoProvider,
  generateAiVideo,
  getAiVideoProviderStatuses,
  getAiVideoStatus,
  isAiVideoProvider,
  normalizeAiVideoGenerateRequest,
  type AiVideoProvider,
} from '@/lib/server/ai-video-generation'
import { createComponentLogger } from '@/lib/observability/logger'
import { runExpensiveCreativeViaBridge } from '@/lib/production/creative-bridge-http-dispatch'

const log = createComponentLogger('api/ai/video/generate/route')

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function providerUnavailableResponse(error: AiVideoProviderUnavailableError) {
  return capabilityResponse({
    error: 'AI_VIDEO_PROVIDER_UNAVAILABLE',
    status: 503,
    message: error.message,
    capability: 'ai.video.generate',
    capabilityStatus: 'PARTIAL',
    milestone: 'V22_VIDEO_SPINE',
    metadata: {
      requestedProvider: error.requestedProvider ?? null,
      providers: error.providerStatuses.map((provider) => ({
        id: provider.id,
        configured: provider.configured,
        endpointConfigured: provider.endpointConfigured,
        missingEnv: provider.missingEnv,
      })),
      requiredAction: 'Configure AETHEL_VIDEO_GENERATION_WEBHOOK_URL or a provider API key plus explicit endpoint URL.',
      humanReviewRequired: true,
      copyGuard: 'Draft videos are not final. Cloud/video generation cost applies.',
    },
  })
}

function badRequest(message: string) {
  return NextResponse.json({ error: 'AI_VIDEO_REQUEST_INVALID', message }, { status: 400 })
}

function normalizeProvider(value: string | null): AiVideoProvider | undefined {
  if (!value) return undefined
  if (!isAiVideoProvider(value)) {
    throw new AiVideoValidationError('Invalid provider. Use runway, sora, pika, or custom-webhook.')
  }
  return chooseDefaultAiVideoProvider(value)
}

export async function POST(req: NextRequest) {
  let user: AuthUser
  try {
    user = requireAuth(req)
  } catch {
    return unauthorized()
  }

  const rateLimitResponse = enforceAiCoreRateLimit({
    req,
    capability: 'ai.video.generate',
    route: '/api/ai/video/generate',
    config: AI_EXPENSIVE_VIDEO_RATE_LIMIT,
  })
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await req.json()
    const request = normalizeAiVideoGenerateRequest(body)

    let typedProviderError: unknown
    const bridged = await runExpensiveCreativeViaBridge({
      userId: user.userId,
      route: '/api/ai/video/generate',
      kind: 'video',
      prompt: request.prompt,
      units: request.durationSeconds,
      quality: request.resolution,
      requiredDomain: 'creative',
      domainLabel: 'AI video generation',
      providerName: String(request.provider ?? 'video'),
      execute: async (ctx) => {
        try {
          const result = await generateAiVideo(request)
          return {
            artifactId: result.taskId,
            previewUrl: result.videoUrl,
            empty: !result.taskId,
            actualTokenWeight: ctx.estimatedCostTokens,
            data: { result },
          }
        } catch (err) {
          typedProviderError = err
          throw err
        }
      },
    })

    if (!bridged.ok) {
      if (typedProviderError instanceof AiVideoValidationError) {
        return badRequest(typedProviderError.message)
      }
      if (typedProviderError instanceof AiVideoProviderUnavailableError) {
        return providerUnavailableResponse(typedProviderError)
      }
      return bridged.response
    }

    const result = bridged.data.result
    return NextResponse.json(
      {
        success: true,
        provider: result.provider,
        task: {
          id: result.taskId,
          status: result.status,
          checkStatusUrl: result.checkStatusUrl,
          videoUrl: result.videoUrl,
        },
        metadata: {
          prompt: request.prompt.slice(0, 160),
          durationSeconds: request.durationSeconds,
          aspectRatio: request.aspectRatio,
          resolution: request.resolution,
          providerMode: result.metadata.providerMode,
          estimatedCostTokens: bridged.estimatedCostTokens,
          planId: bridged.planId,
          evidenceReceiptId: bridged.evidenceReceiptId,
          creativeBridge: true,
          humanReviewRequired: result.metadata.humanReviewRequired,
          draftAssetsAreNotFinal: true,
          cloudVideoCostApplies: true,
          createdAt: new Date().toISOString(),
          /** J.6 — video generation is not VideoToMechanic; scaffold is a separate Bridge path */
          videoToMechanic: {
            productLabel: 'Video-to-design scaffold',
            scaffoldRoute: '/api/ai/video/scaffold',
            notPlayableAaa: true,
            autoPhysics: false,
            nextAction:
              'POST /api/ai/video/scaffold with videoTaskId to extract State Machine + BT scaffold (user wires physics).',
          },
        },
      },
      { headers: bridged.headers },
    )
  } catch (error) {
    if (error instanceof AiVideoValidationError) return badRequest(error.message)
    if (error instanceof AiVideoProviderUnavailableError) return providerUnavailableResponse(error)
    log.error('video_generation.failed', error)
    const message = error instanceof Error ? error.message : 'AI video generation failed'
    return NextResponse.json({ error: 'AI_VIDEO_GENERATION_FAILED', message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return unauthorized()
  }

  const rateLimitResponse = enforceAiCoreRateLimit({
    req,
    capability: 'ai.status.video',
    route: '/api/ai/video/generate',
    config: AI_STATUS_RATE_LIMIT,
  })
  if (rateLimitResponse) return rateLimitResponse

  return getVideoStatusOrProviders(req)
}

export async function getVideoStatusOrProviders(req: NextRequest) {
  const url = new URL(req.url)
  const taskId = url.searchParams.get('taskId') ?? undefined
  const statusUrl = url.searchParams.get('statusUrl') ?? undefined
  let provider: AiVideoProvider | undefined
  try {
    provider = normalizeProvider(url.searchParams.get('provider'))
  } catch (error) {
    if (error instanceof AiVideoValidationError) return badRequest(error.message)
    throw error
  }

  if (taskId || statusUrl) {
    try {
      const status = await getAiVideoStatus({ provider, taskId, statusUrl })
      return NextResponse.json(status)
    } catch (error) {
      if (error instanceof AiVideoValidationError) return badRequest(error.message)
      if (error instanceof AiVideoProviderUnavailableError) return providerUnavailableResponse(error)
      const message = error instanceof Error ? error.message : 'AI video status check failed'
      return NextResponse.json({ error: 'AI_VIDEO_STATUS_FAILED', message }, { status: 500 })
    }
  }

  const providers = getAiVideoProviderStatuses()
  return NextResponse.json({
    providers,
    defaultProvider: providers.find((providerStatus) => providerStatus.configured)?.id ?? null,
    capabilityStatus: providers.some((providerStatus) => providerStatus.configured) ? 'IMPLEMENTED' : 'PARTIAL',
    usage: {
      generate: 'POST with { prompt, durationSeconds?, aspectRatio?, resolution?, provider?, referenceImageUrl? }',
      checkStatus: 'GET with ?provider=custom-webhook&taskId=xxx or a configured provider statusUrl',
    },
    guardrails: [
      'Draft videos are not final',
      'Cloud/video generation cost applies',
      'Human review required before release footage',
      'Provider endpoints must be explicitly configured; no fake success path exists',
      'VideoToMechanic = POST /api/ai/video/scaffold — State Machine + BT scaffold only (not playable AAA)',
    ],
  })
}
