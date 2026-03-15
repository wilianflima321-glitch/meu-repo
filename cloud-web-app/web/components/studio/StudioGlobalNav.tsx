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
    ? 'rounded-xl border border-sky-400/30 bg-[linear-gradient(135deg,rgba(79,70,229,0.35),rgba(14,165,233,0.2))] px-3 py-2 text-sm font-medium text-slate-100'
    : 'rounded-xl border border-transparent px-3 py-2 text-sm font-medium text-zinc-400 hover:border-white/10 hover:bg-white/[0.06] hover:text-zinc-100'
}

export default function StudioGlobalNav({ title, subtitle, rightSlot, className = '' }: StudioGlobalNavProps) {
  const pathname = usePathname()

  return (
    <header className={`sticky top-0 z-40 border-b border-white/10 bg-[linear-gradient(180deg,rgba(15,18,26,0.96),rgba(9,11,16,0.98))] backdrop-blur-xl shadow-[0_12px_40px_rgba(0,0,0,0.35)] ${className}`}>
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
