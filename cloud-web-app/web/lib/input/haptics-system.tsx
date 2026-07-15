'use client';

/**
 * Haptics/Rumble System canonical entrypoint.
 *
 * Core runtime, React hooks, contracts and effect presets live in focused
 * modules so haptics can evolve without becoming another UI/runtime monolith.
 */

import { HAPTIC_EFFECTS } from './haptics-system.effects';
import { HapticsSystem } from './haptics-system-core';
import {
  HapticsProvider,
  useGameHaptics,
  useHapticFeedback,
  useHaptics,
  useHapticsEnabled,
  useHapticsIntensity,
  useUIHaptics,
} from './haptics-system-react';

export { HAPTIC_EFFECTS } from './haptics-system.effects';
export type { GamepadHapticState, HapticEffect, HapticEvent, HapticMotor, HapticPulse, HapticType, HapticsConfig } from './haptics-system.contracts';
export { HapticsSystem } from './haptics-system-core';
export {
  HapticsProvider,
  useGameHaptics,
  useHapticFeedback,
  useHaptics,
  useHapticsEnabled,
  useHapticsIntensity,
  useUIHaptics,
} from './haptics-system-react';

const __defaultExport = {
  HapticsSystem,
  HAPTIC_EFFECTS,
  HapticsProvider,
  useHaptics,
  useHapticFeedback,
  useGameHaptics,
  useUIHaptics,
  useHapticsEnabled,
  useHapticsIntensity,
};

export default __defaultExport;
