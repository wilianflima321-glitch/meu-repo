import advancedAI from '@/lib/ai/advanced-ai-provider'
import { createComponentLogger } from '@/lib/observability/logger'
import { createLegacyHeuristicDirectorSession, detectDirectorProjectType } from './heuristic'
import type { DirectorNote, DirectorProject, DirectorSession, DirectorSessionPayload } from './types'

const log = createComponentLogger('server.ai-director.service')

const CACHE_TTL_MS = 5 * 60 * 1000
const DEFAULT_DIRECTOR_MODEL = process.env.AETHEL_DIRECTOR_MODEL || 'gpt-4o-mini'
const ENABLE_DEV_HEURISTIC = process.env.NODE_ENV !== 'production' && process.env.AETHEL_DIRECTOR_ENABLE_LEGACY_HEURISTIC === 'true'

const analysisCache = new Map<string, { payload: DirectorSessionPayload; timestamp: number }>()

type LlmDirectorResponse = {
  projectType?: string
  notes?: Array<Partial<DirectorNote>>
  overallScore?: number
  strengths?: string[]
  improvements?: string[]
}

export function clearDirectorAnalysisCache(projectId: string): void {
  analysisCache.delete(projectId)
}

export async function getDirectorSessionPayload(params: {
  projectId: string
  project: DirectorProject
  forceRefresh?: boolean
}): Promise<DirectorSessionPayload> {
  const { projectId, project, forceRefresh = false } = params
  const cached = analysisCache.get(projectId)
  if (!forceRefresh && cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.payload, cacheStatus: 'hit' }
  }

  const payload = await analyzeProjectWithDirector({ projectId, project })
  analysisCache.set(projectId, { payload, timestamp: Date.now() })
  return payload
}

