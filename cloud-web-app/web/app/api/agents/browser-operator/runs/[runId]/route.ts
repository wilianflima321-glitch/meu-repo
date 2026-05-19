import { NextRequest, NextResponse } from 'next/server'

import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors'
import { requireAuth } from '@/lib/auth-server'
import {
  applyBrowserOperatorAction,
  getBrowserOperatorRun,
  recordBrowserOperatorStep,
  type BrowserOperatorAction,
} from '@/lib/server/browser-operator-recorder'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const actions = new Set<BrowserOperatorAction>(['pause', 'resume', 'approve', 'cancel', 'complete'])

export async function GET(request: NextRequest, { params }: { params: { runId: string } }) {
  try {
    requireAuth(request)
    const run = getBrowserOperatorRun(params.runId)
    if (!run) {
      return NextResponse.json({ error: 'BROWSER_OPERATOR_RUN_NOT_FOUND' }, { status: 404 })
    }
    return NextResponse.json({ run })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to load browser operator replay')
  }
}

export async function POST(request: NextRequest, { params }: { params: { runId: string } }) {
  try {
    const auth = requireAuth(request)
    const url = new URL(request.url)
    const action = url.searchParams.get('action') as BrowserOperatorAction | null

    if (action) {
      if (!actions.has(action)) {
        return NextResponse.json({ error: 'INVALID_BROWSER_OPERATOR_ACTION' }, { status: 400 })
      }
      const run = applyBrowserOperatorAction(params.runId, action)
      if (!run) return NextResponse.json({ error: 'BROWSER_OPERATOR_RUN_NOT_FOUND' }, { status: 404 })
      return NextResponse.json({ run })
    }

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 })
    }

    const targetUrl = typeof body.targetUrl === 'string' ? body.targetUrl : ''
    const tool = typeof body.tool === 'string' ? body.tool : 'browser:navigate'
    const intent = typeof body.intent === 'string' ? body.intent : tool
    const mission = typeof body.mission === 'string' ? body.mission : 'Browser operator replay capture'

    if (!targetUrl) {
      return NextResponse.json({ error: 'TARGET_URL_REQUIRED' }, { status: 400 })
    }

    const run = recordBrowserOperatorStep({
      runId: params.runId,
      projectId: typeof body.projectId === 'string' ? body.projectId : undefined,
      actorId: auth.userId,
      mission,
      tool,
      targetUrl,
      intent,
      params: body.params,
      pageText: typeof body.pageText === 'string' ? body.pageText : null,
      screenshotUrl: typeof body.screenshotUrl === 'string' ? body.screenshotUrl : undefined,
      domSnapshot: typeof body.domSnapshot === 'string' ? body.domSnapshot : undefined,
      allowedDomains: Array.isArray(body.allowedDomains) ? body.allowedDomains.filter((item: unknown): item is string => typeof item === 'string') : undefined,
      deniedDomains: Array.isArray(body.deniedDomains) ? body.deniedDomains.filter((item: unknown): item is string => typeof item === 'string') : undefined,
      hasHumanApproval: body.hasHumanApproval === true,
      approvalToken: typeof body.approvalToken === 'string' ? body.approvalToken : null,
      amountUsd: typeof body.amountUsd === 'number' ? body.amountUsd : null,
    })

    return NextResponse.json({ run })
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return apiInternalError('Failed to update browser operator replay')
  }
}
