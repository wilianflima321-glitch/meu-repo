'use client'

/**
 * MissionScopeSelector  -  Pre-flight Mission Scope Contracting (V24-004)
 *
 * PURPOSE: Before AI agents start spending credits, the user explicitly picks
 * their ambition level. Shows real cost estimates, agent limits, and
 * what evidence will be generated. Prevents surprise bills.
 *
 * DESIGN: Each scope card is a glass panel. The selected card gets a Quantum
 * Cyan glow. No checkboxes, no radio buttons  -  pure card selection.
 * HONESTY: Cost estimates are clearly marked "~estimate". Actual costs settle post-run.
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { MissionScope } from './StudioMissionControl'

// --- Types ---

export interface ScopeDefinition {
  id: MissionScope
  label: string
  tagline: string
  icon: string
  estimatedDays: string
  /** Rough credit cost range */
  estimatedCostRange: string
  agentLimit: number
  aiCallsPerRun: string
  deliverables: string[]
  limitations: string[]
  /** Visual highlight color */
  accentColor: string
}

interface MissionScopeSelectorProps {
  currentScope?: MissionScope
  onSelect: (scope: MissionScope) => void
  onConfirm: (scope: MissionScope) => void
  className?: string
}

// --- Data ---

const SCOPE_DEFS: ScopeDefinition[] = [
  {
    id: 'prototype',
    label: 'Prototype',
    tagline: 'Validate your loop fast',
    icon: '?',
    estimatedDays: '1 - 3 days',
    estimatedCostRange: '$0.10  -  $2',
    agentLimit: 3,
    aiCallsPerRun: '~50 - 200',
    deliverables: [
      '1 playable loop',
      'AI-draft assets (labeled)',
      'Basic performance log',
    ],
    limitations: [
      'Not production-ready',
      'Assets marked Draft  -  not Final',
      'No cinematic render',
    ],
    accentColor: 'var(--aethel-warning)',
  },
  {
    id: 'demo',
    label: 'Demo',
    tagline: 'Polished slice for stakeholders',
    icon: '??',
    estimatedDays: '1 - 2 weeks',
    estimatedCostRange: '$5  -  $40',
    agentLimit: 6,
    aiCallsPerRun: '~500 - 2k',
    deliverables: [
      'Curated / optimized assets',
      'Tutorial or intro flow',
      'Performance baseline report',
      'Deploy receipt',
    ],
    limitations: [
      'Human QA required before publish',
      'No full game progression',
    ],
    accentColor: 'var(--aethel-primary)',
  },
  {
    id: 'vertical-slice',
    label: 'Vertical Slice',
    tagline: 'One chapter  -  AAA quality bar',
    icon: '??',
    estimatedDays: '3 - 8 weeks',
    estimatedCostRange: '$80  -  $400',
    agentLimit: 12,
    aiCallsPerRun: '~5k - 20k',
    deliverables: [
      'Full asset pipeline (LOD, PBR, collision)',
      'Robust game bible (16 sections)',
      'Playtest bot + evidence log',
      'Performance trace vs. budget',
      'Human approval gate required',
    ],
    limitations: [
      'Requires human sign-off on each milestone',
      'Cloud render adds cost per second',
    ],
    accentColor: 'var(--aethel-primary)',
  },
  {
    id: 'full-production',
    label: 'Full Production',
    tagline: 'Roadmap, milestones, release gates',
    icon: '??',
    estimatedDays: 'Months ? milestones',
    estimatedCostRange: '$400+',
    agentLimit: 27,
    aiCallsPerRun: 'Budget-controlled',
    deliverables: [
      'Full production roadmap',
      'Episodic/chapter delivery',
      'Continuous QA + regression',
      'Release readiness gate',
    ],
    limitations: [
      'Humans own creative direction',
      'AI never decides what is fun or beautiful',
      'Legal / provenance review mandatory',
    ],
    accentColor: 'var(--aethel-info)',
  },
]

// --- Sub-components ---

