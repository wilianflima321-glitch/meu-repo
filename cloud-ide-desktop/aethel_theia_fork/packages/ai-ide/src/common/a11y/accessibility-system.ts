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

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
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
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Accessibility Types ====================

/**
 * Accessibility level
 */
export enum A11yLevel {
    A = 'A',        // Basic
    AA = 'AA',      // Enhanced
    AAA = 'AAA'     // Maximum
}

/**
 * Screen reader mode
 */
export enum ScreenReaderMode {
    Off = 'off',
    Auto = 'auto',
    On = 'on'
}

/**
 * Contrast mode
 */
export enum ContrastMode {
    Normal = 'normal',
    High = 'high',
    HighInverted = 'high-inverted'
}

/**
 * Motion preference
 */
export enum MotionPreference {
    NoPreference = 'no-preference',
    Reduce = 'reduce'
}

/**
 * ARIA role
 */
export type AriaRole = 
    | 'alert'
    | 'alertdialog'
    | 'application'
    | 'article'
    | 'banner'
    | 'button'
    | 'cell'
    | 'checkbox'
    | 'columnheader'
    | 'combobox'
    | 'complementary'
    | 'contentinfo'
    | 'definition'
    | 'dialog'
    | 'directory'
    | 'document'
    | 'feed'
    | 'figure'
    | 'form'
    | 'grid'
    | 'gridcell'
    | 'group'
    | 'heading'
    | 'img'
    | 'link'
    | 'list'
    | 'listbox'
    | 'listitem'
    | 'log'
    | 'main'
    | 'marquee'
    | 'math'
    | 'menu'
    | 'menubar'
    | 'menuitem'
    | 'menuitemcheckbox'
    | 'menuitemradio'
    | 'navigation'
    | 'none'
    | 'note'
    | 'option'
    | 'presentation'
    | 'progressbar'
    | 'radio'
    | 'radiogroup'
    | 'region'
    | 'row'
    | 'rowgroup'
    | 'rowheader'
    | 'scrollbar'
    | 'search'
    | 'searchbox'
    | 'separator'
    | 'slider'
    | 'spinbutton'
    | 'status'
    | 'switch'
    | 'tab'
    | 'table'
    | 'tablist'
    | 'tabpanel'
    | 'term'
    | 'textbox'
    | 'timer'
    | 'toolbar'
    | 'tooltip'
    | 'tree'
    | 'treegrid'
    | 'treeitem';

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
    // Screen reader
    screenReaderMode: ScreenReaderMode;
    announceDelay: number;
    
    // Visual
    contrastMode: ContrastMode;
    motionPreference: MotionPreference;
    focusHighlight: boolean;
    largeFont: boolean;
    fontScale: number;
    
    // Navigation
    tabNavigation: boolean;
    skipLinks: boolean;
    landmarkNavigation: boolean;
    
    // Editor
    lineNumbers: 'on' | 'off' | 'relative';
    cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
    cursorWidth: number;
    
    // Audio
    audioCues: boolean;
    
    // Level
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

// ==================== Events ====================

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

// ==================== Main Accessibility System ====================

@injectable()
export class AccessibilitySystem {
    // Configuration
    private config: AccessibilityConfig = {
        screenReaderMode: ScreenReaderMode.Auto,
        announceDelay: 150,
        contrastMode: ContrastMode.Normal,
        motionPreference: MotionPreference.NoPreference,
        focusHighlight: true,
        largeFont: false,
        fontScale: 1,
        tabNavigation: true,
        skipLinks: true,
        landmarkNavigation: true,
        lineNumbers: 'on',
        cursorBlinking: 'blink',
        cursorWidth: 2,
        audioCues: false,
        targetLevel: A11yLevel.AA
    };

    // State
    private screenReaderDetected = false;
    private announceQueue: Announcement[] = [];
    private announceTimer: ReturnType<typeof setTimeout> | null = null;
    private focusedElement: HTMLElement | null = null;
    private focusHistory: HTMLElement[] = [];
    private activeFocusTraps: Map<string, FocusTrap> = new Map();
    
