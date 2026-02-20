/**
 * Niagara default emitter and graph seed data.
 */

import type { Edge, Node } from '@xyflow/react';
import * as THREE from 'three';
import type { EmitterConfig } from './niagara-vfx-types';

export const defaultEmitterConfig: EmitterConfig = {
  id: 'default',
  name: 'Default Emitter',
  enabled: true,
  spawnRate: 50,
  spawnBurst: [],
  maxParticles: 1000,
  lifetime: { min: 1, max: 3 },
  spawnShape: 'point',
  spawnShapeParams: {},
  initialVelocity: {
    min: new THREE.Vector3(-1, 2, -1),
    max: new THREE.Vector3(1, 5, 1),
  },
  velocityOverLife: [
    { time: 0, multiplier: 1 },
    { time: 1, multiplier: 0.2 },
  ],
  initialSize: { min: 0.1, max: 0.3 },
  sizeOverLife: [
    { time: 0, size: 0.1 },
    { time: 0.5, size: 0.3 },
    { time: 1, size: 0 },
  ],
  initialColor: new THREE.Color(1, 0.5, 0),
  colorOverLife: [
    { time: 0, color: new THREE.Color(1, 1, 0), alpha: 1 },
    { time: 0.3, color: new THREE.Color(1, 0.5, 0), alpha: 1 },
    { time: 0.7, color: new THREE.Color(1, 0, 0), alpha: 0.8 },
    { time: 1, color: new THREE.Color(0.2, 0, 0), alpha: 0 },
  ],
  initialRotation: { min: 0, max: Math.PI * 2 },
  rotationRate: { min: -1, max: 1 },
  gravity: new THREE.Vector3(0, -2, 0),
  drag: 0.1,
  turbulence: { strength: 0.5, frequency: 2 },
  material: 'sprite',
  blendMode: 'additive',
  sortMode: 'byDistance',
};

export const initialNodes: Node[] = [
  {
    id: 'emitter-1',
    type: 'niagara',
    position: { x: 50, y: 100 },
    data: { label: 'Particle Emitter', type: 'emitter', params: { rate: 50, maxParticles: 1000 } },
  },
  {
    id: 'spawn-1',
    type: 'niagara',
    position: { x: 300, y: 50 },
    data: { label: 'Spawn Location', type: 'spawn', params: { shape: 'sphere', radius: 0.5 } },
  },
  {
    id: 'velocity-1',
    type: 'niagara',
    position: { x: 300, y: 180 },
    data: { label: 'Initial Velocity', type: 'velocity', params: { minY: 2, maxY: 5, spread: 1 } },
  },
  {
    id: 'size-1',
    type: 'niagara',
    position: { x: 550, y: 50 },
    data: { label: 'Size Over Life', type: 'size', params: { start: 0.1, peak: 0.3, end: 0 } },
  },
  {
    id: 'color-1',
    type: 'niagara',
    position: { x: 550, y: 180 },
    data: { label: 'Color Over Life', type: 'color', params: { mode: 'gradient' } },
  },
  {
    id: 'force-1',
    type: 'niagara',
    position: { x: 550, y: 310 },
    data: { label: 'Gravity Force', type: 'force', params: { x: 0, y: -2, z: 0 } },
  },
  {
    id: 'render-1',
    type: 'niagara',
    position: { x: 800, y: 150 },
    data: { label: 'Sprite Renderer', type: 'render', params: { blend: 'additive', sort: true } },
  },
];

export const initialEdges: Edge[] = [
  { id: 'e1', source: 'emitter-1', target: 'spawn-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e2', source: 'emitter-1', target: 'velocity-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e3', source: 'spawn-1', target: 'size-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e4', source: 'velocity-1', target: 'color-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e5', source: 'velocity-1', target: 'force-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e6', source: 'size-1', target: 'render-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e7', source: 'color-1', target: 'render-1', animated: true, style: { stroke: '#fff' } },
  { id: 'e8', source: 'force-1', target: 'render-1', animated: true, style: { stroke: '#fff' } },
];
