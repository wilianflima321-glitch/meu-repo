import { tokenColor } from '@/lib/design-system/DesignTokenSync'
/**
 * Video Encoder REAL - WebCodecs encoding runtime.
 *
 * Production path for H.264, VP8 and VP9 where browser support is present.
 */

import type { ClipEffect, EncodedFrame, RenderJob, TimelineClip, VideoCodec, VideoEncoderConfig } from './video-encoder-real-contracts';
import { VideoEncoderReal } from './video-encoder-codecs';
import { MP4Muxer, WebMMuxer } from './video-encoder-muxers';

export type { AudioCodec, AudioEncoderConfig, ClipEffect, EncodedAudio, EncodedFrame, RenderJob, TimelineClip, VideoCodec, VideoEncoderConfig } from './video-encoder-real-contracts';

export { AudioEncoderReal, VideoEncoderReal } from './video-encoder-codecs';
export { MP4Muxer, WebMMuxer } from './video-encoder-muxers';

// ============================================================================
// VIDEO RENDERER - Render Timeline to Video
// ============================================================================

export class VideoRenderer {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private width: number;
  private height: number;
  private fps: number;

  constructor(width: number, height: number, fps: number = 30) {
    this.width = width;
    this.height = height;
    this.fps = fps;
    this.canvas = new OffscreenCanvas(width, height);
    this.ctx = this.canvas.getContext('2d')!;
  }

  async renderTimeline(
    clips: TimelineClip[],
    duration: number,
    onProgress?: (progress: number) => void
  ): Promise<EncodedFrame[]> {
    const encoder = new VideoEncoderReal({
      codec: 'vp09.00.10.08',
      width: this.width,
      height: this.height,
      bitrate: 5000000,
      framerate: this.fps,
    });

    const initialized = await encoder.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize video encoder');
    }

    const totalFrames = Math.ceil(duration * this.fps);

    // Pre-load video sources
    const videoSources = new Map<string, HTMLVideoElement>();
    for (const clip of clips) {
      if (typeof clip.source === 'string' && !videoSources.has(clip.source)) {
        const video = document.createElement('video');
        video.src = clip.source;
        video.muted = true;
        await new Promise<void>((resolve) => {
          video.onloadeddata = () => resolve();
          video.load();
        });
        videoSources.set(clip.source, video);
      }
    }

    // Render each frame
    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const time = frameIndex / this.fps;

      // Clear canvas
      this.ctx.fillStyle = tokenColor('--aethel-brand-pure-black');
      this.ctx.fillRect(0, 0, this.width, this.height);

      // Get clips at this time
      const activeClips = clips.filter(clip =>
        time >= clip.startTime && time < clip.startTime + clip.duration
      ).sort((a, b) => a.track - b.track);

      // Render each clip
      for (const clip of activeClips) {
        await this.renderClipFrame(clip, time, videoSources);
      }

      // Encode frame
      await encoder.encodeCanvas(this.canvas, time);

      if (onProgress) {
        onProgress((frameIndex + 1) / totalFrames);
      }
    }

    const frames = await encoder.flush();
    encoder.close();

    return frames;
  }

  private async renderClipFrame(
    clip: TimelineClip,
    globalTime: number,
    videoSources: Map<string, HTMLVideoElement>
  ): Promise<void> {
    const localTime = globalTime - clip.startTime + clip.inPoint;

    this.ctx.save();

    // Apply effects
    if (clip.effects) {
      const filters: string[] = [];
      for (const effect of clip.effects) {
        const value = this.getEffectValue(effect, globalTime - clip.startTime);
        switch (effect.type) {
          case 'brightness':
            filters.push(`brightness(${value})`);
            break;
          case 'contrast':
            filters.push(`contrast(${value})`);
            break;
          case 'saturation':
            filters.push(`saturate(${value})`);
            break;
          case 'blur':
            filters.push(`blur(${value}px)`);
            break;
          case 'grayscale':
            filters.push(`grayscale(${value})`);
            break;
          case 'opacity':
            this.ctx.globalAlpha = value;
            break;
        }
      }
      if (filters.length > 0) {
        this.ctx.filter = filters.join(' ');
      }
    }

    // Draw source
    if (typeof clip.source === 'string') {
      const video = videoSources.get(clip.source);
      if (video) {
        video.currentTime = localTime;
        await new Promise(resolve => setTimeout(resolve, 10)); // Wait for seek
        this.ctx.drawImage(video, 0, 0, this.width, this.height);
      }
    } else if (clip.source instanceof HTMLVideoElement) {
      clip.source.currentTime = localTime;
      this.ctx.drawImage(clip.source, 0, 0, this.width, this.height);
    } else if (clip.source instanceof HTMLCanvasElement) {
      this.ctx.drawImage(clip.source, 0, 0, this.width, this.height);
    }

    this.ctx.restore();
  }

  private getEffectValue(effect: ClipEffect, localTime: number): number {
    if (!effect.keyframes || effect.keyframes.length === 0) {
      return effect.value;
    }

    // Find surrounding keyframes
    const keyframes = effect.keyframes.sort((a, b) => a.time - b.time);

    if (localTime <= keyframes[0].time) {
      return keyframes[0].value;
    }

    if (localTime >= keyframes[keyframes.length - 1].time) {
      return keyframes[keyframes.length - 1].value;
    }

    // Interpolate between keyframes
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (localTime >= keyframes[i].time && localTime < keyframes[i + 1].time) {
        const t = (localTime - keyframes[i].time) / (keyframes[i + 1].time - keyframes[i].time);
        return keyframes[i].value + (keyframes[i + 1].value - keyframes[i].value) * t;
      }
    }

    return effect.value;
  }
}

