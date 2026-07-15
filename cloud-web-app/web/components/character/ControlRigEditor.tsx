'use client';

// @aethel-heavy-async-boundary: Control Rig Studio runtime is loaded lazily from lib/character.

import dynamic from 'next/dynamic';
import type { ControlRigEditorProps } from '@/lib/character/ControlRigEditor.runtime';

export type {
  BoneNode,
  Constraint,
  ControlRigConfig,
  ControlRigEditorProps,
  IKChain,
  SkeletonPreset,
} from '@/lib/character/ControlRigEditor.runtime';

const ControlRigEditorRuntime = dynamic<ControlRigEditorProps>(
  () => import('@/lib/character/ControlRigEditor.runtime'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[420px] items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
        Loading rig editor...
      </div>
    ),
  },
);

export default function ControlRigEditor(props: ControlRigEditorProps) {
  return <ControlRigEditorRuntime {...props} />;
}
