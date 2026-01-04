/**
 * Aethel Engine - Accessibility (a11y) Utilities
 * 
 * Comprehensive accessibility system with focus management, announcements,
 * keyboard navigation, and screen reader support.
 */

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
  createElement,
  type ReactNode,
  type RefObject,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export interface FocusTrapOptions {
  initialFocus?: HTMLElement | string | RefObject<HTMLElement>;
  finalFocus?: HTMLElement | string | RefObject<HTMLElement>;
  returnFocus?: boolean;
  clickOutsideDeactivates?: boolean;
  escapeDeactivates?: boolean;
  allowOutsideClick?: boolean;
}

export interface A11yContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  clearAnnouncements: () => void;
  setFocusTrap: (container: HTMLElement | null, options?: FocusTrapOptions) => void;
  releaseFocusTrap: () => void;
  skipToMain: () => void;
  reducedMotion: boolean;
  highContrast: boolean;
  screenReaderActive: boolean;
  keyboardNavigating: boolean;
}

export type ArrowKeyDirection = 'horizontal' | 'vertical' | 'both' | 'grid';

// ============================================================================
// Focus Management
// ============================================================================

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const focusableSelectors = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
    'audio[controls]',
    'video[controls]',
    '[contenteditable]:not([contenteditable="false"])',
    'details > summary:first-of-type',
  ].join(', ');

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelectors)
  );

  return elements.filter((el) => {
    // Check visibility
    if (el.offsetParent === null && el.style.position !== 'fixed') return false;
    
    // Check computed style
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    
    return true;
  });
}

/**
 * Get first focusable element
 */
export function getFirstFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[0] || null;
}

/**
 * Get last focusable element
 */
export function getLastFocusable(container: HTMLElement): HTMLElement | null {
  const elements = getFocusableElements(container);
  return elements[elements.length - 1] || null;
}

/**
 * Focus trap implementation
 */
export class FocusTrap {
  private container: HTMLElement;
  private options: FocusTrapOptions;
  private previouslyFocused: HTMLElement | null = null;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleClick: (e: MouseEvent) => void;

  constructor(container: HTMLElement, options: FocusTrapOptions = {}) {
    this.container = container;
    this.options = {
      returnFocus: true,
      escapeDeactivates: true,
      clickOutsideDeactivates: false,
      allowOutsideClick: false,
      ...options,
    };

    this.handleKeyDown = this.onKeyDown.bind(this);
    this.handleClick = this.onClick.bind(this);
  }

  activate(): void {
    // Store currently focused element
    this.previouslyFocused = document.activeElement as HTMLElement;

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown);
    if (this.options.clickOutsideDeactivates || !this.options.allowOutsideClick) {
      document.addEventListener('click', this.handleClick, true);
    }

    // Focus initial element
    this.focusInitial();
  }

  deactivate(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('click', this.handleClick, true);

    // Return focus
    if (this.options.returnFocus && this.previouslyFocused) {
      this.previouslyFocused.focus();
    } else if (this.options.finalFocus) {
      this.resolveElement(this.options.finalFocus)?.focus();
    }
  }

  private focusInitial(): void {
    const initial = this.options.initialFocus
      ? this.resolveElement(this.options.initialFocus)
      : getFirstFocusable(this.container);

    if (initial) {
      initial.focus();
    } else {
      this.container.focus();
    }
  }

  private resolveElement(
    ref: HTMLElement | string | RefObject<HTMLElement>
  ): HTMLElement | null {
    if (typeof ref === 'string') {
      return document.querySelector(ref);
    }
    if ('current' in ref) {
      return ref.current;
    }
    return ref;
  }

  private onKeyDown(e: KeyboardEvent): void {
    // Handle Escape
    if (e.key === 'Escape' && this.options.escapeDeactivates) {
      e.preventDefault();
      this.deactivate();
      return;
    }

    // Handle Tab
    if (e.key !== 'Tab') return;

    const focusables = getFocusableElements(this.container);
    if (focusables.length === 0) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  private onClick(e: MouseEvent): void {
    if (!this.container.contains(e.target as Node)) {
      if (this.options.clickOutsideDeactivates) {
        this.deactivate();
      } else if (!this.options.allowOutsideClick) {
        e.preventDefault();
        e.stopPropagation();
        this.focusInitial();
      }
    }
  }
}

