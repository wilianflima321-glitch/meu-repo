export type CreativeStudioDomain = 'world' | 'film' | 'audio' | 'runtime'
export type CreativeStudioGroup = 'world' | 'character' | 'fx' | 'film' | 'logic'
export type CreativeStudioMaturity = 'BETA' | 'ALPHA'

export interface CreativeStudioRoute {
  href: string
  label: string
  shortLabel: string
  domain: CreativeStudioDomain
  group: CreativeStudioGroup
  maturity: CreativeStudioMaturity
  description: string
}

export const CREATIVE_STUDIO_GROUPS: ReadonlyArray<{
  id: CreativeStudioGroup
  label: string
  description: string
}> = [
  {
    id: 'world',
    label: 'World',
    description: 'Levels, scenes, terrain, materials, foliage, water, and spatial layout.',
  },
  {
    id: 'character',
    label: 'Character',
    description: 'Rigging, animation, facial performance, hair, cloth, and character continuity.',
  },
  {
    id: 'fx',
    label: 'FX',
    description: 'Particles, fluid, sprite passes, combat cues, and generated visual effects.',
  },
  {
    id: 'film',
    label: 'Film',
    description: 'Director review, timeline, cinematic receipts, audio, and cloud review status.',
  },
  {
    id: 'logic',
    label: 'Logic',
    description: 'Quest graphs, gameplay contracts, missions, rewards, and validation rules.',
  },
]

export const PRIMARY_CREATIVE_HREFS = new Set([
  '/studio/level',
  '/studio/animation',
  '/studio/vfx',
  '/studio/film',
  '/studio/quest',
])

export const CREATIVE_STUDIO_ROUTE_REDIRECTS: Record<string, string> = {
  '/studio/scene': '/studio/level?tool=scene',
  '/studio/material': '/studio/level?tool=material',
  '/studio/terrain': '/studio/level?tool=terrain',
  '/studio/landscape': '/studio/level?tool=landscape',
  '/studio/foliage': '/studio/level?tool=foliage',
  '/studio/water': '/studio/level?tool=water',
  '/studio/rig': '/studio/animation?tool=rig',
  '/studio/facial': '/studio/animation?tool=facial',
  '/studio/hair': '/studio/animation?tool=hair',
  '/studio/cloth': '/studio/animation?tool=cloth',
  '/studio/fluid': '/studio/vfx?tool=fluid',
  '/studio/sprite': '/studio/vfx?tool=sprite',
  '/studio/audio': '/studio/film?tool=audio',
  '/studio/cinematic': '/studio/film?tool=cinematic',
}

export function isPrimaryCreativeStudioRoute(route: CreativeStudioRoute) {
  return PRIMARY_CREATIVE_HREFS.has(route.href)
}

export function getCreativeStudioRouteNavigationHref(route: CreativeStudioRoute) {
  return CREATIVE_STUDIO_ROUTE_REDIRECTS[route.href] || route.href
}

