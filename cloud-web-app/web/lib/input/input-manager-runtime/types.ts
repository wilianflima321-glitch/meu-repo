/**
 * Input Manager - split runtime modules.
 *
 * Keyboard, mouse, touch, and gamepad runtime is isolated from public shells so
 * game/editor surfaces can load it only when interactive controls are needed.
 */

export type InputDeviceType = 'keyboard' | 'mouse' | 'gamepad' | 'touch';

export type KeyCode = string; // e.g., 'KeyW', 'Space', 'ArrowUp'

export type MouseButton = 'left' | 'right' | 'middle' | 'back' | 'forward';

export type GamepadButton = 
  | 'a' | 'b' | 'x' | 'y'
  | 'lb' | 'rb' | 'lt' | 'rt'
  | 'back' | 'start' | 'guide'
  | 'ls' | 'rs'
  | 'dpad_up' | 'dpad_down' | 'dpad_left' | 'dpad_right';

export type GamepadAxis = 
  | 'left_x' | 'left_y' 
  | 'right_x' | 'right_y'
  | 'lt' | 'rt';

export interface InputBinding {
  device: InputDeviceType;
  key?: KeyCode;
  button?: MouseButton | GamepadButton;
  axis?: GamepadAxis;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  scale?: number;
  deadzone?: number;
}

export interface InputAction {
  name: string;
  bindings: InputBinding[];
  consumeInput?: boolean;
}

export interface InputAxis {
  name: string;
  positiveBindings: InputBinding[];
  negativeBindings: InputBinding[];
  gravity?: number;
  sensitivity?: number;
  snap?: boolean;
  deadzone?: number;
}

export interface InputState {
  actions: Map<string, boolean>;
  axes: Map<string, number>;
  mousePosition: { x: number; y: number };
  mouseDelta: { x: number; y: number };
  scroll: { x: number; y: number };
  touches: Touch[];
}

export interface Touch {
  id: number;
  position: { x: number; y: number };
  startPosition: { x: number; y: number };
  delta: { x: number; y: number };
  pressure: number;
  isActive: boolean;
}

export interface Gesture {
  type: 'tap' | 'double_tap' | 'long_press' | 'swipe' | 'pinch' | 'rotate';
  position?: { x: number; y: number };
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: number;
  rotation?: number;
}

export interface InputBuffer {
  action: string;
  timestamp: number;
  device: InputDeviceType;
}

// ============================================================================
// CONSTANTS
// ============================================================================
