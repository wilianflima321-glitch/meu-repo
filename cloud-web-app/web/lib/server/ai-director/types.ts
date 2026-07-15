export type DirectorNoteSeverity = 'suggestion' | 'recommendation' | 'critical'
export type DirectorReferenceType = 'scene' | 'asset' | 'blueprint' | 'timeline'
export type DirectorProjectType = 'game' | 'film' | 'archviz' | 'general'
export type DirectorAnalysisMode = 'real_llm' | 'provider_unavailable' | 'legacy_heuristic_dev_only'
export type DirectorCapabilityStatus = 'ACTIVE' | 'PARTIAL'
export type DirectorCacheStatus = 'hit' | 'miss' | 'bypass'

export interface DirectorNote {
  id: string
  category: string
  severity: DirectorNoteSeverity
  title: string
  description: string
  suggestion?: string
  autoFixAvailable: boolean
  reference?: {
    type: DirectorReferenceType
    id: string
    name: string
  }
  createdAt: number
  status: 'new' | 'acknowledged' | 'applied' | 'dismissed'
}

export interface DirectorSession {
  id: string
  projectType: DirectorProjectType
  notes: DirectorNote[]
  overallScore: number
  strengths: string[]
  improvements: string[]
  lastAnalysis: number
  isAnalyzing: boolean
}

export interface DirectorSessionPayload extends DirectorSession {
  capabilityStatus: DirectorCapabilityStatus
  analysisMode: DirectorAnalysisMode
  provider: string | null
  model?: string
  latencyMs?: number
  costEstimateUsd: number
  cacheStatus: DirectorCacheStatus
  warning?: string
}

export interface DirectorProject {
  name: string
  template?: string | null
  description?: string | null
  settings?: unknown
}

export interface DirectorActionPayload {
  action: 'analyze' | 'dismiss' | 'apply' | 'acknowledge'
  noteId?: string
}
