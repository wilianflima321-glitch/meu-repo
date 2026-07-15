import { NextRequest, NextResponse } from 'next/server'
import type { AuthenticationResponseJSON } from '@simplewebauthn/server'

import { apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'
import { verifyPasskeyAuthentication } from '@/lib/server/webauthn-passkeys'

export const dynamic = 'force-dynamic'

const routeLogger = createComponentLogger('api.auth.webauthn.authenticate.verify')

function withAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return response
}

export async function POST(req: NextRequest) {
  try {
    const response = (await req.json()) as AuthenticationResponseJSON
    const result = await verifyPasskeyAuthentication(response)
    if (result.status !== 'authenticated') {
      return NextResponse.json({ error: 'Passkey authentication failed', status: result.status }, { status: 401 })
    }

    return withAuthCookie(
      NextResponse.json({
        access_token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name,
          plan: result.user.plan,
        },
      }),
      result.token
    )
  } catch (error) {
    routeLogger.error('webauthn.authenticate.verify.failed', error)
    return apiInternalError()
  }
}
