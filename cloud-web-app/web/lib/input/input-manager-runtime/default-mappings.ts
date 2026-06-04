import type { InputAction, InputAxis } from './types';

type InputMappingRegistrar = Pick<
  { registerAction(action: InputAction): void; registerAxis(axis: InputAxis): void },
  'registerAction' | 'registerAxis'
>;

export function registerDefaultInputMappings(manager: InputMappingRegistrar): void {
    // Default movement actions
    manager.registerAction({
      name: 'move_forward',
      bindings: [
        { device: 'keyboard', key: 'KeyW' },
        { device: 'keyboard', key: 'ArrowUp' },
      ],
    });

    manager.registerAction({
      name: 'move_backward',
      bindings: [
        { device: 'keyboard', key: 'KeyS' },
        { device: 'keyboard', key: 'ArrowDown' },
      ],
    });

    manager.registerAction({
      name: 'move_left',
      bindings: [
        { device: 'keyboard', key: 'KeyA' },
        { device: 'keyboard', key: 'ArrowLeft' },
      ],
    });

    manager.registerAction({
      name: 'move_right',
      bindings: [
        { device: 'keyboard', key: 'KeyD' },
        { device: 'keyboard', key: 'ArrowRight' },
      ],
    });

    manager.registerAction({
      name: 'jump',
      bindings: [
        { device: 'keyboard', key: 'Space' },
        { device: 'gamepad', button: 'a' },
      ],
    });

    manager.registerAction({
      name: 'crouch',
      bindings: [
        { device: 'keyboard', key: 'ControlLeft' },
        { device: 'gamepad', button: 'b' },
      ],
    });

    manager.registerAction({
      name: 'sprint',
      bindings: [
        { device: 'keyboard', key: 'ShiftLeft' },
        { device: 'gamepad', button: 'ls' },
      ],
    });

    manager.registerAction({
      name: 'interact',
      bindings: [
        { device: 'keyboard', key: 'KeyE' },
        { device: 'gamepad', button: 'x' },
      ],
    });

    manager.registerAction({
      name: 'attack',
      bindings: [
        { device: 'mouse', button: 'left' },
        { device: 'gamepad', button: 'rt' },
      ],
    });

    manager.registerAction({
      name: 'aim',
      bindings: [
        { device: 'mouse', button: 'right' },
        { device: 'gamepad', button: 'lt' },
      ],
    });

    // Default axes
    manager.registerAxis({
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
    });

    manager.registerAxis({
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
    });

    manager.registerAxis({
      name: 'look_horizontal',
      positiveBindings: [
        { device: 'gamepad', axis: 'right_x' },
      ],
      negativeBindings: [],
      gravity: 0,
      sensitivity: 1,
    });

    manager.registerAxis({
      name: 'look_vertical',
      positiveBindings: [],
      negativeBindings: [
        { device: 'gamepad', axis: 'right_y' },
      ],
      gravity: 0,
      sensitivity: 1,
    });
}
