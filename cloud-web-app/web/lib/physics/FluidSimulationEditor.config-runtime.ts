import type { FluidParams } from '@/lib/physics/fluid-simulation-core';
import { DOMAIN_FLUID_COLORS } from '@/lib/design-system/domain-color-presets'

export function createDefaultFluidParams(initialParams?: Partial<FluidParams>): FluidParams {
  return {
    particleCount: 500,
    viscosity: 0.01,
    surfaceTension: 0.07,
    restDensity: 1000,
    stiffness: 200,
    particleRadius: 0.05,
    smoothingRadius: 0.2,
    color: DOMAIN_FLUID_COLORS.default,
    opacity: 0.7,
    gravity: { x: 0, y: -9.81, z: 0 },
    boundarySize: { x: 3, y: 3, z: 3 },
    boundaryPosition: { x: 0, y: 1.5, z: 0 },
    flowDirection: { x: 1, y: 0, z: 0 },
    flowStrength: 0,
    temperature: 20,
    enableSurfaceMeshing: false,
    meshResolution: 32,
    ...initialParams,
  };
}

export function createDefaultFluidEditorState() {
  return {
    isSimulating: false,
    showBoundary: true,
    showFlowArrows: true,
    showVelocityColors: false,
    showDensityColors: false,
    currentPreset: null,
  };
}
