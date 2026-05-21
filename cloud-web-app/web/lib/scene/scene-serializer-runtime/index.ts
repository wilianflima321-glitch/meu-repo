/**
 * Scene Serializer - split runtime modules.
 *
 * Three.js scene serialization stays isolated from public route shells and can
 * be lazy-loaded by Studio scene/level tools when export/import is requested.
 */

export * from './types';
export * from './serializer';
export * from './react';
export { SceneSerializer as default } from './serializer';
