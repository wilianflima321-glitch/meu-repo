'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import { type Diagnostic as MonacoDiagnostic } from '@/components/editor/MonacoEditorPro';
import SplitEditor, {
  type EditorGroup,
  type SplitDirection,
} from '@/components/editor/SplitEditor';

import type {
  ActiveFileState,
  EditorPane,
  InlineApplyResult,
} from '@/components/ide/fullscreen/types';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';
import WorkbenchEditorCanvas from '@/components/ide/fullscreen/WorkbenchEditorCanvas';
import {
  WorkbenchEditorEmptyState,
  WorkbenchEditorErrorState,
  WorkbenchEditorLoadingState,
  WorkbenchEmptyEditorGroupState,
} from '@/components/ide/fullscreen/WorkbenchEditorStates';

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
    return <WorkbenchEditorLoadingState />;
  }

  if (fileError) {
    return <WorkbenchEditorErrorState error={fileError} />;
  }

  if (!activeFile) {
    return <WorkbenchEditorEmptyState />;
  }

  if (!splitEditorOpen) {
    return (
      <WorkbenchEditorCanvas
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
          return <WorkbenchEmptyEditorGroupState />;
        }

        const pane = groupId === 'secondary' ? 'secondary' : 'primary';
        const fileState = pane === 'secondary' ? secondaryFile : activeFile;
        if (!fileState) return null;

        return (
          <WorkbenchEditorCanvas
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
