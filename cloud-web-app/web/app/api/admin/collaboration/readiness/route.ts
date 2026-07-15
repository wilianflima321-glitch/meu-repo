import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { prisma } from '@/lib/prisma'

type EvidenceEvent = {
  id: string
  evidenceType: 'syntheticConcurrency' | 'reconnectReplay' | 'conflictReplay'
  passed: boolean
  createdAt: string
  adminEmail: string | null
  notes: string | null
}

export const dynamic = 'force-dynamic'
const EVIDENCE_MAX_AGE_DAYS = 30

export const GET = withAdminAuth(async () => {
  const now = new Date()
  const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [activeRooms, onlineParticipants, recentJoinEvents, evidenceLogs, stressProofLog] = await Promise.all([
    prisma.collaborationRoom.count({
      where: {
        updatedAt: { gte: thirtyMinutesAgo },
      },
    }),
    prisma.collaborationRoomParticipant.count({
      where: {
        status: 'online',
      },
    }),
    prisma.auditLog.count({
      where: {
        category: 'analytics',
        action: 'analytics:collab_join',
        createdAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        category: 'collaboration-readiness',
        action: 'COLLAB_EVIDENCE_RECORDED',
      },
      orderBy: { createdAt: 'desc' },
      take: 60,
      select: {
        id: true,
        adminEmail: true,
        metadata: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findFirst({
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
    }),
  ])

  const evidenceByType: Record<'syntheticConcurrency' | 'reconnectReplay' | 'conflictReplay', boolean> = {
    syntheticConcurrency: false,
    reconnectReplay: false,
    conflictReplay: false,
  }
  const evidenceLastPassedAt: Record<'syntheticConcurrency' | 'reconnectReplay' | 'conflictReplay', string | null> = {
    syntheticConcurrency: null,
    reconnectReplay: null,
    conflictReplay: null,
  }
  const evidenceEvents: EvidenceEvent[] = []
  let loadProofDate: string | null = null

  for (const log of evidenceLogs) {
    const metadata = (log.metadata || {}) as Record<string, unknown>
    const evidenceType = metadata.evidenceType
    const passed = metadata.passed
    const notes = metadata.notes
    if (
      (evidenceType === 'syntheticConcurrency' || evidenceType === 'reconnectReplay' || evidenceType === 'conflictReplay')
      && typeof passed === 'boolean'
    ) {
      if (!evidenceByType[evidenceType]) {
        evidenceByType[evidenceType] = passed
      }
      if (passed && !evidenceLastPassedAt[evidenceType]) {
        evidenceLastPassedAt[evidenceType] = log.createdAt.toISOString()
      }
      if (passed && !loadProofDate) {
        loadProofDate = log.createdAt.toISOString()
      }
      evidenceEvents.push({
        id: log.id,
        evidenceType,
        passed,
        createdAt: log.createdAt.toISOString(),
        adminEmail: log.adminEmail,
        notes: typeof notes === 'string' ? notes : null,
      })
    }
  }

  const stressProofMetadata = (stressProofLog?.metadata || {}) as Record<string, unknown>
  const stressProofUrl = typeof stressProofMetadata.proofUrl === 'string' ? stressProofMetadata.proofUrl : null
  const stressProofSummary = typeof stressProofMetadata.summary === 'string' ? stressProofMetadata.summary : null
  const stressProofAttached = Boolean(stressProofUrl)
  const evidenceMaxAgeMs = EVIDENCE_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
  const isStale = (iso: string | null) =>
    !iso || now.getTime() - new Date(iso).getTime() > evidenceMaxAgeMs

  const stale = {
    syntheticConcurrency: isStale(evidenceLastPassedAt.syntheticConcurrency),
    reconnectReplay: isStale(evidenceLastPassedAt.reconnectReplay),
    conflictReplay: isStale(evidenceLastPassedAt.conflictReplay),
    stressProof: isStale(stressProofLog?.createdAt?.toISOString() ?? null),
  }

  if (stressProofLog && stressProofAttached) {
    loadProofDate = stressProofLog.createdAt.toISOString()
  }

  const redisConfigured = Boolean(process.env.REDIS_HOST || process.env.UPSTASH_REDIS_REST_URL)
  const websocketConfigured = Boolean(process.env.NEXT_PUBLIC_COLLAB_WS_URL || process.env.COLLAB_WS_URL)
  const signalingConfigured = Boolean(process.env.NEXT_PUBLIC_WEBRTC_SIGNALING_URL || process.env.WEBRTC_SIGNALING_URL)

  const readinessScore =
    (redisConfigured ? 25 : 0) +
    (websocketConfigured ? 25 : 0) +
    (signalingConfigured ? 20 : 0) +
    (activeRooms > 0 ? 15 : 0) +
    (recentJoinEvents > 0 ? 5 : 0) +
    (evidenceByType.syntheticConcurrency ? 3 : 0) +
    (evidenceByType.reconnectReplay ? 3 : 0) +
    (evidenceByType.conflictReplay ? 4 : 0)

  const promotionEligible =
    redisConfigured &&
    websocketConfigured &&
    signalingConfigured &&
    evidenceByType.syntheticConcurrency &&
    evidenceByType.reconnectReplay &&
    evidenceByType.conflictReplay &&
    stressProofAttached &&
    !stale.syntheticConcurrency &&
    !stale.reconnectReplay &&
    !stale.conflictReplay &&
    !stale.stressProof

  return NextResponse.json(
    {
      success: true,
      capability: 'COLLAB_REALTIME_READINESS',
      capabilityStatus: 'PARTIAL',
      message:
        'Colaboracao em tempo real disponivel em baseline operacional. Promocao para claim full depende de evidencias de stress/reconnect/conflict replay.',
      readinessScore,
      runtime: {
        redisConfigured,
        websocketConfigured,
        signalingConfigured,
      },
      observed: {
        activeRooms30m: activeRooms,
        onlineParticipants,
        joinEvents7d: recentJoinEvents,
      },
      sloTargets: {
        availability: '99.5%',
        p95LatencyMs: 250,
        reconnectS: 5,
        errorBudgetPercent: 1,
      },
      evidence: {
        syntheticConcurrency: evidenceByType.syntheticConcurrency,
        reconnectReplay: evidenceByType.reconnectReplay,
        conflictReplay: evidenceByType.conflictReplay,
        stressProofAttached,
        stressProofUrl,
        stressProofSummary,
        loadProofDate,
        lastPassedAt: evidenceLastPassedAt,
        stale,
        maxAgeDays: EVIDENCE_MAX_AGE_DAYS,
      },
      evidenceHistory: evidenceEvents.slice(0, 12),
      promotionEligible,
      updatedAt: now.toISOString(),
    },
    {
      headers: {
        'x-aethel-capability': 'COLLAB_REALTIME_READINESS',
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:users:view')
