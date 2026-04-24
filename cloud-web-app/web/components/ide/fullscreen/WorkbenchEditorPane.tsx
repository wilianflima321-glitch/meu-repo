'use client';

import { useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import type { Diagnostic as MonacoDiagnostic } from '@/components/editor/MonacoEditorPro';
import type { EditorGroup, SplitDirection } from '@/components/editor/SplitEditor';
import TabBar from '@/components/editor/TabBar';
import WorkbenchEditorSidecar from '@/components/ide/fullscreen/WorkbenchEditorSidecar';
import WorkbenchEditorSurface from '@/components/ide/fullscreen/WorkbenchEditorSurface';
import WorkbenchEditorToolbar from '@/components/ide/fullscreen/WorkbenchEditorToolbar';
import { type DocumentSymbol } from '@/components/outline/OutlinePanel';
import { useBrowserSearch } from '@/lib/navigation/use-browser-pathname';

import type {
  ActiveFileState,
  EditorPane,
  InlineApplyResult,
} from '@/components/ide/fullscreen/types';
import type { RemotePeer } from '@/hooks/useCollaborationAwareness';

type EditorInstanceRef = MutableRefObject<monacoEditor.editor.IStandaloneCodeEditor | null>;

type WorkbenchEditorPaneProps = {
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
  onFind,
  onReplace,
  onToggleSplitEditor,
  onJumpToOutlineSymbol,
  onInlineApplyResult,
  onRequestFullAccess,
  onSaveFile,
  onCursorPresenceChange,
  onSelectionPresenceChange,
}: WorkbenchEditorPaneProps) {
  const search = useBrowserSearch();
  const inlineEditProjectId = useMemo(() => {
    const projectIdParam = new URLSearchParams(search).get('projectId');
    const normalizedProjectIdParam = projectIdParam?.trim();
    return normalizedProjectIdParam || undefined;
  }, [search]);
  const currentDiagnosticsFilePath = bridgeActiveFile?.path ?? activeFile?.path ?? '';

  return (
    <div className="h-full flex flex-col">
      <TabBar />
      <WorkbenchEditorToolbar
        isCompactViewport={isCompactViewport}
        collaborationConnected={collaborationConnected}
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
              inlineEditProjectId={inlineEditProjectId}
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
              onInlineApplyResult={onInlineApplyResult}
              onRequestFullAccess={onRequestFullAccess}
              onSaveFile={onSaveFile}
              onCursorPresenceChange={onCursorPresenceChange}
              onSelectionPresenceChange={onSelectionPresenceChange}
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
