import type * as THREE from 'three';

export interface FluidParams {
  particleCount: number;
  viscosity: number;
  surfaceTension: number;
  restDensity: number;
  stiffness: number;
  particleRadius: number;
  smoothingRadius: number;
  color: string;
  opacity: number;
  gravity: { x: number; y: number; z: number };
  boundarySize: { x: number; y: number; z: number };
  boundaryPosition: { x: number; y: number; z: number };
  flowDirection: { x: number; y: number; z: number };
  flowStrength: number;
  temperature: number;
  enableSurfaceMeshing: boolean;
  meshResolution: number;
}

export interface FluidPreset {
  id: string;
  name: string;
  description: string;
  params: Partial<FluidParams>;
}

export interface FluidParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  density: number;
  pressure: number;
  mass: number;
}

export type FluidToolType = 'view' | 'emitter' | 'boundary' | 'flow';

export interface FluidEditorState {
  isSimulating: boolean;
  showBoundary: boolean;
  showFlowArrows: boolean;
  showVelocityColors: boolean;
  showDensityColors: boolean;
  currentPreset: string | null;
}

export interface FluidSimulationEditorProps {
  volumeId?: string;
  initialParams?: Partial<FluidParams>;
  onFluidUpdate?: (params: FluidParams) => void;
  onExport?: (data: { params: FluidParams; meshData?: ArrayBuffer }) => void;
}
