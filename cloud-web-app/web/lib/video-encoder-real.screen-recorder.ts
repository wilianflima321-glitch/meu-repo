import { WebMMuxer } from './video-encoder-real.muxers';

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
      this.stream.getTracks().forEach((track) => track.stop());
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
