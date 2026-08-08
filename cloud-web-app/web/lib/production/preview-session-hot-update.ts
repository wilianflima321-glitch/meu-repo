/**
 * L.8 — multi-file preview hot-update after governed apply.
 * Local: hmr when client Vite/Next bridge connected.
 * E2B: same + server-side remote HMR surface detection (never invent remote HMR).
 */

import { readFile } from 'node:fs/promises'
import {
  getForgeSandboxExecContext,
  getForgeSandboxSession,
  verifyFilesInForgeSandbox,
  writeFilesToForgeSandbox,
} from './forge-sandbox-executor'
import { confinePathToProjectRoot } from './forge-sandbox-path-guard'
import {
  canClaimE2BRemoteHmr,
  detectE2BRemoteHmr,
  describeE2BRemoteHmrHonesty,
  type E2BRemoteHmrDetectResult,
  type E2BRemoteHmrHonesty,
  type E2BRemoteHmrReason,
} from './e2b-remote-hmr'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('preview-session-hot-update')

export type PreviewHotUpdateStrategy = 'local-dev-server' | 'e2b'
export type PreviewHotUpdateMode = 'hmr' | 'reload' | 'denied'

export interface PreviewHotUpdateResult {
  ok: boolean
  sandboxSessionId?: string
  sandboxId?: string
  strategy?: PreviewHotUpdateStrategy
  filesSynced: number
  /** True only when relying on a confirmed HMR path — never invented. */
  hmr: boolean
  /** True when the preview iframe must full-reload to show applied files. */
  reload: boolean
  /** Live session reused — no reprovision. */
  reusedSession: boolean
  mode: PreviewHotUpdateMode
  message?: string
  provider?: string
  remoteHmrConfirmed?: boolean
  remoteHmrReason?: E2BRemoteHmrReason
  remoteHmrHonesty?: E2BRemoteHmrHonesty
}

export interface PreviewHotUpdateInput {
  sandboxSessionId: string
  /** Explicit contents to write into the live sandbox (preferred for e2b). */
  files?: Array<{ path: string; content: string }>
  /** Paths already written by governed apply — verified (local) or re-read+pushed (e2b). */
  paths?: string[]
  /** Client reports HMR websocket connected — server never invents this. */
  clientHmrConnected?: boolean
  /** When true AND clientHmrConnected (+ remote for e2b), claim hmr. */
  preferHmr?: boolean
}

/**
 * Sync applied files into the live preview session and signal honest refresh mode.
 * Fail-closed when no live session exists (does not auto-reprovision).
 */