// ============================================================================
// Keyboard Navigation
// ============================================================================

/**
 * Handle arrow key navigation in a list
 */
export function handleArrowNavigation(
  e: ReactKeyboardEvent | KeyboardEvent,
  currentIndex: number,
  totalItems: number,
  direction: ArrowKeyDirection = 'vertical',
  columnsInGrid?: number,
  onNavigate?: (newIndex: number) => void
): number {
  let newIndex = currentIndex;

  const isVertical = direction === 'vertical' || direction === 'both' || direction === 'grid';
  const isHorizontal = direction === 'horizontal' || direction === 'both' || direction === 'grid';
  const isGrid = direction === 'grid' && columnsInGrid;

  switch (e.key) {
    case 'ArrowUp':
      if (isVertical) {
        e.preventDefault();
        if (isGrid) {
          newIndex = currentIndex - columnsInGrid;
          if (newIndex < 0) {
            // Wrap to last row
            const col = currentIndex % columnsInGrid;
            const lastRowStart = Math.floor((totalItems - 1) / columnsInGrid) * columnsInGrid;
            newIndex = Math.min(lastRowStart + col, totalItems - 1);
          }
        } else {
          newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
        }
      }
      break;

    case 'ArrowDown':
      if (isVertical) {
        e.preventDefault();
        if (isGrid) {
          newIndex = currentIndex + columnsInGrid;
          if (newIndex >= totalItems) {
            // Wrap to first row
            newIndex = currentIndex % columnsInGrid;
          }
        } else {
          newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
        }
      }
      break;

    case 'ArrowLeft':
      if (isHorizontal) {
        e.preventDefault();
        newIndex = currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
      }
      break;

    case 'ArrowRight':
      if (isHorizontal) {
        e.preventDefault();
        newIndex = currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
      }
      break;

    case 'Home':
      e.preventDefault();
      newIndex = 0;
      break;

    case 'End':
      e.preventDefault();
      newIndex = totalItems - 1;
      break;
  }

  if (newIndex !== currentIndex) {
    onNavigate?.(newIndex);
  }

  return newIndex;
}

/**
 * Handle type-ahead search in a list
 */
export function useTypeAheadSearch(
  items: Array<{ label: string }>,
  onSelect: (index: number) => void,
  timeout: number = 500
): (char: string) => void {
  const searchBuffer = useRef('');
  const searchTimeout = useRef<NodeJS.Timeout>();

  return useCallback(
    (char: string) => {
      // Only handle single printable characters
      if (char.length !== 1 || !/[\w\s]/.test(char)) return;

      // Add to search buffer
      searchBuffer.current += char.toLowerCase();

      // Clear previous timeout
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      // Set new timeout to clear buffer
      searchTimeout.current = setTimeout(() => {
        searchBuffer.current = '';
      }, timeout);

      // Find matching item
      const search = searchBuffer.current;
      const index = items.findIndex((item) =>
        item.label.toLowerCase().startsWith(search)
      );

      if (index !== -1) {
        onSelect(index);
      }
    },
    [items, onSelect, timeout]
  );
}

// ============================================================================
// Screen Reader Announcements
// ============================================================================

/**
 * Create live region for announcements
 */
