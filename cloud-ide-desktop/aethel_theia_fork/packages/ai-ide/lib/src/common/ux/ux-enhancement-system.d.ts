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
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Toast notification types
 */
export declare enum ToastType {
    Info = "info",
    Success = "success",
    Warning = "warning",
    Error = "error",
    Loading = "loading"
}
/**
 * Progress indicator types
 */
export declare enum ProgressType {
    Determinate = "determinate",
    Indeterminate = "indeterminate",
    Steps = "steps",
    Circular = "circular"
}
/**
 * Animation easing functions
 */
export declare enum Easing {
    Linear = "linear",
    EaseIn = "ease-in",
    EaseOut = "ease-out",
    EaseInOut = "ease-in-out",
    Spring = "spring",
    Bounce = "bounce"
}
/**
 * Feedback types
 */
export declare enum FeedbackType {
    Visual = "visual",
    Haptic = "haptic",
    Audio = "audio",
    Combined = "combined"
}
/**
 * Breakpoints for responsive design
 */
export declare enum Breakpoint {
    XS = "xs",// < 576px
    SM = "sm",// >= 576px
    MD = "md",// >= 768px
    LG = "lg",// >= 992px
    XL = "xl",// >= 1200px
    XXL = "xxl"
}
/**
 * Toast notification configuration
 */
