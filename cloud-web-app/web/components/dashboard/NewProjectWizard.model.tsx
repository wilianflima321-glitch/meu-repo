import { Box, Car, Crosshair, Gamepad2, Sword } from 'lucide-react'
import type { ReactNode } from 'react'

export type GameGenre = 'fps' | 'rpg' | 'platformer' | 'racing' | 'blank'
export type VisualStyle = 'pixel' | 'lowpoly' | 'realistic' | 'scifi' | 'stylized'

export interface GenreOption {
  id: GameGenre
  name: string
  description: string
  icon: ReactNode
  previewVideo?: string
  previewImage: string
  features: string[]
  expertOnly?: boolean
}

export interface StyleOption {
  id: VisualStyle
  name: string
  description: string
  previewImage: string
  requiresGPU?: boolean
  colors: string[]
}

export interface LoadingStep {
  id: string
  message: string
  duration: number
}

export interface NewProjectWizardProps {
  onComplete?: (projectId: string) => void
  onCancel?: () => void
}

export const GENRES: GenreOption[] = [
  {
    id: 'fps',
    name: 'FPS Shooter',
    description: 'First-person combat starter with aiming, HUD, and enemy AI.',
    icon: <Crosshair className="h-8 w-8" />,
    previewImage: '/templates/fps-preview.webp',
    previewVideo: '/templates/fps-preview.webm',
    features: ['Weapon system', 'Enemy AI', 'HUD', 'Projectile physics'],
  },
  {
    id: 'rpg',
    name: 'Top-Down RPG',
    description: 'Exploration, inventory, dialogue, quests, and combat scaffolding.',
    icon: <Sword className="h-8 w-8" />,
    previewImage: '/templates/rpg-preview.webp',
    previewVideo: '/templates/rpg-preview.webm',
    features: ['Inventory', 'Dialogue', 'Quests', 'Turn combat'],
  },
  {
    id: 'platformer',
    name: '2D Platformer',
    description: 'Side-scrolling movement with jumps, collectibles, and checkpoints.',
    icon: <Gamepad2 className="h-8 w-8" />,
    previewImage: '/templates/platformer-preview.webp',
    previewVideo: '/templates/platformer-preview.webm',
    features: ['2D physics', 'Parallax', 'Collectibles', 'Checkpoints'],
  },
  {
    id: 'racing',
    name: 'Racing',
    description: 'Arcade driving starter with track flow and timed laps.',
    icon: <Car className="h-8 w-8" />,
    previewImage: '/templates/racing-preview.webp',
    previewVideo: '/templates/racing-preview.webm',
    features: ['Vehicle physics', 'Track waypoints', 'Timed lap', 'Power-ups'],
  },
  {
    id: 'blank',
    name: 'Blank Project',
    description: 'Empty project for experts. Start from a clean scene.',
    icon: <Box className="h-8 w-8" />,
    previewImage: '/templates/blank-preview.webp',
    features: ['Empty scene', 'Full creative control'],
    expertOnly: true,
  },
]

export const STYLES: StyleOption[] = [
  {
    id: 'pixel',
    name: 'Pixel Art',
    description: 'Retro visual language with crisp sprites and compact scenes.',
    previewImage: '/templates/style-pixel.webp',
    colors: ['var(--aethel-accent)', 'var(--aethel-secondary)', 'var(--aethel-warning)'],
  },
  {
    id: 'lowpoly',
    name: 'Low Poly 3D',
    description: 'Readable 3D shapes, fast iteration, and clean silhouettes.',
    previewImage: '/templates/style-lowpoly.webp',
    colors: ['var(--aethel-success)', 'var(--aethel-primary)', 'var(--aethel-warning-light)'],
  },
  {
    id: 'realistic',
    name: 'Realistic PBR',
    description: 'Material-first direction with governed quality checks.',
    previewImage: '/templates/style-realistic.webp',
    requiresGPU: true,
    colors: ['var(--aethel-text-quaternary)', 'var(--aethel-surface-quaternary)', 'var(--aethel-surface-tertiary)'],
  },
  {
    id: 'scifi',
    name: 'Sci-Fi Neon',
    description: 'High-contrast lighting, luminous UI, and future-tech mood.',
    previewImage: '/templates/style-scifi.webp',
    colors: ['var(--aethel-info)', 'var(--aethel-accent)', 'var(--aethel-secondary)'],
  },
  {
    id: 'stylized',
    name: 'Stylized Toon',
    description: 'Clear forms, expressive outlines, and production-friendly color.',
    previewImage: '/templates/style-stylized.webp',
    colors: ['var(--aethel-secondary-light)', 'var(--aethel-accent-light)', 'var(--aethel-success-light)'],
  },
]

export const LOADING_STEPS: LoadingStep[] = [
  { id: 'init', message: 'Preparing workspace...', duration: 800 },
  { id: 'terrain', message: 'Building starter scene...', duration: 1200 },
  { id: 'shaders', message: 'Checking visual pipeline...', duration: 1000 },
  { id: 'assets', message: 'Loading starter assets...', duration: 1500 },
  { id: 'ai', message: 'Preparing agent plan...', duration: 800 },
  { id: 'physics', message: 'Configuring physics...', duration: 600 },
  { id: 'audio', message: 'Setting audio defaults...', duration: 400 },
  { id: 'final', message: 'Opening editor...', duration: 700 },
]

const PROJECT_ADJECTIVES = ['Epic', 'Cosmic', 'Neon', 'Shadow', 'Crystal', 'Quantum']

export function createSuggestedProjectName(genreName?: string): string {
  const adjective = PROJECT_ADJECTIVES[Math.floor(Math.random() * PROJECT_ADJECTIVES.length)]
  return `${adjective} ${genreName || 'Project'}`
}
