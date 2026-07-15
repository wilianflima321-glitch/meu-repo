import type { RefObject } from 'react';

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

