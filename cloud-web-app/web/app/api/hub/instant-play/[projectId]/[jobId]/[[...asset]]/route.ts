/**
 * Instant Play HTML host — serves cooked text/html + JS bytes for Arcade iframes.
 * Never invents a stub page; 404 when cook did not host real assets.
 */

import { NextRequest, NextResponse } from 'next/server'
import { readInstantPlayHostedAsset } from '@/lib/production/instant-play/html-host'
import { INSTANT_PLAY_HTML_PATH } from '@/lib/production/instant-play/html-emitter'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api.hub.instant-play')

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string; jobId: string; asset?: string[] } },
) {
  const projectId = String(params.projectId || '').trim()
  const jobId = String(params.jobId || '').trim()
  if (!projectId || !jobId) {
    return NextResponse.json({ error: 'projectId and jobId required' }, { status: 400 })
  }

  const relativePath =
    params.asset && params.asset.length > 0
      ? params.asset.map((part) => decodeURIComponent(part)).join('/')
      : INSTANT_PLAY_HTML_PATH

  const loaded = await readInstantPlayHostedAsset({
    projectId,
    jobId,
    relativePath,
  })

  if (!loaded.ok) {
    log.warn('instant_play_asset_miss', { projectId, jobId, relativePath, reason: loaded.reason })
    return NextResponse.json(
      {
        error: 'instant_play_asset_not_found',
        reason: loaded.reason,
        hint: 'Cook must complete Instant Play host stage before this URL serves bytes.',
      },
      { status: 404 },
    )
  }

  return new NextResponse(loaded.body, {
    status: 200,
    headers: {
      'Content-Type': loaded.contentType,
      'Cache-Control': 'public, max-age=60',
      'X-Aethel-Instant-Play': '1',
    },
  })
}
