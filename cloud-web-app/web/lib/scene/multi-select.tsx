/**
 * Multi-Select System - Sistema de Seleção Múltipla
 * 
 * Sistema world-class para seleção múltipla de objetos em cena 3D.
 * Similar ao Unreal Engine e Blender com:
 * - Shift+Click para adicionar à seleção
 * - Ctrl+Click para toggle
 * - Box selection (arrastar para selecionar)
 * - Seleção de grupo
 * 
 * @module lib/scene/multi-select
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export interface SelectionState {
  /** Currently selected object IDs */
  selectedIds: Set<string>;
  /** Primary selected ID (for transform focus) */
  primaryId: string | null;
  /** Is box selection in progress */
  isBoxSelecting: boolean;
  /** Box selection start point */
  boxStart: { x: number; y: number } | null;
  /** Box selection end point */
  boxEnd: { x: number; y: number } | null;
}

export interface SelectionActions {
  /** Select a single object (clears others unless modifier) */
  select: (id: string, options?: SelectOptions) => void;
  /** Deselect a specific object */
  deselect: (id: string) => void;
  /** Clear all selection */
  clearSelection: () => void;
  /** Toggle selection state */
  toggleSelection: (id: string) => void;
  /** Select multiple objects */
  selectMultiple: (ids: string[]) => void;
  /** Select all objects */
  selectAll: (allIds: string[]) => void;
  /** Start box selection */
  startBoxSelect: (x: number, y: number) => void;
  /** Update box selection */
  updateBoxSelect: (x: number, y: number) => void;
  /** End box selection */
  endBoxSelect: (objectsInBox: string[]) => void;
  /** Cancel box selection */
  cancelBoxSelect: () => void;
  /** Check if object is selected */
  isSelected: (id: string) => boolean;
  /** Check if object is primary */
  isPrimary: (id: string) => boolean;
  /** Get selection count */
  getSelectionCount: () => number;
}

export interface SelectOptions {
  /** Add to existing selection (Shift) */
  additive?: boolean;
  /** Toggle this item's selection (Ctrl) */
  toggle?: boolean;
  /** Set as primary (for transform) */
  makePrimary?: boolean;
}

// ============================================================================
// HOOK
// ============================================================================

export function useMultiSelect(
  onSelectionChange?: (selectedIds: string[], primaryId: string | null) => void
): [SelectionState, SelectionActions] {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [primaryId, setPrimaryId] = useState<string | null>(null);
  const [isBoxSelecting, setIsBoxSelecting] = useState(false);
  const [boxStart, setBoxStart] = useState<{ x: number; y: number } | null>(null);
  const [boxEnd, setBoxEnd] = useState<{ x: number; y: number } | null>(null);

  // Notify on change
  useEffect(() => {
    onSelectionChange?.(Array.from(selectedIds), primaryId);
  }, [selectedIds, primaryId, onSelectionChange]);

  const select = useCallback((id: string, options: SelectOptions = {}) => {
    const { additive = false, toggle = false, makePrimary = true } = options;

    setSelectedIds(prev => {
      const next = new Set(prev);

      if (toggle) {
        if (next.has(id)) {
          next.delete(id);
          if (primaryId === id) {
            setPrimaryId(next.size > 0 ? Array.from(next)[0] : null);
          }
        } else {
          next.add(id);
          if (makePrimary) setPrimaryId(id);
        }
      } else if (additive) {
        next.add(id);
        if (makePrimary) setPrimaryId(id);
      } else {
        next.clear();
        next.add(id);
        setPrimaryId(id);
      }

      return next;
    });
  }, [primaryId]);

  const deselect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (primaryId === id) {
      setPrimaryId(null);
    }
  }, [primaryId]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setPrimaryId(null);
  }, []);

  const toggleSelection = useCallback((id: string) => {
    select(id, { toggle: true });
  }, [select]);

  const selectMultiple = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
    setPrimaryId(ids.length > 0 ? ids[0] : null);
  }, []);

  const selectAll = useCallback((allIds: string[]) => {
    setSelectedIds(new Set(allIds));
    setPrimaryId(allIds.length > 0 ? allIds[0] : null);
  }, []);

  const startBoxSelect = useCallback((x: number, y: number) => {
    setIsBoxSelecting(true);
    setBoxStart({ x, y });
    setBoxEnd({ x, y });
  }, []);

  const updateBoxSelect = useCallback((x: number, y: number) => {
    if (isBoxSelecting) {
      setBoxEnd({ x, y });
    }
  }, [isBoxSelecting]);

  const endBoxSelect = useCallback((objectsInBox: string[]) => {
    setIsBoxSelecting(false);
    setBoxStart(null);
    setBoxEnd(null);
    
    if (objectsInBox.length > 0) {
      selectMultiple(objectsInBox);
    }
  }, [selectMultiple]);

  const cancelBoxSelect = useCallback(() => {
    setIsBoxSelecting(false);
    setBoxStart(null);
    setBoxEnd(null);
  }, []);

  const isSelected = useCallback((id: string) => {
    return selectedIds.has(id);
  }, [selectedIds]);

  const isPrimary = useCallback((id: string) => {
    return primaryId === id;
  }, [primaryId]);

  const getSelectionCount = useCallback(() => {
    return selectedIds.size;
  }, [selectedIds]);

  const state: SelectionState = useMemo(() => ({
    selectedIds,
    primaryId,
    isBoxSelecting,
    boxStart,
    boxEnd,
  }), [selectedIds, primaryId, isBoxSelecting, boxStart, boxEnd]);

  const actions: SelectionActions = useMemo(() => ({
    select,
    deselect,
    clearSelection,
    toggleSelection,
    selectMultiple,
    selectAll,
    startBoxSelect,
    updateBoxSelect,
    endBoxSelect,
    cancelBoxSelect,
    isSelected,
    isPrimary,
    getSelectionCount,
  }), [
    select,
    deselect,
    clearSelection,
    toggleSelection,
    selectMultiple,
    selectAll,
    startBoxSelect,
    updateBoxSelect,
    endBoxSelect,
    cancelBoxSelect,
    isSelected,
    isPrimary,
    getSelectionCount,
  ]);

  return [state, actions];
}

