'use client';

// @aethel-heavy-async-boundary: loaded only through explicit Studio/Labs dynamic imports; runtime lives in lib/engine.
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

import type { GameViewportProps } from '@aethel/engine/GameViewport.runtime';

const RuntimeGameViewport = dynamic(() => import('@aethel/engine/GameViewport.runtime'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[var(--aethel-surface-primary)] text-xs text-[var(--aethel-text-tertiary)]">
      Loading viewport...
    </div>
  ),
});

export type { GameViewportProps } from '@aethel/engine/GameViewport.runtime';

export default function GameViewport(props: GameViewportProps) {
  return (
    <Suspense fallback={null}>
      <RuntimeGameViewport {...props} />
    </Suspense>
  );
}
