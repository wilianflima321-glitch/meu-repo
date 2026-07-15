/**
 * POST /api/settings/byok — RETIRED (Block 6E.1).
 * Keys must never persist on the server. Use Settings → BYOK (IndexedDB aethel-byok-v1).
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { prisma } from '@/lib/db'
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'

const log = createComponentLogger('api/settings/byok')

const CLIENT_ONLY = {
  capability: 'BYOK',
  capabilityStatus: 'IMPLEMENTED' as const,
  storage: 'client_indexeddb',
  setupUrl: '/settings?tab=byok',
  ideLocked: false,
  message:
    'BYOK keys are client-only (IndexedDB aethel-byok-v1). Server vault is retired — configure keys in Settings → BYOK.',
}

export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
    // Honest: server no longer stores keys. UI must use LocalBYOKSection.
    return NextResponse.json({
      isConfigured: false,
      maskedKey: null,
      serverVaultRetired: true,
      ...CLIENT_ONLY,
    })
  } catch (error) {
    log.error('GET /api/settings/byok failed', error)
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to fetch BYOK status')
  }
}

export async function POST(req: NextRequest) {
  try {
    requireAuth(req)
    return NextResponse.json(
      {
        error: 'BYOK_SERVER_VAULT_RETIRED',
        success: false,
        ...CLIENT_ONLY,
      },
      { status: 410 },
    )
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req)
    // Best-effort clear any legacy server key so accounts cannot silently debit-bypass via DB.
    await prisma.user.update({
      where: { id: auth.userId },
      data: { byokKey: null },
    })
    return NextResponse.json({
      success: true,
      legacyServerKeyCleared: true,
      ...CLIENT_ONLY,
    })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError()
  }
}
