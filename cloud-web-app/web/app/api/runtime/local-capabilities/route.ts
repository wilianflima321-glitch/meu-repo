import { z } from 'zod'
import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { sanitizeLocalRuntimeCapabilityReport } from '@/lib/device/local-runtime-bridge'
import {
  loadLatestLocalRuntimeCapabilitySnapshot,
  saveLocalRuntimeCapabilitySnapshot,
  type LocalRuntimeCapabilitySource,
} from '@/lib/server/local-runtime-capability-store'
import {
  shouldRequireStudioLocalSyncSignature,
  verifyStudioLocalSyncSignature,
} from '@/lib/server/studio-local-sync-signature'
import { localEvidenceJson, shouldUseLocalEvidenceFallback } from '@/lib/server/local-evidence-fallback'

export const dynamic = 'force-dynamic'

const localCapabilityPayloadSchema = z.object({
  deviceId: z.string().trim().min(3).max(120),
  deviceLabel: z.string().trim().max(120).nullish(),
  source: z.enum(['native-bridge', 'api-sync']).optional(),
  report: z.unknown(),
  signedAt: z.string().trim().min(1).max(80).optional(),
  nonce: z.string().trim().min(8).max(160).optional(),
  signature: z.string().trim().min(32).max(160).optional(),
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

  try {
    const snapshot = await loadLatestLocalRuntimeCapabilitySnapshot(user.userId)
    return NextResponse.json(buildSnapshotResponse(snapshot))
  } catch (error) {
    if (shouldUseLocalEvidenceFallback(request, error)) {
      return localEvidenceJson(
        request,
        error,
        {
          snapshot: null,
          status: 'held',
          message: 'Studio Local capability snapshot is held until the local runtime ledger is available.',
        },
        { surface: 'runtime.local-capabilities', state: 'held' },
      )
    }
    throw error
  }
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

  const source = parsed.data.source ?? 'native-bridge'
  const signatureResult = verifyStudioLocalSyncSignature({
    payload: {
      userId: user.userId,
      deviceId: parsed.data.deviceId,
      signedAt: parsed.data.signedAt ?? '',
      nonce: parsed.data.nonce ?? '',
      report: parsed.data.report,
    },
    signature: parsed.data.signature,
    required: shouldRequireStudioLocalSyncSignature({
      source,
      report: parsed.data.report,
    }),
  })

  if (!signatureResult.ok) {
    return NextResponse.json({ error: signatureResult.code }, { status: signatureResult.status })
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
      source: source as LocalRuntimeCapabilitySource,
      report,
    })

    return NextResponse.json({
      ok: true,
      syncSignature: {
        required: signatureResult.required,
        verified: signatureResult.verified,
      },
      ...buildSnapshotResponse(snapshot),
    })
  } catch (error) {
    if (shouldUseLocalEvidenceFallback(request, error)) {
      return localEvidenceJson(
        request,
        error,
        {
          ok: false,
          snapshot: null,
          status: 'held',
          error: 'LOCAL_RUNTIME_CAPABILITY_LEDGER_HELD',
        },
        { surface: 'runtime.local-capabilities.sync', state: 'held', status: 503 },
      )
    }
    const message = error instanceof Error ? error.message : 'Failed to persist local runtime capability snapshot.'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
