/**
 * World/Game Settings System - Sistema de Configurações Avançado
 * 
 * Sistema completo com:
 * - Audio, video, controls, gameplay settings
 * - Settings validation and defaults
 * - Settings persistence (localStorage)
 * - Settings profiles/presets
 * - Platform-specific defaults
 * - Accessibility options
 * - Performance presets
 * - Settings migration between versions
 * 
 * @module lib/settings/settings-system
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

import type {
  AccessibilitySettings,
  AllSettings,
  AudioSettings,
  ColorBlindMode,
  ControlSettings,
  Difficulty,
  GamepadBinding,
  GameplaySettings,
  GraphicsQuality,
  KeyBinding,
  NetworkSettings,
  PrivacySettings,
  SettingsConfig,
  SettingsPreset,
  TextSize,
  VideoSettings,
} from './settings-types';

export type {
  AccessibilitySettings,
  AllSettings,
  AudioSettings,
  ColorBlindMode,
  ControlSettings,
  Difficulty,
  GamepadBinding,
  GameplaySettings,
  GraphicsQuality,
  KeyBinding,
  NetworkSettings,
  PrivacySettings,
  SettingsConfig,
  SettingsPreset,
  TextSize,
  VideoSettings,
} from './settings-types';

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  masterVolume: 1.0,
  musicVolume: 0.8,
  sfxVolume: 1.0,
  voiceVolume: 1.0,
  ambientVolume: 0.7,
  uiVolume: 0.8,
  muted: false,
  dynamicRange: 'full',
  speakerMode: 'stereo',
  voiceChat: true,
  voiceChatVolume: 1.0,
  pushToTalk: true,
  pushToTalkKey: 'KeyV',
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  resolution: { width: 1920, height: 1080 },
  windowMode: 'fullscreen',
  vsync: true,
  fpsLimit: 60,
  graphicsQuality: 'high',
  
  textureQuality: 'high',
  shadowQuality: 'high',
  shadowDistance: 100,
  antialiasing: 'taa',
  anisotropicFiltering: '16x',
  viewDistance: 100,
  foliageDistance: 80,
  foliageDensity: 1.0,
  
  ambientOcclusion: 'hbao',
  bloom: true,
  bloomIntensity: 0.5,
  motionBlur: false,
  motionBlurStrength: 0.5,
  depthOfField: true,
  chromaticAberration: false,
  filmGrain: false,
  filmGrainIntensity: 0.1,
  vignette: true,
  vignetteIntensity: 0.3,
  
  dynamicResolution: false,
  dynamicResolutionTarget: 60,
  renderScale: 1.0,
  lodBias: 0,
  
  gamma: 1.0,
  brightness: 1.0,
  contrast: 1.0,
  colorTemperature: 6500,
  hdrEnabled: false,
  hdrMaxBrightness: 1000,
  fov: 90,
};

export const DEFAULT_CONTROL_SETTINGS: ControlSettings = {
  mouseSensitivity: 1.0,
  mouseAimSensitivity: 0.8,
  mouseSmoothing: false,
  invertMouseX: false,
  invertMouseY: false,
  rawMouseInput: true,
  
  gamepadEnabled: true,
  gamepadVibration: true,
  gamepadVibrationIntensity: 1.0,
  gamepadDeadzone: 0.15,
  gamepadSensitivity: 1.0,
  gamepadAimSensitivity: 0.7,
  invertGamepadX: false,
  invertGamepadY: false,
  triggerDeadzone: 0.1,
  
  keybindings: {
    moveForward: { primary: 'KeyW' },
    moveBackward: { primary: 'KeyS' },
    moveLeft: { primary: 'KeyA' },
    moveRight: { primary: 'KeyD' },
    jump: { primary: 'Space' },
    crouch: { primary: 'ControlLeft' },
    sprint: { primary: 'ShiftLeft' },
    interact: { primary: 'KeyE' },
    reload: { primary: 'KeyR' },
    aim: { primary: 'Mouse1' },
    fire: { primary: 'Mouse0' },
    melee: { primary: 'KeyF' },
    inventory: { primary: 'Tab' },
    map: { primary: 'KeyM' },
    pause: { primary: 'Escape' },
    quickSave: { primary: 'F5' },
    quickLoad: { primary: 'F9' },
  },
  gamepadBindings: {
    moveForward: { axis: 'LeftStickY' },
    moveBackward: { axis: 'LeftStickY', inverted: true },
    moveLeft: { axis: 'LeftStickX', inverted: true },
    moveRight: { axis: 'LeftStickX' },
    jump: { button: 'A' },
    crouch: { button: 'B' },
    sprint: { button: 'LeftStick' },
    interact: { button: 'X' },
    reload: { button: 'X' },
    aim: { button: 'LeftTrigger' },
    fire: { button: 'RightTrigger' },
    melee: { button: 'RightStick' },
    inventory: { button: 'Back' },
    map: { button: 'DPadUp' },
    pause: { button: 'Start' },
  },
  
  toggleSprint: false,
  toggleCrouch: true,
  toggleAim: false,
  holdToInteract: false,
  autoReload: true,
};

export const DEFAULT_GAMEPLAY_SETTINGS: GameplaySettings = {
  difficulty: 'normal',
  
  damageReceived: 1.0,
  damageDealt: 1.0,
  resourceScarcity: 1.0,
  enemyAggression: 1.0,
  enemyHealth: 1.0,
  
  showHUD: true,
  showMinimap: true,
  showCompass: true,
  showObjectiveMarkers: true,
  showDamageNumbers: true,
  showHealthBars: true,
  showInteractionPrompts: true,
  showTutorialHints: true,
  
  cameraShake: true,
  cameraShakeIntensity: 1.0,
  headBob: true,
  headBobIntensity: 0.5,
  
  autoAim: false,
  autoAimStrength: 0.3,
  aimAssist: true,
  aimAssistStrength: 0.5,
  lockOnTarget: false,
  
  pauseOnFocusLoss: true,
  skipCutscenes: false,
  autoSaveFrequency: 5,
};

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textSize: 'medium',
  uiScale: 1.0,
  colorBlindMode: 'none',
  colorBlindIntensity: 1.0,
  highContrast: false,
  screenReader: false,
  flashingEffects: true,
  
  subtitles: true,
  subtitleSize: 'medium',
  subtitleBackground: true,
  subtitleSpeakerName: true,
  closedCaptions: false,
  monoAudio: false,
  
  reducedMotion: false,
  stickyKeys: false,
  holdButtonDuration: 0.3,
  quickTimeEventAssist: false,
  oneHandedMode: false,
  
  invincibility: false,
  infiniteResources: false,
  skipPuzzles: false,
  autoCompleteQTE: false,
  narratorEnabled: false,
  narratorSpeed: 1.0,
  
  language: 'en',
  voiceLanguage: 'en',
  textLanguage: 'en',
};

export const DEFAULT_NETWORK_SETTINGS: NetworkSettings = {
  matchmakingRegion: 'auto',
  connectionQuality: 'auto',
  maxPlayers: 4,
  allowCrossplay: true,
  showOnlineStatus: true,
  allowInvites: true,
  voiceChatEnabled: true,
  textChatEnabled: true,
  profanityFilter: true,
  showPlayerNames: true,
};

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  shareUsageData: false,
  shareErrorReports: true,
  personalizationEnabled: true,
  thirdPartyIntegration: false,
  streamingMode: false,
  hidePersonalInfo: false,
};

// ============================================================================
// GRAPHICS PRESETS
// ============================================================================

export const GRAPHICS_PRESETS: Record<GraphicsQuality, Partial<VideoSettings>> = {
  very_low: {
    textureQuality: 'low',
    shadowQuality: 'off',
    shadowDistance: 20,
    antialiasing: 'off',
    anisotropicFiltering: 'off',
    viewDistance: 30,
    foliageDistance: 20,
    foliageDensity: 0.3,
    ambientOcclusion: 'off',
    bloom: false,
    motionBlur: false,
    depthOfField: false,
    dynamicResolution: true,
    dynamicResolutionTarget: 30,
    renderScale: 0.5,
  },
  low: {
    textureQuality: 'low',
    shadowQuality: 'low',
    shadowDistance: 40,
    antialiasing: 'fxaa',
    anisotropicFiltering: '2x',
    viewDistance: 50,
    foliageDistance: 40,
    foliageDensity: 0.5,
    ambientOcclusion: 'off',
    bloom: false,
    motionBlur: false,
    depthOfField: false,
    dynamicResolution: true,
    dynamicResolutionTarget: 30,
    renderScale: 0.75,
  },
  medium: {
    textureQuality: 'medium',
    shadowQuality: 'medium',
    shadowDistance: 60,
    antialiasing: 'smaa',
    anisotropicFiltering: '4x',
    viewDistance: 70,
    foliageDistance: 60,
    foliageDensity: 0.75,
    ambientOcclusion: 'ssao',
    bloom: true,
    bloomIntensity: 0.3,
    motionBlur: false,
    depthOfField: false,
    renderScale: 1.0,
  },
  high: {
    textureQuality: 'high',
    shadowQuality: 'high',
    shadowDistance: 100,
    antialiasing: 'taa',
    anisotropicFiltering: '16x',
    viewDistance: 100,
    foliageDistance: 80,
    foliageDensity: 1.0,
    ambientOcclusion: 'hbao',
    bloom: true,
    bloomIntensity: 0.5,
    motionBlur: false,
    depthOfField: true,
    renderScale: 1.0,
  },
  ultra: {
    textureQuality: 'ultra',
    shadowQuality: 'ultra',
    shadowDistance: 150,
    antialiasing: 'msaa_4x',
    anisotropicFiltering: '16x',
    viewDistance: 150,
    foliageDistance: 120,
    foliageDensity: 1.0,
    ambientOcclusion: 'gtao',
    bloom: true,
    bloomIntensity: 0.6,
    motionBlur: true,
    motionBlurStrength: 0.3,
    depthOfField: true,
    chromaticAberration: true,
    renderScale: 1.0,
  },
  custom: {},
};

// ============================================================================
// DIFFICULTY PRESETS
// ============================================================================

export const DIFFICULTY_PRESETS: Record<Difficulty, Partial<GameplaySettings>> = {
  story: {
    damageReceived: 0.25,
    damageDealt: 2.0,
    resourceScarcity: 0.5,
    enemyAggression: 0.5,
    enemyHealth: 0.5,
    autoAim: true,
    autoAimStrength: 0.8,
    aimAssist: true,
    aimAssistStrength: 0.9,
  },
  easy: {
    damageReceived: 0.5,
    damageDealt: 1.5,
    resourceScarcity: 0.75,
    enemyAggression: 0.75,
    enemyHealth: 0.75,
    autoAim: false,
    aimAssist: true,
    aimAssistStrength: 0.7,
  },
  normal: {
    damageReceived: 1.0,
    damageDealt: 1.0,
    resourceScarcity: 1.0,
    enemyAggression: 1.0,
    enemyHealth: 1.0,
    autoAim: false,
    aimAssist: true,
    aimAssistStrength: 0.5,
  },
  hard: {
    damageReceived: 1.5,
    damageDealt: 0.75,
    resourceScarcity: 1.5,
    enemyAggression: 1.25,
    enemyHealth: 1.5,
    autoAim: false,
    aimAssist: false,
  },
  nightmare: {
    damageReceived: 2.5,
    damageDealt: 0.5,
    resourceScarcity: 2.0,
    enemyAggression: 1.5,
    enemyHealth: 2.0,
    autoAim: false,
    aimAssist: false,
    showHealthBars: false,
    showDamageNumbers: false,
  },
  custom: {},
};

// ============================================================================
// SETTINGS MANAGER
// ============================================================================

export class SettingsManager extends EventEmitter {
  private static instance: SettingsManager | null = null;
  
  private config: SettingsConfig;
  private settings: AllSettings;
  private pendingChanges: Partial<AllSettings> = {};
  private presets: Map<string, SettingsPreset> = new Map();
  
  constructor(config: Partial<SettingsConfig> = {}) {
    super();
    
    this.config = {
      storageKey: 'aethel_settings',
      version: 1,
      autoSave: true,
      validateOnLoad: true,
      ...config,
    };
    
    // Initialize with defaults
    this.settings = this.getDefaultSettings();
    
    // Load from storage
    this.loadFromStorage();
  }
  
  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }
  
  // ============================================================================
  // DEFAULT SETTINGS
  // ============================================================================
  
  getDefaultSettings(): AllSettings {
    return {
      audio: { ...DEFAULT_AUDIO_SETTINGS },
      video: { ...DEFAULT_VIDEO_SETTINGS },
      controls: { ...DEFAULT_CONTROL_SETTINGS },
      gameplay: { ...DEFAULT_GAMEPLAY_SETTINGS },
      accessibility: { ...DEFAULT_ACCESSIBILITY_SETTINGS },
      network: { ...DEFAULT_NETWORK_SETTINGS },
      privacy: { ...DEFAULT_PRIVACY_SETTINGS },
    };
  }
  
  resetToDefaults(category?: keyof AllSettings): void {
    const defaults = this.getDefaultSettings();
    
    if (category) {
      (this.settings as any)[category] = defaults[category];
      this.emit('categoryReset', category);
    } else {
      this.settings = defaults;
      this.emit('allReset');
    }
    
    this.saveToStorage();
    this.emit('changed', this.settings);
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getAll(): AllSettings {
    return { ...this.settings };
  }
  
  getAudio(): AudioSettings {
    return { ...this.settings.audio };
  }
  
  getVideo(): VideoSettings {
    return { ...this.settings.video };
  }
  
  getControls(): ControlSettings {
    return { ...this.settings.controls };
  }
  
  getGameplay(): GameplaySettings {
    return { ...this.settings.gameplay };
  }
  
  getAccessibility(): AccessibilitySettings {
    return { ...this.settings.accessibility };
  }
  
  getNetwork(): NetworkSettings {
    return { ...this.settings.network };
  }
  
  getPrivacy(): PrivacySettings {
    return { ...this.settings.privacy };
  }
  
  get<K extends keyof AllSettings, P extends keyof AllSettings[K]>(
    category: K,
    property: P
  ): AllSettings[K][P] {
    return this.settings[category][property];
  }
  
  // ============================================================================
  // SETTERS
  // ============================================================================
  
  setAudio(settings: Partial<AudioSettings>): void {
    this.settings.audio = { ...this.settings.audio, ...settings };
    this.onSettingsChanged('audio');
  }
  
  setVideo(settings: Partial<VideoSettings>): void {
    this.settings.video = { ...this.settings.video, ...settings };
    this.onSettingsChanged('video');
  }
  
  setControls(settings: Partial<ControlSettings>): void {
    this.settings.controls = { ...this.settings.controls, ...settings };
    this.onSettingsChanged('controls');
  }
  
  setGameplay(settings: Partial<GameplaySettings>): void {
    this.settings.gameplay = { ...this.settings.gameplay, ...settings };
    this.onSettingsChanged('gameplay');
  }
  
  setAccessibility(settings: Partial<AccessibilitySettings>): void {
    this.settings.accessibility = { ...this.settings.accessibility, ...settings };
    this.onSettingsChanged('accessibility');
  }
  
  setNetwork(settings: Partial<NetworkSettings>): void {
    this.settings.network = { ...this.settings.network, ...settings };
    this.onSettingsChanged('network');
  }
  
  setPrivacy(settings: Partial<PrivacySettings>): void {
    this.settings.privacy = { ...this.settings.privacy, ...settings };
    this.onSettingsChanged('privacy');
  }
  
  set<K extends keyof AllSettings, P extends keyof AllSettings[K]>(
    category: K,
    property: P,
    value: AllSettings[K][P]
  ): void {
    (this.settings[category] as any)[property] = value;
    this.onSettingsChanged(category);
  }
  
  private onSettingsChanged(category: keyof AllSettings): void {
    this.emit('categoryChanged', category, this.settings[category]);
    this.emit('changed', this.settings);
    
    if (this.config.autoSave) {
      this.saveToStorage();
    }
  }
  
  // ============================================================================
  // PRESETS
  // ============================================================================
  
  applyGraphicsPreset(quality: GraphicsQuality): void {
    const preset = GRAPHICS_PRESETS[quality];
    this.setVideo({ ...preset, graphicsQuality: quality });
    this.emit('graphicsPresetApplied', quality);
  }
  
  applyDifficultyPreset(difficulty: Difficulty): void {
    const preset = DIFFICULTY_PRESETS[difficulty];
    this.setGameplay({ ...preset, difficulty });
    this.emit('difficultyPresetApplied', difficulty);
  }
  
  registerPreset(id: string, preset: SettingsPreset): void {
    this.presets.set(id, preset);
    this.emit('presetRegistered', id);
  }
  
  applyPreset(id: string): void {
    const preset = this.presets.get(id);
    if (!preset) {
      throw new Error(`Preset not found: ${id}`);
    }
    
    if (preset.settings.audio) this.setAudio(preset.settings.audio);
    if (preset.settings.video) this.setVideo(preset.settings.video);
    if (preset.settings.controls) this.setControls(preset.settings.controls);
    if (preset.settings.gameplay) this.setGameplay(preset.settings.gameplay);
    if (preset.settings.accessibility) this.setAccessibility(preset.settings.accessibility);
    if (preset.settings.network) this.setNetwork(preset.settings.network);
    if (preset.settings.privacy) this.setPrivacy(preset.settings.privacy);
    
    this.emit('presetApplied', id);
  }
  
  getPresets(): SettingsPreset[] {
    return Array.from(this.presets.values());
  }
  
  // ============================================================================
  // KEYBINDINGS
  // ============================================================================
  
  setKeybinding(action: string, binding: KeyBinding): void {
    this.settings.controls.keybindings[action] = binding;
    this.onSettingsChanged('controls');
    this.emit('keybindingChanged', action, binding);
  }
  
  resetKeybinding(action: string): void {
    const defaults = DEFAULT_CONTROL_SETTINGS.keybindings;
    if (defaults[action]) {
      this.settings.controls.keybindings[action] = { ...defaults[action] };
      this.onSettingsChanged('controls');
    }
  }
  
  resetAllKeybindings(): void {
    this.settings.controls.keybindings = { ...DEFAULT_CONTROL_SETTINGS.keybindings };
    this.onSettingsChanged('controls');
    this.emit('allKeybindingsReset');
  }
  
  getKeyForAction(action: string): string | undefined {
    return this.settings.controls.keybindings[action]?.primary;
  }
  
  getActionForKey(key: string): string | undefined {
    for (const [action, binding] of Object.entries(this.settings.controls.keybindings)) {
      if (binding.primary === key || binding.secondary === key) {
        return action;
      }
    }
    return undefined;
  }
  
  // ============================================================================
  // PERSISTENCE
  // ============================================================================
  
  saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const data = {
        version: this.config.version,
        settings: this.settings,
      };
      
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
      this.emit('saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      this.emit('saveError', error);
    }
  }
  
  loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const raw = localStorage.getItem(this.config.storageKey);
      if (!raw) return;
      
      const data = JSON.parse(raw);
      
      // Migration if version mismatch
      if (data.version !== this.config.version) {
        this.migrateSettings(data.settings, data.version);
      } else {
        this.settings = this.mergeWithDefaults(data.settings);
      }
      
      // Validate
      if (this.config.validateOnLoad) {
        this.validate();
      }
      
      this.emit('loaded');
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.emit('loadError', error);
    }
  }
  
  private mergeWithDefaults(loaded: Partial<AllSettings>): AllSettings {
    const defaults = this.getDefaultSettings();
    
    return {
      audio: { ...defaults.audio, ...loaded.audio },
      video: { ...defaults.video, ...loaded.video },
      controls: { 
        ...defaults.controls, 
        ...loaded.controls,
        keybindings: { 
          ...defaults.controls.keybindings, 
          ...loaded.controls?.keybindings 
        },
        gamepadBindings: {
          ...defaults.controls.gamepadBindings,
          ...loaded.controls?.gamepadBindings,
        },
      },
      gameplay: { ...defaults.gameplay, ...loaded.gameplay },
      accessibility: { ...defaults.accessibility, ...loaded.accessibility },
      network: { ...defaults.network, ...loaded.network },
      privacy: { ...defaults.privacy, ...loaded.privacy },
    };
  }
  
  private migrateSettings(settings: unknown, fromVersion: number): void {
    // Implement version migrations here
    console.log(`Migrating settings from v${fromVersion} to v${this.config.version}`);
    
    // For now, just merge with defaults
    this.settings = this.mergeWithDefaults(settings as Partial<AllSettings>);
  }
  
  // ============================================================================
  // VALIDATION
  // ============================================================================
  
  validate(): boolean {
    let valid = true;
    
    // Clamp numeric values
    this.settings.audio.masterVolume = this.clamp(this.settings.audio.masterVolume, 0, 1);
    this.settings.audio.musicVolume = this.clamp(this.settings.audio.musicVolume, 0, 1);
    this.settings.audio.sfxVolume = this.clamp(this.settings.audio.sfxVolume, 0, 1);
    
    this.settings.video.gamma = this.clamp(this.settings.video.gamma, 0.5, 2.0);
    this.settings.video.brightness = this.clamp(this.settings.video.brightness, 0.5, 2.0);
    this.settings.video.fov = this.clamp(this.settings.video.fov, 60, 120);
    this.settings.video.renderScale = this.clamp(this.settings.video.renderScale, 0.25, 2.0);
    
    this.settings.controls.mouseSensitivity = this.clamp(this.settings.controls.mouseSensitivity, 0.1, 5.0);
    this.settings.controls.gamepadDeadzone = this.clamp(this.settings.controls.gamepadDeadzone, 0, 0.5);
    
    return valid;
  }
  
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
  
  // ============================================================================
  // EXPORT/IMPORT
  // ============================================================================
  
  export(): string {
    return JSON.stringify({
      version: this.config.version,
      settings: this.settings,
    }, null, 2);
  }
  
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.settings = this.mergeWithDefaults(parsed.settings);
      this.validate();
      this.saveToStorage();
      this.emit('imported');
      this.emit('changed', this.settings);
    } catch (error) {
      console.error('Failed to import settings:', error);
      throw new Error('Invalid settings data');
    }
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.saveToStorage();
    this.removeAllListeners();
    SettingsManager.instance = null;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

interface SettingsContextValue {
  manager: SettingsManager;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<SettingsConfig>;
}) {
  const value = useMemo(() => ({
    manager: new SettingsManager(config),
  }), [config]);
  
  useEffect(() => {
    return () => {
      value.manager.dispose();
    };
  }, [value]);
  
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return SettingsManager.getInstance();
  }
  return context.manager;
}

export function useAllSettings() {
  const manager = useSettings();
  const [settings, setSettings] = useState<AllSettings>(manager.getAll());
  
  useEffect(() => {
    const update = (s: AllSettings) => setSettings({ ...s });
    manager.on('changed', update);
    
    return () => {
      manager.off('changed', update);
    };
  }, [manager]);
  
  return settings;
}

export function useAudioSettings() {
  const manager = useSettings();
  const [settings, setSettings] = useState<AudioSettings>(manager.getAudio());
  
  useEffect(() => {
    const update = (category: string, s: AudioSettings) => {
      if (category === 'audio') setSettings({ ...s });
    };
    manager.on('categoryChanged', update);
    
    return () => {
      manager.off('categoryChanged', update);
    };
  }, [manager]);
  
  const updateSettings = useCallback((updates: Partial<AudioSettings>) => {
    manager.setAudio(updates);
  }, [manager]);
  
  return [settings, updateSettings] as const;
}

export function useVideoSettings() {
  const manager = useSettings();
  const [settings, setSettings] = useState<VideoSettings>(manager.getVideo());
  
  useEffect(() => {
    const update = (category: string, s: VideoSettings) => {
      if (category === 'video') setSettings({ ...s });
    };
    manager.on('categoryChanged', update);
    
    return () => {
      manager.off('categoryChanged', update);
    };
  }, [manager]);
  
  const updateSettings = useCallback((updates: Partial<VideoSettings>) => {
    manager.setVideo(updates);
  }, [manager]);
  
  return [settings, updateSettings] as const;
}

export function useControlSettings() {
  const manager = useSettings();
  const [settings, setSettings] = useState<ControlSettings>(manager.getControls());
  
  useEffect(() => {
    const update = (category: string, s: ControlSettings) => {
      if (category === 'controls') setSettings({ ...s });
    };
    manager.on('categoryChanged', update);
    
    return () => {
      manager.off('categoryChanged', update);
    };
  }, [manager]);
  
  const updateSettings = useCallback((updates: Partial<ControlSettings>) => {
    manager.setControls(updates);
  }, [manager]);
  
  return [settings, updateSettings] as const;
}

export function useGameplaySettings() {
  const manager = useSettings();
  const [settings, setSettings] = useState<GameplaySettings>(manager.getGameplay());
  
  useEffect(() => {
    const update = (category: string, s: GameplaySettings) => {
      if (category === 'gameplay') setSettings({ ...s });
    };
    manager.on('categoryChanged', update);
    
    return () => {
      manager.off('categoryChanged', update);
    };
  }, [manager]);
  
  const updateSettings = useCallback((updates: Partial<GameplaySettings>) => {
    manager.setGameplay(updates);
  }, [manager]);
  
  return [settings, updateSettings] as const;
}

export function useAccessibilitySettings() {
  const manager = useSettings();
  const [settings, setSettings] = useState<AccessibilitySettings>(manager.getAccessibility());
  
  useEffect(() => {
    const update = (category: string, s: AccessibilitySettings) => {
      if (category === 'accessibility') setSettings({ ...s });
    };
    manager.on('categoryChanged', update);
    
    return () => {
      manager.off('categoryChanged', update);
    };
  }, [manager]);
  
  const updateSettings = useCallback((updates: Partial<AccessibilitySettings>) => {
    manager.setAccessibility(updates);
  }, [manager]);
  
  return [settings, updateSettings] as const;
}

export function useSetting<K extends keyof AllSettings, P extends keyof AllSettings[K]>(
  category: K,
  property: P
): [AllSettings[K][P], (value: AllSettings[K][P]) => void] {
  const manager = useSettings();
  const [value, setValue] = useState<AllSettings[K][P]>(manager.get(category, property));
  
  useEffect(() => {
    const update = (cat: string) => {
      if (cat === category) {
        setValue(manager.get(category, property));
      }
    };
    manager.on('categoryChanged', update);
    
    return () => {
      manager.off('categoryChanged', update);
    };
  }, [manager, category, property]);
  
  const updateValue = useCallback((newValue: AllSettings[K][P]) => {
    manager.set(category, property, newValue);
  }, [manager, category, property]);
  
  return [value, updateValue];
}

const __defaultExport = {
  SettingsManager,
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_VIDEO_SETTINGS,
  DEFAULT_CONTROL_SETTINGS,
  DEFAULT_GAMEPLAY_SETTINGS,
  DEFAULT_ACCESSIBILITY_SETTINGS,
  DEFAULT_NETWORK_SETTINGS,
  DEFAULT_PRIVACY_SETTINGS,
  GRAPHICS_PRESETS,
  DIFFICULTY_PRESETS,
  SettingsProvider,
  useSettings,
  useAllSettings,
  useAudioSettings,
  useVideoSettings,
  useControlSettings,
  useGameplaySettings,
  useAccessibilitySettings,
  useSetting,
};

export default __defaultExport;
