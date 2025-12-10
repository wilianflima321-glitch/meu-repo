import React, { useState, useEffect } from 'react';
import { EditorService, Editor } from '../services/EditorService';
import { EventBus } from '../services/EventBus';
import { EditorTabs } from './EditorTabs';
import { MonacoEditor } from './MonacoEditor';
import { QuickOpen } from './QuickOpen';

export const EditorArea: React.FC = () => {
  const [editors, setEditors] = useState<Editor[]>([]);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const editorService = EditorService.getInstance();

  useEffect(() => {
    updateEditors();

    const unsubscribe1 = EventBus.getInstance().subscribe('editor:opened', updateEditors);
    const unsubscribe2 = EventBus.getInstance().subscribe('editor:closed', updateEditors);
    const unsubscribe3 = EventBus.getInstance().subscribe('editor:changed', updateEditors);
    const unsubscribe4 = EventBus.getInstance().subscribe('editor:activated', updateEditors);
    const unsubscribe5 = EventBus.getInstance().subscribe('quickOpen:toggle', () => {
      setQuickOpenVisible(prev => !prev);
    });

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
      unsubscribe5();
    };
  }, []);

  const updateEditors = () => {
    const allEditors = editorService.getOpenEditors();
    const active = editorService.getActiveEditor();
    setEditors(allEditors);
    setActiveEditor(active);
  };

  return (
    <div className="editor-area">
      <EditorTabs />
      
      <div className="editor-content">
        {activeEditor ? (
          <MonacoEditor editor={activeEditor} />
        ) : (
          <div className="welcome-screen">
            <div className="welcome-content">
              <h1>Professional IDE</h1>
              <p>Open a file to start editing</p>
              <div className="welcome-actions">
                <button onClick={() => setQuickOpenVisible(true)}>
                  Open File (Ctrl+P)
                </button>
                <button onClick={() => EventBus.getInstance().emit('file:new', {})}>
                  New File (Ctrl+N)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {quickOpenVisible && (
        <QuickOpen onClose={() => setQuickOpenVisible(false)} />
      )}

      <style jsx>{`
        .editor-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--vscode-editor-background);
          overflow: hidden;
        }

        .editor-content {
          flex: 1;
          overflow: hidden;
          position: relative;
        }

        .welcome-screen {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          background: var(--vscode-editor-background);
        }

        .welcome-content {
          text-align: center;
          max-width: 600px;
          padding: 40px;
        }

        .welcome-content h1 {
          font-size: 32px;
          font-weight: 300;
          margin-bottom: 16px;
          color: var(--vscode-editor-foreground);
        }

        .welcome-content p {
          font-size: 16px;
          color: var(--vscode-descriptionForeground);
          margin-bottom: 32px;
        }

        .welcome-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .welcome-actions button {
          padding: 12px 24px;
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          cursor: pointer;
          font-size: 14px;
          border-radius: 2px;
          transition: background 0.1s;
        }

        .welcome-actions button:hover {
          background: var(--vscode-button-hoverBackground);
        }
      `}</style>
    </div>
  );
};
