export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'rigid'
  | 'soft'
  | 'selection'
  | 'impact'
  | 'notification'
  | 'warning'
  | 'error'
  | 'success';

export type HapticMotor = 'weak' | 'strong' | 'both';

export interface HapticEffect {
  name: string;
  pattern: HapticPulse[];
  loop?: boolean;
  intensity?: number;
}

export interface HapticPulse {
  duration: number; // ms
  weakMagnitude: number; // 0-1
  strongMagnitude: number; // 0-1
  delay?: number; // ms delay before pulse
}

export interface HapticEvent {
  type: string;
  effect: string;
  intensity?: number;
  motor?: HapticMotor;
}

export interface GamepadHapticState {
  gamepadIndex: number;
  playing: boolean;
  effectId: string | null;
  startTime: number;
  intensity: number;
}

export interface HapticsConfig {
  enabled: boolean;
  globalIntensity: number; // 0-1
  gamepadEnabled: boolean;
  mobileEnabled: boolean;
  defaultMotor: HapticMotor;
  maxDuration: number; // max ms for any effect
  respectAccessibility: boolean;
}
