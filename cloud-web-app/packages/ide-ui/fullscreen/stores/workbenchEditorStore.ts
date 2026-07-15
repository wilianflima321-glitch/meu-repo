import { create } from 'zustand'

import type {
  ActiveFileState,
  EditorCursorStatus,
  EditorSelectionStatus,
} from '../types'
import { saveWorkspaceSession } from '../../../web/lib/ide/workspace-session-resume'

export type WorkbenchEditorState = {
  activeFile: ActiveFileState | null
  openFiles: ActiveFileState[]
  dirtyPaths: string[]
  cursor: EditorCursorStatus | null
  selection: EditorSelectionStatus | null
  setActiveFile: (file: ActiveFileState | null) => void
  setOpenFiles: (files: ActiveFileState[]) => void
  markDirty: (path: string) => void
  markClean: (path: string) => void
  setCursor: (cursor: EditorCursorStatus | null) => void
  setSelection: (selection: EditorSelectionStatus | null) => void
}

function persistSession(
  openFiles: ActiveFileState[],
  activeFile: ActiveFileState | null,
  scrollLine = 0,
) {
  saveWorkspaceSession({
    openTabPaths: openFiles.map((file) => file.path).filter(Boolean),
    activePath: activeFile?.path ?? null,
    editorScrollLine: scrollLine,
    panelScroll: {},
  })
}

export const useWorkbenchEditorStore = create<WorkbenchEditorState>()((set, get) => ({
  activeFile: null,
  openFiles: [],
  dirtyPaths: [],
  cursor: null,
  selection: null,
  setActiveFile: (activeFile) => {
    set({ activeFile })
    persistSession(get().openFiles, activeFile, get().cursor?.line ?? 0)
  },
  setOpenFiles: (openFiles) => {
    set({ openFiles })
    persistSession(openFiles, get().activeFile, get().cursor?.line ?? 0)
  },
  markDirty: (path) =>
    set((state) => ({
      dirtyPaths: state.dirtyPaths.includes(path) ? state.dirtyPaths : [...state.dirtyPaths, path],
    })),
  markClean: (path) =>
    set((state) => ({
      dirtyPaths: state.dirtyPaths.filter((dirtyPath) => dirtyPath !== path),
    })),
  setCursor: (cursor) => {
    set({ cursor })
    const { openFiles, activeFile } = get()
    if (activeFile) {
      persistSession(openFiles, activeFile, cursor?.line ?? 0)
    }
  },
  setSelection: (selection) => set({ selection }),
}))
