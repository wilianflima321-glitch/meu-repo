// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
/**
 * Shared destruction runtime contracts.
 */import type * as THREE from 'three';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface DestructibleConfig {
  maxHealth: number;
  fractureLevels: number;
  fragmentCount: number;
  debrisLifetime: number;
  impactPropagation: number;
  enablePhysics: boolean;
  enableSound: boolean;
  enableVFX: boolean;
}

export interface FragmentData {
  id: string;
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  mass: number;
  lifetime: number;
  spawnTime: number;
  active: boolean;
}

export interface DestructionEvent {
  type: 'damage' | 'fracture' | 'destroy' | 'cleanup';
  targetId: string;
  damage: number;
  impactPoint: THREE.Vector3;
  impactNormal: THREE.Vector3;
  impactForce: number;
  fragments?: string[];
}

export interface VoronoiCell {
  center: THREE.Vector3;
  vertices: THREE.Vector3[];
  faces: number[][];
}
