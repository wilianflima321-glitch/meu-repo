/**
 * @aethel-heavy-async-boundary
 * React hooks and provider for governed level streaming.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';import type * as THREE from 'three';
import type { LevelState, StreamingConfig, StreamingMetrics, TransitionConfig } from './level-streaming-system';
import { LevelStreamingManager } from './level-streaming-system';

const StreamingContext = createContext<LevelStreamingManager | null>(null);

export function StreamingProvider({
  children,
  config,
  scene,
}: {
  children: React.ReactNode;
  config?: Partial<StreamingConfig>;
  scene?: THREE.Scene;
}) {
  const managerRef = useRef<LevelStreamingManager>(new LevelStreamingManager(config));

  useEffect(() => {
    if (scene) {
      managerRef.current.setRootScene(scene);
    }
  }, [scene]);

  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);

  return (
    <StreamingContext.Provider value={managerRef.current}>
      {children}
    </StreamingContext.Provider>
  );
}

export function useLevelStreaming() {
  const manager = useContext(StreamingContext);
  if (!manager) {
    throw new Error('useLevelStreaming must be used within a StreamingProvider');
  }

  const [metrics, setMetrics] = useState<StreamingMetrics>(manager.getMetrics());
  const [currentLevel, setCurrentLevel] = useState<string | null>(manager.getCurrentLevel());
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const updateMetrics = () => setMetrics(manager.getMetrics());
    const handleTransitionStart = () => setIsTransitioning(true);
    const handleTransitionEnd = ({ to }: { to: string }) => {
      setIsTransitioning(false);
      setCurrentLevel(to);
    };

    manager.on('levelLoaded', updateMetrics);
    manager.on('levelUnloaded', updateMetrics);
    manager.on('transitionStarted', handleTransitionStart);
    manager.on('transitionCompleted', handleTransitionEnd);

    const interval = setInterval(updateMetrics, 1000);

    return () => {
      manager.off('levelLoaded', updateMetrics);
      manager.off('levelUnloaded', updateMetrics);
      manager.off('transitionStarted', handleTransitionStart);
      manager.off('transitionCompleted', handleTransitionEnd);
      clearInterval(interval);
    };
  }, [manager]);

  const loadLevel = useCallback(async (levelId: string, waitForLoad = true) => {
    return manager.loadLevel(levelId, { waitForLoad });
  }, [manager]);

  const unloadLevel = useCallback(async (levelId: string) => {
    return manager.unloadLevel(levelId);
  }, [manager]);

  const transitionTo = useCallback(async (levelId: string, transition?: TransitionConfig) => {
    return manager.transitionToLevel(levelId, transition);
  }, [manager]);

  const updatePlayerPosition = useCallback((position: THREE.Vector3) => {
    manager.updatePlayerPosition(position);
  }, [manager]);

  return {
    manager,
    metrics,
    currentLevel,
    isTransitioning,
    loadLevel,
    unloadLevel,
    transitionTo,
    updatePlayerPosition,
    startStreaming: manager.startStreaming.bind(manager),
    stopStreaming: manager.stopStreaming.bind(manager),
    registerLevel: manager.registerLevel.bind(manager),
    registerLevels: manager.registerLevels.bind(manager),
  };
}

export function useLevelState(levelId: string) {
  const { manager } = useLevelStreaming();
  const [state, setState] = useState<LevelState | undefined>(manager.getLevelState(levelId));
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleProgress = ({ levelId: id, progress: p }: { levelId: string; progress: number }) => {
      if (id === levelId) setProgress(p);
    };

    const handleStateChange = ({ levelId: id }: { levelId: string }) => {
      if (id === levelId) {
        setState(manager.getLevelState(levelId));
      }
    };

    manager.on('levelLoadProgress', handleProgress);
    manager.on('levelLoadStarted', handleStateChange);
    manager.on('levelLoaded', handleStateChange);
    manager.on('levelUnloaded', handleStateChange);
    manager.on('levelShown', handleStateChange);
    manager.on('levelHidden', handleStateChange);

    return () => {
      manager.off('levelLoadProgress', handleProgress);
      manager.off('levelLoadStarted', handleStateChange);
      manager.off('levelLoaded', handleStateChange);
      manager.off('levelUnloaded', handleStateChange);
      manager.off('levelShown', handleStateChange);
      manager.off('levelHidden', handleStateChange);
    };
  }, [manager, levelId]);

  return { state, progress };
}
