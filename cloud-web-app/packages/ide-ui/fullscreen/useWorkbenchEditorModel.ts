'use client';

import { useCallback, useEffect, useMemo, type Dispatch, type SetStateAction } from 'react';

import type { Diagnostic as MonacoDiagnostic } from '../../../web/components/editor/MonacoEditorPro';
import type { EditorGroup, EditorTab } from '../../../web/components/editor/SplitEditor';
import type { DocumentSymbol } from '../../../web/components/outline/OutlinePanel';
import { buildOutlineSymbols } from '../../../web/components/outline/outline-parser';

import type {
  ActiveFileState,
  EditorDocumentSymbolState,
  EditorPane,
} from './types';

export function resolveOutlineSymbols({
  file,
  documentSymbols,
}: {
  file: ActiveFileState | null;
  documentSymbols: EditorDocumentSymbolState | null;
}): DocumentSymbol[] {
  if (!file) return [];

  if (documentSymbols?.path === file.path && documentSymbols.authoritative) {
    return documentSymbols.symbols;
  }

  return buildOutlineSymbols(file.content, file.language);
}

type UseWorkbenchEditorModelParams = {
  activeFile: ActiveFileState | null;
  secondaryFile: ActiveFileState | null;
  editorDocumentSymbols: EditorDocumentSymbolState | null;
  secondaryEditorDocumentSymbols: EditorDocumentSymbolState | null;
  splitEditorOpen: boolean;
  splitActivePane: EditorPane;
  editorDiagnostics: MonacoDiagnostic[];
  secondaryEditorDiagnostics: MonacoDiagnostic[];
  setSplitEditorOpen: Dispatch<SetStateAction<boolean>>;
  setSplitActivePane: Dispatch<SetStateAction<EditorPane>>;
  setSecondaryFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setNextOpenTarget: Dispatch<SetStateAction<EditorPane>>;
  setEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
};

export function useWorkbenchEditorModel({
  activeFile,
  secondaryFile,
  editorDocumentSymbols,
  secondaryEditorDocumentSymbols,
  splitEditorOpen,
  splitActivePane,
  editorDiagnostics,
  secondaryEditorDiagnostics,
  setSplitEditorOpen,
  setSplitActivePane,
  setSecondaryFile,
  setNextOpenTarget,
  setEditorDiagnostics,
}: UseWorkbenchEditorModelParams) {
  const bridgeActiveFile = splitActivePane === 'secondary' && secondaryFile ? secondaryFile : activeFile;
  const activeDiagnostics =
    splitActivePane === 'secondary' ? secondaryEditorDiagnostics : editorDiagnostics;
  const activeDocumentSymbols =
    splitActivePane === 'secondary' ? secondaryEditorDocumentSymbols : editorDocumentSymbols;

  const outlineSymbols = useMemo<DocumentSymbol[]>(() => {
    return resolveOutlineSymbols({
      file: bridgeActiveFile,
      documentSymbols: activeDocumentSymbols,
    });
  }, [activeDocumentSymbols, bridgeActiveFile]);

  useEffect(() => {
    if (!activeFile?.path) {
      setEditorDiagnostics([]);
    }
  }, [activeFile?.path, setEditorDiagnostics]);

  useEffect(() => {
    if (!splitEditorOpen || secondaryFile || !activeFile) return;
    setSecondaryFile({ ...activeFile });
  }, [activeFile, secondaryFile, setSecondaryFile, splitEditorOpen]);

  const handleToggleSplitEditor = useCallback(() => {
    setSplitEditorOpen((prev) => {
      const next = !prev;
      if (!next) {
        setSecondaryFile(null);
        setNextOpenTarget('primary');
        setSplitActivePane('primary');
      } else if (activeFile) {
        setSecondaryFile((current) => current ?? { ...activeFile });
      }
      return next;
    });
  }, [activeFile, setNextOpenTarget, setSecondaryFile, setSplitActivePane, setSplitEditorOpen]);

  const splitEditorGroups = useMemo<EditorGroup[]>(() => {
    const groups: EditorGroup[] = [];
    if (activeFile) {
      const primaryTab: EditorTab = {
        id: `primary:${activeFile.path}`,
        title: activeFile.path.split('/').pop() || activeFile.path,
        path: activeFile.path,
        language: activeFile.language,
        dirty: false,
        pinned: true,
        preview: false,
      };
      groups.push({
        id: 'primary',
        tabs: [primaryTab],
        activeTabId: primaryTab.id,
      });
    }

    if (splitEditorOpen && secondaryFile) {
      const secondaryTab: EditorTab = {
        id: `secondary:${secondaryFile.path}`,
        title: secondaryFile.path.split('/').pop() || secondaryFile.path,
        path: secondaryFile.path,
        language: secondaryFile.language,
        dirty: false,
        pinned: false,
        preview: false,
      };
      groups.push({
        id: 'secondary',
        tabs: [secondaryTab],
        activeTabId: secondaryTab.id,
      });
    }

    return groups;
  }, [activeFile, secondaryFile, splitEditorOpen]);

  return {
    bridgeActiveFile,
    activeDiagnostics,
    outlineSymbols,
    splitEditorGroups,
    handleToggleSplitEditor,
  };
}
