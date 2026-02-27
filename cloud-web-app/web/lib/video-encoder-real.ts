/**
 * Video Encoder REAL - composition layer.
 * Preserves public API while delegating to focused modules.
 */

import { AudioEncoderReal, VideoEncoderReal } from './video-encoder-real.encoders';
import { MP4Muxer, WebMMuxer } from './video-encoder-real.muxers';
import { VideoExportPipeline } from './video-encoder-real.pipeline';
import { VideoRenderer } from './video-encoder-real.renderer';
import { ScreenRecorder } from './video-encoder-real.screen-recorder';
import type { AudioEncoderConfig, VideoEncoderConfig } from './video-encoder-real.types';

export type {
  AudioCodec,
  AudioEncoderConfig,
  ClipEffect,
  EncodedAudio,
  EncodedFrame,
  RenderJob,
  TimelineClip,
  VideoCodec,
  VideoEncoderConfig,
} from './video-encoder-real.types';

export { AudioEncoderReal, VideoEncoderReal } from './video-encoder-real.encoders';
export { MP4Muxer, WebMMuxer } from './video-encoder-real.muxers';
export { VideoRenderer } from './video-encoder-real.renderer';
export { VideoExportPipeline } from './video-encoder-real.pipeline';
export { ScreenRecorder } from './video-encoder-real.screen-recorder';

export function createVideoEncoder(config: VideoEncoderConfig): VideoEncoderReal {
  return new VideoEncoderReal(config);
}

export function createAudioEncoder(config: AudioEncoderConfig): AudioEncoderReal {
  return new AudioEncoderReal(config);
}

export function createVideoRenderer(width: number, height: number, fps?: number): VideoRenderer {
  return new VideoRenderer(width, height, fps);
}

export function createExportPipeline(): VideoExportPipeline {
  return new VideoExportPipeline();
}

export function createScreenRecorder(): ScreenRecorder {
  return new ScreenRecorder();
}
