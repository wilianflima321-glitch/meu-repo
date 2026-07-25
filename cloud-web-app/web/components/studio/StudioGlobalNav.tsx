'use client'

import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
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

/** Breadcrumb: derive trail from pathname segments */
function Breadcrumb({ pathname }: { pathname: string }) {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length === 0) return null

  return (
    <nav aria-label="breadcrumb" className="flex items-center gap-1 text-[10px] font-mono text-[var(--aethel-text-tertiary)]">
      <Link href="/" className="hover:text-[var(--aethel-text-primary)] transition-colors">
        Aethel
      </Link>
      {segments.map((seg, i) => {
        const href = '/' + segments.slice(0, i + 1).join('/')
        const isLast = i === segments.length - 1
        return (
          <span key={href} className="flex items-center gap-1">
            <span className="opacity-30">/</span>
            {isLast ? (
              <span className="text-[var(--aethel-text-secondary)] font-semibold capitalize">
                {seg.replace(/-/g, ' ')}
              </span>
            ) : (
              <Link href={href} className="hover:text-[var(--aethel-text-primary)] transition-colors capitalize">
                {seg.replace(/-/g, ' ')}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}

/** Command Palette trigger button (Ctrl+P / ⌘P) */
function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Command Palette (Ctrl+P)"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1.5 text-[10px] font-mono font-semibold text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] transition-all"
      >
        <Search className="h-3 w-3" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline opacity-50 text-[9px]">Ctrl+P</kbd>
      </button>

      {/* Minimal Command Palette Modal */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-24 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] shadow-[var(--aethel-shadow-xl,0_16px_40px_rgb(0_0_0/0.7))] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[var(--aethel-border-primary)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--aethel-text-tertiary)] shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Buscar páginas, comandos, configurações..."
                className="flex-1 bg-transparent text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-tertiary)] outline-none font-mono"
              />
              <kbd className="text-[10px] font-mono text-[var(--aethel-text-tertiary)] border border-[var(--aethel-border-primary)] rounded px-1.5 py-0.5">Esc</kbd>
            </div>
            <div className="p-2">
              {STUDIO_PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] hover:text-[var(--aethel-text-primary)] transition-colors font-mono"
                >
                  <span className="text-[var(--aethel-text-tertiary)] text-xs uppercase tracking-wider w-20 shrink-0">
                    Página
                  </span>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function StudioGlobalNav({ title, subtitle, rightSlot, className = '', compact = false }: StudioGlobalNavProps) {
  const pathname = useBrowserPathname() ?? ''

  return (
    <header className={`sticky top-0 z-40 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_94%,transparent)] shadow-[var(--aethel-shadow-lg)] backdrop-blur-xl ${className}`}>
      <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex flex-col gap-1">
              {/* P5: Breadcrumb trail */}
              <Breadcrumb pathname={pathname} />
              {title ? <h1 className="mt-1 text-lg font-semibold text-[var(--aethel-text-primary)] sm:text-xl">{title}</h1> : null}
              {subtitle ? <p className="mt-0.5 max-w-2xl text-xs text-[var(--aethel-text-tertiary)] sm:text-sm">{subtitle}</p> : null}
            </div>
            <div className="hidden flex-wrap items-center gap-2 md:flex">
              {/* P5: Command Palette trigger always visible */}
              <CommandPaletteTrigger />
              {!compact ? <NavLinkRow links={STUDIO_SECONDARY_LINKS} pathname={pathname} /> : null}
              {rightSlot}
            </div>
          </div>

          {!compact ? (
            <nav aria-label="Studio primary navigation" className="hidden overflow-x-auto pb-1 md:block no-scrollbar">
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

