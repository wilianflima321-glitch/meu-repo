import { setTimeout as delay } from 'node:timers/promises'
import { readFile } from 'node:fs/promises'
import {
  resolveForgeSandboxAvailability,
  createForgeSandboxSession,
  execInForgeSandbox,
  getForgeSandboxExecContext,
  getForgeSandboxSession,
  resolveForgeSandboxE2BPreviewUrl,
  teardownForgeSandboxSession,
  verifyFilesInForgeSandbox,
  writeFilesToForgeSandbox,
  type ForgeSandboxSession,
} from './forge-sandbox-executor'
import { confinePathToProjectRoot } from './forge-sandbox-path-guard'
import type { DevContainerManifest } from './devcontainer-manifest'
import type { CostGuardLedgerAdapter } from './creative-cost-guard'
import { probeRuntimeUrl } from '@/lib/server/preview-runtime'
import { createComponentLogger } from '@/lib/observability/logger'

export type PreviewStrategy = 'inline' | 'local-dev-server' | 'e2b'

export interface PreviewOrchestrationInput {
  userId: string
  projectId: string
  projectRootPath: string
  manifest?: DevContainerManifest
  preferredStrategy?: PreviewStrategy
  costAdapter: CostGuardLedgerAdapter
  existingSandboxSessionId?: string
  /** Ready-wait budget after starting the dev server. Default 10s. Set 0 to skip (tests only). */
  readyWaitMs?: number
  readyPollMs?: number
}

export interface PreviewOrchestrationResult {
  ok: boolean
  strategy: PreviewStrategy
  url?: string
  sandboxSessionId?: string
  /** Alias for IDE clients that expect metadata.sandboxId */
  sandboxId?: string
  message?: string
  ready?: boolean
  latencyMs?: number
}

const DEFAULT_DEV_PORT = 3000
const DEFAULT_READY_WAIT_MS = 10_000
const DEFAULT_READY_POLL_MS = 1_200

const log = createComponentLogger('preview-orchestrator')

async function waitUntilReachable(
  url: string,
  waitBudgetMs: number,
  pollMs: number,
): Promise<{ reachable: boolean; latencyMs?: number; attempts: number }> {
  if (waitBudgetMs <= 0) {
    const probe = await probeRuntimeUrl(url, 3000)
    return { reachable: probe.reachable, latencyMs: probe.latencyMs, attempts: 1 }
  }

  const startedAt = Date.now()
  let attempts = 0
  let latest = await probeRuntimeUrl(url, 3000)
  attempts += 1
  while (!latest.reachable && Date.now() - startedAt < waitBudgetMs) {
    await delay(pollMs)
    latest = await probeRuntimeUrl(url, 3000)
    attempts += 1
  }
  return { reachable: latest.reachable, latencyMs: latest.latencyMs, attempts }
}

/**
 * L.8 — PreviewOrchestrator
 * Decides the preview strategy (inline iframe vs local dev server vs E2B HMR)
 * and provisions the necessary sandbox resources to serve it.
 *
 * Honesty rules (Zero-MVP):
 * - `inline` never claims a remote runtime URL.
 * - `local-dev-server` / `e2b` only return ok:true with a probe-reachable URL.
 * - E2B URLs come from the live sandbox `getHost` — never fabricated from session ids.
 */
export async function orchestratePreviewSession(
  input: PreviewOrchestrationInput,
): Promise<PreviewOrchestrationResult> {
  const preferred = input.preferredStrategy ?? 'local-dev-server'
  const readyWaitMs = input.readyWaitMs ?? DEFAULT_READY_WAIT_MS
  const readyPollMs = input.readyPollMs ?? DEFAULT_READY_POLL_MS

  if (preferred === 'inline') {
    return {
      ok: true,
      strategy: 'inline',
      message: 'Inline local preview selected — no managed runtime URL.',
      ready: false,
    }
  }

  let session: ForgeSandboxSession
  let provider: 'e2b' | 'local-isolated' | 'firecracker'

  if (input.existingSandboxSessionId) {
    const existing = getForgeSandboxSession(input.existingSandboxSessionId)
    if (!existing || existing.teardownAt) {
      return {
        ok: false,
        strategy: preferred,
        message: `Existing session ${input.existingSandboxSessionId} not found or already torn down.`,
      }
    }
    session = existing
    provider = existing.provider
  } else {
    const e2bStatus = await resolveForgeSandboxAvailability('e2b')

    if (preferred === 'e2b') {
      if (!e2bStatus.available) {
        return {
          ok: false,
          strategy: 'e2b',
          message: `E2B preview unavailable: ${e2bStatus.message}`,
        }
      }
      provider = 'e2b'
    } else {
      provider = 'local-isolated'
    }

    const sessionResult = await createForgeSandboxSession({
      userId: input.userId,
      projectId: input.projectId,
      projectRootPath: input.projectRootPath,
      agentMode: 'Builder',
      costAdapter: input.costAdapter,
      provider,
      estimatedMinutes: 60,
    })

    if (!sessionResult.ok) {
      return {
        ok: false,
        strategy: preferred,
        message: `Failed to provision sandbox for preview: ${sessionResult.message}`,
      }
    }
    session = sessionResult.session
    provider = session.provider
  }

  const port = input.manifest?.forwardPorts?.[0] ?? DEFAULT_DEV_PORT

  const execResult = await execInForgeSandbox({
    sessionId: session.sessionId,
    command: 'npm',
    args: ['run', 'dev'],
    cwd: input.projectRootPath,
    background: true,
    extraEnv: {
      PORT: String(port),
      HOST: '0.0.0.0',
    },
  })

  if (!execResult.ok) {
    await teardownForgeSandboxSession(session.sessionId, 1)
    return {
      ok: false,
      strategy: preferred,
      sandboxSessionId: session.sessionId,
      sandboxId: session.sessionId,
      message: `Failed to start dev server: ${execResult.deniedMessage || execResult.stderr}`,
    }
  }

  let url: string | undefined
  if (provider === 'e2b') {
    url = resolveForgeSandboxE2BPreviewUrl(session.sessionId, port) ?? undefined
    if (!url) {
      await teardownForgeSandboxSession(session.sessionId, 1)
      return {
        ok: false,
        strategy: 'e2b',
        sandboxSessionId: session.sessionId,
        sandboxId: session.sessionId,
        message:
          'E2B sandbox has no resolvable preview host (getHost). Refusing fabricated preview URL.',
      }
    }
  } else {
    url = `http://localhost:${port}`
  }

  const readiness = await waitUntilReachable(url, readyWaitMs, readyPollMs)
  if (!readiness.reachable) {
    await teardownForgeSandboxSession(session.sessionId, 1)
    log.warn('preview_orchestrator_unready', {
      url,
      sandboxSessionId: session.sessionId,
      attempts: readiness.attempts,
    })
    return {
      ok: false,
      strategy: provider === 'e2b' ? 'e2b' : 'local-dev-server',
      sandboxSessionId: session.sessionId,
      sandboxId: session.sessionId,
      url,
      ready: false,
      message: `Preview URL started but never became reachable within ${readyWaitMs}ms: ${url}`,
    }
  }

  log.info('preview_orchestrator_ready', {
    strategy: provider === 'e2b' ? 'e2b' : 'local-dev-server',
    url,
    sandboxSessionId: session.sessionId,
    latencyMs: readiness.latencyMs,
  })

  return {
    ok: true,
    strategy: provider === 'e2b' ? 'e2b' : 'local-dev-server',
    url,
    sandboxSessionId: session.sessionId,
    sandboxId: session.sessionId,
    ready: true,
    latencyMs: readiness.latencyMs,
  }
}

