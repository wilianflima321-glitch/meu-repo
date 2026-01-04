/**
 * Accessibility System - Professional A11y Infrastructure
 *
 * Sistema de acessibilidade profissional para IDE de produção.
 * Conformidade com WCAG 2.1 AAA.
 * Inspirado em VS Code, JetBrains, Unreal Engine.
 * Suporta:
 * - Screen readers (ARIA)
 * - Navegação por teclado
 * - Alto contraste
 * - Redução de movimento
 * - Foco visível
 * - Anúncios ao vivo
 * - Atalhos de acessibilidade
 * - Skip links
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Accessibility level
 */
export declare enum A11yLevel {
    A = "A",// Basic
    AA = "AA",// Enhanced
    AAA = "AAA"
}
/**
 * Screen reader mode
 */
export declare enum ScreenReaderMode {
    Off = "off",
    Auto = "auto",
    On = "on"
}
/**
 * Contrast mode
 */
export declare enum ContrastMode {
    Normal = "normal",
    High = "high",
    HighInverted = "high-inverted"
}
/**
 * Motion preference
 */
export declare enum MotionPreference {
    NoPreference = "no-preference",
    Reduce = "reduce"
}
/**
 * ARIA role
 */
export type AriaRole = 'alert' | 'alertdialog' | 'application' | 'article' | 'banner' | 'button' | 'cell' | 'checkbox' | 'columnheader' | 'combobox' | 'complementary' | 'contentinfo' | 'definition' | 'dialog' | 'directory' | 'document' | 'feed' | 'figure' | 'form' | 'grid' | 'gridcell' | 'group' | 'heading' | 'img' | 'link' | 'list' | 'listbox' | 'listitem' | 'log' | 'main' | 'marquee' | 'math' | 'menu' | 'menubar' | 'menuitem' | 'menuitemcheckbox' | 'menuitemradio' | 'navigation' | 'none' | 'note' | 'option' | 'presentation' | 'progressbar' | 'radio' | 'radiogroup' | 'region' | 'row' | 'rowgroup' | 'rowheader' | 'scrollbar' | 'search' | 'searchbox' | 'separator' | 'slider' | 'spinbutton' | 'status' | 'switch' | 'tab' | 'table' | 'tablist' | 'tabpanel' | 'term' | 'textbox' | 'timer' | 'toolbar' | 'tooltip' | 'tree' | 'treegrid' | 'treeitem';
/**
 * ARIA live politeness
 */
export type AriaLive = 'off' | 'polite' | 'assertive';
/**
 * Focus trap options
 */
export interface FocusTrapOptions {
    initialFocus?: HTMLElement | string;
    returnFocusOnDeactivate?: boolean;
    escapeDeactivates?: boolean;
    clickOutsideDeactivates?: boolean;
    allowOutsideClick?: boolean | ((event: MouseEvent | TouchEvent) => boolean);
}
/**
 * Accessibility config
 */
export interface AccessibilityConfig {
    screenReaderMode: ScreenReaderMode;
    announceDelay: number;
    contrastMode: ContrastMode;
    motionPreference: MotionPreference;
    focusHighlight: boolean;
    largeFont: boolean;
    fontScale: number;
    tabNavigation: boolean;
    skipLinks: boolean;
    landmarkNavigation: boolean;
    lineNumbers: 'on' | 'off' | 'relative';
    cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
    cursorWidth: number;
    audioCues: boolean;
    targetLevel: A11yLevel;
}
/**
 * Accessible element info
 */
export interface AccessibleElementInfo {
    element: HTMLElement;
    role?: AriaRole;
    label?: string;
    description?: string;
    live?: AriaLive;
    expanded?: boolean;
    selected?: boolean;
    checked?: boolean | 'mixed';
    disabled?: boolean;
    hidden?: boolean;
    level?: number;
    valueMin?: number;
    valueMax?: number;
    valueNow?: number;
    valueText?: string;
    controls?: string;
    owns?: string;
    labelledBy?: string;
    describedBy?: string;
}
/**
 * Landmark
 */
export interface Landmark {
    id: string;
    role: 'banner' | 'navigation' | 'main' | 'complementary' | 'contentinfo' | 'search' | 'form' | 'region';
    label: string;
    element: HTMLElement;
}
/**
 * Skip link
 */
export interface SkipLink {
    id: string;
    label: string;
    target: string;
}
/**
 * Announcement
 */
export interface Announcement {
    id: string;
    message: string;
    priority: AriaLive;
    timestamp: number;
}
/**
 * Config changed event
 */
export interface A11yConfigChangedEvent {
    property: keyof AccessibilityConfig;
    oldValue: unknown;
    newValue: unknown;
}
/**
 * Screen reader detected event
 */
export interface ScreenReaderDetectedEvent {
    detected: boolean;
    type?: string;
}
/**
 * Focus changed event
 */
