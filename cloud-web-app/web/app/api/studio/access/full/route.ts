import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { createFullAccessGrant } from '@/lib/server/studio-home-store'
import { capabilityResponse } from '@/lib/server/capability-response'
import { enforceRateLimit } from '@/lib/server/rate-limit'
import {
  evaluateStudioActionPolicy,
  getStudioFullAccessPolicy,
  listStudioActionClasses,
  resolveStudioActionClass,
} from '@/lib/studio/full-access-policy'

export const dynamic = 'force-dynamic'

const MAX_ROUTE_ID_LENGTH = 120

type Body = {
  sessionId?: string
  scope?: 'project' | 'workspace' | 'web_tools'
  intendedActionClass?: string
  confirmManualAction?: boolean
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
    if (!sessionId || sessionId.length > MAX_ROUTE_ID_LENGTH) {
      return NextResponse.json(
        {
          error: 'SESSION_ID_REQUIRED',
          message: 'sessionId is required and must be under 120 characters.',
        },
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

    const policy = getStudioFullAccessPolicy(scope, plan)
    const policyMetadata = {
      allowedActionClasses: policy.allowedActionClasses,
      manualConfirmActionClasses: policy.manualConfirmActionClasses,
      blockedActionClasses: policy.blockedActionClasses,
    }
    const intendedActionClassRaw = String(body.intendedActionClass || '').trim()
    const confirmManualAction = Boolean(body.confirmManualAction)
    if (intendedActionClassRaw) {
      const intendedActionClass = resolveStudioActionClass(intendedActionClassRaw)
      if (!intendedActionClass) {
        return NextResponse.json(
          {
            error: 'INVALID_ACTION_CLASS',
            message: 'intendedActionClass is invalid.',
            metadata: {
              supportedActionClasses: listStudioActionClasses(),
            },
          },
          { status: 400 }
        )
      }
      const evaluation = evaluateStudioActionPolicy(policy, intendedActionClass)
      if (evaluation.blocked) {
        return capabilityResponse({
          status: 403,
          error: 'ACTION_CLASS_BLOCKED',
          message: 'Requested action class is blocked by Full Access policy.',
          capability: 'STUDIO_HOME_FULL_ACCESS',
          capabilityStatus: 'PARTIAL',
          milestone: 'P1',
          metadata: {
            scope,
            plan,
            intendedActionClass,
            ...policyMetadata,
            policyNotes: policy.notes,
          },
        })
      }
      if (!evaluation.allowed) {
        return capabilityResponse({
          status: 403,
          error: 'ACTION_CLASS_NOT_ALLOWED_FOR_SCOPE',
          message: 'Requested action class is not allowed for the selected Full Access scope.',
          capability: 'STUDIO_HOME_FULL_ACCESS',
          capabilityStatus: 'PARTIAL',
          milestone: 'P1',
          metadata: {
            scope,
            plan,
            intendedActionClass,
            ...policyMetadata,
            policyNotes: policy.notes,
          },
        })
      }
      if (evaluation.manualConfirmRequired && !confirmManualAction) {
        return capabilityResponse({
          status: 409,
          error: 'MANUAL_CONFIRMATION_REQUIRED',
          message: 'Requested action class requires explicit manual confirmation.',
          capability: 'STUDIO_HOME_FULL_ACCESS',
          capabilityStatus: 'PARTIAL',
          milestone: 'P1',
          metadata: {
            scope,
            plan,
            intendedActionClass,
            ...policyMetadata,
            policyNotes: policy.notes,
          },
        })
      }
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
        ...policyMetadata,
        policyNotes: policy.notes,
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
