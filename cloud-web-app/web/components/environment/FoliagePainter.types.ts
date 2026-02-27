import type { Euler, Vector3 } from 'three';

export type FoliageToolType = 'paint' | 'erase' | 'select' | 'move';

export interface FoliageType {
  id: string;
  name: string;
  meshPath: string;
  thumbnail: string;
  category: 'tree' | 'bush' | 'grass' | 'flower' | 'rock';

  // Placement
  densityMin: number;
  densityMax: number;
  scaleMin: number;
  scaleMax: number;
  rotationYRandom: boolean;
  alignToNormal: boolean;
  normalAlignmentStrength: number;

  // Constraints
  minSlope: number;
  maxSlope: number;
  minHeight: number;
  maxHeight: number;

  // Rendering
  castShadow: boolean;
  receiveShadow: boolean;
  cullDistance: number;
  lodBias: number;

  // Collision
  hasCollision: boolean;
  collisionType: 'box' | 'sphere' | 'mesh';

  // Wind
  windEnabled: boolean;
  windStrength: number;
  windFrequency: number;
}

export interface FoliageInstance {
  id: string;
  typeId: string;
  position: Vector3;
  rotation: Euler;
  scale: Vector3;
}

export interface FoliageBrushSettings {
  tool: FoliageToolType;
  radius: number;
  density: number;
  falloff: number;
}

export interface FoliageLayer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  types: string[];
  instances: FoliageInstance[];
}
