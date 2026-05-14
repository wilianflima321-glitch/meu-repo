'use client';

import { useState } from 'react';
import type * as monacoEditor from 'monaco-editor';

import MonacoEditorPro, {
} from '@/components/editor/MonacoEditorPro';
import RemoteCursorLayer from '@/components/collaboration/RemoteCursorLayer';
import useNativeMonacoYjsBinding from '@/components/ide/fullscreen/useNativeMonacoYjsBinding';

import type {
  ActiveFileState,
  EditorPane,
} from '@/components/ide/fullscreen/types';
import type { WorkbenchEditorCanvasSharedProps } from '@/components/ide/fullscreen/WorkbenchEditorSurface.types';

type WorkbenchEditorCanvasProps = WorkbenchEditorCanvasSharedProps & {
  fileState: ActiveFileState;
  pane: EditorPane;
};

export default function WorkbenchEditorCanvas({
  fileState,
  pane,
  projectId,
  fullAccessActive,
  collaborationPeers,
  collaborationSession,
  collaborationNativeBindingEnabled,
  primaryEditorRef,
  secondaryEditorRef,
  editorRef,
  setActiveFile,
  setSecondaryFile,
  setEditorDiagnostics,
  setSecondaryEditorDiagnostics,
  setEditorDocumentSymbols,
  setSecondaryEditorDocumentSymbols,
  setSplitActivePane,
  onInlineApplyResult,
  onRequestFullAccess,
  onSaveFile,
  onCursorPresenceChange,
  onSelectionPresenceChange,
  onCursorStatusChange,
  onSelectionStatusChange,
}: WorkbenchEditorCanvasProps) {
  const isSecondary = pane === 'secondary';
  const activeRef = isSecondary ? secondaryEditorRef : primaryEditorRef;
  const setDiagnostics = isSecondary ? setSecondaryEditorDiagnostics : setEditorDiagnostics;
  const setDocumentSymbols = isSecondary ? setSecondaryEditorDocumentSymbols : setEditorDocumentSymbols;
  const [mountedEditor, setMountedEditor] = useState<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

  useNativeMonacoYjsBinding({
    enabled: collaborationNativeBindingEnabled,
    session: collaborationSession,
    editor: mountedEditor,
    filePath: fileState.path,
    initialValue: fileState.content,
  });

  return (
    <div
      className="relative h-full"
      onMouseDown={() => {
        setSplitActivePane(pane);
        editorRef.current = activeRef.current;
      }}
    >
      <MonacoEditorPro
        projectId={projectId}
        path={fileState.path}
        value={fileState.content}
        language={fileState.language}
        collaborationSession={collaborationSession}
        fullAccessActive={fullAccessActive}
        onMount={(editor) => {
          activeRef.current = editor;
          editorRef.current = editor;
          setMountedEditor(editor);
        }}
        onAiApplyResult={onInlineApplyResult}
        onRequestFullAccess={onRequestFullAccess}
        onDiagnosticsChange={setDiagnostics}
        onDocumentSymbolsChange={setDocumentSymbols}
        onCursorChange={(position) => {
          onCursorPresenceChange({
            filePath: fileState.path,
            pane,
            position,
            editor: activeRef.current,
          });
          onCursorStatusChange?.({
            pane,
            line: position.line,
            column: position.column,
          });
        }}
        onSelectionChange={({ text, range }) => {
          onSelectionPresenceChange({
            filePath: fileState.path,
            pane,
            range,
            editor: activeRef.current,
          });
          onSelectionStatusChange?.({
            pane,
            lines: range ? range.endLineNumber - range.startLineNumber + 1 : 0,
            characters: text.length,
          });
        }}
        onChange={(value) => {
          const nextValue = value ?? '';
          if (isSecondary) {
            setSecondaryFile((prev) => (prev ? { ...prev, content: nextValue } : prev));
            return;
          }
          setActiveFile((prev) => (prev ? { ...prev, content: nextValue } : prev));
        }}
        onSave={(value) => {
          void onSaveFile(fileState.path, value);
        }}
      />
      <RemoteCursorLayer
        peers={collaborationPeers.filter((peer) => peer.cursor?.filePath === fileState.path)}
      />
    </div>
  );
}
