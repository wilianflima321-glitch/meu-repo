import React, { useRef, useEffect, useCallback, useState } from 'react';
import MonacoEditor, { loader } from '@monaco-editor/react';
import { useIDEStore } from '@/store/ideStore';
import { X, Circle, ChevronRight, SplitSquareHorizontal, MoreHorizontal, Pin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateFile } from '@/services/api';
import { debounce } from 'lodash';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';

// Configure Monaco loader
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

const Editor = () => {
  const {
    openFiles, activeFileId, editorContent, updateFileContent,
    setActiveFile, closeFile, settings, breakpoints, markFileSaved,
    addBreakpoint, removeBreakpoint
  } = useIDEStore();
  
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const activeFile = openFiles.find(f => f.id === activeFileId);
  
  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (fileId, content) => {
      if (settings.autoSave) {
        setIsSaving(true);
        try {
          await updateFile(fileId, { content });
          markFileSaved(fileId);
        } catch (err) {
          console.error('Auto-save failed:', err);
        } finally {
          setIsSaving(false);
        }
      }
    }, 1500),
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
    
    // Define custom theme
    monaco.editor.defineTheme('ide-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'type', foreground: '4EC9B0' },
      ],
      colors: {
        'editor.background': '#09090b',
        'editor.foreground': '#D4D4D4',
        'editorLineNumber.foreground': '#5A5A5A',
        'editorLineNumber.activeForeground': '#FFFFFF',
        'editor.selectionBackground': '#264F78',
        'editor.lineHighlightBackground': '#1a1a1d',
        'editorCursor.foreground': '#FFFFFF',
        'editorWhitespace.foreground': '#3B3B3B',
      }
    });
    
    monaco.editor.setTheme('ide-dark');
    
    // Custom keybindings
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
      if (activeFileId) {
        setIsSaving(true);
        try {
          await updateFile(activeFileId, { content: editor.getValue() });
          markFileSaved(activeFileId);
        } catch (err) {
          console.error('Save failed:', err);
        } finally {
          setIsSaving(false);
        }
      }
    });
    
    // Toggle breakpoint on F9
    editor.addCommand(monaco.KeyCode.F9, () => {
      const position = editor.getPosition();
      if (position && activeFile) {
        const line = position.lineNumber;
        const existing = breakpoints.find(b => b.file_path === activeFile.path && b.line === line);
        if (existing) {
          removeBreakpoint(line);
        } else {
          addBreakpoint({ file_path: activeFile.path, line, enabled: true });
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
    
    // Gutter click for breakpoints
    editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN && activeFile) {
        const line = e.target.position.lineNumber;
        const existing = breakpoints.find(b => b.file_path === activeFile.path && b.line === line);
        if (existing) {
          removeBreakpoint(line);
        } else {
          addBreakpoint({ file_path: activeFile.path, line, enabled: true });
        }
      }
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
          glyphMarginClassName: 'breakpoint-glyph',
          glyphMarginHoverMessage: { value: `Breakpoint at line ${bp.line}` }
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
      rb: 'ruby', php: 'php', swift: 'swift', vue: 'html', svelte: 'html'
    };
    return langMap[ext] || 'plaintext';
  };
  
  const handleCloseOthers = (fileId) => {
    openFiles.forEach(f => {
      if (f.id !== fileId) closeFile(f.id);
    });
  };
  
  const handleCloseAll = () => {
    openFiles.forEach(f => closeFile(f.id));
  };
  
  return (
    <div className="flex flex-col h-full bg-zinc-900">
      {/* Tabs */}
      <div className="flex items-center bg-zinc-900 border-b border-zinc-800" data-testid="editor-tabs">
        <div className="flex-1 flex items-center overflow-x-auto scrollbar-none">
          {openFiles.map(file => (
            <ContextMenu key={file.id}>
              <ContextMenuTrigger>
                <div
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 border-r border-zinc-800 cursor-pointer min-w-0 group relative",
                    "hover:bg-zinc-800/50 transition-colors",
                    activeFileId === file.id 
                      ? "bg-zinc-950 text-white" 
                      : "text-zinc-500"
                  )}
                  onClick={() => setActiveFile(file.id)}
                  data-testid={`tab-${file.name}`}
                >
                  {activeFileId === file.id && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-500" />
                  )}
                  <span className="text-sm truncate max-w-32">
                    {file.name}
                  </span>
                  {file.modified ? (
                    <Circle className="w-2 h-2 fill-white text-white flex-shrink-0" />
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); closeFile(file.id); }}
                      className="p-0.5 rounded hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      data-testid={`close-tab-${file.name}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </ContextMenuTrigger>
              <ContextMenuContent className="bg-zinc-900 border-zinc-700 w-48">
                <ContextMenuItem onClick={() => closeFile(file.id)} className="text-xs">
                  Close
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleCloseOthers(file.id)} className="text-xs">
                  Close Others
                </ContextMenuItem>
                <ContextMenuItem onClick={handleCloseAll} className="text-xs">
                  Close All
                </ContextMenuItem>
                <ContextMenuSeparator className="bg-zinc-700" />
                <ContextMenuItem className="text-xs">Copy Path</ContextMenuItem>
                <ContextMenuItem className="text-xs">Copy Relative Path</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          ))}
        </div>
        {openFiles.length > 0 && (
          <div className="flex items-center gap-1 px-2">
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <SplitSquareHorizontal className="w-3.5 h-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
                <DropdownMenuItem className="text-xs" onClick={handleCloseAll}>Close All Tabs</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      
      {/* Editor */}
      <div className="flex-1 relative">
        {activeFile ? (
          <>
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
                glyphMargin: true,
                guides: {
                  indentation: true,
                  bracketPairs: true,
                  highlightActiveIndentation: true
                },
                padding: { top: 8 }
              }}
            />
            {isSaving && (
              <div className="absolute bottom-4 right-4 px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-400">
                Saving...
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <div className="text-center max-w-md">
              <div className="text-6xl mb-6">🚀</div>
              <h2 className="text-2xl font-semibold text-white mb-2">AI IDE Platform</h2>
              <p className="text-sm mb-6">Open a file to start editing, or create a new project</p>
              <div className="flex flex-wrap justify-center gap-3 text-xs">
                <div className="px-3 py-2 bg-zinc-800 rounded-lg">
                  <kbd className="text-zinc-400">⌘P</kbd>
                  <span className="ml-2 text-zinc-500">Quick Open</span>
                </div>
                <div className="px-3 py-2 bg-zinc-800 rounded-lg">
                  <kbd className="text-zinc-400">⌘⇧P</kbd>
                  <span className="ml-2 text-zinc-500">Command Palette</span>
                </div>
                <div className="px-3 py-2 bg-zinc-800 rounded-lg">
                  <kbd className="text-zinc-400">⌘B</kbd>
                  <span className="ml-2 text-zinc-500">Toggle Sidebar</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Breadcrumb */}
      {activeFile && (
        <div className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 border-t border-zinc-800 text-xs text-zinc-500">
          <span className="text-zinc-600">~</span>
          {activeFile.path?.split('/').filter(Boolean).map((part, i, arr) => (
            <React.Fragment key={i}>
              <ChevronRight className="w-3 h-3 text-zinc-700" />
              <button className={cn(
                "hover:text-white transition-colors",
                i === arr.length - 1 && "text-zinc-300"
              )}>
                {part}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default Editor;
