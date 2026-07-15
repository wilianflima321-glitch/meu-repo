/**
 * Fluid Simulation - split runtime modules.
 *
 * SPH, PBF, FLIP, and surface reconstruction stay behind Studio/runtime
 * boundaries so fluid experiments do not leak into product/public bundles.
 */

import type * as THREE from 'three';
import { FLIPFluidSimulation } from './flip';
import { PBFFluidSimulation } from './pbf';
import { SPHFluidSimulation } from './sph';
import type { FluidConfig } from './types';

export const createSPHFluid = (config?: Partial<FluidConfig>): SPHFluidSimulation => {
  return new SPHFluidSimulation(config);
};
export const createPBFFluid = (config?: Partial<FluidConfig>): PBFFluidSimulation => {
  return new PBFFluidSimulation(config);
};
export const createFLIPFluid = (config?: Partial<FluidConfig>, gridRes?: THREE.Vector3): FLIPFluidSimulation => {
  return new FLIPFluidSimulation(config, gridRes);
};
