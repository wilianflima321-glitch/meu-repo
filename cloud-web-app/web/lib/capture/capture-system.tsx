/**
 * Screenshot & Capture System - Sistema de Captura de Tela e Vídeo
 * 
 * Sistema completo com:
 * - Captura de screenshots (PNG/JPEG/WebP)
 * - Gravação de vídeo (WebM/MP4)
 * - GIF recording
 * - Photo mode (pause + effects)
 * - Replay buffer (last N seconds)
 * - Watermark support
 * - Social sharing
 * - Gallery management
 * 
 * @module lib/capture/capture-system
 */

import { EventEmitter } from 'events';
import { PHOTO_FILTER_PRESETS } from './capture-presets';
export { PHOTO_FILTER_PRESETS } from './capture-presets';

// ============================================================================
// TYPES
// ============================================================================

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
// ============================================================================
// CAPTURE SYSTEM
// ============================================================================

export class CaptureSystem extends EventEmitter {
  private static instance: CaptureSystem | null = null;
  
  private config: CaptureConfig;
  private state: CaptureState = 'idle';
  private gallery: Map<string, CapturedMedia> = new Map();
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private replayBuffer: Blob[] = [];
  private replayInterval: ReturnType<typeof setInterval> | null = null;
  private photoMode: PhotoModeSettings;
  private canvas: HTMLCanvasElement | null = null;
  private recordingStartTime = 0;
  
  constructor(config: Partial<CaptureConfig> = {}) {
    super();
    
    this.config = {
      defaultImageFormat: 'png',
      defaultImageQuality: 0.92,
      defaultVideoFormat: 'webm',
      defaultVideoFrameRate: 30,
      defaultVideoBitrate: 5000000,
      autoSave: true,
      saveDirectory: 'captures',
      filenamePattern: '{game}_{type}_{timestamp}',
      captureSound: true,
      flashEffect: true,
      notifyOnCapture: true,
      maxGallerySize: 100,
      replayBufferEnabled: false,
      replayBufferDuration: 30,
      ...config,
    };
    
    this.photoMode = this.getDefaultPhotoModeSettings();
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
      console.error('CaptureSystem: No canvas set');
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
        captureCanvas = this.createProcessedCanvas(
          this.canvas,
          width,
          height,
          effects,
          watermark
        );
      }
      
      // Convert to blob
      const mimeType = `image/${format}`;
      const blob = await this.canvasToBlob(captureCanvas, mimeType, quality);
      
      // Create media entry
      const media = this.createMediaEntry('screenshot', blob, {
        width: captureCanvas.width,
        height: captureCanvas.height,
        format,
        filename: filename || this.generateFilename('screenshot', format),
      });
      
      // Add to gallery
      this.addToGallery(media);
      
      // Effects
      if (this.config.flashEffect) {
        this.flashScreen();
      }
      if (this.config.captureSound) {
        this.playCaptureSound();
      }
      
