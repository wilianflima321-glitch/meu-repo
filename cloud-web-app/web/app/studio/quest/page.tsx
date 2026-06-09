import { Suspense } from 'react'
import dynamic from 'next/dynamic'

import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import {
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
} from '@/lib/studio/studio-registry'
import { CreativeStudioLoading } from '../CreativeStudioShell'

const QuestEditor = dynamic(() => import('@/components/narrative/QuestEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Quest Studio" />,
})

// --- Quest-specific outliner: mission tree ------------------------------------
function QuestMissionOutliner() {
  return (
    <div className="space-y-1 text-[11px]">
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
        Draft tree
      </p>
      {[
        { label: 'Main quest', depth: 0, status: 'active' },
        { label: 'Intro_01',   depth: 1, status: 'done' },
        { label: 'Branch_A',   depth: 1, status: 'active' },
        { label: 'Choice_A1',  depth: 2, status: 'pending' },
        { label: 'Choice_A2',  depth: 2, status: 'pending' },
        { label: 'Branch_B',   depth: 1, status: 'held' },
      ].map(({ label, depth, status }) => (
        <div
          key={label}
          className={[
            'rounded-md px-2 py-1 font-mono transition-colors',
            status === 'active'  ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]' : '',
            status === 'done'    ? 'text-[var(--aethel-text-tertiary)] line-through' : '',
            status === 'pending' ? 'text-[var(--aethel-text-secondary)]' : '',
            status === 'held'    ? 'text-[var(--aethel-warning-light)]' : '',
          ].join(' ')}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// --- Quest-specific inspector: objective properties ---------------------------
function QuestInspector() {
  return (
    <div className="space-y-2 text-[11px]">
      <p className="font-semibold text-[var(--aethel-text-primary)]">Objective</p>
      {[
        ['ID',           'quest.intro.01'],
        ['Type',         'Dialogue'],
        ['Prereqs',      'None'],
        ['Rewards',      '250 XP, Key_01'],
        ['Failure cond', 'Player dies'],
      ].map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 border-b border-[var(--aethel-border-subtle)] pb-1.5 last:border-0">
          <span className="text-[10px] uppercase tracking-[0.1em] text-[var(--aethel-text-quaternary)]">{k}</span>
          <span className="font-mono text-[var(--aethel-text-primary)]">{v}</span>
        </div>
      ))}
    </div>
  )
}

// --- Primary action -----------------------------------------------------------
function QuestPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Quest validation is held until branching, prerequisite, reward, and playtest receipts exist."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] disabled:cursor-not-allowed"
    >
      Validation held
    </button>
  )
}

// --- Page ---------------------------------------------------------------------
export default function QuestStudioPage() {
  const activeTool = resolveActiveTool('Logic', 'quest')
  const { mode, title } = GROUP_CONFIG.Logic

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<QuestPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={<QuestMissionOutliner />}
      inspector={<QuestInspector />}
      viewport={
        <Suspense fallback={<CreativeStudioLoading label="Quest Studio" />}>
          <QuestEditor />
        </Suspense>
      }
    />
  )
}
