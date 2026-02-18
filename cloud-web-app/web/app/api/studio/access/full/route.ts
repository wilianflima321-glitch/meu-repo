import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { createFullAccessGrant } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'

export const dynamic = 'force-dynamic'

type Body = {
  sessionId?: string
  scope?: 'project' | 'workspace' | 'web_tools'
}

function resolveScope(value: unknown): 'project' | 'workspace' | 'web_tools' {
  const raw = String(value || '').trim()
  if (raw === 'project' || raw === 'workspace' || raw === 'web_tools') return raw
  return 'project'
}

function isTrialOrStarter(plan: string | null | undefined): boolean {
  const normalized = String(plan || '').trim().toLowerCase()
  return normalized.endsWith('_trial') || normalized === 'starter' || normalized === 'starter_trial'
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const body = (await req.json().catch(() => ({}))) as Body
    const sessionId = String(body.sessionId || '').trim()
    if (!sessionId) {
      return NextResponse.json(
        { error: 'SESSION_ID_REQUIRED', message: 'sessionId is required.' },
        { status: 400 }
      )
    }

    const scope = resolveScope(body.scope)
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { plan: true },
    })
    const plan = String(user?.plan || 'starter_trial')

    if (isTrialOrStarter(plan) && scope !== 'project') {
      return capabilityResponse({
        status: 403,
        error: 'FEATURE_NOT_ALLOWED',
        message: 'Full Access beyond project scope requires Basic plan or above.',
        capability: 'STUDIO_HOME_FULL_ACCESS',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          requestedScope: scope,
          allowedScope: 'project',
          plan,
        },
      })
    }

    const session = await createFullAccessGrant(auth.userId, sessionId, scope, 30)
    if (!session) {
      return NextResponse.json(
        { error: 'STUDIO_SESSION_NOT_FOUND', message: 'Studio session not found for current user.' },
        { status: 404 }
      )
    }
    if (session.status !== 'active') {
      return capabilityResponse({
        status: 409,
        error: 'SESSION_NOT_ACTIVE',
        message: 'Studio session is not active. Full Access cannot be granted.',
        capability: 'STUDIO_HOME_FULL_ACCESS',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          sessionStatus: session.status,
        },
      })
    }

    return NextResponse.json({
      ok: true,
      session,
      capability: 'STUDIO_HOME_FULL_ACCESS',
      capabilityStatus: 'IMPLEMENTED',
      metadata: {
        scope,
        ttlMinutes: 30,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to grant full access'
    if (message.includes('Unauthorized') || message.includes('Not authenticated')) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message }, { status: 401 })
    }
    return NextResponse.json({ error: 'STUDIO_FULL_ACCESS_GRANT_FAILED', message }, { status: 500 })
  }
}
