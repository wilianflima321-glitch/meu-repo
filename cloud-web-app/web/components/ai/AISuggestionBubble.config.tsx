import type { ComponentType } from 'react';
import { AlertCircle, Code, Lightbulb, Palette, Sparkles, Zap } from 'lucide-react';

import type { SuggestionPosition, SuggestionType } from './AISuggestionBubble.types';

// CONSTANTS
// ============================================================================

export const TYPE_CONFIG: Record<SuggestionType, {
  icon: ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  pulseColor: string;
  label: string;
}> = {
  code: {
    icon: Code,
    color: 'text-[var(--aethel-info)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]',
    pulseColor: 'bg-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]',
    label: 'Codigo',
  },
  design: {
    icon: Palette,
    color: 'text-[var(--aethel-primary)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]',
    pulseColor: 'bg-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)]',
    label: 'Design',
  },
  performance: {
    icon: Zap,
    color: 'text-[var(--aethel-warning-light)]',
    bgColor: 'bg-[var(--aethel-warning)]/10',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
    pulseColor: 'bg-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)]',
    label: 'Performance',
  },
  ux: {
    icon: Sparkles,
    color: 'text-[var(--aethel-secondary)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-secondary)_12%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-secondary)_35%,transparent)]',
    pulseColor: 'bg-[color-mix(in_srgb,var(--aethel-secondary)_28%,transparent)]',
    label: 'UX',
  },
  error: {
    icon: AlertCircle,
    color: 'text-[var(--aethel-error)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)]',
    pulseColor: 'bg-[color-mix(in_srgb,var(--aethel-error)_28%,transparent)]',
    label: 'Error',
  },
  tip: {
    icon: Lightbulb,
    color: 'text-[var(--aethel-success)]',
    bgColor: 'bg-[color-mix(in_srgb,var(--aethel-success)_12%,transparent)]',
    borderColor: 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]',
    pulseColor: 'bg-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)]',
    label: 'Dica',
  },
};

export const POSITION_STYLES: Record<SuggestionPosition, {
  initial: { x: number; y: number; scale: number };
  arrow: string;
}> = {
  'top': {
    initial: { x: 0, y: 10, scale: 0.95 },
    arrow: 'bottom-[-6px] left-1/2 -translate-x-1/2 border-t-[var(--aethel-surface-secondary)] border-l-transparent border-r-transparent border-b-transparent border-t-[6px] border-l-[6px] border-r-[6px]',
  },
  'bottom': {
    initial: { x: 0, y: -10, scale: 0.95 },
    arrow: 'top-[-6px] left-1/2 -translate-x-1/2 border-b-[var(--aethel-surface-secondary)] border-l-transparent border-r-transparent border-t-transparent border-b-[6px] border-l-[6px] border-r-[6px]',
  },
  'left': {
    initial: { x: 10, y: 0, scale: 0.95 },
    arrow: 'right-[-6px] top-1/2 -translate-y-1/2 border-l-[var(--aethel-surface-secondary)] border-t-transparent border-b-transparent border-r-transparent border-l-[6px] border-t-[6px] border-b-[6px]',
  },
  'right': {
    initial: { x: -10, y: 0, scale: 0.95 },
    arrow: 'left-[-6px] top-1/2 -translate-y-1/2 border-r-[var(--aethel-surface-secondary)] border-t-transparent border-b-transparent border-l-transparent border-r-[6px] border-t-[6px] border-b-[6px]',
  },
  'top-left': {
    initial: { x: 10, y: 10, scale: 0.95 },
    arrow: 'bottom-[-6px] right-4 border-t-[var(--aethel-surface-secondary)] border-l-transparent border-r-transparent border-b-transparent border-t-[6px] border-l-[6px] border-r-[6px]',
  },
  'top-right': {
    initial: { x: -10, y: 10, scale: 0.95 },
    arrow: 'bottom-[-6px] left-4 border-t-[var(--aethel-surface-secondary)] border-l-transparent border-r-transparent border-b-transparent border-t-[6px] border-l-[6px] border-r-[6px]',
  },
  'bottom-left': {
    initial: { x: 10, y: -10, scale: 0.95 },
    arrow: 'top-[-6px] right-4 border-b-[var(--aethel-surface-secondary)] border-l-transparent border-r-transparent border-t-transparent border-b-[6px] border-l-[6px] border-r-[6px]',
  },
  'bottom-right': {
    initial: { x: -10, y: -10, scale: 0.95 },
    arrow: 'top-[-6px] left-4 border-b-[var(--aethel-surface-secondary)] border-l-transparent border-r-transparent border-t-transparent border-b-[6px] border-l-[6px] border-r-[6px]',
  },
};

// ============================================================================
