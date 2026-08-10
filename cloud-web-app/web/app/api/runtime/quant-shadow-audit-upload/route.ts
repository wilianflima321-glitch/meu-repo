import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  attemptShadowAuditCloudUpload,
  createShadowAuditConsent,
  type ShadowAuditKind,
} from '@/lib/server/quant/shadow-audit-telemetry'

const log = createComponentLogger('api/runtime/quant-shadow-audit-upload/route')

export const dynamic = 'force-dynamic'

/**
 * §23.D — Consent-gated shadow audit cloud upload stub.
 * Fail-closed unless cloudAuditUploadConsent === true. Silent default-ON forbidden.
 */
export async function POST(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized', mock: false }, { status: 401 })
  }

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body', mock: false }, { status: 400 })
  }

  const accountId = typeof body.accountId === 'string' ? body.accountId : ''
  const consentFlag = body.cloudAuditUploadConsent === true
  const kind = body.kind as ShadowAuditKind
  const encryptedOrHashedBody =
    typeof body.encryptedOrHashedBody === 'string' ? body.encryptedOrHashedBody : ''
  const localLedgerEntryId =
    typeof body.localLedgerEntryId === 'string' ? body.localLedgerEntryId : ''

  const consent = createShadowAuditConsent({
    accountId,
    cloudAuditUploadConsent: consentFlag,
  })

  const result = attemptShadowAuditCloudUpload(consent, {
    kind: kind ?? 'error_log',
    accountId,
    encryptedOrHashedBody,
    localLedgerEntryId,
  })

  if (!result.ok) {
    log.info('shadow_audit_upload_rejected', { code: result.code })
    return NextResponse.json(
      {
        mock: false,
        accepted: false,
        code: result.code,
        message: result.message,
        investmentGrade: false,
      },
      { status: 403 },
    )
  }

  log.info('shadow_audit_upload_stub', { uploadId: result.value.uploadId })
  return NextResponse.json({
    mock: false,
    accepted: true,
    receipt: result.value,
    investmentGrade: false,
    note: 'Stub receipt only — durable cloud WORM vault still HELD',
  })
}
