/**
 * World Streaming - split runtime modules.
 *
 * World streaming stays behind Studio/game runtime boundaries; public route
 * shells should consume only summaries or manifests, never this runtime barrel.
 */

import { useState, useEffect, useContext, createContext, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { WorldStreamingSystem } from './system';
import type { ChunkLoader, EntityLOD, LODLevel, StreamingConfig, StreamingStats, Vector3, WorldChunk } from './types';

interface WorldStreamingContextValue {
  system: WorldStreamingSystem;
}

const WorldStreamingContext = createContext<WorldStreamingContextValue | null>(null);

export function WorldStreamingProvider({ 
  children,
  config,
  chunkLoader,
}: { 
  children: ReactNode;
  config?: Partial<StreamingConfig>;
  chunkLoader?: ChunkLoader;
}) {
  const value = useMemo(() => ({
    system: new WorldStreamingSystem(config),
  }), [config]);
  
  useEffect(() => {
    if (chunkLoader) {
      value.system.setChunkLoader(chunkLoader);
    }
    value.system.start();
    
    return () => {
      value.system.dispose();
    };
  }, [value, chunkLoader]);
  
  return (
    <WorldStreamingContext.Provider value={value}>
      {children}
    </WorldStreamingContext.Provider>
  );
}

export function useWorldStreaming() {
  const context = useContext(WorldStreamingContext);
  if (!context) {
    return WorldStreamingSystem.getInstance();
  }
  return context.system;
}

export function useStreamingStats() {
  const system = useWorldStreaming();
  const [stats, setStats] = useState<StreamingStats>(system.getStats());
  
  useEffect(() => {
    const onUpdate = (newStats: StreamingStats) => setStats(newStats);
    system.on('update', onUpdate);
    
    return () => {
      system.off('update', onUpdate);
    };
  }, [system]);
  
  return stats;
}

export function useViewerPosition() {
  const system = useWorldStreaming();
  
  return useCallback((position: Vector3, direction?: Vector3) => {
    system.setViewerPosition(position, direction);
  }, [system]);
}

export function useVisibleChunks() {
  const system = useWorldStreaming();
  const [visible, setVisible] = useState<WorldChunk[]>([]);
  
  useEffect(() => {
    const update = () => setVisible(system.getVisibleChunks());
    
    system.on('update', update);
    system.on('chunkLoaded', update);
    system.on('chunkUnloaded', update);
    
    return () => {
      system.off('update', update);
      system.off('chunkLoaded', update);
      system.off('chunkUnloaded', update);
    };
  }, [system]);
  
  return visible;
}

export function useChunkState(position: Vector3) {
  const system = useWorldStreaming();
  const [chunk, setChunk] = useState<WorldChunk | undefined>();
  
  useEffect(() => {
    const update = () => setChunk(system.getChunkAtPosition(position));
    
    update();
    system.on('update', update);
    
    return () => {
      system.off('update', update);
    };
  }, [system, position]);
  
  return chunk;
}

export function useEntityLOD(entityId: string, initialPosition: Vector3) {
  const system = useWorldStreaming();
  const [lod, setLod] = useState<LODLevel>(4);
  
  useEffect(() => {
    system.registerEntity(entityId, initialPosition);
    
    const onLodChange = (entity: EntityLOD) => {
      if (entity.entityId === entityId) {
        setLod(entity.currentLOD);
      }
    };
    
    system.on('entityLODChanged', onLodChange);
    
    return () => {
      system.unregisterEntity(entityId);
      system.off('entityLODChanged', onLodChange);
    };
  }, [system, entityId, initialPosition]);
  
  const updatePosition = useCallback((position: Vector3) => {
    system.updateEntityPosition(entityId, position);
  }, [system, entityId]);
  
  return { lod, updatePosition };
}
