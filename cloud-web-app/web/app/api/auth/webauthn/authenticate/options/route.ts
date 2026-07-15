import { NextRequest, NextResponse } from 'next/server'

import { apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'
import { buildPasskeyAuthenticationOptions } from '@/lib/server/webauthn-passkeys'
import { enforceTurnstile } from '@/lib/server/turnstile-guard'

export const dynamic = 'force-dynamic'

const routeLogger = createComponentLogger('api.auth.webauthn.authenticate.options')

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
    const turnstile = await enforceTurnstile(req, body, 'login')
    if (!turnstile.ok) return turnstile.response

    const email = typeof body.email === 'string' ? body.email : null
    const options = await buildPasskeyAuthenticationOptions(email)
    return NextResponse.json(options)
  } catch (error) {
    routeLogger.error('webauthn.authenticate.options.failed', error)
    return apiInternalError()
  }
}
