export type WorkspaceLaneId = 'code' | 'canvas' | 'timeline' | 'library' | 'agents' | 'share'

export type WorkspaceLaneState = 'available' | 'held' | 'blocked' | 'needs-review'

export type WorkspaceLane = {
  id: WorkspaceLaneId
  label: string
  href: string
  state: WorkspaceLaneState
  primaryAction: string
  absorbsRoutes: readonly string[]
  hiddenDetailPolicy: 'drawer' | 'command-palette' | 'details'
  noPollutionRule: string
}

export const WORKSPACE_NAVIGATION_LANES: readonly WorkspaceLane[] = [
  {
    id: 'code',
    label: 'Code',
    href: '/ide',
    state: 'available',
    primaryAction: 'Edit with agents',
    absorbsRoutes: ['/editor-hub', '/explorer', '/git', '/search', '/terminal', '/testing'],
    hiddenDetailPolicy: 'command-palette',
    noPollutionRule: 'Editor chrome owns code actions; dashboard must not duplicate chat, terminal, or file panes.',
  },
  {
    id: 'canvas',
    label: 'Canvas',
    href: '/studio',
    state: 'needs-review',
    primaryAction: 'Review scene',
    absorbsRoutes: ['/studio/scene', '/studio/level', '/studio/landscape', '/studio/terrain', '/studio/material'],
    hiddenDetailPolicy: 'drawer',
    noPollutionRule: 'Viewport tools stay contextual until selection, drag, or command intent exists.',
  },
  {
    id: 'timeline',
    label: 'Timeline',
    href: '/studio?lane=timeline',
    state: 'needs-review',
    primaryAction: 'Open sequencer',
    absorbsRoutes: ['/studio/cinematic', '/studio/film', '/studio/animation', '/studio/vfx', '/studio/audio'],
    hiddenDetailPolicy: 'drawer',
    noPollutionRule: 'Temporal tools are sequencer lanes, not separate standalone pages competing in nav.',
  },
  {
    id: 'library',
    label: 'Library',
    href: '/marketplace',
    state: 'held',
    primaryAction: 'Browse verified assets',
    absorbsRoutes: ['/marketplace', '/studio/foliage', '/studio/water', '/studio/cloth', '/studio/hair'],
    hiddenDetailPolicy: 'details',
    noPollutionRule: 'Asset claims require provenance, license, thumbnail/proxy, size budget, and quality ledger.',
  },
  {
    id: 'agents',
    label: 'Agents',
    href: '/nexus',
    state: 'needs-review',
    primaryAction: 'Run with receipts',
    absorbsRoutes: ['/nexus', '/chat', '/ai-command'],
    hiddenDetailPolicy: 'command-palette',
    noPollutionRule: 'Agent detail belongs in replay/evidence drawers, not cards explaining every internal capability.',
  },
  {
    id: 'share',
    label: 'Share',
    href: '/evidence',
    state: 'needs-review',
    primaryAction: 'Publish evidence',
    absorbsRoutes: ['/evidence', '/status', '/reliability'],
    hiddenDetailPolicy: 'details',
    noPollutionRule: 'Sharing requires preview URL, rollback, cost, screenshots, and privacy masking before publication.',
  },
] as const

export function resolveWorkspaceLane(pathname: string): WorkspaceLane | undefined {
  const normalized = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname
  return WORKSPACE_NAVIGATION_LANES.find((lane) =>
    normalized === lane.href || lane.absorbsRoutes.some((route) => normalized === route || normalized.startsWith(`${route}/`)),
  )
}
