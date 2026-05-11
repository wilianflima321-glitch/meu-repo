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
