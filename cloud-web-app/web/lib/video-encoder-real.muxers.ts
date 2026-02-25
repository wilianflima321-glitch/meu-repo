import type {
  AudioEncoderConfig,
  EncodedAudio,
  EncodedFrame,
  VideoEncoderConfig,
} from './video-encoder-real.types';

export class MP4Muxer {
  private videoFrames: EncodedFrame[] = [];
  private audioChunks: EncodedAudio[] = [];
  private videoConfig: VideoEncoderConfig;

  constructor(videoConfig: VideoEncoderConfig, _audioConfig?: AudioEncoderConfig) {
    this.videoConfig = videoConfig;
  }

  addVideoFrames(frames: EncodedFrame[]): void {
    this.videoFrames.push(...frames);
  }

  addAudioChunks(chunks: EncodedAudio[]): void {
    this.audioChunks.push(...chunks);
  }

  async mux(): Promise<Blob> {
    this.videoFrames.sort((a, b) => a.timestamp - b.timestamp);
    this.audioChunks.sort((a, b) => a.timestamp - b.timestamp);

    const isH264 = this.videoConfig.codec.startsWith('avc');
    if (isH264) {
      return this.muxMP4();
    }
    return this.muxWebM();
  }

  private async muxMP4(): Promise<Blob> {
    const boxes: ArrayBuffer[] = [];
    boxes.push(this.createFtypBox().buffer as ArrayBuffer);
    boxes.push(this.createMoovBox().buffer as ArrayBuffer);
    boxes.push(this.createMdatBox().buffer as ArrayBuffer);
    return new Blob(boxes, { type: 'video/mp4' });
  }

  private async muxWebM(): Promise<Blob> {
    const chunks: ArrayBuffer[] = [];
    chunks.push(this.createWebMHeader().buffer as ArrayBuffer);
    chunks.push(this.createWebMSegment().buffer as ArrayBuffer);
    return new Blob(chunks, { type: 'video/webm' });
  }

  private createFtypBox(): Uint8Array {
    const brandMajor = 'isom';
    const brandMinor = 0x200;
    const compatibleBrands = ['isom', 'iso2', 'avc1', 'mp41'];

    const size = 8 + 4 + 4 + compatibleBrands.length * 4;
    const buffer = new ArrayBuffer(size);
    const view = new DataView(buffer);
    const encoder = new TextEncoder();

    let offset = 0;
    view.setUint32(offset, size);
    offset += 4;
    new Uint8Array(buffer, offset, 4).set(encoder.encode('ftyp'));
    offset += 4;
    new Uint8Array(buffer, offset, 4).set(encoder.encode(brandMajor));
    offset += 4;
    view.setUint32(offset, brandMinor);
    offset += 4;

    for (const brand of compatibleBrands) {
      new Uint8Array(buffer, offset, 4).set(encoder.encode(brand));
      offset += 4;
    }

    return new Uint8Array(buffer);
  }

  private createMoovBox(): Uint8Array {
    const encoder = new TextEncoder();
    const videoDuration =
      this.videoFrames.length > 0
        ? (this.videoFrames[this.videoFrames.length - 1].timestamp - this.videoFrames[0].timestamp) /
          1000
        : 0;

    const timescale = 90000;
    const durationTicks = Math.ceil(videoDuration * timescale);

    const mvhdSize = 108;
    const mvhd = new ArrayBuffer(mvhdSize);
    const mvhdView = new DataView(mvhd);
    let offset = 0;

    mvhdView.setUint32(offset, mvhdSize);
    offset += 4;
    new Uint8Array(mvhd, offset, 4).set(encoder.encode('mvhd'));
    offset += 4;
    mvhdView.setUint32(offset, 0);
    offset += 4;
    mvhdView.setUint32(offset, 0);
    offset += 4;
    mvhdView.setUint32(offset, 0);
    offset += 4;
    mvhdView.setUint32(offset, timescale);
    offset += 4;
    mvhdView.setUint32(offset, durationTicks);
    offset += 4;
    mvhdView.setUint32(offset, 0x00010000);
    offset += 4;
    mvhdView.setUint16(offset, 0x0100);
    offset += 2;
    offset += 10;
    mvhdView.setUint32(offset, 0x00010000);
    offset += 4;
    offset += 4;
    offset += 4;
    offset += 4;
    mvhdView.setUint32(offset, 0x00010000);
    offset += 4;
    offset += 4;
    offset += 4;
    offset += 4;
    mvhdView.setUint32(offset, 0x40000000);
    offset += 4;
    offset += 24;
    mvhdView.setUint32(offset, 2);

    const trakContent = this.createTrakBox(timescale, durationTicks);
    const moovSize = 8 + mvhdSize + trakContent.length;
    const moov = new ArrayBuffer(8);
    const moovView = new DataView(moov);
    moovView.setUint32(0, moovSize);
    new Uint8Array(moov, 4, 4).set(encoder.encode('moov'));

    const result = new Uint8Array(moovSize);
    result.set(new Uint8Array(moov), 0);
    result.set(new Uint8Array(mvhd), 8);
    result.set(trakContent, 8 + mvhdSize);
    return result;
  }

