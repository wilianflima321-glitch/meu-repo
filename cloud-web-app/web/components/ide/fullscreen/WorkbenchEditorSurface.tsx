'use client';

import WorkbenchEditorCanvas from '@/components/ide/fullscreen/WorkbenchEditorCanvas';
import WorkbenchSplitEditorSurface from '@/components/ide/fullscreen/WorkbenchSplitEditorSurface';
import {
  WorkbenchEditorEmptyState,
  WorkbenchEditorErrorState,
  WorkbenchEditorLoadingState,
} from '@/components/ide/fullscreen/WorkbenchEditorStates';
import type { WorkbenchEditorSurfaceProps } from '@/components/ide/fullscreen/WorkbenchEditorSurface.types';

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
  projectId,
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
  onCursorStatusChange,
  onSelectionStatusChange,
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

  const canvasSharedProps = {
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
    onCursorStatusChange,
    onSelectionStatusChange,
  };

  if (!splitEditorOpen) {
    return (
      <WorkbenchEditorCanvas
        fileState={activeFile}
        pane="primary"
        {...canvasSharedProps}
      />
    );
  }

  return (
    <WorkbenchSplitEditorSurface
      activeFile={activeFile}
      secondaryFile={secondaryFile}
      splitEditorGroups={splitEditorGroups}
      splitActivePane={splitActivePane}
      splitDirection={splitDirection}
      editorRef={editorRef}
      primaryEditorRef={primaryEditorRef}
      secondaryEditorRef={secondaryEditorRef}
      setSplitActivePane={setSplitActivePane}
      setSecondaryFile={setSecondaryFile}
      setActiveFile={setActiveFile}
      setNextOpenTarget={setNextOpenTarget}
      setSplitEditorOpen={setSplitEditorOpen}
      canvasSharedProps={canvasSharedProps}
    />
  );
}
