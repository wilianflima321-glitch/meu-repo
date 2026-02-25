import { VideoEncoderReal } from './video-encoder-real.encoders';
import type { ClipEffect, EncodedFrame, TimelineClip } from './video-encoder-real.types';

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

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      const time = frameIndex / this.fps;
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.width, this.height);

      const activeClips = clips
        .filter((clip) => time >= clip.startTime && time < clip.startTime + clip.duration)
        .sort((a, b) => a.track - b.track);

      for (const clip of activeClips) {
        await this.renderClipFrame(clip, time, videoSources);
      }

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

    if (typeof clip.source === 'string') {
      const video = videoSources.get(clip.source);
      if (video) {
        video.currentTime = localTime;
        await new Promise((resolve) => setTimeout(resolve, 10));
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

    const keyframes = effect.keyframes.sort((a, b) => a.time - b.time);

    if (localTime <= keyframes[0].time) return keyframes[0].value;
    if (localTime >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (localTime >= keyframes[i].time && localTime < keyframes[i + 1].time) {
        const t = (localTime - keyframes[i].time) / (keyframes[i + 1].time - keyframes[i].time);
        return keyframes[i].value + (keyframes[i + 1].value - keyframes[i].value) * t;
      }
    }

    return effect.value;
  }
}
