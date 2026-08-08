/**
 * Resolve CSS custom properties for canvas / xterm consumers that cannot
 * paint `var(--*)` directly. Hex literals live in `globals.css` only.
 */

export function cssVarRef(name: string): string {
  const token = name.startsWith('--') ? name : `--${name}`
  return `var(${token})`
}

/** Read a computed CSS custom property from `:root`. */
export function readCssVar(name: string, fallback = ''): string {
  const token = name.startsWith('--') ? name : `--${name}`
  if (typeof window === 'undefined') return fallback
  const value = window.getComputedStyle(window.document.documentElement).getPropertyValue(token).trim()
  return value || fallback
}

/**
 * Resolve `var(--token)` strings (or pass-through concrete colors) for
 * xterm / Canvas2D theme application.
 */
export function resolveCssColor(value: string, fallback = ''): string {
  const trimmed = value.trim()
  const match = /^var\(\s*(--[a-zA-Z0-9-_]+)\s*(?:,[^)]+)?\)$/.exec(trimmed)
  if (!match) return trimmed || fallback
  return readCssVar(match[1], fallback || trimmed)
}
