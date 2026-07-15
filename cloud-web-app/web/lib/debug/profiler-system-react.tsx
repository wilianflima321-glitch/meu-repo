/**
 * React hooks for the governed profiler runtime.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { BudgetViolation, FrameMetrics, ProfilerConfig, ProfilerFrame } from './profiler-contracts';
import { Profiler, Timeline } from './profiler-system';

interface ProfilerContextValue {
  profiler: Profiler;
  timeline: Timeline;
}

const ProfilerContext = createContext<ProfilerContextValue | null>(null);

export function ProfilerProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<ProfilerConfig>;
}) {
  const value = useMemo(() => {
    const profiler = new Profiler(config);
    return {
      profiler,
      timeline: new Timeline(profiler),
    };
  }, [config]);

  useEffect(() => {
    return () => {
      value.profiler.dispose();
    };
  }, [value]);

  return (
    <ProfilerContext.Provider value={value}>
      {children}
    </ProfilerContext.Provider>
  );
}

export function useProfiler() {
  const context = useContext(ProfilerContext);
  return context?.profiler || Profiler.getInstance();
}

export function useTimeline() {
  const context = useContext(ProfilerContext);
  if (!context) {
    throw new Error('useTimeline must be used within ProfilerProvider');
  }
  return context.timeline;
}

export function useProfilerRecording() {
  const profiler = useProfiler();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const start = useCallback(() => {
    profiler.startRecording();
    setIsRecording(true);
    setIsPaused(false);
  }, [profiler]);

  const stop = useCallback(() => {
    profiler.stopRecording();
    setIsRecording(false);
    setIsPaused(false);
  }, [profiler]);

  const pause = useCallback(() => {
    profiler.pauseRecording();
    setIsPaused(true);
  }, [profiler]);

  const resume = useCallback(() => {
    profiler.resumeRecording();
    setIsPaused(false);
  }, [profiler]);

  return { isRecording, isPaused, start, stop, pause, resume };
}

export function useFrameMetrics() {
  const profiler = useProfiler();
  const [metrics, setMetrics] = useState<FrameMetrics | null>(null);
  const [frameTime, setFrameTime] = useState(0);

  useEffect(() => {
    const handleFrame = (frame: ProfilerFrame) => {
      setMetrics(frame.metrics);
      setFrameTime(frame.duration);
    };

    profiler.on('frameEnded', handleFrame);

    return () => {
      profiler.off('frameEnded', handleFrame);
    };
  }, [profiler]);

  return { metrics, frameTime, average: profiler.getAverageMetrics() };
}

export function useBudgetViolations() {
  const profiler = useProfiler();
  const [violations, setViolations] = useState<BudgetViolation[]>([]);

  useEffect(() => {
    const handleViolation = (violation: BudgetViolation) => {
      setViolations(prev => [...prev.slice(-100), violation]);
    };

    profiler.on('budgetViolation', handleViolation);

    return () => {
      profiler.off('budgetViolation', handleViolation);
    };
  }, [profiler]);

  return violations;
}

export function useProfileScope(name: string, category = 'default') {
  const profiler = useProfiler();
  const sampleIdRef = useRef<string>('');

  const begin = useCallback(() => {
    sampleIdRef.current = profiler.beginSample(name, category);
  }, [profiler, name, category]);

  const end = useCallback(() => {
    if (sampleIdRef.current) {
      profiler.endSample(sampleIdRef.current);
      sampleIdRef.current = '';
    }
  }, [profiler]);

  return { begin, end };
}
