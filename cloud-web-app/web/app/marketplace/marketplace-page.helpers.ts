import type { Extension } from './marketplace-page.data'

export function isVerifiedExtension(extension: Extension) {
  return (
    extension.verified ?? extension.publisher.toLowerCase().includes('aethel')
  )
}

export function getExtensionBadge(extension: Extension) {
  const base = (extension.displayName || extension.name || '').trim()
  if (!base) return 'EXT'

  const parts = base.split(/\s+/).filter(Boolean)
  const initials = parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return initials || base.slice(0, 3).toUpperCase()
}

export function riskClass(risk: Extension['riskLevel']) {
  if (risk === 'high')
    return 'border-[color-mix(in_srgb,var(--aethel-error)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] text-[var(--aethel-error-light)]'
  if (risk === 'medium')
    return 'border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'

  return 'border-[color-mix(in_srgb,var(--aethel-success)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
}

export function riskTextClass(risk: Extension['riskLevel']) {
  if (risk === 'high') return 'text-[var(--aethel-error-light)]'
  if (risk === 'medium') return 'text-[var(--aethel-warning-light)]'

  return 'text-[var(--aethel-success-light)]'
}
