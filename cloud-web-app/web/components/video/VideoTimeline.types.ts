export interface VideoClip {
  id: string
  name: string
  src: string
  startTime: number
  duration: number
  inPoint: number
  outPoint: number
  trackIndex: number
  type: 'video' | 'audio' | 'image'
  peaks?: number[]
  color?: string
  locked?: boolean
  disabled?: boolean
}

export interface TimelineMarker {
  id: string
  time: number
  name: string
  color: string
  type: 'marker' | 'chapter' | 'comment'
}

export interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio'
  muted: boolean
  locked: boolean
  height: number
  solo?: boolean
  color?: string
}

export type TimelineTool = 'select' | 'razor' | 'slip' | 'slide' | 'ripple' | 'roll'

export interface TimelineProps {
  tracks: TimelineTrack[]
  clips: VideoClip[]
  duration: number
  currentTime: number
  zoom: number
  onTimeChange: (time: number) => void
  onClipMove?: (clipId: string, startTime: number, trackIndex: number) => void
  onClipTrim?: (clipId: string, inPoint: number, outPoint: number) => void
  onClipSelect?: (clipId: string | null) => void
  onClipSplit?: (clipId: string, splitTime: number) => void
  onClipDelete?: (clipId: string) => void
  onRippleDelete?: (clipId: string) => void
  selectedClipId?: string | null
  selectedClipIds?: string[]
  markers?: TimelineMarker[]
  onMarkerAdd?: (marker: TimelineMarker) => void
  onMarkerRemove?: (markerId: string) => void
  snapEnabled?: boolean
  snapThreshold?: number
  tool?: TimelineTool
  onToolChange?: (tool: TimelineTool) => void
}
