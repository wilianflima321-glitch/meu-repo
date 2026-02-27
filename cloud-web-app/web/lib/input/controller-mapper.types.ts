export type GamepadButton =
  | 'A' | 'B' | 'X' | 'Y'
  | 'LB' | 'RB' | 'LT' | 'RT'
  | 'BACK' | 'START' | 'GUIDE'
  | 'LS' | 'RS'
  | 'DPAD_UP' | 'DPAD_DOWN' | 'DPAD_LEFT' | 'DPAD_RIGHT';

export type GamepadAxis = 
  | 'LEFT_X' | 'LEFT_Y'
  | 'RIGHT_X' | 'RIGHT_Y'
  | 'LT' | 'RT';

export type GameAction = string;

export interface ButtonMapping {
  button: GamepadButton;
  action: GameAction;
  modifiers?: GamepadButton[];
  holdDuration?: number; // Hold for action
  doubleTapWindow?: number; // Double tap
  onPress?: boolean;
  onRelease?: boolean;
  onHold?: boolean;
}

export interface AxisMapping {
  axis: GamepadAxis;
  action: GameAction;
  inverted?: boolean;
  deadzone?: number;
  sensitivity?: number;
  curve?: 'linear' | 'exponential' | 'cubic' | 'custom';
  customCurve?: (value: number) => number;
}

export interface ControllerProfile {
  id: string;
  name: string;
  description?: string;
  buttons: ButtonMapping[];
  axes: AxisMapping[];
  globalDeadzone: number;
  globalSensitivity: number;
  triggerAsButton: boolean;
  triggerThreshold: number;
  vibrationEnabled: boolean;
  vibrationIntensity: number;
  created: number;
  modified: number;
}

export interface ConnectedController {
  id: string;
  index: number;
  name: string;
  vendor: string;
  product: string;
  connected: boolean;
  mapping: string;
  axes: number;
  buttons: number;
  hapticActuators: boolean;
  profile: string | null;
  state: ControllerState;
}

export interface ControllerState {
  buttons: Map<GamepadButton, ButtonState>;
  axes: Map<GamepadAxis, number>;
  timestamp: number;
}

export interface ButtonState {
  pressed: boolean;
  touched?: boolean;
  value: number;
  pressedAt: number;
  lastPressedAt: number;
  tapCount: number;
}

export interface ControllerMapperConfig {
  pollInterval: number;
  defaultDeadzone: number;
  defaultSensitivity: number;
  doubleTapWindow: number;
  holdDuration: number;
  triggerThreshold: number;
  autoConnectProfile: boolean;
  maxControllers: number;
  enableDebug: boolean;
}

// ============================================================================
// STANDARD BUTTON MAPPINGS
// ============================================================================

export const STANDARD_BUTTON_MAP: Record<number, GamepadButton> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'BACK',
  9: 'START',
  10: 'LS',
  11: 'RS',
  12: 'DPAD_UP',
  13: 'DPAD_DOWN',
  14: 'DPAD_LEFT',
  15: 'DPAD_RIGHT',
  16: 'GUIDE',
};

export const STANDARD_AXIS_MAP: Record<number, GamepadAxis> = {
  0: 'LEFT_X',
  1: 'LEFT_Y',
  2: 'RIGHT_X',
  3: 'RIGHT_Y',
};

// ============================================================================
// DEFAULT PROFILES
// ============================================================================