export interface FocusChangedEvent {
    previousElement: HTMLElement | null;
    currentElement: HTMLElement | null;
    source: 'keyboard' | 'mouse' | 'programmatic';
}
export declare class AccessibilitySystem {
    private config;
    private screenReaderDetected;
    private announceQueue;
    private announceTimer;
    private focusedElement;
    private focusHistory;
    private activeFocusTraps;
    private liveRegion;
    private skipLinksContainer;
    private readonly landmarks;
    private readonly skipLinks;
    private readonly accessibleElements;
    private readonly onConfigChangedEmitter;
    readonly onConfigChanged: Event<A11yConfigChangedEvent>;
    private readonly onScreenReaderDetectedEmitter;
    readonly onScreenReaderDetected: Event<ScreenReaderDetectedEvent>;
    private readonly onFocusChangedEmitter;
    readonly onFocusChanged: Event<FocusChangedEvent>;
    private readonly onAnnouncementEmitter;
    readonly onAnnouncement: Event<Announcement>;
    constructor();
    /**
     * Initialize accessibility system
     */
    private initialize;
    /**
     * Detect system preferences
     */
    private detectSystemPreferences;
    /**
     * Setup live region for announcements
     */
    private setupLiveRegion;
    /**
     * Setup skip links
     */
    private setupSkipLinks;
    /**
     * Setup focus tracking
     */
    private setupFocusTracking;
    /**
     * Detect screen reader
     */
    private detectScreenReader;
    /**
     * Update configuration
     */
    updateConfig<K extends keyof AccessibilityConfig>(property: K, value: AccessibilityConfig[K]): void;
    /**
     * Apply config change
     */
    private applyConfigChange;
    /**
     * Apply contrast mode
     */
    private applyContrastMode;
    /**
     * Apply motion preference
     */
    private applyMotionPreference;
    /**
     * Apply font scale
     */
    private applyFontScale;
    /**
     * Apply focus highlight
     */
    private applyFocusHighlight;
    /**
     * Get configuration
     */
    getConfig(): AccessibilityConfig;
    /**
     * Announce message to screen reader
     */
    announce(message: string, priority?: AriaLive): void;
    /**
     * Schedule announcement processing
     */
    private scheduleAnnounce;
    /**
     * Process announcement queue
     */
    private processAnnounceQueue;
    /**
     * Actually announce to screen reader
     */
    private doAnnounce;
    /**
     * Clear pending announcements
     */
    clearAnnouncements(): void;
    /**
     * Set ARIA attributes on element
     */
    setAriaAttributes(element: HTMLElement, info: Partial<AccessibleElementInfo>): void;
    /**
     * Register accessible element
     */
    registerAccessibleElement(id: string, info: AccessibleElementInfo): void;
    /**
     * Unregister accessible element
     */
    unregisterAccessibleElement(id: string): void;
    /**
     * Update accessible element
     */
    updateAccessibleElement(id: string, updates: Partial<AccessibleElementInfo>): void;
    /**
     * Register landmark
     */
    registerLandmark(landmark: Landmark): void;
    /**
     * Unregister landmark
     */
    unregisterLandmark(id: string): void;
    /**
     * Get all landmarks
     */
    getLandmarks(): Landmark[];
    /**
     * Navigate to landmark
     */
    navigateToLandmark(role: Landmark['role']): boolean;
    /**
     * Navigate to next landmark
     */
    navigateToNextLandmark(): boolean;
    /**
     * Add skip link
     */
    addSkipLink(id: string, label: string, target: string): void;
    /**
     * Remove skip link
     */
    removeSkipLink(id: string): void;
    /**
     * Render skip links
     */
    private renderSkipLinks;
    /**
     * Create focus trap
     */
    createFocusTrap(container: HTMLElement, options?: FocusTrapOptions): FocusTrap;
    /**
     * Release focus trap
     */
    releaseFocusTrap(trap: FocusTrap): void;
    /**
     * Focus element
     */
    focusElement(element: HTMLElement | string, announce?: string): void;
    /**
     * Focus first focusable element in container
     */
    focusFirst(container: HTMLElement): HTMLElement | null;
    /**
     * Focus last focusable element in container
     */
    focusLast(container: HTMLElement): HTMLElement | null;
    /**
     * Get all focusable elements in container
     */
    getFocusableElements(container: HTMLElement): HTMLElement[];
    /**
     * Get focus history
     */
    getFocusHistory(): HTMLElement[];
    /**
     * Restore previous focus
     */
    restorePreviousFocus(): boolean;
    /**
     * Handle roving tabindex for group
     */
    setupRovingTabindex(container: HTMLElement, selector: string): void;
    /**
     * Play audio cue
     */
    playAudioCue(cue: 'error' | 'warning' | 'success' | 'notification' | 'focus'): void;
    /**
     * Validate element accessibility
     */
    validateElement(element: HTMLElement): AccessibilityIssue[];
    /**
     * Check if element is interactive
     */
    private isInteractiveElement;
    /**
     * Check if element has interactive role
     */
    private hasInteractiveRole;
    /**
     * Check if element is natively focusable
     */
    private isNativelyFocusable;
    /**
     * Is screen reader active
     */
    isScreenReaderActive(): boolean;
    /**
     * Generate unique ID
     */
    generateId(prefix?: string): string;
    /**
     * Get statistics
     */
    getStatistics(): {
        landmarksCount: number;
        skipLinksCount: number;
        registeredElements: number;
        activeFocusTraps: number;
        screenReaderDetected: boolean;
    };
    /**
     * Dispose
     */
    dispose(): void;
}
declare class FocusTrap {
    private container;
    private options;
    private active;
    private previouslyFocused;
    private handleKeyDown;
    constructor(container: HTMLElement, options?: FocusTrapOptions);
    activate(): void;
    deactivate(): void;
    private handleTab;
    private getFocusableElements;
}
interface AccessibilityIssue {
    type: 'error' | 'warning' | 'info';
    rule: string;
    message: string;
    element: HTMLElement;
}
export default AccessibilitySystem;
