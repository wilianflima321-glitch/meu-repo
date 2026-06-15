import { Suspense } from 'react'
import dynamic from 'next/dynamic'

import { CreativeWorkbenchShell } from '@/components/studio/CreativeWorkbenchShell'
import {
  resolveActiveTool,
  buildToolEvidence,
  GROUP_CONFIG,
  getGroupTools,
} from '@/lib/studio/studio-registry'
import { CreativeStudioLoading } from '../CreativeStudioShell'

const AnimationBlueprint = dynamic(() => import('@/components/engine/AnimationBlueprint'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Animation Studio" />,
})
const ControlRigEditor = dynamic(() => import('@/components/character/ControlRigEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Loading Rig Editor…" />,
})
const FacialAnimationEditor = dynamic(() => import('@/components/character/FacialAnimationEditor'), {
  ssr: false,
  loading: () => <CreativeStudioLoading label="Loading Facial Editor…" />,
})

// --- Character Outliner: skeleton tree ----------------------------------------
function CharacterOutliner() {
  return (
    <div className="space-y-1 text-[11px]">
      <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-quaternary)]">
        Skeleton hierarchy
      </p>
      {[
        { label: 'Root',       depth: 0, active: true  },
        { label: 'Spine_01',   depth: 1, active: false },
        { label: 'Spine_02',   depth: 2, active: false },
        { label: 'Chest',      depth: 3, active: true  },
        { label: 'Neck',       depth: 4, active: false },
        { label: 'Head',       depth: 5, active: false },
        { label: 'Arm_L',      depth: 4, active: false },
        { label: 'Arm_R',      depth: 4, active: false },
        { label: 'Hips',       depth: 1, active: false },
      ].map(({ label, depth, active }) => (
        <div
          key={label}
          className={[
            'rounded-md px-2 py-1 font-mono text-[10px] transition-colors',
            active
              ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_12%,transparent)] text-[var(--aethel-primary-light)]'
              : 'text-[var(--aethel-text-secondary)]',
          ].join(' ')}
          style={{ paddingLeft: `${8 + depth * 10}px` }}
        >
          {label}
        </div>
      ))}
    </div>
  )
}

// --- Character Inspector: bone properties -------------------------------------
function CharacterInspector() {
  return (
    <div className="space-y-2 text-[11px]">
      <p className="font-semibold text-[var(--aethel-text-primary)]">Bone</p>
      {[
        ['Bone',        'Chest'],
        ['Rotation X',  '0.00°'],
        ['Rotation Y',  '0.00°'],
        ['Rotation Z',  '0.00°'],
        ['Scale',       '1.00'],
        ['IK weight',   '0.75'],
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
function AnimationPrimaryAction() {
  return (
    <button
      type="button"
      disabled
      title="Animation export is held until all keyframes have been reviewed and receipts submitted."
      className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_34%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--aethel-warning-light)] opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--aethel-warning)] disabled:cursor-not-allowed"
    >
      Export held
    </button>
  )
}

// --- Page --------------------------------------------------------------------
export default function CharacterStudioPage() {
  const tools = getGroupTools('Character')
  const activeTool = resolveActiveTool('Character', tools[0]?.id ?? null)
  const { mode, title } = GROUP_CONFIG.Character

  return (
    <CreativeWorkbenchShell
      title={title}
      mode={mode}
      primaryAction={<AnimationPrimaryAction />}
      evidence={buildToolEvidence(activeTool)}
      outliner={<CharacterOutliner />}
      inspector={<CharacterInspector />}
      viewport={
        <Suspense fallback={<CreativeStudioLoading label="Animation Studio" />}>
          <AnimationBlueprint />
        </Suspense>
      }
    />
  )
}
