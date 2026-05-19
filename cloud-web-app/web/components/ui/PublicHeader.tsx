'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Menu, Search, X } from 'lucide-react'
import { PUBLIC_NAV_LINKS } from '@/lib/navigation/surfaces'

const PRIMARY_LINKS = PUBLIC_NAV_LINKS.slice(0, 5)
const SECONDARY_LINKS = PUBLIC_NAV_LINKS.slice(5)

function isActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
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

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--aethel-border-primary)] bg-[rgba(8,10,16,0.86)] shadow-[0_18px_70px_rgba(2,6,23,0.26)] backdrop-blur-xl">
        <nav aria-label="Primary navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="Aethel home" className="group inline-flex min-w-0 items-center gap-3 rounded-2xl pr-2 text-[var(--aethel-text-primary)] outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--aethel-focus)]">
            <Image src="/branding/aethel-icon-source.png" alt="" width={32} height={32} sizes="32px" className="rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] p-1" priority />
            <span className="hidden items-center gap-2 sm:inline-flex">
              <span className="text-sm font-semibold tracking-[-0.02em]">Aethel</span>
              <span className="rounded-full border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--aethel-info-light)]">
                Studio
              </span>
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
                  className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                    active
                      ? 'bg-[color-mix(in_srgb,var(--aethel-info)_13%,transparent)] text-[var(--aethel-text-primary)]'
                      : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_52%,transparent)] hover:text-[var(--aethel-text-primary)]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/docs"
              className="inline-flex h-10 items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_62%,transparent)] px-3 text-sm text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              <Search className="h-3.5 w-3.5" />
              Docs
            </Link>
            <Link
              href="/login"
              className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--aethel-border-subtle)] px-4 text-sm font-semibold text-[var(--aethel-text-secondary)] transition hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]"
            >
              Sign in
            </Link>
            <Link
              href="/dashboard?onboarding=1&source=header"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] px-4 text-sm font-semibold text-[var(--aethel-text-primary)] shadow-lg shadow-[color-mix(in_srgb,var(--aethel-primary)_24%,transparent)] transition hover:brightness-110"
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
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_72%,transparent)] text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)] md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </nav>

        {mobileOpen ? (
          <div className="border-t border-[var(--aethel-border-primary)] bg-[rgba(8,10,16,0.96)] px-4 py-4 shadow-2xl md:hidden">
            <div className="grid gap-2">
              {[...PRIMARY_LINKS, ...SECONDARY_LINKS].map((link) => {
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
              <Link
                href="/dashboard?onboarding=1&source=mobile-header"
                onClick={() => setMobileOpen(false)}
                className="mt-2 inline-flex h-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--aethel-primary),var(--aethel-info))] text-sm font-semibold text-[var(--aethel-text-primary)]"
              >
                Start a mission
              </Link>
            </div>
          </div>
        ) : null}
      </header>
      <div className="h-16" aria-hidden="true" />
    </>
  )
}
