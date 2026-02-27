/**
 * Shared type contracts for the cutscene runtime system.
 */

export type TrackType = 
  | 'camera'
  | 'character'
  | 'audio'
  | 'subtitle'
  | 'animation'
  | 'event'
  | 'property'
  | 'spawn'
  | 'effect'
  | 'fade';

export type EasingType = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'bounce';

export interface CutsceneDefinition {
  id: string;
  name: string;
  duration: number;
  tracks: Track[];
  skippable: boolean;
  pausable: boolean;
  autoPlay?: boolean;
  onComplete?: string; // Event to fire
  branches?: CutsceneBranch[];
  metadata?: Record<string, unknown>;
}

export interface CutsceneBranch {
  id: string;
  condition: string;
  nextCutsceneId: string;
  triggerTime?: number;
}

export interface Track {
  id: string;
  type: TrackType;
  targetId?: string;
  clips: Clip[];
  enabled: boolean;
}

export interface Clip {
  id: string;
  startTime: number;
  endTime: number;
  data: ClipData;
  easing?: EasingType;
}

export type ClipData = 
  | CameraClipData
  | CharacterClipData
  | AudioClipData
  | SubtitleClipData
  | AnimationClipData
  | EventClipData
  | PropertyClipData
  | SpawnClipData
  | EffectClipData
  | FadeClipData;

export interface CameraClipData {
  type: 'camera';
  startPosition: { x: number; y: number; z: number };
  endPosition: { x: number; y: number; z: number };
  startLookAt: { x: number; y: number; z: number };
  endLookAt: { x: number; y: number; z: number };
  startFov?: number;
  endFov?: number;
}

export interface CharacterClipData {
  type: 'character';
  action: 'move' | 'rotate' | 'look_at' | 'emote' | 'speak';
  startValue?: unknown;
  endValue?: unknown;
  animationId?: string;
}

export interface AudioClipData {
  type: 'audio';
  action: 'play' | 'stop' | 'fade_in' | 'fade_out' | 'crossfade';
  audioId: string;
  volume?: number;
  loop?: boolean;
}

export interface SubtitleClipData {
  type: 'subtitle';
  text: string;
  speaker?: string;
  position?: 'top' | 'middle' | 'bottom';
  style?: 'normal' | 'thought' | 'shout' | 'whisper';
}

export interface AnimationClipData {
  type: 'animation';
  animationId: string;
  loop?: boolean;
  speed?: number;
  blendDuration?: number;
}

export interface EventClipData {
  type: 'event';
  eventId: string;
  eventData?: unknown;
}

export interface PropertyClipData {
  type: 'property';
  property: string;
  startValue: number;
  endValue: number;
}

export interface SpawnClipData {
  type: 'spawn';
  entityId: string;
  prefabId: string;
  position: { x: number; y: number; z: number };
  rotation?: { x: number; y: number; z: number };
}

export interface EffectClipData {
  type: 'effect';
  effectId: string;
  position?: { x: number; y: number; z: number };
  duration?: number;
}

export interface FadeClipData {
  type: 'fade';
  fadeType: 'in' | 'out';
  color?: string;
}
