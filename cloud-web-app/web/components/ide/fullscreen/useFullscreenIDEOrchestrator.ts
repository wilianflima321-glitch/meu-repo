"use client";

import { useRef } from "react";
import type * as monacoEditor from 'monaco-editor';

import type { FullscreenIDEWorkspaceBridgeProps } from '@/components/ide/fullscreen/FullscreenIDEWorkspaceBridge.types';
import { useFullscreenIDEBridgeProps } from '@/components/ide/fullscreen/useFullscreenIDEBridgeProps';
import { useFullscreenIDECollaboration } from '@/components/ide/fullscreen/useFullscreenIDECollaboration';
import { useFullscreenIDEFileModel } from '@/components/ide/fullscreen/useFullscreenIDEFileModel';
import { useFullscreenIDERuntime } from '@/components/ide/fullscreen/useFullscreenIDERuntime';
import { useWorkbenchChrome } from '@/components/ide/fullscreen/useWorkbenchChrome';
import { useWorkbenchEntryConvergence } from '@/components/ide/fullscreen/useWorkbenchEntryConvergence';
import { useWorkbenchIDEEffects } from '@/components/ide/fullscreen/useWorkbenchIDEEffects';
import { useWorkbenchPanelCallbacks } from '@/components/ide/fullscreen/useWorkbenchPanelCallbacks';
import { useWorkbenchRouteParams } from '@/components/ide/fullscreen/useWorkbenchRouteParams';
import {
  BOTTOM_PANEL_MODE_STORAGE_KEY,
  LAST_PROJECT_ID_STORAGE_KEY,
  PANEL_STATE_STORAGE_KEY,
  PREVIEW_ENABLED_STORAGE_KEY,
  useWorkbenchShellState,
} from '@/components/ide/fullscreen/useWorkbenchShellState';

// Keep the IDE route shell tiny while this hook wires the market-grade workbench subsystems.
export function useFullscreenIDEOrchestrator(): FullscreenIDEWorkspaceBridgeProps {
  const routeParams = useWorkbenchRouteParams();
  const editorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const primaryEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);
  const secondaryEditorRef = useRef<monacoEditor.editor.IStandaloneCodeEditor | null>(null);

  const shell = useWorkbenchShellState({
    projectIdParam: routeParams.projectIdParam,
    entryParam: routeParams.entryParam,
    sourceParam: routeParams.sourceParam,
    missionParam: routeParams.missionParam,
    editorRef,
    primaryEditorRef,
    secondaryEditorRef,
  });

  const runtime = useFullscreenIDERuntime({
    projectId: shell.projectId,
    previewEnabled: shell.previewEnabled,
    hasToken: shell.hasToken,
    previewUrlParam: routeParams.previewUrlParam,
  });

  const fileModel = useFullscreenIDEFileModel({
    projectId: shell.projectId,
    fileParam: routeParams.fileParam,
    previewEnabled: shell.previewEnabled,
    previewSandboxId: runtime.previewSandboxId,
    scheduleRuntimeSync: runtime.scheduleRuntimeSync,
    syncRuntimeFile: runtime.syncRuntimeFile,
    editorDocumentSymbols: shell.editorDocumentSymbols,
    secondaryEditorDocumentSymbols: shell.secondaryEditorDocumentSymbols,
    splitEditorOpen: shell.splitEditorOpen,
    splitActivePane: shell.splitActivePane,
    editorDiagnostics: shell.editorDiagnostics,
    secondaryEditorDiagnostics: shell.secondaryEditorDiagnostics,
    setSplitEditorOpen: shell.setSplitEditorOpen,
    setSplitActivePane: shell.setSplitActivePane,
    setNextOpenTarget: shell.setNextOpenTarget,
    setEditorDiagnostics: shell.setEditorDiagnostics,
  });

  const collaboration = useFullscreenIDECollaboration({
    hasToken: shell.hasToken,
    projectId: shell.projectId,
  });

  const panelCallbacks = useWorkbenchPanelCallbacks({
    setModernPanelState: shell.setModernPanelState,
    setActiveBottomPanel: shell.setActiveBottomPanel,
    setPreviewEnabled: shell.setPreviewEnabled,
  });

  useWorkbenchChrome({
    lastProjectIdStorageKey: LAST_PROJECT_ID_STORAGE_KEY,
    previewEnabledStorageKey: PREVIEW_ENABLED_STORAGE_KEY,
    panelStateStorageKey: PANEL_STATE_STORAGE_KEY,
    bottomPanelModeStorageKey: BOTTOM_PANEL_MODE_STORAGE_KEY,
    projectId: shell.projectId,
    previewEnabled: shell.previewEnabled,
    modernPanelState: shell.modernPanelState,
    setModernPanelState: shell.setModernPanelState,
    activeBottomPanel: shell.activeBottomPanel,
    setActiveBottomPanel: shell.setActiveBottomPanel,
    setShowDiagnostics: shell.setShowDiagnostics,
    setHasToken: shell.setHasToken,
    setIsCompactViewport: shell.setIsCompactViewport,
    handleSelectSidebarTab: shell.handleSelectSidebarTab,
    openCommandPalette: shell.openCommandPalette,
    emitLayoutEvent: shell.emitLayoutEvent,
    handleEditorUndo: shell.handleEditorUndo,
    handleEditorRedo: shell.handleEditorRedo,
    handleEditorFind: shell.handleEditorFind,
    handleEditorReplace: shell.handleEditorReplace,
    handleAIPanel: shell.handleAIPanel,
  });

  useWorkbenchEntryConvergence({
    entryParam: routeParams.entryParam,
    sourceParam: routeParams.sourceParam,
    missionParam: routeParams.missionParam,
    entryProfile: shell.entryProfile,
    clearEntryNotice: shell.clearEntryNotice,
    openCommandPalette: shell.openCommandPalette,
    showEntryNotice: shell.showEntryNotice,
    setPreviewEnabled: shell.setPreviewEnabled,
    handleSelectPreviewMode: shell.handleSelectPreviewMode,
  });

  useWorkbenchIDEEffects({
    editorRef,
    entryParam: routeParams.entryParam,
    fileParam: routeParams.fileParam,
    previewRuntimeUrl: runtime.previewRuntimeUrl,
    projectId: shell.projectId,
    readFile: fileModel.readFile,
  });

  return useFullscreenIDEBridgeProps({
    ...shell,
    ...fileModel,
    ...collaboration,
    ...runtime,
    ...panelCallbacks,
    editorRef,
    primaryEditorRef,
    secondaryEditorRef,
    onRunPrimaryAction: runtime.handleRunRecommendedPreviewAction,
  });
}
