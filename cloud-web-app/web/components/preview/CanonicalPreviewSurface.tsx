'use client';

import { useState } from 'react';
import { type CanonicalRuntimeProps } from '@/components/preview/previewRuntime.types';
import RuntimePreviewSurface from '@/components/preview/RuntimePreviewSurface';
import UnifiedViewport from '@/components/canvas/UnifiedViewport';

// ============================================================================
// CANONICAL SURFACE PROPS
// ============================================================================

type Point3 = { x: number; y: number; z: number };

type CanonicalLiveProps = {
  variant: 'live';
  suggestions: string[];
  onMagicWandSelect: (position: Point3) => void;
  onSendSuggestion: (suggestion: string) => void | Promise<void>;
  isGenerating: boolean;
};

type CanonicalSceneProps = {
  variant: 'scene';
  renderMode?: 'draft' | 'cinematic';
  projectId?: string | null;
};

type CanonicalCanvasProps = {
  variant: 'canvas';
  renderMode?: 'draft' | 'cinematic';
};

export type CanonicalPreviewSurfaceProps =
  | CanonicalLiveProps
  | CanonicalRuntimeProps
  | CanonicalSceneProps
  | CanonicalCanvasProps;

function LivePreviewReviewSurface({
  suggestions,
  onMagicWandSelect,
  onSendSuggestion,
  isGenerating,
}: CanonicalLiveProps) {
  const [draftSuggestion, setDraftSuggestion] = useState('');

  const submitSuggestion = async () => {
    const normalized = draftSuggestion.trim();
    if (!normalized) return;
    await onSendSuggestion(normalized);
    setDraftSuggestion('');
  };

  return (
    <div className="relative min-h-[360px] overflow-hidden rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]">
      <UnifiedViewport surface="scene" renderMode="draft" />

      <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_82%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-secondary)] shadow-[0_12px_36px_rgba(2,6,23,0.28)]">
          Canonical preview
        </div>
        {isGenerating ? (
          <div className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,var(--aethel-surface-primary))] px-3 py-1.5 text-xs font-medium text-[var(--aethel-info-light)]">
            Agent is preparing a proposal
          </div>
        ) : null}
      </div>

      <div className="absolute inset-x-4 bottom-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form
          className="flex min-h-12 items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] p-2 shadow-[0_18px_48px_rgba(2,6,23,0.3)] backdrop-blur"
          onSubmit={(event) => {
            event.preventDefault();
            void submitSuggestion();
          }}
        >
          <button
            type="button"
            onClick={() => onMagicWandSelect({ x: 0, y: 0, z: 0 })}
            className="min-h-9 rounded-xl border border-[var(--aethel-border-subtle)] px-3 text-xs font-medium text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
          >
            Mark focus
          </button>
          <input
            value={draftSuggestion}
            onChange={(event) => setDraftSuggestion(event.target.value)}
            placeholder="Ask the agent to improve the selected area..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)]"
          />
          <button
            type="submit"
            disabled={!draftSuggestion.trim()}
            className="min-h-9 rounded-xl bg-[var(--aethel-text-primary)] px-4 text-xs font-semibold text-[var(--aethel-surface-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Send
          </button>
        </form>

        <div className="rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] p-3 shadow-[0_18px_48px_rgba(2,6,23,0.3)] backdrop-blur">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)]">Review queue</div>
          <div className="mt-2 space-y-2">
            {suggestions.length > 0 ? (
              suggestions.slice(0, 2).map((suggestion) => (
                <div key={suggestion} className="line-clamp-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-3 py-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">
                  {suggestion}
                </div>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--aethel-border-secondary)] px-3 py-2 text-xs leading-5 text-[var(--aethel-text-tertiary)]">
                No proposal yet. Select a focus point or ask for a targeted improvement.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

/**
 * Canonical preview authority for product-facing surfaces.
 *
 * Supports three variants:
 * - 'live': 3D live preview with AI suggestions
 * - 'runtime': Code preview with E2B/WebContainer/iframe/inline fallback
 * - 'scene': 3D scene preview (Nexus Canvas)
 *
 * Runtime variant can either own lifecycle locally or consume lifecycle state
 * supplied by a parent surface such as the workbench runtime lane.
 *
 * @see C:\Users\Grosarik\Desktop\Aethel engine\meu-repo\docs\master\51_DUPLICATIONS_AND_CONFLICTS_2026-03-22.md
 */
export default function CanonicalPreviewSurface(props: CanonicalPreviewSurfaceProps) {
  if (props.variant === 'live') {
    return (
      <div className="h-full min-h-0" data-canonical-preview-surface="live">
        <LivePreviewReviewSurface {...props} />
      </div>
    );
  }

  if (props.variant === 'scene') {
    return (
      <div className="h-full min-h-0" data-canonical-preview-surface="scene">
        <UnifiedViewport surface="scene" renderMode={props.renderMode ?? 'draft'} projectId={props.projectId} />
      </div>
    );
  }

  if (props.variant === 'canvas') {
    return (
      <div className="h-full min-h-0" data-canonical-preview-surface="canvas">
        <UnifiedViewport surface="canvas" renderMode={props.renderMode ?? 'draft'} />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0" data-canonical-preview-surface="runtime">
      <RuntimePreviewSurface {...props} />
    </div>
  );
}
