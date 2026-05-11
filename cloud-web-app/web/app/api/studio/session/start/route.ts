import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { apiErrorToResponse } from '@/lib/api-errors'
import { capabilityResponse } from '@/lib/server/capability-response'
import { createStudioSession } from '@/lib/server/studio-session-store'

type StartBody = {
  title?: string
  mission?: string
  projectId?: string
  mode?: string
  runtimeTarget?: string
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)
    const body = (await request.json().catch(() => null)) as StartBody | null
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 })
    }

    const mission = typeof body.mission === 'string' ? body.mission.trim() : ''
    if (!mission) {
      return capabilityResponse({
        error: 'MISSING_MISSION',
        message: 'Mission is required to start a Studio session.',
        status: 400,
        capability: 'STUDIO_SESSION_START',
        capabilityStatus: 'IMPLEMENTED',
      })
    }

    const session = await createStudioSession({
      userId: user.userId,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      title: typeof body.title === 'string' ? body.title : undefined,
      mission,
      mode: typeof body.mode === 'string' ? body.mode : undefined,
      runtimeTarget: typeof body.runtimeTarget === 'string' ? body.runtimeTarget : undefined,
    })

    return capabilityResponse({
      error: 'NONE',
      message: 'Studio session started.',
      status: 200,
      capability: 'STUDIO_SESSION_START',
      capabilityStatus: 'IMPLEMENTED',
      runtimeMode: session.runtimeTarget,
      metadata: { session },
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return NextResponse.json({ error: 'STUDIO_SESSION_START_FAILED' }, { status: 500 })
  }
}
