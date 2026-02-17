/**
 * Haptics/Rumble System - Sistema de Vibração e Feedback Tátil
 * 
 * Sistema completo com:
 * - Gamepad vibration (Gamepad API)
 * - Mobile haptic feedback (Vibration API)
 * - Haptic patterns and effects
 * - Intensity scaling
 * - Custom haptic sequences
 * - Event-based haptics
 * - Platform detection
 * - Accessibility options
 * 
 * @module lib/input/haptics-system
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type HapticType = 
  | 'light'
  | 'medium'
  | 'heavy'
  | 'rigid'
  | 'soft'
  | 'selection'
  | 'impact'
  | 'notification'
  | 'warning'
  | 'error'
  | 'success';

export type HapticMotor = 'weak' | 'strong' | 'both';

export interface HapticEffect {
  name: string;
  pattern: HapticPulse[];
  loop?: boolean;
  intensity?: number;
}

export interface HapticPulse {
  duration: number; // ms
  weakMagnitude: number; // 0-1
  strongMagnitude: number; // 0-1
  delay?: number; // ms delay before pulse
}

export interface HapticEvent {
  type: string;
  effect: string;
  intensity?: number;
  motor?: HapticMotor;
}

export interface GamepadHapticState {
  gamepadIndex: number;
  playing: boolean;
  effectId: string | null;
  startTime: number;
  intensity: number;
}

export interface HapticsConfig {
  enabled: boolean;
  globalIntensity: number; // 0-1
  gamepadEnabled: boolean;
  mobileEnabled: boolean;
  defaultMotor: HapticMotor;
  maxDuration: number; // max ms for any effect
  respectAccessibility: boolean;
}

// ============================================================================
// HAPTIC EFFECTS LIBRARY
// ============================================================================

export const HAPTIC_EFFECTS: Record<string, HapticEffect> = {
  // Basic effects
  light_tap: {
    name: 'Light Tap',
    pattern: [{ duration: 15, weakMagnitude: 0.3, strongMagnitude: 0 }],
  },
  medium_tap: {
    name: 'Medium Tap',
    pattern: [{ duration: 25, weakMagnitude: 0.5, strongMagnitude: 0.2 }],
  },
  heavy_tap: {
    name: 'Heavy Tap',
    pattern: [{ duration: 40, weakMagnitude: 0.7, strongMagnitude: 0.5 }],
  },
  
  // Selection
  selection: {
    name: 'Selection',
    pattern: [{ duration: 10, weakMagnitude: 0.2, strongMagnitude: 0 }],
  },
  
  // Impact effects
  impact_light: {
    name: 'Impact Light',
    pattern: [
      { duration: 20, weakMagnitude: 0.4, strongMagnitude: 0.1 },
    ],
  },
  impact_medium: {
    name: 'Impact Medium',
    pattern: [
      { duration: 35, weakMagnitude: 0.6, strongMagnitude: 0.4 },
    ],
  },
  impact_heavy: {
    name: 'Impact Heavy',
    pattern: [
      { duration: 50, weakMagnitude: 0.8, strongMagnitude: 0.8 },
    ],
  },
  
  // Continuous effects
  continuous_light: {
    name: 'Continuous Light',
    pattern: [
      { duration: 100, weakMagnitude: 0.3, strongMagnitude: 0 },
    ],
    loop: true,
  },
  continuous_medium: {
    name: 'Continuous Medium',
    pattern: [
      { duration: 100, weakMagnitude: 0.5, strongMagnitude: 0.2 },
    ],
    loop: true,
  },
  continuous_heavy: {
    name: 'Continuous Heavy',
    pattern: [
      { duration: 100, weakMagnitude: 0.8, strongMagnitude: 0.6 },
    ],
    loop: true,
  },
  
  // Game events
  damage: {
    name: 'Damage',
    pattern: [
      { duration: 100, weakMagnitude: 0.7, strongMagnitude: 0.9 },
      { duration: 50, weakMagnitude: 0.3, strongMagnitude: 0.4, delay: 50 },
    ],
  },
  explosion: {
    name: 'Explosion',
    pattern: [
      { duration: 150, weakMagnitude: 1.0, strongMagnitude: 1.0 },
      { duration: 100, weakMagnitude: 0.6, strongMagnitude: 0.8, delay: 30 },
      { duration: 80, weakMagnitude: 0.3, strongMagnitude: 0.5, delay: 30 },
    ],
  },
  gunshot: {
    name: 'Gunshot',
    pattern: [
      { duration: 60, weakMagnitude: 0.8, strongMagnitude: 1.0 },
      { duration: 30, weakMagnitude: 0.2, strongMagnitude: 0.3, delay: 20 },
    ],
  },
  punch: {
    name: 'Punch',
    pattern: [
      { duration: 40, weakMagnitude: 0.6, strongMagnitude: 0.8 },
    ],
  },
  footstep: {
    name: 'Footstep',
    pattern: [
      { duration: 20, weakMagnitude: 0.2, strongMagnitude: 0.1 },
    ],
  },
  jump: {
    name: 'Jump',
    pattern: [
      { duration: 30, weakMagnitude: 0.4, strongMagnitude: 0.3 },
    ],
  },
  land: {
    name: 'Land',
    pattern: [
      { duration: 50, weakMagnitude: 0.5, strongMagnitude: 0.6 },
    ],
  },
  heal: {
    name: 'Heal',
    pattern: [
      { duration: 100, weakMagnitude: 0.2, strongMagnitude: 0 },
      { duration: 100, weakMagnitude: 0.3, strongMagnitude: 0.1, delay: 100 },
      { duration: 100, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 100 },
    ],
  },
  pickup: {
    name: 'Pickup',
    pattern: [
      { duration: 25, weakMagnitude: 0.3, strongMagnitude: 0.1 },
      { duration: 25, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 50 },
    ],
  },
  
  // UI effects
  button_press: {
    name: 'Button Press',
    pattern: [{ duration: 10, weakMagnitude: 0.15, strongMagnitude: 0 }],
  },
  menu_navigate: {
    name: 'Menu Navigate',
    pattern: [{ duration: 8, weakMagnitude: 0.1, strongMagnitude: 0 }],
  },
  confirm: {
    name: 'Confirm',
    pattern: [
      { duration: 20, weakMagnitude: 0.3, strongMagnitude: 0.1 },
      { duration: 15, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 50 },
    ],
  },
  cancel: {
    name: 'Cancel',
    pattern: [
      { duration: 30, weakMagnitude: 0.2, strongMagnitude: 0.1 },
    ],
  },
  error: {
    name: 'Error',
    pattern: [
      { duration: 50, weakMagnitude: 0.5, strongMagnitude: 0.3 },
      { duration: 30, weakMagnitude: 0.3, strongMagnitude: 0.2, delay: 100 },
      { duration: 50, weakMagnitude: 0.5, strongMagnitude: 0.3, delay: 100 },
    ],
  },
  success: {
    name: 'Success',
    pattern: [
      { duration: 20, weakMagnitude: 0.2, strongMagnitude: 0 },
      { duration: 30, weakMagnitude: 0.3, strongMagnitude: 0.1, delay: 80 },
      { duration: 40, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 80 },
    ],
  },
  warning: {
    name: 'Warning',
    pattern: [
      { duration: 100, weakMagnitude: 0.4, strongMagnitude: 0.2 },
      { duration: 100, weakMagnitude: 0.4, strongMagnitude: 0.2, delay: 150 },
    ],
  },
  
  // Vehicle effects
  engine_idle: {
    name: 'Engine Idle',
    pattern: [
      { duration: 50, weakMagnitude: 0.15, strongMagnitude: 0.05 },
      { duration: 50, weakMagnitude: 0.1, strongMagnitude: 0.03, delay: 20 },
    ],
    loop: true,
  },
  engine_rev: {
    name: 'Engine Rev',
    pattern: [
      { duration: 80, weakMagnitude: 0.4, strongMagnitude: 0.3 },
    ],
    loop: true,
  },
  collision: {
    name: 'Collision',
    pattern: [
      { duration: 100, weakMagnitude: 0.9, strongMagnitude: 1.0 },
      { duration: 80, weakMagnitude: 0.5, strongMagnitude: 0.6, delay: 20 },
    ],
  },
  
  // Environmental
  rumble: {
    name: 'Rumble',
    pattern: [
      { duration: 200, weakMagnitude: 0.3, strongMagnitude: 0.4 },
    ],
    loop: true,
  },
  earthquake: {
    name: 'Earthquake',
    pattern: [
      { duration: 100, weakMagnitude: 0.6, strongMagnitude: 0.8 },
      { duration: 50, weakMagnitude: 0.3, strongMagnitude: 0.4, delay: 50 },
      { duration: 100, weakMagnitude: 0.7, strongMagnitude: 0.9, delay: 50 },
      { duration: 50, weakMagnitude: 0.4, strongMagnitude: 0.5, delay: 50 },
    ],
    loop: true,
  },
  rain: {
    name: 'Rain',
    pattern: [
      { duration: 30, weakMagnitude: 0.05, strongMagnitude: 0 },
      { duration: 20, weakMagnitude: 0.08, strongMagnitude: 0, delay: 100 },
      { duration: 25, weakMagnitude: 0.06, strongMagnitude: 0, delay: 80 },
    ],
    loop: true,
  },
};

// ============================================================================
// HAPTICS SYSTEM
// ============================================================================

export class HapticsSystem extends EventEmitter {
  private static instance: HapticsSystem | null = null;
  
  private config: HapticsConfig;
  private effects: Map<string, HapticEffect> = new Map();
  private gamepadStates: Map<number, GamepadHapticState> = new Map();
  private activeEffects: Map<string, { timer: ReturnType<typeof setTimeout>; loopTimer?: ReturnType<typeof setInterval> }> = new Map();
  private eventBindings: Map<string, HapticEvent> = new Map();
  
  private isSupported = false;
  private isMobileSupported = false;
  
  constructor(config: Partial<HapticsConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      globalIntensity: 1.0,
      gamepadEnabled: true,
      mobileEnabled: true,
      defaultMotor: 'both',
      maxDuration: 5000,
      respectAccessibility: true,
      ...config,
    };
    
    // Check platform support
    this.checkSupport();
    
    // Load default effects
    for (const [id, effect] of Object.entries(HAPTIC_EFFECTS)) {
      this.effects.set(id, effect);
    }
  }
  
  static getInstance(): HapticsSystem {
    if (!HapticsSystem.instance) {
      HapticsSystem.instance = new HapticsSystem();
    }
    return HapticsSystem.instance;
  }
  
  // ============================================================================
  // PLATFORM SUPPORT
  // ============================================================================
  
  private checkSupport(): void {
    // Check Gamepad Haptic Actuators API
    if (typeof navigator !== 'undefined' && 'getGamepads' in navigator) {
      // Will check for actual actuator support when gamepad is connected
      this.isSupported = true;
    }
    
    // Check Vibration API (mobile)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      this.isMobileSupported = true;
    }
  }
  
  isHapticsSupported(): boolean {
    return this.isSupported || this.isMobileSupported;
  }
  
  isGamepadHapticsSupported(): boolean {
    return this.isSupported;
  }
  
  isMobileHapticsSupported(): boolean {
    return this.isMobileSupported;
  }
  
  // ============================================================================
  // PLAY EFFECTS
  // ============================================================================
  
  play(effectId: string, options?: {
    intensity?: number;
    motor?: HapticMotor;
    gamepadIndex?: number;
    useMobile?: boolean;
  }): string | null {
    if (!this.config.enabled) return null;
    
    const effect = this.effects.get(effectId);
    if (!effect) {
      console.warn(`Haptic effect not found: ${effectId}`);
      return null;
    }
    
    const intensity = (options?.intensity ?? effect.intensity ?? 1) * this.config.globalIntensity;
    const motor = options?.motor ?? this.config.defaultMotor;
    const useMobile = options?.useMobile ?? this.config.mobileEnabled;
    
    // Generate unique play ID
    const playId = `${effectId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Play on gamepad(s)
    if (this.config.gamepadEnabled) {
      if (options?.gamepadIndex !== undefined) {
        this.playOnGamepad(options.gamepadIndex, effect, intensity, motor);
      } else {
        // Play on all connected gamepads
        this.playOnAllGamepads(effect, intensity, motor);
      }
    }
    
    // Play on mobile (Vibration API)
    if (useMobile && this.isMobileSupported) {
      this.playOnMobile(effect, intensity);
    }
    
    // Handle looping
    if (effect.loop) {
      const totalDuration = this.calculateEffectDuration(effect);
      const loopTimer = setInterval(() => {
        if (this.config.gamepadEnabled) {
          this.playOnAllGamepads(effect, intensity, motor);
        }
        if (useMobile && this.isMobileSupported) {
          this.playOnMobile(effect, intensity);
        }
      }, totalDuration);
      
      this.activeEffects.set(playId, { 
        timer: setTimeout(() => {}, 0), 
        loopTimer 
      });
    } else {
      // Set cleanup timer
      const duration = this.calculateEffectDuration(effect);
      const timer = setTimeout(() => {
        this.activeEffects.delete(playId);
        this.emit('effectComplete', playId);
      }, duration);
      
      this.activeEffects.set(playId, { timer });
    }
    
    this.emit('play', effectId, playId);
    return playId;
  }
  
  stop(playId: string): void {
    const active = this.activeEffects.get(playId);
    if (!active) return;
    
    clearTimeout(active.timer);
    if (active.loopTimer) {
      clearInterval(active.loopTimer);
    }
    
    this.activeEffects.delete(playId);
    
    // Stop all gamepad vibrations
    this.stopAllGamepads();
    
    // Stop mobile vibration
    if (this.isMobileSupported) {
      navigator.vibrate(0);
    }
    
    this.emit('stop', playId);
  }
  
  stopAll(): void {
    for (const playId of this.activeEffects.keys()) {
      this.stop(playId);
    }
  }
  
  // ============================================================================
  // GAMEPAD HAPTICS
  // ============================================================================
  
  private playOnGamepad(
    gamepadIndex: number,
    effect: HapticEffect,
    intensity: number,
    motor: HapticMotor
  ): void {
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[gamepadIndex];
    
    if (!gamepad || !gamepad.vibrationActuator) return;
    
    // Play each pulse in sequence
    let delay = 0;
    
    for (const pulse of effect.pattern) {
      setTimeout(() => {
        this.pulseGamepad(gamepad, pulse, intensity, motor);
      }, delay + (pulse.delay || 0));
      
      delay += pulse.duration + (pulse.delay || 0);
    }
  }
  
  private playOnAllGamepads(
    effect: HapticEffect,
    intensity: number,
    motor: HapticMotor
  ): void {
    const gamepads = navigator.getGamepads();
    
    for (let i = 0; i < gamepads.length; i++) {
      if (gamepads[i]) {
        this.playOnGamepad(i, effect, intensity, motor);
      }
    }
  }
  
  private pulseGamepad(
    gamepad: Gamepad,
    pulse: HapticPulse,
    intensity: number,
    motor: HapticMotor
  ): void {
    if (!gamepad.vibrationActuator) return;
    
    let weakMag = pulse.weakMagnitude * intensity;
    let strongMag = pulse.strongMagnitude * intensity;
    
    // Apply motor filter
    if (motor === 'weak') {
      strongMag = 0;
    } else if (motor === 'strong') {
      weakMag = 0;
    }
    
    try {
      // Standard Gamepad Haptics API
      (gamepad.vibrationActuator as any).playEffect?.('dual-rumble', {
        startDelay: 0,
        duration: Math.min(pulse.duration, this.config.maxDuration),
        weakMagnitude: Math.min(1, weakMag),
        strongMagnitude: Math.min(1, strongMag),
      });
    } catch {
      // Fallback for older API
      try {
        (gamepad.vibrationActuator as any).pulse?.(
          Math.max(weakMag, strongMag),
          pulse.duration
        );
      } catch {
        // No haptics support
      }
    }
  }
  
  private stopAllGamepads(): void {
    const gamepads = navigator.getGamepads();
    
    for (const gamepad of gamepads) {
      if (gamepad?.vibrationActuator) {
        try {
          (gamepad.vibrationActuator as any).reset?.();
        } catch {
          // Ignore
        }
      }
    }
  }
  
  // ============================================================================
  // MOBILE HAPTICS
  // ============================================================================
  
  private playOnMobile(effect: HapticEffect, intensity: number): void {
    if (!this.isMobileSupported) return;
    
    // Convert pattern to vibration array
    const pattern: number[] = [];
    
    for (const pulse of effect.pattern) {
      if (pulse.delay) {
        pattern.push(pulse.delay);
      }
      
      // Vibration API only supports on/off, use duration
      const avgMagnitude = (pulse.weakMagnitude + pulse.strongMagnitude) / 2;
      const adjustedDuration = Math.round(pulse.duration * avgMagnitude * intensity);
      pattern.push(adjustedDuration);
    }
    
    try {
      navigator.vibrate(pattern);
    } catch {
      // Vibration not supported or failed
    }
  }
  
  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================
  
  // Basic haptics
  tap(strength: 'light' | 'medium' | 'heavy' = 'medium'): string | null {
    return this.play(`${strength}_tap`);
  }
  
  impact(strength: 'light' | 'medium' | 'heavy' = 'medium'): string | null {
    return this.play(`impact_${strength}`);
  }
  
  selection(): string | null {
    return this.play('selection');
  }
  
  // Game haptics
  damage(intensity = 1): string | null {
    return this.play('damage', { intensity });
  }
  
  explosion(intensity = 1): string | null {
    return this.play('explosion', { intensity });
  }
  
  gunshot(intensity = 1): string | null {
    return this.play('gunshot', { intensity });
  }
  
  punch(intensity = 1): string | null {
    return this.play('punch', { intensity });
  }
  
  footstep(intensity = 0.5): string | null {
    return this.play('footstep', { intensity });
  }
  
  // UI haptics
  buttonPress(): string | null {
    return this.play('button_press');
  }
  
  menuNavigate(): string | null {
    return this.play('menu_navigate');
  }
  
  confirm(): string | null {
    return this.play('confirm');
  }
  
  cancel(): string | null {
    return this.play('cancel');
  }
  
  error(): string | null {
    return this.play('error');
  }
  
  success(): string | null {
    return this.play('success');
  }
  
  warning(): string | null {
    return this.play('warning');
  }
  
  // Continuous effects
  startRumble(intensity = 0.5): string | null {
    return this.play('rumble', { intensity });
  }
  
  startEarthquake(intensity = 1): string | null {
    return this.play('earthquake', { intensity });
  }
  
  // ============================================================================
  // CUSTOM EFFECTS
  // ============================================================================
  
  registerEffect(id: string, effect: HapticEffect): void {
    this.effects.set(id, effect);
    this.emit('effectRegistered', id);
  }
  
  unregisterEffect(id: string): void {
    this.effects.delete(id);
    this.emit('effectUnregistered', id);
  }
  
  getEffect(id: string): HapticEffect | undefined {
    return this.effects.get(id);
  }
  
  getEffects(): Map<string, HapticEffect> {
    return new Map(this.effects);
  }
  
  // Create custom pulse sequence
  createPulse(
    duration: number,
    weakMagnitude: number,
    strongMagnitude: number
  ): HapticPulse {
    return {
      duration: Math.min(duration, this.config.maxDuration),
      weakMagnitude: Math.min(1, Math.max(0, weakMagnitude)),
      strongMagnitude: Math.min(1, Math.max(0, strongMagnitude)),
    };
  }
  
  // Play custom one-off pattern
  playPattern(pattern: HapticPulse[], options?: {
    intensity?: number;
    loop?: boolean;
  }): string | null {
    const tempId = `custom_${Date.now()}`;
    const effect: HapticEffect = {
      name: 'Custom',
      pattern,
      loop: options?.loop,
      intensity: options?.intensity,
    };
    
    this.effects.set(tempId, effect);
    const playId = this.play(tempId, options);
    
    // Cleanup temp effect
    if (!options?.loop) {
      const duration = this.calculateEffectDuration(effect);
      setTimeout(() => {
        this.effects.delete(tempId);
      }, duration + 100);
    }
    
    return playId;
  }
  
  // ============================================================================
  // EVENT BINDINGS
  // ============================================================================
  
  bindEvent(eventName: string, effectId: string, intensity = 1): void {
    this.eventBindings.set(eventName, {
      type: eventName,
      effect: effectId,
      intensity,
    });
  }
  
  unbindEvent(eventName: string): void {
    this.eventBindings.delete(eventName);
  }
  
  triggerEvent(eventName: string): string | null {
    const binding = this.eventBindings.get(eventName);
    if (!binding) return null;
    
    return this.play(binding.effect, { intensity: binding.intensity });
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private calculateEffectDuration(effect: HapticEffect): number {
    let duration = 0;
    
    for (const pulse of effect.pattern) {
      duration += pulse.duration + (pulse.delay || 0);
    }
    
    return Math.min(duration, this.config.maxDuration);
  }
  
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled) {
      this.stopAll();
    }
    
    this.emit('enabledChanged', enabled);
  }
  
  setIntensity(intensity: number): void {
    this.config.globalIntensity = Math.min(1, Math.max(0, intensity));
    this.emit('intensityChanged', this.config.globalIntensity);
  }
  
  getConfig(): HapticsConfig {
    return { ...this.config };
  }
  
  setConfig(config: Partial<HapticsConfig>): void {
    this.config = { ...this.config, ...config };
    this.emit('configChanged', this.config);
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stopAll();
    this.effects.clear();
    this.eventBindings.clear();
    this.removeAllListeners();
    HapticsSystem.instance = null;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

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

const __defaultExport = {
  HapticsSystem,
  HAPTIC_EFFECTS,
  HapticsProvider,
  useHaptics,
  useHapticFeedback,
  useGameHaptics,
  useUIHaptics,
  useHapticsEnabled,
  useHapticsIntensity,
};

export default __defaultExport;
