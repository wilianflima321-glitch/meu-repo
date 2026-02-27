import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import type { SaveManagerConfig, SaveSlot, SaveStatus, SaveType } from './save-manager-types';
import { SaveManager } from './save-manager';

interface SaveContextValue {
  manager: SaveManager;
}

const SaveContext = createContext<SaveContextValue | null>(null);

export function SaveProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<SaveManagerConfig>;
}) {
  const value = useMemo(() => ({
    manager: new SaveManager(config),
  }), [config]);

  useEffect(() => {
    if (value.manager.getConfig().autosaveEnabled) {
      value.manager.startAutosave();
    }

    return () => {
      value.manager.dispose();
    };
  }, [value]);

  return (
    <SaveContext.Provider value={value}>
      {children}
    </SaveContext.Provider>
  );
}

export function useSaveManager() {
  const context = useContext(SaveContext);
  if (!context) {
    return SaveManager.getInstance();
  }
  return context.manager;
}

export function useSaveSlots() {
  const manager = useSaveManager();
  const [slots, setSlots] = useState<SaveSlot[]>(manager.getSlots());

  useEffect(() => {
    const update = () => setSlots(manager.getSlots());

    manager.on('saveComplete', update);
    manager.on('saveDeleted', update);
    manager.on('saveImported', update);
    manager.on('savesLoaded', update);

    return () => {
      manager.off('saveComplete', update);
      manager.off('saveDeleted', update);
      manager.off('saveImported', update);
      manager.off('savesLoaded', update);
    };
  }, [manager]);

  return slots;
}

export function useSaveStatus() {
  const manager = useSaveManager();
  const [status, setStatus] = useState<SaveStatus>(manager.getStatus());

  useEffect(() => {
    const updateStatus = () => setStatus(manager.getStatus());

    manager.on('saveStarted', updateStatus);
    manager.on('saveComplete', updateStatus);
    manager.on('saveError', updateStatus);
    manager.on('loadStarted', updateStatus);
    manager.on('loadComplete', updateStatus);
    manager.on('loadError', updateStatus);

    return () => {
      manager.off('saveStarted', updateStatus);
      manager.off('saveComplete', updateStatus);
      manager.off('saveError', updateStatus);
      manager.off('loadStarted', updateStatus);
      manager.off('loadComplete', updateStatus);
      manager.off('loadError', updateStatus);
    };
  }, [manager]);

  return status;
}

export function useSaveOperations() {
  const manager = useSaveManager();

  const save = useCallback(async (
    slotIndex: number,
    name: string,
    type?: SaveType,
    thumbnail?: string
  ) => manager.save(slotIndex, name, type, thumbnail), [manager]);

  const load = useCallback(async (slotIndex: number) => manager.load(slotIndex), [manager]);
  const quickSave = useCallback(() => manager.quickSave(), [manager]);
  const quickLoad = useCallback(() => manager.quickLoad(), [manager]);
  const deleteSave = useCallback(async (slotIndex: number) => manager.deleteSave(slotIndex), [manager]);

  return { save, load, quickSave, quickLoad, deleteSave };
}

export function usePlayTime() {
  const manager = useSaveManager();
  const [playTime, setPlayTime] = useState(manager.getTotalPlayTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setPlayTime(manager.getTotalPlayTime());
    }, 1000);

    return () => clearInterval(interval);
  }, [manager]);

  return playTime;
}
