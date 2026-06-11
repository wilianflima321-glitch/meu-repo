import type { PlayerState, SettingsState, StatisticsState, WorldState } from './types';

export function createDefaultPlayerState(): PlayerState {
  return {
    id: 'player_1',
    name: 'Player',
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0, w: 1 },
    health: 100,
    maxHealth: 100,
    level: 1,
    experience: 0,
    attributes: {},
    skills: {},
    abilities: [],
    equipment: {},
    statusEffects: [],
  };
}

export function createDefaultWorldState(): WorldState {
  return {
    scene: 'main',
    time: 0,
    weather: 'clear',
    entities: [],
    triggers: {},
    doors: {},
    containers: {},
    npcs: {},
  };
}

export function createDefaultSettings(): SettingsState {
  return {
    audio: {
      masterVolume: 1,
      musicVolume: 0.8,
      sfxVolume: 1,
      voiceVolume: 1,
      ambientVolume: 0.7,
      muted: false,
    },
    video: {
      resolution: { width: 1920, height: 1080 },
      fullscreen: true,
      vsync: true,
      fpsLimit: 60,
      quality: 'high',
      shadows: true,
      antialiasing: true,
      motionBlur: false,
      bloom: true,
    },
    controls: {
      keybindings: {},
      mouseSensitivity: 1,
      invertY: false,
      gamepadEnabled: true,
      vibration: true,
    },
    gameplay: {
      difficulty: 'normal',
      autoAim: false,
      subtitles: true,
      hints: true,
      language: 'en',
    },
  };
}

export function createDefaultStatistics(): StatisticsState {
  return {
    totalPlayTime: 0,
    deaths: 0,
    kills: 0,
    distanceTraveled: 0,
    itemsCollected: 0,
    questsCompleted: 0,
    achievementsUnlocked: [],
    custom: {},
  };
}
