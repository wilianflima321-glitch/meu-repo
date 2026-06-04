'use client';

/**
 * React provider and hooks for the day/night runtime.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { DayNightConfig, Season, SkyState, TimeState } from './day-night-cycle';
import { DayNightCycle } from './day-night-cycle';

interface DayNightContextValue {
  cycle: DayNightCycle;
}

const DayNightContext = createContext<DayNightContextValue | null>(null);

export function DayNightProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<DayNightConfig>;
}) {
  const value = useMemo(() => ({
    cycle: new DayNightCycle(config),
  }), [config]);

  useEffect(() => {
    value.cycle.start();

    return () => {
      value.cycle.dispose();
    };
  }, [value]);

  return (
    <DayNightContext.Provider value={value}>
      {children}
    </DayNightContext.Provider>
  );
}

export function useDayNightCycle() {
  const context = useContext(DayNightContext);
  if (!context) {
    return DayNightCycle.getInstance();
  }
  return context.cycle;
}

export function useTimeState() {
  const cycle = useDayNightCycle();
  const [state, setState] = useState<TimeState>(cycle.getTimeState());

  useEffect(() => {
    const update = () => setState(cycle.getTimeState());
    cycle.on('update', update);
    cycle.on('timeSet', update);

    return () => {
      cycle.off('update', update);
      cycle.off('timeSet', update);
    };
  }, [cycle]);

  return state;
}

export function useSkyState() {
  const cycle = useDayNightCycle();
  const [state, setState] = useState<SkyState>(cycle.getSkyState());

  useEffect(() => {
    const update = () => setState(cycle.getSkyState());
    cycle.on('update', update);

    return () => {
      cycle.off('update', update);
    };
  }, [cycle]);

  return state;
}

export function useSunDirection() {
  const cycle = useDayNightCycle();
  const [dir, setDir] = useState(cycle.getSunDirection());

  useEffect(() => {
    const update = () => setDir(cycle.getSunDirection());
    cycle.on('update', update);

    return () => {
      cycle.off('update', update);
    };
  }, [cycle]);

  return dir;
}

export function useTimeControl() {
  const cycle = useDayNightCycle();

  const setTime = useCallback((hours: number) => {
    cycle.setTime(hours);
  }, [cycle]);

  const setDate = useCallback((day: number, year?: number) => {
    cycle.setDate(day, year);
  }, [cycle]);

  const setTimeScale = useCallback((scale: number) => {
    cycle.setTimeScale(scale);
  }, [cycle]);

  const pause = useCallback(() => cycle.pause(), [cycle]);
  const resume = useCallback(() => cycle.resume(), [cycle]);

  return { setTime, setDate, setTimeScale, pause, resume };
}

export function useSeason() {
  const cycle = useDayNightCycle();
  const [season, setSeason] = useState<Season>(cycle.getSeason());

  useEffect(() => {
    const update = (s: Season) => setSeason(s);
    cycle.on('seasonChanged', update);

    return () => {
      cycle.off('seasonChanged', update);
    };
  }, [cycle]);

  return season;
}
