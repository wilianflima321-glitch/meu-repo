/**
 * AI-v1-f / J.8 — POST governed BrowserOperator research session.
 * CostGuard via CreativeBridge; evidence → ledger; CDP farm remains HELD.
 */

import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import { createMemoryCostGuardLedger } from '@/lib/production/creative-cost-guard'
import {
  BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS,
  BROWSER_OPERATOR_HONESTY,
  DEFAULT_BROWSER_RESEARCH_ALLOWLIST,
  createFixtureBrowserFetcher,
  runBrowserOperatorResearch,
  type BrowserSnapshotPage,
} from '@/lib/production/browser-operator'
import { createComponentLogger } from '@/lib/observability/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const log = createComponentLogger('api/agents/browser-operator/research')

/** In-process ledger for session demos without live wallet wire — fail-closed still applies via planId. */
const demoLedger = createMemoryCostGuardLedger()

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request)
    const body = (await request.json().catch(() => ({}))) as {
      projectId?: string
      query?: string
      targetUrls?: string[]
      allowedDomains?: string[]
      planId?: string
      byokProfileId?: string
      fixtures?: Record<string, BrowserSnapshotPage>
      claimFullCdpFarmLive?: boolean
      claimUnrestrictedHostAutomation?: boolean
    }

    const projectId = body.projectId?.trim()
    const query = body.query?.trim()
    const targetUrls = Array.isArray(body.targetUrls)
      ? body.targetUrls.map((u) => String(u).trim()).filter(Boolean)
      : []

    if (!projectId || !query || targetUrls.length === 0) {
      return NextResponse.json(
        { error: 'projectId, query, and targetUrls[] are required' },
        { status: 400 },
      )
    }

    const fixtures = body.fixtures
    if (!fixtures || Object.keys(fixtures).length === 0) {
      return NextResponse.json(
        {
          error: 'FIXTURES_REQUIRED',
          message:
            'J.8 CORE expects fixture snapshots for governed research. Live Chromium CDP farm remains [HELD].',
          cdpFarmStatus: BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS,
          honesty: BROWSER_OPERATOR_HONESTY,
        },
        { status: 400 },
      )
    }

    demoLedger.grant(user.userId, 100_000)

    const result = await runBrowserOperatorResearch({
      projectId,
      userId: user.userId,
      query,
      targetUrls,
      allowedDomains: body.allowedDomains?.length
        ? body.allowedDomains
        : [...DEFAULT_BROWSER_RESEARCH_ALLOWLIST],
      planId: body.planId ?? 'pro',
      byokProfileId: body.byokProfileId,
      fetcher: createFixtureBrowserFetcher(fixtures),
      adapter: demoLedger,
      claimFullCdpFarmLive: body.claimFullCdpFarmLive,
      claimUnrestrictedHostAutomation: body.claimUnrestrictedHostAutomation,
    })

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          blockedReason: result.blockedReason,
          message: result.message,
          honesty: result.honesty,
          cdpFarmStatus: BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS,
        },
        { status: result.blockedReason === 'cost_guard' ? 402 : 422 },
      )
    }

    return NextResponse.json({
      success: true,
      session: result.session,
      runId: result.run.runId,
      artifactId: result.artifactId,
      evidenceReceiptId: result.evidenceReceiptId,
      honesty: result.honesty,
      cdpFarmStatus: BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS,
      evidenceKinds: result.ledger.events.map((e) => e.kind),
    })
  } catch (error) {
    log.error('browser_operator_research_failed', error instanceof Error ? error : new Error(String(error)))
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to run BrowserOperator research')
  }
}

export async function GET() {
  return NextResponse.json({
    capability: 'browser-operator-research',
    executionLane: 'governed-fetch',
    cdpFarmStatus: BROWSER_OPERATOR_CDP_FARM_SHIP_STATUS,
    honesty: BROWSER_OPERATOR_HONESTY,
    defaultAllowlist: DEFAULT_BROWSER_RESEARCH_ALLOWLIST,
  })
}