    // Elements
    private liveRegion: HTMLElement | null = null;
    private skipLinksContainer: HTMLElement | null = null;
    
    // Registry
    private readonly landmarks: Map<string, Landmark> = new Map();
    private readonly skipLinks: SkipLink[] = [];
    private readonly accessibleElements: Map<string, AccessibleElementInfo> = new Map();

    // Events
    private readonly onConfigChangedEmitter = new Emitter<A11yConfigChangedEvent>();
    readonly onConfigChanged: Event<A11yConfigChangedEvent> = this.onConfigChangedEmitter.event;
    
    private readonly onScreenReaderDetectedEmitter = new Emitter<ScreenReaderDetectedEvent>();
    readonly onScreenReaderDetected: Event<ScreenReaderDetectedEvent> = this.onScreenReaderDetectedEmitter.event;
    
    private readonly onFocusChangedEmitter = new Emitter<FocusChangedEvent>();
    readonly onFocusChanged: Event<FocusChangedEvent> = this.onFocusChangedEmitter.event;
    
    private readonly onAnnouncementEmitter = new Emitter<Announcement>();
    readonly onAnnouncement: Event<Announcement> = this.onAnnouncementEmitter.event;

    constructor() {
        this.initialize();
    }

    // ==================== Initialization ====================

    /**
     * Initialize accessibility system
     */
    private initialize(): void {
        this.detectSystemPreferences();
        this.setupLiveRegion();
        this.setupSkipLinks();
        this.setupFocusTracking();
        this.detectScreenReader();
    }

    /**
     * Detect system preferences
     */
    private detectSystemPreferences(): void {
        if (typeof window === 'undefined') return;
        
        // High contrast
        if (window.matchMedia('(prefers-contrast: high)').matches) {
            this.config.contrastMode = ContrastMode.High;
        }
        
        // Reduced motion
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            this.config.motionPreference = MotionPreference.Reduce;
        }
        
