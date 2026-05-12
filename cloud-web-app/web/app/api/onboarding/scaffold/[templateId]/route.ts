import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import {
  findProjectScaffold,
  getScaffoldTotalSize,
  listProjectScaffolds,
} from '@/lib/project-scaffolds'
import { checkStorageQuota } from '@/lib/storage-quota'

type RouteContext = {
  params: {
    templateId: string
  }
}

function sanitizeProjectName(name: unknown, fallback: string) {
  if (typeof name !== 'string') return fallback
  const normalized = name.replace(/\s+/g, ' ').trim()
  return normalized ? normalized.slice(0, 100) : fallback
}

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const scaffold = findProjectScaffold(params.templateId)
  if (!scaffold) {
    return NextResponse.json(
      {
        error: 'SCAFFOLD_NOT_FOUND',
        available: listProjectScaffolds(),
      },
      { status: 404 },
    )
  }

  const { files, ...metadata } = scaffold
  return NextResponse.json({
    ...metadata,
    fileCount: files.length,
    files: files.map((file) => ({
      path: file.path,
      language: file.language,
      size: Buffer.byteLength(file.content, 'utf8'),
    })),
  })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const user = requireAuth(request)
    const entitlements = await requireEntitlementsForUser(user.userId)
    const scaffold = findProjectScaffold(params.templateId)

    if (!scaffold) {
      return NextResponse.json(
        {
          error: 'SCAFFOLD_NOT_FOUND',
          available: listProjectScaffolds(),
        },
        { status: 404 },
      )
    }

    if (entitlements.plan.limits.projects !== -1) {
      const existingProjectCount = await prisma.project.count({ where: { userId: user.userId } })
      if (existingProjectCount >= entitlements.plan.limits.projects) {
        return NextResponse.json(
          {
            error: 'PROJECT_LIMIT_REACHED',
            message: `Project limit for plan ${entitlements.plan.id} reached.`,
            plan: entitlements.plan.id,
          },
          { status: 402 },
        )
      }
    }

    const body = await request.json().catch(() => ({}))
    const projectName = sanitizeProjectName(body?.name, scaffold.name)
    const mission = typeof body?.mission === 'string' ? body.mission.replace(/\s+/g, ' ').trim().slice(0, 2000) : ''
    const source = typeof body?.source === 'string' ? body.source.replace(/\s+/g, '-').trim().slice(0, 80) : 'onboarding'
    const totalSize = Math.max(scaffold.estimatedSize, getScaffoldTotalSize(scaffold))

    const quota = await checkStorageQuota({
      userId: user.userId,
      additionalBytes: totalSize,
    })

    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: 'STORAGE_QUOTA_EXCEEDED',
          ...quota,
        },
        { status: 402 },
      )
    }

    const project = await prisma.project.create({
      data: {
        name: projectName,
        template: scaffold.id,
        userId: user.userId,
        description: scaffold.description,
        settings: {
          entry: {
            mission,
            source,
            scaffold: scaffold.id,
            createdFrom: 'onboarding-scaffold',
            handoff: scaffold.recommendedStudioSurface,
          },
          studio: {
            initialSurface: scaffold.recommendedStudioSurface,
            depthModel: 'mission-first-progressive-depth',
          },
        },
        files: {
          create: scaffold.files.map((file) => ({
            path: file.path,
            language: file.language,
            content: file.content,
            size: Buffer.byteLength(file.content, 'utf8'),
          })),
        },
      },
      include: {
        _count: {
          select: {
            files: true,
          },
        },
      },
    })

    return NextResponse.json(
      {
        projectId: project.id,
        name: project.name,
        template: scaffold.id,
        recommendedStudioSurface: scaffold.recommendedStudioSurface,
        openUrl: `/ide?projectId=${encodeURIComponent(project.id)}`,
        studioUrl: `${scaffold.recommendedStudioSurface}?projectId=${encodeURIComponent(project.id)}`,
        fileCount: project._count.files,
        files: scaffold.files.map((file) => file.path),
        quota,
      },
      { status: 201 },
    )
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
