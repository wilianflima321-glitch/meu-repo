/**
 * Animation System - split runtime modules.
 *
 * Animation player, state machine, timeline, and hooks are separated so Studio
 * can lazy-load only the animation layer needed by each editor surface.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AnimationPlayer } from './player';
import { AnimationTimeline } from './timeline';
import type { AnimationClipData, AnimationTrack, EasingType, PropertyType } from './types';

export function useAnimationPlayer(target: Record<string, unknown>) {
  const playerRef = useRef<AnimationPlayer>(new AnimationPlayer(target));
  const [activeClips, setActiveClips] = useState<string[]>([]);
  
  const play = useCallback((clipId: string, options?: Parameters<AnimationPlayer['play']>[1]) => {
    playerRef.current.play(clipId, options);
    setActiveClips(playerRef.current.getActiveClips());
  }, []);
  
  const stop = useCallback((clipId: string, fadeOut?: number) => {
    playerRef.current.stop(clipId, fadeOut);
    setActiveClips(playerRef.current.getActiveClips());
  }, []);
  
  const pause = useCallback((clipId?: string) => {
    playerRef.current.pause(clipId);
  }, []);
  
  const resume = useCallback((clipId?: string) => {
    playerRef.current.resume(clipId);
  }, []);
  
  const registerClip = useCallback((clip: AnimationClipData) => {
    playerRef.current.registerClip(clip);
  }, []);
  
  const update = useCallback((deltaTime: number) => {
    playerRef.current.update(deltaTime);
  }, []);
  
  return {
    player: playerRef.current,
    activeClips,
    play,
    stop,
    pause,
    resume,
    registerClip,
    update,
  };
}

export function useAnimationTimeline(initialName?: string) {
  const timelineRef = useRef<AnimationTimeline>(new AnimationTimeline(initialName));
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<AnimationTrack<unknown>[]>([]);
  const [selection, setSelection] = useState<{ trackId: string | null; keyframeIndex: number | null }>({
    trackId: null,
    keyframeIndex: null,
  });
  
  useEffect(() => {
    const timeline = timelineRef.current;
    
    timeline.on('timeUpdate', ({ time }) => setCurrentTime(time));
    timeline.on('play', () => setIsPlaying(true));
    timeline.on('pause', () => setIsPlaying(false));
    timeline.on('stop', () => { setIsPlaying(false); setCurrentTime(0); });
    timeline.on('trackAdded', () => setTracks(timeline.getAllTracks()));
    timeline.on('trackRemoved', () => setTracks(timeline.getAllTracks()));
    timeline.on('keyframeAdded', () => setTracks(timeline.getAllTracks()));
    timeline.on('keyframeRemoved', () => setTracks(timeline.getAllTracks()));
    timeline.on('selectionChanged', ({ trackId, keyframeIndex }) => {
      setSelection({ trackId, keyframeIndex });
    });
    
    return () => {
      timeline.removeAllListeners();
    };
  }, []);
  
  return {
    timeline: timelineRef.current,
    currentTime,
    isPlaying,
    tracks,
    selection,
    play: () => timelineRef.current.play(),
    pause: () => timelineRef.current.pause(),
    stop: () => timelineRef.current.stop(),
    seek: (time: number) => timelineRef.current.seek(time),
    addTrack: <T,>(name: string, path: string, type: PropertyType) => 
      timelineRef.current.addTrack<T>(name, path, type),
    addKeyframe: <T,>(trackId: string, time: number, value: T, easing?: EasingType) =>
      timelineRef.current.addKeyframe(trackId, time, value, easing),
  };
}
