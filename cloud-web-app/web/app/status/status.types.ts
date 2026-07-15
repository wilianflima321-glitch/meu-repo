export type SurfaceState = 'healthy' | 'partial' | 'unhealthy' | 'unknown'

export interface SurfaceCheck {
  id: string
  name: string
  endpoint: string
  required?: boolean
}

export interface SurfaceResult {
  id: string
  name: string
  state: SurfaceState
  detail: string
  latency?: number
}

export interface StatusCoverageCard {
  title: string
  detail: string
}

export interface StatusTimelineEntry {
  id: string
  label: string
  title: string
  detail: string
  tone: SurfaceState
  timestampLabel: string
}