      this.emit('captureComplete', media);
      return media;
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      this.emit('captureError', error);
      return null;
    }
  }
  
  private createProcessedCanvas(
    source: HTMLCanvasElement,
    width?: number,
    height?: number,
    effects: ScreenshotEffect[] = [],
    watermark?: WatermarkConfig
  ): HTMLCanvasElement {
    const targetWidth = width || source.width;
    const targetHeight = height || source.height;
    
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    const ctx = canvas.getContext('2d')!;
    
    // Build filter string
    const filters = effects.map(effect => {
      switch (effect.type) {
        case 'brightness': return `brightness(${effect.value})`;
        case 'contrast': return `contrast(${effect.value})`;
        case 'saturation': return `saturate(${effect.value})`;
        case 'blur': return `blur(${effect.value}px)`;
        case 'grayscale': return `grayscale(${effect.value})`;
        case 'sepia': return `sepia(${effect.value})`;
        default: return '';
      }
    }).filter(Boolean).join(' ');
    
    if (filters) {
      ctx.filter = filters;
    }
    
    // Draw source
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    
    // Reset filter for watermark
    ctx.filter = 'none';
    
    // Apply vignette
    const vignette = effects.find(e => e.type === 'vignette');
    if (vignette) {
      this.applyVignette(ctx, targetWidth, targetHeight, vignette.value);
    }
    
    // Apply grain
    const grain = effects.find(e => e.type === 'grain');
    if (grain) {
      this.applyGrain(ctx, targetWidth, targetHeight, grain.value);
    }
    
    // Apply watermark
    if (watermark) {
      this.applyWatermark(ctx, targetWidth, targetHeight, watermark);
    }
    
    return canvas;
  }
  
  private applyVignette(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
    const gradient = ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 2
    );
    
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.5, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, `rgba(0,0,0,${intensity})`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }
  
  private applyGrain(ctx: CanvasRenderingContext2D, width: number, height: number, intensity: number): void {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * intensity * 50;
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }
    
    ctx.putImageData(imageData, 0, 0);
  }
  
  private applyWatermark(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    watermark: WatermarkConfig
  ): void {
    const margin = watermark.margin ?? 20;
    const opacity = watermark.opacity ?? 0.7;
    
    ctx.globalAlpha = opacity;
    
    let x = margin;
    let y = margin;
    
    switch (watermark.position) {
      case 'top-right':
        x = width - margin;
        break;
      case 'bottom-left':
        y = height - margin;
        break;
      case 'bottom-right':
        x = width - margin;
        y = height - margin;
        break;
      case 'center':
        x = width / 2;
        y = height / 2;
        break;
    }
    
    if (watermark.text) {
      ctx.font = `${watermark.fontSize ?? 16}px ${watermark.fontFamily ?? 'Arial'}`;
      ctx.fillStyle = watermark.fontColor ?? 'white';
      ctx.textAlign = watermark.position.includes('right') ? 'right' : 
                      watermark.position === 'center' ? 'center' : 'left';
      ctx.textBaseline = watermark.position.includes('bottom') ? 'bottom' : 
                         watermark.position === 'center' ? 'middle' : 'top';
      ctx.fillText(watermark.text, x, y);
    }
    
    ctx.globalAlpha = 1;
  }
  
  private async canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Failed to create blob')),
        type,
        quality
      );
    });
  }
  
  // ============================================================================
  // VIDEO RECORDING
  // ============================================================================
  
  async startRecording(options: VideoRecordingOptions = {}): Promise<boolean> {
    if (this.state !== 'idle') {
      console.warn('Already recording');
      return false;
    }
    
    if (!this.canvas) {
      console.error('CaptureSystem: No canvas set');
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
        const audioStream = await this.getAudioStream(audio, microphone);
        if (audioStream) {
          audioStream.getAudioTracks().forEach(track => stream.addTrack(track));
        }
      }
      
      // Setup MediaRecorder
      const mimeType = format === 'mp4' ? 'video/mp4' : 'video/webm;codecs=vp9';
      
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        console.warn(`${mimeType} not supported, falling back to webm`);
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
      console.error('Failed to start recording:', error);
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
      
      const media = this.createMediaEntry('video', blob, {
        width: this.canvas?.width ?? 0,
        height: this.canvas?.height ?? 0,
        format: options.format || 'webm',
        filename: options.filename || this.generateFilename('video', 'webm'),
        duration,
      });
      
      // Generate thumbnail
      media.thumbnail = await this.generateVideoThumbnail(blob);
      
      this.addToGallery(media);
      
      this.state = 'idle';
      this.recordedChunks = [];
      this.mediaRecorder = null;
      
      this.emit('recordingComplete', media);
      return media;
      
    } catch (error) {
      console.error('Failed to finalize recording:', error);
      this.state = 'idle';
      this.emit('recordingError', error);
      return null;
    }
  }
  
  private async getAudioStream(systemAudio: boolean, microphone: boolean): Promise<MediaStream | null> {
    const constraints: MediaStreamConstraints = {};
    
    if (microphone) {
      constraints.audio = true;
    }
    
    try {
      if (systemAudio && 'getDisplayMedia' in navigator.mediaDevices) {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
        const audioTracks = displayStream.getAudioTracks();
        displayStream.getVideoTracks().forEach(t => t.stop());
        
        if (audioTracks.length > 0) {
          const stream = new MediaStream(audioTracks);
          
          if (microphone) {
            const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            micStream.getAudioTracks().forEach(t => stream.addTrack(t));
          }
          
          return stream;
        }
      }
      
      if (microphone) {
        return await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      
      return null;
    } catch (error) {
      console.warn('Failed to get audio stream:', error);
      return null;
    }
  }
  
  private async generateVideoThumbnail(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.src = URL.createObjectURL(blob);
      video.currentTime = 0.5;
      
      video.onloadeddata = () => {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(video, 0, 0);
        
        const thumbnail = canvas.toDataURL('image/jpeg', 0.7);
        URL.revokeObjectURL(video.src);
        resolve(thumbnail);
      };
      
      video.onerror = () => {
        resolve('');
      };
    });
  }
  
  // ============================================================================
  // REPLAY BUFFER
  // ============================================================================
  
  startReplayBuffer(options: ReplayBufferOptions): void {
    if (!this.canvas) return;
    
    this.stopReplayBuffer();
    
    const { duration, frameRate = 30 } = options;
    const maxFrames = duration * frameRate;
    
    this.replayBuffer = [];
    
    this.replayInterval = setInterval(async () => {
      if (!this.canvas) return;
      
      const blob = await this.canvasToBlob(this.canvas, 'image/jpeg', 0.8);
      this.replayBuffer.push(blob);
      
      // Keep only last N frames
      while (this.replayBuffer.length > maxFrames) {
        this.replayBuffer.shift();
      }
    }, 1000 / frameRate);
    
    this.emit('replayBufferStart', duration);
  }
  
  stopReplayBuffer(): void {
    if (this.replayInterval) {
      clearInterval(this.replayInterval);
      this.replayInterval = null;
    }
    this.replayBuffer = [];
    this.emit('replayBufferStop');
  }
  
  async saveReplayBuffer(): Promise<CapturedMedia | null> {
    if (this.replayBuffer.length === 0) return null;
    
    // Convert frames to video (simplified - real implementation would use proper video encoding)
    const blob = new Blob(this.replayBuffer, { type: 'video/webm' });
    
    const media = this.createMediaEntry('video', blob, {
      width: this.canvas?.width ?? 0,
      height: this.canvas?.height ?? 0,
      format: 'webm',
      filename: this.generateFilename('replay', 'webm'),
      duration: this.replayBuffer.length / 30,
    });
    
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
    this.photoMode = this.getDefaultPhotoModeSettings();
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
  
  private getDefaultPhotoModeSettings(): PhotoModeSettings {
    return {
      enabled: false,
      fov: 60,
      dof: { enabled: false, focus: 10, aperture: 2.8 },
      exposure: 1,
      contrast: 1,
      saturation: 1,
      vignette: 0,
      grain: 0,
      filterPreset: null,
      cameraPosition: { x: 0, y: 0, z: 0 },
      cameraRotation: { x: 0, y: 0, z: 0 },
      hideUI: true,
      freezeTime: true,
    };
  }
  
  // ============================================================================
  // GALLERY
  // ============================================================================
  
  private addToGallery(media: CapturedMedia): void {
    this.gallery.set(media.id, media);
    
    // Limit gallery size
    while (this.gallery.size > this.config.maxGallerySize) {
      const oldest = Array.from(this.gallery.values())
        .sort((a, b) => a.timestamp - b.timestamp)[0];
      this.deleteMedia(oldest.id);
    }
    
    this.saveGallery();
    this.emit('galleryUpdate', this.getGallery());
  }
  
  getGallery(): CapturedMedia[] {
    return Array.from(this.gallery.values())
      .sort((a, b) => b.timestamp - a.timestamp);
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
    for (const media of this.gallery.values()) {
      URL.revokeObjectURL(media.url);
    }
    this.gallery.clear();
    this.saveGallery();
    this.emit('galleryClear');
  }
  
  private saveGallery(): void {
    if (typeof localStorage === 'undefined') return;
    
    // Save metadata only (not blobs)
    const metadata = Array.from(this.gallery.values()).map(m => ({
      id: m.id,
      type: m.type,
      filename: m.filename,
      timestamp: m.timestamp,
      width: m.width,
      height: m.height,
      size: m.size,
      format: m.format,
      duration: m.duration,
    }));
    
    localStorage.setItem('aethel_capture_gallery', JSON.stringify(metadata));
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
    
    const link = document.createElement('a');
    link.href = media.url;
    link.download = media.filename;
    link.click();
    
    this.emit('mediaDownload', media);
  }
  
  async shareMedia(id: string): Promise<boolean> {
    const media = this.gallery.get(id);
    if (!media) return false;
    
    if (!navigator.share) {
      console.warn('Web Share API not supported');
      return false;
    }
    
    try {
      const file = new File([media.blob], media.filename, { type: media.blob.type });
      
      await navigator.share({
        title: 'Game Capture',
        files: [file],
      });
      
      this.emit('mediaShare', media);
      return true;
    } catch (error) {
      console.error('Share failed:', error);
      return false;
    }
  }
  
  async copyToClipboard(id: string): Promise<boolean> {
    const media = this.gallery.get(id);
    if (!media || media.type !== 'screenshot') return false;
    
    try {
      const item = new ClipboardItem({ [media.blob.type]: media.blob });
      await navigator.clipboard.write([item]);
      this.emit('mediaCopy', media);
      return true;
    } catch (error) {
      console.error('Copy to clipboard failed:', error);
      return false;
    }
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private createMediaEntry(
    type: 'screenshot' | 'video' | 'gif',
    blob: Blob,
    data: {
      width: number;
      height: number;
      format: string;
      filename: string;
      duration?: number;
    }
  ): CapturedMedia {
    return {
      id: `capture_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      type,
      blob,
      url: URL.createObjectURL(blob),
      width: data.width,
      height: data.height,
      size: blob.size,
      timestamp: Date.now(),
      filename: data.filename,
      format: data.format,
      duration: data.duration,
    };
  }
  
  private generateFilename(type: string, extension: string): string {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${type}_${timestamp}.${extension}`;
  }
  
  private flashScreen(): void {
    if (typeof document === 'undefined') return;
    
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: white;
      opacity: 0.8;
      pointer-events: none;
      z-index: 99999;
      animation: flash 0.15s ease-out forwards;
    `;
    
    const style = document.createElement('style');
    style.textContent = `
      @keyframes flash {
        to { opacity: 0; }
      }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(flash);
    
    setTimeout(() => {
      flash.remove();
      style.remove();
    }, 200);
  }
  
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
    
    for (const media of this.gallery.values()) {
      URL.revokeObjectURL(media.url);
    }
    
    this.gallery.clear();
    this.removeAllListeners();
    CaptureSystem.instance = null;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef } from 'react';

interface CaptureContextValue {
  captureSystem: CaptureSystem;
}

const CaptureContext = createContext<CaptureContextValue | null>(null);

export function CaptureProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<CaptureConfig>;
}) {
  const value = useMemo(() => ({
    captureSystem: new CaptureSystem(config),
  }), [config]);
  
  useEffect(() => {
    return () => {
      value.captureSystem.dispose();
    };
  }, [value]);
  
  return (
    <CaptureContext.Provider value={value}>
      {children}
    </CaptureContext.Provider>
  );
}

