import { promises as fs } from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'ADMIN_AI_L4_READINESS_DOSSIER'

export const GET = withAdminAuth(async () => {
  try {
    const dossierPath = path.join(process.cwd(), '..', '..', 'metrics', 'l4-readiness-dossier.json')
    const raw = await fs.readFile(dossierPath, 'utf8')
    const dossier = JSON.parse(raw)

    return NextResponse.json(
      {
        ...dossier,
        capability: CAPABILITY,
        capabilityStatus: dossier?.status ?? 'PARTIAL',
      },
      {
        headers: {
          'x-aethel-capability': CAPABILITY,
          'x-aethel-capability-status': dossier?.status ?? 'PARTIAL',
        },
      }
    )
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        capability: CAPABILITY,
        capabilityStatus: 'UNAVAILABLE',
        error: 'Unable to load L4 readiness dossier',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}, 'ops:agents:view')
