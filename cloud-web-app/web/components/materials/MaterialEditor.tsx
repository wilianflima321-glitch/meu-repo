'use client';

// @aethel-heavy-async-boundary: Material Studio runtime is loaded lazily from lib/materials.

import dynamic from 'next/dynamic';

export type {
  MaterialGraph,
  MaterialNodeData,
  MaterialNodeDefinition,
  MaterialPort,
  MaterialProperty,
} from '@/lib/materials/MaterialEditor.runtime';
export type { PBRMaterial, ShaderCompiler } from '@/lib/materials/MaterialEditor.runtime';

const MaterialEditorRuntime = dynamic(
  () => import('@/lib/materials/MaterialEditor.runtime').then((module) => module.MaterialEditor),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
        Loading material editor...
      </div>
    ),
  },
);

export function MaterialEditor() {
  return <MaterialEditorRuntime />;
}

export default MaterialEditor;
