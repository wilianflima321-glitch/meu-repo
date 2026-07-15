import * as Y from 'yjs';

import type { SceneObject } from './yjs-collaboration-contracts';

const COLORS = [
  '#e63946', '#f4a261', '#2a9d8f', '#264653',
  '#e76f51', '#f1c40f', '#9b59b6', '#3498db',
  '#1abc9c', '#e74c3c', '#2ecc71', '#f39c12'
];

export function generateYjsUserColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLORS[Math.abs(hash) % COLORS.length];
}

function isVector3(value: unknown): value is SceneObject['position'] {
  return typeof value === 'object' &&
    value !== null &&
    typeof (value as { x?: unknown }).x === 'number' &&
    typeof (value as { y?: unknown }).y === 'number' &&
    typeof (value as { z?: unknown }).z === 'number';
}

function readString(map: Y.Map<unknown>, key: string, fallback = ''): string {
  const value = map.get(key);
  return typeof value === 'string' ? value : fallback;
}

function readBoolean(map: Y.Map<unknown>, key: string, fallback = false): boolean {
  const value = map.get(key);
  return typeof value === 'boolean' ? value : fallback;
}

function readOptionalString(map: Y.Map<unknown>, key: string): string | undefined {
  const value = map.get(key);
  return typeof value === 'string' ? value : undefined;
}

function readStringArray(map: Y.Map<unknown>, key: string): string[] | undefined {
  const value = map.get(key);
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
    ? value
    : undefined;
}

function readVector(map: Y.Map<unknown>, key: string): SceneObject['position'] {
  const value = map.get(key);
  return isVector3(value) ? value : { x: 0, y: 0, z: 0 };
}

function readProperties(map: Y.Map<unknown>): Record<string, unknown> {
  const value = map.get('properties');
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function sceneObjectFromYMap(objMap: Y.Map<unknown>): SceneObject {
  return {
    id: readString(objMap, 'id'),
    type: readString(objMap, 'type'),
    name: readString(objMap, 'name'),
    position: readVector(objMap, 'position'),
    rotation: readVector(objMap, 'rotation'),
    scale: readVector(objMap, 'scale'),
    visible: readBoolean(objMap, 'visible'),
    locked: readBoolean(objMap, 'locked'),
    lockedBy: readOptionalString(objMap, 'lockedBy'),
    parentId: readOptionalString(objMap, 'parentId'),
    children: readStringArray(objMap, 'children'),
    properties: readProperties(objMap),
  };
}
