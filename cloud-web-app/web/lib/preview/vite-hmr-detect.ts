/**
 * L.8 — detect a live Vite (or Next webpack) HMR surface on a preview runtime URL.
 * Honesty: never invent Vite presence; probe real HTTP `/@vite/client` reachability.
 */

export type PreviewHmrEngine = 'vite' | 'webpack-next' | 'unknown'

export type PreviewHmrPathCandidate = {
  path: string
  /** WebSocket subprotocol(s); Vite requires `vite-hmr`. */
  protocols?: string[]
  engine: PreviewHmrEngine
  /** When true, mark bridge connected only after a protocol `connected` payload. */
  requireConnectedPayload?: boolean
}

export type ViteHmrDetectResult = {
  runtimeUrl: string
  /** GET /@vite/client returned a JS-like Vite HMR client body. */
  viteClientPresent: boolean
  /** Optional token extracted from /@vite/client when present (newer Vite). */
  wsToken: string | null
  engine: PreviewHmrEngine
  /** Ordered WS path candidates for the parent HMR bridge. */
  pathCandidates: PreviewHmrPathCandidate[]
  message: string
}

const VITE_CLIENT_PATH = '/@vite/client'
const DEFAULT_FETCH_TIMEOUT_MS = 2_500

function normalizeRuntimeOrigin(runtimeUrl: string): string | null {
  const trimmed = runtimeUrl?.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.origin
  } catch {
    return null
  }
}

function extractViteWsToken(clientSource: string): string | null {
  // Newer Vite injects `__HMR_TOKEN__` / `token=` into the client bundle.
  const patterns = [
    /__HMR_TOKEN__\s*=\s*["']([^"']+)["']/,
    /["']token["']\s*:\s*["']([^"']+)["']/,
    /\?token=([A-Za-z0-9._~-]+)/,
  ]
  for (const pattern of patterns) {
    const match = clientSource.match(pattern)
    if (match?.[1] && match[1].length >= 4) return match[1]
  }
  return null
}

function looksLikeViteClientSource(body: string, contentType: string | null): boolean {
  const sample = body.slice(0, 4_000)
  const type = (contentType || '').toLowerCase()
  if (type.includes('javascript') || type.includes('ecmascript') || type.includes('typescript')) {
    return /vite|import\.meta\.hot|createHotContext|HMR/i.test(sample)
  }
  return (
    (sample.includes('import') || sample.includes('export')) &&
    /@vite\/client|import\.meta\.hot|vite-hmr|createHotContext/i.test(sample)
  )
}

function buildViteWsCandidates(wsToken?: string | null): PreviewHmrPathCandidate[] {
  if (wsToken) {
    const q = `?token=${encodeURIComponent(wsToken)}`
    return [
      {
        path: q,
        protocols: ['vite-hmr'],
        engine: 'vite',
        requireConnectedPayload: true,
      },
      {
        path: `/${q}`,
        protocols: ['vite-hmr'],
        engine: 'vite',
        requireConnectedPayload: true,
      },
    ]
  }
  return [
    {
      path: '',
      protocols: ['vite-hmr'],
      engine: 'vite',
      requireConnectedPayload: true,
    },
    {
      path: '/',
      protocols: ['vite-hmr'],
      engine: 'vite',
      requireConnectedPayload: true,
    },
  ]
}

/** Build honest WS candidates after (optional) Vite client probe. */
export function buildPreviewHmrPathCandidates(input: {
  viteClientPresent: boolean
  wsToken?: string | null
}): PreviewHmrPathCandidate[] {
  const vitePaths = buildViteWsCandidates(input.wsToken)
  const nextPath: PreviewHmrPathCandidate = {
    path: '/_next/webpack-hmr',
    engine: 'webpack-next',
    requireConnectedPayload: false,
  }

  // Prefer Vite candidates when client is present; still keep Next as fallback.
  if (input.viteClientPresent) {
    return [...vitePaths, nextPath]
  }

  // Unknown preview: try Next first (common Aethel cook), then Vite protocol.
  return [nextPath, ...vitePaths]
}

/**
 * Probe the preview origin for a live Vite HMR client (`/@vite/client`).
 * Fail-closed: network/404 → viteClientPresent:false (caller keeps reload path).
 */
export async function detectViteHmrClient(
  runtimeUrl: string,
  options?: { fetchImpl?: typeof fetch; timeoutMs?: number },
): Promise<ViteHmrDetectResult> {
  const origin = normalizeRuntimeOrigin(runtimeUrl)
  if (!origin) {
    return {
      runtimeUrl,
      viteClientPresent: false,
      wsToken: null,
      engine: 'unknown',
      pathCandidates: buildPreviewHmrPathCandidates({ viteClientPresent: false }),
      message: 'Invalid preview runtime URL — cannot probe Vite HMR client.',
    }
  }

  const fetchImpl = options?.fetchImpl ?? fetch
  const timeoutMs = options?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
  const timer =
    controller && typeof setTimeout === 'function'
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null

  try {
    const response = await fetchImpl(`${origin}${VITE_CLIENT_PATH}`, {
      method: 'GET',
      signal: controller?.signal,
      headers: { Accept: 'text/javascript, application/javascript, */*' },
      cache: 'no-store',
    })

    if (!response.ok) {
      return {
        runtimeUrl: origin,
        viteClientPresent: false,
        wsToken: null,
        engine: 'unknown',
        pathCandidates: buildPreviewHmrPathCandidates({ viteClientPresent: false }),
        message: `/@vite/client not reachable (HTTP ${response.status}) — Vite HMR not confirmed.`,
      }
    }

    const contentType = response.headers?.get?.('content-type') ?? null
    const body = await response.text()
    const viteClientPresent = looksLikeViteClientSource(body, contentType)
    const wsToken = viteClientPresent ? extractViteWsToken(body) : null

    return {
      runtimeUrl: origin,
      viteClientPresent,
      wsToken,
      engine: viteClientPresent ? 'vite' : 'unknown',
      pathCandidates: buildPreviewHmrPathCandidates({ viteClientPresent, wsToken }),
      message: viteClientPresent
        ? 'Vite /@vite/client present — preview may apply module HMR without full iframe reload.'
        : 'Runtime responded at /@vite/client but body is not a Vite HMR client — not claiming Vite.',
    }
  } catch (err) {
    return {
      runtimeUrl: origin,
      viteClientPresent: false,
      wsToken: null,
      engine: 'unknown',
      pathCandidates: buildPreviewHmrPathCandidates({ viteClientPresent: false }),
      message:
        err instanceof Error
          ? `Vite HMR probe failed: ${err.message}`
          : 'Vite HMR probe failed (network).',
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/**
 * Honesty helper: parent may claim HMR when Vite client is present (iframe `/@vite/client`
 * + Vite file watcher) OR when a protocol-confirmed WS bridge is open.
 */
export function resolveClientHmrConnected(input: {
  viteClientPresent: boolean
  wsConnected: boolean
}): boolean {
  return Boolean(input.viteClientPresent || input.wsConnected)
}
