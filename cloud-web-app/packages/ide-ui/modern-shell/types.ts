export type WorkbenchRegionId = 'sidebar' | 'editor' | 'preview' | 'chat' | 'terminal'

export type WorkbenchRegionDefinition = {
  id: WorkbenchRegionId
  label: string
  role: 'navigation' | 'authoring' | 'review' | 'agent-sidecar' | 'execution-log'
  owner: 'ModernIDEShell'
  boundary: 'PanelErrorBoundary' | 'EditorErrorBoundary'
  detailPolicy: 'primary-region' | 'resizable-sidecar' | 'bottom-dock'
}

export const WORKBENCH_REGION_REGISTRY: readonly WorkbenchRegionDefinition[] = [
  {
    id: 'sidebar',
    label: 'Explorer',
    role: 'navigation',
    owner: 'ModernIDEShell',
    boundary: 'PanelErrorBoundary',
    detailPolicy: 'resizable-sidecar',
  },
  {
    id: 'editor',
    label: 'Editor',
    role: 'authoring',
    owner: 'ModernIDEShell',
    boundary: 'EditorErrorBoundary',
    detailPolicy: 'primary-region',
  },
  {
    id: 'preview',
    label: 'Preview',
    role: 'review',
    owner: 'ModernIDEShell',
    boundary: 'PanelErrorBoundary',
    detailPolicy: 'resizable-sidecar',
  },
  {
    id: 'chat',
    label: 'AI Console',
    role: 'agent-sidecar',
    owner: 'ModernIDEShell',
    boundary: 'PanelErrorBoundary',
    detailPolicy: 'resizable-sidecar',
  },
  {
    id: 'terminal',
    label: 'Terminal',
    role: 'execution-log',
    owner: 'ModernIDEShell',
    boundary: 'PanelErrorBoundary',
    detailPolicy: 'bottom-dock',
  },
] as const

export function getWorkbenchRegionDefinition(id: WorkbenchRegionId): WorkbenchRegionDefinition {
  return WORKBENCH_REGION_REGISTRY.find((region) => region.id === id) ?? WORKBENCH_REGION_REGISTRY[0]
}

export interface PanelState {
  sidebar: { open: boolean; size: number };
  editor: { open: boolean; size: number };
  preview: { open: boolean; size: number };
  chat: { open: boolean; size: number };
}

export type SidebarTab = 'explorer' | 'git' | 'research' | 'inspector';

export type BottomPanelMode = 'chat' | 'terminal' | 'diagnostics';

export type PreviewMode = 'runtime' | 'device' | 'console' | 'viewport3d' | 'canvas' | 'node_editor';
