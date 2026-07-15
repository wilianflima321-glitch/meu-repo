'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { WebIDEBackend } from './WebIDEBackend';
import type { IDERenderMode, IDESceneNode } from '../../../packages/ide-ui/backend/types';

/**
 * React bridge for `IIDEBackend`. Re-renders whenever the underlying scene
 * service reports a mutation (object add/remove/transform/visibility/lock or
 * selection change), so `Outliner3D`/`PropertiesPanel3D` reflect the live
 * engine scene tree instead of a static snapshot.
 */
export function useIDEBackend(renderMode: IDERenderMode = 'draft', projectId = '') {
  const backend = useMemo(() => new WebIDEBackend(renderMode, projectId), [renderMode, projectId]);

  const nodes = useSyncExternalStore(
    (onStoreChange) => backend.scene.subscribe(onStoreChange),
    () => backend.scene.getNodes(),
    () => [] as IDESceneNode[]
  );

  const selectedIds = useSyncExternalStore(
    (onStoreChange) => backend.scene.subscribe(onStoreChange),
    () => backend.scene.getSelectedIds(),
    () => [] as string[]
  );

  return { backend, nodes, selectedIds };
}
