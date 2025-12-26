/**
 * @file ux-enhancement-system.ts
 * @description Sistema de UX Enhancement para Aethel IDE
 * 
 * Implementação profissional de melhorias de UX inspirada em:
 * - VS Code UX Guidelines
 * - Apple Human Interface Guidelines
 * - Google Material Design
 * - Figma's Design System
 * 
 * Features:
 * - Toast notifications inteligentes
 * - Progress indicators
 * - Feedback visual consistente
 * - Shortcuts e keybindings
 * - Onboarding flow
 * - Accessibility (a11y)
 * - Responsive design helpers
 * - Animation system
 * - Theme integration
 * 
 * @version 2.2.0
 */

import { injectable, inject, optional } from 'inversify';

// ==================== Event Emitter ====================

type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
  private listeners: Array<(e: T) => void> = [];

  get event(): Event<T> {
    return (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return {
        dispose: () => {
          const idx = this.listeners.indexOf(listener);
          if (idx >= 0) this.listeners.splice(idx, 1);
        },
      };
    };
  }

  fire(event: T): void {
    this.listeners.forEach((l) => l(event));
  }

  dispose(): void {
    this.listeners = [];
  }
}

// ==================== Types & Enums ====================

/**
 * Toast notification types
 */
export enum ToastType {
  Info = 'info',
  Success = 'success',
  Warning = 'warning',
  Error = 'error',
  Loading = 'loading',
}

/**
 * Progress indicator types
 */
export enum ProgressType {
  Determinate = 'determinate',
  Indeterminate = 'indeterminate',
  Steps = 'steps',
  Circular = 'circular',
}

/**
 * Animation easing functions
 */
export enum Easing {
  Linear = 'linear',
  EaseIn = 'ease-in',
  EaseOut = 'ease-out',
  EaseInOut = 'ease-in-out',
  Spring = 'spring',
  Bounce = 'bounce',
}

/**
 * Feedback types
 */
export enum FeedbackType {
  Visual = 'visual',
  Haptic = 'haptic',
  Audio = 'audio',
  Combined = 'combined',
}

/**
 * Breakpoints for responsive design
 */
export enum Breakpoint {
  XS = 'xs', // < 576px
  SM = 'sm', // >= 576px
  MD = 'md', // >= 768px
  LG = 'lg', // >= 992px
  XL = 'xl', // >= 1200px
  XXL = 'xxl', // >= 1400px
}

// ==================== Interfaces ====================

/**
 * Toast notification configuration
 */
export interface ToastConfig {
  id?: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, 0 = persistent
  dismissible?: boolean;
  action?: {
    label: string;
    callback: () => void;
  };
  secondaryAction?: {
    label: string;
    callback: () => void;
  };
  icon?: string;
  progress?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

/**
 * Progress indicator configuration
 */
export interface ProgressConfig {
  id: string;
  type: ProgressType;
  title?: string;
  message?: string;
  value?: number; // 0-100 for determinate
  steps?: { label: string; completed: boolean }[];
  cancellable?: boolean;
  onCancel?: () => void;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  duration: number;
  easing: Easing;
  delay?: number;
  iterations?: number;
  direction?: 'normal' | 'reverse' | 'alternate';
  fill?: 'none' | 'forwards' | 'backwards' | 'both';
}

/**
 * Keybinding configuration
 */
export interface Keybinding {
  id: string;
  keys: string; // e.g., "Ctrl+Shift+P"
  command: string;
  when?: string; // context condition
  description: string;
  category?: string;
}

/**
 * Onboarding step
 */
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  target?: string; // CSS selector
  position?: 'top' | 'bottom' | 'left' | 'right';
  action?: {
    label: string;
    command?: string;
  };
  media?: {
    type: 'image' | 'video' | 'animation';
    src: string;
  };
}

/**
 * Accessibility configuration
 */
export interface A11yConfig {
  announcements: boolean;
  reducedMotion: boolean;
  highContrast: boolean;
  focusVisible: boolean;
  screenReader: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'xlarge';
}

// ==================== Toast Manager ====================

export const ToastManagerSymbol = Symbol('ToastManager');

/**
 * Toast notification manager
 */
