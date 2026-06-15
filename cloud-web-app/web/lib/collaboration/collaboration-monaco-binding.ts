// @aethel-heavy-async-boundary IDE/Monaco runtime module; never import from public/dashboard/admin route shells.
import * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import * as monaco from 'monaco-editor';
import { createComponentLogger } from '@/lib/observability/logger';
import type { MonacoBindingLike } from './collaboration-types';

const log = createComponentLogger('collaboration/monaco-binding');

let MonacoBinding: typeof import('y-monaco').MonacoBinding | null = null;

try {
  const yMonaco = require('y-monaco') as { MonacoBinding: typeof import('y-monaco').MonacoBinding };
  MonacoBinding = yMonaco.MonacoBinding;
  log.info('[Collaboration] y-monaco loaded successfully');
} catch {
  log.info('[Collaboration] y-monaco not available, using fallback sync');
}

export function bindCollaborativeMonacoEditor(options: {
  ydoc: Y.Doc;
  wsProvider: WebsocketProvider;
  editor: monaco.editor.IStandaloneCodeEditor;
  uri: string;
  source: unknown;
  updateCursor: (file: string, line: number, column: number) => void;
  updateSelection: (file: string, selection: monaco.Selection | null) => void;
}): MonacoBindingLike {
  const { ydoc, wsProvider, editor, uri, source, updateCursor, updateSelection } = options;
  const yText = ydoc.getText(uri);

  if (MonacoBinding) {
    const binding = new MonacoBinding(
      yText,
      editor.getModel()!,
      new Set([editor]),
      wsProvider.awareness
    );

    editor.onDidChangeCursorPosition((event) => {
      updateCursor(uri, event.position.lineNumber, event.position.column);
    });
    editor.onDidChangeCursorSelection((event) => {
      updateSelection(uri, event.selection);
    });

    log.info(`[Collaboration] Monaco binding created for ${uri} (y-monaco)`);
    return { destroy: () => binding.destroy() };
  }

  const disposables: monaco.IDisposable[] = [];
  const model = editor.getModel();

  if (model && yText.toString() === '') {
    yText.insert(0, model.getValue());
  }

  const localChangeHandler = model?.onDidChangeContent((event) => {
    ydoc.transact(() => {
      event.changes.forEach(change => {
        const offset = model.getOffsetAt({
          lineNumber: change.range.startLineNumber,
          column: change.range.startColumn,
        });

        if (change.rangeLength > 0) {
          yText.delete(offset, change.rangeLength);
        }
        if (change.text) {
          yText.insert(offset, change.text);
        }
      });
    }, source);
  });

  if (localChangeHandler) {
    disposables.push(localChangeHandler);
  }

  const remoteChangeHandler = () => {
    const currentContent = yText.toString();
    if (model && model.getValue() !== currentContent) {
      model.setValue(currentContent);
    }
  };
  yText.observe(remoteChangeHandler);

  editor.onDidChangeCursorPosition((event) => {
    updateCursor(uri, event.position.lineNumber, event.position.column);
  });
  editor.onDidChangeCursorSelection((event) => {
    updateSelection(uri, event.selection);
  });

  log.info(`[Collaboration] Monaco binding created for ${uri} (fallback sync)`);
  return {
    destroy: () => {
      disposables.forEach(disposable => disposable.dispose());
      yText.unobserve(remoteChangeHandler);
    },
  };
}
