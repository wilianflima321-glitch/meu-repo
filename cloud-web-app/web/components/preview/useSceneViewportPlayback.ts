'use client';

import { useCallback, useEffect, useState } from 'react';

import type { ViewportCreativeMode } from '@/components/viewport/AethelViewport3D';

const DEFAULT_TIMELINE_DURATION = 12;

export function useSceneViewportPlayback() {
  const [creativeMode, setCreativeMode] = useState<ViewportCreativeMode>('game');
  const [isPlaying, setIsPlaying] = useState(false);
  const [timelineTime, setTimelineTime] = useState(0);
  const [timelineDuration] = useState(DEFAULT_TIMELINE_DURATION);

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setTimelineTime((current) => {
        const next = Number((current + 0.1).toFixed(2));
        if (next >= timelineDuration) {
          return creativeMode === 'film' ? timelineDuration : 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [creativeMode, isPlaying, timelineDuration]);

  useEffect(() => {
    if (creativeMode === 'film' && timelineTime >= timelineDuration) {
      setIsPlaying(false);
    }
  }, [creativeMode, timelineDuration, timelineTime]);

  const handleTogglePlay = useCallback(() => {
    if (timelineTime >= timelineDuration && !isPlaying) {
      setTimelineTime(0);
    }
    setIsPlaying((current) => !current);
  }, [isPlaying, timelineDuration, timelineTime]);

  return {
    creativeMode,
    setCreativeMode,
    isPlaying,
    timelineTime,
    setTimelineTime,
    timelineDuration,
    handleTogglePlay,
  };
}