async function analyzeProjectWithDirector(params: {
  projectId: string
  project: DirectorProject
}): Promise<DirectorSessionPayload> {
  const { projectId, project } = params
  try {
    const response = await advancedAI.complete(buildDirectorMessages(project), {
      model: DEFAULT_DIRECTOR_MODEL,
      responseFormat: { type: 'json_object' },
      temperature: 0.2,
      maxTokens: 1400,
    })
    const parsed = parseDirectorJson(response.content)
    const session = normalizeLlmDirectorResponse({ projectId, project, parsed })
    return {
      ...session,
      capabilityStatus: 'ACTIVE',
      analysisMode: 'real_llm',
      provider: response.provider,
      model: response.model,
      latencyMs: response.latencyMs,
      costEstimateUsd: estimateDirectorCost(response.usage.promptTokens, response.usage.completionTokens),
      cacheStatus: 'miss',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.warn('AI Director provider unavailable; returning honest partial capability.', { message })
    if (ENABLE_DEV_HEURISTIC) {
      const session = createLegacyHeuristicDirectorSession(projectId, project)
      return {
        ...session,
        capabilityStatus: 'PARTIAL',
        analysisMode: 'legacy_heuristic_dev_only',
        provider: null,
        costEstimateUsd: 0,
        cacheStatus: 'bypass',
        warning: 'AI Director is using an explicit development-only heuristic because no real provider completed the request.',
      }
    }
    return createProviderUnavailablePayload({ projectId, project, reason: message })
  }
}

function buildDirectorMessages(project: DirectorProject) {
  const projectType = detectDirectorProjectType(project)
  const settings = safeStringify(project.settings, 2400)
  return [
    {
      role: 'system' as const,
      content: [
        'You are Aethel AI Director, a senior creative director for playable game and film prototypes.',
        'Return only valid JSON. Do not claim production-ready AAA quality.',
        'Be specific, evidence-oriented, and honest about limitations.',
        'Allowed severities: suggestion, recommendation, critical.',
        'Allowed reference types: scene, asset, blueprint, timeline.',
      ].join(' '),
    },
    {
      role: 'user' as const,
      content: JSON.stringify({
        task: 'Analyze this Aethel project and return director notes.',
        outputSchema: {
          projectType: 'game | film | archviz | general',
          overallScore: '0-100 integer',
          strengths: ['short strength'],
          improvements: ['short improvement'],
          notes: [{
            category: 'gameplay | lighting | composition | color | ux | performance | continuity | audio | narrative',
            severity: 'suggestion | recommendation | critical',
            title: 'short title',
            description: 'specific observation',
            suggestion: 'optional recommended action',
            autoFixAvailable: false,
            reference: { type: 'scene | asset | blueprint | timeline', id: 'optional', name: 'optional' },
          }],
        },
        project: {
          name: project.name,
          template: project.template,
          description: project.description,
          inferredProjectType: projectType,
          settings,
        },
      }),
    },
  ]
}

function normalizeLlmDirectorResponse(params: {
  projectId: string
  project: DirectorProject
  parsed: LlmDirectorResponse
}): DirectorSession {
  const { projectId, project, parsed } = params
  const now = Date.now()
  const fallbackProjectType = detectDirectorProjectType(project)
  const projectType = normalizeProjectType(parsed.projectType, fallbackProjectType)
  const notes = Array.isArray(parsed.notes)
    ? parsed.notes.slice(0, 8).map((note, index) => normalizeNote(note, now, index))
    : []
  const overallScore = clampScore(parsed.overallScore, notes.length ? 82 : 70)

  return {
    id: `dir_${projectId}_${now}`,
    projectType,
    notes,
    overallScore,
    strengths: normalizeTextList(parsed.strengths, ['Clear creative direction is ready for review']),
    improvements: normalizeTextList(parsed.improvements, notes.length ? notes.map((note) => note.title).slice(0, 3) : ['Configure richer project evidence for deeper analysis']),
    lastAnalysis: now,
    isAnalyzing: false,
  }
}

function normalizeNote(note: Partial<DirectorNote>, now: number, index: number): DirectorNote {
  const reference = note.reference && typeof note.reference === 'object'
    ? {
        type: normalizeReferenceType(note.reference.type),
        id: typeof note.reference.id === 'string' && note.reference.id ? note.reference.id : `ref_${index + 1}`,
        name: typeof note.reference.name === 'string' && note.reference.name ? note.reference.name : 'Project evidence',
      }
    : undefined

  return {
    id: typeof note.id === 'string' && note.id ? note.id : `note_${now}_${index + 1}`,
    category: typeof note.category === 'string' && note.category ? note.category.slice(0, 48) : 'direction',
    severity: normalizeSeverity(note.severity),
    title: typeof note.title === 'string' && note.title ? note.title.slice(0, 140) : 'Review creative direction',
    description: typeof note.description === 'string' && note.description ? note.description.slice(0, 800) : 'The AI Director returned a note without enough detail.',
    suggestion: typeof note.suggestion === 'string' && note.suggestion ? note.suggestion.slice(0, 800) : undefined,
    autoFixAvailable: note.autoFixAvailable === true,
    reference,
    createdAt: now,
    status: 'new',
  }
}

function createProviderUnavailablePayload(params: {
  projectId: string
  project: DirectorProject
  reason: string
}): DirectorSessionPayload {
  const now = Date.now()
  return {
    id: `dir_${params.projectId}_${now}`,
    projectType: detectDirectorProjectType(params.project),
    notes: [],
    overallScore: 0,
    strengths: [],
    improvements: ['Configure a real AI provider to enable Director analysis.'],
    lastAnalysis: now,
    isAnalyzing: false,
    capabilityStatus: 'PARTIAL',
    analysisMode: 'provider_unavailable',
    provider: null,
    costEstimateUsd: 0,
    cacheStatus: 'bypass',
    warning: `AI Director did not run a model: ${params.reason}`,
  }
}

function parseDirectorJson(content: string): LlmDirectorResponse {
  try {
    return JSON.parse(content) as LlmDirectorResponse
  } catch {
    const match = content.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('AI Director returned non-JSON content')
    return JSON.parse(match[0]) as LlmDirectorResponse
  }
}

function normalizeProjectType(value: unknown, fallback: DirectorSession['projectType']): DirectorSession['projectType'] {
  return value === 'game' || value === 'film' || value === 'archviz' || value === 'general' ? value : fallback
}

function normalizeSeverity(value: unknown): DirectorNote['severity'] {
  return value === 'critical' || value === 'recommendation' || value === 'suggestion' ? value : 'suggestion'
}

function normalizeReferenceType(value: unknown): NonNullable<DirectorNote['reference']>['type'] {
  return value === 'scene' || value === 'asset' || value === 'blueprint' || value === 'timeline' ? value : 'scene'
}

function normalizeTextList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback
  const normalized = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
  return normalized.length ? normalized : fallback
}

function clampScore(value: unknown, fallback: number): number {
  const score = Number(value)
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : fallback
}

function estimateDirectorCost(promptTokens: number, completionTokens: number): number {
  const conservativeUsd = promptTokens * 0.0000003 + completionTokens * 0.0000012
  return Number(conservativeUsd.toFixed(6))
}

function safeStringify(value: unknown, maxLength: number): string {
  try {
    const serialized = JSON.stringify(value ?? {})
    return serialized.length > maxLength ? `${serialized.slice(0, maxLength)}...` : serialized
  } catch {
    return '{}'
  }
}
