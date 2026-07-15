import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { createComponentLogger } from '@/lib/observability/logger';
import {
  readViewportRenderArtifact,
  resolveViewportRenderArtifactUrl,
  ViewportRenderArtifactReadError,
} from '@/lib/viewport/viewport-render-backend'

const logger = createComponentLogger('api.projects.production-state.render-job.artifact')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

async function loadProjectForRenderArtifact(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ userId }, { members: { some: { userId } } }],
    },
    select: {
      id: true,
      userId: true,
      members: {
        where: { userId },
        select: { role: true },
      },
    },
  })
}

function arrayBufferFromBuffer(buffer: Buffer): ArrayBuffer {
  const body = new ArrayBuffer(buffer.byteLength)
  new Uint8Array(body).set(buffer)
  return body
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    await requireEntitlementsForUser(user.userId)

    const project = await loadProjectForRenderArtifact(params.id, user.userId)
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const artifactUrl = request.nextUrl.searchParams.get('artifactUrl')
    if (!artifactUrl) {
      return NextResponse.json({ error: 'Missing render artifact URL' }, { status: 400 })
    }

    const resolved = resolveViewportRenderArtifactUrl(artifactUrl)
    if (resolved.projectId !== project.id) {
      logger.warn('render_artifact.project_mismatch', {
        userId: user.userId,
        projectId: project.id,
        artifactProjectId: resolved.projectId,
        contractId: resolved.contractId,
      })
      return NextResponse.json({ error: 'Render artifact does not belong to this project' }, { status: 403 })
    }

    const artifact = await readViewportRenderArtifact(artifactUrl)

    logger.info('render_artifact.served', {
      userId: user.userId,
      projectId: project.id,
      contractId: artifact.contractId,
      fileName: artifact.fileName,
    })

    return new NextResponse(arrayBufferFromBuffer(artifact.body), {
      headers: {
        'content-type': artifact.contentType,
        'cache-control': 'private, no-store',
        'content-disposition': `inline; filename="${artifact.fileName.replace(/"/g, '')}"`,
        'x-aethel-render-contract': artifact.contractId,
        'x-aethel-artifact-kind': artifact.fileName,
      },
    })
  } catch (error) {
    if (error instanceof ViewportRenderArtifactReadError) {
      return NextResponse.json({ error: error.code, message: error.message }, { status: error.status })
    }

    logger.error('render_artifact.serve_failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