export interface ToastConfig {
    id?: string;
    type: ToastType;
    title?: string;
    message: string;
    duration?: number;
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
    value?: number;
    steps?: {
        label: string;
        completed: boolean;
    }[];
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
    keys: string;
    command: string;
    when?: string;
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
    target?: string;
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
export declare const ToastManagerSymbol: unique symbol;
/**
 * Toast notification manager
 */
export declare class ToastManager {
    private readonly _onToastShow;
    private readonly _onToastDismiss;
    private toasts;
    private toastIdCounter;
    private maxToasts;
    readonly onToastShow: Event<ToastConfig>;
    readonly onToastDismiss: Event<string>;
    /**
     * Show a toast notification
     */
    show(config: ToastConfig): string;
    /**
     * Show info toast
     */
    info(message: string, options?: Partial<ToastConfig>): string;
    /**
     * Show success toast
     */
    success(message: string, options?: Partial<ToastConfig>): string;
    /**
     * Show warning toast
     */
    warning(message: string, options?: Partial<ToastConfig>): string;
    /**
     * Show error toast
     */
    error(message: string, options?: Partial<ToastConfig>): string;
    /**
     * Show loading toast
     */
    loading(message: string, options?: Partial<ToastConfig>): string;
    /**
     * Update an existing toast
     */
    update(id: string, config: Partial<ToastConfig>): void;
    /**
     * Dismiss a toast
     */
    dismiss(id: string): void;
    /**
     * Dismiss all toasts
     */
    dismissAll(): void;
    /**
     * Promise-based toast for async operations
     */
    promise<T>(promise: Promise<T>, messages: {
        loading: string;
        success: string | ((data: T) => string);
        error: string | ((err: Error) => string);
    }): Promise<T>;
    private getDefaultDuration;
    dispose(): void;
}
export declare const ProgressManagerSymbol: unique symbol;
/**
 * Progress indicator manager
 */
export declare class ProgressManager {
    private readonly _onProgressStart;
    private readonly _onProgressUpdate;
    private readonly _onProgressEnd;
    private progress;
    readonly onProgressStart: Event<ProgressConfig>;
    readonly onProgressUpdate: Event<ProgressConfig>;
    readonly onProgressEnd: Event<string>;
    /**
     * Start a progress indicator
     */
    start(config: ProgressConfig): void;
    /**
     * Update progress value
     */
    update(id: string, updates: Partial<ProgressConfig>): void;
    /**
     * Increment progress value
     */
    increment(id: string, amount?: number): void;
    /**
     * Complete a step (for step progress)
     */
    completeStep(id: string, stepIndex: number): void;
    /**
     * End a progress indicator
     */
    end(id: string): void;
    /**
     * Run with progress (auto-managed)
     */
    withProgress<T>(config: Omit<ProgressConfig, 'value'>, operation: (report: (value: number, message?: string) => void) => Promise<T>): Promise<T>;
    /**
     * Get active progress indicators
     */
    getActive(): ProgressConfig[];
    dispose(): void;
}
export declare const FeedbackSystemSymbol: unique symbol;
/**
 * Unified feedback system
 */
export declare class FeedbackSystem {
    private readonly _onFeedback;
    readonly onFeedback: Event<{
        type: FeedbackType;
        intensity: number;
        pattern?: string;
    }>;
    /**
     * Provide visual feedback
     */
    visual(options: {
        element?: HTMLElement;
        effect: 'pulse' | 'shake' | 'glow' | 'ripple' | 'highlight';
        color?: string;
        duration?: number;
    }): void;
    /**
     * Provide haptic feedback (if supported)
     */
    haptic(pattern: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error'): void;
    /**
     * Provide audio feedback
     */
    audio(sound: 'click' | 'success' | 'error' | 'notification' | 'warning'): void;
    /**
     * Combined feedback
     */
    combined(options: {
        visual?: Parameters<FeedbackSystem['visual']>[0];
        haptic?: Parameters<FeedbackSystem['haptic']>[0];
        audio?: Parameters<FeedbackSystem['audio']>[0];
    }): void;
    private getHapticIntensity;
    private getVibrationPattern;
    dispose(): void;
}
export declare const KeybindingManagerSymbol: unique symbol;
/**
 * Keybinding management system
 */
export declare class KeybindingManager {
    private readonly _onKeybindingTriggered;
    private keybindings;
    private keydownHandler?;
    readonly onKeybindingTriggered: Event<Keybinding>;
    constructor();
    /**
     * Register a keybinding
     */
    register(keybinding: Keybinding): void;
    /**
     * Register multiple keybindings
     */
    registerMany(keybindings: Keybinding[]): void;
    /**
     * Unregister a keybinding
     */
    unregister(id: string): void;
    /**
     * Get all keybindings
     */
    getAll(): Keybinding[];
    /**
     * Get keybindings by category
     */
    getByCategory(category: string): Keybinding[];
    /**
     * Check if a key combo matches
     */
    private matchesKey;
    private normalizeKeys;
    private eventToKeyString;
    private setupListeners;
    dispose(): void;
}
export declare const OnboardingManagerSymbol: unique symbol;
/**
 * User onboarding flow manager
 */
export declare class OnboardingManager {
    private readonly _onStepChange;
    private readonly _onComplete;
    private steps;
    private currentIndex;
    private completed;
    private skipped;
    readonly onStepChange: Event<{
        step: OnboardingStep;
        index: number;
    }>;
    readonly onComplete: Event<void>;
    /**
     * Set onboarding steps
     */
    setSteps(steps: OnboardingStep[]): void;
    /**
     * Start onboarding
     */
    start(): void;
    /**
     * Go to next step
     */
    next(): void;
    /**
     * Go to previous step
     */
    previous(): void;
    /**
     * Go to specific step
     */
    goTo(index: number): void;
    /**
     * Skip onboarding
     */
    skip(): void;
    /**
     * Complete onboarding
     */
    complete(): void;
    /**
     * Get current step
     */
    getCurrentStep(): OnboardingStep | undefined;
    /**
     * Get progress
     */
    getProgress(): {
        current: number;
        total: number;
        percentage: number;
    };
    /**
     * Check if completed
     */
    isCompleted(): boolean;
    /**
     * Check if skipped
     */
    isSkipped(): boolean;
    dispose(): void;
}
export declare const AccessibilityManagerSymbol: unique symbol;
/**
 * Accessibility (a11y) management system
 */
export declare class AccessibilityManager {
    private readonly _onConfigChange;
    private config;
    readonly onConfigChange: Event<A11yConfig>;
    constructor();
    /**
     * Get current configuration
     */
    getConfig(): A11yConfig;
    /**
     * Update configuration
     */
    setConfig(updates: Partial<A11yConfig>): void;
    /**
     * Announce message to screen readers
     */
    announce(message: string, priority?: 'polite' | 'assertive'): void;
    /**
     * Set focus to element with announcement
     */
    focusElement(element: HTMLElement, announcement?: string): void;
    /**
     * Check if user prefers reduced motion
     */
    prefersReducedMotion(): boolean;
    /**
     * Get appropriate animation duration
     */
    getAnimationDuration(baseDuration: number): number;
    /**
     * Get font size multiplier
     */
    getFontSizeMultiplier(): number;
    private detectSystemPreferences;
    private applyConfig;
    private getOrCreateAnnouncer;
    dispose(): void;
}
export declare const ResponsiveManagerSymbol: unique symbol;
/**
 * Responsive design helper
 */
export declare class ResponsiveManager {
    private readonly _onBreakpointChange;
    private currentBreakpoint;
    private readonly breakpoints;
    readonly onBreakpointChange: Event<Breakpoint>;
    constructor();
    /**
     * Get current breakpoint
     */
    getCurrentBreakpoint(): Breakpoint;
    /**
     * Check if current breakpoint matches
     */
    is(breakpoint: Breakpoint): boolean;
    /**
     * Check if current breakpoint is at least
     */
    isAtLeast(breakpoint: Breakpoint): boolean;
    /**
     * Check if current breakpoint is at most
     */
    isAtMost(breakpoint: Breakpoint): boolean;
    /**
     * Get breakpoint value
     */
    getBreakpointValue(breakpoint: Breakpoint): number;
    /**
     * Check if mobile
     */
    isMobile(): boolean;
    /**
     * Check if tablet
     */
    isTablet(): boolean;
    /**
     * Check if desktop
     */
    isDesktop(): boolean;
    private setupListeners;
    private updateBreakpoint;
    dispose(): void;
}
/**
 * Animation helper utilities
 */
export declare class AnimationHelper {
    /**
     * Animate a value over time
     */
    static animate(from: number, to: number, config: AnimationConfig, onUpdate: (value: number) => void, onComplete?: () => void): () => void;
    /**
     * Get easing function
     */
    private static getEasingFunction;
}
/**
 * Generate feedback CSS styles
 */
export declare function generateFeedbackStyles(): string;
export {};
