export interface ProjectMetadata {
  id: string
  name: string
  createdAt: string
  modifiedAt: string
  version: string
  author?: string
  description?: string
  tags?: string[]
  thumbnail?: string       // Base64 or URL
}

export interface ProjectSettings {
  resolution: { width: number; height: number }
  frameRate: number
  sampleRate: number
  bitDepth: number
  colorSpace: 'sRGB' | 'Rec709' | 'DCI-P3' | 'Rec2020'
  workingDirectory?: string
}

export interface MediaAsset {
  id: string
  name: string
  type: 'video' | 'audio' | 'image'
  path: string
  originalPath?: string
  duration?: number
  size?: number
  metadata?: {
    width?: number
    height?: number
    frameRate?: number
    codec?: string
    sampleRate?: number
    channels?: number
  }
  thumbnail?: string
  importedAt: string
  missing?: boolean
}

export interface TimelineMarker {
  id: string
  time: number
  name: string
  color: string
  comment?: string
  type: 'marker' | 'chapter' | 'todo'
}

export interface ClipKeyframes {
  property: string
  keyframes: Array<{
    time: number
    value: number | number[]
    easing: string
  }>
}

export interface TimelineClip {
  id: string
  assetId: string
  trackId: string
  startTime: number
  duration: number
  inPoint: number
  outPoint: number
  speed: number
  reversed: boolean
  opacity: number
  volume: number
  muted: boolean
  locked: boolean
  effects: Array<{
    id: string
    type: string
    params: Record<string, unknown>
    bypass: boolean
  }>
  keyframes: ClipKeyframes[]
  transition?: {
    type: string
    duration: number
    params?: Record<string, unknown>
  }
  color?: string
  label?: string
}

export interface TimelineTrack {
  id: string
  name: string
  type: 'video' | 'audio'
  height: number
  muted: boolean
  solo: boolean
  locked: boolean
  visible: boolean
  volume: number
  pan: number
  color: string
}

export interface Timeline {
  duration: number
  playheadPosition: number
  zoomLevel: number
  scrollPosition: number
  tracks: TimelineTrack[]
  clips: TimelineClip[]
  markers: TimelineMarker[]
}

export interface ProjectData {
  metadata: ProjectMetadata
  settings: ProjectSettings
  assets: MediaAsset[]
  timeline: Timeline
  // Extensible for future features
  bins?: Array<{
    id: string
    name: string
    assetIds: string[]
  }>
  sequences?: Timeline[]
  notes?: string
}