@injectable()
export class ToastManager {
  private readonly _onToastShow = new Emitter<ToastConfig>();
  private readonly _onToastDismiss = new Emitter<string>();
  
  private toasts: Map<string, ToastConfig> = new Map();
  private toastIdCounter = 0;
  private maxToasts = 5;

  readonly onToastShow: Event<ToastConfig> = this._onToastShow.event;
  readonly onToastDismiss: Event<string> = this._onToastDismiss.event;

  /**
   * Show a toast notification
   */
  show(config: ToastConfig): string {
    const id = config.id ?? `toast-${++this.toastIdCounter}`;
    const fullConfig: ToastConfig = {
      ...config,
      id,
      duration: config.duration ?? this.getDefaultDuration(config.type),
      dismissible: config.dismissible ?? true,
      position: config.position ?? 'bottom-right',
    };

    // Enforce max toasts
    if (this.toasts.size >= this.maxToasts) {
      const oldest = this.toasts.keys().next().value;
      if (oldest) this.dismiss(oldest);
    }

    this.toasts.set(id, fullConfig);
    this._onToastShow.fire(fullConfig);

    // Auto-dismiss
    if (fullConfig.duration && fullConfig.duration > 0) {
      setTimeout(() => this.dismiss(id), fullConfig.duration);
    }

    return id;
  }

  /**
   * Show info toast
   */
  info(message: string, options?: Partial<ToastConfig>): string {
    return this.show({ ...options, type: ToastType.Info, message });
  }

  /**
   * Show success toast
   */
  success(message: string, options?: Partial<ToastConfig>): string {
    return this.show({ ...options, type: ToastType.Success, message });
  }

  /**
   * Show warning toast
   */
  warning(message: string, options?: Partial<ToastConfig>): string {
    return this.show({ ...options, type: ToastType.Warning, message });
  }

  /**
   * Show error toast
   */
  error(message: string, options?: Partial<ToastConfig>): string {
    return this.show({ 
      ...options, 
      type: ToastType.Error, 
      message,
      duration: options?.duration ?? 0, // Errors persist by default
    });
  }

  /**
   * Show loading toast
   */
  loading(message: string, options?: Partial<ToastConfig>): string {
    return this.show({ 
      ...options, 
      type: ToastType.Loading, 
      message,
      duration: 0,
      dismissible: false,
      progress: true,
    });
  }

  /**
   * Update an existing toast
   */
  update(id: string, config: Partial<ToastConfig>): void {
    const existing = this.toasts.get(id);
    if (existing) {
      const updated = { ...existing, ...config };
      this.toasts.set(id, updated);
      this._onToastShow.fire(updated);
    }
  }

  /**
   * Dismiss a toast
   */
  dismiss(id: string): void {
    if (this.toasts.has(id)) {
      this.toasts.delete(id);
      this._onToastDismiss.fire(id);
    }
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    for (const id of this.toasts.keys()) {
      this.dismiss(id);
    }
  }

  /**
   * Promise-based toast for async operations
   */
  async promise<T>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: Error) => string);
    }
  ): Promise<T> {
    const id = this.loading(messages.loading);

    try {
      const result = await promise;
      this.update(id, {
        type: ToastType.Success,
        message: typeof messages.success === 'function' 
          ? messages.success(result) 
          : messages.success,
        duration: 3000,
        dismissible: true,
        progress: false,
      });
      return result;
    } catch (error) {
      this.update(id, {
        type: ToastType.Error,
        message: typeof messages.error === 'function' 
          ? messages.error(error as Error) 
          : messages.error,
        duration: 0,
        dismissible: true,
        progress: false,
      });
      throw error;
    }
  }

  private getDefaultDuration(type: ToastType): number {
    switch (type) {
      case ToastType.Info: return 4000;
      case ToastType.Success: return 3000;
      case ToastType.Warning: return 5000;
      case ToastType.Error: return 0; // Persistent
      case ToastType.Loading: return 0; // Persistent
      default: return 4000;
    }
  }

  dispose(): void {
    this.dismissAll();
    this._onToastShow.dispose();
    this._onToastDismiss.dispose();
  }
}

// ==================== Progress Manager ====================

export const ProgressManagerSymbol = Symbol('ProgressManager');

/**
 * Progress indicator manager
 */
