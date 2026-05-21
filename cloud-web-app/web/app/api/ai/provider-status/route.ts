import { NextRequest, NextResponse } from 'next/server'
import { AI_PROVIDER_SETUP_URL } from '@/lib/capability-constants'
import { AI_PROVIDER_CONFIG, getConfiguredAiProviders, getMissingAiProviders } from '@/lib/ai-provider-config'
import { isAiDemoModeEnabled } from '@/lib/server/ai-demo-mode'
import { AI_STATUS_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'
import { getAiDemoDailyLimit } from '@/lib/server/ai-demo-usage'
import { getAiVideoProviderStatuses } from '@/lib/server/ai-video-generation'

export const dynamic = 'force-dynamic'

type ProviderStatus = {
  id: string
  configured: boolean
}

export async function GET(request: NextRequest) {
  const rateLimited = enforceAiCoreRateLimit({
    req: request,
    capability: 'ai.status.provider',
    route: '/api/ai/provider-status',
    config: AI_STATUS_RATE_LIMIT,
  })
  if (rateLimited) return rateLimited

  const demoModeEnabled = isAiDemoModeEnabled()
  const demoDailyLimit = getAiDemoDailyLimit()
  const configuredProviders = getConfiguredAiProviders().filter((provider) => provider !== 'custom')
  const missingProviders = getMissingAiProviders()
  const configuredProviderSet = new Set<string>(configuredProviders)
  const providers: ProviderStatus[] = AI_PROVIDER_CONFIG.map((provider) => ({
    id: provider.id,
    configured: configuredProviderSet.has(provider.id),
  }))
  const videoProviders = getAiVideoProviderStatuses().map((provider) => ({
    id: provider.id,
    configured: provider.configured,
    endpointConfigured: provider.endpointConfigured,
    missingEnv: provider.missingEnv,
  }))

  return NextResponse.json({
    configured: configuredProviders.length > 0,
    status: configuredProviders.length > 0 ? 'configured' : 'not_configured',
    providers,
    configuredProviders,
    missingProviders,
    capability: 'AI_PROVIDER_CONFIG',
    capabilityStatus: 'IMPLEMENTED',
    milestone: 'P0',
    setupUrl: AI_PROVIDER_SETUP_URL,
    setupAction: 'OPEN_AI_PROVIDER_SETTINGS',
    demoModeEnabled,
    demoModeLabel: demoModeEnabled ? 'DEMO_MODE_ACTIVE' : 'DEMO_MODE_OFF',
    demoDailyLimit,
    videoGeneration: {
      configured: videoProviders.some((provider) => provider.configured),
      providers: videoProviders,
      copyGuard: 'Draft videos are not final; cloud/video generation cost applies.',
    },
  })
}
