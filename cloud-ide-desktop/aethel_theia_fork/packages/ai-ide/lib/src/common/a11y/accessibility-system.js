"use strict";
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
exports.AccessibilitySystem = exports.MotionPreference = exports.ContrastMode = exports.ScreenReaderMode = exports.A11yLevel = void 0;
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
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Accessibility Types ====================
/**
 * Accessibility level
 */
var A11yLevel;
(function (A11yLevel) {
    A11yLevel["A"] = "A";
    A11yLevel["AA"] = "AA";
    A11yLevel["AAA"] = "AAA"; // Maximum
})(A11yLevel || (exports.A11yLevel = A11yLevel = {}));
/**
 * Screen reader mode
 */
var ScreenReaderMode;
(function (ScreenReaderMode) {
    ScreenReaderMode["Off"] = "off";
    ScreenReaderMode["Auto"] = "auto";
    ScreenReaderMode["On"] = "on";
})(ScreenReaderMode || (exports.ScreenReaderMode = ScreenReaderMode = {}));
/**
 * Contrast mode
 */
var ContrastMode;
(function (ContrastMode) {
    ContrastMode["Normal"] = "normal";
    ContrastMode["High"] = "high";
    ContrastMode["HighInverted"] = "high-inverted";
})(ContrastMode || (exports.ContrastMode = ContrastMode = {}));
/**
 * Motion preference
 */
