export type EngineSpineDomain = 'render' | 'world' | 'film' | 'systems' | 'network' | 'assets' | 'native'
export type EngineSpineStatus = 'visible' | 'ready-to-wire' | 'adapter-needed' | 'worker-held'
export type EngineSpineLoadStrategy = 'already-visible' | 'dynamic-client-only' | 'summary-adapter' | 'worker-or-sidecar' | 'native-or-cloud'
export type EngineSpineReadinessState = 'ready' | 'needs-review' | 'needs-adapters' | 'worker-held'

export interface EngineSpineModule {
  id: string
  label: string
  domain: EngineSpineDomain
  status: EngineSpineStatus
  modulePath: string
  targetSurface: string
  userValue: string
  nextAction: string
  limitation: string
  loadStrategy: EngineSpineLoadStrategy
  estimatedLoc: number
  risk: 'low' | 'medium' | 'high'
}

export interface EngineSpineDecisionMatrixRow {
  key: string
  label: string
  modules: EngineSpineModule[]
  totalLoc: number
  highRisk: number
}

export interface EngineSpineReadinessModel {
  state: EngineSpineReadinessState
  label: string
  summary: string
  blockers: string[]
  nextAction: string
}
