import type { CaptureConfig, PhotoModeSettings } from './types';

export function createDefaultCaptureConfig(config: Partial<CaptureConfig> = {}): CaptureConfig {
  return {
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
}

export function createDefaultPhotoModeSettings(): PhotoModeSettings {
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
