import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { apiInternalError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import { createComponentLogger } from '@/lib/observability/logger'
import { buildPasskeyRegistrationOptions } from '@/lib/server/webauthn-passkeys'

export const dynamic = 'force-dynamic'

const routeLogger = createComponentLogger('api.auth.webauthn.register.options')

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

    const options = await buildPasskeyRegistrationOptions(user)
    return NextResponse.json(options)
  } catch (error) {
    if (isUnauthorized(error)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    routeLogger.error('webauthn.register.options.failed', error)
    return apiInternalError()
  }
}
