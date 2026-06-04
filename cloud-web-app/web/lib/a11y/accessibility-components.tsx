'use client';

import { createElement, type ReactNode } from 'react';

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
          px-4 py-2 bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--aethel-primary-light)]
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
        Skip to main content
      </a>
      <a
        href="#navigation"
        className="
          sr-only focus:not-sr-only
          fixed top-0 left-0 z-[9999]
          px-4 py-2 bg-[var(--aethel-primary)] text-[var(--aethel-text-primary)]
          focus:outline-none focus:ring-2 focus:ring-[var(--aethel-primary-light)]
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
        Skip to navigation
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
