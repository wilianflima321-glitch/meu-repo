"use client";

// @aethel-heavy-async-boundary: Studio physics runtime is loaded lazily from lib/physics.

import dynamic from "next/dynamic";
import type { DestructionEditorProps } from "@/lib/physics/DestructionEditor.runtime";

export { DESTRUCTION_PRESETS } from "./DestructionEditor.model";
export type {
  DestructionEditorProps,
  DestructionPreset,
  DestructionToolType,
  FracturePattern,
  ImpactPoint,
} from "@/lib/physics/DestructionEditor.runtime";

const DestructionEditorRuntime = dynamic<DestructionEditorProps>(
  () => import("@/lib/physics/DestructionEditor.runtime"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
        Loading destruction editor...
      </div>
    ),
  },
);

export default function DestructionEditor(props: DestructionEditorProps) {
  return <DestructionEditorRuntime {...props} />;
}
