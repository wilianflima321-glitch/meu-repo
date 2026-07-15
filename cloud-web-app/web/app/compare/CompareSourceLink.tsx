import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import type { ComparisonLink } from './comparison-content'

export function CompareSourceLink({ href, label, external = false }: ComparisonLink) {
  const className =
    'inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-3 py-1.5 text-[11px] font-medium text-[var(--aethel-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:text-[var(--aethel-text-primary)]'

  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {label}
        <ArrowRight className="h-3 w-3" />
      </a>
    )
  }

  return (
    <Link href={href} className={className}>
      {label}
      <ArrowRight className="h-3 w-3" />
    </Link>
  )
}
