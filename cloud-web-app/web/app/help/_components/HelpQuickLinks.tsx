import Link from 'next/link'
import { helpIcons } from './help-icons'
import type { HelpQuickLink } from './help-types'

const toneClasses: Record<HelpQuickLink['tone'], string> = {
  primary:
    'text-[var(--aethel-info-light)] hover:border-[color-mix(in_srgb,var(--aethel-info)_35%,transparent)]',
  success:
    'text-[var(--aethel-success-light)] hover:border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)]',
  warning:
    'text-[var(--aethel-warning-light)] hover:border-[color-mix(in_srgb,var(--aethel-warning)_35%,transparent)]',
  info: 'text-[var(--aethel-accent-light)] hover:border-[color-mix(in_srgb,var(--aethel-accent)_35%,transparent)]',
}

export function HelpQuickLinks({ links }: { links: HelpQuickLink[] }) {
  const visibleLinks = links.slice(0, 3)
  const hiddenLinks = links.slice(3)

  const renderLink = (link: HelpQuickLink) => {
    const Icon = helpIcons[link.icon]
    return (
      <Link
        key={link.href}
        href={link.href}
        target={link.external ? '_blank' : undefined}
        className={`group inline-flex min-h-11 items-center gap-2 border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_48%,transparent)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_76%,transparent)] ${toneClasses[link.tone]}`}
        title={link.description}
      >
        <Icon className="h-4 w-4" />
        <span className="text-[var(--aethel-text-primary)] group-hover:text-current">
          {link.title}
        </span>
        <span className="sr-only">{link.description}</span>
      </Link>
    )
  }

  return (
    <section className="mx-auto mt-10 max-w-5xl px-6">
      <div className="flex flex-wrap justify-center gap-2 border-y border-[var(--aethel-border-subtle)] py-4">
        {visibleLinks.map(renderLink)}
        {hiddenLinks.length > 0 ? (
          <details className="inline-flex min-h-11 items-center border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_36%,transparent)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)]">
            <summary className="cursor-pointer list-none">More help</summary>
            <div className="mt-3 flex flex-wrap gap-2">
              {hiddenLinks.map(renderLink)}
            </div>
          </details>
        ) : null}
      </div>
    </section>
  )
}
