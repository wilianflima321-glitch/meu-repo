import type { ComponentType } from 'react';
import {
  Brain,
  CheckCircle2,
  Code2,
  FileCode,
  Lightbulb,
  Search,
  Wand2,
  XCircle,
} from 'lucide-react';
import type { ThinkingStepType } from './AIThinkingPanel.types';

// CONSTANTS
// ============================================================================

export const STEP_ICONS: Record<ThinkingStepType, ComponentType<{ className?: string }>> = {
  thinking: Brain,
  analyzing: Search,
  searching: FileCode,
  planning: Lightbulb,
  generating: Code2,
  validating: CheckCircle2,
  refining: Wand2,
  complete: CheckCircle2,
  error: XCircle,
};

export const STEP_COLORS: Record<ThinkingStepType, { bg: string; text: string; border: string }> = {
  thinking: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-primary)_16%,transparent)]',
    text: 'text-[var(--aethel-primary)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)]',
  },
  analyzing: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)]',
    text: 'text-[var(--aethel-info)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]',
  },
  searching: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_16%,transparent)]',
    text: 'text-[var(--aethel-warning-light)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
  },
  planning: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-secondary)_16%,transparent)]',
    text: 'text-[var(--aethel-secondary)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-secondary)_35%,transparent)]',
  },
  generating: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-info)_16%,transparent)]',
    text: 'text-[var(--aethel-info)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]',
  },
  validating: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)]',
    text: 'text-[var(--aethel-success)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]',
  },
  refining: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_16%,transparent)]',
    text: 'text-[var(--aethel-warning-light)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
  },
  complete: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-success)_16%,transparent)]',
    text: 'text-[var(--aethel-success)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]',
  },
  error: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_16%,transparent)]',
    text: 'text-[var(--aethel-error)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)]',
  },
};

// ============================================================================
