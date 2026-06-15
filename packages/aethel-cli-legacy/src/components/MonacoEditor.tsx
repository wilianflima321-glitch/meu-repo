import React, { useEffect } from 'react';
import { Editor } from '../services/EditorService';

interface MonacoEditorProps {
  editor: Editor;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ editor }) => {
  useEffect(() => {
    // real-or-fail: este componente se chama MonacoEditor, mas a integração real com Monaco
    // não está implementada neste app. Não usamos fallback silencioso que pareça Monaco.
    // Em vez disso, exibimos um erro acionável.
    // (A integração real pode ser feita via monaco-editor + @monaco-editor/react.)
    // eslint-disable-next-line no-console
    console.error(
      '[NOT_IMPLEMENTED] MonacoEditor: integração com Monaco não implementada. ' +
        'Implemente via monaco-editor/@monaco-editor/react ou use um editor real (ex.: Theia).'
    );
  }, []);

  return (
    <div className="monaco-editor">
      <div className="monaco-not-implemented">
        <h3>Editor não implementado</h3>
        <p>
          Este app ainda não integra o Monaco Editor. Para cumprir a política real-or-fail,
          não usamos um textarea “fingindo” ser Monaco.
        </p>
        <p>
          Arquivo atual: <strong>{editor.filePath || 'untitled'}</strong>
        </p>
        <pre className="monaco-preview">{editor.content || ''}</pre>
      </div>
      <style jsx>{`
        .monaco-editor {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
        .monaco-not-implemented {
          width: 100%;
          height: 100%;
          overflow: auto;
          padding: 16px;
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
        }
        .monaco-not-implemented h3 {
          margin: 0 0 8px 0;
        }
        .monaco-not-implemented p {
          margin: 0 0 8px 0;
        }
        .monaco-preview {
          margin: 12px 0 0 0;
          padding: 12px;
          white-space: pre-wrap;
          font-family: var(--vscode-editor-font-family, Consolas, monospace);
          font-size: var(--vscode-editor-font-size, 14px);
          line-height: var(--vscode-editor-line-height, 1.5);
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          border: 1px solid var(--vscode-panel-border);
        }
      `}</style>
    </div>
  );
};
