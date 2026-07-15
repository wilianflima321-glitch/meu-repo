'use client'

/**
 * ActiveContextBadge — the "AI knows what you're looking at" indicator.
 *
 * Placed at the top of the AI Chat header to show the user what context
 * the AI will receive with the next message. All colours reference
 * --aethel-* design tokens — no raw hex values.
 */

import { Code2, Cpu, GitBranch, Globe2, Layers3 } from 'lucide-react'
import type { ReactNode } from 'react'

export type ContextKind = 'viewport' | 'code' | 'node' | 'scene' | 'custom'

export interface ActiveContextItem {
  kind: ContextKind
  label: string
  /** Optional secondary detail (e.g. line number, property name) */
  detail?: string
}

const KIND_META: Record<
  ContextKind,
  { icon: ReactNode; colorToken: string; bgToken: string; borderToken: string; glowToken: string }
> = {
  viewport: {
    icon: <Layers3 className="h-3 w-3" />,
    colorToken:  'var(--aethel-neon-cyan)',
    bgToken:     'color-mix(in srgb, var(--aethel-neon-cyan) 8%, transparent)',
    borderToken: 'color-mix(in srgb, var(--aethel-neon-cyan) 28%, transparent)',
    glowToken:   '0 0 8px color-mix(in srgb, var(--aethel-neon-cyan) 18%, transparent)',
  },
  code: {
    icon: <Code2 className="h-3 w-3" />,
    colorToken:  'var(--aethel-accent)',
    bgToken:     'color-mix(in srgb, var(--aethel-accent) 8%, transparent)',
    borderToken: 'color-mix(in srgb, var(--aethel-accent) 28%, transparent)',
    glowToken:   '0 0 8px color-mix(in srgb, var(--aethel-accent) 18%, transparent)',
  },
  node: {
    icon: <GitBranch className="h-3 w-3" />,
    colorToken:  'var(--aethel-info)',
    bgToken:     'color-mix(in srgb, var(--aethel-info) 8%, transparent)',
    borderToken: 'color-mix(in srgb, var(--aethel-info) 28%, transparent)',
    glowToken:   '0 0 8px color-mix(in srgb, var(--aethel-info) 18%, transparent)',
  },
  scene: {
    icon: <Globe2 className="h-3 w-3" />,
    colorToken:  'var(--aethel-success)',
    bgToken:     'color-mix(in srgb, var(--aethel-success) 8%, transparent)',
    borderToken: 'color-mix(in srgb, var(--aethel-success) 28%, transparent)',
    glowToken:   '0 0 8px color-mix(in srgb, var(--aethel-success) 18%, transparent)',
  },
  custom: {
    icon: <Cpu className="h-3 w-3" />,
    colorToken:  'var(--aethel-warning)',
    bgToken:     'color-mix(in srgb, var(--aethel-warning) 8%, transparent)',
    borderToken: 'color-mix(in srgb, var(--aethel-warning) 28%, transparent)',
    glowToken:   '0 0 8px color-mix(in srgb, var(--aethel-warning) 18%, transparent)',
  },
}

interface ActiveContextBadgeProps {
  items: ActiveContextItem[]
  /** Compact mode — shows only the first item */
  compact?: boolean
  className?: string
}

export function ActiveContextBadge({ items, compact = false, className = '' }: ActiveContextBadgeProps) {
  if (!items.length) return null

  const visible = compact ? items.slice(0, 1) : items

  return (
    <div
      className={`flex items-center gap-1.5 overflow-hidden px-3 py-1.5 ${className}`}
      role="status"
      aria-label="Active editor context for AI"
    >
      {/* "AI Context" label */}
      <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.18em] text-[var(--aethel-text-quaternary)]">
        AI context
      </span>

      {/* Context chips */}
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
        {visible.map((item, i) => {
          const meta = KIND_META[item.kind]
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 overflow-hidden rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{
                color: meta.colorToken,
                background: meta.bgToken,
                border: `1px solid ${meta.borderToken}`,
                boxShadow: meta.glowToken,
                clipPath: 'polygon(0 0,calc(100% - 4px) 0,100% 4px,100% 100%,0 100%)',
                maxWidth: 160,
              }}
              title={item.detail ? `${item.label} — ${item.detail}` : item.label}
            >
              <span className="shrink-0" style={{ color: meta.colorToken }}>{meta.icon}</span>
              <span className="truncate">{item.label}</span>
              {item.detail && (
                <span className="shrink-0 truncate opacity-60">:{item.detail}</span>
              )}
            </span>
          )
        })}

        {compact && items.length > 1 && (
          <span className="text-[9px] text-[var(--aethel-text-quaternary)]">
            +{items.length - 1}
          </span>
        )}
      </div>

      {/* Ambient pulse dot — shows AI is "aware" */}
      <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--aethel-neon-cyan)] opacity-40" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--aethel-neon-cyan)] opacity-80" />
      </span>
    </div>
  )
}
