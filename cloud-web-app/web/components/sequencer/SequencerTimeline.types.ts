export type TrackType = 'camera' | 'transform' | 'light' | 'audio' | 'event' | 'material' | 'visibility'

export interface TimelineKeyframe {
  id: string
  time: number
  value: number | number[] | string | boolean
  easing: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bezier' | 'hold'
  bezierHandles?: { in: { x: number; y: number }; out: { x: number; y: number } }
  selected?: boolean
}

export interface TimelineTrack {
  id: string
  name: string
  type: TrackType
  targetId: string
  property: string
  keyframes: TimelineKeyframe[]
  locked?: boolean
  visible?: boolean
  muted?: boolean
  color?: string
  collapsed?: boolean
}

export interface TimelineGroup {
  id: string
  name: string
  tracks: TimelineTrack[]
  collapsed?: boolean
  locked?: boolean
}

export interface SequenceData {
  id: string
  name: string
  duration: number
  frameRate: number
  groups: TimelineGroup[]
}

export interface SequencerTimelineProps {
  sequence: SequenceData
  currentTime: number
  isPlaying: boolean
  onTimeChange: (time: number) => void
  onPlay: () => void
  onPause: () => void
  onStop: () => void
  onKeyframeAdd: (trackId: string, time: number, value: unknown) => void
  onKeyframeUpdate: (trackId: string, keyframeId: string, updates: Partial<TimelineKeyframe>) => void
  onKeyframeDelete: (trackId: string, keyframeId: string) => void
  onTrackAdd: (groupId: string, track: Omit<TimelineTrack, 'id' | 'keyframes'>) => void
  onTrackDelete: (trackId: string) => void
  onSequenceUpdate: (updates: Partial<SequenceData>) => void
}
