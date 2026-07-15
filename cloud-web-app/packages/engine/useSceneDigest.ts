import { useEffect, useState } from 'react';
import { SceneManager } from './scene-graph-manager';

export interface SceneDigest {
  activeCameraPosition?: [number, number, number];
  activeCameraRotation?: [number, number, number];
  selectedEntities: {
    id: string;
    name: string;
    position?: [number, number, number];
    type: string;
  }[];
}

export function useSceneDigest(): SceneDigest | null {
  const [digest, setDigest] = useState<SceneDigest | null>(null);

  useEffect(() => {
    const updateDigest = () => {
      const manager = SceneManager.instance;
      const scene = manager.activeScene;
      
      if (!scene) {
        setDigest(null);
        return;
      }

      const activeCamera = scene.activeCamera;
      const cameraPosition = activeCamera ? activeCamera.transform.position : undefined;
      const cameraRotation = activeCamera ? activeCamera.transform.eulerAngles : undefined;

      const selectedEntities = manager.activeSelection.map(id => {
        const node = scene.getNodeById(id);
        return {
          id,
          name: node?.name || 'Unknown',
          position: node ? [node.transform.position.x, node.transform.position.y, node.transform.position.z] as [number, number, number] : undefined,
          type: node ? (node.getComponents().length > 0 ? node.getComponents()[0].constructor.name : 'Empty') : 'Unknown'
        };
      });

      setDigest({
        activeCameraPosition: cameraPosition ? [cameraPosition.x, cameraPosition.y, cameraPosition.z] : undefined,
        activeCameraRotation: cameraRotation ? [cameraRotation.x, cameraRotation.y, cameraRotation.z] : undefined,
        selectedEntities
      });
    };

    const manager = SceneManager.instance;
    manager.on('sceneLoaded', updateDigest);
    manager.on('sceneUnloaded', updateDigest);
    manager.on('selectionChanged', updateDigest);
    manager.on('activeCameraChanged', updateDigest);
    
    // Fallback polling for camera transform updates (since camera move doesn't emit event natively)
    const interval = setInterval(updateDigest, 1000);

    updateDigest();

    return () => {
      manager.off('sceneLoaded', updateDigest);
      manager.off('sceneUnloaded', updateDigest);
      manager.off('selectionChanged', updateDigest);
      manager.off('activeCameraChanged', updateDigest);
      clearInterval(interval);
    };
  }, []);

  return digest;
}
