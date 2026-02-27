/** Fluid simulation runtime core (SPH, PBF, FLIP). */

import * as THREE from 'three';

import type {
  FluidBoundary,
  FluidConfig,
  FluidParticle,
  GridCell,
  SurfaceVertex,
} from './fluid-simulation-system.types';

export type {
  FluidBoundary,
  FluidConfig,
  FluidParticle,
  GridCell,
  SurfaceVertex,
} from './fluid-simulation-system.types';

import { FLIPFluidSimulation } from './fluid-simulation-flip';
import { PBFFluidSimulation } from './fluid-simulation-pbf';
import { SpatialHashGrid } from './fluid-simulation-spatial-hash';
import { SPHFluidSimulation } from './fluid-simulation-sph';

export { SPHKernels } from './fluid-simulation-kernels';
export { FLIPFluidSimulation } from './fluid-simulation-flip';
export { PBFFluidSimulation } from './fluid-simulation-pbf';
export { SpatialHashGrid } from './fluid-simulation-spatial-hash';
export { SPHFluidSimulation } from './fluid-simulation-sph';

export const createSPHFluid = (config?: Partial<FluidConfig>): SPHFluidSimulation => {
  return new SPHFluidSimulation(config);
};

export const createPBFFluid = (config?: Partial<FluidConfig>): PBFFluidSimulation => {
  return new PBFFluidSimulation(config);
};

export const createFLIPFluid = (
  config?: Partial<FluidConfig>,
  gridRes?: THREE.Vector3
): FLIPFluidSimulation => {
  return new FLIPFluidSimulation(config, gridRes);
};
