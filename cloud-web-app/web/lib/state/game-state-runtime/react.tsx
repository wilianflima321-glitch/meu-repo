/**
 * Game State Manager - split persistence runtime.
 *
 * This keeps save/load, migration, compression, and React bindings isolated so
 * editor shells can load only the state surface they need.
 */

import { useState, useCallback, useRef, useEffect, useContext, createContext, type ReactNode } from 'react';
import { GameStateManager } from './manager';
import type { GameState, SaveSlot } from './types';

const GameStateContext = createContext<GameStateManager | null>(null);

export function GameStateProvider({ 
  children, 
  options = {} 
}: { 
  children: ReactNode;
  options?: ConstructorParameters<typeof GameStateManager>[0];
}) {
  const managerRef = useRef<GameStateManager>(new GameStateManager(options));
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <GameStateContext.Provider value={managerRef.current}>
      {children}
    </GameStateContext.Provider>
  );
}

export function useGameState() {
  const manager = useContext(GameStateContext);
  if (!manager) {
    throw new Error('useGameState must be used within a GameStateProvider');
  }
  
  const [state, setState] = useState<GameState | null>(manager.getCurrentState());
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const updateState = () => setState(manager.getCurrentState());
    
    manager.on('stateUpdated', updateState);
    manager.on('loaded', updateState);
    manager.on('newGame', updateState);
    
    return () => {
      manager.off('stateUpdated', updateState);
      manager.off('loaded', updateState);
      manager.off('newGame', updateState);
    };
  }, [manager]);
  
  const refreshSlots = useCallback(async () => {
    const loadedSlots = await manager.getSlots();
    setSlots(loadedSlots);
  }, [manager]);
  
  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);
  
  const save = useCallback(async (slotIndex: number, name: string, thumbnail?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await manager.save(slotIndex, name, thumbnail);
      await refreshSlots();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [manager, refreshSlots]);
  
  const load = useCallback(async (slotIndex: number) => {
    setLoading(true);
    setError(null);
    
    try {
      await manager.load(slotIndex);
      setState(manager.getCurrentState());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [manager]);
  
  const deleteSave = useCallback(async (slotIndex: number) => {
    await manager.deleteSave(slotIndex);
    await refreshSlots();
  }, [manager, refreshSlots]);
  
  return {
    manager,
    state,
    slots,
    loading,
    error,
    save,
    load,
    deleteSave,
    refreshSlots,
    newGame: () => manager.newGame(),
    getPlayTime: () => manager.getFormattedPlayTime(),
    startAutoSave: () => manager.startAutoSave(),
    stopAutoSave: () => manager.stopAutoSave(),
    createCheckpoint: (id: string) => manager.createCheckpoint(id),
    loadCheckpoint: (id: string) => manager.loadCheckpoint(id),
  };
}
