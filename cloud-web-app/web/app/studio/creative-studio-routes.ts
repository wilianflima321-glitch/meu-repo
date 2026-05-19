export type CreativeStudioDomain = 'world' | 'film' | 'audio'
export type CreativeStudioMaturity = 'BETA' | 'ALPHA'

export interface CreativeStudioRoute {
  href: string
  label: string
  shortLabel: string
  domain: CreativeStudioDomain
  maturity: CreativeStudioMaturity
  description: string
}

export const CREATIVE_STUDIO_ROUTES: CreativeStudioRoute[] = [
  {
    href: '/studio/level',
    label: 'Level Studio',
    shortLabel: 'Level',
    domain: 'world',
    maturity: 'BETA',
    description: 'Block out playable spaces, streaming regions, spawn points, and scene evidence.',
  },
  {
    href: '/studio/scene',
    label: 'Scene Studio',
    shortLabel: 'Scene',
    domain: 'world',
    maturity: 'BETA',
    description: 'Inspect hierarchy, cameras, lights, transforms, and authored world state.',
  },
  {
    href: '/studio/material',
    label: 'Material Studio',
    shortLabel: 'Material',
    domain: 'world',
    maturity: 'BETA',
    description: 'Tune PBR surfaces and keep texture decisions attached to the Asset Graph.',
  },
  {
    href: '/studio/animation',
    label: 'Animation Studio',
    shortLabel: 'Animation',
    domain: 'world',
    maturity: 'ALPHA',
    description: 'Author animation blueprints, transitions, timing, and review packets.',
  },
  {
    href: '/studio/vfx',
    label: 'VFX Studio',
    shortLabel: 'VFX',
    domain: 'world',
    maturity: 'ALPHA',
    description: 'Shape particles, magic systems, combat cues, and cinematic effects.',
  },
  {
    href: '/studio/quest',
    label: 'Quest Studio',
    shortLabel: 'Quest',
    domain: 'world',
    maturity: 'ALPHA',
    description: 'Author branching missions, prerequisites, rewards, and narrative validation graphs.',
  },

  {
    href: '/studio/terrain',
    label: 'Terrain Studio',
    shortLabel: 'Terrain',
    domain: 'world',
    maturity: 'BETA',
    description: 'Sculpt heightmaps, biome zones, erosion passes, and terrain validation evidence.',
  },
  {
    href: '/studio/landscape',
    label: 'Landscape Studio',
    shortLabel: 'Landscape',
    domain: 'world',
    maturity: 'BETA',
    description: 'Coordinate open-world terrain, painted layers, streaming-ready regions, and foliage systems.',
  },
  {
    href: '/studio/cloth',
    label: 'Cloth Studio',
    shortLabel: 'Cloth',
    domain: 'world',
    maturity: 'ALPHA',
    description: 'Simulate garments, wind, pinning, collisions, and cloth export review packets.',
  },
  {
    href: '/studio/facial',
    label: 'Facial Studio',
    shortLabel: 'Facial',
    domain: 'film',
    maturity: 'ALPHA',
    description: 'Author blendshapes, FACS poses, visemes, emotions, and continuity-safe character performance.',
  },
  {
    href: '/studio/fluid',
    label: 'Fluid Studio',
    shortLabel: 'Fluid',
    domain: 'world',
    maturity: 'ALPHA',
    description: 'Prototype SPH particles, fluids, volume boundaries, and simulation evidence for scenes.',
  },
  {
    href: '/studio/foliage',
    label: 'Foliage Studio',
    shortLabel: 'Foliage',
    domain: 'world',
    maturity: 'ALPHA',
    description: 'Paint procedural vegetation with density, slope, LOD, collision, and wind constraints.',
  },
  {
    href: '/studio/hair',
    label: 'Hair & Fur Studio',
    shortLabel: 'Hair',
    domain: 'film',
    maturity: 'ALPHA',
    description: 'Design groom regions, strand physics, clumping, color gradients, and LOD evidence.',
  },
  {
    href: '/studio/rig',
    label: 'Control Rig Studio',
    shortLabel: 'Rig',
    domain: 'film',
    maturity: 'ALPHA',
    description: 'Build IK/FK chains, procedural controls, constraints, and rig handoff packets.',
  },
  {
    href: '/studio/water',
    label: 'Water Studio',
    shortLabel: 'Water',
    domain: 'world',
    maturity: 'ALPHA',
    description: 'Create oceans, rivers, foam, flow maps, buoyancy, and water-system evidence.',
  },
  {
    href: '/studio/sprite',
    label: 'Sprite Studio',
    shortLabel: 'Sprite',
    domain: 'world',
    maturity: 'ALPHA',
    description: 'Edit 2D sprites, animation frames, pixel passes, and lightweight game assets.',
  },
  {
    href: '/studio/film',
    label: 'Film Studio',
    shortLabel: 'Film',
    domain: 'film',
    maturity: 'ALPHA',
    description: 'Move between director notes, continuity review, and the video timeline.',
  },
  {
    href: '/studio/audio',
    label: 'Audio Studio',
    shortLabel: 'Audio',
    domain: 'audio',
    maturity: 'ALPHA',
    description: 'Compose sound cues, mix layers, and prepare audio evidence for review.',
  },
]

export const CREATIVE_STUDIO_ROUTE_HREFS = CREATIVE_STUDIO_ROUTES.map((route) => route.href)
