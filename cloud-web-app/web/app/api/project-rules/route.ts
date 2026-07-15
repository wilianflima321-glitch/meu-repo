import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth, verifyProjectOwnership } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  loadProjectRulesDescriptor,
  writeProjectRulesContent,
} from '@/lib/server/project-rules'

export const dynamic = 'force-dynamic'

const log = createComponentLogger('api-project-rules')

function normalizeProjectId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function serializeDescriptor(descriptor: Awaited<ReturnType<typeof loadProjectRulesDescriptor>>) {
  return {
    hasRules: descriptor.exists && descriptor.content.length > 0,
    scope: descriptor.scope,
    sourcePath: descriptor.sourcePath,
    content: descriptor.content,
  }
}

async function assertProjectOwnership(projectId: string | undefined, userId: string) {
  if (!projectId) return

  const ownsProject = await verifyProjectOwnership(projectId, userId)
  if (!ownsProject) {
    throw Object.assign(new Error('Forbidden'), { code: 'FORBIDDEN' })
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const projectId = normalizeProjectId(new URL(request.url).searchParams.get('projectId'))
    await assertProjectOwnership(projectId, user.userId)

    const descriptor = await loadProjectRulesDescriptor({
      userId: user.userId,
      projectId,
    })

    return NextResponse.json({
      success: true,
      rules: serializeDescriptor(descriptor),
    })
  } catch (error) {
    log.error('Failed to load project rules', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return apiInternalError()
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const body = await request.json().catch(() => ({}))
    const projectId = normalizeProjectId(body?.projectId)
    const content = typeof body?.content === 'string' ? body.content : ''

    await assertProjectOwnership(projectId, user.userId)

    const descriptor = await writeProjectRulesContent({
      userId: user.userId,
      projectId,
      content,
    })

    return NextResponse.json({
      success: true,
      rules: serializeDescriptor(descriptor),
    })
  } catch (error) {
    log.error('Failed to update project rules', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    if (error instanceof Error && error.message === 'Forbidden') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return apiInternalError()
  }
}
