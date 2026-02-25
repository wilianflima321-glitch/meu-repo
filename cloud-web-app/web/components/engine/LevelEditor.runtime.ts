import type { LevelObject } from './LevelEditor.types';

export interface PhysicsState {
  velocities: Map<string, [number, number, number]>;
  angularVelocities: Map<string, [number, number, number]>;
}

const GRAVITY = -9.81;
const GROUND_Y = 0.05;
const WORKBENCH_PROJECT_STORAGE_KEY = 'aethel.workbench.lastProjectId';

export function resolveProjectIdFromClient(): string {
  if (typeof window === 'undefined') return 'default';

  const params = new URLSearchParams(window.location.search);
  const fromQuery = params.get('projectId');
  if (fromQuery && fromQuery.trim()) return fromQuery.trim();

  const fromStorage = localStorage.getItem(WORKBENCH_PROJECT_STORAGE_KEY);
  if (fromStorage && fromStorage.trim()) return fromStorage.trim();

  return 'default';
}

export function simulatePhysics(
  objects: LevelObject[],
  physicsState: PhysicsState,
  deltaTime: number,
): LevelObject[] {
  return objects.map((obj) => {
    if (obj.id === 'floor' || obj.locked) return obj;

    const velocity = physicsState.velocities.get(obj.id) || [0, 0, 0];
    velocity[1] += GRAVITY * deltaTime;

    const newPos: [number, number, number] = [
      obj.position[0] + velocity[0] * deltaTime,
      obj.position[1] + velocity[1] * deltaTime,
      obj.position[2] + velocity[2] * deltaTime,
    ];

    const halfHeight = obj.scale[1] / 2;
    if (newPos[1] - halfHeight < GROUND_Y) {
      newPos[1] = GROUND_Y + halfHeight;
      velocity[1] = -velocity[1] * 0.5;
      if (Math.abs(velocity[1]) < 0.5) velocity[1] = 0;
    }

    physicsState.velocities.set(obj.id, velocity);
    return { ...obj, position: newPos };
  });
}
