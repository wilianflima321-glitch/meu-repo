'use client';

import { useEffect, useState } from 'react';
import { type CanonicalRuntimeProps } from '@/components/preview/previewRuntime.types';
import RuntimePreviewSurface from '@/components/preview/RuntimePreviewSurface';
import UnifiedViewport from '@/components/canvas/UnifiedViewport';

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

function useDesignModeState(): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ active: boolean }>).detail;
      setActive(detail?.active ?? false);
    };
    window.addEventListener('aethel.preview.designMode', handler);
    return () => window.removeEventListener('aethel.preview.designMode', handler);
  }, []);

  return active;
}

function DesignModeRing() {
  return (
    <div
      aria-live="polite"
      aria-label="Design Mode active - click any element to inspect it"
      className="pointer-events-none absolute inset-0 z-20 rounded-[inherit]"
      style={{
        boxShadow: 'inset 0 0 0 2px color-mix(in srgb, var(--aethel-primary) 60%, transparent)',
        animation: 'designModeRingPulse 2s ease-in-out infinite',
      }}
    >
      <style>{`
        @keyframes designModeRingPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      <div className="absolute left-1/2 top-2.5 -translate-x-1/2">
        <div className="flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-primary-light)] shadow-[var(--aethel-shadow-md)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aethel-primary-light)]" aria-hidden="true" />
          Design Mode
        </div>
      </div>
    </div>
  );
}

function PreviewActionStrip({
  suggestions,
  onMagicWandSelect,
  onSendSuggestion,
  isGenerating,
}: Pick<CanonicalLiveProps, 'suggestions' | 'onMagicWandSelect' | 'onSendSuggestion' | 'isGenerating'>) {
  const [draft, setDraft] = useState('');
  const normalizedDraft = draft.trim();

  const submitSuggestion = async () => {
    if (!normalizedDraft || isGenerating) return;
    await onSendSuggestion(normalizedDraft);
    setDraft('');
  };

  return (
    <form
      className="absolute inset-x-3 bottom-3 z-10 mx-auto flex max-w-[640px] items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] px-2.5 py-2 shadow-[var(--aethel-shadow-lg)] backdrop-blur-sm"
      onSubmit={(event) => {
        event.preventDefault();
        void submitSuggestion();
      }}
    >
      <button
        type="button"
        onClick={() => onMagicWandSelect({ x: 0, y: 0, z: 0 })}
        title="Click an element in the preview to target it"
        className="flex shrink-0 items-center gap-1.5 rounded-xl border border-[var(--aethel-border-subtle)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--aethel-primary)]"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <circle cx="6" cy="6" r="1.5" />
          <path d="M6 1v1.5M6 9.5V11M1 6h1.5M9.5 6H11" strokeLinecap="round" />
        </svg>
        Select
      </button>

      <input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder={
          suggestions.length > 0
            ? `${suggestions[0].slice(0, 48)}${suggestions[0].length > 48 ? '...' : ''}`
            : 'Describe an improvement to this element...'
        }
        className="min-w-0 flex-1 bg-transparent text-[12px] text-[var(--aethel-text-primary)] outline-none placeholder:text-[var(--aethel-text-quaternary)]"
        aria-label="Describe a change to apply to the selected element"
      />

      {isGenerating ? (
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2.5 py-1 text-[10px] font-semibold text-[var(--aethel-info-light)]">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--aethel-info-light)]" aria-hidden="true" />
          Working
        </div>
      ) : (
        <button
          type="submit"
          disabled={!normalizedDraft}
          className="shrink-0 rounded-xl bg-[var(--aethel-text-primary)] px-3 py-1.5 text-[11px] font-semibold text-[var(--aethel-surface-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Send
        </button>
      )}

      {!isGenerating && suggestions.length > 0 ? (
        <span
          title={`${suggestions.length} pending suggestion${suggestions.length > 1 ? 's' : ''}`}
          className="shrink-0 rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 text-[10px] font-semibold text-[var(--aethel-text-tertiary)]"
        >
          {suggestions.length}
        </span>
      ) : null}
    </form>
  );
}

function LivePreviewReviewSurface({
  suggestions,
  onMagicWandSelect,
  onSendSuggestion,
  isGenerating,
}: CanonicalLiveProps) {
  const designModeActive = useDesignModeState();

  return (
    <div className="relative h-full min-h-[360px] overflow-hidden rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)]">
      <UnifiedViewport surface="scene" renderMode="draft" />
      {designModeActive ? <DesignModeRing /> : null}
      <PreviewActionStrip
        suggestions={suggestions}
        onMagicWandSelect={onMagicWandSelect}
        onSendSuggestion={onSendSuggestion}
        isGenerating={isGenerating}
      />
    </div>
  );
}

function RuntimeWithDesignMode(props: CanonicalRuntimeProps) {
  const designModeActive = useDesignModeState();
  return (
    <div className="relative h-full min-h-0">
      <RuntimePreviewSurface {...props} />
      {designModeActive ? <DesignModeRing /> : null}
    </div>
  );
}

/**
 * Canonical preview surface. Use this for all product-facing preview and viewport renders.
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
      <div className="relative h-full min-h-0" data-canonical-preview-surface="scene">
        <UnifiedViewport surface="scene" renderMode={props.renderMode ?? 'draft'} projectId={props.projectId} />
      </div>
    );
  }

  if (props.variant === 'canvas') {
    return (
      <div className="relative h-full min-h-0" data-canonical-preview-surface="canvas">
        <UnifiedViewport surface="canvas" renderMode={props.renderMode ?? 'draft'} />
      </div>
    );
  }

  return (
    <div className="h-full min-h-0" data-canonical-preview-surface="runtime">
      <RuntimeWithDesignMode {...props} />
    </div>
  );
}