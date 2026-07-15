'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CutsceneManager } from './manager';
import { type CutsceneState } from './types';

const CutsceneContext = createContext<CutsceneManager | null>(null);

export function CutsceneProvider({ children }: { children: ReactNode }) {
  const managerRef = useRef<CutsceneManager>(new CutsceneManager());
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <CutsceneContext.Provider value={managerRef.current}>
      {children}
    </CutsceneContext.Provider>
  );
}

export function useCutscene() {
  const manager = useContext(CutsceneContext);
  if (!manager) {
    throw new Error('useCutscene must be used within a CutsceneProvider');
  }
  
  const [state, setState] = useState<CutsceneState>(manager.getState());
  
  useEffect(() => {
    const handleUpdate = () => {
      setState(manager.getState());
    };
    
    manager.on('update', handleUpdate);
    manager.on('started', handleUpdate);
    manager.on('completed', handleUpdate);
    manager.on('paused', handleUpdate);
    manager.on('resumed', handleUpdate);
    manager.on('stopped', handleUpdate);
    
    return () => {
      manager.off('update', handleUpdate);
      manager.off('started', handleUpdate);
      manager.off('completed', handleUpdate);
      manager.off('paused', handleUpdate);
      manager.off('resumed', handleUpdate);
      manager.off('stopped', handleUpdate);
    };
  }, [manager]);
  
  const play = useCallback((cutsceneId: string) => {
    return manager.play(cutsceneId);
  }, [manager]);
  
  const pause = useCallback(() => {
    manager.pause();
  }, [manager]);
  
  const resume = useCallback(() => {
    manager.resume();
  }, [manager]);
  
  const stop = useCallback(() => {
    manager.stop();
  }, [manager]);
  
  const skip = useCallback(() => {
    manager.skip();
  }, [manager]);
  
  return {
    manager,
    state,
    play,
    pause,
    resume,
    stop,
    skip,
    register: manager.register.bind(manager),
    update: manager.update.bind(manager),
  };
}

export function useCutsceneEvents() {
  const { manager } = useCutscene();
  
  const onEvent = useCallback((handler: (eventId: string, data?: unknown) => void) => {
    const listener = ({ eventId, data }: { eventId: string; data?: unknown }) => {
      handler(eventId, data);
    };
    
    manager.on('event', listener);
    
    return () => {
      manager.off('event', listener);
    };
  }, [manager]);
  
  return { onEvent };
}
