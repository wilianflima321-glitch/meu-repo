'use client';

// @aethel-heavy-async-boundary: Landscape Studio runtime is loaded lazily from lib/engine.

import dynamic from 'next/dynamic';
import type { LandscapeEditorProps } from '@aethel/engine/LandscapeEditor.runtime';

export type {
  BrushMode,
  BrushSettings,
  FoliageType,
  LandscapeEditorProps,
  SculptOperation,
  TerrainConfig,
  TerrainLayer,
} from '@aethel/engine/LandscapeEditor.runtime';

const LandscapeEditorRuntime = dynamic<LandscapeEditorProps>(
  () => import('@aethel/engine/LandscapeEditor.runtime'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
        Loading landscape editor...
      </div>
    ),
  },
);

export default function LandscapeEditor(props: LandscapeEditorProps) {
  return <LandscapeEditorRuntime {...props} />;
}