        // Listen for changes
        window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
            this.updateConfig('contrastMode', e.matches ? ContrastMode.High : ContrastMode.Normal);
        });
        
        window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
            this.updateConfig('motionPreference', e.matches ? MotionPreference.Reduce : MotionPreference.NoPreference);
        });
    }

    /**
     * Setup live region for announcements
     */
    private setupLiveRegion(): void {
        if (typeof document === 'undefined') return;
        
        // Create polite live region
        this.liveRegion = document.createElement('div');
        this.liveRegion.setAttribute('role', 'status');
        this.liveRegion.setAttribute('aria-live', 'polite');
        this.liveRegion.setAttribute('aria-atomic', 'true');
        this.liveRegion.className = 'sr-only a11y-live-region';
        this.liveRegion.style.cssText = `
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
        document.body.appendChild(this.liveRegion);
    }

    /**
     * Setup skip links
     */
    private setupSkipLinks(): void {
        if (typeof document === 'undefined') return;
        
        this.skipLinksContainer = document.createElement('nav');
        this.skipLinksContainer.setAttribute('role', 'navigation');
        this.skipLinksContainer.setAttribute('aria-label', 'Skip links');
        this.skipLinksContainer.className = 'a11y-skip-links';
        this.skipLinksContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            z-index: 100000;
        `;
        
        document.body.insertBefore(this.skipLinksContainer, document.body.firstChild);
        
        // Add default skip links
        this.addSkipLink('skip-to-main', 'Skip to main content', '#main');
        this.addSkipLink('skip-to-nav', 'Skip to navigation', '#navigation');
        this.addSkipLink('skip-to-search', 'Skip to search', '#search');
    }

    /**
     * Setup focus tracking
     */
    private setupFocusTracking(): void {
        if (typeof document === 'undefined') return;
        
        document.addEventListener('focusin', (e) => {
            const target = e.target as HTMLElement;
            const previous = this.focusedElement;
            
            this.focusedElement = target;
            this.focusHistory.push(target);
            
            // Trim history
            if (this.focusHistory.length > 50) {
                this.focusHistory.shift();
            }
            
            this.onFocusChangedEmitter.fire({
                previousElement: previous,
                currentElement: target,
                source: 'keyboard' // Simplified - would detect actual source
            });
        });
        
        // Add keyboard navigation class
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('a11y-keyboard-navigation');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.body.classList.remove('a11y-keyboard-navigation');
        });
    }

    /**
     * Detect screen reader
     */
    private detectScreenReader(): void {
        if (typeof window === 'undefined') return;
        
        // Various detection methods
        const checks = [
            // Check for common screen reader globals
            () => 'NVDA' in window,
            () => 'JAWS' in window,
            () => 'ChromeVox' in window,
            // Check for accessibility properties
            () => document.body.getAttribute('role') === 'application',
            // Check for reduced transparency (often indicates screen reader)
            () => window.matchMedia('(prefers-reduced-transparency: reduce)').matches
        ];
        
        this.screenReaderDetected = checks.some(check => {
            try { return check(); } catch { return false; }
        });
        
        if (this.config.screenReaderMode === ScreenReaderMode.Auto && this.screenReaderDetected) {
            this.onScreenReaderDetectedEmitter.fire({
                detected: true,
                type: 'unknown'
            });
        }
    }

    // ==================== Configuration ====================

    /**
     * Update configuration
     */
    updateConfig<K extends keyof AccessibilityConfig>(
        property: K,
        value: AccessibilityConfig[K]
    ): void {
        const oldValue = this.config[property];
        this.config[property] = value;
        
        this.onConfigChangedEmitter.fire({
            property,
            oldValue,
            newValue: value
        });
        
        this.applyConfigChange(property, value);
    }

    /**
     * Apply config change
     */
    private applyConfigChange<K extends keyof AccessibilityConfig>(
        property: K,
        value: AccessibilityConfig[K]
    ): void {
        if (typeof document === 'undefined') return;
        
        switch (property) {
            case 'contrastMode':
                this.applyContrastMode(value as ContrastMode);
                break;
            case 'motionPreference':
                this.applyMotionPreference(value as MotionPreference);
                break;
            case 'fontScale':
                this.applyFontScale(value as number);
                break;
            case 'focusHighlight':
                this.applyFocusHighlight(value as boolean);
                break;
        }
    }

    /**
     * Apply contrast mode
     */
    private applyContrastMode(mode: ContrastMode): void {
        document.body.classList.remove('a11y-high-contrast', 'a11y-high-contrast-inverted');
        
        if (mode === ContrastMode.High) {
            document.body.classList.add('a11y-high-contrast');
        } else if (mode === ContrastMode.HighInverted) {
            document.body.classList.add('a11y-high-contrast-inverted');
        }
    }

    /**
     * Apply motion preference
     */
    private applyMotionPreference(preference: MotionPreference): void {
        document.body.classList.toggle('a11y-reduced-motion', preference === MotionPreference.Reduce);
    }

    /**
     * Apply font scale
     */
    private applyFontScale(scale: number): void {
        document.documentElement.style.setProperty('--a11y-font-scale', scale.toString());
    }

    /**
     * Apply focus highlight
     */
    private applyFocusHighlight(enabled: boolean): void {
        document.body.classList.toggle('a11y-focus-highlight', enabled);
    }

    /**
     * Get configuration
     */
    getConfig(): AccessibilityConfig {
        return { ...this.config };
    }

    // ==================== Announcements ====================

    /**
     * Announce message to screen reader
     */
    announce(message: string, priority: AriaLive = 'polite'): void {
        const announcement: Announcement = {
            id: `announce_${Date.now()}`,
            message,
            priority,
            timestamp: Date.now()
        };
        
        if (priority === 'assertive') {
            // Announce immediately
            this.doAnnounce(announcement);
        } else {
            // Queue announcement
            this.announceQueue.push(announcement);
            this.scheduleAnnounce();
        }
        
        this.onAnnouncementEmitter.fire(announcement);
    }

    /**
     * Schedule announcement processing
     */
    private scheduleAnnounce(): void {
        if (this.announceTimer) return;
        
        this.announceTimer = setTimeout(() => {
            this.processAnnounceQueue();
            this.announceTimer = null;
        }, this.config.announceDelay);
    }

    /**
     * Process announcement queue
     */
    private processAnnounceQueue(): void {
        if (this.announceQueue.length === 0) return;
        
        // Combine messages
        const messages = this.announceQueue.map(a => a.message);
        this.announceQueue = [];
        
        this.doAnnounce({
            id: `announce_combined_${Date.now()}`,
            message: messages.join('. '),
            priority: 'polite',
            timestamp: Date.now()
        });
    }

    /**
     * Actually announce to screen reader
     */
    private doAnnounce(announcement: Announcement): void {
        if (!this.liveRegion) return;
        
        // Set priority
        this.liveRegion.setAttribute('aria-live', announcement.priority);
        
        // Clear and set message (forces re-announcement)
        this.liveRegion.textContent = '';
        
        setTimeout(() => {
            if (this.liveRegion) {
                this.liveRegion.textContent = announcement.message;
            }
        }, 50);
    }

    /**
     * Clear pending announcements
     */
    clearAnnouncements(): void {
        this.announceQueue = [];
        if (this.announceTimer) {
            clearTimeout(this.announceTimer);
            this.announceTimer = null;
        }
    }

    // ==================== ARIA Management ====================

    /**
     * Set ARIA attributes on element
     */
    setAriaAttributes(element: HTMLElement, info: Partial<AccessibleElementInfo>): void {
        if (info.role) element.setAttribute('role', info.role);
        if (info.label) element.setAttribute('aria-label', info.label);
        if (info.description) element.setAttribute('aria-description', info.description);
        if (info.live) element.setAttribute('aria-live', info.live);
        if (info.expanded !== undefined) element.setAttribute('aria-expanded', info.expanded.toString());
        if (info.selected !== undefined) element.setAttribute('aria-selected', info.selected.toString());
        if (info.checked !== undefined) element.setAttribute('aria-checked', info.checked.toString());
        if (info.disabled !== undefined) element.setAttribute('aria-disabled', info.disabled.toString());
        if (info.hidden !== undefined) element.setAttribute('aria-hidden', info.hidden.toString());
        if (info.level !== undefined) element.setAttribute('aria-level', info.level.toString());
        if (info.valueMin !== undefined) element.setAttribute('aria-valuemin', info.valueMin.toString());
        if (info.valueMax !== undefined) element.setAttribute('aria-valuemax', info.valueMax.toString());
        if (info.valueNow !== undefined) element.setAttribute('aria-valuenow', info.valueNow.toString());
        if (info.valueText) element.setAttribute('aria-valuetext', info.valueText);
        if (info.controls) element.setAttribute('aria-controls', info.controls);
        if (info.owns) element.setAttribute('aria-owns', info.owns);
        if (info.labelledBy) element.setAttribute('aria-labelledby', info.labelledBy);
        if (info.describedBy) element.setAttribute('aria-describedby', info.describedBy);
    }

    /**
     * Register accessible element
     */
    registerAccessibleElement(id: string, info: AccessibleElementInfo): void {
        this.accessibleElements.set(id, info);
        this.setAriaAttributes(info.element, info);
    }

    /**
     * Unregister accessible element
     */
    unregisterAccessibleElement(id: string): void {
        this.accessibleElements.delete(id);
    }

    /**
     * Update accessible element
     */
    updateAccessibleElement(id: string, updates: Partial<AccessibleElementInfo>): void {
        const info = this.accessibleElements.get(id);
        if (info) {
            Object.assign(info, updates);
            this.setAriaAttributes(info.element, updates);
        }
    }

    // ==================== Landmarks ====================

    /**
     * Register landmark
     */
    registerLandmark(landmark: Landmark): void {
        this.landmarks.set(landmark.id, landmark);
        landmark.element.setAttribute('role', landmark.role);
        landmark.element.setAttribute('aria-label', landmark.label);
    }

    /**
     * Unregister landmark
     */
    unregisterLandmark(id: string): void {
        this.landmarks.delete(id);
    }

    /**
     * Get all landmarks
     */
    getLandmarks(): Landmark[] {
        return Array.from(this.landmarks.values());
    }

    /**
     * Navigate to landmark
     */
    navigateToLandmark(role: Landmark['role']): boolean {
        for (const landmark of this.landmarks.values()) {
            if (landmark.role === role) {
                landmark.element.focus();
                this.announce(`${landmark.label} ${role}`);
                return true;
            }
        }
        return false;
    }

    /**
     * Navigate to next landmark
     */
    navigateToNextLandmark(): boolean {
        const landmarks = this.getLandmarks();
        if (landmarks.length === 0) return false;
        
        const currentIndex = this.focusedElement 
            ? landmarks.findIndex(l => l.element.contains(this.focusedElement!))
            : -1;
        
        const nextIndex = (currentIndex + 1) % landmarks.length;
        landmarks[nextIndex].element.focus();
        this.announce(`${landmarks[nextIndex].label} ${landmarks[nextIndex].role}`);
        return true;
    }

    // ==================== Skip Links ====================

    /**
     * Add skip link
     */
    addSkipLink(id: string, label: string, target: string): void {
        this.skipLinks.push({ id, label, target });
        this.renderSkipLinks();
    }

    /**
     * Remove skip link
     */
    removeSkipLink(id: string): void {
        const index = this.skipLinks.findIndex(l => l.id === id);
        if (index !== -1) {
            this.skipLinks.splice(index, 1);
            this.renderSkipLinks();
        }
    }

    /**
     * Render skip links
     */
    private renderSkipLinks(): void {
        if (!this.skipLinksContainer) return;
        
        this.skipLinksContainer.innerHTML = '';
        
        for (const link of this.skipLinks) {
            const a = document.createElement('a');
            a.href = link.target;
            a.className = 'a11y-skip-link';
            a.textContent = link.label;
            a.style.cssText = `
                position: absolute;
                left: -9999px;
                z-index: 100001;
                padding: 8px 16px;
                background: var(--a11y-focus-color, #005a9e);
                color: white;
                text-decoration: none;
                font-weight: bold;
            `;
            
            a.addEventListener('focus', () => {
                a.style.left = '0';
            });
            
            a.addEventListener('blur', () => {
                a.style.left = '-9999px';
            });
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(link.target);
                if (target instanceof HTMLElement) {
                    target.focus();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            
            this.skipLinksContainer.appendChild(a);
        }
    }

    // ==================== Focus Management ====================

    /**
     * Create focus trap
     */
    createFocusTrap(container: HTMLElement, options?: FocusTrapOptions): FocusTrap {
        const trapId = `trap_${Date.now()}`;
        const trap = new FocusTrap(container, options);
        this.activeFocusTraps.set(trapId, trap);
        return trap;
    }

    /**
     * Release focus trap
     */
    releaseFocusTrap(trap: FocusTrap): void {
        trap.deactivate();
        for (const [id, t] of this.activeFocusTraps) {
            if (t === trap) {
                this.activeFocusTraps.delete(id);
                break;
            }
        }
    }

    /**
     * Focus element
     */
    focusElement(element: HTMLElement | string, announce?: string): void {
        const el = typeof element === 'string' 
            ? document.querySelector(element) as HTMLElement
            : element;
        
        if (el) {
            el.focus();
            if (announce) {
                this.announce(announce);
            }
        }
    }

    /**
     * Focus first focusable element in container
     */
    focusFirst(container: HTMLElement): HTMLElement | null {
        const focusable = this.getFocusableElements(container);
        if (focusable.length > 0) {
            focusable[0].focus();
            return focusable[0];
        }
        return null;
    }

    /**
     * Focus last focusable element in container
     */
    focusLast(container: HTMLElement): HTMLElement | null {
        const focusable = this.getFocusableElements(container);
        if (focusable.length > 0) {
            focusable[focusable.length - 1].focus();
            return focusable[focusable.length - 1];
        }
        return null;
    }

    /**
     * Get all focusable elements in container
     */
    getFocusableElements(container: HTMLElement): HTMLElement[] {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');
        
        return Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    }

    /**
     * Get focus history
     */
    getFocusHistory(): HTMLElement[] {
        return [...this.focusHistory];
    }

    /**
     * Restore previous focus
     */
    restorePreviousFocus(): boolean {
        if (this.focusHistory.length >= 2) {
            const previous = this.focusHistory[this.focusHistory.length - 2];
            if (previous && document.body.contains(previous)) {
                previous.focus();
                return true;
            }
        }
        return false;
    }

    // ==================== Keyboard Navigation ====================

    /**
     * Handle roving tabindex for group
     */
    setupRovingTabindex(container: HTMLElement, selector: string): void {
        const items = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
        
        if (items.length === 0) return;
        
        // Set initial tabindex
        items.forEach((item, index) => {
            item.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
        
        // Handle keyboard navigation
        container.addEventListener('keydown', (e) => {
            const current = document.activeElement as HTMLElement;
            const currentIndex = items.indexOf(current);
            
            if (currentIndex === -1) return;
            
            let newIndex = currentIndex;
            
            switch (e.key) {
                case 'ArrowDown':
                case 'ArrowRight':
                    newIndex = (currentIndex + 1) % items.length;
                    e.preventDefault();
                    break;
                case 'ArrowUp':
                case 'ArrowLeft':
                    newIndex = (currentIndex - 1 + items.length) % items.length;
                    e.preventDefault();
                    break;
                case 'Home':
                    newIndex = 0;
                    e.preventDefault();
                    break;
                case 'End':
                    newIndex = items.length - 1;
                    e.preventDefault();
                    break;
            }
            
            if (newIndex !== currentIndex) {
                items[currentIndex].setAttribute('tabindex', '-1');
                items[newIndex].setAttribute('tabindex', '0');
                items[newIndex].focus();
            }
        });
    }

    // ==================== Audio Cues ====================

    /**
     * Play audio cue
     */
    playAudioCue(cue: 'error' | 'warning' | 'success' | 'notification' | 'focus'): void {
        if (!this.config.audioCues) return;
        
        // Would integrate with audio system
        // For now, just log
        console.debug(`Audio cue: ${cue}`);
    }

    // ==================== Validation ====================

    /**
     * Validate element accessibility
     */
    validateElement(element: HTMLElement): AccessibilityIssue[] {
        const issues: AccessibilityIssue[] = [];
        
        // Check for accessible name
        const hasName = element.hasAttribute('aria-label') ||
                       element.hasAttribute('aria-labelledby') ||
                       element.textContent?.trim();
        
        if (!hasName && this.isInteractiveElement(element)) {
            issues.push({
                type: 'error',
                rule: 'name',
                message: 'Interactive element missing accessible name',
                element
            });
        }
        
        // Check for role
        const tagName = element.tagName.toLowerCase();
        if (['div', 'span'].includes(tagName) && this.hasInteractiveRole(element)) {
            if (!element.hasAttribute('role')) {
                issues.push({
                    type: 'warning',
                    rule: 'role',
                    message: 'Element with interactive behavior missing role',
                    element
                });
            }
        }
        
        // Check for keyboard accessibility
        if (this.isInteractiveElement(element) && !this.isNativelyFocusable(element)) {
            if (!element.hasAttribute('tabindex')) {
                issues.push({
                    type: 'error',
                    rule: 'keyboard',
                    message: 'Interactive element not keyboard accessible',
                    element
                });
            }
        }
        
        // Check for color contrast
        // Would need actual color analysis
        
        return issues;
    }

    /**
     * Check if element is interactive
     */
    private isInteractiveElement(element: HTMLElement): boolean {
        const interactiveTags = ['a', 'button', 'input', 'select', 'textarea'];
        const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab'];
        
        return interactiveTags.includes(element.tagName.toLowerCase()) ||
               interactiveRoles.includes(element.getAttribute('role') || '');
    }

    /**
     * Check if element has interactive role
     */
    private hasInteractiveRole(element: HTMLElement): boolean {
        return element.onclick !== null ||
               element.hasAttribute('onclick') ||
               element.classList.contains('clickable') ||
               element.style.cursor === 'pointer';
    }

    /**
     * Check if element is natively focusable
     */
    private isNativelyFocusable(element: HTMLElement): boolean {
        const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];
        return focusableTags.includes(element.tagName.toLowerCase()) ||
               element.hasAttribute('tabindex');
    }

    // ==================== Screen Reader Detection ====================

    /**
     * Is screen reader active
     */
    isScreenReaderActive(): boolean {
        return this.config.screenReaderMode === ScreenReaderMode.On ||
               (this.config.screenReaderMode === ScreenReaderMode.Auto && this.screenReaderDetected);
    }

    // ==================== Utilities ====================

    /**
     * Generate unique ID
     */
    generateId(prefix: string = 'a11y'): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get statistics
     */
    getStatistics(): {
        landmarksCount: number;
        skipLinksCount: number;
        registeredElements: number;
        activeFocusTraps: number;
        screenReaderDetected: boolean;
    } {
        return {
            landmarksCount: this.landmarks.size,
            skipLinksCount: this.skipLinks.length,
            registeredElements: this.accessibleElements.size,
            activeFocusTraps: this.activeFocusTraps.size,
            screenReaderDetected: this.screenReaderDetected
        };
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.clearAnnouncements();
        
        for (const trap of this.activeFocusTraps.values()) {
            trap.deactivate();
        }
        this.activeFocusTraps.clear();
        
        if (this.liveRegion) {
            this.liveRegion.remove();
        }
        if (this.skipLinksContainer) {
            this.skipLinksContainer.remove();
        }
        
        this.landmarks.clear();
        this.accessibleElements.clear();
        
        this.onConfigChangedEmitter.dispose();
        this.onScreenReaderDetectedEmitter.dispose();
        this.onFocusChangedEmitter.dispose();
        this.onAnnouncementEmitter.dispose();
    }
}

// ==================== Focus Trap ====================

class FocusTrap {
    private container: HTMLElement;
    private options: FocusTrapOptions;
    private active = false;
    private previouslyFocused: HTMLElement | null = null;
    private handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

    constructor(container: HTMLElement, options: FocusTrapOptions = {}) {
        this.container = container;
        this.options = {
            returnFocusOnDeactivate: true,
            escapeDeactivates: true,
            clickOutsideDeactivates: false,
            allowOutsideClick: false,
            ...options
        };
    }

    activate(): void {
        if (this.active) return;
        
        this.active = true;
        this.previouslyFocused = document.activeElement as HTMLElement;
        
        // Focus initial element
        if (this.options.initialFocus) {
            const initial = typeof this.options.initialFocus === 'string'
                ? this.container.querySelector(this.options.initialFocus) as HTMLElement
                : this.options.initialFocus;
            initial?.focus();
        } else {
            const focusable = this.getFocusableElements();
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        }
        
        // Setup trap
        this.handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Tab') {
                this.handleTab(e);
            } else if (e.key === 'Escape' && this.options.escapeDeactivates) {
                this.deactivate();
            }
        };
        
        document.addEventListener('keydown', this.handleKeyDown);
    }

    deactivate(): void {
        if (!this.active) return;
        
        this.active = false;
        
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
        
        if (this.options.returnFocusOnDeactivate && this.previouslyFocused) {
            this.previouslyFocused.focus();
        }
    }

    private handleTab(e: KeyboardEvent): void {
        const focusable = this.getFocusableElements();
        if (focusable.length === 0) return;
        
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }

    private getFocusableElements(): HTMLElement[] {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        
        return Array.from(this.container.querySelectorAll(selector)) as HTMLElement[];
    }
}

// ==================== Types ====================

interface AccessibilityIssue {
    type: 'error' | 'warning' | 'info';
    rule: string;
    message: string;
    element: HTMLElement;
}

// ==================== Export ====================

export default AccessibilitySystem;
