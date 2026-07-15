/**
 * Terrain Engine - split runtime modules.
 *
 * Procedural terrain generation, chunk meshes, materials, and sculpting stay
 * behind Studio/runtime boundaries instead of public route imports.
 */

export * from './types';
export * from './noise';
export * from './heightmap';
export * from './material';
export * from './chunk-mesh';
export * from './sculptor';
export * from './engine';
export { TerrainEngine as default } from './engine';
// A.1 viewport bridge — durable heightfield → mesh + physics viz
export {
  buildGeometryFromHeightfield,
  buildHeightfieldPhysicsViz,
  sampleHeightfieldWorldY,
} from '../production/heightfield-viewport-bridge';
