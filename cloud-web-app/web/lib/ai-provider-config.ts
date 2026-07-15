export type AiProviderId =
  | 'openrouter'
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'groq'
  | 'azure-openai'
  | 'custom'

export type AiProviderConfigEntry = {
  id: AiProviderId
  envKey?: string
  label?: string
  models?: string[]
}

export const AI_PROVIDER_CONFIG: AiProviderConfigEntry[] = [
  {
    id: 'openrouter',
    envKey: 'OPENROUTER_API_KEY',
    label: 'OpenRouter',
    models: ['google/gemini-3.1-flash-lite-preview', 'openai/gpt-4o-mini', 'anthropic/claude-3.5-haiku'],
  },
  {
    id: 'openai',
    envKey: 'OPENAI_API_KEY',
    label: 'OpenAI',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  {
    id: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    label: 'Anthropic',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'],
  },
  {
    id: 'google',
    envKey: 'GOOGLE_API_KEY',
    label: 'Google Gemini',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
  },
  {
    id: 'groq',
    envKey: 'GROQ_API_KEY',
    label: 'Groq',
    models: [],
  },
  {
    id: 'azure-openai',
    envKey: 'AZURE_OPENAI_API_KEY',
    label: 'Azure OpenAI',
    models: [],
  },
]

export const AI_PROVIDER_LABELS: Record<string, string> = Object.fromEntries(
  AI_PROVIDER_CONFIG.map((provider) => [provider.id, provider.label || provider.id])
)

export const AI_PROVIDER_ENV_LABELS: Record<string, string> = Object.fromEntries(
  AI_PROVIDER_CONFIG.filter((provider) => provider.envKey).map((provider) => [
    provider.id,
    `${provider.label || provider.id} - ${provider.envKey}`,
  ])
)

export function getConfiguredAiProviders(): AiProviderId[] {
  const providers = AI_PROVIDER_CONFIG.filter((provider) => provider.envKey && Boolean(process.env[provider.envKey]))
    .map((provider) => provider.id)

  if (process.env.AI_API_URL) {
    providers.push('custom')
  }

  return providers
}

export function isAnyAiProviderConfigured(): boolean {
  return getConfiguredAiProviders().length > 0
}

export function getMissingAiProviders(): AiProviderId[] {
  return AI_PROVIDER_CONFIG.filter((provider) => provider.envKey && !process.env[provider.envKey]).map((provider) => provider.id)
}

export function getPreferredConfiguredAiProvider(): AiProviderId | null {
  const configured = getConfiguredAiProviders()
  return configured[0] ?? null
}

export function getAvailableModelsForProvider(provider: string | null | undefined): string[] {
  if (!provider) return []
  const match = AI_PROVIDER_CONFIG.find((entry) => entry.id === provider)
  return match?.models ?? []
}

export function getAiProviderSetupSummary(): string {
  const preferred = ['openrouter', 'openai', 'anthropic', 'google', 'groq']
    .map((provider) => AI_PROVIDER_LABELS[provider])
    .filter(Boolean)
  return preferred.join(', ')
}
