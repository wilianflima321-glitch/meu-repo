import type { RefObject } from 'react';

import type { FocusTrapOptions } from './accessibility.types';

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
