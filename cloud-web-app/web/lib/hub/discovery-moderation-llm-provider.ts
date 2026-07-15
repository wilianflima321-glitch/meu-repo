/**
 * I.1 — Optional LLM critic interface for discovery moderation.
 * Production path never invents a free platform provider — BYOK only via CostGuard.
 * Vitest injects MockDiscoveryModerationProvider; do not call real APIs in CI.
 */

export type DiscoveryLlmVerdict = 'approved' | 'rejected' | 'flagged' | 'manual_review'

export interface DiscoveryModerationLlmInput {
  gameId: string
  title: string
  description?: string | null
  tags?: string[]
  deterministicStatus: string
  deterministicCodes: string[]
}

export interface DiscoveryModerationLlmResult {
  verdict: DiscoveryLlmVerdict
  reason: string
  /** Rough token weight for CostGuard settle — mock uses fixed estimate. */
  tokenWeight: number
  provider: string
}

export interface DiscoveryModerationLlmProvider {
  readonly name: string
  review(input: DiscoveryModerationLlmInput): Promise<DiscoveryModerationLlmResult>
}

/**
 * Test-only mock — never used as an implicit production default.
 */
export function createMockDiscoveryModerationProvider(
  override?: Partial<DiscoveryModerationLlmResult> | ((input: DiscoveryModerationLlmInput) => DiscoveryModerationLlmResult),
): DiscoveryModerationLlmProvider {
  return {
    name: 'mock-discovery-moderation',
    async review(input) {
      if (typeof override === 'function') return override(input)
      return {
        verdict: 'approved',
        reason: 'mock_approved',
        tokenWeight: 32,
        provider: 'mock-discovery-moderation',
        ...override,
      }
    },
  }
}
