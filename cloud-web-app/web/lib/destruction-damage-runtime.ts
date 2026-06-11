import * as THREE from 'three';
import type { DestructionEvent } from './destruction-contracts';

export interface DamageTarget {
  isDestroyed(): boolean;
  getMesh(): THREE.Mesh;
  applyDamage(
    damage: number,
    impactPoint: THREE.Vector3,
    impactNormal: THREE.Vector3,
    impactForce: number
  ): DestructionEvent;
}

export function propagateDestructionDamage(input: {
  destructibles: Map<string, DamageTarget>;
  center: THREE.Vector3;
  damage: number;
  radius: number;
  excludeId: string;
}): void {
  for (const [id, destructible] of input.destructibles) {
    if (id === input.excludeId || destructible.isDestroyed()) continue;

    const position = destructible.getMesh().position;
    const distance = position.distanceTo(input.center);

    if (distance < input.radius) {
      const falloff = 1 - (distance / input.radius);
      const propagatedDamage = input.damage * falloff;

      if (propagatedDamage > 1) {
        const direction = position.clone().sub(input.center).normalize();
        destructible.applyDamage(
          propagatedDamage,
          position.clone().sub(direction.multiplyScalar(0.1)),
          direction.negate(),
          propagatedDamage * 0.5
        );
      }
    }
  }
}

export function applyExplosionDamage(input: {
  destructibles: Map<string, DamageTarget>;
  center: THREE.Vector3;
  damage: number;
  radius: number;
}): DestructionEvent[] {
  const events: DestructionEvent[] = [];

  for (const destructible of input.destructibles.values()) {
    if (destructible.isDestroyed()) continue;

    const position = destructible.getMesh().position;
    const distance = position.distanceTo(input.center);

    if (distance < input.radius) {
      const falloff = 1 - (distance / input.radius);
      const explosionDamage = input.damage * falloff;
      const direction = position.clone().sub(input.center).normalize();

      events.push(destructible.applyDamage(
        explosionDamage,
        position.clone().sub(direction.multiplyScalar(0.5)),
        direction.negate(),
        explosionDamage
      ));
    }
  }

  return events;
}
