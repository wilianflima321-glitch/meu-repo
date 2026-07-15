import { AI_PROVIDER_LABELS } from '@/lib/ai-provider-config'

export type AiProviderStatusResponse = {
  configured?: boolean
  status?: 'configured' | 'not_configured'
  providers?: Array<{
    id: string
    configured: boolean
  }>
  configuredProviders?: string[]
  missingProviders?: string[]
  capability?: string
  capabilityStatus?: string
  setupUrl?: string
  setupAction?: string
  demoModeEnabled?: boolean
  demoModeLabel?: string
  demoDailyLimit?: number
}

export async function fetchAiProviderStatus(signal?: AbortSignal): Promise<AiProviderStatusResponse> {
  const response = await fetch('/api/ai/provider-status', {
    cache: 'no-store',
    signal,
  })

  const payload = (await response.json().catch(() => ({}))) as AiProviderStatusResponse
  if (!response.ok) {
    throw new Error(
      typeof (payload as Record<string, unknown>)?.message === 'string'
        ? String((payload as Record<string, unknown>).message)
        : `Provider status request failed (${response.status})`
    )
  }
  return payload
}

export function buildAiProviderGateMessage(status?: AiProviderStatusResponse | null): string {
  if (status?.demoModeEnabled) {
    return 'Modo demo ativo: voce pode testar a experiencia agora. Configure um provider para respostas reais de producao.'
  }
  const missingProviders = status?.missingProviders?.filter(Boolean) ?? []
  if (missingProviders.length === 0) {
    return 'Configure ao menos um provider para liberar chat, complete e inline edit.'
  }
  const missingLabels = missingProviders.map((provider) => AI_PROVIDER_LABELS[provider] || provider)
  return `Configure ao menos um provider para liberar chat, complete e inline edit. Missing: ${missingLabels.join(', ')}.`
}
