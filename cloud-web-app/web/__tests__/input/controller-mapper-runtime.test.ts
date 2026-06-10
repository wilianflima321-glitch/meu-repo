import { describe, expect, it, vi } from 'vitest';
import { updateControllerStateFromGamepad } from '@/lib/input/controller-mapper-runtime/polling';
import {
  DEFAULT_CONTROLLER_MAPPER_CONFIG,
  applyControllerCurve,
  applyDeadzone,
  createConnectedController,
} from '@/lib/input/controller-mapper-runtime/state';
import type { ButtonState, ConnectedController, ControllerProfile, GamepadAxis, GamepadButton } from '@/lib/input/controller-mapper-runtime/types';

function makeButton(pressed = false, value = pressed ? 1 : 0): GamepadButtonState {
  return { pressed, touched: pressed, value } as GamepadButtonState;
}

function makeGamepad(overrides: Partial<Gamepad> = {}): Gamepad {
  return {
    axes: [0.8, 0, 0, 0],
    buttons: [makeButton(true), makeButton(false), makeButton(false), makeButton(false), makeButton(false), makeButton(false), makeButton(false, 0.25), makeButton(false, 0.75)],
    connected: true,
    hapticActuators: [],
    id: 'Xbox Controller (Vendor: 045e Product: 028e)',
    index: 0,
    mapping: 'standard',
    timestamp: 1,
    vibrationActuator: undefined,
    ...overrides,
  } as unknown as Gamepad;
}

const profile: ControllerProfile = {
  id: 'profile-test',
  name: 'Test Profile',
  buttons: [{ button: 'A', action: 'jump', onPress: true, onRelease: true, onHold: true }],
  axes: [{ axis: 'LEFT_X', action: 'move-x', sensitivity: 2, curve: 'linear' }],
  globalDeadzone: 0.15,
  globalSensitivity: 1,
  triggerAsButton: false,
  triggerThreshold: 0.5,
  vibrationEnabled: true,
  vibrationIntensity: 1,
  created: 1,
  modified: 1,
};

describe('controller mapper runtime helpers', () => {
  it('creates connected controller metadata and initial state', () => {
    const controller = createConnectedController(makeGamepad());

    expect(controller.vendor).toBe('045e');
    expect(controller.product).toBe('028e');
    expect(controller.state.buttons.get('A')?.pressed).toBe(false);
    expect(controller.state.axes.get('LT')).toBe(0);
  });

  it('applies deadzone and response curves deterministically', () => {
    expect(applyDeadzone(0.1, 0.15)).toBe(0);
    expect(applyDeadzone(0.575, 0.15)).toBeCloseTo(0.5);
    expect(applyControllerCurve(0.5, 'exponential')).toBeCloseTo(0.25);
    expect(applyControllerCurve(-0.5, 'cubic')).toBeCloseTo(-0.125);
  });

  it('updates button, axis and trigger snapshots through explicit handlers', () => {
    vi.spyOn(performance, 'now').mockReturnValue(1000);
    const controller: ConnectedController = createConnectedController(makeGamepad());
    const events: string[] = [];

    updateControllerStateFromGamepad(controller, makeGamepad(), profile, DEFAULT_CONTROLLER_MAPPER_CONFIG, {
      buttonPress: (_controller, button: GamepadButton, _state: ButtonState) => events.push(`press:${button}`),
      buttonRelease: () => events.push('release'),
      buttonHold: () => events.push('hold'),
      axisMove: (_controller, axis: GamepadAxis, value: number) => events.push(`axis:${axis}:${value.toFixed(2)}`),
    });

    expect(controller.state.buttons.get('A')?.pressed).toBe(true);
    expect(controller.state.axes.get('LEFT_X')).toBeCloseTo(0.7647, 3);
    expect(controller.state.axes.get('LT')).toBe(0.25);
    expect(controller.state.axes.get('RT')).toBe(0.75);
    expect(events).toEqual(['press:A', 'axis:LEFT_X:0.76', 'axis:LT:0.25', 'axis:RT:0.75']);

    vi.restoreAllMocks();
  });
});
