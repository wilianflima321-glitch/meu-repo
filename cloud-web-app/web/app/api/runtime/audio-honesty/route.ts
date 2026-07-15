import { NextRequest, NextResponse } from 'next/server'

import { requireAuth } from '@/lib/auth-server'
import { evaluateAudioHonesty } from '@/lib/production/audio-honesty-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/audio-honesty/route')

export const dynamic = 'force-dynamic'

/** Block 8 — honest audio / MetaSounds / Foley capability report. */
export async function GET(req: NextRequest) {
  try {
    requireAuth(req)
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const report = evaluateAudioHonesty()
  log.info('audio_honesty_api', {
    metasounds: report.metasoundsCompiler.status,
    voice: report.voiceGenerateAudible.status,
    hrtf: report.fullHrtfAaa.status,
  })
  return NextResponse.json({ report })
}
