import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { createFullAccessGrant } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'

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

function getAllowedScopesForPlan(plan: string): Array<'project' | 'workspace' | 'web_tools'> {
  const normalized = plan.trim().toLowerCase()
  if (normalized === 'basic') return ['project', 'workspace']
  if (normalized === 'pro' || normalized === 'studio' || normalized === 'enterprise') {
    return ['project', 'workspace', 'web_tools']
  }
  return ['project']
}

function getGrantTtlMinutesForPlan(plan: string): number {
  const normalized = plan.trim().toLowerCase()
  if (normalized === 'enterprise') return 45
  if (normalized === 'pro' || normalized === 'studio') return 30
  if (normalized === 'basic') return 20
  return 15
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    const rateLimitResponse = await enforceRateLimit({
      scope: 'studio-full-access-grant',
      key: auth.userId,
      max: 30,
      windowMs: 60 * 1000,
      message: 'Too many full access grant requests. Please retry shortly.',
    })
    if (rateLimitResponse) return rateLimitResponse

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
    const allowedScopes = getAllowedScopesForPlan(plan)
    const ttlMinutes = getGrantTtlMinutesForPlan(plan)

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
    if (!allowedScopes.includes(scope)) {
      return capabilityResponse({
        status: 403,
        error: 'FEATURE_NOT_ALLOWED',
        message: 'Requested Full Access scope is not available for current plan.',
        capability: 'STUDIO_HOME_FULL_ACCESS',
        capabilityStatus: 'PARTIAL',
        milestone: 'P1',
        metadata: {
          requestedScope: scope,
          allowedScopes,
          plan,
        },
      })
    }

    const session = await createFullAccessGrant(auth.userId, sessionId, scope, ttlMinutes)
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
        ttlMinutes,
        allowedScopes,
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
