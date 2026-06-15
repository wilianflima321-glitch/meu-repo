import { Vector3 } from 'three';
import type { ClothCollider, ClothConfig } from '@/lib/cloth-simulation';

export function createClothVector(x: number, y: number, z: number): Vector3 {
  return new Vector3(x, y, z);
}

export function createInitialClothConfig(initialConfig?: Partial<ClothConfig>): ClothConfig {
  return {
    width: 4,
    height: 4,
    segmentsX: 20,
    segmentsY: 20,
    mass: 0.5,
    stiffness: 0.8,
    damping: 0.05,
    gravity: createClothVector(0, -9.81, 0),
    wind: createClothVector(0, 0, 0),
    windVariation: 0.1,
    iterations: 12,
    tearThreshold: 1.5,
    selfCollision: false,
    groundPlane: true,
    groundHeight: -2,
    ...initialConfig,
  };
}

export function createInitialClothColliders(): ClothCollider[] {
  return [
    {
      type: 'sphere',
      position: createClothVector(0, 0, 0),
      radius: 0.5,
    },
  ];
}

export function createClothCollider(type: ClothCollider['type']): ClothCollider {
  return {
    type,
    position: createClothVector(0, -1, 0),
    ...(type === 'sphere' && { radius: 0.5 }),
    ...(type === 'plane' && { normal: createClothVector(0, 1, 0) }),
    ...(type === 'box' && { size: createClothVector(1, 1, 1) }),
  };
}
