import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { withAdminAuth } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

type EvidenceType = 'syntheticConcurrency' | 'reconnectReplay' | 'conflictReplay'

const ALLOWED_EVIDENCE_TYPES: EvidenceType[] = [
  'syntheticConcurrency',
  'reconnectReplay',
  'conflictReplay',
]

function normalizeJson(value: unknown): Prisma.InputJsonValue {
  if (value === undefined) return {}
  try {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  } catch {
    return {}
  }
}

export const dynamic = 'force-dynamic'

export const GET = withAdminAuth(async () => {
  const rows = await prisma.auditLog.findMany({
    where: {
      category: 'collaboration-readiness',
      action: 'COLLAB_EVIDENCE_RECORDED',
    },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true,
      adminEmail: true,
      severity: true,
      metadata: true,
      createdAt: true,
    },
  })

  const items = rows
    .map((row) => {
      const metadata = (row.metadata || {}) as Record<string, unknown>
      const evidenceType = metadata.evidenceType
      const passed = metadata.passed
      const notes = metadata.notes
      if (!ALLOWED_EVIDENCE_TYPES.includes(evidenceType as EvidenceType) || typeof passed !== 'boolean') {
        return null
      }
      return {
        id: row.id,
        evidenceType,
        passed,
        notes: typeof notes === 'string' ? notes : null,
        severity: row.severity,
        adminEmail: row.adminEmail,
        createdAt: row.createdAt.toISOString(),
      }
    })
    .filter(Boolean)

  return NextResponse.json({
    success: true,
    capability: 'COLLAB_REALTIME_EVIDENCE_LOG',
    capabilityStatus: 'PARTIAL',
    items,
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
    evidenceType?: string
    passed?: boolean
    notes?: string
    metrics?: Record<string, unknown>
  }

  if (!body?.evidenceType || !ALLOWED_EVIDENCE_TYPES.includes(body.evidenceType as EvidenceType)) {
    return NextResponse.json(
      {
        success: false,
        error: 'EVIDENCE_TYPE_INVALID',
        message: 'Unsupported evidence type.',
      },
      { status: 400 }
    )
  }
  if (typeof body.passed !== 'boolean') {
    return NextResponse.json(
      {
        success: false,
        error: 'PASSED_FLAG_REQUIRED',
        message: 'Field `passed` must be boolean.',
      },
      { status: 400 }
    )
  }

  const notes = typeof body.notes === 'string' ? body.notes.slice(0, 500) : null
  const metrics = body.metrics && typeof body.metrics === 'object' ? normalizeJson(body.metrics) : {}

  const auditEntry = await prisma.auditLog.create({
    data: {
      action: 'COLLAB_EVIDENCE_RECORDED',
      category: 'collaboration-readiness',
      severity: body.passed ? 'info' : 'warning',
      adminId: user.id,
      adminEmail: user.email,
      adminRole: user.role,
      resource: 'collaboration',
      metadata: {
        evidenceType: body.evidenceType,
        passed: body.passed,
        notes,
        metrics,
        recordedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    },
  })

  return NextResponse.json(
    {
      success: true,
      capability: 'COLLAB_REALTIME_EVIDENCE_LOG',
      capabilityStatus: 'PARTIAL',
      item: {
        id: auditEntry.id,
        evidenceType: body.evidenceType,
        passed: body.passed,
        notes,
        createdAt: auditEntry.createdAt.toISOString(),
      },
    },
    {
      headers: {
        'x-aethel-capability': 'COLLAB_REALTIME_EVIDENCE_LOG',
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:users:edit')
