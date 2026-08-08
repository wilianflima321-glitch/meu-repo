/**
 * Domain / simulation / schema color presets — NOT UI chrome.
 *
 * Hex/rgb literals for fluid materials, terrain layers, hair gradients,
 * scene serialization defaults, plugin schema defaults, and similar
 * non-chrome data. Scanner-excluded SoT (same rationale as design-tokens.ts).
 *
 * UI surfaces must continue to use var(--aethel-*) / tokenColor().
 */

export const DOMAIN_FLUID_COLORS = {
  water: '#3b82f6',
  oil: '#854d0e',
  honey: '#f59e0b',
  lava: '#dc2626',
  blood: '#991b1b',
  mercury: '#94a3b8',
  slime: '#22c55e',
  milk: '#f8fafc',
  default: '#3b82f6',
} as const

export const DOMAIN_TERRAIN_SPLAT = {
  grass: 'rgb(74 124 79)',
  rock: 'rgb(107 107 107)',
  snow: 'rgb(232 232 232)',
  fallback: 'rgb(128,128,128)',
} as const

export const DOMAIN_FOLIAGE = {
  tree: 'rgb(34, 139, 34)',
  bush: 'rgb(46, 125, 50)',
  grass: 'rgb(76, 175, 80)',
} as const

export const DOMAIN_HAIR_GRADIENT = [
  { position: 0, color: '#2d1810' },
  { position: 0.5, color: '#4a2c1a' },
  { position: 1, color: '#6b3d22' },
] as const

export const DOMAIN_SCENE_DEFAULTS = {
  sky: '#87CEEB',
  ambient: '#404040',
  light: '#CCCCCC',
  mesh: '#ffffff',
  fade: '#000000',
  pbrWhite: 'rgb(255, 255, 255)',
} as const

export const DOMAIN_MATERIAL_SWATCHES = {
  white: '#ffffff',
  black: '#000000',
} as const

export const DOMAIN_QUEST_MARKERS = {
  marker: '#ffcc00',
  complete: '#00ff00',
} as const

export const DOMAIN_CHARACTER_SKIN = {
  face: 'rgb(226 169 143)',
  hairPreview: 'rgb(232 213 196)',
} as const

export const DOMAIN_COLLAB_TEST = {
  red: '#f00',
  green: '#0f0',
  presenceFallback: '#6b8cae',
} as const

export const DOMAIN_VFX_GRADIENT = {
  white: 'rgb(255 255 255)',
  red: 'rgb(255 0 0)',
} as const

export const DOMAIN_QR = {
  dark: '#000000',
  light: '#ffffff',
} as const

export const DOMAIN_INSTANT_PLAY_BG = '#0a0e18'

export const DOMAIN_QUALITY_GATE_LEGACY_HEX = [
  '#0a0e27',
  '#00ff88',
  '#1a1f3a',
] as const
