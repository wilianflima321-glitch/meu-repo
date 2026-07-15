import type { ComponentType } from './ecs-dots-contracts';
import type { World } from './ecs-dots-system';

export interface TransformData {
  positionX: number;
  positionY: number;
  positionZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  rotationW: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface VelocityData {
  x: number;
  y: number;
  z: number;
  angularX: number;
  angularY: number;
  angularZ: number;
}

export interface RenderData {
  meshId: number;
  materialId: number;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  layer: number;
}

export function registerCommonComponents(world: World): {
  Transform: ComponentType;
  Velocity: ComponentType;
  Render: ComponentType;
} {
  const Transform = world.registerComponent<TransformData>('Transform', [
    { name: 'positionX', type: 'f32' },
    { name: 'positionY', type: 'f32' },
    { name: 'positionZ', type: 'f32' },
    { name: 'rotationX', type: 'f32' },
    { name: 'rotationY', type: 'f32' },
    { name: 'rotationZ', type: 'f32' },
    { name: 'rotationW', type: 'f32' },
    { name: 'scaleX', type: 'f32' },
    { name: 'scaleY', type: 'f32' },
    { name: 'scaleZ', type: 'f32' },
  ]);

  const Velocity = world.registerComponent<VelocityData>('Velocity', [
    { name: 'x', type: 'f32' },
    { name: 'y', type: 'f32' },
    { name: 'z', type: 'f32' },
    { name: 'angularX', type: 'f32' },
    { name: 'angularY', type: 'f32' },
    { name: 'angularZ', type: 'f32' },
  ]);

  const Render = world.registerComponent<RenderData>('Render', [
    { name: 'meshId', type: 'u32' },
    { name: 'materialId', type: 'u32' },
    { name: 'visible', type: 'bool' },
    { name: 'castShadow', type: 'bool' },
    { name: 'receiveShadow', type: 'bool' },
    { name: 'layer', type: 'u8' },
  ]);

  return { Transform, Velocity, Render };
}

// ============================================================================
// EXPORTS
// ============================================================================