// ============================================================================
// EXPORT PIPELINE
// ============================================================================

export class VideoExportPipeline {
  private jobs: Map<string, RenderJob> = new Map();

  async exportVideo(
    clips: TimelineClip[],
    duration: number,
    options: {
      width?: number;
      height?: number;
      fps?: number;
      codec?: VideoCodec;
      bitrate?: number;
    } = {}
  ): Promise<string> {
    const jobId = `job_${Date.now()}`;

    const job: RenderJob = {
      id: jobId,
      status: 'pending',
      progress: 0,
      totalFrames: Math.ceil(duration * (options.fps || 30)),
      currentFrame: 0,
    };

    this.jobs.set(jobId, job);

    // Start rendering in background
    this.runExportJob(job, clips, duration, options);

    return jobId;
  }

  private async runExportJob(
    job: RenderJob,
    clips: TimelineClip[],
    duration: number,
    options: {
      width?: number;
      height?: number;
      fps?: number;
      codec?: VideoCodec;
      bitrate?: number;
    }
  ): Promise<void> {
    try {
      job.status = 'rendering';

      const width = options.width || 1920;
      const height = options.height || 1080;
      const fps = options.fps || 30;

      const renderer = new VideoRenderer(width, height, fps);

      const frames = await renderer.renderTimeline(clips, duration, (progress) => {
        job.progress = progress * 0.8; // 80% for rendering
        job.currentFrame = Math.floor(progress * job.totalFrames);
      });

      job.status = 'muxing';

      const muxer = new MP4Muxer({
        codec: options.codec || 'vp09.00.10.08',
        width,
        height,
        bitrate: options.bitrate || 5000000,
        framerate: fps,
      });

      muxer.addVideoFrames(frames);

      const blob = await muxer.mux();

      job.progress = 1;
      job.status = 'complete';
      job.outputBlob = blob;

    } catch (error) {
      job.status = 'error';
      job.error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  getJob(jobId: string): RenderJob | undefined {
    return this.jobs.get(jobId);
  }

  async downloadJob(jobId: string, filename: string = 'video.webm'): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== 'complete' || !job.outputBlob) {
      throw new Error('Job not ready for download');
    }

    const url = URL.createObjectURL(job.outputBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = 'Cancelled by user';
    }
  }
}

// ============================================================================
// SCREEN RECORDER
// ============================================================================

export class ScreenRecorder {
  private muxer: WebMMuxer;
  private stream: MediaStream | null = null;

  constructor() {
    this.muxer = new WebMMuxer();
  }

  async startRecording(options?: {
    video?: boolean | MediaTrackConstraints;
    audio?: boolean | MediaTrackConstraints;
  }): Promise<void> {
    const displayMediaOptions: DisplayMediaStreamOptions = {
      video: options?.video ?? {
        displaySurface: 'monitor',
        frameRate: 30,
        width: 1920,
        height: 1080,
      },
      audio: options?.audio ?? true,
    };

    this.stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
    await this.muxer.startRecording(this.stream);
  }

  async stopRecording(): Promise<Blob> {
    const blob = await this.muxer.stopRecording();

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    return blob;
  }

  pause(): void {
    this.muxer.pause();
  }

  resume(): void {
    this.muxer.resume();
  }
}

export { createAudioEncoder, createExportPipeline, createScreenRecorder, createVideoEncoder, createVideoRenderer } from './video-encoder-factories';
