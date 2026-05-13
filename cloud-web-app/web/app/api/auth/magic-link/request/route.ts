import { NextRequest, NextResponse } from 'next/server'

import { apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'
import { issueMagicLink } from '@/lib/server/magic-link'
import { enforceTurnstile, getTurnstileClientIp } from '@/lib/server/turnstile-guard'

export const dynamic = 'force-dynamic'

const routeLogger = createComponentLogger('api.auth.magic-link.request')

function readEmail(body: Record<string, unknown>): string {
  const value = body.email
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>
    const turnstile = await enforceTurnstile(req, body, 'login')
    if (!turnstile.ok) return turnstile.response

    const email = readEmail(body)
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const result = await issueMagicLink({
      email,
      requestIp: getTurnstileClientIp(req),
      userAgent: req.headers.get('user-agent'),
    })

    if (result.status === 'not-found') {
      routeLogger.info('magic_link.requested_for_unknown_email', { email })
    }

    return NextResponse.json({
      ok: true,
      message: 'If an Aethel account exists for this email, a one-time sign-in link has been sent.',
    })
  } catch (error) {
    routeLogger.error('magic_link.request.failed', error)
    return apiInternalError()
  }
}
