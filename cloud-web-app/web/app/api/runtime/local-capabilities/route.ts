import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { sanitizeLocalRuntimeCapabilityReport } from '@/lib/device/local-runtime-bridge'
import {
  loadLatestLocalRuntimeCapabilitySnapshot,
  saveLocalRuntimeCapabilitySnapshot,
  type LocalRuntimeCapabilitySource,
} from '@/lib/server/local-runtime-capability-store'

export const dynamic = 'force-dynamic'

const localCapabilityPayloadSchema = z.object({
  deviceId: z.string().trim().min(3).max(120),
  deviceLabel: z.string().trim().max(120).nullish(),
  source: z.enum(['native-bridge', 'api-sync']).optional(),
  report: z.unknown(),
})

function buildUnauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

function buildSnapshotResponse(snapshot: Awaited<ReturnType<typeof loadLatestLocalRuntimeCapabilitySnapshot>>) {
  if (!snapshot) {
    return {
      snapshot: null,
    }
  }

  return {
    snapshot: {
      deviceId: snapshot.deviceId,
      deviceLabel: snapshot.deviceLabel,
      source: snapshot.source,
      syncedAt: snapshot.syncedAt,
      report: snapshot.report,
    },
  }
}

export async function GET(request: NextRequest) {
  let user
  try {
    user = requireAuth(request)
  } catch {
    return buildUnauthorizedResponse()
  }

  const snapshot = await loadLatestLocalRuntimeCapabilitySnapshot(user.userId)
  return NextResponse.json(buildSnapshotResponse(snapshot))
}

export async function POST(request: NextRequest) {
  let user
  try {
    user = requireAuth(request)
  } catch {
    return buildUnauthorizedResponse()
  }

  const body = await request.json().catch(() => null)
  const parsed = localCapabilityPayloadSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: 'INVALID_LOCAL_RUNTIME_PAYLOAD',
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
      { status: 400 }
    )
  }

  const report = sanitizeLocalRuntimeCapabilityReport(parsed.data.report)
  if (!report) {
    return NextResponse.json({ error: 'INVALID_LOCAL_RUNTIME_REPORT' }, { status: 400 })
  }

  if (Date.parse(report.receivedAt) > Date.now() + 5 * 60 * 1000) {
    return NextResponse.json({ error: 'LOCAL_RUNTIME_REPORT_FROM_FUTURE' }, { status: 400 })
  }

  try {
    const snapshot = await saveLocalRuntimeCapabilitySnapshot({
      userId: user.userId,
      deviceId: parsed.data.deviceId,
      deviceLabel: parsed.data.deviceLabel ?? report.machineName ?? null,
      source: (parsed.data.source ?? 'native-bridge') as LocalRuntimeCapabilitySource,
      report,
    })

    return NextResponse.json({
      ok: true,
      ...buildSnapshotResponse(snapshot),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to persist local runtime capability snapshot.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