function createLiveRegion(id: string, ariaLive: 'polite' | 'assertive'): HTMLDivElement {
  let region = document.getElementById(id) as HTMLDivElement;

  if (!region) {
    region = document.createElement('div');
    region.id = id;
    region.setAttribute('role', 'status');
    region.setAttribute('aria-live', ariaLive);
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    region.style.cssText = `
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
    document.body.appendChild(region);
  }

  return region;
}

let politeRegion: HTMLDivElement | null = null;
let assertiveRegion: HTMLDivElement | null = null;

/**
 * Announce message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  if (typeof document === 'undefined') return;

  // Initialize regions
  if (!politeRegion) {
    politeRegion = createLiveRegion('a11y-announcer-polite', 'polite');
  }
  if (!assertiveRegion) {
    assertiveRegion = createLiveRegion('a11y-announcer-assertive', 'assertive');
  }

  const region = priority === 'assertive' ? assertiveRegion : politeRegion;

  // Clear and set new message
  region.textContent = '';
  
  // Use setTimeout to ensure the change is detected
  setTimeout(() => {
    region.textContent = message;
  }, 50);
}

/**
 * Clear all announcements
 */
export function clearAnnouncements(): void {
  if (politeRegion) politeRegion.textContent = '';
  if (assertiveRegion) assertiveRegion.textContent = '';
}

// ============================================================================
// Accessibility Hooks
// ============================================================================

/**
 * Hook to detect user preferences
 */
export function useA11yPreferences() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [screenReaderActive, setScreenReaderActive] = useState(false);
  const [keyboardNavigating, setKeyboardNavigating] = useState(false);

  useEffect(() => {
    // Reduced motion
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(motionQuery.matches);
    
    const handleMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    motionQuery.addEventListener('change', handleMotionChange);

    // High contrast
    const contrastQuery = window.matchMedia('(prefers-contrast: more)');
    setHighContrast(contrastQuery.matches);
    
    const handleContrastChange = (e: MediaQueryListEvent) => setHighContrast(e.matches);
    contrastQuery.addEventListener('change', handleContrastChange);

    // Detect keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        setKeyboardNavigating(true);
        document.body.classList.add('keyboard-navigating');
      }
    };

    const handleMouseDown = () => {
      setKeyboardNavigating(false);
      document.body.classList.remove('keyboard-navigating');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);

    // Screen reader detection (heuristic)
    const checkScreenReader = () => {
      // Check for common screen reader indicators
      const hasAriaLive = document.querySelector('[aria-live]') !== null;
      const hasScreenReaderText = document.querySelector('.sr-only, .visually-hidden') !== null;
      setScreenReaderActive(hasAriaLive || hasScreenReaderText);
    };

    checkScreenReader();

    return () => {
      motionQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, []);

  return { reducedMotion, highContrast, screenReaderActive, keyboardNavigating };
}

/**
 * Hook for focus trap
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement>,
  isActive: boolean,
  options?: FocusTrapOptions
): void {
  const trapRef = useRef<FocusTrap | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    if (isActive) {
      trapRef.current = new FocusTrap(containerRef.current, options);
      trapRef.current.activate();
    } else if (trapRef.current) {
      trapRef.current.deactivate();
      trapRef.current = null;
    }

    return () => {
      trapRef.current?.deactivate();
    };
  }, [isActive, options]);
}

/**
 * Hook for roving tabindex
 */
export function useRovingTabIndex(
  itemRefs: RefObject<(HTMLElement | null)[]>,
  activeIndex: number,
  direction: ArrowKeyDirection = 'vertical'
): {
  getTabIndex: (index: number) => number;
  handleKeyDown: (e: ReactKeyboardEvent, index: number) => void;
  setActiveIndex: (index: number) => void;
} {
  const [focusedIndex, setFocusedIndex] = useState(activeIndex);

  const getTabIndex = useCallback(
    (index: number) => (index === focusedIndex ? 0 : -1),
    [focusedIndex]
  );

  const handleKeyDown = useCallback(
    (e: ReactKeyboardEvent, currentIndex: number) => {
      const items = itemRefs.current;
      if (!items) return;

      const totalItems = items.filter(Boolean).length;
      const newIndex = handleArrowNavigation(
        e,
        currentIndex,
        totalItems,
        direction,
        undefined,
        (idx) => {
          setFocusedIndex(idx);
          items[idx]?.focus();
        }
      );

      if (newIndex !== currentIndex) {
        items[newIndex]?.focus();
      }
    },
    [direction, itemRefs]
  );

  return {
    getTabIndex,
    handleKeyDown,
    setActiveIndex: setFocusedIndex,
  };
}

/**
 * Hook for aria-describedby
 */
export function useAriaDescribedBy(description: string | undefined): string | undefined {
  const idRef = useRef<string>(`desc-${Math.random().toString(36).substr(2, 9)}`);
  const [hasElement, setHasElement] = useState(false);

  useEffect(() => {
    if (!description) return;

    // Create hidden description element
    const el = document.createElement('span');
    el.id = idRef.current;
    el.className = 'sr-only';
    el.textContent = description;
    document.body.appendChild(el);
    setHasElement(true);

    return () => {
      el.remove();
      setHasElement(false);
    };
  }, [description]);

  return hasElement ? idRef.current : undefined;
}

// ============================================================================
// A11y Context
// ============================================================================

const A11yContext = createContext<A11yContextValue | null>(null);

export const useA11y = () => {
  const context = useContext(A11yContext);
  if (!context) {
    throw new Error('useA11y must be used within A11yProvider');
  }
  return context;
};

/**
 * A11y Provider Component
 */
export function A11yProvider({ children }: { children: ReactNode }) {
  const trapRef = useRef<FocusTrap | null>(null);
  const preferences = useA11yPreferences();

  const setFocusTrap = useCallback(
    (container: HTMLElement | null, options?: FocusTrapOptions) => {
      // Release existing trap
      trapRef.current?.deactivate();
      trapRef.current = null;

      if (container) {
        trapRef.current = new FocusTrap(container, options);
        trapRef.current.activate();
      }
    },
    []
  );

  const releaseFocusTrap = useCallback(() => {
    trapRef.current?.deactivate();
    trapRef.current = null;
  }, []);

  const skipToMain = useCallback(() => {
    const main = document.querySelector('main, [role="main"], #main-content');
    if (main instanceof HTMLElement) {
      main.tabIndex = -1;
      main.focus();
      announce('Navegado para o conteúdo principal');
    }
  }, []);

  const value = useMemo<A11yContextValue>(
    () => ({
      announce,
      clearAnnouncements,
      setFocusTrap,
      releaseFocusTrap,
      skipToMain,
      ...preferences,
    }),
    [setFocusTrap, releaseFocusTrap, skipToMain, preferences]
  );

  return (
    <A11yContext.Provider value={value}>
      {children}
    </A11yContext.Provider>
  );
}

// ============================================================================
// Accessibility Components
// ============================================================================

/**
 * Skip Links Component
 */
export function SkipLinks() {
  return (
    <div className="skip-links">
      <a
        href="#main-content"
        className="
          sr-only focus:not-sr-only
          fixed top-0 left-0 z-[9999]
          px-4 py-2 bg-blue-600 text-white
          focus:outline-none focus:ring-2 focus:ring-blue-400
        "
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById('main-content') || 
                       document.querySelector('main');
          if (main) {
            main.tabIndex = -1;
            main.focus();
          }
        }}
      >
        Pular para o conteúdo principal
      </a>
      <a
        href="#navigation"
        className="
          sr-only focus:not-sr-only
          fixed top-0 left-0 z-[9999]
          px-4 py-2 bg-blue-600 text-white
          focus:outline-none focus:ring-2 focus:ring-blue-400
        "
        onClick={(e) => {
          e.preventDefault();
          const nav = document.getElementById('navigation') || 
                      document.querySelector('nav');
          if (nav) {
            nav.tabIndex = -1;
            nav.focus();
          }
        }}
      >
        Pular para a navegação
      </a>
    </div>
  );
}

/**
 * Visually Hidden Component (for screen readers only)
 */
export function VisuallyHidden({
  children,
  as: tag = 'span',
}: {
  children: ReactNode;
  as?: 'span' | 'div' | 'p';
}) {
  return createElement(
    tag,
    {
      className: 'sr-only',
      style: {
        position: 'absolute' as const,
        width: '1px',
        height: '1px',
        padding: '0',
        margin: '-1px',
        overflow: 'hidden' as const,
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap' as const,
        border: '0',
      },
    },
    children
  );
}

/**
 * Live Region Component
 */
export function LiveRegion({
  children,
  priority = 'polite',
  atomic = true,
  relevant = 'additions text',
}: {
  children: ReactNode;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
  relevant?: 'additions' | 'additions text' | 'all' | 'removals' | 'removals additions' | 'removals text' | 'text' | 'text additions' | 'text removals';
}) {
  return createElement(
    'div',
    {
      role: 'status',
      'aria-live': priority,
      'aria-atomic': atomic,
      'aria-relevant': relevant,
      className: 'sr-only',
    },
    children
  );
}

// ============================================================================
// ARIA Helpers
// ============================================================================

/**
 * Generate ARIA props for a listbox
 */
export function getListboxProps(
  selectedIndex: number,
  options: { multiselectable?: boolean; label?: string; labelledBy?: string }
) {
  return {
    role: 'listbox' as const,
    'aria-activedescendant': `option-${selectedIndex}`,
    'aria-multiselectable': options.multiselectable,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    tabIndex: 0,
  };
}

/**
 * Generate ARIA props for a listbox option
 */
export function getOptionProps(
  index: number,
  isSelected: boolean,
  isDisabled?: boolean
) {
  return {
    id: `option-${index}`,
    role: 'option' as const,
    'aria-selected': isSelected,
    'aria-disabled': isDisabled,
    tabIndex: -1,
  };
}

/**
 * Generate ARIA props for a menu
 */
export function getMenuProps(options: { label?: string; labelledBy?: string }) {
  return {
    role: 'menu' as const,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    tabIndex: -1,
  };
}

/**
 * Generate ARIA props for a menu item
 */
export function getMenuItemProps(isDisabled?: boolean) {
  return {
    role: 'menuitem' as const,
    'aria-disabled': isDisabled,
    tabIndex: -1,
  };
}

/**
 * Generate ARIA props for a tree
 */
export function getTreeProps(options: { label?: string; labelledBy?: string; multiselectable?: boolean }) {
  return {
    role: 'tree' as const,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    'aria-multiselectable': options.multiselectable,
  };
}

/**
 * Generate ARIA props for a tree item
 */
export function getTreeItemProps(
  level: number,
  expanded?: boolean,
  hasChildren?: boolean,
  isSelected?: boolean
) {
  return {
    role: 'treeitem' as const,
    'aria-level': level,
    'aria-expanded': hasChildren ? expanded : undefined,
    'aria-selected': isSelected,
    tabIndex: -1,
  };
}

/**
 * Generate ARIA props for a tab list
 */
export function getTabListProps(options: { label?: string; labelledBy?: string; orientation?: 'horizontal' | 'vertical' }) {
  return {
    role: 'tablist' as const,
    'aria-label': options.label,
    'aria-labelledby': options.labelledBy,
    'aria-orientation': options.orientation || 'horizontal',
  };
}

/**
 * Generate ARIA props for a tab
 */
export function getTabProps(
  index: number,
  panelId: string,
  isSelected: boolean,
  isDisabled?: boolean
) {
  return {
    id: `tab-${index}`,
    role: 'tab' as const,
    'aria-selected': isSelected,
    'aria-controls': panelId,
    'aria-disabled': isDisabled,
    tabIndex: isSelected ? 0 : -1,
  };
}

/**
 * Generate ARIA props for a tab panel
 */
export function getTabPanelProps(index: number, tabId: string, isSelected: boolean) {
  return {
    id: `tabpanel-${index}`,
    role: 'tabpanel' as const,
    'aria-labelledby': tabId,
    tabIndex: 0,
    hidden: !isSelected,
  };
}

export default {
  announce,
  clearAnnouncements,
  getFocusableElements,
  getFirstFocusable,
  getLastFocusable,
  handleArrowNavigation,
  FocusTrap,
  A11yProvider,
  useA11y,
  useA11yPreferences,
  useFocusTrap,
  useRovingTabIndex,
  useAriaDescribedBy,
  useTypeAheadSearch,
  SkipLinks,
  VisuallyHidden,
  LiveRegion,
  getListboxProps,
  getOptionProps,
  getMenuProps,
  getMenuItemProps,
  getTreeProps,
  getTreeItemProps,
  getTabListProps,
  getTabProps,
  getTabPanelProps,
};
