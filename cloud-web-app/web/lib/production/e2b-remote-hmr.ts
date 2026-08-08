/**
 * L.8 — E2B remote preview HMR detection (server-side honesty).
 *
 * Never claim remote HMR without:
 * 1) E2B_API_KEY present
 * 2) live e2b sandbox with resolvable getHost preview URL
 * 3) reachable Vite `/@vite/client` or Next `/_next/webpack-hmr` surface on that host
 *
 * Missing key / unreachable host → concrete fail-closed reason (not a permanent HELD theater).
 */

import {
  detectViteHmrClient,
  type PreviewHmrEngine,
  type ViteHmrDetectResult,
} from '@/lib/preview/vite-hmr-detect'
import {
  getForgeSandboxSession,
  resolveForgeSandboxE2BPreviewUrl,
  getForgeSandboxPreviewSurface,
} from '@/lib/production/forge-sandbox-executor'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('e2b-remote-hmr')

const DEFAULT_PORT = 3000
const DEFAULT_FETCH_TIMEOUT_MS = 2_500

export type E2BRemoteHmrReason =
  | 'ready'
  | 'e2b_api_key_missing'
  | 'session_missing'
  | 'session_not_e2b'
  | 'session_torn_down'
  | 'preview_host_unresolved'
  | 'hmr_surface_unreachable'

export type E2BRemoteHmrDetectResult = {
  /** True only when a Vite or Next HMR surface is confirmed on the remote host. */
  remoteHmrConfirmed: boolean
  reason: E2BRemoteHmrReason
  previewUrl: string | null
  engine: PreviewHmrEngine
  viteClientPresent: boolean
  nextWebpackHmrPresent: boolean
  port: number
  message: string
  vite?: Pick<ViteHmrDetectResult, 'wsToken' | 'pathCandidates' | 'message'>
}

export type E2BRemoteHmrHonesty = {
  /** Code path is real; status reflects env/host — never a blank permanent HELD. */
  status: 'ready' | 'env_gated' | 'host_unresolved' | 'surface_unreachable' | 'not_applicable'
  reason: E2BRemoteHmrReason
  e2bApiKeyPresent: boolean
  remoteHmrConfirmed: boolean
  message: string
}

function resolvePreviewPort(explicit?: number): number {
  if (typeof explicit === 'number' && Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit)
  }
  const fromEnv = Number(String(process.env.AETHEL_PREVIEW_E2B_PORT || '').trim())
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.floor(fromEnv)
  return DEFAULT_PORT
}

function hasE2BApiKey(): boolean {
  return String(process.env.E2B_API_KEY || '').trim().length > 0
}

function looksLikeNextWebpackHmrResponse(
  status: number,
  body: string,
  contentType: string | null,
): boolean {
  if (status === 404) return false
  // Upgrade / bad-request from the HMR endpoint are positive signals.
  if (status === 426 || status === 400 || status === 101) return true
  const type = (contentType || '').toLowerCase()
  if (type.includes('text/html')) return false
  const sample = body.slice(0, 2_000)
  return /websocket|upgrade|hot.?module|webpack-hmr|hmr/i.test(sample)
}

/**
 * Probe Next `/_next/webpack-hmr` on a remote origin.
 * Fail-closed: network/404/HTML catch-all → false.
 */
