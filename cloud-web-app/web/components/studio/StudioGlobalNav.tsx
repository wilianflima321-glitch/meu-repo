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
    ? 'rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-200'
    : 'rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-zinc-400 hover:border-zinc-700 hover:bg-zinc-900/70 hover:text-zinc-100'
}

export default function StudioGlobalNav({ title, subtitle, rightSlot, className = '' }: StudioGlobalNavProps) {
  const pathname = usePathname()

  return (
    <header className={`sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-xl ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <Link href="/dashboard" className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 hover:text-zinc-300">
              Aethel Studio
            </Link>
            {title ? <h1 className="mt-1 text-lg font-semibold text-zinc-100 sm:text-xl">{title}</h1> : null}
            {subtitle ? <p className="mt-0.5 text-xs text-zinc-400 sm:text-sm">{subtitle}</p> : null}
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
