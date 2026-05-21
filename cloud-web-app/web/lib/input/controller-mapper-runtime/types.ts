/**
 * Controller Mapper - split input runtime.
 *
 * Gamepad mapping and hooks are isolated so game/editor surfaces can load them
 * without making public shells pay for controller support.
 */

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
