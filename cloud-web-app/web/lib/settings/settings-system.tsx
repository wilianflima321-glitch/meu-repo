'use client';

import { EventEmitter } from 'events';
import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type GraphicsQuality = 'very_low' | 'low' | 'medium' | 'high' | 'ultra' | 'custom';
export type Difficulty = 'story' | 'easy' | 'normal' | 'hard' | 'nightmare' | 'custom';
export type TextSize = 'small' | 'medium' | 'large' | 'extra_large';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type SettingsCategory = 'audio' | 'video' | 'controls' | 'gameplay' | 'accessibility';

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  ambientVolume: number;
  uiVolume: number;
  muted: boolean;
}

export interface VideoSettings {
  resolution: { width: number; height: number };
  windowMode: 'fullscreen' | 'windowed' | 'borderless';
  vsync: boolean;
  fpsLimit: number;
  graphicsQuality: GraphicsQuality;
  textureQuality: 'low' | 'medium' | 'high' | 'ultra';
  shadowQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  antialiasing: 'off' | 'fxaa' | 'smaa' | 'taa' | 'msaa_2x' | 'msaa_4x' | 'msaa_8x';
  renderScale: number;
  fov: number;
}

export interface ControlSettings {
  mouseSensitivity: number;
  invertMouseX: boolean;
  invertMouseY: boolean;
  gamepadEnabled: boolean;
}

export interface GameplaySettings {
  difficulty: Difficulty;
  subtitles: boolean;
  autoSave: boolean;
}

export interface AccessibilitySettings {
  textSize: TextSize;
  colorBlindMode: ColorBlindMode;
  reduceMotion: boolean;
  highContrast: boolean;
}

export interface SettingsSnapshot {
  audio: AudioSettings;
  video: VideoSettings;
  controls: ControlSettings;
  gameplay: GameplaySettings;
  accessibility: AccessibilitySettings;
}

const STORAGE_KEY = 'aethel-engine-settings-v2';

const DEFAULT_SETTINGS: SettingsSnapshot = {
  audio: {
    masterVolume: 1,
    musicVolume: 0.8,
    sfxVolume: 0.8,
    voiceVolume: 0.9,
    ambientVolume: 0.7,
    uiVolume: 0.8,
    muted: false,
  },
  video: {
    resolution: { width: 1920, height: 1080 },
    windowMode: 'borderless',
    vsync: true,
    fpsLimit: 60,
    graphicsQuality: 'high',
    textureQuality: 'high',
    shadowQuality: 'high',
    antialiasing: 'taa',
    renderScale: 1,
    fov: 75,
  },
  controls: {
    mouseSensitivity: 1,
    invertMouseX: false,
    invertMouseY: false,
    gamepadEnabled: true,
  },
  gameplay: {
    difficulty: 'normal',
    subtitles: true,
    autoSave: true,
  },
  accessibility: {
    textSize: 'medium',
    colorBlindMode: 'none',
    reduceMotion: false,
    highContrast: false,
  },
};

function cloneSnapshot(snapshot: SettingsSnapshot): SettingsSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as SettingsSnapshot;
}

function readStoredSettings(): Partial<SettingsSnapshot> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<SettingsSnapshot>;
  } catch {
    return {};
  }
}

function persistSettings(snapshot: SettingsSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // Persistence is best-effort; callers still receive the in-memory state.
  }
}

function mergeSettings(base: SettingsSnapshot, override: Partial<SettingsSnapshot>): SettingsSnapshot {
  return {
    audio: { ...base.audio, ...override.audio },
    video: { ...base.video, ...override.video },
    controls: { ...base.controls, ...override.controls },
    gameplay: { ...base.gameplay, ...override.gameplay },
    accessibility: { ...base.accessibility, ...override.accessibility },
  };
}

export class SettingsManager extends EventEmitter {
  private settings: SettingsSnapshot;

