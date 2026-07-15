export function resolveCssVarColor(varName: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
  return value || fallback
}

export function resolveCssVarRgba(varName: string, alpha: number, fallback: string): string {
  const base = resolveCssVarColor(varName, fallback)
  if (base.startsWith('rgba(')) return base
  if (base.startsWith('rgb(')) {
    return base.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`)
  }
  if (base.startsWith('#')) {
    const hex = base.replace('#', '')
    const normalized = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex
    if (normalized.length === 6) {
      const r = parseInt(normalized.slice(0, 2), 16)
      const g = parseInt(normalized.slice(2, 4), 16)
      const b = parseInt(normalized.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }
  }
  return fallback
}
