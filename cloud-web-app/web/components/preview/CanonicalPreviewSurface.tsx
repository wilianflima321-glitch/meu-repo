'use client';

import dynamic from 'next/dynamic';

const LivePreview = dynamic(() => import('@/components/LivePreview'), {
  ssr: false,
  loading: () => (
    <div className="aethel-state aethel-state-loading">
      <p className="aethel-state-title">Loading live preview...</p>
    </div>
  ),
});

const PreviewPanel = dynamic(() => import('@/components/ide/PreviewPanel'), {
  ssr: false,
});

const NexusCanvasV2 = dynamic(
  () => import('@/components/nexus/NexusCanvasV2').then((mod) => mod.NexusCanvasV2),
  { ssr: false }
);

type Point3 = {
  x: number;
  y: number;
  z: number;
};

type CanonicalLiveProps = {
  variant: 'live';
  suggestions: string[];
  onMagicWandSelect: (position: Point3) => void;
  onSendSuggestion: (suggestion: string) => void | Promise<void>;
  isGenerating: boolean;
};

type CanonicalRuntimeProps = {
  variant: 'runtime';
  title?: string;
  filePath?: string;
  content?: string;
  html?: string;
  projectId?: string;
  runtimeUrl?: string;
  forceInlineFallback?: boolean;
  runtimeUnavailableReason?: string;
  isStale?: boolean;
  onRefresh?: () => void;
};

type CanonicalSceneProps = {
  variant: 'scene';
  renderMode?: 'draft' | 'cinematic';
};

type CanonicalPreviewSurfaceProps = CanonicalLiveProps | CanonicalRuntimeProps | CanonicalSceneProps;

/**
 * Canonical preview authority for product-facing surfaces.
 * Primitive implementations still exist underneath, but dashboard/IDE work should
 * route through this component so runtime semantics stay explicit.
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
    return <NexusCanvasV2 renderMode={props.renderMode ?? 'draft'} />;
  }

  return (
    <PreviewPanel
      title={props.title}
      filePath={props.filePath}
      content={props.content}
      html={props.html}
      projectId={props.projectId}
      runtimeUrl={props.runtimeUrl}
      forceInlineFallback={props.forceInlineFallback}
      runtimeUnavailableReason={props.runtimeUnavailableReason}
      isStale={props.isStale}
      onRefresh={props.onRefresh}
    />
  );
}
