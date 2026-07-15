import { useEffect, useState } from 'react';
import { SceneManager } from './scene-graph-manager';

export function useSceneGraph() {
  const [tick, setTick] = useState(0);
  const manager = SceneManager.instance;

  useEffect(() => {
    const handleChange = () => {
      setTick(t => t + 1);
    };

    manager.on('crdtChanged', handleChange);
    manager.on('sceneLoadedFromFile', handleChange);
    manager.on('sceneSaved', handleChange);
    manager.on('sceneCreated', handleChange);

    return () => {
      manager.off('crdtChanged', handleChange);
      manager.off('sceneLoadedFromFile', handleChange);
      manager.off('sceneSaved', handleChange);
      manager.off('sceneCreated', handleChange);
    };
  }, [manager]);

  return {
    scenes: manager.scenes,
    activeScene: manager.activeScene,
    tick
  };
}
