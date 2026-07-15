export type TrackType = 'video' | 'audio' | 'effect' | 'title' | 'adjustment';
export type ClipType = 'video' | 'audio' | 'image' | 'title' | 'effect' | 'adjustment';

export interface TimelineClip {
  id: string;
  name: string;
  type: ClipType;
  trackId: string;
  startTime: number;       // Start on timeline (seconds)
  duration: number;        // Duration on timeline
  sourceIn: number;        // Source in point
  sourceOut: number;       // Source out point
  sourceDuration: number;  // Original source duration
  sourceUrl: string;
  thumbnail?: string;
  audioLevel: number;      // 0-1
  opacity: number;         // 0-1
  speed: number;           // 1 = normal
  keyframes: ClipKeyframe[];
  effects: ClipEffect[];
  transitions: {
    in?: Transition;
    out?: Transition;
  };
  color: string;           // UI color
  locked: boolean;
  muted: boolean;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  height: number;
  visible: boolean;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  color: string;
  volume: number;         // For audio tracks
  pan: number;            // For audio tracks (-1 to 1)
  clips: string[];        // Clip IDs
}

export interface ClipKeyframe {
  id: string;
  property: string;       // opacity, position.x, scale, etc.
  time: number;           // Relative to clip start
  value: number | number[];
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  bezierHandles?: { x1: number; y1: number; x2: number; y2: number };
}

export interface ClipEffect {
  id: string;
  type: string;           // blur, color_correction, etc.
  name: string;
  enabled: boolean;
  parameters: Record<string, unknown>;
  keyframes: ClipKeyframe[];
}

export interface Transition {
  id: string;
  type: string;           // cross_dissolve, dip_to_black, wipe, etc.
  duration: number;
  parameters: Record<string, unknown>;
}

export interface TimelineMarker {
  id: string;
  time: number;
  name: string;
  color: string;
  type: 'marker' | 'chapter' | 'comment';
}

export interface TimelineRegion {
  id: string;
  startTime: number;
  endTime: number;
  name: string;
  color: string;
}

export interface TimelineProject {
  id: string;
  name: string;
  duration: number;
  frameRate: number;
  resolution: { width: number; height: number };
  tracks: Track[];
  clips: Map<string, TimelineClip>;
  markers: TimelineMarker[];
  regions: TimelineRegion[];
  workAreaIn: number;
  workAreaOut: number;
}

// ============================================================================
// TIMELINE RULER
// ============================================================================