export async function detectNextWebpackHmrEndpoint(
  runtimeUrl: string,
  options?: { fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<{ present: boolean; message: string }> {
  let origin: string
  try {
    const url = new URL(runtimeUrl.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { present: false, message: 'Invalid runtime URL for Next HMR probe.' }
    }
    origin = url.origin
  } catch {
    return { present: false, message: 'Invalid runtime URL for Next HMR probe.' }
  }

  const fetchImpl = options?.fetchImpl ?? fetch
  const timeoutMs = options?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer =
    controller && typeof setTimeout === 'function'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null

  try {
    const response = await fetchImpl(`${origin}/_next/webpack-hmr`, {
      method: 'GET',
      signal: controller?.signal,
      headers: { Accept: '*/*' },
      cache: 'no-store',
    })
    const contentType = response.headers?.get?.('content-type') ?? null
    const body = await response.text().catch(() => '')
    const present = looksLikeNextWebpackHmrResponse(response.status, body, contentType)
    return {
      present,
      message: present
        ? 'Next /_next/webpack-hmr endpoint present on remote host.'
        : `Next webpack-hmr not confirmed (HTTP ${response.status}).`,
    }
  } catch (err) {
    return {
      present: false,
      message:
        err instanceof Error
          ? `Next HMR probe failed: ${err.message}`
          : 'Next HMR probe failed (network).',
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Detect whether a live E2B sandbox exposes a reachable Vite/Next HMR surface.
 * Does not invent hosts — uses getHost via resolveForgeSandboxE2BPreviewUrl / bound surface.
 */
export async function detectE2BRemoteHmr(input: {
  sessionId: string
  port?: number
  fetchImpl?: typeof fetch
  timeoutMs?: number
}): Promise<E2BRemoteHmrDetectResult> {
  const sessionId = input.sessionId?.trim()
  const port = resolvePreviewPort(
    input.port ?? getForgeSandboxPreviewSurface(sessionId || '')?.port,
  )

  if (!sessionId) {
    return {
      remoteHmrConfirmed: false,
      reason: 'session_missing',
      previewUrl: null,
      engine: 'unknown',
      viteClientPresent: false,
      nextWebpackHmrPresent: false,
      port,
      message: 'sandboxSessionId required for E2B remote HMR detection.',
    }
  }

  if (!hasE2BApiKey()) {
    return {
      remoteHmrConfirmed: false,
      reason: 'e2b_api_key_missing',
      previewUrl: null,
      engine: 'unknown',
      viteClientPresent: false,
      nextWebpackHmrPresent: false,
      port,
      message:
        'E2B_API_KEY missing — remote HMR unavailable; use reload path (fail-closed, no remote HMR claim).',
    }
  }

  const session = getForgeSandboxSession(sessionId)
  if (!session) {
    return {
      remoteHmrConfirmed: false,
      reason: 'session_missing',
      previewUrl: null,
      engine: 'unknown',
      viteClientPresent: false,
      nextWebpackHmrPresent: false,
      port,
      message: `No live sandbox session ${sessionId} — cannot probe remote HMR.`,
    }
  }
  if (session.teardownAt) {
    return {
      remoteHmrConfirmed: false,
      reason: 'session_torn_down',
      previewUrl: null,
      engine: 'unknown',
      viteClientPresent: false,
      nextWebpackHmrPresent: false,
      port,
      message: `Sandbox session ${sessionId} already torn down — remote HMR unavailable.`,
    }
  }
  if (session.provider !== 'e2b') {
    return {
      remoteHmrConfirmed: false,
      reason: 'session_not_e2b',
      previewUrl: null,
      engine: 'unknown',
      viteClientPresent: false,
      nextWebpackHmrPresent: false,
      port,
      message: `Session provider is ${session.provider} — E2B remote HMR probe not applicable.`,
    }
  }

  const bound = getForgeSandboxPreviewSurface(sessionId)
  const previewUrl =
    bound?.url ??
    resolveForgeSandboxE2BPreviewUrl(sessionId, port) ??
    null

  if (!previewUrl) {
    return {
      remoteHmrConfirmed: false,
      reason: 'preview_host_unresolved',
      previewUrl: null,
      engine: 'unknown',
      viteClientPresent: false,
      nextWebpackHmrPresent: false,
      port,
      message:
        'E2B sandbox has no resolvable preview host (getHost) — refusing fabricated remote HMR URL.',
    }
  }

  const vite = await detectViteHmrClient(previewUrl, {
    fetchImpl: input.fetchImpl,
    timeoutMs: input.timeoutMs,
  })
  const next = vite.viteClientPresent
    ? { present: false, message: 'Skipped Next probe — Vite client already confirmed.' }
    : await detectNextWebpackHmrEndpoint(previewUrl, {
        fetchImpl: input.fetchImpl,
        timeoutMs: input.timeoutMs,
      })

  const viteClientPresent = vite.viteClientPresent
  const nextWebpackHmrPresent = next.present
  const remoteHmrConfirmed = viteClientPresent || nextWebpackHmrPresent
  const engine: PreviewHmrEngine = viteClientPresent
    ? 'vite'
    : nextWebpackHmrPresent
      ? 'webpack-next'
      : 'unknown'

  const result: E2BRemoteHmrDetectResult = {
    remoteHmrConfirmed,
    reason: remoteHmrConfirmed ? 'ready' : 'hmr_surface_unreachable',
    previewUrl,
    engine,
    viteClientPresent,
    nextWebpackHmrPresent,
    port,
    message: remoteHmrConfirmed
      ? `E2B remote HMR confirmed (${engine}) at ${previewUrl}.`
      : `E2B preview host reachable for probe but Vite/Next HMR surface not confirmed — reload path. Vite: ${vite.message}; Next: ${next.message}`,
    vite: {
      wsToken: vite.wsToken,
      pathCandidates: vite.pathCandidates,
      message: vite.message,
    },
  }

  log.info('e2b_remote_hmr_detect', {
    sessionId,
    remoteHmrConfirmed: result.remoteHmrConfirmed,
    reason: result.reason,
    engine: result.engine,
    previewUrl,
  })

  return result
}

/** Map a detection result into an honesty descriptor (no permanent HELD when path is real). */
export function describeE2BRemoteHmrHonesty(
  detection?: Pick<E2BRemoteHmrDetectResult, 'remoteHmrConfirmed' | 'reason' | 'message'> | null,
): E2BRemoteHmrHonesty {
  const e2bApiKeyPresent = hasE2BApiKey()
  if (!detection) {
    return {
      status: e2bApiKeyPresent ? 'host_unresolved' : 'env_gated',
      reason: e2bApiKeyPresent ? 'preview_host_unresolved' : 'e2b_api_key_missing',
      e2bApiKeyPresent,
      remoteHmrConfirmed: false,
      message: e2bApiKeyPresent
        ? 'E2B key present — remote HMR awaits live sandbox + HMR surface probe.'
        : 'E2B_API_KEY missing — remote HMR env-gated (reload path only; not permanently blocked).',
    }
  }

  const statusMap: Record<E2BRemoteHmrReason, E2BRemoteHmrHonesty['status']> = {
    ready: 'ready',
    e2b_api_key_missing: 'env_gated',
    session_missing: 'not_applicable',
    session_not_e2b: 'not_applicable',
    session_torn_down: 'not_applicable',
    preview_host_unresolved: 'host_unresolved',
    hmr_surface_unreachable: 'surface_unreachable',
  }

  return {
    status: statusMap[detection.reason],
    reason: detection.reason,
    e2bApiKeyPresent,
    remoteHmrConfirmed: detection.remoteHmrConfirmed,
    message: detection.message,
  }
}

/**
 * Whether an E2B hot-update may claim hmr:true.
 * Requires client bridge + confirmed remote HMR surface (same honesty bar as local Vite).
 */
export function canClaimE2BRemoteHmr(input: {
  preferHmr: boolean
  clientHmrConnected: boolean
  remote: Pick<E2BRemoteHmrDetectResult, 'remoteHmrConfirmed'>
}): boolean {
  return Boolean(input.preferHmr && input.clientHmrConnected && input.remote.remoteHmrConfirmed)
}