// ============================================================================
// BOX SELECTION COMPONENT
// ============================================================================

interface BoxSelectionOverlayProps {
  isSelecting: boolean;
  start: { x: number; y: number } | null;
  end: { x: number; y: number } | null;
}

export function BoxSelectionOverlay({ isSelecting, start, end }: BoxSelectionOverlayProps) {
  if (!isSelecting || !start || !end) return null;

  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{
        left,
        top,
        width,
        height,
        border: '1px dashed #6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
      }}
    />
  );
}

// ============================================================================
// KEYBOARD HANDLER
// ============================================================================

export function useSelectionKeyboard(
  actions: SelectionActions,
  allIds: string[]
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+A / Cmd+A to select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        actions.selectAll(allIds);
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        actions.clearSelection();
      }

      // Delete to delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Dispatch custom event for deletion
        window.dispatchEvent(new CustomEvent('scene:delete-selected'));
      }

      // D to duplicate selected
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('scene:duplicate-selected'));
      }

      // G for move/grab (Blender-style)
      if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
        window.dispatchEvent(new CustomEvent('scene:set-transform-mode', { detail: 'translate' }));
      }

      // R for rotate
      if (e.key === 'r' && !e.ctrlKey && !e.metaKey) {
        window.dispatchEvent(new CustomEvent('scene:set-transform-mode', { detail: 'rotate' }));
      }

      // S for scale
      if (e.key === 's' && !e.ctrlKey && !e.metaKey) {
        window.dispatchEvent(new CustomEvent('scene:set-transform-mode', { detail: 'scale' }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, allIds]);
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Check if a 3D object is inside a 2D box on screen
 */
export function isObjectInBox(
  object: THREE.Object3D,
  camera: THREE.Camera,
  boxStart: { x: number; y: number },
  boxEnd: { x: number; y: number },
  containerWidth: number,
  containerHeight: number
): boolean {
  // Project object position to screen coordinates
  const position = object.position.clone();
  position.project(camera);

  // Convert from NDC (-1 to 1) to screen coordinates
  const screenX = ((position.x + 1) / 2) * containerWidth;
  const screenY = ((-position.y + 1) / 2) * containerHeight;

  // Check if inside box
  const minX = Math.min(boxStart.x, boxEnd.x);
  const maxX = Math.max(boxStart.x, boxEnd.x);
  const minY = Math.min(boxStart.y, boxEnd.y);
  const maxY = Math.max(boxStart.y, boxEnd.y);

  return (
    screenX >= minX &&
    screenX <= maxX &&
    screenY >= minY &&
    screenY <= maxY
  );
}

/**
 * Calculate bounding box center for multiple objects
 */
export function getSelectionCenter(objects: THREE.Object3D[]): THREE.Vector3 {
  if (objects.length === 0) return new THREE.Vector3();

  const box = new THREE.Box3();
  
  for (const obj of objects) {
    box.expandByObject(obj);
  }

  const center = new THREE.Vector3();
  box.getCenter(center);
  return center;
}

/**
 * Get common transform for multiple selected objects
 */
export function getCommonTransform(
  objects: Array<{
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }>
): {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
} {
  if (objects.length === 0) {
    return {
      position: [0, 0, 0],
      rotation: [0, 0, 0],
      scale: [1, 1, 1],
    };
  }

  if (objects.length === 1) {
    return {
      position: [...objects[0].position],
      rotation: [...objects[0].rotation],
      scale: [...objects[0].scale],
    };
  }

  // Calculate center position for multiple objects
  const avgPos: [number, number, number] = [0, 0, 0];
  for (const obj of objects) {
    avgPos[0] += obj.position[0];
    avgPos[1] += obj.position[1];
    avgPos[2] += obj.position[2];
  }
  avgPos[0] /= objects.length;
  avgPos[1] /= objects.length;
  avgPos[2] /= objects.length;

  return {
    position: avgPos,
    rotation: [0, 0, 0], // Rotation doesn't average well
    scale: [1, 1, 1],    // Scale doesn't average well
  };
}

/**
 * Apply delta transform to multiple objects
 */
export function applyDeltaTransform(
  objects: Array<{
    id: string;
    position: [number, number, number];
    rotation: [number, number, number];
    scale: [number, number, number];
  }>,
  delta: {
    position?: [number, number, number];
    rotation?: [number, number, number];
    scale?: [number, number, number];
  }
): Array<{
  id: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}> {
  return objects.map(obj => ({
    ...obj,
    position: delta.position
      ? [
          obj.position[0] + delta.position[0],
          obj.position[1] + delta.position[1],
          obj.position[2] + delta.position[2],
        ] as [number, number, number]
      : obj.position,
    rotation: delta.rotation
      ? [
          obj.rotation[0] + delta.rotation[0],
          obj.rotation[1] + delta.rotation[1],
          obj.rotation[2] + delta.rotation[2],
        ] as [number, number, number]
      : obj.rotation,
    scale: delta.scale
      ? [
          obj.scale[0] * delta.scale[0],
          obj.scale[1] * delta.scale[1],
          obj.scale[2] * delta.scale[2],
        ] as [number, number, number]
      : obj.scale,
  }));
}
