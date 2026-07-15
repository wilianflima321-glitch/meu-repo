// @aethel-heavy-async-boundary IDE/Monaco editor surface; runtime is loaded lazily from lib/editor.
'use client';

import dynamic from 'next/dynamic';
import type { MonacoEditorProps } from './MonacoEditorPro.types';

export type { Diagnostic, GitChange, MonacoEditorProps } from './MonacoEditorPro.types';

const MonacoEditorProRuntime = dynamic<MonacoEditorProps>(
  () => import('@/lib/editor/MonacoEditorPro.runtime').then((module) => module.MonacoEditorPro),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center bg-[var(--aethel-surface-primary)] text-sm text-[var(--aethel-text-secondary)]">
        Loading editor...
      </div>
    ),
  },
);

export function MonacoEditorPro(props: MonacoEditorProps) {
  return <MonacoEditorProRuntime {...props} />;
}

export { MonacoEditorPro as MonacoEditor };
export default MonacoEditorPro;
