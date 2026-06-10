import { logger } from '@/lib/observability/logger';
import { EventEmitter } from 'events';
import {
  canvasToBlob,
  createMediaEntry,
  flashScreen,
  generateCaptureFilename,
} from './canvas-utils';
import { createDefaultCaptureConfig, createDefaultPhotoModeSettings } from './runtime-defaults';
import {
  copyScreenshotToClipboard,
  downloadCapturedMedia,
  serializeGalleryMetadata,
  shareCapturedMedia,
} from './runtime-media-actions';
import {
  addCapturedMediaToGallery,
  getSortedCapturedMedia,
  revokeCapturedMediaUrls,
} from './runtime-gallery';
import { getCaptureAudioStream, generateVideoThumbnail } from './runtime-recording';
import { ReplayBufferRuntime } from './runtime-replay';
import { createProcessedCaptureCanvas } from './runtime-screenshot';
import {
  type CapturedMedia,
  type CaptureConfig,
  type CaptureState,
  type PhotoModeSettings,
  PHOTO_FILTER_PRESETS,
  type ReplayBufferOptions,
  type ScreenshotOptions,
  type VideoRecordingOptions,
} from './types';

export class CaptureSystem extends EventEmitter {
  private static instance: CaptureSystem | null = null;
  
  private config: CaptureConfig;
  private state: CaptureState = 'idle';
  private gallery: Map<string, CapturedMedia> = new Map();
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private replayBuffer = new ReplayBufferRuntime();
  private photoMode: PhotoModeSettings;
  private canvas: HTMLCanvasElement | null = null;
  private recordingStartTime = 0;
  
  constructor(config: Partial<CaptureConfig> = {}) {
    super();
    
    this.config = createDefaultCaptureConfig(config);
    this.photoMode = createDefaultPhotoModeSettings();
    this.loadGallery();
  }
  
  static getInstance(): CaptureSystem {
    if (!CaptureSystem.instance) {
      CaptureSystem.instance = new CaptureSystem();
    }
    return CaptureSystem.instance;
  }
  