function ScopeCard({
  def,
  selected,
  onSelect,
}: {
  def: ScopeDefinition
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      type="button"
      id={`scope-card-${def.id}`}
      onClick={onSelect}
      aria-pressed={selected}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      className={cn(
        'relative flex flex-col rounded-2xl border p-5 text-left transition-all',
        selected
          ? 'bg-[color-mix(in_srgb,var(--scope-accent)_8%,transparent)]'
          : 'border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)] hover:border-[var(--aethel-border-secondary)]',
      )}
      style={
        selected
          ? ({
              '--scope-accent': def.accentColor,
              borderColor: `color-mix(in srgb, ${def.accentColor} 40%, transparent)`,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${def.accentColor} 25%, transparent), 0 4px 24px color-mix(in srgb, ${def.accentColor} 10%, transparent)`,
            } as React.CSSProperties)
          : undefined
      }
    >
      {/* Icon + label */}
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-2xl" aria-hidden>{def.icon}</span>
        <div>
          <p className="text-sm font-bold text-[var(--aethel-text-primary)]">{def.label}</p>
          <p className="text-[11px] text-[var(--aethel-text-tertiary)]">{def.tagline}</p>
        </div>
        {selected && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="ml-auto flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: `color-mix(in srgb, ${def.accentColor} 20%, transparent)`, color: def.accentColor }}
          >
            ?
          </motion.span>
        )}
      </div>

      {/* Cost & time */}
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--aethel-text-secondary)]">
          ? {def.estimatedDays}
        </span>
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--aethel-text-secondary)]">
          ~{def.estimatedCostRange}
        </span>
        <span className="rounded-full border border-[var(--aethel-border-subtle)] px-2 py-0.5 font-mono text-[10px] text-[var(--aethel-text-secondary)]">
          {def.agentLimit} agents max
        </span>
      </div>

      {/* Deliverables */}
      <ul className="mb-3 flex flex-col gap-1" aria-label="What you get">
        {def.deliverables.map((d) => (
          <li key={d} className="flex items-start gap-1.5 text-[11px] text-[var(--aethel-text-secondary)]">
            <span style={{ color: def.accentColor }} aria-hidden>?</span>
            {d}
          </li>
        ))}
      </ul>

      {/* Limitations */}
      <ul className="flex flex-col gap-1" aria-label="Limitations">
        {def.limitations.map((l) => (
          <li key={l} className="flex items-start gap-1.5 text-[10px] text-[var(--aethel-text-tertiary)]">
            <span aria-hidden> - </span>
            {l}
          </li>
        ))}
      </ul>
    </motion.button>
  )
}

// --- Main ---

export function MissionScopeSelector({ currentScope, onSelect, onConfirm, className }: MissionScopeSelectorProps) {
  const [selected, setSelected] = useState<MissionScope | undefined>(currentScope)

  const handleSelect = (scope: MissionScope) => {
    setSelected(scope)
    onSelect(scope)
  }

  const selectedDef = SCOPE_DEFS.find((d) => d.id === selected)

  return (
    <div className={cn('flex h-full flex-col gap-6 overflow-auto p-6', className)} data-surface="mission-scope-selector">
      <header className="flex flex-col gap-1">
        <h2 className="text-lg font-bold tracking-tight text-[var(--aethel-text-primary)]">Mission Scope</h2>
        <p className="text-sm text-[var(--aethel-text-secondary)]">
          Define your ambition. This controls agent budgets, cost limits, and required evidence.
        </p>
      </header>

      {/* Cards grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {SCOPE_DEFS.map((def) => (
          <ScopeCard
            key={def.id}
            def={def}
            selected={selected === def.id}
            onSelect={() => handleSelect(def.id)}
          />
        ))}
      </div>

      {/* Confirm bar */}
      <AnimatedConfirmBar def={selectedDef} onConfirm={() => selected && onConfirm(selected)} />
    </div>
  )
}

function AnimatedConfirmBar({ def, onConfirm }: { def?: ScopeDefinition; onConfirm: () => void }) {
  return (
    <motion.div
      layout
      animate={{ opacity: def ? 1 : 0.4 }}
      transition={{ duration: 0.2 }}
      className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] p-4 backdrop-blur-sm"
    >
      <div>
        {def ? (
          <p className="text-sm text-[var(--aethel-text-primary)]">
            <span className="font-semibold">{def.label}</span> selected  - {' '}
            <span className="font-mono text-[var(--aethel-text-secondary)]">~{def.estimatedCostRange}</span>
          </p>
        ) : (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Select a scope to continue</p>
        )}
        <p className="mt-0.5 text-[11px] text-[var(--aethel-text-tertiary)]">
          Cost estimates are indicative. Actual credits settle post-run.
        </p>
      </div>

      <button
        type="button"
        id="mission-scope-confirm-btn"
        onClick={onConfirm}
        disabled={!def}
        className="flex-none rounded-xl border border-[color-mix(in_srgb,var(--aethel-primary)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] px-5 py-2.5 text-sm font-semibold text-[var(--aethel-primary)] transition-all hover:bg-[color-mix(in_srgb,var(--aethel-primary)_28%,transparent)] disabled:cursor-not-allowed disabled:opacity-40"
        style={def ? { boxShadow: `0 0 12px color-mix(in srgb, ${def.accentColor} 15%, transparent)` } : undefined}
      >
        Lock Scope & Begin ?
      </button>
    </motion.div>
  )
}

// Need AnimatePresence for AnimatedConfirmBar internal usage
import { AnimatePresence } from 'framer-motion'
import type React from 'react'

export default MissionScopeSelector
