/**
 * Single client for governed AI change apply — all accept paths must use this
 * (never raw /api/files/fs bypass for AI patches).
 */

import type { ChangeApplyResponse } from '@/components/editor/MonacoEditorPro.types'
import { getAuthHeaders, submitChangeFeedback } from '@/lib/ai/change-feedback-client'
import {
  formatApplyPreflightBanner,
  mapApplyPreflightDeny,
  type ApplyPreflightUserCopy,
} from '@/lib/ai/apply-preflight-user-copy'

export type GovernedApplyInput = {
  filePath: string
  original: string
  modified: string
  language?: string
  approvedHighRisk?: boolean
  runSource?: 'production' | 'rehearsal'
}

export type GovernedApplyResult =
  | {
      ok: true
      message: string
      runId?: string
      rollbackToken?: string
      metadata: Record<string, unknown> | null
    }
  | {
      ok: false
      copy: ApplyPreflightUserCopy
      banner: string
      error: string
      runId?: string
      /** Deny metadata (fileValidation / compilerLog) for Ops receipts — not wallpaper. */
      metadata?: Record<string, unknown> | null
    }

function languageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript'
    case 'js':
    case 'jsx':
      return 'javascript'
    case 'json':
      return 'json'
    case 'css':
      return 'css'
    case 'md':
      return 'markdown'
    case 'rs':
      return 'rust'
    default:
      return 'plaintext'
  }
}

export async function runGovernedChangeApply(
  input: GovernedApplyInput
): Promise<GovernedApplyResult> {
  const normalizedPath = input.filePath.trim()
  if (!normalizedPath) {
    const copy = mapApplyPreflightDeny({
      error: 'APPLY_REJECTED',
      message: 'Apply requires a file path bound to the editor.',
    })
    return { ok: false, copy, banner: formatApplyPreflightBanner(copy), error: copy.code }
  }

  const response = await fetch('/api/ai/change/apply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      filePath: normalizedPath,
      original: input.original,
      modified: input.modified,
      fullDocument: input.modified,
      language: input.language || languageFromPath(normalizedPath),
      enforceOriginalMatch: true,
      approvedHighRisk: Boolean(input.approvedHighRisk),
    }),
  })

  const payload = (await response.json().catch(() => ({}))) as ChangeApplyResponse & {
    blockedReason?: string
  }
  const metadata =
    payload && typeof payload === 'object' && payload.metadata && typeof payload.metadata === 'object'
      ? (payload.metadata as Record<string, unknown>)
      : null
  const runId = typeof metadata?.runId === 'string' ? metadata.runId : undefined

  if (!response.ok) {
    const copy = mapApplyPreflightDeny({
      error: payload.error,
      message: payload.message,
      blockedReason: payload.blockedReason,
      metadata,
      status: response.status,
    })
    if (runId) {
      void submitChangeFeedback({
        runId,
        feedback: 'needs_work',
        reason: copy.code,
        notes: copy.detail,
        filePath: normalizedPath,
        runSource: input.runSource || 'production',
      })
    }
    return {
      ok: false,
      copy,
      banner: formatApplyPreflightBanner(copy),
      error: copy.code,
      runId,
      metadata,
    }
  }

  if (runId) {
    void submitChangeFeedback({
      runId,
      feedback: 'accepted',
      reason: 'APPLY_CONFIRMED',
      notes: 'Governed change apply confirmed.',
      filePath: normalizedPath,
      runSource: input.runSource || 'production',
    })
  }

  return {
    ok: true,
    message: payload.message || 'Apply succeeded.',
    runId,
    rollbackToken: typeof metadata?.rollbackToken === 'string' ? metadata.rollbackToken : undefined,
    metadata,
  }
}