  private createTrakBox(_timescale: number, duration: number): Uint8Array {
    const encoder = new TextEncoder();
    const tkhdSize = 92;
    const tkhd = new ArrayBuffer(tkhdSize);
    const view = new DataView(tkhd);

    view.setUint32(0, tkhdSize);
    new Uint8Array(tkhd, 4, 4).set(encoder.encode('tkhd'));
    view.setUint32(8, 0x00000003);
    view.setUint32(16, 1);
    view.setUint32(24, duration);
    view.setUint32(76, this.videoConfig.width << 16);
    view.setUint32(80, this.videoConfig.height << 16);

    const trakSize = 8 + tkhdSize;
    const trak = new Uint8Array(trakSize);
    const trakView = new DataView(trak.buffer);
    trakView.setUint32(0, trakSize);
    new Uint8Array(trak.buffer, 4, 4).set(encoder.encode('trak'));
    trak.set(new Uint8Array(tkhd), 8);
    return trak;
  }

  private createMdatBox(): Uint8Array {
    const encoder = new TextEncoder();
    const videoDataSize = this.videoFrames.reduce((acc, f) => acc + f.data.length, 0);
    const audioDataSize = this.audioChunks.reduce((acc, c) => acc + c.data.length, 0);
    const totalDataSize = videoDataSize + audioDataSize;

    const mdatSize = 8 + totalDataSize;
    const mdat = new Uint8Array(mdatSize);
    const view = new DataView(mdat.buffer);
    view.setUint32(0, mdatSize);
    new Uint8Array(mdat.buffer, 4, 4).set(encoder.encode('mdat'));

    let offset = 8;
    for (const frame of this.videoFrames) {
      mdat.set(frame.data, offset);
      offset += frame.data.length;
    }

    for (const chunk of this.audioChunks) {
      mdat.set(chunk.data, offset);
      offset += chunk.data.length;
    }

    return mdat;
  }

  private createWebMHeader(): Uint8Array {
    return new Uint8Array([
      0x1a, 0x45, 0xdf, 0xa3, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0x42, 0x86, 0x81,
      0x01, 0x42, 0xf7, 0x81, 0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82,
      0x84, 0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x04, 0x42, 0x85, 0x81, 0x02,
    ]);
  }

  private createWebMSegment(): Uint8Array {
    const videoData = this.videoFrames.flatMap((f) => Array.from(f.data));
    const audioData = this.audioChunks.flatMap((c) => Array.from(c.data));
    const segmentHeader = new Uint8Array([
      0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]);

    const result = new Uint8Array(segmentHeader.length + videoData.length + audioData.length);
    result.set(segmentHeader, 0);
    result.set(new Uint8Array(videoData), segmentHeader.length);
    result.set(new Uint8Array(audioData), segmentHeader.length + videoData.length);
    return result;
  }

  reset(): void {
    this.videoFrames = [];
    this.audioChunks = [];
  }

  getDuration(): number {
    if (this.videoFrames.length === 0) return 0;
    const firstTs = this.videoFrames[0].timestamp;
    const lastTs = this.videoFrames[this.videoFrames.length - 1].timestamp;
    return (lastTs - firstTs) / 1000000;
  }

  getFrameCount(): number {
    return this.videoFrames.length;
  }
}

export class WebMMuxer {
  private chunks: Blob[] = [];
  private mediaRecorder: MediaRecorder | null = null;

  async startRecording(stream: MediaStream, options?: MediaRecorderOptions): Promise<void> {
    const mimeType = this.getSupportedMimeType();

    this.mediaRecorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: options?.videoBitsPerSecond || 5000000,
      audioBitsPerSecond: options?.audioBitsPerSecond || 128000,
      ...options,
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.start(100);
  }

  private getSupportedMimeType(): string {
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    return 'video/webm';
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: this.mediaRecorder!.mimeType });
        this.chunks = [];
        resolve(blob);
      };

      this.mediaRecorder.onerror = (event) => {
        reject(new Error('Recording error: ' + event));
      };

      this.mediaRecorder.stop();
    });
  }

  pause(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
    }
  }

  resume(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'paused') {
      this.mediaRecorder.resume();
    }
  }
}
