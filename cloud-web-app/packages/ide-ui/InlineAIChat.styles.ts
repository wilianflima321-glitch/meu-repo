export const SURFACE_PRIMARY = 'var(--aethel-surface-primary)'
export const SURFACE_SECONDARY = 'var(--aethel-surface-secondary)'
export const SURFACE_TERTIARY = 'var(--aethel-surface-tertiary)'
export const SURFACE_QUATERNARY = 'var(--aethel-surface-quaternary)'
export const TEXT_PRIMARY = 'var(--aethel-text-primary)'
export const TEXT_SECONDARY = 'var(--aethel-text-secondary)'
export const TEXT_TERTIARY = 'var(--aethel-text-tertiary)'
export const TEXT_INVERSE = 'var(--aethel-text-primary)'
export const BORDER_PRIMARY = 'var(--aethel-border-primary)'
export const BORDER_SECONDARY = 'var(--aethel-border-secondary)'
export const BORDER_FOCUS = 'var(--aethel-border-focus)'
export const ACCENT_CYAN = 'var(--aethel-info)'
export const ACCENT_SUCCESS = 'var(--aethel-success-light)'
export const PRIMARY_GRADIENT = 'linear-gradient(135deg, var(--aethel-primary), var(--aethel-info))'
export const FOCUS_RING = '0 0 0 3px rgba(var(--aethel-info-rgb), 0.12)'

export const MESSAGE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
})

export const mixColor = (color: string, amount: number) =>
  `color-mix(in srgb, ${color} ${amount}%, transparent)`
