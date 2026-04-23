'use client';

import { useMemo, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type * as monacoEditor from 'monaco-editor';

import CollaboratorsBar from '@/components/collaboration/CollaboratorsBar';
import RemoteCursorLayer from '@/components/collaboration/RemoteCursorLayer';
import MonacoEditorPro, {
  type Diagnostic as MonacoDiagnostic,
} from '@/components/editor/MonacoEditorPro';
import SplitEditor, {
  type EditorGroup,
  type SplitDirection,
} from '@/components/editor/SplitEditor';
import TabBar from '@/components/editor/TabBar';
import { ErrorHighlighting } from '@/components/ide/ErrorHighlighting';
import { IntelliSense } from '@/components/ide/IntelliSense';
import OutlinePanel, { type DocumentSymbol } from '@/components/outline/OutlinePanel';
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

const workbenchActionButtonClass =
  'rounded-lg px-3 py-1.5 min-h-9 text-[11px] font-medium transition-colors';
const workbenchInactiveActionClass =
  'text-[var(--aethel-text-tertiary)] hover:text-[var(--aethel-text-secondary)]';

function diagnosticsToErrors(
  diagnostics: MonacoDiagnostic[],
  filePath: string,
) {
  return diagnostics.map((diagnostic, index) => {
    const type: 'error' | 'warning' | 'info' =
      diagnostic.severity === 'error'
        ? 'error'
        : diagnostic.severity === 'warning'
          ? 'warning'
          : 'info';

    const severity: 'major' | 'minor' | 'suggestion' =
      diagnostic.severity === 'error'
        ? 'major'
        : diagnostic.severity === 'warning'
          ? 'minor'
          : 'suggestion';

    return {
      id: `${filePath}:${diagnostic.line}:${diagnostic.column}:${index}`,
      type,
      severity,
      message: diagnostic.message,
      code: diagnostic.code ? String(diagnostic.code) : '',
      line: diagnostic.line,
      column: diagnostic.column,
      file: filePath,
      documentation: diagnostic.source ? `Origem: ${diagnostic.source}` : '',
      fixable: false,
    };
  });
}

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
  const liveCursorCount = collaborationPeers.filter((peer) => peer.cursor).length;
  const showCollaborators = collaborationPeers.length > 0;

  return (
    <div className="h-full flex flex-col">
      {isCompactViewport && (
        <div className="border-b border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-4 py-3.5 text-xs leading-6 text-[color-mix(in_srgb,var(--aethel-warning-light)_70%,transparent)]">
          Viewport compacto detectado. Para melhor experiência use desktop com {'>='} 1024px.
        </div>
      )}
      <TabBar />
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--aethel-border-secondary)_70%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_46%,transparent)] px-3 py-2.5 text-[11px]">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-col text-[var(--aethel-text-tertiary)]">
            <span className="font-medium uppercase tracking-[0.12em]">Ferramentas do editor</span>
            <span className="truncate pt-1 text-[11px] text-[var(--aethel-text-secondary)]">
              {showCollaborators
                ? liveCursorCount > 0
                  ? `${liveCursorCount} cursor${liveCursorCount > 1 ? 's' : ''} ativos`
                  : 'Presenca sincronizada'
                : collaborationConnected
                  ? 'Sessao ao vivo pronta'
                  : 'Modo solo'}
            </span>
          </div>
          <div
            aria-hidden="true"
            className="hidden h-7 w-px bg-[color-mix(in_srgb,var(--aethel-border-secondary)_72%,transparent)] sm:block"
          />
          {showCollaborators ? (
            <CollaboratorsBar
              peers={collaborationPeers}
              maxVisible={4}
              showStatusDot
              className="max-w-full"
            />
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_68%,transparent)] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
              <span
                aria-hidden="true"
                className={`inline-block h-2 w-2 rounded-full ${
                  collaborationConnected
                    ? 'bg-[var(--aethel-success)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--aethel-success)_16%,transparent)]'
                    : 'bg-[var(--aethel-text-quaternary)]'
                }`}
              />
              {collaborationConnected ? 'Live pronto' : 'Solo'}
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onFind}
            className={`${workbenchActionButtonClass} ${workbenchInactiveActionClass}`}
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={onReplace}
            className={`${workbenchActionButtonClass} ${workbenchInactiveActionClass}`}
          >
            Substituir
          </button>
          <button
            type="button"
            onClick={onToggleSplitEditor}
            className={`${workbenchActionButtonClass} ${
              splitEditorOpen
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                : workbenchInactiveActionClass
            }`}
          >
            {splitEditorOpen ? 'Fechar split' : 'Dividir editor'}
          </button>
          {splitEditorOpen && (
            <>
              <button
                type="button"
                onClick={() => setNextOpenTarget((prev) => (prev === 'secondary' ? 'primary' : 'secondary'))}
                className={`${workbenchActionButtonClass} ${
                  nextOpenTarget === 'secondary'
                    ? 'bg-[color-mix(in_srgb,var(--aethel-success)_18%,transparent)] text-[var(--aethel-success-light)]'
                    : workbenchInactiveActionClass
                }`}
              >
                {nextOpenTarget === 'secondary' ? 'Proximo arquivo: lateral' : 'Proximo arquivo: principal'}
              </button>
              <button
                type="button"
                onClick={() => setSplitDirection((prev) => (prev === 'horizontal' ? 'vertical' : 'horizontal'))}
                className={`${workbenchActionButtonClass} ${workbenchInactiveActionClass}`}
              >
                {splitDirection === 'horizontal' ? 'Empilhar verticalmente' : 'Dividir lado a lado'}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setShowIntelliSense((prev) => !prev)}
            className={`${workbenchActionButtonClass} ${
              showIntelliSense
                ? 'bg-[color-mix(in_srgb,var(--aethel-info)_18%,transparent)] text-[var(--aethel-info-light)]'
                : workbenchInactiveActionClass
            }`}
          >
            IntelliSense
          </button>
          <button
            type="button"
            onClick={() => setShowOutline((prev) => !prev)}
            className={`${workbenchActionButtonClass} ${
              showOutline
                ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-primary-light)]'
                : workbenchInactiveActionClass
            }`}
          >
            Outline
          </button>
          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className={`${workbenchActionButtonClass} ${
              showDiagnostics
                ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_18%,transparent)] text-[var(--aethel-warning-light)]'
                : workbenchInactiveActionClass
            }`}
          >
            Diagnosticos
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {isReadingFile && (
          <div className="h-full flex items-center justify-center px-6">
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-border-secondary)_72%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_38%,transparent)] px-5 py-4 text-sm text-[var(--aethel-text-tertiary)]">
              Carregando arquivo...
            </div>
          </div>
        )}
        {!isReadingFile && fileError && (
          <div className="h-full flex items-center justify-center px-6">
            <div className="max-w-xl rounded border border-[color-mix(in_srgb,var(--aethel-error)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] px-4 py-3 text-sm text-[var(--aethel-error)]">
              {fileError}
            </div>
          </div>
        )}
        {!isReadingFile && !fileError && activeFile && (
          <div className="h-full min-h-0">
            <div className="h-full min-h-0 flex">
              <div className="flex-1 min-w-0">
                {splitEditorOpen ? (
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

                      const isSecondary = groupId === 'secondary';
                      const fileState = isSecondary ? secondaryFile : activeFile;
                      if (!fileState) return null;

                      return (
                        <div
                          className="relative h-full"
                          onMouseDown={() => {
                            setSplitActivePane(isSecondary ? 'secondary' : 'primary');
                            editorRef.current = isSecondary ? secondaryEditorRef.current : primaryEditorRef.current;
                          }}
                        >
                          <MonacoEditorPro
                            projectId={inlineEditProjectId}
                            path={fileState.path}
                            value={fileState.content}
                            language={fileState.language}
                            fullAccessActive={fullAccessActive}
                            onMount={(editor) => {
                              if (isSecondary) {
                                secondaryEditorRef.current = editor;
                              } else {
                                primaryEditorRef.current = editor;
                              }
                              if (
                                (isSecondary && splitActivePane === 'secondary') ||
                                (!isSecondary && splitActivePane === 'primary')
                              ) {
                                editorRef.current = editor;
                              }
                            }}
                            onAiApplyResult={onInlineApplyResult}
                            onRequestFullAccess={onRequestFullAccess}
                            onDiagnosticsChange={isSecondary ? setSecondaryEditorDiagnostics : setEditorDiagnostics}
                            onCursorChange={(position) => {
                              onCursorPresenceChange({
                                filePath: fileState.path,
                                pane: isSecondary ? 'secondary' : 'primary',
                                position,
                                editor: isSecondary ? secondaryEditorRef.current : primaryEditorRef.current,
                              });
                            }}
                            onSelectionChange={({ range }) => {
                              onSelectionPresenceChange({
                                filePath: fileState.path,
                                pane: isSecondary ? 'secondary' : 'primary',
                                range,
                                editor: isSecondary ? secondaryEditorRef.current : primaryEditorRef.current,
                              });
                            }}
                            onChange={(value) => {
                              const nextValue = value ?? '';
                              if (isSecondary) {
                                setSecondaryFile((prev) => (prev ? { ...prev, content: nextValue } : prev));
                              } else {
                                setActiveFile((prev) => (prev ? { ...prev, content: nextValue } : prev));
                              }
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
                    }}
                  />
                ) : (
                  <div className="relative h-full">
                    <MonacoEditorPro
                      projectId={inlineEditProjectId}
                      path={activeFile.path}
                      value={activeFile.content}
                      language={activeFile.language}
                      fullAccessActive={fullAccessActive}
                      onMount={(editor) => {
                        primaryEditorRef.current = editor;
                        editorRef.current = editor;
                      }}
                      onAiApplyResult={onInlineApplyResult}
                      onRequestFullAccess={onRequestFullAccess}
                      onDiagnosticsChange={setEditorDiagnostics}
                      onCursorChange={(position) => {
                        onCursorPresenceChange({
                          filePath: activeFile.path,
                          pane: 'primary',
                          position,
                          editor: primaryEditorRef.current,
                        });
                      }}
                      onSelectionChange={({ range }) => {
                        onSelectionPresenceChange({
                          filePath: activeFile.path,
                          pane: 'primary',
                          range,
                          editor: primaryEditorRef.current,
                        });
                      }}
                      onChange={(value) => {
                        setActiveFile((prev) =>
                          prev
                            ? {
                                ...prev,
                                content: value ?? '',
                              }
                            : prev,
                        );
                      }}
                      onSave={(value) => {
                        void onSaveFile(activeFile.path, value);
                      }}
                    />
                    <RemoteCursorLayer
                      peers={collaborationPeers.filter((peer) => peer.cursor?.filePath === activeFile.path)}
                    />
                  </div>
                )}
              </div>
              {(showIntelliSense || showOutline || showDiagnostics) && (
                <div className="w-80 border-l border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] flex flex-col">
                  {showIntelliSense && (
                    <div className="flex-1 min-h-0 border-b border-[var(--aethel-border-secondary)]">
                      <IntelliSense />
                    </div>
                  )}
                  {showOutline && (
                    <div className="flex-1 min-h-0 border-b border-[var(--aethel-border-secondary)]">
                      <OutlinePanel
                        symbols={outlineSymbols}
                        activeFilePath={bridgeActiveFile?.path ?? activeFile.path}
                        onSymbolClick={onJumpToOutlineSymbol}
                      />
                    </div>
                  )}
                  {showDiagnostics && currentDiagnosticsFilePath && (
                    <div className="flex-1 min-h-0">
                      <ErrorHighlighting
                        errors={diagnosticsToErrors(activeDiagnostics, currentDiagnosticsFilePath)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {!isReadingFile && !fileError && !activeFile && (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm leading-6 text-[var(--aethel-text-tertiary)]">
            Selecione um arquivo para iniciar a edição.
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkbenchEditorPane;
