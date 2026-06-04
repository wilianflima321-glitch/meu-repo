'use client';

// @aethel-heavy-async-boundary IDE/Monaco editor surface; runtime is lazy-loaded from lib/editor.
import dynamic from 'next/dynamic';

import type { MonacoEditorProps } from '@/lib/editor/MonacoEditor.runtime';

export type { MonacoEditorProps } from '@/lib/editor/MonacoEditor.runtime';

const RuntimeMonacoEditor = dynamic(() => import('@/lib/editor/MonacoEditor.runtime'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-[var(--aethel-text-tertiary)]">
      Loading editor...
    </div>
  ),
});

export default function MonacoEditor(props: MonacoEditorProps) {
  return <RuntimeMonacoEditor {...props} />;
}
