'use client';

import MonacoEditorPro, {
} from '@/components/editor/MonacoEditorPro';
import RemoteCursorLayer from '@/components/collaboration/RemoteCursorLayer';

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
