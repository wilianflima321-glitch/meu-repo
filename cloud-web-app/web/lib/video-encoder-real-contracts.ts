// ============================================================================
// TIPOS
// ============================================================================

export type VideoCodec = 'avc1.42001E' | 'vp8' | 'vp09.00.10.08' | 'av01.0.04M.08';
export type AudioCodec = 'opus' | 'aac' | 'mp3';

export interface VideoEncoderConfig {
  codec: VideoCodec;
  width: number;
  height: number;
  bitrate: number;
  framerate: number;
  keyFrameInterval?: number;
  hardwareAcceleration?: 'prefer-hardware' | 'prefer-software' | 'no-preference';
}

export interface AudioEncoderConfig {
  codec: AudioCodec;
  sampleRate: number;
  numberOfChannels: number;
  bitrate: number;
}

export interface EncodedFrame {
  data: Uint8Array;
  timestamp: number;
  duration: number;
  isKeyFrame: boolean;
}

export interface EncodedAudio {
  data: Uint8Array;
  timestamp: number;
  duration: number;
}

export interface RenderJob {
  id: string;
  status: 'pending' | 'rendering' | 'encoding' | 'muxing' | 'complete' | 'error';
  progress: number;
  totalFrames: number;
  currentFrame: number;
  outputBlob?: Blob;
  error?: string;
}

// ============================================================================
// VIDEO ENCODER
// ============================================================================

export interface TimelineClip {
  id: string;
  source: string | HTMLVideoElement | HTMLCanvasElement;
  startTime: number; // Position on timeline (seconds)
  duration: number;
  inPoint: number; // Start point in source
  outPoint: number; // End point in source
  track: number;
  effects?: ClipEffect[];
}

export interface ClipEffect {
  type: 'opacity' | 'brightness' | 'contrast' | 'saturation' | 'blur' | 'grayscale';
  value: number;
  keyframes?: { time: number; value: number }[];
}
