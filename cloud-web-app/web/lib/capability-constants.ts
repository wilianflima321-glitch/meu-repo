export const CAPABILITY_STATUS_NOT_IMPLEMENTED = 'NOT_IMPLEMENTED' as const
export const CAPABILITY_ERROR_NOT_IMPLEMENTED = 'NOT_IMPLEMENTED' as const
export const AI_PROVIDER_SETUP_URL = '/settings?tab=api' as const

export function buildAiProviderSetupMetadata(extra?: Record<string, unknown>) {
  return {
    setupUrl: AI_PROVIDER_SETUP_URL,
    setupAction: 'OPEN_AI_PROVIDER_SETTINGS',
    ...extra,
  }
}
