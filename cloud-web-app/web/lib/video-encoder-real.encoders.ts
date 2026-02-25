import type {
  AudioEncoderConfig,
  EncodedAudio,
  EncodedFrame,
  VideoEncoderConfig,
} from './video-encoder-real.types';

export class VideoEncoderReal {
  private encoder: VideoEncoder | null = null;
  private config: VideoEncoderConfig;
  private encodedFrames: EncodedFrame[] = [];
  private frameCount: number = 0;
  private isEncoding: boolean = false;

  constructor(config: VideoEncoderConfig) {
    this.config = config;
  }

  async initialize(): Promise<boolean> {
    if (typeof VideoEncoder === 'undefined') {
      console.error('WebCodecs not supported in this browser');
      return false;
    }

    const support = await VideoEncoder.isConfigSupported({
      codec: this.config.codec,
      width: this.config.width,
      height: this.config.height,
      bitrate: this.config.bitrate,
      framerate: this.config.framerate,
    });

    if (!support.supported) {
      console.error('Codec not supported:', this.config.codec);
      return false;
    }

    this.encoder = new VideoEncoder({
      output: (chunk, metadata) => this.handleEncodedChunk(chunk, metadata),
      error: (error) => this.handleError(error),
    });

    this.encoder.configure({
      codec: this.config.codec,
      width: this.config.width,
      height: this.config.height,
      bitrate: this.config.bitrate,
      framerate: this.config.framerate,
      latencyMode: 'quality',
      hardwareAcceleration: this.config.hardwareAcceleration || 'prefer-hardware',
    });

    this.isEncoding = true;
    return true;
  }

  private handleEncodedChunk(chunk: EncodedVideoChunk, _metadata?: EncodedVideoChunkMetadata): void {
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);

    this.encodedFrames.push({
      data,
      timestamp: chunk.timestamp,
      duration: chunk.duration || 0,
      isKeyFrame: chunk.type === 'key',
    });
  }

  private handleError(error: DOMException): void {
    console.error('Video encoder error:', error);
    this.isEncoding = false;
  }

  async encodeFrame(frame: VideoFrame, forceKeyFrame: boolean = false): Promise<void> {
    if (!this.encoder || !this.isEncoding) {
      throw new Error('Encoder not initialized');
    }

    const keyFrameInterval = this.config.keyFrameInterval || 60;
    const isKeyFrame = forceKeyFrame || this.frameCount % keyFrameInterval === 0;

    this.encoder.encode(frame, { keyFrame: isKeyFrame });
    this.frameCount++;
    frame.close();
  }

  async encodeCanvas(canvas: HTMLCanvasElement | OffscreenCanvas, timestamp: number): Promise<void> {
    const frame = new VideoFrame(canvas, {
      timestamp: timestamp * 1000,
      duration: (1 / this.config.framerate) * 1000000,
    });

    await this.encodeFrame(frame);
  }

  async encodeImageData(imageData: ImageData, timestamp: number): Promise<void> {
    if (typeof createImageBitmap !== 'function') {
      throw new Error('createImageBitmap is not available in this environment');
    }

    const bitmap = await createImageBitmap(imageData);
    try {
      const frame = new VideoFrame(bitmap, {
        timestamp: timestamp * 1000,
        duration: (1 / this.config.framerate) * 1000000,
      });

      await this.encodeFrame(frame);
    } finally {
      bitmap.close();
    }
  }

  async flush(): Promise<EncodedFrame[]> {
    if (!this.encoder) {
      throw new Error('Encoder not initialized');
    }

    await this.encoder.flush();
    return this.encodedFrames;
  }

  getEncodedFrames(): EncodedFrame[] {
    return this.encodedFrames;
  }

  close(): void {
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
    this.isEncoding = false;
  }

  reset(): void {
    this.encodedFrames = [];
    this.frameCount = 0;
    if (this.encoder) {
      this.encoder.reset();
    }
  }
}

export class AudioEncoderReal {
  private encoder: AudioEncoder | null = null;
  private config: AudioEncoderConfig;
  private encodedChunks: EncodedAudio[] = [];
  private isEncoding: boolean = false;

  constructor(config: AudioEncoderConfig) {
    this.config = config;
  }

  async initialize(): Promise<boolean> {
    if (typeof AudioEncoder === 'undefined') {
      console.error('WebCodecs Audio not supported');
      return false;
    }

    const codecString =
      this.config.codec === 'opus' ? 'opus' : this.config.codec === 'aac' ? 'mp4a.40.2' : 'mp3';

    const support = await AudioEncoder.isConfigSupported({
      codec: codecString,
      sampleRate: this.config.sampleRate,
      numberOfChannels: this.config.numberOfChannels,
      bitrate: this.config.bitrate,
    });

    if (!support.supported) {
      console.error('Audio codec not supported:', this.config.codec);
      return false;
    }

    this.encoder = new AudioEncoder({
      output: (chunk) => this.handleEncodedChunk(chunk),
      error: (error) => this.handleError(error),
    });

    this.encoder.configure({
      codec: codecString,
      sampleRate: this.config.sampleRate,
      numberOfChannels: this.config.numberOfChannels,
      bitrate: this.config.bitrate,
    });

    this.isEncoding = true;
    return true;
  }

  private handleEncodedChunk(chunk: EncodedAudioChunk): void {
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);

    this.encodedChunks.push({
      data,
      timestamp: chunk.timestamp,
      duration: chunk.duration || 0,
    });
  }

  private handleError(error: DOMException): void {
    console.error('Audio encoder error:', error);
    this.isEncoding = false;
  }

  async encodeAudioData(audioData: AudioData): Promise<void> {
    if (!this.encoder || !this.isEncoding) {
      throw new Error('Audio encoder not initialized');
    }

    this.encoder.encode(audioData);
    audioData.close();
  }

  async encodeFloat32Array(
    samples: Float32Array,
    timestamp: number,
    sampleRate: number = this.config.sampleRate
  ): Promise<void> {
    const data = new Float32Array(samples) as unknown as Float32Array<ArrayBuffer>;
    const audioData = new AudioData({
      format: 'f32',
      sampleRate,
      numberOfFrames: samples.length / this.config.numberOfChannels,
      numberOfChannels: this.config.numberOfChannels,
      timestamp: timestamp * 1000000,
      data,
    });

    await this.encodeAudioData(audioData);
  }

  async flush(): Promise<EncodedAudio[]> {
    if (!this.encoder) {
      throw new Error('Encoder not initialized');
    }

    await this.encoder.flush();
    return this.encodedChunks;
  }

  getEncodedChunks(): EncodedAudio[] {
    return this.encodedChunks;
  }

  close(): void {
    if (this.encoder) {
      this.encoder.close();
      this.encoder = null;
    }
    this.isEncoding = false;
  }
}
