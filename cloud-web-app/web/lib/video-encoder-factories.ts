import {
  AudioEncoderReal,
  ScreenRecorder,
  VideoEncoderReal,
  VideoExportPipeline,
  VideoRenderer,
} from './video-encoder-real';
import type { AudioEncoderConfig, VideoEncoderConfig } from './video-encoder-real-contracts';

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