@injectable()
export class ProgressManager {
  private readonly _onProgressStart = new Emitter<ProgressConfig>();
  private readonly _onProgressUpdate = new Emitter<ProgressConfig>();
  private readonly _onProgressEnd = new Emitter<string>();
  
  private progress: Map<string, ProgressConfig> = new Map();

  readonly onProgressStart: Event<ProgressConfig> = this._onProgressStart.event;
  readonly onProgressUpdate: Event<ProgressConfig> = this._onProgressUpdate.event;
  readonly onProgressEnd: Event<string> = this._onProgressEnd.event;

  /**
   * Start a progress indicator
   */
  start(config: ProgressConfig): void {
    this.progress.set(config.id, config);
    this._onProgressStart.fire(config);
  }

  /**
   * Update progress value
   */
  update(id: string, updates: Partial<ProgressConfig>): void {
    const existing = this.progress.get(id);
    if (existing) {
      const updated = { ...existing, ...updates };
      this.progress.set(id, updated);
      this._onProgressUpdate.fire(updated);
    }
  }

  /**
   * Increment progress value
   */
  increment(id: string, amount = 1): void {
    const existing = this.progress.get(id);
    if (existing && existing.value !== undefined) {
      this.update(id, { 
        value: Math.min(100, existing.value + amount) 
      });
    }
  }

  /**
   * Complete a step (for step progress)
   */
  completeStep(id: string, stepIndex: number): void {
    const existing = this.progress.get(id);
    if (existing && existing.steps) {
      const newSteps = [...existing.steps];
      if (newSteps[stepIndex]) {
        newSteps[stepIndex].completed = true;
        this.update(id, { steps: newSteps });
      }
    }
  }

  /**
   * End a progress indicator
   */
  end(id: string): void {
    if (this.progress.has(id)) {
      this.progress.delete(id);
      this._onProgressEnd.fire(id);
    }
  }

  /**
   * Run with progress (auto-managed)
   */
  async withProgress<T>(
    config: Omit<ProgressConfig, 'value'>,
    operation: (report: (value: number, message?: string) => void) => Promise<T>
  ): Promise<T> {
    this.start({ ...config, value: 0 });

    try {
      const result = await operation((value, message) => {
        this.update(config.id, { value, message });
      });
      this.update(config.id, { value: 100 });
      return result;
    } finally {
      // Small delay before removing to show 100%
      setTimeout(() => this.end(config.id), 500);
    }
  }

  /**
   * Get active progress indicators
   */
  getActive(): ProgressConfig[] {
    return Array.from(this.progress.values());
  }

  dispose(): void {
    this.progress.clear();
    this._onProgressStart.dispose();
    this._onProgressUpdate.dispose();
    this._onProgressEnd.dispose();
  }
}

// ==================== Feedback System ====================

export const FeedbackSystemSymbol = Symbol('FeedbackSystem');

/**
 * Unified feedback system
 */
@injectable()
export class FeedbackSystem {
  private readonly _onFeedback = new Emitter<{
    type: FeedbackType;
    intensity: number;
    pattern?: string;
  }>();

  readonly onFeedback = this._onFeedback.event;

  /**
   * Provide visual feedback
   */
  visual(options: {
    element?: HTMLElement;
    effect: 'pulse' | 'shake' | 'glow' | 'ripple' | 'highlight';
    color?: string;
    duration?: number;
  }): void {
    this._onFeedback.fire({
      type: FeedbackType.Visual,
      intensity: 1,
      pattern: options.effect,
    });

    // Apply CSS animation if element provided
    if (options.element && typeof document !== 'undefined') {
      const className = `aethel-feedback-${options.effect}`;
      options.element.classList.add(className);
      setTimeout(() => {
        options.element!.classList.remove(className);
      }, options.duration ?? 300);
    }
  }

  /**
   * Provide haptic feedback (if supported)
   */
  haptic(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void {
    this._onFeedback.fire({
      type: FeedbackType.Haptic,
      intensity: this.getHapticIntensity(pattern),
      pattern,
    });

    // Use Vibration API if available
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      const vibrationPattern = this.getVibrationPattern(pattern);
      navigator.vibrate(vibrationPattern);
    }
  }

