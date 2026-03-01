import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    requireAuth(request)

    const body = await request.json().catch(() => ({}))
    return NextResponse.json({
      success: true,
      accepted: true,
      capability: 'AUDIT_INGEST',
      capabilityStatus: 'PARTIAL',
      message: 'Audit ingest endpoint is active in baseline mode.',
      metadata: body && typeof body === 'object' ? { keys: Object.keys(body as Record<string, unknown>).slice(0, 20) } : {},
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      {
        error: 'AUDIT_INGEST_ERROR',
        message: error instanceof Error ? error.message : 'Failed to ingest audit event',
      },
      { status: 500 }
    )
  }
}
