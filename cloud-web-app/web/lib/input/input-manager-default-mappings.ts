import type { InputAction, InputAxis } from './input-manager-types';

export const DEFAULT_INPUT_ACTIONS: InputAction[] = [
  {
    name: 'move_forward',
    bindings: [
      { device: 'keyboard', key: 'KeyW' },
      { device: 'keyboard', key: 'ArrowUp' },
    ],
  },
  {
    name: 'move_backward',
    bindings: [
      { device: 'keyboard', key: 'KeyS' },
      { device: 'keyboard', key: 'ArrowDown' },
    ],
  },
  {
    name: 'move_left',
    bindings: [
      { device: 'keyboard', key: 'KeyA' },
      { device: 'keyboard', key: 'ArrowLeft' },
    ],
  },
  {
    name: 'move_right',
    bindings: [
      { device: 'keyboard', key: 'KeyD' },
      { device: 'keyboard', key: 'ArrowRight' },
    ],
  },
  {
    name: 'jump',
    bindings: [
      { device: 'keyboard', key: 'Space' },
      { device: 'gamepad', button: 'a' },
    ],
  },
  {
    name: 'crouch',
    bindings: [
      { device: 'keyboard', key: 'ControlLeft' },
      { device: 'gamepad', button: 'b' },
    ],
  },
  {
    name: 'sprint',
    bindings: [
      { device: 'keyboard', key: 'ShiftLeft' },
      { device: 'gamepad', button: 'ls' },
    ],
  },
  {
    name: 'interact',
    bindings: [
      { device: 'keyboard', key: 'KeyE' },
      { device: 'gamepad', button: 'x' },
    ],
  },
  {
    name: 'attack',
    bindings: [
      { device: 'mouse', button: 'left' },
      { device: 'gamepad', button: 'rt' },
    ],
  },
  {
    name: 'aim',
    bindings: [
      { device: 'mouse', button: 'right' },
      { device: 'gamepad', button: 'lt' },
    ],
  },
];

export const DEFAULT_INPUT_AXES: InputAxis[] = [
  {
    name: 'horizontal',
    positiveBindings: [
      { device: 'keyboard', key: 'KeyD' },
      { device: 'keyboard', key: 'ArrowRight' },
      { device: 'gamepad', axis: 'left_x' },
    ],
    negativeBindings: [
      { device: 'keyboard', key: 'KeyA' },
      { device: 'keyboard', key: 'ArrowLeft' },
    ],
    gravity: 3,
    sensitivity: 3,
    snap: true,
  },
  {
    name: 'vertical',
    positiveBindings: [
      { device: 'keyboard', key: 'KeyW' },
      { device: 'keyboard', key: 'ArrowUp' },
    ],
    negativeBindings: [
      { device: 'keyboard', key: 'KeyS' },
      { device: 'keyboard', key: 'ArrowDown' },
      { device: 'gamepad', axis: 'left_y' },
    ],
    gravity: 3,
    sensitivity: 3,
    snap: true,
  },
  {
    name: 'look_horizontal',
    positiveBindings: [{ device: 'gamepad', axis: 'right_x' }],
    negativeBindings: [],
    gravity: 0,
    sensitivity: 1,
  },
  {
    name: 'look_vertical',
    positiveBindings: [],
    negativeBindings: [{ device: 'gamepad', axis: 'right_y' }],
    gravity: 0,
    sensitivity: 1,
  },
];

export function registerDefaultInputMappings(
  registerAction: (action: InputAction) => void,
  registerAxis: (axis: InputAxis) => void
): void {
  for (const action of DEFAULT_INPUT_ACTIONS) {
    registerAction(action);
  }
  for (const axis of DEFAULT_INPUT_AXES) {
    registerAxis(axis);
  }
}

