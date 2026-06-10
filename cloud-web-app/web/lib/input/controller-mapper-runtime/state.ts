import { STANDARD_AXIS_MAP, STANDARD_BUTTON_MAP } from './profiles';
import type {
  ButtonState,
  ConnectedController,
  ControllerMapperConfig,
  ControllerProfile,
  ControllerState,
  GamepadAxis,
} from './types';

export const DEFAULT_CONTROLLER_MAPPER_CONFIG: ControllerMapperConfig = {
  pollInterval: 16,
  defaultDeadzone: 0.15,
  defaultSensitivity: 1.0,
  doubleTapWindow: 300,
  holdDuration: 500,
  triggerThreshold: 0.5,
  autoConnectProfile: true,
  maxControllers: 4,
  enableDebug: false,
};

export function createInitialControllerState(): ControllerState {
  const buttons = new Map<keyof typeof STANDARD_BUTTON_MAP | string, ButtonState>();
  const axes = new Map<GamepadAxis, number>();

  for (const button of Object.values(STANDARD_BUTTON_MAP)) {
    buttons.set(button, {
      pressed: false,
      value: 0,
      pressedAt: 0,
      lastPressedAt: 0,
      tapCount: 0,
    });
  }

  for (const axis of Object.values(STANDARD_AXIS_MAP)) {
    axes.set(axis, 0);
  }

  axes.set('LT', 0);
  axes.set('RT', 0);

  return { buttons: buttons as ControllerState['buttons'], axes, timestamp: 0 };
}

export function createConnectedController(gamepad: Gamepad): ConnectedController {
  const idMatch = gamepad.id.match(/Vendor:\s*([0-9a-f]+)\s*Product:\s*([0-9a-f]+)/i);
  const vendor = idMatch?.[1] || 'unknown';
  const product = idMatch?.[2] || 'unknown';
  const hasHaptics = 'vibrationActuator' in gamepad ||
    ((gamepad as { hapticActuators?: unknown[] }).hapticActuators?.length ?? 0) > 0;

  return {
    id: `controller_${gamepad.index}_${Date.now()}`,
    index: gamepad.index,
    name: gamepad.id,
    vendor,
    product,
    connected: gamepad.connected,
    mapping: gamepad.mapping,
    axes: gamepad.axes.length,
    buttons: gamepad.buttons.length,
    hapticActuators: hasHaptics,
    profile: null,
    state: createInitialControllerState(),
  };
}

export function detectBestControllerProfile(
  controller: ConnectedController,
  profiles: Map<string, ControllerProfile>,
): ControllerProfile | null {
  const name = controller.name.toLowerCase();
  const fallback = profiles.get('default-fps') || null;

  if (name.includes('xbox') || name.includes('xinput')) return fallback;
  if (name.includes('playstation') || name.includes('dualshock') || name.includes('dualsense')) return fallback;
  if (name.includes('switch') || name.includes('pro controller')) return fallback;

  return fallback;
}

export function applyControllerCurve(
  value: number,
  curve?: string,
  customCurve?: (v: number) => number,
): number {
  const sign = Math.sign(value);
  const abs = Math.abs(value);

  switch (curve) {
    case 'exponential':
      return sign * (abs * abs);
    case 'cubic':
      return sign * (abs * abs * abs);
    case 'custom':
      return customCurve ? customCurve(value) : value;
    case 'linear':
    default:
      return value;
  }
}

export function applyDeadzone(value: number, deadzone: number): number {
  if (Math.abs(value) < deadzone) return 0;
  return Math.sign(value) * ((Math.abs(value) - deadzone) / (1 - deadzone));
}
