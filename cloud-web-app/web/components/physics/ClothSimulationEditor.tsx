'use client';

// @aethel-heavy-async-boundary: Studio physics editor wrapper; runtime lives in lib/physics.
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import type { ClothSimulationEditorProps } from '@/lib/physics/ClothSimulationEditor.runtime';

export type { ClothToolType, ConstraintType, ClothPreset, ClothEditorState, ClothSimulationEditorProps } from '@/lib/physics/ClothSimulationEditor.runtime';

const RuntimeClothSimulationEditor = dynamic<ClothSimulationEditorProps>(
  () => import('@/lib/physics/ClothSimulationEditor.runtime'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-[var(--aethel-surface-primary)] text-xs text-[var(--aethel-text-tertiary)]">
        Loading physics editor...
      </div>
    ),
  },
);

export default function ClothSimulationEditor(props: ClothSimulationEditorProps) {
  return (
    <Suspense fallback={null}>
      <RuntimeClothSimulationEditor {...props} />
    </Suspense>
  );
}
