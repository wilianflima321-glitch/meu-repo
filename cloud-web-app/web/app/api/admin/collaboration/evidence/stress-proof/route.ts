import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { withAdminAuth } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

function normalizeJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {}
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch {
    return {}
  }
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async () => {
  const latest = await prisma.auditLog.findFirst({
    where: {
      category: 'collaboration-readiness',
      action: 'COLLAB_STRESS_PROOF_RECORDED',
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      adminEmail: true,
      metadata: true,
      createdAt: true,
    },
  })

  if (!latest) {
    return NextResponse.json({
      success: true,
      capability: 'COLLAB_STRESS_PROOF_LOG',
      capabilityStatus: 'PARTIAL',
      item: null,
    })
  }

  const metadata = (latest.metadata || {}) as Record<string, unknown>
  const proofUrl = typeof metadata.proofUrl === 'string' ? metadata.proofUrl : null
  const notes = typeof metadata.notes === 'string' ? metadata.notes : null
  const summary = typeof metadata.summary === 'string' ? metadata.summary : null
  const metrics = metadata.metrics && typeof metadata.metrics === 'object' ? metadata.metrics : null

  return NextResponse.json({
    success: true,
    capability: 'COLLAB_STRESS_PROOF_LOG',
    capabilityStatus: 'PARTIAL',
    item: {
      id: latest.id,
      proofUrl,
      notes,
      summary,
      metrics,
      adminEmail: latest.adminEmail,
      createdAt: latest.createdAt.toISOString(),
    },
  })
}, 'ops:users:view')

export const POST = withAdminAuth(async (request: NextRequest, { user }) => {
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'INVALID_PAYLOAD',
        message: 'Request body must be valid JSON.',
      },
      { status: 400 }
    )
  }

  const body = payload as {
    proofUrl?: string
    notes?: string
    summary?: string
    metrics?: Record<string, unknown>
  }

  const proofUrl = typeof body.proofUrl === 'string' ? body.proofUrl.trim() : ''
  if (!proofUrl || !isHttpUrl(proofUrl)) {
    return NextResponse.json(
      {
        success: false,
        error: 'STRESS_PROOF_URL_INVALID',
        message: 'Field `proofUrl` must be a valid http/https URL.',
      },
      { status: 400 }
    )
  }

  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null
  const summary = typeof body.summary === 'string' ? body.summary.slice(0, 300) : null
  const metrics = body.metrics && typeof body.metrics === 'object' ? normalizeJson(body.metrics) : {}

  const auditEntry = await prisma.auditLog.create({
    data: {
      action: 'COLLAB_STRESS_PROOF_RECORDED',
      category: 'collaboration-readiness',
      severity: 'info',
      adminId: user.id,
      adminEmail: user.email,
      adminRole: user.role,
      resource: 'collaboration',
      metadata: {
        proofUrl,
        notes,
        summary,
        metrics,
        recordedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json(
    {
      success: true,
      capability: 'COLLAB_STRESS_PROOF_LOG',
      capabilityStatus: 'PARTIAL',
      item: {
        id: auditEntry.id,
        proofUrl,
        notes,
        summary,
        createdAt: auditEntry.createdAt.toISOString(),
      },
    },
    {
      headers: {
        'x-aethel-capability': 'COLLAB_STRESS_PROOF_LOG',
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:users:edit')
