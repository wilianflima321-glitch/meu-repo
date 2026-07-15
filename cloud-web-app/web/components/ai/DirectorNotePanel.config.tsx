import type { ComponentType } from 'react';
import {
  Camera,
  Clock,
  Gamepad2,
  MessageSquare,
  Palette,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Volume2,
} from 'lucide-react';
import type { NoteCategory, NoteSeverity } from './DirectorNotePanel.types';

// CONSTANTS
// ============================================================================

export const CATEGORY_INFO: Record<NoteCategory, {
  icon: ComponentType<{ className?: string }>;
  label: string;
  color: string;
}> = {
  composition: { icon: Camera, label: 'Composition', color: 'text-[var(--aethel-info)]' },
  lighting: { icon: Sparkles, label: 'Lighting', color: 'text-[var(--aethel-warning-light)]' },
  color: { icon: Palette, label: 'Color', color: 'text-[var(--aethel-secondary)]' },
  pacing: { icon: Clock, label: 'Pacing', color: 'text-[var(--aethel-success)]' },
  audio: { icon: Volume2, label: 'Audio', color: 'text-[var(--aethel-primary)]' },
  gameplay: { icon: Gamepad2, label: 'Gameplay', color: 'text-[var(--aethel-info)]' },
  narrative: { icon: MessageSquare, label: 'Narrative', color: 'text-[var(--aethel-secondary)]' },
  performance: { icon: TrendingUp, label: 'Performance', color: 'text-[var(--aethel-warning-light)]' },
  accessibility: { icon: Users, label: 'Accessibility', color: 'text-[var(--aethel-success)]' },
  ux: { icon: Target, label: 'UX', color: 'text-[var(--aethel-info)]' },
};

export const SEVERITY_STYLES: Record<NoteSeverity, {
  bg: string;
  border: string;
  badge: string;
  label: string;
}> = {
  suggestion: {
    bg: 'bg-[var(--aethel-surface-tertiary)]',
    border: 'border-[var(--aethel-border-primary)]',
    badge: 'bg-[var(--aethel-surface-quaternary)] text-[var(--aethel-text-secondary)]',
    label: 'Suggestion',
  },
  recommendation: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
    badge: 'bg-[color-mix(in_srgb,var(--aethel-warning)_20%,transparent)] text-[var(--aethel-warning-light)]',
    label: 'Recommendation',
  },
  critical: {
    bg: 'bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)]',
    border: 'border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)]',
    badge: 'bg-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] text-[var(--aethel-error)]',
    label: 'Critical',
  },
};

// ============================================================================