/** Tear down an L.8 preview sandbox session (CostGuard settle + kill background processes). */
export async function teardownPreviewSession(
  sandboxSessionId: string,
  actualMinutes = 1,
): Promise<{ ok: boolean; message?: string }> {
  if (!sandboxSessionId || !sandboxSessionId.trim()) {
    return { ok: false, message: 'sandboxSessionId is required' }
  }
  const existing = getForgeSandboxSession(sandboxSessionId)
  if (!existing) {
    return { ok: false, message: `Session ${sandboxSessionId} not found` }
  }
  if (existing.teardownAt) {
    return { ok: true, message: 'Session already torn down' }
  }
  await teardownForgeSandboxSession(sandboxSessionId, actualMinutes)
  log.info('preview_orchestrator_teardown', { sandboxSessionId })
  return { ok: true }
}

export type PreviewHotUpdateMode = 'hmr' | 'reload' | 'denied'

/**
 * Honesty flags for L.8 multi-file preview refresh.
 * - `hmr: true` only when the client reports a live Vite `/@vite/client` or protocol WS bridge
 *   AND preferHmr is not false — never when only iframe reload ran.
 * - Otherwise sync + full iframe reload (`hmr: false`, `reload: true`).
 * - E2B remote HMR remains separately HELD without a live E2B key / reachable Vite host.
 */
export interface PreviewHotUpdateResult {
  ok: boolean
  sandboxSessionId?: string
  sandboxId?: string
  strategy?: PreviewStrategy
  filesSynced: number
  /** True only when relying on a confirmed client HMR websocket — never invented. */
  hmr: boolean
  /** True when the preview iframe must full-reload to show applied files. */
  reload: boolean
  /** Live session reused — no reprovision. */
  reusedSession: boolean
  mode: PreviewHotUpdateMode
  message?: string
  provider?: string
}

export interface PreviewHotUpdateInput {
  sandboxSessionId: string
  /** Explicit contents to write into the live sandbox (preferred for e2b). */
  files?: Array<{ path: string; content: string }>
  /** Paths already written by governed apply — verified (local) or re-read+pushed (e2b). */
  paths?: string[]
  /** Client reports HMR websocket connected — server never invents this. */
  clientHmrConnected?: boolean
  /** When true AND clientHmrConnected, claim hmr and skip forced reload. Default: reload. */
  preferHmr?: boolean
}

/**
 * L.8 — after governed multi-file apply, sync into the live preview session and
 * signal an honest refresh mode (HMR only when client bridge is confirmed).
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

  const strategy: PreviewStrategy = session.provider === 'e2b' ? 'e2b' : 'local-dev-server'
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
      // Re-read host project files and push into the live E2B handle.
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

  // preferHmr defaults true at the API edge when omitted; explicit false forces reload.
  const preferHmr = input.preferHmr !== false
  const canClaimHmr = Boolean(preferHmr && input.clientHmrConnected)
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
        message:
          `Synced ${filesSynced} file(s) into live ${strategy} session; Vite/Next HMR bridge connected — module invalidate/reload (no full iframe reload).`,
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
        message:
          `Synced ${filesSynced} file(s) into live ${strategy} session; full preview reload required (HMR not confirmed).`,
      }

  log.info('preview_orchestrator_hot_update', {
    sandboxSessionId: sessionId,
    filesSynced,
    hmr: result.hmr,
    reload: result.reload,
    mode: result.mode,
    strategy,
  })
  return result
}
