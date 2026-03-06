export const RESEARCH_HANDOFF_STORAGE_KEY = 'aethel.research.handoff.v1'

export type ResearchSource = {
  title: string
  url: string
  snippet: string
  credibility?: number
}

export type ResearchHandoffPayload = {
  query: string
  summary: string
  sources: ResearchSource[]
  generatedAt: string
}

export function buildResearchPrompt(payload: ResearchHandoffPayload): string {
  const header = [
    `Research query: ${payload.query}`,
    `Summary: ${payload.summary}`,
    'Sources:',
  ]

  const sourceLines = payload.sources.slice(0, 6).map((source, index) => {
    const credibility =
      typeof source.credibility === 'number'
        ? ` credibility=${Math.round(source.credibility * 100)}%`
        : ''
    return `${index + 1}. ${source.title}${credibility}\n   ${source.url}\n   ${source.snippet}`
  })

  return [...header, ...sourceLines, 'Task: use this context to propose concrete implementation steps.'].join('\n')
}

export function saveResearchHandoff(payload: ResearchHandoffPayload): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(RESEARCH_HANDOFF_STORAGE_KEY, JSON.stringify(payload))
    return true
  } catch {
    return false
  }
}

export function consumeResearchHandoff(): ResearchHandoffPayload | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(RESEARCH_HANDOFF_STORAGE_KEY)
    if (!raw) return null
    window.localStorage.removeItem(RESEARCH_HANDOFF_STORAGE_KEY)
    const parsed = JSON.parse(raw) as ResearchHandoffPayload
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.query !== 'string' || typeof parsed.summary !== 'string') return null
    if (!Array.isArray(parsed.sources)) return null
    return {
      query: parsed.query,
      summary: parsed.summary,
      sources: parsed.sources
        .filter((source) => source && typeof source.title === 'string' && typeof source.url === 'string')
        .map((source) => ({
          title: source.title,
          url: source.url,
          snippet: typeof source.snippet === 'string' ? source.snippet : '',
          credibility:
            typeof source.credibility === 'number' && Number.isFinite(source.credibility)
              ? source.credibility
              : undefined,
        })),
      generatedAt: typeof parsed.generatedAt === 'string' ? parsed.generatedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}
