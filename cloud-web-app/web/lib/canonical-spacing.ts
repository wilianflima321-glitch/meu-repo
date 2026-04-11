/**
 * Aethel Canonical Spacing & Typography Constants
 * Source of truth: docs/master/76_AUDITORIA_DEFINITIVA_BENCHMARK_2026-04-11.md
 * 
 * Grid: 4px base
 * Use these with Tailwind classes, not inline styles.
 */

export const CANONICAL_SPACING = {
  cards: {
    padding: 'p-6',           // 24px
    gap: 'gap-4',             // 16px
    margin: 'mb-4',
    radius: 'rounded-2xl',
    border: 'border border-white/8',
  },
  modals: {
    padding: 'p-8',           // 32px
    gap: 'gap-6',             // 24px
    radius: 'rounded-2xl',
  },
  sidebar: {
    itemPadding: 'px-3 py-2',
    gap: 'gap-1',
  },
  toolbar: {
    padding: 'px-4 py-2',
    gap: 'gap-2',
  },
  form: {
    fieldGap: 'gap-4',
    sectionMargin: 'mb-6',
  },
  section: {
    gap: 'gap-8',
    margin: 'mb-8',
  },
  page: {
    padding: 'px-6 py-6',
    gap: 'gap-6',
  },
} as const;

export const CANONICAL_TYPOGRAPHY = {
  display: 'text-4xl font-bold tracking-tight',        // Landing hero
  h1: 'text-2xl font-semibold tracking-tight',         // Page titles
  h2: 'text-xl font-semibold',                         // Section titles
  h3: 'text-lg font-medium',                           // Card titles
  body: 'text-sm font-normal',                         // General text
  bodyLg: 'text-base font-normal',                     // Large body
  meta: 'text-xs font-normal',                         // Labels, dates
  mono: 'text-sm font-mono',                           // Code
  label: 'text-xs font-medium uppercase tracking-wide', // Form labels
} as const;

/**
 * Canonical color classes for semantic use.
 * Always prefer CSS variables over hardcoded hex.
 */
export const CANONICAL_COLORS = {
  bg: {
    primary: 'bg-[var(--aethel-surface-primary)]',
    secondary: 'bg-[var(--aethel-surface-secondary)]',
    tertiary: 'bg-[var(--aethel-surface-tertiary)]',
    hover: 'hover:bg-[var(--aethel-surface-quaternary)]',
  },
  text: {
    primary: 'text-[var(--aethel-text-primary)]',
    secondary: 'text-[var(--aethel-text-secondary)]',
    muted: 'text-[var(--aethel-text-tertiary)]',
    faint: 'text-[var(--aethel-text-quaternary)]',
  },
  border: {
    default: 'border-[var(--aethel-border-primary)]',
    subtle: 'border-[var(--aethel-border-secondary)]',
    focus: 'focus:border-[var(--aethel-border-focus)]',
  },
  status: {
    success: 'text-[var(--aethel-success)]',
    warning: 'text-[var(--aethel-warning)]',
    error: 'text-[var(--aethel-error)]',
    info: 'text-[var(--aethel-info)]',
  },
} as const;

/**
 * Canonical focus ring for accessibility
 */
export const CANONICAL_FOCUS = 
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]';

/**
 * Canonical reduced motion
 */
export const CANONICAL_MOTION = 'motion-safe:transition-all motion-safe:duration-200';

export default {
  spacing: CANONICAL_SPACING,
  typography: CANONICAL_TYPOGRAPHY,
  colors: CANONICAL_COLORS,
  focus: CANONICAL_FOCUS,
  motion: CANONICAL_MOTION,
};
