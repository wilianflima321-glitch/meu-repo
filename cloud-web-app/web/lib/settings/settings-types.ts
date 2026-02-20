/**
 * Shared settings contracts for runtime settings system.
 */

export type GraphicsQuality = 'very_low' | 'low' | 'medium' | 'high' | 'ultra' | 'custom';
export type Difficulty = 'story' | 'easy' | 'normal' | 'hard' | 'nightmare' | 'custom';
export type TextSize = 'small' | 'medium' | 'large' | 'extra_large';
export type ColorBlindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
  ambientVolume: number;
  uiVolume: number;
  muted: boolean;
  dynamicRange: 'full' | 'medium' | 'narrow';
  speakerMode: 'stereo' | 'surround_5_1' | 'surround_7_1' | 'headphones';
  voiceChat: boolean;
  voiceChatVolume: number;
  pushToTalk: boolean;
  pushToTalkKey: string;
}

export interface VideoSettings {
  resolution: { width: number; height: number };
  windowMode: 'fullscreen' | 'windowed' | 'borderless';
  vsync: boolean;
  fpsLimit: number;
  graphicsQuality: GraphicsQuality;
  
  // Quality settings
  textureQuality: 'low' | 'medium' | 'high' | 'ultra';
  shadowQuality: 'off' | 'low' | 'medium' | 'high' | 'ultra';
  shadowDistance: number;
  antialiasing: 'off' | 'fxaa' | 'smaa' | 'taa' | 'msaa_2x' | 'msaa_4x' | 'msaa_8x';
  anisotropicFiltering: 'off' | '2x' | '4x' | '8x' | '16x';
  viewDistance: number;
  foliageDistance: number;
  foliageDensity: number;
  
  // Effects
  ambientOcclusion: 'off' | 'ssao' | 'hbao' | 'gtao';
  bloom: boolean;
  bloomIntensity: number;
  motionBlur: boolean;
  motionBlurStrength: number;
  depthOfField: boolean;
  chromaticAberration: boolean;
  filmGrain: boolean;
  filmGrainIntensity: number;
  vignette: boolean;
  vignetteIntensity: number;
  
  // Performance
  dynamicResolution: boolean;
  dynamicResolutionTarget: number;
  renderScale: number;
  lodBias: number;
  
  // Display
  gamma: number;
  brightness: number;
  contrast: number;
  colorTemperature: number;
  hdrEnabled: boolean;
  hdrMaxBrightness: number;
  fov: number;
}

export interface ControlSettings {
  // Mouse
  mouseSensitivity: number;
  mouseAimSensitivity: number;
  mouseSmoothing: boolean;
  invertMouseX: boolean;
  invertMouseY: boolean;
  rawMouseInput: boolean;
  
  // Gamepad
  gamepadEnabled: boolean;
  gamepadVibration: boolean;
  gamepadVibrationIntensity: number;
  gamepadDeadzone: number;
  gamepadSensitivity: number;
  gamepadAimSensitivity: number;
  invertGamepadX: boolean;
  invertGamepadY: boolean;
  triggerDeadzone: number;
  
  // Keybindings
  keybindings: Record<string, KeyBinding>;
  gamepadBindings: Record<string, GamepadBinding>;
  
  // Advanced
  toggleSprint: boolean;
  toggleCrouch: boolean;
  toggleAim: boolean;
  holdToInteract: boolean;
  autoReload: boolean;
}

export interface KeyBinding {
  primary: string;
  secondary?: string;
  modifiers?: string[];
}

export interface GamepadBinding {
  button?: string;
  axis?: string;
  inverted?: boolean;
}

export interface GameplaySettings {
  difficulty: Difficulty;
  
  // Difficulty modifiers (for custom)
  damageReceived: number;
  damageDealt: number;
  resourceScarcity: number;
  enemyAggression: number;
  enemyHealth: number;
  
  // HUD
  showHUD: boolean;
  showMinimap: boolean;
  showCompass: boolean;
  showObjectiveMarkers: boolean;
  showDamageNumbers: boolean;
  showHealthBars: boolean;
  showInteractionPrompts: boolean;
  showTutorialHints: boolean;
  
  // Camera
  cameraShake: boolean;
  cameraShakeIntensity: number;
  headBob: boolean;
  headBobIntensity: number;
  
  // Assists
  autoAim: boolean;
  autoAimStrength: number;
  aimAssist: boolean;
  aimAssistStrength: number;
  lockOnTarget: boolean;
  
  // Misc
  pauseOnFocusLoss: boolean;
  skipCutscenes: boolean;
  autoSaveFrequency: number; // minutes
}

export interface AccessibilitySettings {
  // Visual
  textSize: TextSize;
  uiScale: number;
  colorBlindMode: ColorBlindMode;
  colorBlindIntensity: number;
  highContrast: boolean;
  screenReader: boolean;
  flashingEffects: boolean;
  
  // Audio
  subtitles: boolean;
  subtitleSize: TextSize;
  subtitleBackground: boolean;
  subtitleSpeakerName: boolean;
  closedCaptions: boolean;
  monoAudio: boolean;
  
  // Controls
  reducedMotion: boolean;
  stickyKeys: boolean;
  holdButtonDuration: number;
  quickTimeEventAssist: boolean;
  oneHandedMode: boolean;
  
  // Gameplay
  invincibility: boolean;
  infiniteResources: boolean;
  skipPuzzles: boolean;
  autoCompleteQTE: boolean;
  narratorEnabled: boolean;
  narratorSpeed: number;
  
  // Language
  language: string;
  voiceLanguage: string;
  textLanguage: string;
}

export interface NetworkSettings {
  matchmakingRegion: string;
  connectionQuality: 'auto' | 'low' | 'medium' | 'high';
  maxPlayers: number;
  allowCrossplay: boolean;
  showOnlineStatus: boolean;
  allowInvites: boolean;
  voiceChatEnabled: boolean;
  textChatEnabled: boolean;
  profanityFilter: boolean;
  showPlayerNames: boolean;
}

export interface PrivacySettings {
  shareUsageData: boolean;
  shareErrorReports: boolean;
  personalizationEnabled: boolean;
  thirdPartyIntegration: boolean;
  streamingMode: boolean;
  hidePersonalInfo: boolean;
}

export interface AllSettings {
  audio: AudioSettings;
  video: VideoSettings;
  controls: ControlSettings;
  gameplay: GameplaySettings;
  accessibility: AccessibilitySettings;
  network: NetworkSettings;
  privacy: PrivacySettings;
}

export interface SettingsPreset {
  name: string;
  description: string;
  settings: Partial<AllSettings>;
}

export interface SettingsConfig {
  storageKey: string;
  version: number;
  autoSave: boolean;
  validateOnLoad: boolean;
}
