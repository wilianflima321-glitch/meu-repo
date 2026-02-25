/**
 * Capture system shared contracts.
 */

export type ImageFormat = 'png' | 'jpeg' | 'webp';
export type VideoFormat = 'webm' | 'mp4';
export type CaptureSource = 'canvas' | 'screen' | 'window' | 'element';
export type CaptureState = 'idle' | 'recording' | 'paused' | 'processing';

export interface ScreenshotOptions {
  format?: ImageFormat;
  quality?: number; // 0-1 for jpeg/webp
  width?: number;
  height?: number;
  watermark?: WatermarkConfig;
  includeUI?: boolean;
  filename?: string;
  timestamp?: boolean;
  effects?: ScreenshotEffect[];
}

export interface VideoRecordingOptions {
  format?: VideoFormat;
  frameRate?: number;
  bitrate?: number;
  width?: number;
  height?: number;
  audio?: boolean;
  microphone?: boolean;
  watermark?: WatermarkConfig;
  maxDuration?: number; // seconds
  filename?: string;
}

export interface GifOptions {
  frameRate?: number;
  width?: number;
  height?: number;
  quality?: number; // 1-30 (1 = best)
  maxDuration?: number; // seconds
  workers?: number;
  filename?: string;
}

export interface ReplayBufferOptions {
  duration: number; // seconds to keep
  frameRate?: number;
  width?: number;
  height?: number;
}

export interface WatermarkConfig {
  image?: string;
  text?: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity?: number;
  margin?: number;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
}

export interface ScreenshotEffect {
  type: 'brightness' | 'contrast' | 'saturation' | 'blur' | 'grayscale' | 'sepia' | 'vignette' | 'grain';
  value: number;
}

export interface CapturedMedia {
  id: string;
  type: 'screenshot' | 'video' | 'gif';
  blob: Blob;
  url: string;
  width: number;
  height: number;
  size: number;
  timestamp: number;
  filename: string;
  format: string;
  duration?: number;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface PhotoModeSettings {
  enabled: boolean;
  fov: number;
  dof: { enabled: boolean; focus: number; aperture: number };
  exposure: number;
  contrast: number;
  saturation: number;
  vignette: number;
  grain: number;
  filterPreset: string | null;
  cameraPosition: { x: number; y: number; z: number };
  cameraRotation: { x: number; y: number; z: number };
  hideUI: boolean;
  freezeTime: boolean;
}

export interface CaptureConfig {
  defaultImageFormat: ImageFormat;
  defaultImageQuality: number;
  defaultVideoFormat: VideoFormat;
  defaultVideoFrameRate: number;
  defaultVideoBitrate: number;
  autoSave: boolean;
  saveDirectory: string;
  filenamePattern: string;
  captureSound: boolean;
  flashEffect: boolean;
  notifyOnCapture: boolean;
  maxGallerySize: number;
  replayBufferEnabled: boolean;
  replayBufferDuration: number;
}