export function useCaptureSystem() {
  const context = useContext(CaptureContext);
  if (!context) {
    return CaptureSystem.getInstance();
  }
  return context.captureSystem;
}

export function useScreenshot() {
  const capture = useCaptureSystem();
  
  const takeScreenshot = useCallback(async (options?: ScreenshotOptions) => {
    return capture.captureScreenshot(options);
  }, [capture]);
  
  return takeScreenshot;
}

export function useVideoRecording() {
  const capture = useCaptureSystem();
  const [isRecording, setIsRecording] = useState(capture.isRecording());
  const [duration, setDuration] = useState(0);
  
  useEffect(() => {
    const onStart = () => setIsRecording(true);
    const onStop = () => setIsRecording(false);
    
    capture.on('recordingStart', onStart);
    capture.on('recordingComplete', onStop);
    capture.on('recordingError', onStop);
    
    let interval: ReturnType<typeof setInterval>;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration(capture.getRecordingDuration());
      }, 100);
    }
    
    return () => {
      capture.off('recordingStart', onStart);
      capture.off('recordingComplete', onStop);
      capture.off('recordingError', onStop);
      if (interval) clearInterval(interval);
    };
  }, [capture, isRecording]);
  
  const start = useCallback((options?: VideoRecordingOptions) => {
    return capture.startRecording(options);
  }, [capture]);
  
  const stop = useCallback(() => {
    return capture.stopRecording();
  }, [capture]);
  
  const pause = useCallback(() => {
    return capture.pauseRecording();
  }, [capture]);
  
  const resume = useCallback(() => {
    return capture.resumeRecording();
  }, [capture]);
  
  return { isRecording, duration, start, stop, pause, resume };
}