  /**
   * Provide audio feedback
   */
  audio(sound: 'click' | 'success' | 'error' | 'notification' | 'warning'): void {
    this._onFeedback.fire({
      type: FeedbackType.Audio,
      intensity: 0.5,
      pattern: sound,
    });

    // Play sound (implementation depends on audio system)
  }

  /**
   * Combined feedback
   */
  combined(options: {
    visual?: Parameters<FeedbackSystem['visual']>[0];
    haptic?: Parameters<FeedbackSystem['haptic']>[0];
    audio?: Parameters<FeedbackSystem['audio']>[0];
  }): void {
    if (options.visual) this.visual(options.visual);
    if (options.haptic) this.haptic(options.haptic);
    if (options.audio) this.audio(options.audio);
  }

  private getHapticIntensity(pattern: string): number {
    switch (pattern) {
      case 'light': return 0.3;
      case 'medium': return 0.5;
      case 'heavy': return 0.8;
      case 'success': return 0.4;
      case 'warning': return 0.6;
      case 'error': return 0.7;
      default: return 0.5;
    }
  }

  private getVibrationPattern(pattern: string): number[] {
    switch (pattern) {
      case 'light': return [10];
      case 'medium': return [30];
      case 'heavy': return [50];
      case 'success': return [30, 50, 30];
      case 'warning': return [50, 30, 50];
      case 'error': return [100, 30, 100, 30, 100];
      default: return [30];
    }
  }

  dispose(): void {
    this._onFeedback.dispose();
  }
}

// ==================== Keybinding Manager ====================

export const KeybindingManagerSymbol = Symbol('KeybindingManager');

/**
 * Keybinding management system
 */
@injectable()
export class KeybindingManager {
  private readonly _onKeybindingTriggered = new Emitter<Keybinding>();
  
  private keybindings: Map<string, Keybinding> = new Map();
  private keydownHandler?: (e: KeyboardEvent) => void;

  readonly onKeybindingTriggered: Event<Keybinding> = this._onKeybindingTriggered.event;

  constructor() {
    this.setupListeners();
  }

  /**
   * Register a keybinding
   */
  register(keybinding: Keybinding): void {
    const key = this.normalizeKeys(keybinding.keys);
    this.keybindings.set(key, keybinding);
  }

  /**
   * Register multiple keybindings
   */
  registerMany(keybindings: Keybinding[]): void {
    keybindings.forEach((kb) => this.register(kb));
  }

  /**
   * Unregister a keybinding
   */
  unregister(id: string): void {
    for (const [key, kb] of this.keybindings) {
      if (kb.id === id) {
        this.keybindings.delete(key);
        return;
      }
    }
  }

  /**
   * Get all keybindings
   */
  getAll(): Keybinding[] {
    return Array.from(this.keybindings.values());
  }

  /**
   * Get keybindings by category
   */
  getByCategory(category: string): Keybinding[] {
    return this.getAll().filter((kb) => kb.category === category);
  }

  /**
   * Check if a key combo matches
   */
  private matchesKey(event: KeyboardEvent): Keybinding | undefined {
    const pressed = this.eventToKeyString(event);
    return this.keybindings.get(pressed);
  }

  private normalizeKeys(keys: string): string {
    return keys
      .toLowerCase()
      .split('+')
      .map((k) => k.trim())
      .sort()
      .join('+');
  }

  private eventToKeyString(event: KeyboardEvent): string {
    const parts: string[] = [];
    if (event.ctrlKey || event.metaKey) parts.push('ctrl');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    
    const key = event.key.toLowerCase();
    if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
      parts.push(key);
    }
    
    return parts.sort().join('+');
  }

  private setupListeners(): void {
    if (typeof document === 'undefined') return;

    this.keydownHandler = (event: KeyboardEvent) => {
      const keybinding = this.matchesKey(event);
      if (keybinding) {
        event.preventDefault();
        event.stopPropagation();
        this._onKeybindingTriggered.fire(keybinding);
      }
    };

    document.addEventListener('keydown', this.keydownHandler);
  }

  dispose(): void {
    if (this.keydownHandler && typeof document !== 'undefined') {
      document.removeEventListener('keydown', this.keydownHandler);
    }
    this.keybindings.clear();
    this._onKeybindingTriggered.dispose();
  }
}

