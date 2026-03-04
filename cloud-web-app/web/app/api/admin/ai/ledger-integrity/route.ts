import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { verifyChangeRunLedgerIntegrity } from '@/lib/server/change-run-ledger'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'ADMIN_AI_LEDGER_INTEGRITY'

function parseDays(value: string | null): number {
  const parsed = Number.parseInt(value || '14', 10)
  if (Number.isNaN(parsed)) return 14
  return Math.max(1, Math.min(parsed, 60))
}

export const GET = withAdminAuth(async (request) => {
  const daysLookback = parseDays(new URL(request.url).searchParams.get('days'))
  const report = await verifyChangeRunLedgerIntegrity({ daysLookback })
  const integrityOk = report.invalidRows === 0

  return NextResponse.json(
    {
      success: true,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      message: integrityOk ? 'Change-run ledger integrity verified.' : 'Change-run ledger integrity issues detected.',
      integrityOk,
      daysLookback,
      report,
      updatedAt: new Date().toISOString(),
    },
    {
      headers: {
        'x-aethel-capability': CAPABILITY,
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:agents:view')
