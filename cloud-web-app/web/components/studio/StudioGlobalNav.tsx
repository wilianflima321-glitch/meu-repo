'use client'

import React, { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  Box,
  ChevronRight,
  Cpu,
  Layers,
  Search,
  SunMedium,
  Terminal,
  Zap,
} from 'lucide-react'
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

/** Command Palette — Cursor Pro / Linear level (Ctrl+K / Ctrl+P) */

// ── Static engine commands wired to the briefing spec categories ───────────

const PALETTE_COMMANDS = [
  // Engine Actions
  { id: 'engine.buildLights', label: 'Build Lights', category: 'Engine', shortcut: null, icon: SunMedium, href: null },
  { id: 'engine.recalcPhysics', label: 'Recalculate Physics World', category: 'Engine', shortcut: null, icon: Cpu, href: null },
  { id: 'engine.toggleProfiler', label: 'Toggle GPU Profiler HUD', category: 'Engine', shortcut: null, icon: Zap, href: null },
  { id: 'engine.exportUSD', label: 'Export Scene as USD', category: 'Engine', shortcut: null, icon: Layers, href: null },
  // Actor creation
  { id: 'spawn.cube', label: 'Spawn Cube Primitive', category: 'Actor', shortcut: 'Shift+A', icon: Box, href: null },
  { id: 'spawn.sphere', label: 'Spawn Sphere Primitive', category: 'Actor', shortcut: 'Shift+A', icon: Box, href: null },
  { id: 'spawn.directionalLight', label: 'Spawn Directional Light', category: 'Actor', shortcut: 'Shift+A', icon: SunMedium, href: null },
  { id: 'spawn.camera', label: 'Spawn Camera 16:9', category: 'Actor', shortcut: 'Shift+A', icon: Box, href: null },
  { id: 'spawn.audio', label: 'Create Audio Emitter', category: 'Actor', shortcut: 'Shift+A', icon: Box, href: null },
  // Navigation
  { id: 'nav.studio', label: 'Go to Studio', category: 'Navigate', shortcut: null, icon: Terminal, href: '/studio' },
  { id: 'nav.marketplace', label: 'Go to Marketplace', category: 'Navigate', shortcut: null, icon: Terminal, href: '/marketplace' },
  { id: 'nav.arcade', label: 'Go to Arcade', category: 'Navigate', shortcut: null, icon: Terminal, href: '/arcade' },
  { id: 'nav.settings', label: 'Go to Settings', category: 'Navigate', shortcut: null, icon: Terminal, href: '/settings' },
  // AI Agents
  { id: 'ai.worldForge', label: 'Acionar World Forge Agent', category: 'AI Agent', shortcut: null, icon: Zap, href: null },
  { id: 'ai.qaCritic', label: 'Executar QA Critic Audit', category: 'AI Agent', shortcut: null, icon: Zap, href: null },
] as const

type PaletteCommand = (typeof PALETTE_COMMANDS)[number]

const CATEGORY_ORDER: PaletteCommand['category'][] = ['Engine', 'Actor', 'Navigate', 'AI Agent']

const CATEGORY_COLORS: Record<PaletteCommand['category'], string> = {
  Engine: 'text-[var(--aethel-warning)]',
  Actor: 'text-[var(--aethel-primary)]',
  Navigate: 'text-[var(--aethel-neon-cyan)]',
  'AI Agent': 'text-[var(--aethel-success)]',
}

function fuzzyMatch(query: string, target: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const t = target.toLowerCase()
  if (t.includes(q)) return true
  // character-by-character fuzzy
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++
  }
  return qi === q.length
}

function CommandPaletteTrigger() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const filtered = PALETTE_COMMANDS.filter(
    (cmd) => fuzzyMatch(query, cmd.label) || fuzzyMatch(query, cmd.category),
  )

  // Group by category maintaining CATEGORY_ORDER
  const grouped = CATEGORY_ORDER.reduce<Record<string, PaletteCommand[]>>((acc, cat) => {
    const cmds = filtered.filter((c) => c.category === cat)
    if (cmds.length > 0) acc[cat] = cmds
    return acc
  }, {})

  const flatFiltered = Object.values(grouped).flat()

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault()
        setOpen((v) => !v)
        setQuery('')
        setActiveIndex(0)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // Keyboard navigation inside open palette
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        const cmd = flatFiltered[activeIndex]
        if (cmd?.href) {
          window.location.href = cmd.href
          setOpen(false)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, flatFiltered, activeIndex])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  let flatIndex = 0

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setQuery(''); setActiveIndex(0); }}
        aria-label="Open command palette (Ctrl+K)"
        title="Ctrl+K — search everything"
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-2.5 py-1.5 text-[10px] font-mono font-semibold text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] transition-all"
      >
        <Search className="h-3 w-3" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:inline opacity-50 text-[9px]">Ctrl+K</kbd>
      </button>

      {/* Command Palette Modal */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="fixed inset-0 z-[200] flex items-start justify-center pt-20 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] shadow-[0_24px_80px_rgb(0_0_0/0.8)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-[var(--aethel-border-subtle)] px-4 py-3.5">
              <Search className="h-4 w-4 text-[var(--aethel-text-tertiary)] shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands, actors, pages, agents..."
                className="flex-1 bg-transparent text-sm text-[var(--aethel-text-primary)] placeholder:text-[var(--aethel-text-quaternary)] outline-none"
              />
              <kbd className="shrink-0 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--aethel-text-tertiary)]">
                Esc
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-96 overflow-auto p-2">
              {flatFiltered.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-[var(--aethel-text-quaternary)]">
                  No commands match <span className="font-mono text-[var(--aethel-text-secondary)]">&quot;{query}&quot;</span>
                </div>
              ) : (
                Object.entries(grouped).map(([cat, cmds]) => (
                  <div key={cat} className="mb-1">
                    {/* Category header */}
                    <div className="mb-1 px-3 pt-2 pb-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${CATEGORY_COLORS[cat as PaletteCommand['category']]}`}>
                        {cat}
                      </span>
                    </div>
                    {cmds.map((cmd) => {
                      const isActive = flatIndex === activeIndex
                      const Icon = cmd.icon
                      const idx = flatIndex++
                      return (
                        <button
                          key={cmd.id}
                          type="button"
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => {
                            if (cmd.href) window.location.href = cmd.href
                            setOpen(false)
                          }}
                          className={[
                            'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors',
                            isActive
                              ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_15%,transparent)] text-[var(--aethel-text-primary)]'
                              : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)]',
                          ].join(' ')}
                        >
                          <Icon className={`h-4 w-4 shrink-0 ${CATEGORY_COLORS[cat as PaletteCommand['category']]}`} />
                          <span className="flex-1 font-medium">{cmd.label}</span>
                          {cmd.shortcut && (
                            <kbd className="shrink-0 rounded border border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-secondary)] px-1.5 py-0.5 font-mono text-[9px] text-[var(--aethel-text-quaternary)]">
                              {cmd.shortcut}
                            </kbd>
                          )}
                          {cmd.href && (
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-3 border-t border-[var(--aethel-border-subtle)] px-4 py-2 text-[10px] text-[var(--aethel-text-quaternary)]">
              <span><kbd className="font-mono">↑↓</kbd> navigate</span>
              <span><kbd className="font-mono">Enter</kbd> open</span>
              <span><kbd className="font-mono">Esc</kbd> close</span>
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

