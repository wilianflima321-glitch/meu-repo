/**
 * Input Manager - split runtime modules.
 *
 * Keyboard, mouse, touch, and gamepad runtime is isolated from public shells so
 * game/editor surfaces can load it only when interactive controls are needed.
 */

import type { GamepadAxis, GamepadButton, MouseButton } from './types';

export const MOUSE_BUTTON_MAP: Record<number, MouseButton> = {
  0: 'left',
  1: 'middle',
  2: 'right',
  3: 'back',
  4: 'forward',
};

export const GAMEPAD_BUTTON_MAP: Record<number, GamepadButton> = {
  0: 'a',
  1: 'b',
  2: 'x',
  3: 'y',
  4: 'lb',
  5: 'rb',
  6: 'lt',
  7: 'rt',
  8: 'back',
  9: 'start',
  10: 'guide',
  11: 'ls',
  12: 'rs',
  13: 'dpad_up',
  14: 'dpad_down',
  15: 'dpad_left',
  16: 'dpad_right',
};

export const GAMEPAD_AXIS_MAP: Record<number, GamepadAxis> = {
  0: 'left_x',
  1: 'left_y',
  2: 'right_x',
  3: 'right_y',
};

// ============================================================================
// INPUT MANAGER
// ============================================================================