var MotionPreference;
(function (MotionPreference) {
    MotionPreference["NoPreference"] = "no-preference";
    MotionPreference["Reduce"] = "reduce";
})(MotionPreference || (exports.MotionPreference = MotionPreference = {}));
// ==================== Main Accessibility System ====================
let AccessibilitySystem = class AccessibilitySystem {
    constructor() {
        // Configuration
        this.config = {
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
        this.screenReaderDetected = false;
        this.announceQueue = [];
        this.announceTimer = null;
        this.focusedElement = null;
        this.focusHistory = [];
        this.activeFocusTraps = new Map();
        // Elements
        this.liveRegion = null;
        this.skipLinksContainer = null;
        // Registry
        this.landmarks = new Map();
        this.skipLinks = [];
        this.accessibleElements = new Map();
        // Events
        this.onConfigChangedEmitter = new Emitter();
        this.onConfigChanged = this.onConfigChangedEmitter.event;
        this.onScreenReaderDetectedEmitter = new Emitter();
        this.onScreenReaderDetected = this.onScreenReaderDetectedEmitter.event;
        this.onFocusChangedEmitter = new Emitter();
        this.onFocusChanged = this.onFocusChangedEmitter.event;
        this.onAnnouncementEmitter = new Emitter();
        this.onAnnouncement = this.onAnnouncementEmitter.event;
        this.initialize();
    }
    // ==================== Initialization ====================
    /**
     * Initialize accessibility system
     */
    initialize() {
        this.detectSystemPreferences();
        this.setupLiveRegion();
        this.setupSkipLinks();
        this.setupFocusTracking();
        this.detectScreenReader();
    }
    /**
     * Detect system preferences
     */
    detectSystemPreferences() {
        if (typeof window === 'undefined')
            return;
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
    setupLiveRegion() {
        if (typeof document === 'undefined')
            return;
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
    setupSkipLinks() {
        if (typeof document === 'undefined')
            return;
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
    setupFocusTracking() {
        if (typeof document === 'undefined')
            return;
        document.addEventListener('focusin', (e) => {
            const target = e.target;
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
    detectScreenReader() {
        if (typeof window === 'undefined')
            return;
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
            try {
                return check();
            }
            catch {
                return false;
            }
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
    updateConfig(property, value) {
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
    applyConfigChange(property, value) {
        if (typeof document === 'undefined')
            return;
        switch (property) {
            case 'contrastMode':
                this.applyContrastMode(value);
                break;
            case 'motionPreference':
                this.applyMotionPreference(value);
                break;
            case 'fontScale':
                this.applyFontScale(value);
                break;
            case 'focusHighlight':
                this.applyFocusHighlight(value);
                break;
        }
    }
    /**
     * Apply contrast mode
     */
    applyContrastMode(mode) {
        document.body.classList.remove('a11y-high-contrast', 'a11y-high-contrast-inverted');
        if (mode === ContrastMode.High) {
            document.body.classList.add('a11y-high-contrast');
        }
        else if (mode === ContrastMode.HighInverted) {
            document.body.classList.add('a11y-high-contrast-inverted');
        }
    }
    /**
     * Apply motion preference
     */
    applyMotionPreference(preference) {
        document.body.classList.toggle('a11y-reduced-motion', preference === MotionPreference.Reduce);
    }
    /**
     * Apply font scale
     */
    applyFontScale(scale) {
        document.documentElement.style.setProperty('--a11y-font-scale', scale.toString());
    }
    /**
     * Apply focus highlight
     */
    applyFocusHighlight(enabled) {
        document.body.classList.toggle('a11y-focus-highlight', enabled);
    }
    /**
     * Get configuration
     */
    getConfig() {
        return { ...this.config };
    }
    // ==================== Announcements ====================
    /**
     * Announce message to screen reader
     */
    announce(message, priority = 'polite') {
        const announcement = {
            id: `announce_${Date.now()}`,
            message,
            priority,
            timestamp: Date.now()
        };
        if (priority === 'assertive') {
            // Announce immediately
            this.doAnnounce(announcement);
        }
        else {
            // Queue announcement
            this.announceQueue.push(announcement);
            this.scheduleAnnounce();
        }
        this.onAnnouncementEmitter.fire(announcement);
    }
    /**
     * Schedule announcement processing
     */
    scheduleAnnounce() {
        if (this.announceTimer)
            return;
        this.announceTimer = setTimeout(() => {
            this.processAnnounceQueue();
            this.announceTimer = null;
        }, this.config.announceDelay);
    }
    /**
     * Process announcement queue
     */
    processAnnounceQueue() {
        if (this.announceQueue.length === 0)
            return;
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
    doAnnounce(announcement) {
        if (!this.liveRegion)
            return;
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
    clearAnnouncements() {
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
    setAriaAttributes(element, info) {
        if (info.role)
            element.setAttribute('role', info.role);
        if (info.label)
            element.setAttribute('aria-label', info.label);
        if (info.description)
            element.setAttribute('aria-description', info.description);
        if (info.live)
            element.setAttribute('aria-live', info.live);
        if (info.expanded !== undefined)
            element.setAttribute('aria-expanded', info.expanded.toString());
        if (info.selected !== undefined)
            element.setAttribute('aria-selected', info.selected.toString());
        if (info.checked !== undefined)
            element.setAttribute('aria-checked', info.checked.toString());
        if (info.disabled !== undefined)
            element.setAttribute('aria-disabled', info.disabled.toString());
        if (info.hidden !== undefined)
            element.setAttribute('aria-hidden', info.hidden.toString());
        if (info.level !== undefined)
            element.setAttribute('aria-level', info.level.toString());
        if (info.valueMin !== undefined)
            element.setAttribute('aria-valuemin', info.valueMin.toString());
        if (info.valueMax !== undefined)
            element.setAttribute('aria-valuemax', info.valueMax.toString());
        if (info.valueNow !== undefined)
            element.setAttribute('aria-valuenow', info.valueNow.toString());
        if (info.valueText)
            element.setAttribute('aria-valuetext', info.valueText);
        if (info.controls)
            element.setAttribute('aria-controls', info.controls);
        if (info.owns)
            element.setAttribute('aria-owns', info.owns);
        if (info.labelledBy)
            element.setAttribute('aria-labelledby', info.labelledBy);
        if (info.describedBy)
            element.setAttribute('aria-describedby', info.describedBy);
    }
    /**
     * Register accessible element
     */
    registerAccessibleElement(id, info) {
        this.accessibleElements.set(id, info);
        this.setAriaAttributes(info.element, info);
    }
    /**
     * Unregister accessible element
     */
    unregisterAccessibleElement(id) {
        this.accessibleElements.delete(id);
    }
    /**
     * Update accessible element
     */
    updateAccessibleElement(id, updates) {
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
    registerLandmark(landmark) {
        this.landmarks.set(landmark.id, landmark);
        landmark.element.setAttribute('role', landmark.role);
        landmark.element.setAttribute('aria-label', landmark.label);
    }
    /**
     * Unregister landmark
     */
    unregisterLandmark(id) {
        this.landmarks.delete(id);
    }
    /**
     * Get all landmarks
     */
    getLandmarks() {
        return Array.from(this.landmarks.values());
    }
    /**
     * Navigate to landmark
     */
    navigateToLandmark(role) {
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
    navigateToNextLandmark() {
        const landmarks = this.getLandmarks();
        if (landmarks.length === 0)
            return false;
        const currentIndex = this.focusedElement
            ? landmarks.findIndex(l => l.element.contains(this.focusedElement))
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
    addSkipLink(id, label, target) {
        this.skipLinks.push({ id, label, target });
        this.renderSkipLinks();
    }
    /**
     * Remove skip link
     */
    removeSkipLink(id) {
        const index = this.skipLinks.findIndex(l => l.id === id);
        if (index !== -1) {
            this.skipLinks.splice(index, 1);
            this.renderSkipLinks();
        }
    }
    /**
     * Render skip links
     */
    renderSkipLinks() {
        if (!this.skipLinksContainer)
            return;
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
    createFocusTrap(container, options) {
        const trapId = `trap_${Date.now()}`;
        const trap = new FocusTrap(container, options);
        this.activeFocusTraps.set(trapId, trap);
        return trap;
    }
    /**
     * Release focus trap
     */
    releaseFocusTrap(trap) {
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
    focusElement(element, announce) {
        const el = typeof element === 'string'
            ? document.querySelector(element)
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
    focusFirst(container) {
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
    focusLast(container) {
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
    getFocusableElements(container) {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            '[contenteditable="true"]'
        ].join(', ');
        return Array.from(container.querySelectorAll(selector));
    }
    /**
     * Get focus history
     */
    getFocusHistory() {
        return [...this.focusHistory];
    }
    /**
     * Restore previous focus
     */
    restorePreviousFocus() {
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
    setupRovingTabindex(container, selector) {
        const items = Array.from(container.querySelectorAll(selector));
        if (items.length === 0)
            return;
        // Set initial tabindex
        items.forEach((item, index) => {
            item.setAttribute('tabindex', index === 0 ? '0' : '-1');
        });
        // Handle keyboard navigation
        container.addEventListener('keydown', (e) => {
            const current = document.activeElement;
            const currentIndex = items.indexOf(current);
            if (currentIndex === -1)
                return;
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
    playAudioCue(cue) {
        if (!this.config.audioCues)
            return;
        // Would integrate with audio system
        // For now, just log
        console.debug(`Audio cue: ${cue}`);
    }
    // ==================== Validation ====================
    /**
     * Validate element accessibility
     */
    validateElement(element) {
        const issues = [];
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
    isInteractiveElement(element) {
        const interactiveTags = ['a', 'button', 'input', 'select', 'textarea'];
        const interactiveRoles = ['button', 'link', 'checkbox', 'radio', 'menuitem', 'tab'];
        return interactiveTags.includes(element.tagName.toLowerCase()) ||
            interactiveRoles.includes(element.getAttribute('role') || '');
    }
    /**
     * Check if element has interactive role
     */
    hasInteractiveRole(element) {
        return element.onclick !== null ||
            element.hasAttribute('onclick') ||
            element.classList.contains('clickable') ||
            element.style.cursor === 'pointer';
    }
    /**
     * Check if element is natively focusable
     */
    isNativelyFocusable(element) {
        const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];
        return focusableTags.includes(element.tagName.toLowerCase()) ||
            element.hasAttribute('tabindex');
    }
    // ==================== Screen Reader Detection ====================
    /**
     * Is screen reader active
     */
    isScreenReaderActive() {
        return this.config.screenReaderMode === ScreenReaderMode.On ||
            (this.config.screenReaderMode === ScreenReaderMode.Auto && this.screenReaderDetected);
    }
    // ==================== Utilities ====================
    /**
     * Generate unique ID
     */
    generateId(prefix = 'a11y') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Get statistics
     */
    getStatistics() {
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
    dispose() {
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
};
exports.AccessibilitySystem = AccessibilitySystem;
exports.AccessibilitySystem = AccessibilitySystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], AccessibilitySystem);
// ==================== Focus Trap ====================
class FocusTrap {
    constructor(container, options = {}) {
        this.active = false;
        this.previouslyFocused = null;
        this.handleKeyDown = null;
        this.container = container;
        this.options = {
            returnFocusOnDeactivate: true,
            escapeDeactivates: true,
            clickOutsideDeactivates: false,
            allowOutsideClick: false,
            ...options
        };
    }
    activate() {
        if (this.active)
            return;
        this.active = true;
        this.previouslyFocused = document.activeElement;
        // Focus initial element
        if (this.options.initialFocus) {
            const initial = typeof this.options.initialFocus === 'string'
                ? this.container.querySelector(this.options.initialFocus)
                : this.options.initialFocus;
            initial?.focus();
        }
        else {
            const focusable = this.getFocusableElements();
            if (focusable.length > 0) {
                focusable[0].focus();
            }
        }
        // Setup trap
        this.handleKeyDown = (e) => {
            if (e.key === 'Tab') {
                this.handleTab(e);
            }
            else if (e.key === 'Escape' && this.options.escapeDeactivates) {
                this.deactivate();
            }
        };
        document.addEventListener('keydown', this.handleKeyDown);
    }
    deactivate() {
        if (!this.active)
            return;
        this.active = false;
        if (this.handleKeyDown) {
            document.removeEventListener('keydown', this.handleKeyDown);
        }
        if (this.options.returnFocusOnDeactivate && this.previouslyFocused) {
            this.previouslyFocused.focus();
        }
    }
    handleTab(e) {
        const focusable = this.getFocusableElements();
        if (focusable.length === 0)
            return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        }
        else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    }
    getFocusableElements() {
        const selector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])'
        ].join(', ');
        return Array.from(this.container.querySelectorAll(selector));
    }
}
// ==================== Export ====================
exports.default = AccessibilitySystem;