  // ============================================================================
  // CANVAS SETUP
  // ============================================================================
  
  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.emit('canvasSet', canvas);
  }
  
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }
  
  // ============================================================================
  // SCREENSHOT
  // ============================================================================
  
  async captureScreenshot(options: ScreenshotOptions = {}): Promise<CapturedMedia | null> {
    if (!this.canvas) {
      logger.error('CaptureSystem: No canvas set');
      return null;
    }
    
    const {
      format = this.config.defaultImageFormat,
      quality = this.config.defaultImageQuality,
      width,
      height,
      watermark,
      includeUI = false,
      filename,
      timestamp = true,
      effects = [],
    } = options;
    
    try {
      this.emit('captureStart', 'screenshot');
      
      // Create capture canvas
      let captureCanvas = this.canvas;
      
      // Apply resizing if needed
      if (width || height || effects.length > 0 || watermark) {
        captureCanvas = createProcessedCaptureCanvas(
          this.canvas,
          width,
          height,
          effects,
          watermark
        );
      }
      
      // Convert to blob
      const mimeType = `image/${format}`;
      const blob = await canvasToBlob(captureCanvas, mimeType, quality);
      
      // Create media entry
      const media = createMediaEntry('screenshot', blob, {
        width: captureCanvas.width,
        height: captureCanvas.height,
        format,
        filename: filename || generateCaptureFilename('screenshot', format),
      });
      
      // Add to gallery
      this.addToGallery(media);
      
      // Effects
      if (this.config.flashEffect) {
        flashScreen();
      }
      if (this.config.captureSound) {
        this.playCaptureSound();
      }
      
      this.emit('captureComplete', media);
      return media;
      
    } catch (error) {
      logger.error('Screenshot capture failed:', error);
      this.emit('captureError', error);
      return null;
    }
  }
  
  async startRecording(options: VideoRecordingOptions = {}): Promise<boolean> {
    if (this.state !== 'idle') {
      logger.warn('Already recording');
      return false;
    }
    
    if (!this.canvas) {
      logger.error('CaptureSystem: No canvas set');
      return false;
    }
    
    const {
      format = this.config.defaultVideoFormat,
      frameRate = this.config.defaultVideoFrameRate,
      bitrate = this.config.defaultVideoBitrate,
      audio = false,
      microphone = false,
      maxDuration,
    } = options;
    
    try {
      // Get canvas stream
      const stream = this.canvas.captureStream(frameRate);
      
      // Add audio tracks if needed
      if (audio || microphone) {
        const audioStream = await getCaptureAudioStream(audio, microphone);
        if (audioStream) {
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }
      }
      
      // Setup MediaRecorder
      const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm;codecs=vp9';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        logger.warn(`${mimeType} not supported, falling back to webm`);
      }
      
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : 'video/webm',
        videoBitsPerSecond: bitrate,
      });
      
      this.recordedChunks = [];
      
      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };
      
      this.mediaRecorder.onstop = () => {
        this.finalizeRecording(options);
      };
      
      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      this.state = 'recording';
      this.recordingStartTime = Date.now();
      
      // Max duration timeout
      if (maxDuration) {
        setTimeout(() => {
          if (this.state === 'recording') {
            this.stopRecording();
          }
        }, maxDuration * 1000);
      }
      
      this.emit('recordingStart');
      return true;
      
    } catch (error) {
      logger.error('Failed to start recording:', error);
      this.emit('recordingError', error);
      return false;
    }
  }
  
  pauseRecording(): boolean {
    if (this.state !== 'recording' || !this.mediaRecorder) return false;
    
    this.mediaRecorder.pause();
    this.state = 'paused';
    this.emit('recordingPause');
    return true;
  }
  
  resumeRecording(): boolean {
    if (this.state !== 'paused' || !this.mediaRecorder) return false;
    
    this.mediaRecorder.resume();
    this.state = 'recording';
    this.emit('recordingResume');
    return true;
  }
  
  async stopRecording(): Promise<CapturedMedia | null> {
    if ((this.state !== 'recording' && this.state !== 'paused') || !this.mediaRecorder) {
      return null;
    }
    
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = async () => {
        const media = await this.finalizeRecording();
        resolve(media);
      };
      
      this.mediaRecorder!.stop();
    });
  }
  
  private async finalizeRecording(options: VideoRecordingOptions = {}): Promise<CapturedMedia | null> {
    this.state = 'processing';
    this.emit('recordingProcessing');
    
    try {
      const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
      const duration = (Date.now() - this.recordingStartTime) / 1000;
      
      const media = createMediaEntry('video', blob, {
        width: this.canvas?.width ?? 0,
        height: this.canvas?.height ?? 0,
        format: options.format || 'webm',
        filename: options.filename || generateCaptureFilename('video', 'webm'),
        duration,
      });
      
      // Generate thumbnail
      media.thumbnail = await generateVideoThumbnail(blob);
      
      this.addToGallery(media);
      
      this.state = 'idle';
      this.recordedChunks = [];
      this.mediaRecorder = null;
      
      this.emit('recordingComplete', media);
      return media;
      
    } catch (error) {
      logger.error('Failed to finalize recording:', error);
      this.state = 'idle';
      this.emit('recordingError', error);
      return null;
    }
  }
  
  // ============================================================================
  // REPLAY BUFFER
  // ============================================================================
  
  startReplayBuffer(options: ReplayBufferOptions): void {
    if (!this.canvas) return;
    this.replayBuffer.start(this.canvas, options);
    this.emit('replayBufferStart', options.duration);
  }
  
  stopReplayBuffer(): void {
    this.replayBuffer.stop();
    this.emit('replayBufferStop');
  }
  
  async saveReplayBuffer(): Promise<CapturedMedia | null> {
    const media = this.replayBuffer.save(this.canvas);
    if (!media) return null;
    
    this.addToGallery(media);
    this.emit('replaySaved', media);
    
    return media;
  }
  
  // ============================================================================
  // PHOTO MODE
  // ============================================================================
  
  enterPhotoMode(): void {
    this.photoMode.enabled = true;
    this.emit('photoModeEnter', this.photoMode);
  }
  
  exitPhotoMode(): void {
    this.photoMode = createDefaultPhotoModeSettings();
    this.emit('photoModeExit');
  }
  
  setPhotoModeSetting<K extends keyof PhotoModeSettings>(key: K, value: PhotoModeSettings[K]): void {
    this.photoMode[key] = value;
    this.emit('photoModeChange', { key, value, settings: this.photoMode });
  }
  
  getPhotoModeSettings(): PhotoModeSettings {
    return { ...this.photoMode };
  }
  
  applyFilterPreset(preset: string): void {
    if (!PHOTO_FILTER_PRESETS[preset]) return;
    this.photoMode.filterPreset = preset;
    this.emit('filterPresetApply', preset);
  }
  
  // ============================================================================
  // GALLERY
  // ============================================================================
  
  private addToGallery(media: CapturedMedia): void {
    addCapturedMediaToGallery({
      deleteMedia: (id) => this.deleteMedia(id),
      gallery: this.gallery,
      maxGallerySize: this.config.maxGallerySize,
      media,
    });
    this.saveGallery();
    this.emit('galleryUpdate', this.getGallery());
  }
  
  getGallery(): CapturedMedia[] {
    return getSortedCapturedMedia(this.gallery);
  }
  
  getMedia(id: string): CapturedMedia | undefined {
    return this.gallery.get(id);
  }
  
  deleteMedia(id: string): boolean {
    const media = this.gallery.get(id);
    if (!media) return false;
    
    URL.revokeObjectURL(media.url);
    this.gallery.delete(id);
    this.saveGallery();
    this.emit('mediaDelete', id);
    
    return true;
  }
  
  clearGallery(): void {
    revokeCapturedMediaUrls(this.gallery.values());
    this.gallery.clear();
    this.saveGallery();
    this.emit('galleryClear');
  }
  
  private saveGallery(): void {
    if (typeof localStorage === 'undefined') return;
    
    localStorage.setItem('aethel_capture_gallery', serializeGalleryMetadata(this.gallery.values()));
  }
  
  private loadGallery(): void {
    // Gallery blobs can't be restored from localStorage
    // In a real implementation, use IndexedDB for persistent storage
  }
  
  // ============================================================================
  // DOWNLOAD/SHARE
  // ============================================================================
  
  downloadMedia(id: string): void {
    const media = this.gallery.get(id);
    if (!media) return;
    
    downloadCapturedMedia(media);
    this.emit('mediaDownload', media);
  }
  
  async shareMedia(id: string): Promise<boolean> {
    const media = this.gallery.get(id);
    if (!media) return false;
    
    if (await shareCapturedMedia(media)) {
      this.emit('mediaShare', media);
      return true;
    }
    return false;
  }
  
  async copyToClipboard(id: string): Promise<boolean> {
    const media = this.gallery.get(id);
    if (!media) return false;

    if (await copyScreenshotToClipboard(media)) {
      this.emit('mediaCopy', media);
      return true;
    }
    return false;
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private playCaptureSound(): void {
    // In a real implementation, play a shutter sound
    this.emit('captureSound');
  }
  
  getState(): CaptureState {
    return this.state;
  }
  
  getRecordingDuration(): number {
    if (this.state !== 'recording' && this.state !== 'paused') return 0;
    return (Date.now() - this.recordingStartTime) / 1000;
  }
  
  isRecording(): boolean {
    return this.state === 'recording' || this.state === 'paused';
  }
  
  isPhotoModeActive(): boolean {
    return this.photoMode.enabled;
  }
  
  setConfig(config: Partial<CaptureConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChanged', this.config);
  }
  
  getConfig(): CaptureConfig {
    return { ...this.config };
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stopReplayBuffer();
    this.stopRecording();
    
    revokeCapturedMediaUrls(this.gallery.values());
    this.gallery.clear();
    this.removeAllListeners();
    CaptureSystem.instance = null;
  }
}