// ==================== Onboarding Manager ====================

export const OnboardingManagerSymbol = Symbol('OnboardingManager');

/**
 * User onboarding flow manager
 */
@injectable()
export class OnboardingManager {
  private readonly _onStepChange = new Emitter<{ step: OnboardingStep; index: number }>();
  private readonly _onComplete = new Emitter<void>();
  
  private steps: OnboardingStep[] = [];
  private currentIndex = -1;
  private completed = false;
  private skipped = false;

  readonly onStepChange: Event<{ step: OnboardingStep; index: number }> = this._onStepChange.event;
  readonly onComplete: Event<void> = this._onComplete.event;

  /**
   * Set onboarding steps
   */
  setSteps(steps: OnboardingStep[]): void {
    this.steps = steps;
    this.currentIndex = -1;
    this.completed = false;
    this.skipped = false;
  }

  /**
   * Start onboarding
   */
  start(): void {
    if (this.steps.length === 0) return;
    this.currentIndex = 0;
    this._onStepChange.fire({ 
      step: this.steps[0], 
      index: 0 
    });
  }

  /**
   * Go to next step
   */
  next(): void {
    if (this.currentIndex < this.steps.length - 1) {
      this.currentIndex++;
      this._onStepChange.fire({
        step: this.steps[this.currentIndex],
        index: this.currentIndex,
      });
    } else {
      this.complete();
    }
  }

  /**
   * Go to previous step
   */
  previous(): void {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this._onStepChange.fire({
        step: this.steps[this.currentIndex],
        index: this.currentIndex,
      });
    }
  }

  /**
   * Go to specific step
   */
  goTo(index: number): void {
    if (index >= 0 && index < this.steps.length) {
      this.currentIndex = index;
      this._onStepChange.fire({
        step: this.steps[index],
        index,
      });
    }
  }

  /**
   * Skip onboarding
   */
  skip(): void {
    this.skipped = true;
    this.complete();
  }

  /**
   * Complete onboarding
   */
  complete(): void {
    this.completed = true;
    this._onComplete.fire();
  }

  /**
   * Get current step
   */
  getCurrentStep(): OnboardingStep | undefined {
    return this.steps[this.currentIndex];
  }

  /**
   * Get progress
   */
  getProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.currentIndex + 1,
      total: this.steps.length,
      percentage: this.steps.length > 0 
        ? Math.round(((this.currentIndex + 1) / this.steps.length) * 100)
        : 0,
    };
  }

  /**
   * Check if completed
   */
  isCompleted(): boolean {
    return this.completed;
  }

  /**
   * Check if skipped
   */
  isSkipped(): boolean {
    return this.skipped;
  }

  dispose(): void {
    this._onStepChange.dispose();
    this._onComplete.dispose();
  }
}

// ==================== Accessibility Manager ====================

export const AccessibilityManagerSymbol = Symbol('AccessibilityManager');

/**
 * Accessibility (a11y) management system
 */
@injectable()
export class AccessibilityManager {
  private readonly _onConfigChange = new Emitter<A11yConfig>();
  
  private config: A11yConfig = {
    announcements: true,
    reducedMotion: false,
    highContrast: false,
    focusVisible: true,
    screenReader: false,
    fontSize: 'medium',
  };

  readonly onConfigChange: Event<A11yConfig> = this._onConfigChange.event;

  constructor() {
    this.detectSystemPreferences();
  }

  /**
   * Get current configuration
   */
  getConfig(): A11yConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(updates: Partial<A11yConfig>): void {
    this.config = { ...this.config, ...updates };
    this.applyConfig();
    this._onConfigChange.fire(this.config);
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    if (!this.config.announcements) return;

    if (typeof document !== 'undefined') {
      const announcer = this.getOrCreateAnnouncer(priority);
      announcer.textContent = '';
      // Small delay to trigger announcement
      setTimeout(() => {
        announcer.textContent = message;
      }, 100);
    }
  }

  /**
   * Set focus to element with announcement
   */
  focusElement(element: HTMLElement, announcement?: string): void {
    element.focus();
    if (announcement) {
      this.announce(announcement);
    }
  }

