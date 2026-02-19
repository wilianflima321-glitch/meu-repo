import { NextResponse } from 'next/server'

const metadata = {
  deprecatedSince: '2026-02-19',
  removalCycleTarget: '2026-cycle-3',
  deprecationPolicy: 'use_explicit_subroutes',
  availableRoutes: [
    '/api/auth/2fa/setup',
    '/api/auth/2fa/verify',
    '/api/auth/2fa/validate',
    '/api/auth/2fa/disable',
    '/api/auth/2fa/backup-codes',
    '/api/auth/2fa/status',
  ],
}

function deprecatedResponse() {
  return NextResponse.json(
    {
      error: 'DEPRECATED_ROUTE',
      message: 'Use explicit 2FA subroutes instead of /api/auth/2fa.',
      ...metadata,
    },
    {
      status: 410,
      headers: {
        'x-aethel-route-status': 'deprecated',
        'x-aethel-deprecated-since': metadata.deprecatedSince,
        'x-aethel-removal-cycle-target': metadata.removalCycleTarget,
        'x-aethel-deprecation-policy': metadata.deprecationPolicy,
      },
    }
  )
}

export async function GET() {
  return deprecatedResponse()
}

export async function POST() {
  return deprecatedResponse()
}