export function usePhotoMode() {
  const capture = useCaptureSystem();
  const [isActive, setIsActive] = useState(capture.isPhotoModeActive());
  const [settings, setSettings] = useState(capture.getPhotoModeSettings());
  
  useEffect(() => {
    const onEnter = () => {
      setIsActive(true);
      setSettings(capture.getPhotoModeSettings());
    };
    const onExit = () => {
      setIsActive(false);
      setSettings(capture.getPhotoModeSettings());
    };
    const onChange = () => {
      setSettings(capture.getPhotoModeSettings());
    };
    
    capture.on('photoModeEnter', onEnter);
    capture.on('photoModeExit', onExit);
    capture.on('photoModeChange', onChange);
    
    return () => {
      capture.off('photoModeEnter', onEnter);
      capture.off('photoModeExit', onExit);
      capture.off('photoModeChange', onChange);
    };
  }, [capture]);
  
  const enter = useCallback(() => capture.enterPhotoMode(), [capture]);
  const exit = useCallback(() => capture.exitPhotoMode(), [capture]);
  const setSetting = useCallback(<K extends keyof PhotoModeSettings>(key: K, value: PhotoModeSettings[K]) => {
    capture.setPhotoModeSetting(key, value);
  }, [capture]);
  
  return { isActive, settings, enter, exit, setSetting };
}

