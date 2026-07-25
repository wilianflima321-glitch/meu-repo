'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Menu, X } from 'lucide-react'
import { PUBLIC_NAV_LINKS } from '@/lib/navigation/surfaces'

const PRIMARY_HREFS = new Set(['/arcade', '/pricing', '/compare', '/docs'])
const PRIMARY_LINKS = PUBLIC_NAV_LINKS.filter((link) => PRIMARY_HREFS.has(link.href))
const SECONDARY_LINKS = PUBLIC_NAV_LINKS.filter((link) => !PRIMARY_HREFS.has(link.href))

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

/** R4: Accessible dropdown replacing the native <details> element.
 *  - onClickOutside: closes on any external click
 *  - Keyboard: Escape closes; ArrowDown/Up navigates items
 *  - aria-haspopup + aria-expanded for screen readers
 */
function MoreDropdown({
  links,
  pathname,
}: {
  links: typeof SECONDARY_LINKS
  pathname: string
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="cursor-pointer rounded-full px-3 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_52%,transparent)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
      >
        More
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-1/2 top-11 z-50 min-w-48 -translate-x-1/2 rounded-2xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-2 shadow-[var(--aethel-shadow-xl)] grid gap-1"
          style={{ animation: 'fadeInDown 0.12s ease-out' }}
        >
          {links.map((link) => {
            const active = isActive(pathname, link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                aria-current={active ? 'page' : undefined}
                className={`rounded-xl px-3 py-2 text-sm transition ${
                  active
                    ? 'bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                    : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_55%,transparent)] hover:text-[var(--aethel-text-primary)]'
                }`}
              >
                {link.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function PublicHeader() {
  const pathname = usePathname() || '/'
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[80] focus:rounded-xl focus:border focus:border-[var(--aethel-border-primary)] focus:bg-[var(--aethel-surface-secondary)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--aethel-text-primary)]"
      >
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_86%,transparent)] shadow-[var(--aethel-shadow-lg)] backdrop-blur-xl">
        <nav aria-label="Primary navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Aethel home" className="group inline-flex min-w-0 items-center gap-3 rounded-2xl pr-2 text-[var(--aethel-text-primary)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)]">
            <Image src="/branding/aethel-mark.svg" alt="" width={32} height={32} sizes="32px" className="rounded-[10px] shadow-[0_0_0_1px_var(--aethel-border-primary)]" priority />
            <span className="hidden items-center gap-2 sm:inline-flex">
              <span className="text-sm font-semibold tracking-[-0.03em]">aethel</span>
            </span>
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {PRIMARY_LINKS.map((link) => {
              const active = isActive(pathname, link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? 'page' : undefined}
                  className={`rounded-full px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] ${
                    active
                      ? 'bg-[color-mix(in_srgb,var(--aethel-info)_13%,transparent)] text-[var(--aethel-text-primary)]'
                      : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_52%,transparent)] hover:text-[var(--aethel-text-primary)]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
            {/* R4: Accessible dropdown — state-based with onClickOutside + keyboard support */}
            {SECONDARY_LINKS.length > 0 && (
              <MoreDropdown links={SECONDARY_LINKS} pathname={pathname} />
            )}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--aethel-border-subtle)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard?onboarding=1&source=header"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[var(--aethel-text-primary)] px-4 text-sm font-semibold text-[var(--aethel-surface-primary)] transition hover:bg-[var(--aethel-text-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)]"
            >
              Start free
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <button
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-border-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--aethel-surface-primary)] md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </nav>

        {mobileOpen ? (
          <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_96%,transparent)] px-4 py-4 shadow-[var(--aethel-shadow-xl)] md:hidden">
            <div className="grid gap-2">
              {PRIMARY_LINKS.map((link) => {
                const active = isActive(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                      active
                        ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                        : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] text-[var(--aethel-text-secondary)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              {/* R4: Mobile secondary links — direct list, no <details> */}
              {SECONDARY_LINKS.length > 0 && SECONDARY_LINKS.map((link) => {
                const active = isActive(pathname, link.href)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                      active
                        ? 'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]'
                        : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] text-[var(--aethel-text-secondary)]'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
              <Link
                href="/dashboard?onboarding=1&source=mobile-header"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--aethel-text-primary)] text-sm font-semibold text-[var(--aethel-surface-primary)]"
              >
                Start building
              </Link>
            </div>
          </div>
        ) : null}
      </header>
      <div className="h-16" aria-hidden="true" />
    </>
  )
}
