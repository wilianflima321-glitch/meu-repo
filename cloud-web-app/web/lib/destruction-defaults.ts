import type { DestructibleConfig } from './destruction-contracts';

export function createDestructibleConfig(config: Partial<DestructibleConfig> = {}): DestructibleConfig {
  return {
    maxHealth: 100,
    fractureLevels: 3,
    fragmentCount: 8,
    debrisLifetime: 5,
    impactPropagation: 2.0,
    enablePhysics: true,
    enableSound: true,
    enableVFX: true,
    ...config,
  };
}
