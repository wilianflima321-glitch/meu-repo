'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type * as monacoEditor from 'monaco-editor';

import RemoteCursorLayer from '../../../web/components/collaboration/RemoteCursorLayer';
import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro.types';
import { publishMonacoDiagnosticsToProblems } from '../../../web/lib/problems/monaco-diagnostics-bridge';
import useNativeMonacoYjsBinding from './useNativeMonacoYjsBinding';
import type { MonacoEditorProps } from '../../../web/components/editor/MonacoEditorPro';

import type {
  ActiveFileState,
  EditorPane,
} from './types';
import type { WorkbenchEditorCanvasSharedProps } from './WorkbenchEditorSurface.types';

type WorkbenchEditorCanvasProps = WorkbenchEditorCanvasSharedProps & {
  fileState: ActiveFileState;
  pane: EditorPane;
};

const MonacoEditorPro = dynamic<MonacoEditorProps>(
  () => import('../../../web/components/editor/MonacoEditorPro').then((module) => module.MonacoEditorPro),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[320px] items-center justify-center rounded-[14px] border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_88%,transparent)] text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">
        Loading editor runtime...
      </div>
    ),
  }
);

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
  const setPaneDiagnostics = isSecondary ? setSecondaryEditorDiagnostics : setEditorDiagnostics;
  const setDocumentSymbols = isSecondary ? setSecondaryEditorDocumentSymbols : setEditorDocumentSymbols;
  const [mountedEditor, setMountedEditor] = useState<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

  const setDiagnostics = (diagnostics: MonacoDiagnostic[]) => {
    setPaneDiagnostics(diagnostics);
    publishMonacoDiagnosticsToProblems(fileState.path, diagnostics);
  };

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
