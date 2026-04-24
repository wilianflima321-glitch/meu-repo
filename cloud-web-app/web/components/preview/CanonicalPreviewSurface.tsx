'use client';

import dynamic from 'next/dynamic';
import { type CanonicalRuntimeProps } from '@/components/preview/previewRuntime.types';
import { PreviewSkeleton } from '@/components/preview/PreviewLifecycleChrome';
import RuntimePreviewSurface from '@/components/preview/RuntimePreviewSurface';
import SceneViewportSurface from '@/components/preview/SceneViewportSurface';
import CanvasViewportSurface from '@/components/preview/CanvasViewportSurface';


// ============================================================================
// TYPES & CONSTANTS
// ============================================================================

// Dynamic imports
const LivePreview = dynamic(() => import('@/components/LivePreview'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});

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
 * Runtime variant includes full lifecycle management:
 * idle -> provisioning -> warming -> syncing -> healthy / degraded / failed
 *
 * @see docs/master/DUPLICATIONS_AND_CONFLICTS.md (C-07)
 */
export default function CanonicalPreviewSurface(props: CanonicalPreviewSurfaceProps) {
  if (props.variant === 'live') {
    return (
      <LivePreview
        onMagicWandSelect={props.onMagicWandSelect}
        suggestions={props.suggestions}
        onSendSuggestion={props.onSendSuggestion}
        isGenerating={props.isGenerating}
      />
    );
  }

  if (props.variant === 'scene') {
    return <SceneViewportSurface renderMode={props.renderMode ?? 'draft'} />;
  }

  if (props.variant === 'canvas') {
    return <CanvasViewportSurface renderMode={props.renderMode ?? 'draft'} />;
  }

  return <RuntimePreviewSurface {...props} />;
}
