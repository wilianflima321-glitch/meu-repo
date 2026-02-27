export type InputDeviceType = 'keyboard' | 'mouse' | 'gamepad' | 'touch';

export type KeyCode = string; // e.g., 'KeyW', 'Space', 'MouseLeft', 'Gamepad0_A'

export interface InputBinding {
  action: string;
  keys: KeyCode[];
  modifiers?: KeyCode[];
  holdTime?: number; // For hold actions
  tapCount?: number; // For multi-tap
}

export interface InputAction {
  name: string;
  type: 'button' | 'axis' | 'axis2d';
  defaultBindings: InputBinding[];
}

export interface InputContext {
  name: string;
  priority: number;
  actions: InputAction[];
  consumeInput: boolean;
  enabled: boolean;
}

export interface ComboStep {
  action: string;
  maxDelay: number;
}

export interface InputCombo {
  name: string;
  steps: ComboStep[];
  onComplete: () => void;
}

export interface GestureConfig {
  type: 'swipe' | 'pinch' | 'rotate' | 'tap' | 'hold';
  minDistance?: number;
  maxTime?: number;
  fingers?: number;
}

export interface InputState {
  pressed: Set<string>;
  justPressed: Set<string>;
  justReleased: Set<string>;
  axisValues: Map<string, number>;
  axis2DValues: Map<string, { x: number; y: number }>;
  mousePosition: { x: number; y: number };
  mouseDelta: { x: number; y: number };
}

export interface RecordedInput {
  timestamp: number;
  type: 'press' | 'release' | 'axis' | 'mouse';
  key?: string;
  value?: number | { x: number; y: number };
}
