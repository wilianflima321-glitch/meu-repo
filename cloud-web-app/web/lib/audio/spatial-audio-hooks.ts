// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/**
 * React hooks for the spatial audio runtime.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { AudioSettings, SoundSettings } from './spatial-audio-contracts';
import { AudioSource } from './spatial-audio-source';
import { SpatialAudioManager } from './spatial-audio-system';

export function useSpatialAudio() {
  const managerRef = useRef<SpatialAudioManager>(new SpatialAudioManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState<AudioSettings>(managerRef.current.getSettings());
  const [activeSoundCount, setActiveSoundCount] = useState(0);

  useEffect(() => {
    const manager = managerRef.current;

    manager.on('initialized', () => setIsInitialized(true));
    manager.on('settingsChanged', ({ settings: s }) => setSettings(s));
    manager.on('soundStarted', () => setActiveSoundCount(manager.getActiveSounds().length));
    manager.on('soundEnded', () => setActiveSoundCount(manager.getActiveSounds().length));
    manager.on('soundStopped', () => setActiveSoundCount(manager.getActiveSounds().length));

    return () => {
      manager.removeAllListeners();
      manager.dispose();
    };
  }, []);

  const initialize = useCallback(async () => {
    await managerRef.current.initialize();
  }, []);

  const loadClip = useCallback(async (id: string, url: string) => {
    return managerRef.current.loadClip(id, url);
  }, []);

  const play = useCallback((
    clipId: string,
    options?: Partial<SoundSettings>,
    position?: THREE.Vector3
  ) => {
    return managerRef.current.play(clipId, options, position);
  }, []);

  const playAt = useCallback((
    clipId: string,
    position: THREE.Vector3,
    options?: Partial<SoundSettings>
  ) => {
    return managerRef.current.playAt(clipId, position, options);
  }, []);

  const stop = useCallback((soundId: string, fadeTime?: number) => {
    managerRef.current.stop(soundId, fadeTime);
  }, []);

  const playMusic = useCallback(async (clipId: string, fadeInTime?: number) => {
    return managerRef.current.playMusic(clipId, fadeInTime);
  }, []);

  const stopMusic = useCallback((fadeOutTime?: number) => {
    managerRef.current.stopMusic(fadeOutTime);
  }, []);

  const updateListenerFromCamera = useCallback((camera: THREE.Camera) => {
    managerRef.current.updateListenerFromCamera(camera);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    managerRef.current.updateSettings(newSettings);
  }, []);

  return {
    manager: managerRef.current,
    isInitialized,
    settings,
    activeSoundCount,
    initialize,
    loadClip,
    play,
    playAt,
    stop,
    playMusic,
    stopMusic,
    updateListenerFromCamera,
    updateSettings,
    mute: () => managerRef.current.mute(),
    unmute: () => managerRef.current.unmute(),
    toggleMute: () => managerRef.current.toggleMute(),
    resumeContext: () => managerRef.current.resumeContext(),
    suspendContext: () => managerRef.current.suspendContext(),
  };
}

export function useAudioSource(
  object3D: THREE.Object3D | null,
  clipId: string | null,
  options: Partial<SoundSettings> = {}
) {
  const { manager } = useSpatialAudio();
  const sourceRef = useRef<AudioSource | null>(null);

  useEffect(() => {
    if (object3D && clipId) {
      sourceRef.current = new AudioSource(manager, object3D, {
        clipId,
        settings: options,
      });
    }

    return () => {
      sourceRef.current?.stop();
      sourceRef.current = null;
    };
  }, [manager, object3D, clipId, options]);

  return sourceRef.current;
}
