// @aethel-heavy-async-boundary: transitive runtime helpers loaded through SceneEditor.

import * as THREE from 'three';

export type TransformMode = 'translate' | 'rotate' | 'scale';
export interface SceneObject {
  id: string;
  name: string;
  type: 'mesh' | 'light' | 'camera' | 'empty' | 'prefab';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  children: SceneObject[];
  properties: Record<string, unknown>;
}
export interface SceneEditorProps {
  initialScene?: SceneObject[];
  onChange?: (scene: SceneObject[]) => void;
  onSelect?: (objectId: string | null) => void;
}
export const PRIMITIVE_GEOMETRIES = {
  box: () => new THREE.BoxGeometry(1, 1, 1),
  sphere: () => new THREE.SphereGeometry(0.5, 32, 32),
  cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 32),
  cone: () => new THREE.ConeGeometry(0.5, 1, 32),
  torus: () => new THREE.TorusGeometry(0.5, 0.2, 16, 32),
  plane: () => new THREE.PlaneGeometry(1, 1),
  capsule: () => new THREE.CapsuleGeometry(0.25, 0.5, 8, 16),
};
export interface SnapSettings {
  enabled: boolean;
  gridSize: number;
  rotationSnap: number; // em graus
  scaleSnap: number;
}
export const DEFAULT_SNAP_SETTINGS: SnapSettings = {
  enabled: true,
  gridSize: 0.5, // Snap a cada 0.5 unidades
  rotationSnap: 15, // Snap a cada 15 graus
  scaleSnap: 0.1, // Snap a cada 0.1
};
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}
export function snapPosition(
  position: [number, number, number],
  gridSize: number
): [number, number, number] {
  return [
    snapToGrid(position[0], gridSize),
    snapToGrid(position[1], gridSize),
    snapToGrid(position[2], gridSize),
  ];
}
export function snapRotation(
  rotation: [number, number, number],
  snapDegrees: number
): [number, number, number] {
  const snapRad = (snapDegrees * Math.PI) / 180;
  return [
    snapToGrid(rotation[0], snapRad),
    snapToGrid(rotation[1], snapRad),
    snapToGrid(rotation[2], snapRad),
  ];
}
export function snapScale(
  scale: [number, number, number],
  snapSize: number
): [number, number, number] {
  return [
    snapToGrid(scale[0], snapSize),
    snapToGrid(scale[1], snapSize),
    snapToGrid(scale[2], snapSize),
  ];
}
