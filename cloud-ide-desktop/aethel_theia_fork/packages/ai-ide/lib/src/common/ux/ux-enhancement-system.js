"use strict";
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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnimationHelper = exports.ResponsiveManager = exports.ResponsiveManagerSymbol = exports.AccessibilityManager = exports.AccessibilityManagerSymbol = exports.OnboardingManager = exports.OnboardingManagerSymbol = exports.KeybindingManager = exports.KeybindingManagerSymbol = exports.FeedbackSystem = exports.FeedbackSystemSymbol = exports.ProgressManager = exports.ProgressManagerSymbol = exports.ToastManager = exports.ToastManagerSymbol = exports.Breakpoint = exports.FeedbackType = exports.Easing = exports.ProgressType = exports.ToastType = void 0;
exports.generateFeedbackStyles = generateFeedbackStyles;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                },
            };
        };
    }
    fire(event) {
        this.listeners.forEach((l) => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Types & Enums ====================
/**
 * Toast notification types
 */
var ToastType;
(function (ToastType) {
    ToastType["Info"] = "info";
    ToastType["Success"] = "success";
    ToastType["Warning"] = "warning";
    ToastType["Error"] = "error";
    ToastType["Loading"] = "loading";
})(ToastType || (exports.ToastType = ToastType = {}));
/**
 * Progress indicator types
 */
var ProgressType;
(function (ProgressType) {
    ProgressType["Determinate"] = "determinate";
    ProgressType["Indeterminate"] = "indeterminate";
    ProgressType["Steps"] = "steps";
    ProgressType["Circular"] = "circular";
})(ProgressType || (exports.ProgressType = ProgressType = {}));
/**
 * Animation easing functions
 */
var Easing;
(function (Easing) {
    Easing["Linear"] = "linear";
    Easing["EaseIn"] = "ease-in";
    Easing["EaseOut"] = "ease-out";
    Easing["EaseInOut"] = "ease-in-out";
    Easing["Spring"] = "spring";
    Easing["Bounce"] = "bounce";
})(Easing || (exports.Easing = Easing = {}));
/**
 * Feedback types
 */
var FeedbackType;
(function (FeedbackType) {
    FeedbackType["Visual"] = "visual";
    FeedbackType["Haptic"] = "haptic";
    FeedbackType["Audio"] = "audio";
    FeedbackType["Combined"] = "combined";
})(FeedbackType || (exports.FeedbackType = FeedbackType = {}));
/**
 * Breakpoints for responsive design
 */
var Breakpoint;
(function (Breakpoint) {
    Breakpoint["XS"] = "xs";
    Breakpoint["SM"] = "sm";
    Breakpoint["MD"] = "md";
    Breakpoint["LG"] = "lg";
    Breakpoint["XL"] = "xl";
    Breakpoint["XXL"] = "xxl";
})(Breakpoint || (exports.Breakpoint = Breakpoint = {}));
// ==================== Toast Manager ====================
exports.ToastManagerSymbol = Symbol('ToastManager');
/**
 * Toast notification manager
 */
let ToastManager = class ToastManager {
    constructor() {
        this._onToastShow = new Emitter();
        this._onToastDismiss = new Emitter();
        this.toasts = new Map();
        this.toastIdCounter = 0;
        this.maxToasts = 5;
        this.onToastShow = this._onToastShow.event;
        this.onToastDismiss = this._onToastDismiss.event;
    }
    /**
     * Show a toast notification
     */
    show(config) {
        const id = config.id ?? `toast-${++this.toastIdCounter}`;
        const fullConfig = {
            ...config,
            id,
            duration: config.duration ?? this.getDefaultDuration(config.type),
            dismissible: config.dismissible ?? true,
            position: config.position ?? 'bottom-right',
        };
        // Enforce max toasts
        if (this.toasts.size >= this.maxToasts) {
            const oldest = this.toasts.keys().next().value;
            if (oldest)
                this.dismiss(oldest);
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
    info(message, options) {
        return this.show({ ...options, type: ToastType.Info, message });
    }
    /**
     * Show success toast
     */
    success(message, options) {
        return this.show({ ...options, type: ToastType.Success, message });
    }
    /**
     * Show warning toast
     */
    warning(message, options) {
        return this.show({ ...options, type: ToastType.Warning, message });
    }
    /**
     * Show error toast
     */
    error(message, options) {
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
    loading(message, options) {
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
    update(id, config) {
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
    dismiss(id) {
        if (this.toasts.has(id)) {
            this.toasts.delete(id);
            this._onToastDismiss.fire(id);
        }
    }
    /**
     * Dismiss all toasts
     */
    dismissAll() {
        for (const id of this.toasts.keys()) {
            this.dismiss(id);
        }
    }
    /**
     * Promise-based toast for async operations
     */
    async promise(promise, messages) {
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
        }
        catch (error) {
            this.update(id, {
                type: ToastType.Error,
                message: typeof messages.error === 'function'
                    ? messages.error(error)
                    : messages.error,
                duration: 0,
                dismissible: true,
                progress: false,
            });
            throw error;
        }
    }
    getDefaultDuration(type) {
        switch (type) {
            case ToastType.Info: return 4000;
            case ToastType.Success: return 3000;
            case ToastType.Warning: return 5000;
            case ToastType.Error: return 0; // Persistent
            case ToastType.Loading: return 0; // Persistent
            default: return 4000;
        }
    }
    dispose() {
        this.dismissAll();
        this._onToastShow.dispose();
        this._onToastDismiss.dispose();
    }
};
exports.ToastManager = ToastManager;
exports.ToastManager = ToastManager = __decorate([
    (0, inversify_1.injectable)()
], ToastManager);
// ==================== Progress Manager ====================
exports.ProgressManagerSymbol = Symbol('ProgressManager');
/**
 * Progress indicator manager
 */
let ProgressManager = class ProgressManager {
    constructor() {
        this._onProgressStart = new Emitter();
        this._onProgressUpdate = new Emitter();
        this._onProgressEnd = new Emitter();
        this.progress = new Map();
        this.onProgressStart = this._onProgressStart.event;
        this.onProgressUpdate = this._onProgressUpdate.event;
        this.onProgressEnd = this._onProgressEnd.event;
    }
    /**
     * Start a progress indicator
     */
    start(config) {
        this.progress.set(config.id, config);
        this._onProgressStart.fire(config);
    }
    /**
     * Update progress value
     */
    update(id, updates) {
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
    increment(id, amount = 1) {
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
    completeStep(id, stepIndex) {
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
    end(id) {
        if (this.progress.has(id)) {
            this.progress.delete(id);
            this._onProgressEnd.fire(id);
        }
    }
    /**
     * Run with progress (auto-managed)
     */
    async withProgress(config, operation) {
        this.start({ ...config, value: 0 });
        try {
            const result = await operation((value, message) => {
                this.update(config.id, { value, message });
            });
            this.update(config.id, { value: 100 });
            return result;
        }
        finally {
            // Small delay before removing to show 100%
            setTimeout(() => this.end(config.id), 500);
        }
    }
    /**
     * Get active progress indicators
     */
    getActive() {
        return Array.from(this.progress.values());
    }
    dispose() {
        this.progress.clear();
        this._onProgressStart.dispose();
        this._onProgressUpdate.dispose();
        this._onProgressEnd.dispose();
    }
};
exports.ProgressManager = ProgressManager;
exports.ProgressManager = ProgressManager = __decorate([
    (0, inversify_1.injectable)()
], ProgressManager);
// ==================== Feedback System ====================
exports.FeedbackSystemSymbol = Symbol('FeedbackSystem');
/**
 * Unified feedback system
 */
let FeedbackSystem = class FeedbackSystem {
    constructor() {
        this._onFeedback = new Emitter();
        this.onFeedback = this._onFeedback.event;
    }
    /**
     * Provide visual feedback
     */
    visual(options) {
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
                options.element.classList.remove(className);
            }, options.duration ?? 300);
        }
    }
    /**
     * Provide haptic feedback (if supported)
     */
    haptic(pattern) {
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
    audio(sound) {
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
    combined(options) {
        if (options.visual)
            this.visual(options.visual);
        if (options.haptic)
            this.haptic(options.haptic);
        if (options.audio)
            this.audio(options.audio);
    }
    getHapticIntensity(pattern) {
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
    getVibrationPattern(pattern) {
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
    dispose() {
        this._onFeedback.dispose();
    }
};
exports.FeedbackSystem = FeedbackSystem;
exports.FeedbackSystem = FeedbackSystem = __decorate([
    (0, inversify_1.injectable)()
], FeedbackSystem);
// ==================== Keybinding Manager ====================
exports.KeybindingManagerSymbol = Symbol('KeybindingManager');
/**
 * Keybinding management system
 */
let KeybindingManager = class KeybindingManager {
    constructor() {
        this._onKeybindingTriggered = new Emitter();
        this.keybindings = new Map();
        this.onKeybindingTriggered = this._onKeybindingTriggered.event;
        this.setupListeners();
    }
    /**
     * Register a keybinding
     */
    register(keybinding) {
        const key = this.normalizeKeys(keybinding.keys);
        this.keybindings.set(key, keybinding);
    }
    /**
     * Register multiple keybindings
     */
    registerMany(keybindings) {
        keybindings.forEach((kb) => this.register(kb));
    }
    /**
     * Unregister a keybinding
     */
    unregister(id) {
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
    getAll() {
        return Array.from(this.keybindings.values());
    }
    /**
     * Get keybindings by category
     */
    getByCategory(category) {
        return this.getAll().filter((kb) => kb.category === category);
    }
    /**
     * Check if a key combo matches
     */
    matchesKey(event) {
        const pressed = this.eventToKeyString(event);
        return this.keybindings.get(pressed);
    }
    normalizeKeys(keys) {
        return keys
            .toLowerCase()
            .split('+')
            .map((k) => k.trim())
            .sort()
            .join('+');
    }
    eventToKeyString(event) {
        const parts = [];
        if (event.ctrlKey || event.metaKey)
            parts.push('ctrl');
        if (event.shiftKey)
            parts.push('shift');
        if (event.altKey)
            parts.push('alt');
        const key = event.key.toLowerCase();
        if (!['control', 'shift', 'alt', 'meta'].includes(key)) {
            parts.push(key);
        }
        return parts.sort().join('+');
    }
    setupListeners() {
        if (typeof document === 'undefined')
            return;
        this.keydownHandler = (event) => {
            const keybinding = this.matchesKey(event);
            if (keybinding) {
                event.preventDefault();
                event.stopPropagation();
                this._onKeybindingTriggered.fire(keybinding);
            }
        };
        document.addEventListener('keydown', this.keydownHandler);
    }
    dispose() {
        if (this.keydownHandler && typeof document !== 'undefined') {
            document.removeEventListener('keydown', this.keydownHandler);
        }
        this.keybindings.clear();
        this._onKeybindingTriggered.dispose();
    }
};
exports.KeybindingManager = KeybindingManager;
exports.KeybindingManager = KeybindingManager = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], KeybindingManager);
// ==================== Onboarding Manager ====================
exports.OnboardingManagerSymbol = Symbol('OnboardingManager');
/**
 * User onboarding flow manager
 */
let OnboardingManager = class OnboardingManager {
    constructor() {
        this._onStepChange = new Emitter();
        this._onComplete = new Emitter();
        this.steps = [];
        this.currentIndex = -1;
        this.completed = false;
        this.skipped = false;
        this.onStepChange = this._onStepChange.event;
        this.onComplete = this._onComplete.event;
    }
    /**
     * Set onboarding steps
     */
    setSteps(steps) {
        this.steps = steps;
        this.currentIndex = -1;
        this.completed = false;
        this.skipped = false;
    }
    /**
     * Start onboarding
     */
    start() {
        if (this.steps.length === 0)
            return;
        this.currentIndex = 0;
        this._onStepChange.fire({
            step: this.steps[0],
            index: 0
        });
    }
    /**
     * Go to next step
     */
    next() {
        if (this.currentIndex < this.steps.length - 1) {
            this.currentIndex++;
            this._onStepChange.fire({
                step: this.steps[this.currentIndex],
                index: this.currentIndex,
            });
        }
        else {
            this.complete();
        }
    }
    /**
     * Go to previous step
     */
    previous() {
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
    goTo(index) {
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
    skip() {
        this.skipped = true;
        this.complete();
    }
    /**
     * Complete onboarding
     */
    complete() {
        this.completed = true;
        this._onComplete.fire();
    }
    /**
     * Get current step
     */
    getCurrentStep() {
        return this.steps[this.currentIndex];
    }
    /**
     * Get progress
     */
    getProgress() {
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
    isCompleted() {
        return this.completed;
    }
    /**
     * Check if skipped
     */
    isSkipped() {
        return this.skipped;
    }
    dispose() {
        this._onStepChange.dispose();
        this._onComplete.dispose();
    }
};
exports.OnboardingManager = OnboardingManager;
exports.OnboardingManager = OnboardingManager = __decorate([
    (0, inversify_1.injectable)()
], OnboardingManager);
// ==================== Accessibility Manager ====================
exports.AccessibilityManagerSymbol = Symbol('AccessibilityManager');
/**
 * Accessibility (a11y) management system
 */
let AccessibilityManager = class AccessibilityManager {
    constructor() {
        this._onConfigChange = new Emitter();
        this.config = {
            announcements: true,
            reducedMotion: false,
            highContrast: false,
            focusVisible: true,
            screenReader: false,
            fontSize: 'medium',
        };
        this.onConfigChange = this._onConfigChange.event;
        this.detectSystemPreferences();
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Update configuration
     */
    setConfig(updates) {
        this.config = { ...this.config, ...updates };
        this.applyConfig();
        this._onConfigChange.fire(this.config);
    }
    /**
     * Announce message to screen readers
     */
    announce(message, priority = 'polite') {
        if (!this.config.announcements)
            return;
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
    focusElement(element, announcement) {
        element.focus();
        if (announcement) {
            this.announce(announcement);
        }
    }
    /**
     * Check if user prefers reduced motion
     */
    prefersReducedMotion() {
        return this.config.reducedMotion;
    }
    /**
     * Get appropriate animation duration
     */
    getAnimationDuration(baseDuration) {
        return this.config.reducedMotion ? 0 : baseDuration;
    }
    /**
     * Get font size multiplier
     */
    getFontSizeMultiplier() {
        switch (this.config.fontSize) {
            case 'small': return 0.875;
            case 'medium': return 1;
            case 'large': return 1.125;
            case 'xlarge': return 1.25;
            default: return 1;
        }
    }
    detectSystemPreferences() {
        if (typeof window === 'undefined')
            return;
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
    applyConfig() {
        if (typeof document === 'undefined')
            return;
        const root = document.documentElement;
        // Reduced motion
        root.classList.toggle('reduce-motion', this.config.reducedMotion);
        // High contrast
        root.classList.toggle('high-contrast', this.config.highContrast);
        // Focus visible
        root.classList.toggle('focus-visible', this.config.focusVisible);
        // Font size
        root.style.setProperty('--aethel-font-scale', String(this.getFontSizeMultiplier()));
    }
    getOrCreateAnnouncer(priority) {
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
    dispose() {
        this._onConfigChange.dispose();
    }
};
exports.AccessibilityManager = AccessibilityManager;
exports.AccessibilityManager = AccessibilityManager = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], AccessibilityManager);
// ==================== Responsive Manager ====================
exports.ResponsiveManagerSymbol = Symbol('ResponsiveManager');
/**
 * Responsive design helper
 */
let ResponsiveManager = class ResponsiveManager {
    constructor() {
        this._onBreakpointChange = new Emitter();
        this.currentBreakpoint = Breakpoint.MD;
        this.breakpoints = {
            [Breakpoint.XS]: 0,
            [Breakpoint.SM]: 576,
            [Breakpoint.MD]: 768,
            [Breakpoint.LG]: 992,
            [Breakpoint.XL]: 1200,
            [Breakpoint.XXL]: 1400,
        };
        this.onBreakpointChange = this._onBreakpointChange.event;
        this.setupListeners();
        this.updateBreakpoint();
    }
    /**
     * Get current breakpoint
     */
    getCurrentBreakpoint() {
        return this.currentBreakpoint;
    }
    /**
     * Check if current breakpoint matches
     */
    is(breakpoint) {
        return this.currentBreakpoint === breakpoint;
    }
    /**
     * Check if current breakpoint is at least
     */
    isAtLeast(breakpoint) {
        return this.getBreakpointValue(this.currentBreakpoint) >=
            this.getBreakpointValue(breakpoint);
    }
    /**
     * Check if current breakpoint is at most
     */
    isAtMost(breakpoint) {
        return this.getBreakpointValue(this.currentBreakpoint) <=
            this.getBreakpointValue(breakpoint);
    }
    /**
     * Get breakpoint value
     */
    getBreakpointValue(breakpoint) {
        return this.breakpoints[breakpoint];
    }
    /**
     * Check if mobile
     */
    isMobile() {
        return this.isAtMost(Breakpoint.SM);
    }
    /**
     * Check if tablet
     */
    isTablet() {
        return this.is(Breakpoint.MD) || this.is(Breakpoint.LG);
    }
    /**
     * Check if desktop
     */
    isDesktop() {
        return this.isAtLeast(Breakpoint.XL);
    }
    setupListeners() {
        if (typeof window === 'undefined')
            return;
        window.addEventListener('resize', () => {
            this.updateBreakpoint();
        });
    }
    updateBreakpoint() {
        if (typeof window === 'undefined')
            return;
        const width = window.innerWidth;
        let newBreakpoint = Breakpoint.XS;
        for (const [bp, minWidth] of Object.entries(this.breakpoints)) {
            if (width >= minWidth) {
                newBreakpoint = bp;
            }
        }
        if (newBreakpoint !== this.currentBreakpoint) {
            this.currentBreakpoint = newBreakpoint;
            this._onBreakpointChange.fire(newBreakpoint);
        }
    }
    dispose() {
        this._onBreakpointChange.dispose();
    }
};
exports.ResponsiveManager = ResponsiveManager;
exports.ResponsiveManager = ResponsiveManager = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], ResponsiveManager);
// ==================== Animation Helper ====================
/**
 * Animation helper utilities
 */
class AnimationHelper {
    /**
     * Animate a value over time
     */
    static animate(from, to, config, onUpdate, onComplete) {
        const startTime = performance.now();
        let animationId;
        let cancelled = false;
        const easingFn = this.getEasingFunction(config.easing);
        const tick = (currentTime) => {
            if (cancelled)
                return;
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
            }
            else {
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
    static getEasingFunction(easing) {
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
                    if (t < 1 / d1)
                        return n1 * t * t;
                    if (t < 2 / d1)
                        return n1 * (t -= 1.5 / d1) * t + 0.75;
                    if (t < 2.5 / d1)
                        return n1 * (t -= 2.25 / d1) * t + 0.9375;
                    return n1 * (t -= 2.625 / d1) * t + 0.984375;
                };
            default:
                return (t) => t;
        }
    }
}
exports.AnimationHelper = AnimationHelper;
// ==================== CSS Generation ====================
/**
 * Generate feedback CSS styles
 */
function generateFeedbackStyles() {
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
