import type { PreviewMode } from '@/components/ide/fullscreen/types'

export type PreviewSurfaceKind = 'scene' | 'canvas' | 'runtime' | 'device' | 'console'
export type PreviewSurfaceCapability = 'browser-preview' | 'runtime-required' | 'logs-only'
export type PreviewSurfaceAction =
  | 'annotate'
  | 'select'
  | 'inspect'
  | 'open-drawer'
  | 'apply-proposal'
  | 'device-frame'
  | 'view-logs'

export type PreviewSurfaceDefinition = {
  id: PreviewMode
  kind: PreviewSurfaceKind
  label: string
  description: string
  owner: 'CanonicalPreviewSurface' | 'WorkbenchPreviewPane'
  capability: PreviewSurfaceCapability
  primaryRegion: 'viewport' | 'app-preview' | 'panel'
  detailPolicy: 'contextual-drawer' | 'runtime-toolbar' | 'console-panel'
  hiddenActions: readonly PreviewSurfaceAction[]
}

export const PREVIEW_SURFACE_REGISTRY: readonly PreviewSurfaceDefinition[] = [
  {
    id: 'viewport3d',
    kind: 'scene',
    label: '3D',
    description: 'Scene viewport with outliner, inspector, timeline, and governed edit menu.',
    owner: 'CanonicalPreviewSurface',
    capability: 'browser-preview',
    primaryRegion: 'viewport',
    detailPolicy: 'contextual-drawer',
    hiddenActions: ['select', 'inspect', 'annotate', 'open-drawer', 'apply-proposal'],
  },
  {
    id: 'canvas',
    kind: 'canvas',
    label: 'Canvas',
    description: 'Artifact canvas for visual composition, research, and UI variants.',
    owner: 'CanonicalPreviewSurface',
    capability: 'browser-preview',
    primaryRegion: 'viewport',
    detailPolicy: 'contextual-drawer',
    hiddenActions: ['select', 'annotate', 'open-drawer', 'apply-proposal'],
  },
  {
    id: 'runtime',
    kind: 'runtime',
    label: 'App',
    description: 'Live application preview with runtime trust, deploy, and fallback evidence.',
    owner: 'CanonicalPreviewSurface',
    capability: 'runtime-required',
    primaryRegion: 'app-preview',
    detailPolicy: 'runtime-toolbar',
    hiddenActions: ['annotate', 'apply-proposal'],
  },
  {
    id: 'device',
    kind: 'device',
    label: 'Devices',
    description: 'Responsive device framing around the same governed runtime preview.',
    owner: 'CanonicalPreviewSurface',
    capability: 'runtime-required',
    primaryRegion: 'app-preview',
    detailPolicy: 'runtime-toolbar',
    hiddenActions: ['device-frame', 'annotate', 'apply-proposal'],
  },
  {
    id: 'console',
    kind: 'console',
    label: 'Logs',
    description: 'Console output, runtime logs, and diagnostics without stealing the viewport.',
    owner: 'WorkbenchPreviewPane',
    capability: 'logs-only',
    primaryRegion: 'panel',
    detailPolicy: 'console-panel',
    hiddenActions: ['view-logs'],
  },
] as const

export function getPreviewSurfaceDefinition(mode: PreviewMode): PreviewSurfaceDefinition {
  return PREVIEW_SURFACE_REGISTRY.find((surface) => surface.id === mode) ?? PREVIEW_SURFACE_REGISTRY[0]
}
