'use client';

import { useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import Breadcrumbs from '../../../web/components/editor/Breadcrumbs';
import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro';
import type { EditorGroup, SplitDirection } from '../../../web/components/editor/SplitEditor';
import TabBar from '../../../web/components/editor/TabBar';
import WorkbenchEditorSidecar from './WorkbenchEditorSidecar';
import WorkbenchEditorSurface from './WorkbenchEditorSurface';
import type { WorkbenchEditorSurfaceProps } from './WorkbenchEditorSurface.types';
import WorkbenchEditorToolbar from './WorkbenchEditorToolbar';
import { type DocumentSymbol } from '../../../web/components/outline/OutlinePanel';
import { useBrowserSearch } from '../../../web/lib/navigation/use-browser-pathname';

import type {
  ActiveFileState,
  WorkbenchCollaborationStatus,
  EditorCursorStatus,
  EditorPane,
  EditorSelectionStatus,
  InlineApplyResult,
} from './types';
import type { RemotePeer } from '../../../web/hooks/useCollaborationAwareness';
import type { CollaborationSession } from '../../../web/lib/yjs-collaboration';

type EditorInstanceRef = MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;

export type WorkbenchEditorPaneProps = {
  activeFile: ActiveFileState | null;
  secondaryFile: ActiveFileState | null;
  bridgeActiveFile: ActiveFileState | null;
  activeDiagnostics: MonacoDiagnostic[];
  splitEditorGroups: EditorGroup[];
  outlineSymbols: DocumentSymbol[];
  splitEditorOpen: boolean;
  splitActivePane: EditorPane;
  splitDirection: SplitDirection;
  nextOpenTarget: EditorPane;
  isCompactViewport: boolean;
  isReadingFile: boolean;
  fileError: string | null;
  showIntelliSense: boolean;
  showOutline: boolean;
  showDiagnostics: boolean;
  fullAccessActive: boolean;
  collaborationConnected: boolean;
  collaborationSession: CollaborationSession | null;
  collaborationNativeBindingEnabled: boolean;
  collaborationStatus: WorkbenchCollaborationStatus;
  collaborationPeers: RemotePeer[];
  primaryEditorRef: EditorInstanceRef;
  secondaryEditorRef: EditorInstanceRef;
  editorRef: EditorInstanceRef;
  setSplitActivePane: Dispatch<SetStateAction<EditorPane>>;
  setSecondaryFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setActiveFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setShowIntelliSense: Dispatch<SetStateAction<boolean>>;
  setShowOutline: Dispatch<SetStateAction<boolean>>;
  setShowDiagnostics: Dispatch<SetStateAction<boolean>>;
  setSplitDirection: Dispatch<SetStateAction<SplitDirection>>;
  setNextOpenTarget: Dispatch<SetStateAction<EditorPane>>;
  setSplitEditorOpen: Dispatch<SetStateAction<boolean>>;
  setEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
  setSecondaryEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
  setEditorDocumentSymbols: WorkbenchEditorSurfaceProps['setEditorDocumentSymbols'];
  setSecondaryEditorDocumentSymbols: WorkbenchEditorSurfaceProps['setSecondaryEditorDocumentSymbols'];
  onFind: () => void;
  onReplace: () => void;
  onToggleSplitEditor: () => void;
  onJumpToOutlineSymbol: (symbol: DocumentSymbol) => void;
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
  onCursorStatusChange?: (status: EditorCursorStatus) => void;
  onSelectionStatusChange?: (status: EditorSelectionStatus) => void;
  editorCursorStatus: EditorCursorStatus | null;
};

export function WorkbenchEditorPane({
  activeFile,
  secondaryFile,
  bridgeActiveFile,
  activeDiagnostics,
  splitEditorGroups,
  outlineSymbols,
  splitEditorOpen,
  splitActivePane,
  splitDirection,
  nextOpenTarget,
  isCompactViewport,
  isReadingFile,
  fileError,
  showIntelliSense,
  showOutline,
  showDiagnostics,
  fullAccessActive,
  collaborationConnected,
  collaborationSession,
  collaborationNativeBindingEnabled,
  collaborationStatus,
  collaborationPeers,
  primaryEditorRef,
  secondaryEditorRef,
  editorRef,
  setSplitActivePane,
  setSecondaryFile,
  setActiveFile,
  setShowIntelliSense,
  setShowOutline,
  setShowDiagnostics,
  setSplitDirection,
  setNextOpenTarget,
  setSplitEditorOpen,
  setEditorDiagnostics,
  setSecondaryEditorDiagnostics,
  setEditorDocumentSymbols,
  setSecondaryEditorDocumentSymbols,
  onFind,
  onReplace,
  onToggleSplitEditor,
  onJumpToOutlineSymbol,
  onInlineApplyResult,
  onRequestFullAccess,
  onSaveFile,
  onCursorPresenceChange,
  onSelectionPresenceChange,
  onCursorStatusChange,
  onSelectionStatusChange,
  editorCursorStatus,
}: WorkbenchEditorPaneProps) {
  const search = useBrowserSearch();
  const inlineEditProjectId = useMemo(() => {
    const projectIdParam = new URLSearchParams(search).get('projectId');
    const normalizedProjectIdParam = projectIdParam?.trim();
    return normalizedProjectIdParam || undefined;
  }, [search]);
  const currentDiagnosticsFilePath = bridgeActiveFile?.path ?? activeFile?.path ?? '';
  const breadcrumbFile = bridgeActiveFile ?? activeFile;
  const breadcrumbLine =
    !editorCursorStatus
      ? 1
      : !splitEditorOpen || editorCursorStatus.pane === splitActivePane
        ? editorCursorStatus.line
        : 1;

  return (
    <div className="h-full flex flex-col">
      <TabBar />
      {breadcrumbFile ? (
        <Breadcrumbs
          filePath={breadcrumbFile.path}
          symbols={outlineSymbols}
          currentLine={breadcrumbLine}
          onNavigateSymbol={onJumpToOutlineSymbol}
        />
      ) : null}
      <WorkbenchEditorToolbar
        isCompactViewport={isCompactViewport}
        collaborationConnected={collaborationConnected}
        collaborationStatus={collaborationStatus}
        collaborationPeers={collaborationPeers}
        splitEditorOpen={splitEditorOpen}
        nextOpenTarget={nextOpenTarget}
        splitDirection={splitDirection}
        showIntelliSense={showIntelliSense}
        showOutline={showOutline}
        showDiagnostics={showDiagnostics}
        setNextOpenTarget={setNextOpenTarget}
        setSplitDirection={setSplitDirection}
        setShowIntelliSense={setShowIntelliSense}
        setShowOutline={setShowOutline}
        setShowDiagnostics={setShowDiagnostics}
        onFind={onFind}
        onReplace={onReplace}
        onToggleSplitEditor={onToggleSplitEditor}
      />
      <div className="flex-1 overflow-hidden">
        <div className="h-full min-h-0 flex">
          <div className="flex-1 min-w-0">
            <WorkbenchEditorSurface
              activeFile={activeFile}
              secondaryFile={secondaryFile}
              splitEditorGroups={splitEditorGroups}
              splitEditorOpen={splitEditorOpen}
              splitActivePane={splitActivePane}
              splitDirection={splitDirection}
              isReadingFile={isReadingFile}
              fileError={fileError}
              fullAccessActive={fullAccessActive}
              collaborationPeers={collaborationPeers}
              collaborationSession={collaborationSession}
              collaborationNativeBindingEnabled={collaborationNativeBindingEnabled}
              projectId={inlineEditProjectId}
              primaryEditorRef={primaryEditorRef}
              secondaryEditorRef={secondaryEditorRef}
              editorRef={editorRef}
              setSplitActivePane={setSplitActivePane}
              setSecondaryFile={setSecondaryFile}
              setActiveFile={setActiveFile}
              setNextOpenTarget={setNextOpenTarget}
              setSplitEditorOpen={setSplitEditorOpen}
              setEditorDiagnostics={setEditorDiagnostics}
              setSecondaryEditorDiagnostics={setSecondaryEditorDiagnostics}
              setEditorDocumentSymbols={setEditorDocumentSymbols}
              setSecondaryEditorDocumentSymbols={setSecondaryEditorDocumentSymbols}
              onInlineApplyResult={onInlineApplyResult}
              onRequestFullAccess={onRequestFullAccess}
              onSaveFile={onSaveFile}
              onCursorPresenceChange={onCursorPresenceChange}
              onSelectionPresenceChange={onSelectionPresenceChange}
              onCursorStatusChange={onCursorStatusChange}
              onSelectionStatusChange={onSelectionStatusChange}
            />
          </div>
          <WorkbenchEditorSidecar
            showIntelliSense={showIntelliSense}
            showOutline={showOutline}
            showDiagnostics={showDiagnostics}
            currentDiagnosticsFilePath={currentDiagnosticsFilePath}
            activeDiagnostics={activeDiagnostics}
            outlineSymbols={outlineSymbols}
            activeFilePath={bridgeActiveFile?.path ?? activeFile?.path ?? ''}
            onJumpToOutlineSymbol={onJumpToOutlineSymbol}
          />
        </div>
      </div>
    </div>
  );
}

export default WorkbenchEditorPane;
