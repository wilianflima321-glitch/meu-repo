import React, { useRef, useEffect, useCallback } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useIDEStore } from '@/store/ideStore';
import { X, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateFile } from '@/services/api';
import { debounce } from 'lodash';

const Editor = () => {
  const {
    openFiles, activeFileId, editorContent, updateFileContent,
    setActiveFile, closeFile, settings, breakpoints, markFileSaved
  } = useIDEStore();
  
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  
  const activeFile = openFiles.find(f => f.id === activeFileId);
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (fileId, content) => {
      if (settings.autoSave) {
        try {
          await updateFile(fileId, { content });
          markFileSaved(fileId);
        } catch (err) {
          console.error('Auto-save failed:', err);
        }
      }
    }, 1000),
    [settings.autoSave]
  );
  
  const handleEditorChange = (value) => {
    if (activeFileId) {
      updateFileContent(activeFileId, value);
      debouncedSave(activeFileId, value);
    }
  };
  
  const handleEditorMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // Custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      if (activeFileId) {
        try {
          await updateFile(activeFileId, { content: editor.getValue() });
          markFileSaved(activeFileId);
        } catch (err) {
          console.error('Save failed:', err);
        }
      }
    });
    
    // Update cursor position
    editor.onDidChangeCursorPosition((e) => {
      useIDEStore.getState().setCursorPosition({
        line: e.position.lineNumber,
        column: e.position.column
      });
    });
  };
  
  // Update breakpoint decorations
  useEffect(() => {
    if (editorRef.current && monacoRef.current && activeFile) {
      const fileBreakpoints = breakpoints.filter(bp => bp.file_path === activeFile.path);
      const decorations = fileBreakpoints.map(bp => ({
        range: new monacoRef.current.Range(bp.line, 1, bp.line, 1),
        options: {
          isWholeLine: true,
          className: 'breakpoint-line',
          glyphMarginClassName: 'breakpoint-glyph'
        }
      }));
      
      editorRef.current.deltaDecorations([], decorations);
    }
  }, [breakpoints, activeFile]);
  
  const getLanguage = (filename) => {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop();
    const langMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', html: 'html', css: 'css', scss: 'scss',
      json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
      xml: 'xml', sql: 'sql', sh: 'shell', bash: 'shell',
      go: 'go', rs: 'rust', java: 'java', c: 'c', cpp: 'cpp',
      rb: 'ruby', php: 'php', swift: 'swift'
    };
    return langMap[ext] || 'plaintext';
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Tabs */}
      <div className="flex items-center bg-zinc-800/50 border-b border-zinc-700 overflow-x-auto" data-testid="editor-tabs">
        {openFiles.map(file => (
          <div
            key={file.id}
            className={cn(
              "flex items-center gap-2 px-3 py-2 border-r border-zinc-700 cursor-pointer min-w-0",
              "hover:bg-zinc-700/50 transition-colors group",
              activeFileId === file.id && "bg-zinc-900 border-t-2 border-t-blue-500"
            )}
            onClick={() => setActiveFile(file.id)}
            data-testid={`tab-${file.name}`}
          >
            <span className="text-sm truncate max-w-32 text-zinc-300">
              {file.name}
            </span>
            {file.modified && (
              <Circle className="w-2 h-2 fill-blue-400 text-blue-400" />
            )}
            <button
              onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
              className="p-0.5 rounded hover:bg-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`close-tab-${file.name}`}
            >
              <X className="w-3 h-3 text-zinc-400" />
            </button>
          </div>
        ))}
      </div>
      
      {/* Editor */}
      <div className="flex-1 relative">
        {activeFile ? (
          <MonacoEditor
            height="100%"
            language={getLanguage(activeFile.name)}
            value={editorContent}
            onChange={handleEditorChange}
            onMount={handleEditorMount}
            theme="vs-dark"
            options={{
              fontSize: settings.fontSize,
              fontFamily: settings.fontFamily,
              tabSize: settings.tabSize,
              wordWrap: settings.wordWrap ? 'on' : 'off',
              minimap: { enabled: settings.minimap },
              lineNumbers: settings.lineNumbers ? 'on' : 'off',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              cursorBlinking: 'smooth',
              cursorSmoothCaretAnimation: 'on',
              bracketPairColorization: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
              suggestOnTriggerCharacters: true,
              quickSuggestions: true,
              parameterHints: { enabled: true },
              folding: true,
              foldingHighlight: true,
              showFoldingControls: 'always',
              renderWhitespace: 'selection',
              guides: {
                indentation: true,
                bracketPairs: true
              }
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <div className="text-xl font-semibold mb-2">AI IDE Platform</div>
              <div className="text-sm">Open a file to start editing</div>
              <div className="mt-4 text-xs text-zinc-600">
                <kbd className="px-2 py-1 bg-zinc-800 rounded">Ctrl+P</kbd> Quick Open
                <span className="mx-2">•</span>
                <kbd className="px-2 py-1 bg-zinc-800 rounded">Ctrl+Shift+P</kbd> Command Palette
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Breadcrumb */}
      {activeFile && (
        <div className="flex items-center gap-1 px-3 py-1 bg-zinc-800/30 border-t border-zinc-800 text-xs text-zinc-500">
          {activeFile.path?.split('/').filter(Boolean).map((part, i, arr) => (
            <React.Fragment key={i}>
              <span className={i === arr.length - 1 ? 'text-zinc-300' : ''}>{part}</span>
              {i < arr.length - 1 && <span>/</span>}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default Editor;
