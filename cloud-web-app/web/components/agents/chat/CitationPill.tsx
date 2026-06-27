'use client'

/**
 * CitationPill — inline clickable pill for source references [1], [2], etc.
 *
 * Renders a neon-styled number badge that shows a floating popover with
 * the source title and snippet on hover/focus.
 */

import { useEffect, useRef, useState } from 'react'
import { ExternalLink } from 'lucide-react'
// @aethel-heavy-async-boundary
import { AnimatePresence, motion } from 'framer-motion'

export interface CitationSource {
  index: number
  title: string
  url?: string
  snippet?: string
  /** Publication date or domain, shown as subtitle */
  subtitle?: string
}

interface CitationPillProps {
  source: CitationSource
}

export function CitationPill({ source }: CitationPillProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <span
      className="relative inline-block"
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {/* The pill number badge */}
      <button
        type="button"
        aria-label={`Source ${source.index}: ${source.title}`}
        aria-expanded={open}
        onClick={() => { if (source.url) window.open(source.url, '_blank', 'noopener') }}
        className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded px-1 text-[9px] font-bold transition-all"
        style={{
          background: 'rgba(0,229,255,0.10)',
          border: '1px solid rgba(0,229,255,0.30)',
          color: '#00e5ff',
          boxShadow: open ? '0 0 8px rgba(0,229,255,0.22)' : 'none',
          fontFamily: "'Geist Mono', monospace",
          verticalAlign: 'super',
          fontSize: 8,
          lineHeight: 1,
          cursor: source.url ? 'pointer' : 'default',
        }}
      >
        {source.index}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={popoverRef}
            key="citation-pop"
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute bottom-full left-1/2 z-50 mb-2 w-72 -translate-x-1/2 overflow-hidden rounded-xl"
            style={{
              background: 'rgba(2,6,23,0.95)',
              border: '1px solid rgba(0,229,255,0.22)',
              boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 0 16px rgba(0,229,255,0.08)',
              backdropFilter: 'blur(16px)',
            }}
            role="tooltip"
          >
            {/* Citation number header */}
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{ borderBottom: '1px solid rgba(0,229,255,0.10)' }}
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold"
                style={{ background: 'rgba(0,229,255,0.12)', color: '#00e5ff', border: '1px solid rgba(0,229,255,0.28)' }}
              >
                {source.index}
              </span>
              <span className="min-w-0 flex-1 truncate text-[11px] font-semibold text-[#e5e7eb]">
                {source.title}
              </span>
              {source.url && (
                <ExternalLink className="h-3 w-3 shrink-0 text-[#4b5563]" aria-hidden />
              )}
            </div>

            {/* Snippet */}
            {source.snippet && (
              <p className="line-clamp-3 px-3 py-2 text-[10px] leading-[1.6] text-[#6b7280]">
                {source.snippet}
              </p>
            )}

            {/* URL / subtitle */}
            {(source.url || source.subtitle) && (
              <div
                className="flex items-center justify-between px-3 py-1.5"
                style={{ borderTop: '1px solid rgba(0,229,255,0.08)' }}
              >
                <span className="truncate text-[9px] text-[#374151]">
                  {source.subtitle ?? new URL(source.url ?? 'https://example.com').hostname}
                </span>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-2 shrink-0 rounded border border-[rgba(0,229,255,0.18)] px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-[#00e5ff] transition hover:bg-[rgba(0,229,255,0.08)]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}

// ── Utility: parse [N] citation markers in a markdown string ─────────────────

/**
 * Replace `[1]`, `[2]` etc. in a text string with `<CitationPill>` components.
 * Returns an array of React nodes suitable for rendering inline.
 */
export function renderTextWithCitations(
  text: string,
  sources: CitationSource[],
): Array<string | React.ReactElement> {
  const parts = text.split(/(\[\d+\])/g)
  return parts.map((part, i) => {
    const match = /^\[(\d+)\]$/.exec(part)
    if (match) {
      const idx = parseInt(match[1] ?? '0', 10)
      const source = sources.find((s) => s.index === idx)
      if (source) {
        return <CitationPill key={i} source={source} />
      }
    }
    return part
  })
}
