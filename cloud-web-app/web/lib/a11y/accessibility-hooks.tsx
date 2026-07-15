'use client';

import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type RefObject } from 'react';

import { clearAnnouncements } from './accessibility-announcements';
import { FocusTrap } from './accessibility-focus';
import { handleArrowNavigation, useTypeAheadSearch } from './accessibility-keyboard';
import type { ArrowKeyDirection, FocusTrapOptions } from './accessibility.types';

export { useTypeAheadSearch };

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
  }, [containerRef, isActive, options]);
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
