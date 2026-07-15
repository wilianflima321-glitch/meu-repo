/**
 * Law I / Onda M — COOP/COEP headers for SharedArrayBuffer (crossOriginIsolated).
 *
 * Browser requirements (honest):
 * - Chromium 96+: COOP `same-origin` + COEP `credentialless` (or `require-corp`) →
 *   `crossOriginIsolated === true` and SharedArrayBuffer available.
 * - Firefox / Safari: prefer COEP `require-corp` + CORP on same-origin assets;
 *   third-party scripts without CORP may break under `require-corp`.
 * - Without isolation, sabTransformsReady stays false — fallback copy path only.
 * - No “zero stutter” marketing claim from headers alone.
 */

export const COOP_HEADER_NAME = 'Cross-Origin-Opener-Policy' as const
export const COEP_HEADER_NAME = 'Cross-Origin-Embedder-Policy' as const
export const CORP_HEADER_NAME = 'Cross-Origin-Resource-Policy' as const

/** Opener isolation — required for SAB. */
export const COOP_VALUE = 'same-origin' as const

/**
 * Embedder policy — `credentialless` enables COI in Chromium without forcing
 * CORP on every CDN font/script. Product may tighten to `require-corp` later.
 */
export const COEP_VALUE = 'credentialless' as const

/** Same-origin CORP so require-corp peers can embed our own assets. */
export const CORP_VALUE = 'same-origin' as const

/**
 * Proven in product code once middleware + next.config apply the pairs below.
 * Flip only when both surfaces set COOP/COEP (letter bk).
 */
export const COOP_COEP_HEADERS_CONFIGURED = true as const

const SAB_PATH_PREFIXES = [
  '/ide',
  '/studio',
  '/play',
  '/playtest',
  '/arcade',
  '/preview',
  '/live-preview',
  '/api/runtime',
] as const

export interface CoopCoepHeaderPair {
  key: string
  value: string
}

export function getCoopCoepHeaderPairs(): CoopCoepHeaderPair[] {
  return [
    { key: COOP_HEADER_NAME, value: COOP_VALUE },
    { key: COEP_HEADER_NAME, value: COEP_VALUE },
    { key: CORP_HEADER_NAME, value: CORP_VALUE },
  ]
}

/** Next.js `headers()` config entries. */
export function getCoopCoepNextHeaderEntries(): { key: string; value: string }[] {
  return getCoopCoepHeaderPairs().map((h) => ({ key: h.key, value: h.value }))
}

export function pathNeedsCoopCoep(pathname: string): boolean {
  if (!pathname) return false
  return SAB_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

export interface CoopCoepHeadersHonesty {
  coopCoepHeadersConfigured: typeof COOP_COEP_HEADERS_CONFIGURED
  coop: typeof COOP_VALUE
  coep: typeof COEP_VALUE
  corp: typeof CORP_VALUE
  pathPrefixes: readonly string[]
  notes: string[]
}

export function evaluateCoopCoepHeadersHonesty(): CoopCoepHeadersHonesty {
  return {
    coopCoepHeadersConfigured: COOP_COEP_HEADERS_CONFIGURED,
    coop: COOP_VALUE,
    coep: COEP_VALUE,
    corp: CORP_VALUE,
    pathPrefixes: SAB_PATH_PREFIXES,
    notes: [
      'COOP/COEP applied on play/runtime/studio/ide surfaces via middleware + next.config',
      'COEP credentialless — Chromium COI without breaking non-CORP CDNs; tighten later if needed',
      'Headers alone ≠ zero-stutter; sabTransformsReady still needs crossOriginIsolated + SAB',
    ],
  }
}
