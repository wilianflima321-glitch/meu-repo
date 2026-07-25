'use client'

import { create } from 'zustand'
import { defaultObjects, type LevelObject } from '@/components/engine/level-editor-core'
import type { SceneNode } from '@/components/studio/WorldSceneOutliner'

/**
 * Canonical `LevelObject[]` scene state for the World Studio `level` tool.
 * Previously this lived only as local `useState` inside `LevelEditor.tsx`,
 * so the `CreativeWorkbenchShell` outliner/inspector slots (rendered as
 * siblings, not children, of the embedded `LevelEditor`) had no way to read
 * or mutate it — the shell outliner always showed the honest-but-misleading
 * "No scene loaded" empty state while the viewport rendered real objects.
 * Lifting this into a shared store gives both surfaces one source of truth
 * without inventing a second, disconnected scene graph.
 */
export interface LevelEditorStoreState {
  objects: LevelObject[]
  selectedId: string | null
  setObjects: (updater: LevelObject[] | ((prev: LevelObject[]) => LevelObject[])) => void
  setSelectedId: (id: string | null) => void
  duplicateObject: (id: string) => void
  deleteObject: (id: string) => void
  toggleVisibility: (id: string) => void
  toggleLocked: (id: string) => void
}

export const useLevelEditorStore = create<LevelEditorStoreState>((set, get) => ({
  objects: defaultObjects,
  selectedId: null,

  setObjects: (updater) =>
    set((state) => ({
      objects: typeof updater === 'function'
        ? (updater as (prev: LevelObject[]) => LevelObject[])(state.objects)
        : updater,
    })),

  setSelectedId: (id) => set({ selectedId: id }),

  duplicateObject: (id) => {
    const source = get().objects.find((object) => object.id === id)
    if (!source) return
    const nextId = `${source.id}_copy_${Date.now()}`
    const clone: LevelObject = {
      ...source,
      id: nextId,
      name: `${source.name}_Copy`,
      position: [source.position[0] + 1, source.position[1], source.position[2] + 1],
    }
    set((state) => ({ objects: [...state.objects, clone], selectedId: nextId }))
  },

  deleteObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((object) => object.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  toggleVisibility: (id) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? { ...object, visible: !object.visible } : object
      ),
    })),

  toggleLocked: (id) =>
    set((state) => ({
      objects: state.objects.map((object) =>
        object.id === id ? { ...object, locked: !object.locked } : object
      ),
    })),
}))

/**
 * Projects the flat `LevelObject[]` into the `SceneNode` tree shape expected
 * by `WorldSceneOutliner` — one synthetic "world" root plus a flat layer of
 * real objects (matches `LevelObject.parentId` being effectively unused by
 * `OutlinerMini` today; no fictional intermediate groups are invented).
 */
export function buildLevelSceneTree(objects: LevelObject[], levelName: string): SceneNode {
  return {
    id: 'world-root',
    name: levelName,
    type: 'world',
    children: objects.map((object): SceneNode => ({
      id: object.id,
      name: object.name,
      type: object.type === 'light' || object.type === 'camera' ? object.type : 'mesh',
      visible: object.visible,
      locked: object.locked,
    })),
  }
}
