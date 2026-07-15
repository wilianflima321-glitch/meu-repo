/**
 * Block 6E — BYOK request contract (server-safe).
 * Header-only detection — never read User.byokKey (client-only keys).
 * Audit: billingMode=byok with zero key material.
 */

import type { NextRequest } from 'next/server'
import { createComponentLogger } from '@/lib/observability/logger'
import { AI_BYOK_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit'

const log = createComponentLogger('byok-request')

export const BYOK_HEADER_ACTIVE = 'x-aethel-byok-active'
export const BYOK_HEADER_PROVIDER = 'x-aethel-byok-provider'
export const BYOK_HEADER_BILLING_MODE = 'x-aethel-billing-mode'

export const BYOK_PROVIDER_HEADERS = {
  openai: 'x-aethel-byok-openai',
  anthropic: 'x-aethel-byok-anthropic',
  google: 'x-aethel-byok-google',
  openrouter: 'x-aethel-byok-openrouter',
  groq: 'x-aethel-byok-groq',
} as const

export type ByokProviderId = keyof typeof BYOK_PROVIDER_HEADERS

export type ParsedByokRequest =
  | { active: false }
  | {
      active: true
      provider: ByokProviderId | 'unknown'
      apiKey: string
    }

function header(req: NextRequest, name: string): string | null {
  const v = req.headers.get(name)
  if (!v?.trim()) return null
  return v.trim()
}

/**
 * Parse BYOK from request headers only (6E.2).
 * Does NOT fall back to User.byokKey — that path is retired (never server persist).
 */
export function parseByokFromRequest(req: NextRequest): ParsedByokRequest {
  if (header(req, BYOK_HEADER_ACTIVE) !== '1') {
    return { active: false }
  }

  const declared = (header(req, BYOK_HEADER_PROVIDER) || '').toLowerCase() as ByokProviderId | ''
  const order: ByokProviderId[] = declared && declared in BYOK_PROVIDER_HEADERS
    ? [declared, ...Object.keys(BYOK_PROVIDER_HEADERS).filter((p) => p !== declared) as ByokProviderId[]]
    : (Object.keys(BYOK_PROVIDER_HEADERS) as ByokProviderId[])

  for (const provider of order) {
    const key =
      header(req, BYOK_PROVIDER_HEADERS[provider]) ||
      header(req, 'x-aethel-byok-key') ||
      header(req, 'x-aethel-byok-credential')
    if (key) {
      return { active: true, provider, apiKey: key }
    }
  }

  // Active flag without credential — treat as inactive for debit purposes;
  // caller should reject with 400 if they require a live key for provider calls.
  return { active: false }
}

export function isByokActive(req: NextRequest): boolean {
  const parsed = parseByokFromRequest(req)
  return parsed.active
}

/** 6E.3 — enforce 10 req/min when BYOK active */
export function enforceByokProxyRateLimit(
  req: NextRequest,
  route: string,
): ReturnType<typeof enforceAiCoreRateLimit> {
  if (!isByokActive(req)) return null
  return enforceAiCoreRateLimit({
    req,
    capability: 'AI_BYOK_PROXY',
    route,
    config: AI_BYOK_RATE_LIMIT,
  })
}

/** 6E.4 — structured audit; NEVER log keys or credential headers */
export function auditByokUsage(input: {
  userId: string
  route: string
  modelId?: string
  estimatedTokens?: number
  provider?: string
}): void {
  log.info('byok_usage', {
    billingMode: 'byok',
    userId: input.userId,
    route: input.route,
    modelId: input.modelId || null,
    estimatedTokens: input.estimatedTokens ?? null,
    provider: input.provider || null,
    // Explicit: no key fields
  })
}

export function byokMissingCredentialResponse() {
  return {
    error: 'BYOK_CREDENTIAL_REQUIRED',
    message:
      'BYOK is active but no provider key header was sent. Configure keys in Settings → BYOK (client-only).',
    capability: 'BYOK',
    capabilityStatus: 'IMPLEMENTED',
    ideLocked: false,
    setupUrl: '/settings?tab=byok',
  }
}
