import React, { useEffect, useRef } from 'react';
import { Editor } from '../services/EditorService';
import { EventBus } from '../services/EventBus';
import { LanguageService } from '../services/LanguageService';
import { DiagnosticsService } from '../services/DiagnosticsService';

interface MonacoEditorProps {
  editor: Editor;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({ editor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Monaco Editor
    initializeMonaco();

    return () => {
      if (editorInstanceRef.current) {
        editorInstanceRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    if (editorInstanceRef.current) {
      // Update editor content when editor changes
      const currentValue = editorInstanceRef.current.getValue();
      if (currentValue !== editor.content) {
        editorInstanceRef.current.setValue(editor.content);
      }
    }
  }, [editor.content]);

  const initializeMonaco = async () => {
    if (!containerRef.current) return;

    // Monaco editor initialization would go here
    // For now, we'll create a simple textarea as placeholder
    const textarea = document.createElement('textarea');
    textarea.value = editor.content;
    textarea.style.width = '100%';
    textarea.style.height = '100%';
    textarea.style.border = 'none';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.fontFamily = 'var(--vscode-editor-font-family, Consolas, monospace)';
    textarea.style.fontSize = 'var(--vscode-editor-font-size, 14px)';
    textarea.style.lineHeight = 'var(--vscode-editor-line-height, 1.5)';
    textarea.style.padding = '16px';
    textarea.style.background = 'var(--vscode-editor-background)';
    textarea.style.color = 'var(--vscode-editor-foreground)';

    textarea.addEventListener('input', (e) => {
      const target = e.target as HTMLTextAreaElement;
      editor.content = target.value;
      editor.isDirty = true;
      EventBus.getInstance().emit('editor:changed', { editorId: editor.id });
    });

    containerRef.current.appendChild(textarea);
    editorInstanceRef.current = {
      getValue: () => textarea.value,
      setValue: (value: string) => { textarea.value = value; },
      dispose: () => { textarea.remove(); }
    };

    // Setup language features
    setupLanguageFeatures();
  };

  const setupLanguageFeatures = () => {
    const languageService = LanguageService.getInstance();
    const diagnosticsService = DiagnosticsService.getInstance();

    // Register language for this file
    const language = getLanguageFromPath(editor.filePath);
    if (language) {
      languageService.registerLanguage(language);
    }

    // Setup diagnostics
    EventBus.getInstance().subscribe('diagnostics:updated', (data: any) => {
      if (data.uri === editor.filePath) {
        // Update editor with diagnostics
        updateDiagnostics(data.diagnostics);
      }
    });
  };

  const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescriptreact',
      'js': 'javascript',
      'jsx': 'javascriptreact',
      'py': 'python',
      'go': 'go',
      'rs': 'rust',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'cpp',
      'hpp': 'cpp',
      'java': 'java',
      'cs': 'csharp',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  const updateDiagnostics = (diagnostics: any[]) => {
    // Update editor decorations with diagnostics
    // This would integrate with Monaco's marker system
  };

  return (
    <div className="monaco-editor" ref={containerRef}>
      <style jsx>{`
        .monaco-editor {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};
