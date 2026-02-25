/** Replay React hooks and provider. */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { PlaybackState, Recording, RecordingMetadata, ReplayConfig } from './replay-types';
import { ReplayManager } from './replay-manager';
import { ReplayPlayer, ReplayRecorder } from './replay-runtime';

// REACT HOOKS
// ============================================================================

interface ReplayContextValue {
  manager: ReplayManager;
  recorder: ReplayRecorder;
  player: ReplayPlayer;
}

const ReplayContext = createContext<ReplayContextValue | null>(null);

export function ReplayProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<ReplayConfig>;
}) {
  const value = useMemo(() => {
    const manager = new ReplayManager(config);
    return {
      manager,
      recorder: manager.getRecorder(),
      player: manager.getPlayer(),
    };
  }, [config]);
  
  useEffect(() => {
    return () => {
      value.manager.dispose();
    };
  }, [value]);
  
  return (
    <ReplayContext.Provider value={value}>
      {children}
    </ReplayContext.Provider>
  );
}

export function useReplayManager() {
  const context = useContext(ReplayContext);
  if (!context) {
    throw new Error('useReplayManager must be used within ReplayProvider');
  }
  return context.manager;
}

export function useReplayRecorder() {
  const context = useContext(ReplayContext);
  if (!context) {
    throw new Error('useReplayRecorder must be used within ReplayProvider');
  }
  
  const recorder = context.recorder;
  const [isRecording, setIsRecording] = useState(false);
  const [frameCount, setFrameCount] = useState(0);
  
  useEffect(() => {
    const onStart = () => setIsRecording(true);
    const onStop = () => setIsRecording(false);
    const onFrame = () => setFrameCount(recorder.getCurrentFrame());
    
    recorder.on('recordingStarted', onStart);
    recorder.on('recordingStopped', onStop);
    recorder.on('frameRecorded', onFrame);
    
    return () => {
      recorder.off('recordingStarted', onStart);
      recorder.off('recordingStopped', onStop);
      recorder.off('frameRecorded', onFrame);
    };
  }, [recorder]);
  
  const start = useCallback((metadata?: Partial<RecordingMetadata>) => {
    recorder.startRecording(metadata);
  }, [recorder]);
  
  const stop = useCallback(() => {
    return recorder.stopRecording();
  }, [recorder]);
  
  return { recorder, isRecording, frameCount, start, stop };
}

export function useReplayPlayer() {
  const context = useContext(ReplayContext);
  if (!context) {
    throw new Error('useReplayPlayer must be used within ReplayProvider');
  }
  
  const player = context.player;
  const [state, setState] = useState<PlaybackState>(player.getState());
  
  useEffect(() => {
    const update = () => setState(player.getState());
    
    player.on('playbackStarted', update);
    player.on('playbackPaused', update);
    player.on('playbackResumed', update);
    player.on('playbackStopped', update);
    player.on('seeked', update);
    player.on('speedChanged', update);
    player.on('frameUpdated', update);
    
    return () => {
      player.removeAllListeners();
    };
  }, [player]);
  
  return { player, state };
}

export function useReplayRecordings() {
  const manager = useReplayManager();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  
  useEffect(() => {
    const update = () => setRecordings(manager.getRecordings());
    
    update();
    manager.on('recordingStopped', update);
    
    return () => {
      manager.off('recordingStopped', update);
    };
  }, [manager]);
  
  return recordings;
}
