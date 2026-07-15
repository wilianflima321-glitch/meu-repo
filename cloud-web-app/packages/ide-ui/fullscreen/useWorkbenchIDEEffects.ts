'use client';

import { useEffect, type MutableRefObject } from 'react';
import type * as monacoEditor from 'monaco-editor';
import { analytics } from '../../../web/lib/analytics';
import { normalizePath } from './workbench-helpers';

type OpenFileFromContextDetail = {
  path?: string;
  startLine?: number;
  endLine?: number;
  source?: string;
};

type UseWorkbenchIDEEffectsOptions = {
  editorRef: MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;
  entryParam: string | null;
  fileParam: string | null;
  previewRuntimeUrl: string | null;
  projectId: string | null | undefined;
  readFile: (path: string) => Promise<unknown>;
};

export function useWorkbenchIDEEffects({
  editorRef,
  entryParam,
  fileParam,
  previewRuntimeUrl,
  projectId,
  readFile,
}: UseWorkbenchIDEEffectsOptions) {
  useEffect(() => {
    const onOpenFileFromContext = (event: Event) => {
      const detail = (event as CustomEvent<OpenFileFromContextDetail>).detail;
      const targetPath = typeof detail?.path === 'string' ? normalizePath(detail.path) : null;
      if (!targetPath) return;

      const startLine = typeof detail?.startLine === 'number' ? detail.startLine : null;
      const endLine = typeof detail?.endLine === 'number' ? detail.endLine : startLine;

      analytics?.track?.('project', 'project_open', {
        metadata: {
          source: detail?.source || 'ai-context',
          projectId,
          file: targetPath,
          startLine,
          endLine,
        },
      });

      void readFile(targetPath).then(() => {
        const editor = editorRef.current;
        if (!editor || !startLine) return;

        editor.revealLineInCenter(startLine);
        editor.setPosition({ lineNumber: startLine, column: 1 });

        if (endLine && endLine >= startLine) {
          editor.setSelection({
            startLineNumber: startLine,
            startColumn: 1,
            endLineNumber: endLine,
            endColumn: 1,
          });
        }

        editor.focus();
      });

      window.dispatchEvent(new Event('aethel.layout.openAI'));
    };

    window.addEventListener('aethel.ide.openFileFromContext', onOpenFileFromContext as EventListener);
    return () => {
      window.removeEventListener('aethel.ide.openFileFromContext', onOpenFileFromContext as EventListener);
    };
  }, [editorRef, projectId, readFile]);

  useEffect(() => {
    analytics?.track('engine', 'editor_open', {
      metadata: {
        surface: 'ide',
        projectId,
        file: fileParam ?? null,
        entry: entryParam ?? null,
        runtimePreviewUrl: previewRuntimeUrl ?? null,
      },
    });
    analytics?.trackPageLoad?.('ide');
  }, [entryParam, fileParam, previewRuntimeUrl, projectId]);
}
