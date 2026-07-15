'use client';

import type { LightningBolt, WeatherConfig, WeatherState, WeatherType } from './weather-system.contracts';
import { WeatherSystem } from './weather-system';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface WeatherContextValue {
  system: WeatherSystem;
}

const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<WeatherConfig>;
}) {
  const value = useMemo(() => ({
    system: new WeatherSystem(config),
  }), [config]);

  useEffect(() => {
    value.system.start();

    return () => {
      value.system.dispose();
    };
  }, [value]);

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) {
    return WeatherSystem.getInstance();
  }
  return context.system;
}

export function useWeatherState() {
  const weather = useWeather();
  const [state, setState] = useState<WeatherState>(weather.getState());

  useEffect(() => {
    const update = (s: WeatherState) => setState({ ...s });
    weather.on('update', update);
    weather.on('weatherChanged', update);

    return () => {
      weather.off('update', update);
      weather.off('weatherChanged', update);
    };
  }, [weather]);

  return state;
}

export function useWeatherTransition() {
  const weather = useWeather();
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const onStart = () => setIsTransitioning(true);
    const onProgress = (p: number) => setProgress(p);
    const onComplete = () => {
      setIsTransitioning(false);
      setProgress(0);
    };

    weather.on('transitionStarted', onStart);
    weather.on('transitionProgress', onProgress);
    weather.on('transitionComplete', onComplete);

    return () => {
      weather.off('transitionStarted', onStart);
      weather.off('transitionProgress', onProgress);
      weather.off('transitionComplete', onComplete);
    };
  }, [weather]);

  const setWeather = useCallback((type: WeatherType, immediate = false) => {
    weather.setWeather(type, immediate);
  }, [weather]);

  return { progress, isTransitioning, setWeather };
}

export function useWind() {
  const weather = useWeather();

  const getWindAt = useCallback((x: number, y: number, z: number) => {
    return weather.getWindAtPosition(x, y, z);
  }, [weather]);

  return { getWindAt };
}

export function useLightning() {
  const weather = useWeather();
  const [lastBolt, setLastBolt] = useState<LightningBolt | null>(null);
  const [lastThunder, setLastThunder] = useState<{ distance: number; intensity: number } | null>(null);

  useEffect(() => {
    const onLightning = (bolt: LightningBolt) => setLastBolt(bolt);
    const onThunder = (data: { distance: number; intensity: number }) => setLastThunder(data);

    weather.on('lightning', onLightning);
    weather.on('thunder', onThunder);

    return () => {
      weather.off('lightning', onLightning);
      weather.off('thunder', onThunder);
    };
  }, [weather]);

  return { lastBolt, lastThunder };
}
