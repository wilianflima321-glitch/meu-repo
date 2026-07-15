'use client';

import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { HapticsConfig } from './haptics-system.contracts';
import { HapticsSystem } from './haptics-system-core';

interface HapticsContextValue {
  system: HapticsSystem;
}

const HapticsContext = createContext<HapticsContextValue | null>(null);

export function HapticsProvider({
  children,
  config,
}: {
  children: React.ReactNode;
  config?: Partial<HapticsConfig>;
}) {
  const value = useMemo(() => ({
    system: new HapticsSystem(config),
  }), [config]);

  useEffect(() => {
    return () => {
      value.system.dispose();
    };
  }, [value]);

  return (
    <HapticsContext.Provider value={value}>
      {children}
    </HapticsContext.Provider>
  );
}

export function useHaptics() {
  const context = useContext(HapticsContext);
  if (!context) {
    return HapticsSystem.getInstance();
  }
  return context.system;
}

export function useHapticFeedback() {
  const haptics = useHaptics();

  const play = useCallback((effectId: string, intensity?: number) => {
    return haptics.play(effectId, { intensity });
  }, [haptics]);

  const stop = useCallback((playId: string) => {
    haptics.stop(playId);
  }, [haptics]);

  const stopAll = useCallback(() => {
    haptics.stopAll();
  }, [haptics]);

  // Basic feedback
  const tap = useCallback((strength?: 'light' | 'medium' | 'heavy') => {
    return haptics.tap(strength);
  }, [haptics]);

  const impact = useCallback((strength?: 'light' | 'medium' | 'heavy') => {
    return haptics.impact(strength);
  }, [haptics]);

  const selection = useCallback(() => {
    return haptics.selection();
  }, [haptics]);

  return { play, stop, stopAll, tap, impact, selection };
}

export function useGameHaptics() {
  const haptics = useHaptics();

  const damage = useCallback((intensity?: number) => haptics.damage(intensity), [haptics]);
  const explosion = useCallback((intensity?: number) => haptics.explosion(intensity), [haptics]);
  const gunshot = useCallback((intensity?: number) => haptics.gunshot(intensity), [haptics]);
  const punch = useCallback((intensity?: number) => haptics.punch(intensity), [haptics]);
  const footstep = useCallback((intensity?: number) => haptics.footstep(intensity), [haptics]);

  return { damage, explosion, gunshot, punch, footstep };
}

export function useUIHaptics() {
  const haptics = useHaptics();

  const buttonPress = useCallback(() => haptics.buttonPress(), [haptics]);
  const menuNavigate = useCallback(() => haptics.menuNavigate(), [haptics]);
  const confirm = useCallback(() => haptics.confirm(), [haptics]);
  const cancel = useCallback(() => haptics.cancel(), [haptics]);
  const error = useCallback(() => haptics.error(), [haptics]);
  const success = useCallback(() => haptics.success(), [haptics]);
  const warning = useCallback(() => haptics.warning(), [haptics]);

  return { buttonPress, menuNavigate, confirm, cancel, error, success, warning };
}

export function useHapticsEnabled() {
  const haptics = useHaptics();
  const [enabled, setEnabled] = useState(haptics.getConfig().enabled);

  useEffect(() => {
    const update = (e: boolean) => setEnabled(e);
    haptics.on('enabledChanged', update);

    return () => {
      haptics.off('enabledChanged', update);
    };
  }, [haptics]);

  const toggle = useCallback(() => {
    haptics.setEnabled(!enabled);
  }, [haptics, enabled]);

  const set = useCallback((value: boolean) => {
    haptics.setEnabled(value);
  }, [haptics]);

  return { enabled, toggle, set };
}

export function useHapticsIntensity() {
  const haptics = useHaptics();
  const [intensity, setIntensity] = useState(haptics.getConfig().globalIntensity);

  useEffect(() => {
    const update = (i: number) => setIntensity(i);
    haptics.on('intensityChanged', update);

    return () => {
      haptics.off('intensityChanged', update);
    };
  }, [haptics]);

  const set = useCallback((value: number) => {
    haptics.setIntensity(value);
  }, [haptics]);

  return { intensity, setIntensity: set };
}