export async function syncAndRefreshPreviewSession(
  input: PreviewHotUpdateInput,
): Promise<PreviewHotUpdateResult> {
  const sessionId = input.sandboxSessionId?.trim()
  if (!sessionId) {
    return {
      ok: false,
      filesSynced: 0,
      hmr: false,
      reload: false,
      reusedSession: false,
      mode: 'denied',
      message: 'sandboxSessionId is required for preview hot-update (fail-closed; no session).',
    }
  }

  const session = getForgeSandboxSession(sessionId)
  if (!session || session.teardownAt) {
    return {
      ok: false,
      sandboxSessionId: sessionId,
      sandboxId: sessionId,
      filesSynced: 0,
      hmr: false,
      reload: false,
      reusedSession: false,
      mode: 'denied',
      message: `No live preview session ${sessionId} — provision first; refusing silent full reprovision.`,
    }
  }

  const strategy: PreviewHotUpdateStrategy =
    session.provider === 'e2b' ? 'e2b' : 'local-dev-server'
  const files = Array.isArray(input.files) ? input.files : []
  const paths = Array.isArray(input.paths)
    ? input.paths.map((p) => p.trim()).filter(Boolean)
    : []

  let filesSynced = 0

  if (files.length > 0) {
    const write = await writeFilesToForgeSandbox({ sessionId, files })
    if (!write.ok) {
      return {
        ok: false,
        sandboxSessionId: sessionId,
        sandboxId: sessionId,
        strategy,
        filesSynced: write.filesWritten,
        hmr: false,
        reload: false,
        reusedSession: true,
        mode: 'denied',
        provider: session.provider,
        message: write.message,
      }
    }
    filesSynced = write.filesWritten
  } else if (paths.length > 0) {
    if (session.provider === 'e2b') {
      const ctx = getForgeSandboxExecContext(sessionId)
      if (!ctx) {
        return {
          ok: false,
          sandboxSessionId: sessionId,
          sandboxId: sessionId,
          strategy,
          filesSynced: 0,
          hmr: false,
          reload: false,
          reusedSession: false,
          mode: 'denied',
          provider: session.provider,
          message: `Session ${sessionId} lost exec context during hot-update.`,
        }
      }
      const payload: Array<{ path: string; content: string }> = []
      for (const rel of paths) {
        const guard = confinePathToProjectRoot(ctx.projectRootPath, rel)
        if (!guard.ok) {
          return {
            ok: false,
            sandboxSessionId: sessionId,
            sandboxId: sessionId,
            strategy,
            filesSynced: 0,
            hmr: false,
            reload: false,
            reusedSession: true,
            mode: 'denied',
            provider: session.provider,
            message: guard.message,
          }
        }
        try {
          payload.push({ path: rel, content: await readFile(guard.resolved, 'utf8') })
        } catch {
          return {
            ok: false,
            sandboxSessionId: sessionId,
            sandboxId: sessionId,
            strategy,
            filesSynced: 0,
            hmr: false,
            reload: false,
            reusedSession: true,
            mode: 'denied',
            provider: session.provider,
            message: `Cannot read applied path for E2B sync: ${rel}`,
          }
        }
      }
      const write = await writeFilesToForgeSandbox({ sessionId, files: payload })
      if (!write.ok) {
        return {
          ok: false,
          sandboxSessionId: sessionId,
          sandboxId: sessionId,
          strategy,
          filesSynced: write.filesWritten,
          hmr: false,
          reload: false,
          reusedSession: true,
          mode: 'denied',
          provider: session.provider,
          message: write.message,
        }
      }
      filesSynced = write.filesWritten
    } else {
      const verify = await verifyFilesInForgeSandbox({ sessionId, paths })
      if (!verify.ok) {
        return {
          ok: false,
          sandboxSessionId: sessionId,
          sandboxId: sessionId,
          strategy,
          filesSynced: verify.filesWritten,
          hmr: false,
          reload: false,
          reusedSession: true,
          mode: 'denied',
          provider: session.provider,
          message: verify.message,
        }
      }
      filesSynced = verify.filesWritten
    }
  } else {
    return {
      ok: false,
      sandboxSessionId: sessionId,
      sandboxId: sessionId,
      strategy,
      filesSynced: 0,
      hmr: false,
      reload: false,
      reusedSession: true,
      mode: 'denied',
      provider: session.provider,
      message: 'Hot-update requires files[] or paths[] after governed apply.',
    }
  }

  const preferHmr = input.preferHmr !== false
  let remote: E2BRemoteHmrDetectResult | undefined
  let canClaimHmr = Boolean(preferHmr && input.clientHmrConnected)

  if (session.provider === 'e2b') {
    remote = await detectE2BRemoteHmr({ sessionId })
    canClaimHmr = canClaimE2BRemoteHmr({
      preferHmr,
      clientHmrConnected: Boolean(input.clientHmrConnected),
      remote,
    })
  }

  const remoteHonesty = remote ? describeE2BRemoteHmrHonesty(remote) : undefined
  const result: PreviewHotUpdateResult = canClaimHmr
    ? {
        ok: true,
        sandboxSessionId: sessionId,
        sandboxId: sessionId,
        strategy,
        filesSynced,
        hmr: true,
        reload: false,
        reusedSession: true,
        mode: 'hmr',
        provider: session.provider,
        remoteHmrConfirmed: remote?.remoteHmrConfirmed,
        remoteHmrReason: remote?.reason,
        remoteHmrHonesty: remoteHonesty,
        message:
          session.provider === 'e2b'
            ? `Synced ${filesSynced} file(s) into live e2b session; remote ${remote?.engine ?? 'vite'} HMR confirmed + client bridge — no full iframe reload.`
            : `Synced ${filesSynced} file(s) into live ${strategy} session; Vite/Next HMR bridge connected — module invalidate/reload (no full iframe reload).`,
      }
    : {
        ok: true,
        sandboxSessionId: sessionId,
        sandboxId: sessionId,
        strategy,
        filesSynced,
        hmr: false,
        reload: true,
        reusedSession: true,
        mode: 'reload',
        provider: session.provider,
        remoteHmrConfirmed: remote?.remoteHmrConfirmed ?? false,
        remoteHmrReason: remote?.reason,
        remoteHmrHonesty: remoteHonesty,
        message:
          session.provider === 'e2b'
            ? `Synced ${filesSynced} file(s) into live e2b session; full preview reload required (${remote?.reason ?? 'hmr_surface_unreachable'} — remote HMR not claimed).`
            : `Synced ${filesSynced} file(s) into live ${strategy} session; full preview reload required (HMR not confirmed).`,
      }

  log.info('preview_orchestrator_hot_update', {
    sandboxSessionId: sessionId,
    filesSynced,
    hmr: result.hmr,
    reload: result.reload,
    mode: result.mode,
    strategy,
    remoteHmrReason: result.remoteHmrReason,
  })
  return result
}
