'use client';

import type { EditorScaleReadiness } from '@/lib/editor/editor-scale-readiness';

interface EditorScaleReadinessBadgeProps {
  readiness: EditorScaleReadiness;
}

const STATUS_TONE: Record<EditorScaleReadiness['status'], { label: string; border: string; background: string; color: string }> = {
  ready: {
    label: 'Ready',
    border: 'rgba(var(--aethel-neon-emerald-rgb), 0.45)',
    background: 'color-mix(in srgb, var(--aethel-success-dark) 22%, transparent)',
    color: 'var(--aethel-success-light)',
  },
  watch: {
    label: 'Watch',
    border: 'rgba(var(--aethel-neon-amber-rgb), 0.48)',
    background: 'color-mix(in srgb, var(--aethel-warning-dark) 24%, transparent)',
    color: 'var(--aethel-neon-amber)',
  },
  guarded: {
    label: 'Guarded',
    border: 'rgba(var(--aethel-error-rgb), 0.5)',
    background: 'color-mix(in srgb, var(--aethel-error-dark) 24%, transparent)',
    color: 'var(--aethel-error-light)',
  },
};

export function EditorScaleReadinessBadge({ readiness }: EditorScaleReadinessBadgeProps) {
  const tone = STATUS_TONE[readiness.status];

  return (
    <div
      aria-label={`${readiness.label}: ${tone.label}. ${readiness.detail}`}
      title={readiness.recommendation}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        margin: '8px 12px',
        padding: '8px 10px',
        borderRadius: '8px',
        border: `1px solid ${tone.border}`,
        background: tone.background,
        color: 'var(--aethel-text-secondary)',
        fontSize: '11px',
        lineHeight: 1.35,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
        <span style={{ color: 'var(--aethel-text-primary)', fontWeight: 700 }}>
          {readiness.label}
        </span>
        <span style={{ color: 'var(--aethel-text-muted)' }}>
          {readiness.detail}
        </span>
      </div>
      <span
        style={{
          flex: '0 0 auto',
          borderRadius: '999px',
          border: `1px solid ${tone.border}`,
          color: tone.color,
          padding: '3px 8px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontSize: '10px',
        }}
      >
        {tone.label}
      </span>
    </div>
  );
}
