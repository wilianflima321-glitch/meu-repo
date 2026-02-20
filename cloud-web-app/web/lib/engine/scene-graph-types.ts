import * as THREE from 'three';

import type { SceneNode } from './scene-graph';

export interface TransformData {
  position: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
}

export type NodeTag = string;

export interface SceneNodeData {
  id: string;
  name: string;
  enabled: boolean;
  tags: NodeTag[];
  layer: number;
  transform: TransformData;
  components: ComponentData[];
  children: SceneNodeData[];
  prefabId?: string;
}

export interface ComponentData {
  type: string;
  enabled: boolean;
  data: Record<string, unknown>;
}

export interface ContactPoint {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  impulse: number;
}

export interface SceneData {
  id: string;
  name: string;
  nodes: SceneNodeData[];
  environment: EnvironmentData;
  settings: SceneSettings;
}

export interface EnvironmentData {
  ambientColor: [number, number, number];
  ambientIntensity: number;
  skybox?: string;
  fog?: {
    type: 'linear' | 'exponential' | 'exponential2';
    color: [number, number, number];
    near?: number;
    far?: number;
    density?: number;
  };
}

export interface SceneSettings {
  gravity: [number, number, number];
  physicsIterations: number;
  timeScale: number;
}

export interface RaycastHit {
  node: SceneNode;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
  triangleIndex?: number;
}
