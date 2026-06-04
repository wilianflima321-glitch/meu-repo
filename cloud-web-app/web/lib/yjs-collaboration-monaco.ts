'use client';

import * as Y from 'yjs';

import type { CollaborationSession } from './yjs-collaboration';
import type { MonacoBinding, MonacoEditorLike, YTextDelta } from './yjs-collaboration-contracts';

/** Bind Yjs text state to a Monaco-like editor model. */
export function bindMonaco(
  session: CollaborationSession,
  textName: string,
  editor: MonacoEditorLike,
): MonacoBinding {
  const text = session.getText(textName);
  const model = editor.getModel();

  if (!model) {
    throw new Error('Editor has no model');
  }

  let isUpdating = false;

  const observer = (event: Y.YTextEvent) => {
    if (isUpdating) return;

    isUpdating = true;

    event.delta.forEach((delta: YTextDelta) => {
      if (delta.retain) {
        return;
      }

      if (delta.insert) {
        const position = model.getPositionAt(delta.retain || 0);
        editor.executeEdits('yjs', [{
          range: {
            startLineNumber: position.lineNumber,
            startColumn: position.column,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          },
          text: delta.insert,
        }]);
        return;
      }

      if (delta.delete) {
        const startPosition = model.getPositionAt(delta.retain || 0);
        const endPosition = model.getPositionAt((delta.retain || 0) + delta.delete);
        editor.executeEdits('yjs', [{
          range: {
            startLineNumber: startPosition.lineNumber,
            startColumn: startPosition.column,
            endLineNumber: endPosition.lineNumber,
            endColumn: endPosition.column,
          },
          text: '',
        }]);
      }
    });

    isUpdating = false;
  };

  text.observe(observer);

  const disposable = model.onDidChangeContent((event) => {
    if (isUpdating) return;

    isUpdating = true;

    event.changes.forEach((change) => {
      const startOffset = model.getOffsetAt({
        lineNumber: change.range.startLineNumber,
        column: change.range.startColumn,
      });

      session.transaction(() => {
        if (change.rangeLength > 0) {
          text.delete(startOffset, change.rangeLength);
        }

        if (change.text) {
          text.insert(startOffset, change.text);
        }
      });
    });

    isUpdating = false;
  });

  if (text.length > 0 && model.getValue() !== text.toString()) {
    model.setValue(text.toString());
  }

  return {
    destroy: () => {
      text.unobserve(observer);
      disposable.dispose();
    },
  };
}
