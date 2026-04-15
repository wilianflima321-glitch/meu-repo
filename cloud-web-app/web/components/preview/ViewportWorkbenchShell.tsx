'use client'

import type { ReactNode } from 'react'
import {
  AppWindow,
  Box,
  Film,
  Play,
  SlidersHorizontal,
  Sparkles,
  Wand2,
} from 'lucide-react'

type ViewportWorkbenchShellProps = {
  title: string
  subtitle: string
  mode: 'viewport' | 'canvas' | 'runtime'
  center: ReactNode
  left: ReactNode
  right: ReactNode
  bottom?: ReactNode
}

const modeMeta = {
  viewport: {
    label: 'Viewport 3D',
    icon: Box,
    accent:
      'border-[color-mix(in_srgb,var(--aethel-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]',
  },
  canvas: {
    label: 'Canvas Mode',
    icon: AppWindow,
    accent:
      'border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-info)_12%,transparent)] text-[var(--aethel-info-light)]',
  },
  runtime: {
    label: 'Live Runtime',
    icon: Film,
    accent:
      'border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]',
  },
} as const

const chipClass =
  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em]'

export function ViewportWorkbenchShell({
  title,
  subtitle,
  mode,
  center,
  left,
  right,
  bottom,
}: ViewportWorkbenchShellProps) {
  const meta = modeMeta[mode]
  const ModeIcon = meta.icon

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[var(--aethel-surface-primary)]">
      <div className="border-b border-[var(--aethel-border-primary)] bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.84),rgba(8,47,73,0.22))] px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`${chipClass} ${meta.accent}`}>
                <ModeIcon className="h-3.5 w-3.5" />
                {meta.label}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-text-tertiary)]">
                <Sparkles className="h-3.5 w-3.5" />
                AI contextual
              </span>
            </div>
            <h2 className="mt-3 text-base font-semibold text-[var(--aethel-text-primary)]">{title}</h2>
            <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">{subtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="Gerar asset no viewport"
              className="inline-flex items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:brightness-110"
            >
              <Wand2 className="h-4 w-4" />
              Generate
            </button>
            <button
              type="button"
              aria-label="Animar elemento selecionado"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]"
            >
              <Play className="h-4 w-4" />
              Animate
            </button>
            <button
              type="button"
              aria-label="Abrir ferramentas do inspetor"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)] px-3 py-2 text-xs font-medium text-[var(--aethel-text-primary)] transition hover:border-[var(--aethel-border-secondary)]"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Inspector
            </button>
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[240px,minmax(0,1fr),320px] overflow-hidden">
        <div className="min-h-0 border-r border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_42%,transparent)]">
          {left}
        </div>
        <div className="min-h-0 overflow-hidden bg-[linear-gradient(180deg,rgba(9,12,19,0.98),rgba(13,19,31,0.95))]">
          {center}
        </div>
        <div className="min-h-0 border-l border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_52%,transparent)]">
          {right}
        </div>
      </div>

      {bottom ? (
        <div className="border-t border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)]">
          {bottom}
        </div>
      ) : null}
    </div>
  )
}

