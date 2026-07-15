'use client';

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from 'react';

import { announce, clearAnnouncements } from './accessibility-announcements';
import { FocusTrap } from './accessibility-focus';
import { useA11yPreferences } from './accessibility-hooks';
import type { A11yContextValue, FocusTrapOptions } from './accessibility.types';

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
      announce('Skipped to main content');
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
