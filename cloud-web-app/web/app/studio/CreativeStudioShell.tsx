'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import StudioLayout from '@/components/studio/StudioLayout'
import { isNavLinkActive, STUDIO_PRIMARY_LINKS } from '@/lib/navigation/surfaces'
import { useBrowserPathname } from '@/lib/navigation/use-browser-pathname'
import { CREATIVE_STUDIO_ROUTES } from './creative-studio-routes'

interface CreativeStudioShellProps {
  title: string
  subtitle: string
  activeHref?: string
  children: ReactNode
}

function topLinkClass(active: boolean): string {
  return active
    ? 'rounded-md border border-[color-mix(in_srgb,var(--aethel-info)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--aethel-info-light)]'
    : 'rounded-md border border-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]'
}

function creativeTabClass(active: boolean): string {
  return active
    ? 'border-[color-mix(in_srgb,var(--aethel-primary)_50%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
    : 'border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_45%,transparent)] text-[var(--aethel-text-tertiary)] hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)] hover:text-[var(--aethel-text-secondary)]'
}

export function CreativeStudioLoading({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-tertiary)]">
      <div className="flex items-center gap-3 rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_55%,transparent)] px-5 py-4 shadow-[0_18px_60px_rgba(0,0,0,0.24)]">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--aethel-border-secondary)] border-t-[var(--aethel-primary-light)]" />
        <span className="text-xs font-semibold uppercase tracking-[0.16em]">
          Loading {label}
        </span>
      </div>
    </div>
  )
}

export default function CreativeStudioShell({
  title,
  subtitle,
  activeHref,
  children,
}: CreativeStudioShellProps) {
  const pathname = useBrowserPathname()
  const currentHref = activeHref ?? pathname

  const actions = (
    <div className="flex items-center gap-2">
      <Link
        href="/ide"
        className="rounded-lg border border-[var(--aethel-border-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-secondary)] transition-colors hover:border-[var(--aethel-border-secondary)] hover:bg-[var(--aethel-surface-secondary)]"
      >
        Open IDE
      </Link>
      <Link
        href="/nexus"
        className="rounded-lg bg-[var(--aethel-primary-dark)] px-3 py-1.5 text-xs font-semibold text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-primary)]"
      >
        Operator
      </Link>
    </div>
  )

  return (
    <StudioLayout
      title={title}
      subtitle={subtitle}
      actions={actions}
      padded={false}
      maxWidth="full"
      className="flex h-[calc(100vh-116px)] flex-col overflow-hidden"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_74%,transparent)] px-4 py-2 lg:px-6">
        {STUDIO_PRIMARY_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className={topLinkClass(isNavLinkActive(pathname, link))}>
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] px-4 py-2 lg:px-6">
        <Link href="/studio" className={`${creativeTabClass(pathname === '/studio')} rounded-lg border px-3 py-1.5 text-xs font-semibold`}>
          Creative Hub
        </Link>
        {CREATIVE_STUDIO_ROUTES.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            className={`${creativeTabClass(currentHref === route.href || pathname === route.href)} rounded-lg border px-3 py-1.5 text-xs font-semibold`}
            title={route.description}
          >
            {route.shortLabel}
          </Link>
        ))}
      </div>

      <section className="min-h-0 flex-1 overflow-hidden">
        {children}
      </section>
    </StudioLayout>
  )
}
