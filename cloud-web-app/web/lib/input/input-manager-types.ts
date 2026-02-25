export type InputDeviceType = 'keyboard' | 'mouse' | 'gamepad' | 'touch';

export type KeyCode = string; // e.g., 'KeyW', 'Space', 'ArrowUp'

export type MouseButton = 'left' | 'right' | 'middle' | 'back' | 'forward';

export type GamepadButton =
  | 'a'
  | 'b'
  | 'x'
  | 'y'
  | 'lb'
  | 'rb'
  | 'lt'
  | 'rt'
  | 'back'
  | 'start'
  | 'guide'
  | 'ls'
  | 'rs'
  | 'dpad_up'
  | 'dpad_down'
  | 'dpad_left'
  | 'dpad_right';

export type GamepadAxis = 'left_x' | 'left_y' | 'right_x' | 'right_y' | 'lt' | 'rt';

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

