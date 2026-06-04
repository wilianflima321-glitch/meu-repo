// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * Singleton accessors for the destruction manager.
 */

import * as THREE from 'three';
import { DestructionManager } from './destruction-system';

// ============================================================================
// EXPORTS
// ============================================================================

// Singleton manager
let destructionManagerInstance: DestructionManager | null = null;

export function getDestructionManager(scene?: THREE.Scene): DestructionManager {
  if (!destructionManagerInstance && scene) {
    destructionManagerInstance = new DestructionManager(scene);
  }
  if (!destructionManagerInstance) {
    throw new Error('DestructionManager not initialized. Provide a scene.');
  }
  return destructionManagerInstance;
}

export function createDestructionManager(scene: THREE.Scene): DestructionManager {
  destructionManagerInstance = new DestructionManager(scene);
  return destructionManagerInstance;
}
