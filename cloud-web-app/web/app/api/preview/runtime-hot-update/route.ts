import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { apiErrorToResponse } from '@/lib/api-errors'
import { capabilityResponse } from '@/lib/server/capability-response'
import {
  syncAndRefreshPreviewSession,
  type PreviewHotUpdateResult,
} from '@/lib/production/preview-orchestrator'

const CAPABILITY = 'IDE_PREVIEW_RUNTIME_HOT_UPDATE'

export const dynamic = 'force-dynamic'

type HotUpdateBody = {
  sandboxSessionId?: unknown
  sandboxId?: unknown
  files?: unknown
  paths?: unknown
  clientHmrConnected?: unknown
  preferHmr?: unknown
  projectId?: unknown
}

function parseSessionId(body: HotUpdateBody | null): string {
  const raw = body?.sandboxSessionId ?? body?.sandboxId
  if (typeof raw !== 'string') return ''
  return raw.trim()
}

function parsePaths(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((value): value is string => typeof value === 'string')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 200)
}

function parseFiles(raw: unknown): Array<{ path: string; content: string }> {
  if (!Array.isArray(raw)) return []
  const out: Array<{ path: string; content: string }> = []
  for (const entry of raw.slice(0, 200)) {
    if (!entry || typeof entry !== 'object') continue
    const path = typeof (entry as { path?: unknown }).path === 'string'
      ? (entry as { path: string }).path.trim()
      : ''
    const content =
      typeof (entry as { content?: unknown }).content === 'string'
        ? (entry as { content: string }).content
        : null
    if (!path || content === null) continue
    out.push({ path, content })
  }
  return out
}

export async function POST(request: NextRequest) {
  try {
    requireAuth(request)
    const body = (await request.json().catch(() => null)) as HotUpdateBody | null
    const sandboxSessionId = parseSessionId(body)
    if (!sandboxSessionId) {
      return capabilityResponse({
        error: 'RUNTIME_HOT_UPDATE_MISSING_SESSION',
        status: 400,
        message: 'sandboxSessionId is required for preview hot-update (fail-closed).',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          hmr: false,
          reload: false,
          mode: 'denied',
          reusedSession: false,
          filesSynced: 0,
        },
      })
    }

    const result: PreviewHotUpdateResult = await syncAndRefreshPreviewSession({
      sandboxSessionId,
      files: parseFiles(body?.files),
      paths: parsePaths(body?.paths),
      clientHmrConnected: Boolean(body?.clientHmrConnected),
      preferHmr: Boolean(body?.preferHmr),
    })

    if (!result.ok) {
      return capabilityResponse({
        error: 'RUNTIME_HOT_UPDATE_DENIED',
        status: 409,
        message: result.message || 'Preview hot-update denied.',
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        metadata: {
          sandboxSessionId: result.sandboxSessionId,
          sandboxId: result.sandboxId,
          hmr: result.hmr,
          reload: result.reload,
          mode: result.mode,
          reusedSession: result.reusedSession,
          filesSynced: result.filesSynced,
          strategy: result.strategy,
          provider: result.provider,
        },
      })
    }

    return NextResponse.json(
      {
        success: true,
        capability: CAPABILITY,
        capabilityStatus: 'PARTIAL',
        ok: true,
        hmr: result.hmr,
        reload: result.reload,
        mode: result.mode,
        reusedSession: result.reusedSession,
        filesSynced: result.filesSynced,
        message: result.message,
        sandboxSessionId: result.sandboxSessionId,
        sandboxId: result.sandboxId,
        strategy: result.strategy,
        provider: result.provider,
        metadata: {
          sandboxSessionId: result.sandboxSessionId,
          sandboxId: result.sandboxId,
          hmr: result.hmr,
          reload: result.reload,
          mode: result.mode,
          reusedSession: result.reusedSession,
          filesSynced: result.filesSynced,
          strategy: result.strategy,
          provider: result.provider,
        },
      },
      {
        headers: {
          'x-aethel-capability': CAPABILITY,
          'x-aethel-capability-status': 'PARTIAL',
          'x-aethel-preview-hmr': result.hmr ? 'true' : 'false',
          'x-aethel-preview-reload': result.reload ? 'true' : 'false',
        },
      },
    )
  } catch (error) {
    const mapped = apiErrorToResponse(error)
    if (mapped) return mapped
    return capabilityResponse({
      error: 'RUNTIME_HOT_UPDATE_FAILED',
      status: 503,
      message: error instanceof Error ? error.message : 'Preview hot-update failed.',
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      metadata: {
        hmr: false,
        reload: false,
        mode: 'denied',
        reusedSession: false,
        filesSynced: 0,
      },
    })
  }
}
