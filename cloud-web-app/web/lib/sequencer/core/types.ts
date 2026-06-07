export type SequencerTrackKind = 'video' | 'audio' | 'animation' | 'scene' | 'fx' | 'subtitle' | 'marker'
export type SequencerBlendMode = 'replace' | 'additive' | 'multiply' | 'screen'
export type SequencerCurveInterpolation = 'linear' | 'step' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'cubic-bezier'

export type SequencerTimeRange = {
  startMs: number
  endMs: number
}

export type SequencerKeyframe = {
  id: string
  timeMs: number
  value: number
  interpolation: SequencerCurveInterpolation
  leftTangent?: [number, number]
  rightTangent?: [number, number]
}

export type SequencerCurve = {
  id: string
  property: string
  keyframes: SequencerKeyframe[]
}

export type SequencerClip = SequencerTimeRange & {
  id: string
  trackId: string
  label: string
  sourceRef: string
  speed: number
  opacity: number
  blendMode: SequencerBlendMode
  metadata?: Record<string, string | number | boolean>
  curves?: SequencerCurve[]
}

export type SequencerTrack = {
  id: string
  kind: SequencerTrackKind
  label: string
  muted: boolean
  locked: boolean
  heightPx: number
  clips: SequencerClip[]
}

export type SequencerTimeline = {
  schema: 'aethel.timeline.v1'
  id: string
  label: string
  durationMs: number
  frameRate: 24 | 25 | 30 | 48 | 60 | 120
  range: SequencerTimeRange
  loop: boolean
  tracks: SequencerTrack[]
  markers: Array<{ id: string; timeMs: number; label: string }>
  evidenceRefs: string[]
}

export type SequencerValidationIssue = {
  severity: 'error' | 'warning'
  path: string
  message: string
}

export type SequencerPlayhead = {
  timeMs: number
  isPlaying: boolean
  playbackRate: number
  loop: boolean
}

export type SequencerSelection = {
  trackIds: string[]
  clipIds: string[]
  keyframeIds: string[]
  range?: SequencerTimeRange
}

export function clampTime(value: number, durationMs: number): number {
  return Math.min(Math.max(0, Math.round(value)), Math.max(0, Math.round(durationMs)))
}