export function useCaptureGallery() {
  const capture = useCaptureSystem();
  const [gallery, setGallery] = useState<CapturedMedia[]>(capture.getGallery());
  
  useEffect(() => {
    const update = () => setGallery(capture.getGallery());
    
    capture.on('galleryUpdate', update);
    capture.on('mediaDelete', update);
    capture.on('galleryClear', update);
    
    return () => {
      capture.off('galleryUpdate', update);
      capture.off('mediaDelete', update);
      capture.off('galleryClear', update);
    };
  }, [capture]);
  
  const deleteMedia = useCallback((id: string) => capture.deleteMedia(id), [capture]);
  const downloadMedia = useCallback((id: string) => capture.downloadMedia(id), [capture]);
  const shareMedia = useCallback((id: string) => capture.shareMedia(id), [capture]);
  const copyToClipboard = useCallback((id: string) => capture.copyToClipboard(id), [capture]);
  const clearAll = useCallback(() => capture.clearGallery(), [capture]);
  
  return { gallery, deleteMedia, downloadMedia, shareMedia, copyToClipboard, clearAll };
}

export function useCanvasCapture(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const capture = useCaptureSystem();
  
  useEffect(() => {
    if (canvasRef.current) {
      capture.setCanvas(canvasRef.current);
    }
  }, [capture, canvasRef]);
}

const __defaultExport = {
  CaptureSystem,
  CaptureProvider,
  useCaptureSystem,
  useScreenshot,
  useVideoRecording,
  usePhotoMode,
  useCaptureGallery,
  useCanvasCapture,
  PHOTO_FILTER_PRESETS,
};

export default __defaultExport;
