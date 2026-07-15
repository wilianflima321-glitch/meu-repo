import type { GameState } from './types';

export function createDefaultGameState(version: string): GameState {
  return {
    version,
    player: {
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      stamina: 100,
      maxStamina: 100,
      experience: 0,
      level: 1,
      stats: {
        strength: 10,
        dexterity: 10,
        intelligence: 10,
        vitality: 10,
      },
      skills: {},
      buffs: [],
      equipment: {},
    },
    world: {
      currentScene: 'starting_area',
      discoveredLocations: ['starting_area'],
      unlockedAreas: ['starting_area'],
      worldTime: 0,
      entities: [],
      destructibles: {},
      switches: {},
      doors: {},
      npcs: {},
    },
    inventory: {
      items: [],
      currency: { gold: 0, gems: 0 },
      maxSlots: 30,
      equippedItems: {},
    },
    quests: {
      activeQuests: [],
      completedQuests: [],
      failedQuests: [],
      questVariables: {},
    },
    settings: {
      difficulty: 'normal',
      language: 'en',
      subtitles: true,
      hints: true,
    },
    customSections: new Map(),
  };
}
