import { STANDARD_AXIS_MAP, STANDARD_BUTTON_MAP } from './profiles';
import { applyControllerCurve, applyDeadzone } from './state';
import type {
  ButtonState,
  ConnectedController,
  ControllerMapperConfig,
  ControllerProfile,
  GamepadAxis,
  GamepadButton,
} from './types';

export interface ControllerPollingHandlers {
  buttonPress(controller: ConnectedController, button: GamepadButton, state: ButtonState, profile: ControllerProfile | null): void;
  buttonRelease(controller: ConnectedController, button: GamepadButton, state: ButtonState, profile: ControllerProfile | null): void;
  buttonHold(
    controller: ConnectedController,
    button: GamepadButton,
    state: ButtonState,
    profile: ControllerProfile | null,
    duration: number,
  ): void;
  axisMove(controller: ConnectedController, axis: GamepadAxis, value: number, profile: ControllerProfile | null): void;
}

export function updateControllerStateFromGamepad(
  controller: ConnectedController,
  gamepad: Gamepad,
  profile: ControllerProfile | null,
  config: ControllerMapperConfig,
  handlers: ControllerPollingHandlers,
): void {
  const now = performance.now();

  for (let i = 0; i < gamepad.buttons.length; i++) {
    const button = STANDARD_BUTTON_MAP[i];
    if (!button) continue;

    const gpButton = gamepad.buttons[i];
    const state = controller.state.buttons.get(button)!;
    const wasPressed = state.pressed;

    state.value = gpButton.value;
    state.touched = gpButton.touched ?? false;

    if (gpButton.pressed && !wasPressed) {
      state.pressed = true;
      state.lastPressedAt = state.pressedAt;
      state.pressedAt = now;
      state.tapCount = now - state.lastPressedAt < config.doubleTapWindow ? state.tapCount + 1 : 1;
      handlers.buttonPress(controller, button, state, profile);
    }

    if (!gpButton.pressed && wasPressed) {
      state.pressed = false;
      handlers.buttonRelease(controller, button, state, profile);
    }

    if (gpButton.pressed && wasPressed) {
      const holdDuration = now - state.pressedAt;
      if (holdDuration >= config.holdDuration) {
        handlers.buttonHold(controller, button, state, profile, holdDuration);
      }
    }
  }

  for (let i = 0; i < gamepad.axes.length; i++) {
    const axis = STANDARD_AXIS_MAP[i];
    if (!axis) continue;

    const deadzone = profile?.globalDeadzone ?? config.defaultDeadzone;
    const value = applyDeadzone(gamepad.axes[i], deadzone);
    controller.state.axes.set(axis, value);

    if (value !== 0) handlers.axisMove(controller, axis, value, profile);
  }

  updateAnalogTrigger(controller, gamepad.buttons[6], 'LT', profile, handlers);
  updateAnalogTrigger(controller, gamepad.buttons[7], 'RT', profile, handlers);
  controller.state.timestamp = now;
}

function updateAnalogTrigger(
  controller: ConnectedController,
  button: GamepadButton | Gamepad['buttons'][number] | undefined,
  axis: GamepadAxis,
  profile: ControllerProfile | null,
  handlers: ControllerPollingHandlers,
): void {
  if (!button) return;
  const value = typeof button === 'string' ? 0 : button.value;
  controller.state.axes.set(axis, value);
  if (value > 0) handlers.axisMove(controller, axis, value, profile);
}

export function processMappedAxisValue(
  value: number,
  profile: ControllerProfile | null,
  mapping: { inverted?: boolean; sensitivity?: number; curve?: string; customCurve?: (value: number) => number },
): number {
  let processedValue = mapping.inverted ? -value : value;
  const sensitivity = mapping.sensitivity ?? profile?.globalSensitivity ?? 1.0;
  processedValue *= sensitivity;
  return applyControllerCurve(processedValue, mapping.curve, mapping.customCurve);
}
