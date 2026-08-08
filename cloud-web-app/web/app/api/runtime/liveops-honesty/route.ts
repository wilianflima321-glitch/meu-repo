import { NextRequest, NextResponse } from 'next/server'

import {
  evaluateLiveOpsF2Honesty,
  probeLiveOpsF2Honesty,
} from '@/lib/liveops/liveops-f2-capability'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/runtime/liveops-honesty/route')

export const dynamic = 'force-dynamic'

/**
 * F.2 LiveOps / TelemetrySpool honesty report.
 * Query overrides (tests/ops): spool=0, ingest=0, stats=1, heatmaps=1,
 * durableSave=1, save=1 (cloud), discovery=1, reviews=1
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const parseBool = (key: string): boolean | undefined => {
    const v = sp.get(key)
    if (v === null) return undefined
    if (v === '1' || v === 'true') return true
    if (v === '0' || v === 'false') return false
    return undefined
  }

  const hasOverride =
    sp.has('spool') ||
    sp.has('ingest') ||
    sp.has('stats') ||
    sp.has('heatmaps') ||
    sp.has('durableSave') ||
    sp.has('save') ||
    sp.has('discovery') ||
    sp.has('reviews')

  const report = hasOverride
    ? evaluateLiveOpsF2Honesty({
        // Fail-closed: omitted override keys stay false (P2b HIGH #18).
        spoolModuleReady: parseBool('spool') === true,
        playtimeIngestReady: parseBool('ingest') === true,
        playerStatsWritable: parseBool('stats') === true,
        heatmapsReady: parseBool('heatmaps') === true,
        gameSaveDurableReady: parseBool('durableSave') === true,
        gameSaveCloudReady: parseBool('save') === true,
        discoveryFeedReady: parseBool('discovery') === true,
        reviewsStoreReady: parseBool('reviews') === true,
      })
    : await probeLiveOpsF2Honesty()

  log.info('liveops_honesty_api', {
    playtimeTelemetryReady: report.playtimeTelemetryReady,
    discoveryFeedReady: report.discoveryFeedReady,
    reviewsStoreReady: report.reviewsStoreReady,
    gameSaveDurableReady: report.gameSaveDurableReady,
    gameSaveCloudReady: report.gameSaveCloudReady,
  })

  return NextResponse.json({
    mock: false,
    wave: 'F.2',
    report,
  })
}
