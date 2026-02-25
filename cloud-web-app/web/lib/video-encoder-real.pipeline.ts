import { MP4Muxer } from './video-encoder-real.muxers';
import { VideoRenderer } from './video-encoder-real.renderer';
import type { RenderJob, TimelineClip, VideoCodec } from './video-encoder-real.types';

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
        job.progress = progress * 0.8;
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