export const CREATIVE_STUDIO_ROUTES: CreativeStudioRoute[] = [
  {
    href: '/studio/level',
    label: 'Level Studio',
    shortLabel: 'Level',
    domain: 'world',
    group: 'world',
    maturity: 'BETA',
    description: 'Block out playable spaces, streaming regions, spawn points, and scene evidence.',
  },
  {
    href: '/studio/scene',
    label: 'Scene',
    shortLabel: 'Scene',
    domain: 'world',
    group: 'world',
    maturity: 'BETA',
    description: 'Inspect hierarchy, cameras, lights, transforms, and authored world state.',
  },
  {
    href: '/studio/material',
    label: 'Material',
    shortLabel: 'Material',
    domain: 'world',
    group: 'world',
    maturity: 'BETA',
    description: 'Tune PBR surfaces and keep texture decisions attached to the Asset Graph.',
  },
  {
    href: '/studio/animation',
    label: 'Animation Studio',
    shortLabel: 'Animation',
    domain: 'world',
    group: 'character',
    maturity: 'ALPHA',
    description: 'Author animation blueprints, transitions, timing, and review packets.',
  },
  {
    href: '/studio/vfx',
    label: 'VFX Studio',
    shortLabel: 'VFX',
    domain: 'world',
    group: 'fx',
    maturity: 'ALPHA',
    description: 'Shape particles, magic systems, combat cues, and cinematic effects.',
  },
  {
    href: '/studio/quest',
    label: 'Quest Studio',
    shortLabel: 'Quest',
    domain: 'world',
    group: 'logic',
    maturity: 'ALPHA',
    description: 'Author branching missions, prerequisites, rewards, and narrative validation graphs.',
  },

  {
    href: '/studio/terrain',
    label: 'Terrain',
    shortLabel: 'Terrain',
    domain: 'world',
    group: 'world',
    maturity: 'BETA',
    description: 'Sculpt heightmaps, biome zones, erosion passes, and terrain review packets.',
  },
  {
    href: '/studio/landscape',
    label: 'Landscape',
    shortLabel: 'Landscape',
    domain: 'world',
    group: 'world',
    maturity: 'BETA',
    description: 'Coordinate open-world terrain, painted layers, streaming-ready regions, and foliage systems.',
  },
  {
    href: '/studio/cloth',
    label: 'Cloth',
    shortLabel: 'Cloth',
    domain: 'world',
    group: 'character',
    maturity: 'ALPHA',
    description: 'Simulate garments, wind, pinning, collisions, and cloth export review packets.',
  },
  {
    href: '/studio/facial',
    label: 'Facial',
    shortLabel: 'Facial',
    domain: 'film',
    group: 'character',
    maturity: 'ALPHA',
    description: 'Author blendshapes, FACS poses, visemes, emotions, and continuity-safe character performance.',
  },
  {
    href: '/studio/fluid',
    label: 'Fluid',
    shortLabel: 'Fluid',
    domain: 'world',
    group: 'fx',
    maturity: 'ALPHA',
    description: 'Prototype particles, fluids, volume boundaries, and simulation review packets for scenes.',
  },
  {
    href: '/studio/foliage',
    label: 'Foliage',
    shortLabel: 'Foliage',
    domain: 'world',
    group: 'world',
    maturity: 'ALPHA',
    description: 'Paint procedural vegetation with density, slope, LOD, collision, and wind constraints.',
  },
  {
    href: '/studio/hair',
    label: 'Hair',
    shortLabel: 'Hair',
    domain: 'film',
    group: 'character',
    maturity: 'ALPHA',
    description: 'Design groom regions, strand physics, clumping, color gradients, and LOD review packets.',
  },
  {
    href: '/studio/rig',
    label: 'Rig',
    shortLabel: 'Rig',
    domain: 'film',
    group: 'character',
    maturity: 'ALPHA',
    description: 'Build IK/FK chains, procedural controls, constraints, and rig handoff packets.',
  },
  {
    href: '/studio/water',
    label: 'Water',
    shortLabel: 'Water',
    domain: 'world',
    group: 'world',
    maturity: 'ALPHA',
    description: 'Create oceans, rivers, foam, flow maps, buoyancy, and water-system receipts.',
  },
  {
    href: '/studio/sprite',
    label: 'Sprite',
    shortLabel: 'Sprite',
    domain: 'world',
    group: 'fx',
    maturity: 'ALPHA',
    description: 'Edit 2D sprites, animation frames, pixel passes, and lightweight game assets.',
  },
  {
    href: '/studio/film',
    label: 'Film Studio',
    shortLabel: 'Film',
    domain: 'film',
    group: 'film',
    maturity: 'ALPHA',
    description: 'Move between director notes, continuity review, timeline, audio, and governed cloud review.',
  },
]

export const CREATIVE_STUDIO_ROUTE_HREFS = CREATIVE_STUDIO_ROUTES.map((route) => route.href)

export function groupCreativeStudioRoutes(routes: readonly CreativeStudioRoute[]) {
  return CREATIVE_STUDIO_GROUPS.map((group) => ({
    ...group,
    routes: routes.filter((route) => route.group === group.id),
  })).filter((group) => group.routes.length > 0)
}
