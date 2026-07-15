import { NextRequest, NextResponse } from 'next/server'

type LocalFallbackState = 'held' | 'provider_unavailable' | 'needs-review' | 'blocked'

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

type ErrorWithCode = {
  code?: unknown
}

function normalizeHostname(request: NextRequest): string {
  const hostname = request.nextUrl.hostname || new URL(request.url).hostname
  return hostname.toLowerCase()
}

export function isLocalEvidenceRequest(request: NextRequest): boolean {
  if (process.env.AETHEL_ENABLE_LOCAL_EVIDENCE_FALLBACK === '1') return true
  if (process.env.AUTHENTICATED_UX_LOCAL_API_FALLBACK === '1') return true
  return LOCAL_HOSTS.has(normalizeHostname(request))
}

export function isRecoverableLocalEvidenceError(error: unknown): boolean {
  const code = String(error && typeof error === 'object' ? (error as ErrorWithCode).code || '' : '')
  const message = error instanceof Error ? error.message : String(error || '')
  const combined = `${code} ${message}`.toLowerCase()

  return [
    'p1000',
    'p1001',
    'p1002',
    'p2021',
    'p2022',
    'econnrefused',
    'enotfound',
    'etimedout',
    'database',
    'prisma',
    'query engine',
    'can\'t reach database',
    'user_not_found',
    'plan_not_found',
    'plan_mismatch',
    'feature_not_available',
    'billing_readiness_unavailable',
  ].some((needle) => combined.includes(needle))
}

export function shouldUseLocalEvidenceFallback(request: NextRequest, error: unknown): boolean {
  return isLocalEvidenceRequest(request) && isRecoverableLocalEvidenceError(error)
}

export function localEvidenceReason(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Local evidence dependency unavailable.'
}

export function localEvidenceHeaders(state: LocalFallbackState = 'held'): Record<string, string> {
  return {
    'x-aethel-local-evidence-fallback': '1',
    'x-aethel-capability-status': state,
  }
}

export function localEvidenceJson<T extends Record<string, unknown>>(
  request: NextRequest,
  error: unknown,
  payload: T,
  options: {
    state?: LocalFallbackState
    status?: number
    surface: string
  },
) {
  const state = options.state ?? 'held'
  return NextResponse.json(
    {
      ...payload,
      capabilityStatus: state,
      localEvidenceFallback: {
        enabled: true,
        surface: options.surface,
        reason: localEvidenceReason(error),
        nextAction:
          'Configure the backing service for production; local authenticated evidence keeps the UI reviewable without pretending the provider is ready.',
      },
    },
    {
      status: options.status ?? 200,
      headers: localEvidenceHeaders(state),
    },
  )
}
