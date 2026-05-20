export type AiProvider = 'openai' | 'openrouter' | 'anthropic' | 'google'
export type ProviderWithGroq = AiProvider | 'groq'

export function getMissingProviderForModel(
  model: string,
  availableProviders: ReadonlyArray<ProviderWithGroq>
): ProviderWithGroq | null {
  const expectedProvider = inferProviderFromModel(model)
  if (!expectedProvider) return null
  if (availableProviders.includes(expectedProvider)) return null
  return expectedProvider
}

export function clampAgentCount(value: unknown): 1 | 2 | 3 {
  const n = typeof value === 'number' ? Math.floor(value) : Number(value)
  if (n === 2) return 2
  if (n === 3) return 3
  return 1
}

export function clampText(text: string, maxChars: number): string {
  const s = String(text || '')
  if (s.length <= maxChars) return s
  return s.slice(0, Math.max(0, maxChars - 3)) + '...'
}

export function inferProviderFromModel(model: string): AiProvider | undefined {
  const m = (model || '').trim().toLowerCase()
  if (m.startsWith('openai/')) return 'openrouter'
  if (m.startsWith('google/')) return 'openrouter'
  if (m.startsWith('anthropic/')) return 'openrouter'
  if (m.startsWith('gpt-')) return 'openai'
  if (m.startsWith('claude-')) return 'anthropic'
  if (m.startsWith('gemini-')) return 'google'
  return undefined
}

export function normalizeModelName(model: string): string {
  const raw = String(model || '').trim()
  if (!raw) return raw
  const idx = raw.indexOf(':')
  if (idx > 0 && idx < raw.length - 1) {
    const prefix = raw.slice(0, idx).toLowerCase()
    if (prefix === 'openai' || prefix === 'openrouter' || prefix === 'anthropic' || prefix === 'google' || prefix === 'groq') {
      return raw.slice(idx + 1)
    }
  }
  return raw
}

export function summarizeCritic(raw: string): { verdict?: string; bullets?: string[]; raw: string } {
  const text = String(raw || '').trim()
  const verdictMatch = text.match(/VEREDITO\s*:\s*(PASS|WARN|FAIL)/i)
  const verdict = verdictMatch?.[1]
  const bullets = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('-'))
    .map((line) => line.replace(/^[-\s]+/, ''))
    .filter(Boolean)
  return { verdict, bullets: bullets.length ? bullets : undefined, raw: text }
}
