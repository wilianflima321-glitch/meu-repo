'use client';

import type { EditorScaleReadiness } from '@/lib/editor/editor-scale-readiness';

interface EditorScaleReadinessBadgeProps {
  readiness: EditorScaleReadiness;
}

const STATUS_TONE: Record<EditorScaleReadiness['status'], { label: string; border: string; background: string; color: string }> = {
  ready: {
    label: 'Ready',
    border: 'rgba(52, 211, 153, 0.45)',
    background: 'rgba(6, 78, 59, 0.22)',
    color: '#86efac',
  },
  watch: {
    label: 'Watch',
    border: 'rgba(251, 191, 36, 0.48)',
    background: 'rgba(120, 53, 15, 0.24)',
    color: '#fbbf24',
  },
  guarded: {
    label: 'Guarded',
    border: 'rgba(248, 113, 113, 0.5)',
    background: 'rgba(127, 29, 29, 0.24)',
    color: '#fca5a5',
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
