"use client";

// @aethel-heavy-async-boundary: terrain Studio wrapper; runtime lives in lib/terrain.
import dynamic from "next/dynamic";
import { Suspense } from "react";

import type { TerrainSculptingEditorProps } from "@/lib/terrain/TerrainSculptingEditor.runtime";

export type {
  BrushFalloff,
  BrushSettings,
  BrushShape,
  ErosionSettings,
  FoliageInstance,
  FoliageType,
  TerrainData,
  TerrainLayer,
  TerrainSettings,
  TerrainSculptingEditorProps,
  TerrainToolType,
} from "@/lib/terrain/TerrainSculptingEditor.runtime";

const RuntimeTerrainSculptingEditor = dynamic<TerrainSculptingEditorProps>(
  () => import("@/lib/terrain/TerrainSculptingEditor.runtime").then((module) => module.TerrainSculptingEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[360px] items-center justify-center bg-[var(--aethel-surface-primary)] text-xs text-[var(--aethel-text-tertiary)]">
        Loading terrain editor...
      </div>
    ),
  },
);

export function TerrainSculptingEditor(props: TerrainSculptingEditorProps) {
  return (
    <Suspense fallback={null}>
      <RuntimeTerrainSculptingEditor {...props} />
    </Suspense>
  );
}

export default TerrainSculptingEditor;
