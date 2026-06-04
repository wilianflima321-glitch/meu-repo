import { create } from 'zustand';

import type {
  ActiveFileState,
  EditorCursorStatus,
  EditorSelectionStatus,
} from '@/components/ide/fullscreen/types';

export type WorkbenchEditorState = {
  activeFile: ActiveFileState | null;
  openFiles: ActiveFileState[];
  dirtyPaths: string[];
  cursor: EditorCursorStatus | null;
  selection: EditorSelectionStatus | null;
  setActiveFile: (file: ActiveFileState | null) => void;
  setOpenFiles: (files: ActiveFileState[]) => void;
  markDirty: (path: string) => void;
  markClean: (path: string) => void;
  setCursor: (cursor: EditorCursorStatus | null) => void;
  setSelection: (selection: EditorSelectionStatus | null) => void;
};

export const useWorkbenchEditorStore = create<WorkbenchEditorState>()((set) => ({
  activeFile: null,
  openFiles: [],
  dirtyPaths: [],
  cursor: null,
  selection: null,
  setActiveFile: (activeFile) => set({ activeFile }),
  setOpenFiles: (openFiles) => set({ openFiles }),
  markDirty: (path) =>
    set((state) => ({
      dirtyPaths: state.dirtyPaths.includes(path)
        ? state.dirtyPaths
        : [...state.dirtyPaths, path],
    })),
  markClean: (path) =>
    set((state) => ({
      dirtyPaths: state.dirtyPaths.filter((dirtyPath) => dirtyPath !== path),
    })),
  setCursor: (cursor) => set({ cursor }),
  setSelection: (selection) => set({ selection }),
}));
