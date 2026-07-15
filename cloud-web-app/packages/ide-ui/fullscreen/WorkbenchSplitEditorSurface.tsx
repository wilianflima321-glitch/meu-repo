'use client';

import type { Dispatch, SetStateAction } from 'react';

import SplitEditor, {
  type EditorGroup,
  type SplitDirection,
} from '../../../web/components/editor/SplitEditor';

import type {
  ActiveFileState,
  EditorPane,
} from './types';
import WorkbenchEditorCanvas from './WorkbenchEditorCanvas';
import { WorkbenchEmptyEditorGroupState } from './WorkbenchEditorStates';
import type {
  EditorInstanceRef,
  WorkbenchEditorCanvasSharedProps,
} from './WorkbenchEditorSurface.types';

type WorkbenchSplitEditorSurfaceProps = {
  activeFile: ActiveFileState;
  secondaryFile: ActiveFileState | null;
  splitEditorGroups: EditorGroup[];
  splitActivePane: EditorPane;
  splitDirection: SplitDirection;
  editorRef: EditorInstanceRef;
  primaryEditorRef: EditorInstanceRef;
  secondaryEditorRef: EditorInstanceRef;
  setSplitActivePane: Dispatch<SetStateAction<EditorPane>>;
  setSecondaryFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setActiveFile: Dispatch<SetStateAction<ActiveFileState | null>>;
  setNextOpenTarget: Dispatch<SetStateAction<EditorPane>>;
  setSplitEditorOpen: Dispatch<SetStateAction<boolean>>;
  canvasSharedProps: WorkbenchEditorCanvasSharedProps;
};

function resolvePane(groupId: string): EditorPane {
  return groupId === 'secondary' ? 'secondary' : 'primary';
}

export default function WorkbenchSplitEditorSurface({
  activeFile,
  secondaryFile,
  splitEditorGroups,
  splitActivePane,
  splitDirection,
  editorRef,
  primaryEditorRef,
  secondaryEditorRef,
  setSplitActivePane,
  setSecondaryFile,
  setActiveFile,
  setNextOpenTarget,
  setSplitEditorOpen,
  canvasSharedProps,
}: WorkbenchSplitEditorSurfaceProps) {
  const syncActivePane = (pane: EditorPane) => {
    setSplitActivePane(pane);
    editorRef.current = pane === 'secondary' ? secondaryEditorRef.current : primaryEditorRef.current;
  };

  const closeSecondaryPane = () => {
    setSplitEditorOpen(false);
    setSecondaryFile(null);
    setNextOpenTarget('primary');
    syncActivePane('primary');
  };

  return (
    <SplitEditor
      groups={splitEditorGroups}
      activeGroupId={splitActivePane}
      splitDirection={splitDirection}
      onGroupFocus={(groupId) => {
        syncActivePane(resolvePane(groupId));
      }}
      onSplit={() => {}}
      onTabClick={(_, groupId) => {
        const pane = resolvePane(groupId);
        syncActivePane(pane);
        if (pane === 'secondary') {
          secondaryEditorRef.current?.focus();
          return;
        }
        primaryEditorRef.current?.focus();
      }}
      onTabClose={(_, groupId) => {
        if (groupId === 'secondary') {
          closeSecondaryPane();
          return;
        }
        setActiveFile(null);
      }}
      onTabPin={() => {}}
      onTabMove={() => {}}
      onGroupClose={(groupId) => {
        if (groupId === 'secondary') {
          closeSecondaryPane();
        }
      }}
      renderEditor={(groupId, tab) => {
        if (!tab) {
          return <WorkbenchEmptyEditorGroupState />;
        }

        const pane = resolvePane(groupId);
        const fileState = pane === 'secondary' ? secondaryFile : activeFile;
        if (!fileState) return null;

        return (
          <WorkbenchEditorCanvas
            fileState={fileState}
            pane={pane}
            {...canvasSharedProps}
          />
        );
      }}
    />
  );
}
