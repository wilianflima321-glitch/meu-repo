import type { HapticEffect } from './haptics-system.contracts';

export const HAPTIC_EFFECTS: Record<string, HapticEffect> = {
  // Basic effects
  light_tap: {
    name: 'Light Tap',
    pattern: [{ duration: 15, weakMagnitude: 0.3, strongMagnitude: 0 }],
  },
  medium_tap: {
    name: 'Medium Tap',
    pattern: [{ duration: 25, weakMagnitude: 0.5, strongMagnitude: 0.2 }],
  },
  heavy_tap: {
    name: 'Heavy Tap',
    pattern: [{ duration: 40, weakMagnitude: 0.7, strongMagnitude: 0.5 }],
  },

  // Selection
  selection: {
    name: 'Selection',
    pattern: [{ duration: 10, weakMagnitude: 0.2, strongMagnitude: 0 }],
  },

  // Impact effects
  impact_light: {
    name: 'Impact Light',
    pattern: [
      { duration: 20, weakMagnitude: 0.4, strongMagnitude: 0.1 },
    ],
  },
  impact_medium: {
    name: 'Impact Medium',
    pattern: [
      { duration: 35, weakMagnitude: 0.6, strongMagnitude: 0.4 },
    ],
  },
  impact_heavy: {
    name: 'Impact Heavy',
    pattern: [
      { duration: 50, weakMagnitude: 0.8, strongMagnitude: 0.8 },
    ],
  },

  // Continuous effects
  continuous_light: {
    name: 'Continuous Light',
    pattern: [
      { duration: 100, weakMagnitude: 0.3, strongMagnitude: 0 },
    ],
    loop: true,
  },
  continuous_medium: {
    name: 'Continuous Medium',
    pattern: [
      { duration: 100, weakMagnitude: 0.5, strongMagnitude: 0.2 },
    ],
    loop: true,
  },
  continuous_heavy: {
    name: 'Continuous Heavy',
    pattern: [
      { duration: 100, weakMagnitude: 0.8, strongMagnitude: 0.6 },
    ],
    loop: true,
  },

  // Game events
  damage: {
    name: 'Damage',
    pattern: [
      { duration: 100, weakMagnitude: 0.7, strongMagnitude: 0.9 },
      { duration: 50, weakMagnitude: 0.3, strongMagnitude: 0.4, delay: 50 },
    ],
  },
  explosion: {
    name: 'Explosion',
    pattern: [
      { duration: 150, weakMagnitude: 1.0, strongMagnitude: 1.0 },
      { duration: 100, weakMagnitude: 0.6, strongMagnitude: 0.8, delay: 30 },
      { duration: 80, weakMagnitude: 0.3, strongMagnitude: 0.5, delay: 30 },
    ],
  },
  gunshot: {
    name: 'Gunshot',
    pattern: [
      { duration: 60, weakMagnitude: 0.8, strongMagnitude: 1.0 },
      { duration: 30, weakMagnitude: 0.2, strongMagnitude: 0.3, delay: 20 },
    ],
  },
  punch: {
    name: 'Punch',
    pattern: [
      { duration: 40, weakMagnitude: 0.6, strongMagnitude: 0.8 },
    ],
  },
  footstep: {
    name: 'Footstep',
    pattern: [
      { duration: 20, weakMagnitude: 0.2, strongMagnitude: 0.1 },
    ],
  },
  jump: {
    name: 'Jump',
    pattern: [
      { duration: 30, weakMagnitude: 0.4, strongMagnitude: 0.3 },
    ],
  },
  land: {
    name: 'Land',
    pattern: [
      { duration: 50, weakMagnitude: 0.5, strongMagnitude: 0.6 },
    ],
  },
  heal: {
    name: 'Heal',
    pattern: [
      { duration: 100, weakMagnitude: 0.2, strongMagnitude: 0 },
      { duration: 100, weakMagnitude: 0.3, strongMagnitude: 0.1, delay: 100 },
      { duration: 100, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 100 },
    ],
  },
  pickup: {
    name: 'Pickup',
    pattern: [
      { duration: 25, weakMagnitude: 0.3, strongMagnitude: 0.1 },
      { duration: 25, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 50 },
    ],
  },

  // UI effects
  button_press: {
    name: 'Button Press',
    pattern: [{ duration: 10, weakMagnitude: 0.15, strongMagnitude: 0 }],
  },
  menu_navigate: {
    name: 'Menu Navigate',
    pattern: [{ duration: 8, weakMagnitude: 0.1, strongMagnitude: 0 }],
  },
  confirm: {
    name: 'Confirm',
    pattern: [
      { duration: 20, weakMagnitude: 0.3, strongMagnitude: 0.1 },
      { duration: 15, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 50 },
    ],
  },
  cancel: {
    name: 'Cancel',
    pattern: [
      { duration: 30, weakMagnitude: 0.2, strongMagnitude: 0.1 },
    ],
  },
  error: {
    name: 'Error',
    pattern: [
      { duration: 50, weakMagnitude: 0.5, strongMagnitude: 0.3 },
      { duration: 30, weakMagnitude: 0.3, strongMagnitude: 0.2, delay: 100 },
      { duration: 50, weakMagnitude: 0.5, strongMagnitude: 0.3, delay: 100 },
    ],
  },
  success: {
    name: 'Success',
    pattern: [
      { duration: 20, weakMagnitude: 0.2, strongMagnitude: 0 },
      { duration: 30, weakMagnitude: 0.3, strongMagnitude: 0.1, delay: 80 },
      { duration: 40, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 80 },
    ],
  },
  warning: {
    name: 'Warning',
    pattern: [
      { duration: 100, weakMagnitude: 0.4, strongMagnitude: 0.2 },
      { duration: 100, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 150 },
    ],
  },

  // Vehicle effects
  engine_idle: {
    name: 'Engine Idle',
    pattern: [
      { duration: 50, weakMagnitude: 0.15, strongMagnitude: 0.05 },
      { duration: 50, weakMagnitude: 0.1, strongMagnitude: 0.03, delay: 20 },
    ],
    loop: true,
  },
  engine_rev: {
    name: 'Engine Rev',
    pattern: [
      { duration: 80, weakMagnitude: 0.4, strongMagnitude: 0.3 },
    ],
    loop: true,
  },
  collision: {
    name: 'Collision',
    pattern: [
      { duration: 100, weakMagnitude: 0.9, strongMagnitude: 1.0 },
      { duration: 80, weakMagnitude: 0.5, strongMagnitude: 0.6, delay: 20 },
    ],
  },

  // Environmental
  rumble: {
    name: 'Rumble',
    pattern: [
      { duration: 200, weakMagnitude: 0.3, strongMagnitude: 0.4 },
    ],
    loop: true,
  },
  earthquake: {
    name: 'Earthquake',
    pattern: [
      { duration: 100, weakMagnitude: 0.6, strongMagnitude: 0.8 },
      { duration: 50, weakMagnitude: 0.3, strongMagnitude: 0.4, delay: 50 },
      { duration: 100, weakMagnitude: 0.7, strongMagnitude: 0.9, delay: 50 },
      { duration: 50, weakMagnitude: 0.4, strongMagnitude: 0.5, delay: 50 },
    ],
    loop: true,
  },
  rain: {
    name: 'Rain',
    pattern: [
      { duration: 30, weakMagnitude: 0.05, strongMagnitude: 0 },
      { duration: 20, weakMagnitude: 0.08, strongMagnitude: 0, delay: 100 },
      { duration: 25, weakMagnitude: 0.06, strongMagnitude: 0, delay: 80 },
    ],
    loop: true,
  },
};
