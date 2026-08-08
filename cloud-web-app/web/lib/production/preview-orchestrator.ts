import { setTimeout as delay } from 'node:timers/promises'
import {
  resolveForgeSandboxAvailability,
  createForgeSandboxSession,
  execInForgeSandbox,
  getForgeSandboxSession,
  resolveForgeSandboxE2BPreviewUrl,
  bindForgeSandboxPreviewSurface,
  teardownForgeSandboxSession,
  type ForgeSandboxSession,
} from './forge-sandbox-executor'
import type { DevContainerManifest } from './devcontainer-manifest'
import type { CostGuardLedgerAdapter } from './creative-cost-guard'
import { probeRuntimeUrl } from '@/lib/server/preview-runtime'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  detectE2BRemoteHmr,
  describeE2BRemoteHmrHonesty,
  type E2BRemoteHmrHonesty,
  type E2BRemoteHmrReason,
} from './e2b-remote-hmr'

export type { PreviewHotUpdateInput, PreviewHotUpdateMode, PreviewHotUpdateResult } from './preview-session-hot-update'
export { syncAndRefreshPreviewSession } from './preview-session-hot-update'

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
  /** E2B only — true when remote Vite/Next HMR surface was probed and confirmed. */
  remoteHmrReady?: boolean
  remoteHmrReason?: E2BRemoteHmrReason
  remoteHmrHonesty?: E2BRemoteHmrHonesty
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
 * - E2B remote HMR: probed after ready; missing key/host → concrete reason, never HMR theater.
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
        const reason: E2BRemoteHmrReason =
          e2bStatus.reason === 'e2b_api_key_missing'
            ? 'e2b_api_key_missing'
            : 'preview_host_unresolved'
        return {
          ok: false,
          strategy: 'e2b',
          message: `E2B preview unavailable: ${e2bStatus.message}`,
          remoteHmrReady: false,
          remoteHmrReason: reason,
          remoteHmrHonesty: describeE2BRemoteHmrHonesty({
            remoteHmrConfirmed: false,
            reason,
            message: e2bStatus.message,
          }),
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
        remoteHmrReady: false,
        remoteHmrReason: 'preview_host_unresolved',
        remoteHmrHonesty: describeE2BRemoteHmrHonesty({
          remoteHmrConfirmed: false,
          reason: 'preview_host_unresolved',
          message: 'E2B sandbox has no resolvable preview host (getHost).',
        }),
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
      ...(provider === 'e2b'
        ? {
            remoteHmrReady: false,
            remoteHmrReason: 'hmr_surface_unreachable' as const,
            remoteHmrHonesty: describeE2BRemoteHmrHonesty({
              remoteHmrConfirmed: false,
              reason: 'hmr_surface_unreachable',
              message: `Preview host unreachable: ${url}`,
            }),
          }
        : {}),
    }
  }

  bindForgeSandboxPreviewSurface(session.sessionId, { port, url })

  let remoteHmrReady: boolean | undefined
  let remoteHmrReason: E2BRemoteHmrReason | undefined
  let remoteHmrHonesty: E2BRemoteHmrHonesty | undefined
  let message: string | undefined

  if (provider === 'e2b') {
    const remote = await detectE2BRemoteHmr({ sessionId: session.sessionId, port })
    remoteHmrReady = remote.remoteHmrConfirmed
    remoteHmrReason = remote.reason
    remoteHmrHonesty = describeE2BRemoteHmrHonesty(remote)
    message = remote.remoteHmrConfirmed
      ? `E2B preview ready with remote ${remote.engine} HMR at ${url}.`
      : `E2B preview ready at ${url}; remote HMR not confirmed (${remote.reason}) — reload path until surface is reachable.`
  }

  log.info('preview_orchestrator_ready', {
    strategy: provider === 'e2b' ? 'e2b' : 'local-dev-server',
    url,
    sandboxSessionId: session.sessionId,
    latencyMs: readiness.latencyMs,
    remoteHmrReady,
    remoteHmrReason,
  })

  return {
    ok: true,
    strategy: provider === 'e2b' ? 'e2b' : 'local-dev-server',
    url,
    sandboxSessionId: session.sessionId,
    sandboxId: session.sessionId,
    ready: true,
    latencyMs: readiness.latencyMs,
    remoteHmrReady,
    remoteHmrReason,
    remoteHmrHonesty,
    message,
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
