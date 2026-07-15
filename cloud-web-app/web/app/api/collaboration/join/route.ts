/**
 * Block 2A.4 — Join handshake: role + branch-scoped room name.
 * POST /api/collaboration/join
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { prisma } from '@/lib/db'
import {
  resolveCollabDocumentName,
  resolveCollabPersistenceName,
  type CollabSurfaceScope,
} from '@/lib/collaboration/collab-channel'
import { resolveCollabSeat } from '@/lib/collaboration/collab-seat-policy'
import { createComponentLogger } from '@/lib/observability/logger'

export const dynamic = 'force-dynamic'

const log = createComponentLogger('api/collaboration/join')

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const body = (await request.json().catch(() => ({}))) as {
      projectId?: string
      branchId?: string
      scope?: CollabSurfaceScope
      scopeId?: string
      roomWriteCount?: number
    }

    const projectId = String(body.projectId || '').trim()
    if (!projectId) {
      return NextResponse.json(
        { error: 'MISSING_PROJECT_ID', message: 'projectId is required.' },
        { status: 400 },
      )
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [{ userId: user.userId }, { members: { some: { userId: user.userId } } }],
      },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json(
        { error: 'PROJECT_NOT_FOUND', message: 'Project not found or access denied.' },
        { status: 404 },
      )
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    })
    const planId = (dbUser?.plan || 'free').replace('_trial', '')
    const seat = resolveCollabSeat({
      planId,
      roomWriteCount: Math.max(0, Math.floor(Number(body.roomWriteCount) || 0)),
    })

    const branchId = String(body.branchId || 'main').trim() || 'main'
    const scope = body.scope || 'workbench'
    const documentName = resolveCollabDocumentName({
      projectId,
      branchId,
      scope,
      scopeId: body.scopeId,
    })
    const persistenceName = resolveCollabPersistenceName({
      projectId,
      branchId,
      scope,
      scopeId: body.scopeId,
    })

    log.info('collab_join', {
      userId: user.userId,
      projectId,
      role: seat.role,
      documentName,
    })

    return NextResponse.json({
      success: true,
      role: seat.role,
      canWrite: seat.role === 'write',
      seat,
      documentName,
      persistenceName,
      branchId,
      scope,
      readOnly: seat.role === 'spectator',
    })
  } catch (error) {
    log.error('collab_join_failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
