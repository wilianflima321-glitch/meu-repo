"use client";

import type { Dispatch, SetStateAction } from 'react';

import type { Diagnostic as MonacoDiagnostic } from '@/components/editor/MonacoEditorPro';
import { useWorkbenchEditorModel } from '@/components/ide/fullscreen/useWorkbenchEditorModel';
import { useWorkbenchFiles } from '@/components/ide/fullscreen/useWorkbenchFiles';
import type { EditorDocumentSymbolState, EditorPane } from '@/components/ide/fullscreen/types';

type UseFullscreenIDEFileModelOptions = {
  projectId: string;
  fileParam: string | null;
  previewEnabled: boolean;
  previewSandboxId: string | null;
  scheduleRuntimeSync: () => void;
  syncRuntimeFile: (path: string) => Promise<boolean>;
  editorDocumentSymbols: EditorDocumentSymbolState | null;
  secondaryEditorDocumentSymbols: EditorDocumentSymbolState | null;
  splitEditorOpen: boolean;
  splitActivePane: EditorPane;
  editorDiagnostics: MonacoDiagnostic[];
  secondaryEditorDiagnostics: MonacoDiagnostic[];
  setSplitEditorOpen: Dispatch<SetStateAction<boolean>>;
  setSplitActivePane: Dispatch<SetStateAction<EditorPane>>;
  setNextOpenTarget: Dispatch<SetStateAction<EditorPane>>;
  setEditorDiagnostics: Dispatch<SetStateAction<MonacoDiagnostic[]>>;
};

export function useFullscreenIDEFileModel({
  projectId,
  fileParam,
  previewEnabled,
  previewSandboxId,
  scheduleRuntimeSync,
  syncRuntimeFile,
  editorDocumentSymbols,
  secondaryEditorDocumentSymbols,
  splitEditorOpen,
  splitActivePane,
  editorDiagnostics,
  secondaryEditorDiagnostics,
  setSplitEditorOpen,
  setSplitActivePane,
  setNextOpenTarget,
  setEditorDiagnostics,
}: UseFullscreenIDEFileModelOptions) {
  const fileState = useWorkbenchFiles({
    projectId,
    fileParam,
    previewEnabled,
    previewSandboxId,
    scheduleRuntimeSync,
    syncRuntimeFile,
  });

  const editorModel = useWorkbenchEditorModel({
    activeFile: fileState.activeFile,
    secondaryFile: fileState.secondaryFile,
    editorDocumentSymbols,
    secondaryEditorDocumentSymbols,
    splitEditorOpen,
    splitActivePane,
    editorDiagnostics,
    secondaryEditorDiagnostics,
    setSplitEditorOpen,
    setSplitActivePane,
    setSecondaryFile: fileState.setSecondaryFile,
    setNextOpenTarget,
    setEditorDiagnostics,
  });

  return {
    ...fileState,
    ...editorModel,
  };
}
