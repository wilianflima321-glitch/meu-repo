import { NextRequest, NextResponse } from 'next/server'
import type { RegistrationResponseJSON } from '@simplewebauthn/server'

import { requireAuth } from '@/lib/auth-server'
import { apiInternalError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'
import { verifyAndStorePasskeyRegistration } from '@/lib/server/webauthn-passkeys'

export const dynamic = 'force-dynamic'

const routeLogger = createComponentLogger('api.auth.webauthn.register.verify')

function isUnauthorized(error: unknown) {
  return error instanceof Error && error.message === 'Unauthorized'
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, email: true, name: true, role: true, plan: true },
    })
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const response = (await req.json()) as RegistrationResponseJSON
    const result = await verifyAndStorePasskeyRegistration({ user, response })
    if (!result.verified) {
      return NextResponse.json({ error: 'Passkey registration failed', reason: result.reason }, { status: 400 })
    }

    return NextResponse.json({ ok: true, credentialId: result.credentialId })
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    routeLogger.error('webauthn.register.verify.failed', error)
    return apiInternalError()
  }
}