export const DEFAULT_PROFILES: ControllerProfile[] = [
  {
    id: 'default-fps',
    name: 'FPS Default',
    description: 'Standard FPS controls',
    buttons: [
      { button: 'A', action: 'jump', onPress: true },
      { button: 'B', action: 'crouch', onPress: true },
      { button: 'X', action: 'reload', onPress: true },
      { button: 'Y', action: 'switchWeapon', onPress: true },
      { button: 'LB', action: 'grenade', onPress: true },
      { button: 'RB', action: 'melee', onPress: true },
      { button: 'LT', action: 'aim', onPress: true, onRelease: true },
      { button: 'RT', action: 'shoot', onPress: true, onHold: true },
      { button: 'LS', action: 'sprint', onPress: true },
      { button: 'RS', action: 'meleeAlt', onPress: true },
      { button: 'START', action: 'pause', onPress: true },
      { button: 'BACK', action: 'scoreboard', onPress: true },
      { button: 'DPAD_UP', action: 'equipPrimary', onPress: true },
      { button: 'DPAD_DOWN', action: 'equipSecondary', onPress: true },
      { button: 'DPAD_LEFT', action: 'equipTactical', onPress: true },
      { button: 'DPAD_RIGHT', action: 'equipLethal', onPress: true },
    ],
    axes: [
      { axis: 'LEFT_X', action: 'moveX', sensitivity: 1.0 },
      { axis: 'LEFT_Y', action: 'moveY', sensitivity: 1.0, inverted: false },
      { axis: 'RIGHT_X', action: 'lookX', sensitivity: 1.0 },
      { axis: 'RIGHT_Y', action: 'lookY', sensitivity: 1.0, inverted: true },
    ],
    globalDeadzone: 0.15,
    globalSensitivity: 1.0,
    triggerAsButton: false,
    triggerThreshold: 0.5,
    vibrationEnabled: true,
    vibrationIntensity: 1.0,
    created: Date.now(),
    modified: Date.now(),
  },
  {
    id: 'default-racing',
    name: 'Racing Default',
    description: 'Standard racing controls',
    buttons: [
      { button: 'A', action: 'nitro', onPress: true },
      { button: 'B', action: 'handbrake', onPress: true, onRelease: true },
      { button: 'X', action: 'lookBack', onPress: true },
      { button: 'Y', action: 'resetCar', onPress: true },
      { button: 'LB', action: 'shiftDown', onPress: true },
      { button: 'RB', action: 'shiftUp', onPress: true },
      { button: 'START', action: 'pause', onPress: true },
      { button: 'BACK', action: 'rewind', onPress: true },
    ],
    axes: [
      { axis: 'LEFT_X', action: 'steer', sensitivity: 1.0, curve: 'cubic' },
      { axis: 'LT', action: 'brake', sensitivity: 1.0 },
      { axis: 'RT', action: 'accelerate', sensitivity: 1.0 },
      { axis: 'RIGHT_X', action: 'camera', sensitivity: 0.5 },
    ],
    globalDeadzone: 0.1,
    globalSensitivity: 1.0,
    triggerAsButton: false,
    triggerThreshold: 0.3,
    vibrationEnabled: true,
    vibrationIntensity: 1.0,
    created: Date.now(),
    modified: Date.now(),
  },
  {
    id: 'default-rpg',
    name: 'RPG Default',
    description: 'Standard RPG controls',
    buttons: [
      { button: 'A', action: 'interact', onPress: true },
      { button: 'B', action: 'cancel', onPress: true },
      { button: 'X', action: 'attack', onPress: true },
      { button: 'Y', action: 'special', onPress: true },
      { button: 'LB', action: 'prevItem', onPress: true },
      { button: 'RB', action: 'nextItem', onPress: true },
      { button: 'LT', action: 'block', onPress: true, onRelease: true },
      { button: 'RT', action: 'heavyAttack', onPress: true },
      { button: 'LS', action: 'sprint', onPress: true },
      { button: 'RS', action: 'lockOn', onPress: true },
      { button: 'START', action: 'menu', onPress: true },
      { button: 'BACK', action: 'map', onPress: true },
      { button: 'DPAD_UP', action: 'useItem', onPress: true },
      { button: 'DPAD_DOWN', action: 'crouch', onPress: true },
      { button: 'DPAD_LEFT', action: 'quickSlot1', onPress: true },
      { button: 'DPAD_RIGHT', action: 'quickSlot2', onPress: true },
    ],
    axes: [
      { axis: 'LEFT_X', action: 'moveX', sensitivity: 1.0 },
      { axis: 'LEFT_Y', action: 'moveY', sensitivity: 1.0, inverted: false },
      { axis: 'RIGHT_X', action: 'cameraX', sensitivity: 1.0 },
      { axis: 'RIGHT_Y', action: 'cameraY', sensitivity: 1.0, inverted: true },
    ],
    globalDeadzone: 0.15,
    globalSensitivity: 1.0,
    triggerAsButton: false,
    triggerThreshold: 0.5,
    vibrationEnabled: true,
    vibrationIntensity: 1.0,
    created: Date.now(),
    modified: Date.now(),
  },
];
