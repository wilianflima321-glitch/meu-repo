import { NextResponse } from 'next/server'
import { AI_PROVIDER_SETUP_URL } from '@/lib/capability-constants'
import { isAiDemoModeEnabled } from '@/lib/server/ai-demo-mode'
import { getAiDemoDailyLimit } from '@/lib/server/ai-demo-usage'

export const dynamic = 'force-dynamic'

type ProviderStatus = {
  id: string
  configured: boolean
}

const PROVIDERS: Array<{ id: string; envKey: string }> = [
  { id: 'openai', envKey: 'OPENAI_API_KEY' },
  { id: 'anthropic', envKey: 'ANTHROPIC_API_KEY' },
  { id: 'google', envKey: 'GOOGLE_API_KEY' },
  { id: 'groq', envKey: 'GROQ_API_KEY' },
  { id: 'azure-openai', envKey: 'AZURE_OPENAI_API_KEY' },
]

export async function GET() {
  const demoModeEnabled = isAiDemoModeEnabled()
  const demoDailyLimit = getAiDemoDailyLimit()
  const providers: ProviderStatus[] = PROVIDERS.map((provider) => ({
    id: provider.id,
    configured: Boolean(process.env[provider.envKey]),
  }))

  const configuredProviders = providers.filter((provider) => provider.configured).map((provider) => provider.id)
  const missingProviders = providers.filter((provider) => !provider.configured).map((provider) => provider.id)

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