  /**
   * Check if user prefers reduced motion
   */
  prefersReducedMotion(): boolean {
    return this.config.reducedMotion;
  }

  /**
   * Get appropriate animation duration
   */
  getAnimationDuration(baseDuration: number): number {
    return this.config.reducedMotion ? 0 : baseDuration;
  }

  /**
   * Get font size multiplier
   */
  getFontSizeMultiplier(): number {
    switch (this.config.fontSize) {
      case 'small': return 0.875;
      case 'medium': return 1;
      case 'large': return 1.125;
      case 'xlarge': return 1.25;
      default: return 1;
    }
  }

  private detectSystemPreferences(): void {
    if (typeof window === 'undefined') return;

    // Reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.config.reducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      this.setConfig({ reducedMotion: e.matches });
    });

    // High contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    this.config.highContrast = contrastQuery.matches;
    contrastQuery.addEventListener('change', (e) => {
      this.setConfig({ highContrast: e.matches });
    });
  }

  private applyConfig(): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Reduced motion
    root.classList.toggle('reduce-motion', this.config.reducedMotion);

    // High contrast
    root.classList.toggle('high-contrast', this.config.highContrast);

    // Focus visible
    root.classList.toggle('focus-visible', this.config.focusVisible);

    // Font size
    root.style.setProperty(
      '--aethel-font-scale',
      String(this.getFontSizeMultiplier())
    );
  }

  private getOrCreateAnnouncer(priority: 'polite' | 'assertive'): HTMLElement {
    const id = `aethel-announcer-${priority}`;
    let announcer = document.getElementById(id);

    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = id;
      announcer.setAttribute('role', 'status');
      announcer.setAttribute('aria-live', priority);
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.style.cssText = `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      `;
      document.body.appendChild(announcer);
    }

    return announcer;
  }

  dispose(): void {
    this._onConfigChange.dispose();
  }
}

// ==================== Responsive Manager ====================

export const ResponsiveManagerSymbol = Symbol('ResponsiveManager');

/**
 * Responsive design helper
 */
@injectable()
export class ResponsiveManager {
  private readonly _onBreakpointChange = new Emitter<Breakpoint>();
  
  private currentBreakpoint: Breakpoint = Breakpoint.MD;
  private readonly breakpoints: Record<Breakpoint, number> = {
    [Breakpoint.XS]: 0,
    [Breakpoint.SM]: 576,
    [Breakpoint.MD]: 768,
    [Breakpoint.LG]: 992,
    [Breakpoint.XL]: 1200,
    [Breakpoint.XXL]: 1400,
  };

  readonly onBreakpointChange: Event<Breakpoint> = this._onBreakpointChange.event;

  constructor() {
    this.setupListeners();
    this.updateBreakpoint();
  }

  /**
   * Get current breakpoint
   */
  getCurrentBreakpoint(): Breakpoint {
    return this.currentBreakpoint;
  }

  /**
   * Check if current breakpoint matches
   */
  is(breakpoint: Breakpoint): boolean {
    return this.currentBreakpoint === breakpoint;
  }

  /**
   * Check if current breakpoint is at least
   */
  isAtLeast(breakpoint: Breakpoint): boolean {
    return this.getBreakpointValue(this.currentBreakpoint) >= 
           this.getBreakpointValue(breakpoint);
  }

  /**
   * Check if current breakpoint is at most
   */
  isAtMost(breakpoint: Breakpoint): boolean {
    return this.getBreakpointValue(this.currentBreakpoint) <= 
           this.getBreakpointValue(breakpoint);
  }

  /**
   * Get breakpoint value
   */
  getBreakpointValue(breakpoint: Breakpoint): number {
    return this.breakpoints[breakpoint];
  }

  /**
   * Check if mobile
   */
  isMobile(): boolean {
    return this.isAtMost(Breakpoint.SM);
  }

  /**
   * Check if tablet
   */
  isTablet(): boolean {
    return this.is(Breakpoint.MD) || this.is(Breakpoint.LG);
  }

  /**
   * Check if desktop
   */
  isDesktop(): boolean {
    return this.isAtLeast(Breakpoint.XL);
  }

