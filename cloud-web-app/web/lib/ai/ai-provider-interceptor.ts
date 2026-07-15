import { billingAccumulator } from '../billing/redis-billing-accumulator'
import { logger } from '@/lib/observability/logger'

export interface AIRequestConfig {
  userId: string
  projectId?: string
  model: string
  estimatedTokens: number
  type: 'prompt' | 'completion' | 'embedding'
  /** Block 6E — header-derived key only; never User.byokKey */
  apiKeyOverride?: string
}

export interface AIProviderContext {
  apiKey: string
  isCustomKey: boolean
  onCompletion: (actualTokens: number) => Promise<void>
}

/**
 * Prepares AI provider context. BYOK must be passed as apiKeyOverride (6E).
 * Server vault / User.byokKey is retired.
 */
export class AIProviderInterceptor {
  public static async prepareContext(config: AIRequestConfig): Promise<AIProviderContext> {
    const override = config.apiKeyOverride?.trim()
    const apiKey = override || process.env.OPENAI_API_KEY || ''
    const isCustomKey = Boolean(override)

    if (!apiKey) {
      logger.warn('[AIProviderInterceptor] No API key available (platform or BYOK override)')
    }

    return {
      apiKey,
      isCustomKey,
      onCompletion: async (actualTokens: number) => {
        if (isCustomKey) return
        try {
          await billingAccumulator.consumeTokens({
            userId: config.userId,
            projectId: config.projectId,
            model: config.model,
            tokensUsed: actualTokens,
            type: config.type,
            timestamp: new Date().toISOString(),
          })
        } catch (e) {
          logger.error('[AIProviderInterceptor] billing track failed', e)
        }
      },
    }
  }
}
