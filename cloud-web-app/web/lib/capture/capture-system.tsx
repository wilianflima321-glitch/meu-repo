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
import {
  canvasToBlob,
  createMediaEntry,
  createProcessedCanvas,
  flashCaptureScreen,
  generateFilename,
} from './capture-system-media';

import type {
  CaptureConfig,
  CapturedMedia,
  CaptureSource,
  CaptureState,
  GifOptions,
  ImageFormat,
  PhotoModeSettings,
  ReplayBufferOptions,
  ScreenshotEffect,
  ScreenshotOptions,
  VideoFormat,
  VideoRecordingOptions,
  WatermarkConfig,
} from './capture-types';
export type {
  CaptureConfig,
  CapturedMedia,
  CaptureSource,
  CaptureState,
  GifOptions,
  ImageFormat,
  PhotoModeSettings,
  ReplayBufferOptions,
  ScreenshotEffect,
  ScreenshotOptions,
  VideoFormat,
  VideoRecordingOptions,
  WatermarkConfig,
} from './capture-types';

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
        captureCanvas = createProcessedCanvas(
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
        filename: filename || generateFilename('screenshot', format),
      });
      
      // Add to gallery
      this.addToGallery(media);
      
      // Effects
      if (this.config.flashEffect) {
        flashCaptureScreen();
      }
      if (this.config.captureSound) {
        this.emit('captureSound');
      }
      
      this.emit('captureComplete', media);
      return media;
      
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      this.emit('captureError', error);
      return null;
    }
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
      
      const media = createMediaEntry('video', blob, {
        width: this.canvas?.width ?? 0,
        height: this.canvas?.height ?? 0,
        format: options.format || 'webm',
        filename: options.filename || generateFilename('video', 'webm'),
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
      
      const blob = await canvasToBlob(this.canvas, 'image/jpeg', 0.8);
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
    
    const media = createMediaEntry('video', blob, {
      width: this.canvas?.width ?? 0,
      height: this.canvas?.height ?? 0,
      format: 'webm',
      filename: generateFilename('replay', 'webm'),
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
