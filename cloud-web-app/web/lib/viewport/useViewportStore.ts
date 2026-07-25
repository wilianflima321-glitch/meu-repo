import { create } from 'zustand';
import { viewportSeedObjects, type ViewportPBRTextureMaps, type ViewportSceneObject, type ViewportTransformMode, type ViewportTransformSpace } from '@/components/viewport/AethelViewport3D';
import type { GizmoAxisPlaneConstraint, GizmoPivotMode } from '@/lib/viewport/gizmo-elite-controls';

export interface ViewportState {
  objects: ViewportSceneObject[];
  selectedIds: string[];
  transformMode: ViewportTransformMode;
  transformSpace: ViewportTransformSpace;
  gizmoConstraint: GizmoAxisPlaneConstraint;
  gizmoPivotMode: GizmoPivotMode;
  snapEnabled: boolean;
  
  // Actions
  setObjects: (updater: ViewportSceneObject[] | ((prev: ViewportSceneObject[]) => ViewportSceneObject[])) => void;
  setSelectedIds: (ids: string[]) => void;
  setTransformMode: (mode: ViewportTransformMode) => void;
  setTransformSpace: (space: ViewportTransformSpace) => void;
  setGizmoConstraint: (constraint: GizmoAxisPlaneConstraint) => void;
  setGizmoPivotMode: (mode: GizmoPivotMode) => void;
  setSnapEnabled: (enabled: boolean) => void;
  handleObjectTransformChange: (objectId: string, patch: Partial<Pick<ViewportSceneObject, 'position' | 'rotation' | 'scale'>>) => void;
  /** Phase 4 (AAA Studio Deepening Sweep) — PBR texture slots in the object inspector. */
  handleObjectTextureMapsChange: (objectId: string, textureMaps: ViewportPBRTextureMaps | undefined) => void;
}

export const useViewportStore = create<ViewportState>((set) => ({
  objects: viewportSeedObjects,
  selectedIds: [viewportSeedObjects[0]?.id].filter(Boolean) as string[],
  transformMode: 'translate',
  transformSpace: 'world',
  gizmoConstraint: 'free',
  gizmoPivotMode: 'median',
  snapEnabled: true,

  setObjects: (updater) => set((state) => ({
    objects: typeof updater === 'function' ? updater(state.objects) : updater
  })),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setTransformSpace: (space) => set({ transformSpace: space }),
  setGizmoConstraint: (constraint) => set({ gizmoConstraint: constraint }),
  setGizmoPivotMode: (mode) => set({ gizmoPivotMode: mode }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  
  handleObjectTransformChange: (objectId, patch) => set((state) => ({
    objects: state.objects.map((obj) => 
      obj.id === objectId && !obj.locked ? { ...obj, ...patch } : obj
    )
  })),

  handleObjectTextureMapsChange: (objectId, textureMaps) => set((state) => ({
    objects: state.objects.map((obj) =>
      obj.id === objectId && !obj.locked ? { ...obj, textureMaps } : obj
    )
  })),
}));
