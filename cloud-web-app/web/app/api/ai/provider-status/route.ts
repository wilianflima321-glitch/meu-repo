import { NextResponse } from 'next/server'
import { AI_PROVIDER_SETUP_URL } from '@/lib/capability-constants'
import { AI_PROVIDER_CONFIG, getConfiguredAiProviders, getMissingAiProviders } from '@/lib/ai-provider-config'
import { isAiDemoModeEnabled } from '@/lib/server/ai-demo-mode'
import { getAiDemoDailyLimit } from '@/lib/server/ai-demo-usage'

export const dynamic = 'force-dynamic'

type ProviderStatus = {
  id: string
  configured: boolean
}

export async function GET() {
  const demoModeEnabled = isAiDemoModeEnabled()
  const demoDailyLimit = getAiDemoDailyLimit()
  const configuredProviders = getConfiguredAiProviders().filter((provider) => provider !== 'custom')
  const missingProviders = getMissingAiProviders()
  const configuredProviderSet = new Set<string>(configuredProviders)
  const providers: ProviderStatus[] = AI_PROVIDER_CONFIG.map((provider) => ({
    id: provider.id,
    configured: configuredProviderSet.has(provider.id),
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
  })
}
