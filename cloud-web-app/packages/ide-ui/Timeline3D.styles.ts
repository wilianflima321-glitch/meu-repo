/** Design-token style maps for Timeline3D (L.10 — no hardcoded hex/rgba literals). */

export type TimelineTrackConfig = {
  color: string
  /** CSS custom property name holding `r, g, b` channels (e.g. `--aethel-primary-rgb`). */
  rgbVar: string
  glow: string
  label: string
}

export const TRACK_CONFIGS: Record<string, TimelineTrackConfig> = {
  position: {
    color: 'var(--aethel-primary-light)',
    rgbVar: '--aethel-primary-rgb',
    glow: 'rgba(var(--aethel-primary-rgb), 0.5)',
    label: 'Position',
  },
  rotation: {
    color: 'var(--aethel-accent-light)',
    rgbVar: '--aethel-accent-rgb',
    glow: 'rgba(var(--aethel-accent-rgb), 0.5)',
    label: 'Rotation',
  },
  scale: {
    color: 'var(--aethel-success-light)',
    rgbVar: '--aethel-success-rgb',
    glow: 'rgba(var(--aethel-success-rgb), 0.5)',
    label: 'Scale',
  },
  visibility: {
    color: 'var(--aethel-warning-light)',
    rgbVar: '--aethel-warning-rgb',
    glow: 'rgba(var(--aethel-warning-rgb), 0.5)',
    label: 'Visibility',
  },
  material: {
    color: 'var(--aethel-warning)',
    rgbVar: '--aethel-warning-rgb',
    glow: 'rgba(var(--aethel-warning-rgb), 0.5)',
    label: 'Material',
  },
  event: {
    color: 'var(--aethel-error-light)',
    rgbVar: '--aethel-error-rgb',
    glow: 'rgba(var(--aethel-error-rgb), 0.5)',
    label: 'Event',
  },
}

export const DEFAULT_TRACK_CONFIG: TimelineTrackConfig = {
  color: 'var(--aethel-text-quaternary)',
  rgbVar: '--aethel-primary-rgb',
  glow: 'color-mix(in srgb, var(--aethel-text-quaternary) 50%, transparent)',
  label: 'Unknown',
}

export function trackConfig(track: string): TimelineTrackConfig {
  return TRACK_CONFIGS[track] ?? DEFAULT_TRACK_CONFIG
}

export const DEMO_TRACKS = ['position', 'rotation', 'scale', 'visibility', 'material'] as const

export const MIN_HEIGHT = 140
export const DEFAULT_HEIGHT = 200
export const TRACK_HEIGHT = 36
export const RULER_HEIGHT = 28
export const LABEL_WIDTH = 128

export const PANEL_SURFACE = 'var(--aethel-panel-strong)'
export const PANEL_BORDER = 'var(--aethel-border-secondary)'
export const PANEL_BORDER_SUBTLE = 'var(--aethel-border-subtle)'
export const GLASS_SURFACE = 'var(--aethel-glass-bg)'
export const TEXT_PRIMARY = 'var(--aethel-text-primary)'
export const TEXT_SECONDARY = 'var(--aethel-text-secondary)'
export const TEXT_TERTIARY = 'var(--aethel-text-tertiary)'
export const TEXT_QUATERNARY = 'var(--aethel-text-quaternary)'
export const TEXT_INVERSE = 'var(--aethel-text-inverse)'
export const MUTED_ICON = 'color-mix(in srgb, var(--aethel-text-tertiary) 60%, transparent)'
export const MUTED_ICON_SOFT = 'color-mix(in srgb, var(--aethel-text-tertiary) 50%, transparent)'
export const MUTED_ICON_FAINT = 'color-mix(in srgb, var(--aethel-text-tertiary) 40%, transparent)'
export const MUTED_DIVIDER = 'color-mix(in srgb, var(--aethel-text-tertiary) 30%, transparent)'
export const ICON_HOVER_BG = 'color-mix(in srgb, var(--aethel-text-tertiary) 8%, transparent)'
export const ICON_HOVER_BG_SOFT = 'color-mix(in srgb, var(--aethel-text-tertiary) 6%, transparent)'
export const RESIZE_GRIP = 'color-mix(in srgb, var(--aethel-text-tertiary) 20%, transparent)'
export const PRIMARY_LIGHT = 'var(--aethel-primary-light)'
export const PRIMARY_SOFT_BG = 'rgba(var(--aethel-primary-rgb), 0.12)'
export const PRIMARY_MENU_BG = 'rgba(var(--aethel-primary-rgb), 0.1)'
export const LOOP_ACTIVE = 'var(--aethel-primary-light)'
export const SHADOW_MENU = '0 8px 24px color-mix(in srgb, var(--aethel-brand-pure-black) 60%, transparent)'
export const SHADOW_TOOLTIP =
  '0 4px 20px color-mix(in srgb, var(--aethel-brand-pure-black) 60%, transparent), 0 0 0 1px color-mix(in srgb, var(--aethel-text-inverse) 4%, transparent) inset'

export function trackRgba(cfg: TimelineTrackConfig, alpha: number): string {
  return `rgba(var(${cfg.rgbVar}), ${alpha})`
}

export function trackBorder(cfg: TimelineTrackConfig, alpha: number): string {
  return `1px solid ${trackRgba(cfg, alpha)}`
}

/** Resolve a `--aethel-*` custom property to a concrete color for Canvas2D. */
export function resolveToken(varName: string): string {
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

/** Resolve `var(--aethel-*)` or any CSS color to a canvas-safe `rgb()/rgba()` string. */
export function resolveCssColor(cssColor: string): string {
  if (typeof document === 'undefined') return cssColor
  const match = /^var\((--[\w-]+)\)$/.exec(cssColor.trim())
  if (match) {
    const raw = resolveToken(match[1])
    if (raw) return raw
  }
  const probe = document.createElement('span')
  probe.style.color = cssColor
  document.documentElement.appendChild(probe)
  const resolved = getComputedStyle(probe).color
  probe.remove()
  return resolved || cssColor
}

export function canvasRgba(rgbVar: string, alpha: number): string {
  const channels = resolveToken(rgbVar)
  return channels ? `rgba(${channels}, ${alpha})` : 'transparent'
}

export function canvasColorWithAlpha(cssColor: string, alpha: number): string {
  const resolved = resolveCssColor(cssColor)
  const m = resolved.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i)
  if (!m) return resolved
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${alpha})`
}

export function formatTimecode(seconds: number, fps = 24): string {
  const total = Math.max(0, seconds)
  const m = Math.floor(total / 60)
  const s = Math.floor(total % 60)
  const frames = Math.floor((total % 1) * fps)
  const pad = (n: number, d = 2) => String(n).padStart(d, '0')
  return `${pad(m)}:${pad(s)}:${pad(frames)}`
}

export function drawDiamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  glow: string,
  hovered: boolean,
  selected: boolean,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 4)

  if (hovered || selected) {
    ctx.shadowColor = glow
    ctx.shadowBlur = hovered ? 14 : 8
  }

  if (selected) {
    ctx.fillStyle = canvasColorWithAlpha(color, 0.19)
    ctx.fillRect(-(size + 4) / 2, -(size + 4) / 2, size + 4, size + 4)
  }

  ctx.fillStyle = hovered ? resolveCssColor(TEXT_INVERSE) || TEXT_INVERSE : color
  ctx.fillRect(-size / 2, -size / 2, size, size)
  ctx.restore()
}
