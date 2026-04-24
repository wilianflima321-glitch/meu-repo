'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import MonacoEditorPro, {
  type Diagnostic as MonacoDiagnostic,
} from '@/components/editor/MonacoEditorPro';
import SplitEditor, {
  type EditorGroup,
  type SplitDirection,
} from '@/components/editor/SplitEditor';
import RemoteCursorLayer from '@/components/collaboration/RemoteCursorLayer';

import type {
  ActiveFileState,
  EditorPane,
  InlineApplyResult,
} from '@/components/ide/fullscreen/types';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';

type EditorInstanceRef = MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;

type WorkbenchEditorSurfaceProps = {
  activeFile: ActiveFileState | null;
  secondaryFile: ActiveFileState | null;
  splitEditorGroups: EditorGroup[];
  splitEditorOpen: boolean;
  splitActivePane: EditorPane;
  splitDirection: SplitDirection;
  isReadingFile: boolean;
  fileError: string | null;
  fullAccessActive: boolean;
  collaborationPeers: RemotePeer[];
  inlineEditProjectId?: string;
  primaryEditorRef: EditorInstanceRef;
  secondaryEditorRef: EditorInstanceRef;
  editorRef: EditorInstanceRef;
  setSplitActivePane: Dispatch<SetStateAction<EditorPane>>;
  setSecondaryFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setActiveFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setNextOpenTarget: Dispatch<SetStateAction<EditorPane>>;
  setSplitEditorOpen: Dispatch<SetStateAction<boolean>>;
  setEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
  setSecondaryEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
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

type EditorCanvasProps = {
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
  onCursorPresenceChange: WorkbenchEditorSurfaceProps['onCursorPresenceChange'];
  onSelectionPresenceChange: WorkbenchEditorSurfaceProps['onSelectionPresenceChange'];
};

function EditorCanvas({
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
}: EditorCanvasProps) {
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

export default function WorkbenchEditorSurface({
  activeFile,
  secondaryFile,
  splitEditorGroups,
  splitEditorOpen,
  splitActivePane,
  splitDirection,
  isReadingFile,
  fileError,
  fullAccessActive,
  collaborationPeers,
  inlineEditProjectId,
  primaryEditorRef,
  secondaryEditorRef,
  editorRef,
  setSplitActivePane,
  setSecondaryFile,
  setActiveFile,
  setNextOpenTarget,
  setSplitEditorOpen,
  setEditorDiagnostics,
  setSecondaryEditorDiagnostics,
  onInlineApplyResult,
  onRequestFullAccess,
  onSaveFile,
  onCursorPresenceChange,
  onSelectionPresenceChange,
}: WorkbenchEditorSurfaceProps) {
  if (isReadingFile) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-border-secondary)_72%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-5 py-4 text-sm text-[var(--aethel-text-tertiary)]">
          Carregando arquivo...
        </div>
      </div>
    );
  }

  if (fileError) {
    return (
      <div className="h-full flex items-center justify-center px-6">
        <div className="max-w-xl rounded border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error)]">
          {fileError}
        </div>
      </div>
    );
  }

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-[var(--aethel-text-tertiary)]">
        Selecione um arquivo para iniciar a edicao.
      </div>
    );
  }

  if (!splitEditorOpen) {
    return (
      <EditorCanvas
        fileState={activeFile}
        pane="primary"
        projectId={inlineEditProjectId}
        fullAccessActive={fullAccessActive}
        collaborationPeers={collaborationPeers}
        primaryEditorRef={primaryEditorRef}
        secondaryEditorRef={secondaryEditorRef}
        editorRef={editorRef}
        setActiveFile={setActiveFile}
        setSecondaryFile={setSecondaryFile}
        setEditorDiagnostics={setEditorDiagnostics}
        setSecondaryEditorDiagnostics={setSecondaryEditorDiagnostics}
        setSplitActivePane={setSplitActivePane}
        onInlineApplyResult={onInlineApplyResult}
        onRequestFullAccess={onRequestFullAccess}
        onSaveFile={onSaveFile}
        onCursorPresenceChange={onCursorPresenceChange}
        onSelectionPresenceChange={onSelectionPresenceChange}
      />
    );
  }

  return (
    <SplitEditor
      groups={splitEditorGroups}
      activeGroupId={splitActivePane}
      splitDirection={splitDirection}
      onGroupFocus={(groupId) => {
        const pane = groupId === 'secondary' ? 'secondary' : 'primary';
        setSplitActivePane(pane);
        editorRef.current = pane === 'secondary' ? secondaryEditorRef.current : primaryEditorRef.current;
      }}
      onSplit={() => {}}
      onTabClick={(_, groupId) => {
        const pane = groupId === 'secondary' ? 'secondary' : 'primary';
        setSplitActivePane(pane);
        editorRef.current = pane === 'secondary' ? secondaryEditorRef.current : primaryEditorRef.current;
        if (pane === 'secondary') {
          secondaryEditorRef.current?.focus();
        } else {
          primaryEditorRef.current?.focus();
        }
      }}
      onTabClose={(_, groupId) => {
        if (groupId === 'secondary') {
          setSplitEditorOpen(false);
          setSecondaryFile(null);
          setNextOpenTarget('primary');
          setSplitActivePane('primary');
          editorRef.current = primaryEditorRef.current;
          return;
        }
        setActiveFile(null);
      }}
      onTabPin={() => {}}
      onTabMove={() => {}}
      onGroupClose={(groupId) => {
        if (groupId === 'secondary') {
          setSplitEditorOpen(false);
          setSecondaryFile(null);
          setNextOpenTarget('primary');
          setSplitActivePane('primary');
          editorRef.current = primaryEditorRef.current;
        }
      }}
      renderEditor={(groupId, tab) => {
        if (!tab) {
          return (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-[var(--aethel-text-tertiary)]">
              Nenhum arquivo aberto neste grupo.
            </div>
          );
        }

        const pane = groupId === 'secondary' ? 'secondary' : 'primary';
        const fileState = pane === 'secondary' ? secondaryFile : activeFile;
        if (!fileState) return null;

        return (
          <EditorCanvas
            fileState={fileState}
            pane={pane}
            projectId={inlineEditProjectId}
            fullAccessActive={fullAccessActive}
            collaborationPeers={collaborationPeers}
            primaryEditorRef={primaryEditorRef}
            secondaryEditorRef={secondaryEditorRef}
            editorRef={editorRef}
            setActiveFile={setActiveFile}
            setSecondaryFile={setSecondaryFile}
            setEditorDiagnostics={setEditorDiagnostics}
            setSecondaryEditorDiagnostics={setSecondaryEditorDiagnostics}
            setSplitActivePane={setSplitActivePane}
            onInlineApplyResult={onInlineApplyResult}
            onRequestFullAccess={onRequestFullAccess}
            onSaveFile={onSaveFile}
            onCursorPresenceChange={onCursorPresenceChange}
            onSelectionPresenceChange={onSelectionPresenceChange}
          />
        );
      }}
    />
  );
}
