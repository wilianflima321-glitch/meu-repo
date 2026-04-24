'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import MonacoEditorPro, {
  type Diagnostic as MonacoDiagnostic,
} from '@/components/editor/MonacoEditorPro';
import RemoteCursorLayer from '@/components/collaboration/RemoteCursorLayer';

import type {
  ActiveFileState,
  EditorPane,
  InlineApplyResult,
} from '@/components/ide/fullscreen/types';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';

type EditorInstanceRef = MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;

type WorkbenchEditorCanvasProps = {
  fileState: ActiveFileState;
  pane: EditorPane;
  projectId?: string;
  fullAccessActive: boolean;
  collaborationPeers: RemotePeer[];
  primaryEditorRef: EditorInstanceRef;
  secondaryEditorRef: EditorInstanceRef;
  editorRef: EditorInstanceRef;
  setActiveFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setSecondaryFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
  setSecondaryEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
  setSplitActivePane: Dispatch<SetStateAction<EditorPane>>;
  onInlineApplyResult: (result: InlineApplyResult) => void;
  onRequestFullAccess: () => void;
  onSaveFile: (path: string, content: string) => Promise<void> | void;
  onCursorPresenceChange: (args: {
    filePath: string;
    pane: EditorPane;
    position: { line: number; column: number };
    editor: monacoEditor.editor.IStandaloneCodeEditor | null;
  }) => void;
  onSelectionPresenceChange: (args: {
    filePath: string;
    pane: EditorPane;
    range: monacoEditor.IRange | null;
    editor: monacoEditor.editor.IStandaloneCodeEditor | null;
  }) => void;
};

export default function WorkbenchEditorCanvas({
  fileState,
  pane,
  projectId,
  fullAccessActive,
  collaborationPeers,
  primaryEditorRef,
  secondaryEditorRef,
  editorRef,
  setActiveFile,
  setSecondaryFile,
  setEditorDiagnostics,
  setSecondaryEditorDiagnostics,
  setSplitActivePane,
  onInlineApplyResult,
  onRequestFullAccess,
  onSaveFile,
  onCursorPresenceChange,
  onSelectionPresenceChange,
}: WorkbenchEditorCanvasProps) {
  const isSecondary = pane === 'secondary';
  const activeRef = isSecondary ? secondaryEditorRef : primaryEditorRef;
  const setDiagnostics = isSecondary ? setSecondaryEditorDiagnostics : setEditorDiagnostics;

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
        fullAccessActive={fullAccessActive}
        onMount={(editor) => {
          activeRef.current = editor;
          editorRef.current = editor;
        }}
        onAiApplyResult={onInlineApplyResult}
        onRequestFullAccess={onRequestFullAccess}
        onDiagnosticsChange={setDiagnostics}
        onCursorChange={(position) => {
          onCursorPresenceChange({
            filePath: fileState.path,
            pane,
            position,
            editor: activeRef.current,
          });
        }}
        onSelectionChange={({ range }) => {
          onSelectionPresenceChange({
            filePath: fileState.path,
            pane,
            range,
            editor: activeRef.current,
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
