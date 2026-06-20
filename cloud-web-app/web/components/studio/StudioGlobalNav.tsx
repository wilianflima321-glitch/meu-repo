'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import MaturityBadge from '@/components/ui/MaturityBadge'
import { isNavLinkActive, STUDIO_PRIMARY_LINKS, STUDIO_SECONDARY_LINKS } from '@/lib/navigation/surfaces'
import { useBrowserPathname } from '@/lib/navigation/use-browser-pathname'

type StudioGlobalNavProps = {
  title?: string
  subtitle?: string
  rightSlot?: ReactNode
  className?: string
  compact?: boolean
}

function linkClass(active: boolean): string {
  return active
    ? 'inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,var(--aethel-surface-secondary))] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-primary)]'
    : 'inline-flex items-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] hover:text-[var(--aethel-text-primary)]'
}

function NavLinkRow({
  links,
  pathname,
}: {
  links: typeof STUDIO_PRIMARY_LINKS
  pathname: string
}) {
  return (
    <>
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={linkClass(isNavLinkActive(pathname, link))}
        >
          <span>{link.label}</span>
          <MaturityBadge path={link.href} compact />
        </Link>
      ))}
    </>
  )
}

export default function StudioGlobalNav({ title, subtitle, rightSlot, className = '', compact = false }: StudioGlobalNavProps) {
  const pathname = useBrowserPathname() ?? ''

  return (
    <header className={`sticky top-0 z-40 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_94%,transparent)] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.22)] ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)]">
                  Aethel
                </Link>
                <span className="rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
                  Cloud Studio
                </span>
              </div>
              {title ? <h1 className="mt-2 text-lg font-semibold text-[var(--aethel-text-primary)] sm:text-xl">{title}</h1> : null}
              {subtitle ? <p className="mt-0.5 max-w-2xl text-xs text-[var(--aethel-text-tertiary)] sm:text-sm">{subtitle}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!compact ? <NavLinkRow links={STUDIO_SECONDARY_LINKS} pathname={pathname} /> : null}
              {rightSlot}
            </div>
          </div>

          {!compact ? (
            <nav aria-label="Studio primary navigation" className="block overflow-x-auto pb-1 no-scrollbar">
              <div className="flex min-w-max items-center gap-2">
                <NavLinkRow links={STUDIO_PRIMARY_LINKS} pathname={pathname} />
              </div>
            </nav>
          ) : null}
        </div>
      </div>
    </header>
  )
}
