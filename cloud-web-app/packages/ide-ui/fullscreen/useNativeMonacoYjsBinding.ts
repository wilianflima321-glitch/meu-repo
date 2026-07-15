'use client';

import { useEffect, useRef } from 'react';
import type * as monacoEditor from 'monaco-editor';
import type * as Y from 'yjs';
import type { Awareness } from 'y-protocols/awareness';

import type { CollaborationSession } from '../../../web/lib/yjs-collaboration';
import { createComponentLogger } from '../../../web/lib/observability/logger';

const log = createComponentLogger('useNativeMonacoYjsBinding');

type MonacoBindingInstance = {
  destroy: () => void;
};

type MonacoBindingConstructor = new (
  yText: Y.Text,
  model: monacoEditor.editor.ITextModel,
  editors?: Set<monacoEditor.editor.IStandaloneCodeEditor>,
  awareness?: Awareness | null,
) => MonacoBindingInstance;

type YMonacoModule = {
  MonacoBinding: MonacoBindingConstructor;
};

export function getWorkbenchYTextName(filePath: string): string {
  return `workbench:file:${filePath}`;
}

type UseNativeMonacoYjsBindingParams = {
  enabled: boolean;
  session: CollaborationSession | null;
  editor: monacoEditor.editor.IStandaloneCodeEditor | null;
  filePath: string;
  initialValue: string;
};

export function useNativeMonacoYjsBinding({
  enabled,
  session,
  editor,
  filePath,
  initialValue,
}: UseNativeMonacoYjsBindingParams) {
  const initialValueRef = useRef(initialValue);

  useEffect(() => {
    initialValueRef.current = initialValue;
  }, [filePath, initialValue]);

  useEffect(() => {
    if (!enabled || !session || !editor || !filePath) return;

    const model = editor.getModel();
    const awareness = session.getAwareness();

    if (!model || !awareness) return;

    let destroyed = false;
    let binding: MonacoBindingInstance | null = null;
    const yText = session.getText(getWorkbenchYTextName(filePath));

    if (yText.length === 0 && initialValueRef.current) {
      session.transaction(() => {
        yText.insert(0, initialValueRef.current);
      });
    } else if (yText.length > 0 && yText.toString() !== model.getValue()) {
      model.setValue(yText.toString());
    }

    void import('y-monaco')
      .then((module: YMonacoModule) => {
        if (destroyed) return;

        binding = new module.MonacoBinding(
          yText,
          model,
          new Set([editor]),
          awareness,
        );

        log.info('Native y-monaco binding attached', { filePath });
      })
      .catch((error: unknown) => {
        log.warn('Native y-monaco binding unavailable; cursor awareness remains active', {
          filePath,
          error,
        });
      });

    return () => {
      destroyed = true;
      binding?.destroy();
    };
  }, [editor, enabled, filePath, session]);
}

export default useNativeMonacoYjsBinding;