  private setupListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('resize', () => {
      this.updateBreakpoint();
    });
  }

  private updateBreakpoint(): void {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    let newBreakpoint = Breakpoint.XS;

    for (const [bp, minWidth] of Object.entries(this.breakpoints)) {
      if (width >= minWidth) {
        newBreakpoint = bp as Breakpoint;
      }
    }

    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this._onBreakpointChange.fire(newBreakpoint);
    }
  }

  dispose(): void {
    this._onBreakpointChange.dispose();
  }
}

// ==================== Animation Helper ====================

/**
 * Animation helper utilities
 */
export class AnimationHelper {
  /**
   * Animate a value over time
   */
  static animate(
    from: number,
    to: number,
    config: AnimationConfig,
    onUpdate: (value: number) => void,
    onComplete?: () => void
  ): () => void {
    const startTime = performance.now();
    let animationId: number;
    let cancelled = false;

    const easingFn = this.getEasingFunction(config.easing);

    const tick = (currentTime: number) => {
      if (cancelled) return;

      const elapsed = currentTime - startTime - (config.delay ?? 0);
      if (elapsed < 0) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      const progress = Math.min(elapsed / config.duration, 1);
      const easedProgress = easingFn(progress);
      const value = from + (to - from) * easedProgress;

      onUpdate(value);

      if (progress < 1) {
        animationId = requestAnimationFrame(tick);
      } else {
        onComplete?.();
      }
    };

    animationId = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(animationId);
    };
  }

  /**
   * Get easing function
   */
  private static getEasingFunction(easing: Easing): (t: number) => number {
    switch (easing) {
      case Easing.Linear:
        return (t) => t;
      case Easing.EaseIn:
        return (t) => t * t;
      case Easing.EaseOut:
        return (t) => t * (2 - t);
      case Easing.EaseInOut:
        return (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      case Easing.Spring:
        return (t) => {
          const c4 = (2 * Math.PI) / 3;
          return t === 0 ? 0 : t === 1 ? 1 :
            Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
        };
      case Easing.Bounce:
        return (t) => {
          const n1 = 7.5625;
          const d1 = 2.75;
          if (t < 1 / d1) return n1 * t * t;
          if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
          if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
          return n1 * (t -= 2.625 / d1) * t + 0.984375;
        };
      default:
        return (t) => t;
    }
  }
}

// ==================== CSS Generation ====================

/**
 * Generate feedback CSS styles
 */
export function generateFeedbackStyles(): string {
  return `
    /* Aethel UX Feedback Animations */
    
    @keyframes aethel-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    
    @keyframes aethel-shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-5px); }
      75% { transform: translateX(5px); }
    }
    
    @keyframes aethel-glow {
      0%, 100% { box-shadow: 0 0 0 0 var(--aethel-primary-color, #007acc); }
      50% { box-shadow: 0 0 20px 5px var(--aethel-primary-color, #007acc); }
    }
    
    @keyframes aethel-ripple {
      0% { transform: scale(0); opacity: 1; }
      100% { transform: scale(4); opacity: 0; }
    }
    
    @keyframes aethel-highlight {
      0% { background-color: transparent; }
      50% { background-color: rgba(255, 255, 0, 0.3); }
      100% { background-color: transparent; }
    }
    
    .aethel-feedback-pulse {
      animation: aethel-pulse 0.3s ease-in-out;
    }
    
    .aethel-feedback-shake {
      animation: aethel-shake 0.3s ease-in-out;
    }
    
    .aethel-feedback-glow {
      animation: aethel-glow 0.5s ease-in-out;
    }
    
    .aethel-feedback-ripple::after {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: inherit;
      background: currentColor;
      animation: aethel-ripple 0.6s ease-out;
      pointer-events: none;
    }
    
    .aethel-feedback-highlight {
      animation: aethel-highlight 1s ease-in-out;
    }
    
    /* Reduced motion */
    .reduce-motion * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
    
    /* Focus visible */
    .focus-visible :focus:not(:focus-visible) {
      outline: none;
    }
    
    .focus-visible :focus-visible {
      outline: 2px solid var(--aethel-focus-color, #007acc);
      outline-offset: 2px;
    }
    
    /* High contrast */
    .high-contrast {
      --aethel-border-width: 2px;
      --aethel-focus-color: #ffffff;
    }
  `;
}
