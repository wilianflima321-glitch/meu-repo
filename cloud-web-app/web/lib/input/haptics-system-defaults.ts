import type { HapticsConfig } from './haptics-system.contracts';

export function createDefaultHapticsConfig(config: Partial<HapticsConfig> = {}): HapticsConfig {
  return {
    enabled: true,
    globalIntensity: 1.0,
    gamepadEnabled: true,
    mobileEnabled: true,
    defaultMotor: 'both',
    maxDuration: 5000,
    respectAccessibility: true,
    ...config,
  };
}
