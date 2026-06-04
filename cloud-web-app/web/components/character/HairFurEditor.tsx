'use client';

// @aethel-heavy-async-boundary: hair/fur Studio wrapper; runtime lives in lib/character.
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import type { HairFurEditorProps } from '@/lib/character/HairFurEditor.runtime';

export type { HairFurEditorProps } from '@/lib/character/HairFurEditor.runtime';

const RuntimeHairFurEditor = dynamic<HairFurEditorProps>(
  () => import('@/lib/character/HairFurEditor.runtime'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-[var(--aethel-surface-primary)] text-xs text-[var(--aethel-text-tertiary)]">
        Loading hair editor...
      </div>
    ),
  },
);

export default function HairFurEditor(props: HairFurEditorProps) {
  return (
    <Suspense fallback={null}>
      <RuntimeHairFurEditor {...props} />
    </Suspense>
  );
}
