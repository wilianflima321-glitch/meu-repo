'use client';

// @aethel-heavy-async-boundary: Studio physics editor wrapper; runtime lives in lib/physics.
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import type { FluidSimulationEditorProps } from '@/lib/physics/FluidSimulationEditor.runtime';

export type { FluidEditorState, FluidParams, FluidParticle, FluidPreset, FluidToolType, FluidSimulationEditorProps } from '@/lib/physics/FluidSimulationEditor.runtime';

const RuntimeFluidSimulationEditor = dynamic<FluidSimulationEditorProps>(
  () => import('@/lib/physics/FluidSimulationEditor.runtime'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-[var(--aethel-surface-primary)] text-xs text-[var(--aethel-text-tertiary)]">
        Loading physics editor...
      </div>
    ),
  },
);

export default function FluidSimulationEditor(props: FluidSimulationEditorProps) {
  return (
    <Suspense fallback={null}>
      <RuntimeFluidSimulationEditor {...props} />
    </Suspense>
  );
}
