/**
 * I.1 — Deterministic discovery safety deny list (title / description / tags).
 * Static policy only — no network. Used before optional BYOK LLM critic.
 */

/** Phrase / term matches against title + description (case-insensitive). */
export const DISCOVERY_DENY_TERMS: readonly string[] = [
  'child porn',
  'childporn',
  'csam',
  'rape game',
  'nonconsensual',
  'kill yourself',
  'suicide bomb',
  'nazi salute',
  'white power',
  ' ethnostate',
  'doxxing kit',
  'credit card dump',
  'phishing kit',
]

/** Exact tag tokens (lowercase) that fail discovery eligibility. */
export const DISCOVERY_DENY_TAGS: readonly string[] = [
  'csam',
  'real-gore',
  'hate-rally',
  'scam-casino',
  'piracy-keygen',
]

export function normalizeDiscoveryModerationText(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function findDiscoveryDenyTermHits(input: {
  title?: string | null
  description?: string | null
}): string[] {
  const haystack = normalizeDiscoveryModerationText(
    `${input.title ?? ''} ${input.description ?? ''}`,
  )
  if (!haystack) return []
  const hits: string[] = []
  for (const term of DISCOVERY_DENY_TERMS) {
    const needle = term.trim().toLowerCase()
    if (!needle) continue
    if (haystack.includes(needle)) hits.push(term.trim())
  }
  return hits
}

export function findDiscoveryDenyTagHits(tags: string[] | undefined | null): string[] {
  if (!Array.isArray(tags) || tags.length === 0) return []
  const deny = new Set(DISCOVERY_DENY_TAGS.map((t) => t.toLowerCase()))
  const hits: string[] = []
  for (const tag of tags) {
    const normalized = String(tag || '')
      .trim()
      .toLowerCase()
    if (normalized && deny.has(normalized)) hits.push(normalized)
  }
  return hits
}