  constructor(initialSettings: Partial<SettingsSnapshot> = {}) {
    super();
    this.settings = mergeSettings(DEFAULT_SETTINGS, mergeSettings(cloneSnapshot(DEFAULT_SETTINGS), readStoredSettings()));
    this.settings = mergeSettings(this.settings, initialSettings);
  }

  getSnapshot(): SettingsSnapshot {
    return cloneSnapshot(this.settings);
  }

  getAudio(): AudioSettings {
    return { ...this.settings.audio };
  }

  setAudio(settings: Partial<AudioSettings>): void {
    this.updateCategory('audio', settings);
  }

  getVideo(): VideoSettings {
    return { ...this.settings.video, resolution: { ...this.settings.video.resolution } };
  }

  setVideo(settings: Partial<VideoSettings>): void {
    this.updateCategory('video', settings);
  }

  getControls(): ControlSettings {
    return { ...this.settings.controls };
  }

  setControls(settings: Partial<ControlSettings>): void {
    this.updateCategory('controls', settings);
  }

  getGameplay(): GameplaySettings {
    return { ...this.settings.gameplay };
  }

  setGameplay(settings: Partial<GameplaySettings>): void {
    this.updateCategory('gameplay', settings);
  }

  getAccessibility(): AccessibilitySettings {
    return { ...this.settings.accessibility };
  }

  setAccessibility(settings: Partial<AccessibilitySettings>): void {
    this.updateCategory('accessibility', settings);
  }

  applyGraphicsPreset(quality: Exclude<GraphicsQuality, 'custom'>): void {
    const presets: Record<Exclude<GraphicsQuality, 'custom'>, Partial<VideoSettings>> = {
      very_low: { graphicsQuality: 'very_low', textureQuality: 'low', shadowQuality: 'off', antialiasing: 'off', renderScale: 0.5 },
      low: { graphicsQuality: 'low', textureQuality: 'low', shadowQuality: 'low', antialiasing: 'fxaa', renderScale: 0.75 },
      medium: { graphicsQuality: 'medium', textureQuality: 'medium', shadowQuality: 'medium', antialiasing: 'smaa', renderScale: 0.9 },
      high: { graphicsQuality: 'high', textureQuality: 'high', shadowQuality: 'high', antialiasing: 'taa', renderScale: 1 },
      ultra: { graphicsQuality: 'ultra', textureQuality: 'ultra', shadowQuality: 'ultra', antialiasing: 'taa', renderScale: 1 },
    };
    this.setVideo(presets[quality]);
  }

  resetToDefaults(category?: SettingsCategory): void {
    if (category) {
      this.settings = { ...this.settings, [category]: cloneSnapshot(DEFAULT_SETTINGS)[category] };
      this.emit('categoryChanged', category, this.settings[category]);
    } else {
      this.settings = cloneSnapshot(DEFAULT_SETTINGS);
      this.emit('reset', this.getSnapshot());
    }
    persistSettings(this.settings);
    this.emit('changed', this.getSnapshot());
  }

  private updateCategory<Category extends SettingsCategory>(category: Category, value: Partial<SettingsSnapshot[Category]>): void {
    this.settings = {
      ...this.settings,
      [category]: { ...this.settings[category], ...value },
    };
    persistSettings(this.settings);
    this.emit('categoryChanged', category, this.settings[category]);
    this.emit('changed', this.getSnapshot());
  }
}

const SettingsContext = createContext<SettingsManager | null>(null);

export function SettingsProvider({ children, initialSettings }: { children: ReactNode; initialSettings?: Partial<SettingsSnapshot> }) {
  const manager = useMemo(() => new SettingsManager(initialSettings), [initialSettings]);
  return <SettingsContext.Provider value={manager}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsManager {
  const context = useContext(SettingsContext);
  const [fallback] = useState(() => new SettingsManager());
  return context ?? fallback;
}

export function useAudioSettings(): AudioSettings {
  return useSettings().getAudio();
}

export function useVideoSettings(): VideoSettings {
  return useSettings().getVideo();
}

export default {
  SettingsManager,
  SettingsProvider,
  useSettings,
  useAudioSettings,
  useVideoSettings,
};