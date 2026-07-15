/**
 * Scene Serializer - split runtime modules.
 *
 * Three.js scene serialization stays isolated from public route shells and can
 * be lazy-loaded by Studio scene/level tools when export/import is requested.
 */

import { useState, useCallback } from 'react';
import { SceneSerializer } from './serializer';
import type * as THREE from 'three';
import type { SceneSerialized } from './types';

export function useSceneSerializer() {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  const save = useCallback(async (
    scene: THREE.Scene,
    filename: string,
    metadata?: Partial<SceneSerialized>
  ): Promise<boolean> => {
    setIsSaving(true);
    setLastError(null);
    
    try {
      await SceneSerializer.saveToFile(scene, filename, metadata);
      return true;
    } catch (error) {
      setLastError(error as Error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, []);
  
  const load = useCallback(async (): Promise<{ scene: THREE.Scene; data: SceneSerialized } | null> => {
    setIsLoading(true);
    setLastError(null);
    
    try {
      return await SceneSerializer.loadFromFile();
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const serialize = useCallback((scene: THREE.Scene, metadata?: Partial<SceneSerialized>): SceneSerialized => {
    return SceneSerializer.serialize(scene, metadata);
  }, []);
  
  const deserialize = useCallback((data: SceneSerialized): THREE.Scene => {
    return SceneSerializer.deserialize(data);
  }, []);
  
  return {
    save,
    load,
    serialize,
    deserialize,
    isSaving,
    isLoading,
    lastError,
  };
}
