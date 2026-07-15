'use client'

import dynamic from 'next/dynamic'
import type { CanonicalRuntimeProps } from '@/components/preview/previewRuntime.types'
import { PreviewSkeleton } from '@/components/preview/PreviewLifecycleChrome'

export type UnifiedViewportSurface = 'scene' | 'character' | 'material' | 'cinematic' | 'audio' | 'canvas' | 'runtime'

export type UnifiedViewportCapability = 'browser-preview' | 'runtime-required' | 'held'

export type UnifiedViewportSurfaceDefinition = {
  id: UnifiedViewportSurface
  label: string
  capability: UnifiedViewportCapability
  detailPolicy: 'context-drawer' | 'runtime-toolbar'
  evidenceLabel: string
}

export const UNIFIED_VIEWPORT_SURFACES: readonly UnifiedViewportSurfaceDefinition[] = [
  {
    id: 'scene',
    label: 'Scene',
    capability: 'browser-preview',
    detailPolicy: 'context-drawer',
    evidenceLabel: 'Selection, outliner, inspector, gizmo, timeline',
  },
  {
    id: 'character',
    label: 'Character',
    capability: 'browser-preview',
    detailPolicy: 'context-drawer',
    evidenceLabel: 'Rig, facial, hair, cloth as governed tools',
  },
  {
    id: 'material',
    label: 'Material',
    capability: 'browser-preview',
    detailPolicy: 'context-drawer',
    evidenceLabel: 'PBR review, asset intake, quality ledger',
  },
  {
    id: 'cinematic',
    label: 'Cinematic',
    capability: 'browser-preview',
    detailPolicy: 'context-drawer',
    evidenceLabel: 'Timeline review, camera, VFX, export hold',
  },
  {
    id: 'audio',
    label: 'Audio',
    capability: 'held',
    detailPolicy: 'context-drawer',
    evidenceLabel: 'DAW-grade editing requires Studio Local or cloud render',
  },
  {
    id: 'canvas',
    label: 'Canvas',
    capability: 'browser-preview',
    detailPolicy: 'context-drawer',
    evidenceLabel: 'Artifact canvas with annotate/select/proposal actions',
  },
  {
    id: 'runtime',
    label: 'App',
    capability: 'runtime-required',
    detailPolicy: 'runtime-toolbar',
    evidenceLabel: 'Live app preview with fallback, cost, and rollback evidence',
  },
] as const

const SceneViewportSurface = dynamic(() => import('@/components/preview/SceneViewportSurface'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
})

const CanvasViewportSurface = dynamic(() => import('@/components/preview/CanvasViewportSurface'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
})

const RuntimePreviewSurface = dynamic(() => import('@/components/preview/RuntimePreviewSurface'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
})

export type UnifiedViewportProps = {
  surface?: UnifiedViewportSurface
  renderMode?: 'draft' | 'cinematic'
  projectId?: string | null
  runtimeProps?: CanonicalRuntimeProps
  className?: string
}

export function getUnifiedViewportSurface(surface: UnifiedViewportSurface = 'scene'): UnifiedViewportSurfaceDefinition {
  return UNIFIED_VIEWPORT_SURFACES.find((definition) => definition.id === surface) ?? UNIFIED_VIEWPORT_SURFACES[0]
}

function UnifiedViewportHeldState({ definition }: { definition: UnifiedViewportSurfaceDefinition }) {
  return (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-2xl border border-dashed border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] p-6 text-center">
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{definition.label} is held</p>
        <p className="mt-2 text-xs leading-5 text-[var(--aethel-text-secondary)]">{definition.evidenceLabel}</p>
      </div>
    </div>
  )
}

function UnifiedViewportBody({
  definition,
  renderMode,
  projectId,
  runtimeProps,
}: {
  definition: UnifiedViewportSurfaceDefinition
  renderMode: 'draft' | 'cinematic'
  projectId?: string | null
  runtimeProps?: CanonicalRuntimeProps
}) {
  if (definition.id === 'runtime') {
    return runtimeProps ? (
      <RuntimePreviewSurface {...runtimeProps} />
    ) : (
      <UnifiedViewportHeldState definition={definition} />
    )
  }

  if (definition.id === 'canvas') {
    return <CanvasViewportSurface renderMode={renderMode} projectId={projectId ?? undefined} />
  }

  if (definition.capability === 'held') {
    return <UnifiedViewportHeldState definition={definition} />
  }

  return <SceneViewportSurface renderMode={renderMode} projectId={projectId} />
}

export function UnifiedViewport({
  surface = 'scene',
  renderMode = 'draft',
  projectId,
  runtimeProps,
  className = '',
}: UnifiedViewportProps) {
  const definition = getUnifiedViewportSurface(surface)

  return (
    <section
      className={`flex h-full min-h-0 flex-col overflow-hidden rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] ${className}`}
      data-unified-viewport="true"
      data-unified-viewport-surface={definition.id}
      data-unified-viewport-capability={definition.capability}
    >
      <header className="flex min-h-12 items-center justify-between gap-3 border-b border-[var(--aethel-border-subtle)] px-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[var(--aethel-text-primary)]">{definition.label}</p>
          <p className="truncate text-[11px] text-[var(--aethel-text-tertiary)]">{definition.evidenceLabel}</p>
        </div>
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
          {definition.capability === 'held' ? 'Held' : 'Ready'}
        </span>
      </header>
      <div className="min-h-0 flex-1">
        <UnifiedViewportBody
          definition={definition}
          renderMode={renderMode}
          projectId={projectId}
          runtimeProps={runtimeProps}
        />
      </div>
    </section>
  )
}

export default UnifiedViewport
