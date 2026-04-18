'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { isNavLinkActive, PUBLIC_NAV_LINKS } from '@/lib/navigation/surfaces'

const headerGhostLinkClass =
  'inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3.5 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] hover:text-[var(--aethel-text-primary)]'

const headerPrimaryLinkClass =
  'inline-flex items-center justify-center rounded-xl bg-[var(--aethel-primary)] px-4 py-2 text-sm font-semibold text-[var(--aethel-text-primary)] transition-colors hover:bg-[var(--aethel-primary-dark)]'

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isStudioSurface = pathname.startsWith('/dashboard') || pathname.startsWith('/ide') || pathname.startsWith('/nexus')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
 scrolled
 ? 'border-b border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-2xl shadow-xl shadow-black/20'
 : 'bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-xl'
 }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Navegacao principal">
          <div className="flex items-center gap-3">
            <Link href="/" className="group flex items-center gap-2.5" aria-label="Aethel Engine - Pagina inicial">
              <Image
                src="/branding/aethel-icon-source.png"
                alt=""
                width={32}
                height={32}
                sizes="32px"
                className="rounded-lg transition-transform duration-200 group-hover:scale-105"
                priority
              />
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-[var(--aethel-text-primary)]">Aethel</span>
                <span className="hidden rounded-full border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-primary-light)] sm:inline-flex">
                  Studio
                </span>
              </div>
            </Link>
            <div className="hidden xl:flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--aethel-text-secondary)]">
              <span className="inline-flex h-2 w-2 rounded-full bg-[var(--aethel-success)]" />
              {isStudioSurface ? 'Surface ativa' : 'Apps + Pesquisa'}
            </div>
          </div>

          {/* Desktop nav */}
          <div className="hidden items-center gap-1 md:flex">
            {PUBLIC_NAV_LINKS.map((link) => {
              const isActive = isNavLinkActive(pathname, link)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
 isActive
 ? 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-primary)]'
 : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]'
 }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/contact-sales"
              className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-3.5 py-2 text-sm font-medium text-[var(--aethel-text-secondary)] transition-colors hover:border-[color-mix(in_srgb,var(--aethel-info)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-quaternary)_76%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              Falar com vendas
            </Link>
            <Link
              href="/login"
              className={headerGhostLinkClass}
            >
              Entrar
            </Link>
            <Link
              href="/dashboard?onboarding=1&source=header"
              className={headerPrimaryLinkClass}
            >
              Comecar gratis
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)] md:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            aria-label={mobileOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </nav>

        {/* Mobile menu */}
        <div
          id="mobile-menu"
          className={`border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent)] backdrop-blur-2xl transition-all duration-300 md:hidden ${
 mobileOpen ? 'max-h-[400px] opacity-100' : 'max-h-0 overflow-hidden opacity-0'
 }`}
        >
          <div className="space-y-1 px-4 py-4">
            {PUBLIC_NAV_LINKS.map((link) => {
              const isActive = isNavLinkActive(pathname, link)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
 isActive
 ? 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] text-[var(--aethel-text-primary)]'
 : 'text-[var(--aethel-text-tertiary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]'
 }`}
                >
                  {link.label}
                </Link>
              )
            })}
            <div className="my-3 h-px bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]" />
            <Link
              href="/contact-sales"
              className="block rounded-lg px-4 py-3 text-sm font-medium text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] hover:text-[var(--aethel-text-primary)]"
            >
              Falar com vendas
            </Link>
            <Link
              href="/login"
              className={`${headerGhostLinkClass} block px-4 py-3`}
            >
              Entrar
            </Link>
            <Link
              href="/dashboard?onboarding=1&source=header-mobile"
              className={`${headerPrimaryLinkClass} mt-2 block px-4 py-3 text-center`}
            >
              Comecar gratis
            </Link>
          </div>
        </div>
      </header>
      {/* Spacer to prevent content from being hidden behind fixed header */}
      <div className="h-16" />
    </>
  )
}
