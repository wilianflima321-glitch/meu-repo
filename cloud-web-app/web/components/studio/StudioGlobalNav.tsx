'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isNavLinkActive, STUDIO_PRIMARY_LINKS, STUDIO_SECONDARY_LINKS } from '@/lib/navigation/surfaces'

type StudioGlobalNavProps = {
  title?: string
  subtitle?: string
  rightSlot?: ReactNode
  className?: string
}

function linkClass(active: boolean): string {
  return active
    ? 'rounded-xl border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-primary)_35%,transparent),color-mix(in_srgb,var(--aethel-info)_20%,transparent))] px-3 py-2 text-sm font-medium text-[var(--aethel-text-primary)]'
    : 'rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] hover:text-[var(--aethel-text-primary)]'
}

export default function StudioGlobalNav({ title, subtitle, rightSlot, className = '' }: StudioGlobalNavProps) {
  const pathname = usePathname()

  return (
    <header className={`sticky top-0 z-40 border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(180deg,rgba(15,18,26,0.96),rgba(9,11,16,0.98))] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-quaternary)] hover:text-[var(--aethel-text-secondary)]">
              Aethel Studio
            </Link>
            {title ? <h1 className="mt-1 text-lg font-semibold text-[var(--aethel-text-primary)] sm:text-xl">{title}</h1> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-[var(--aethel-text-tertiary)] sm:text-sm">{subtitle}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {STUDIO_SECONDARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(isNavLinkActive(pathname, link))}
              >
                {link.label}
              </Link>
            ))}
            {rightSlot}
          </div>
        </div>

        <nav aria-label="Navegacao principal do Studio" className="mt-3 overflow-x-auto pb-1">
          <div className="flex min-w-max items-center gap-2">
            {STUDIO_PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(isNavLinkActive(pathname, link))}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </header>
  )
}
