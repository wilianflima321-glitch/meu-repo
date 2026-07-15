'use client';

import { useEffect } from 'react';
import { useWorkspaceStore } from './WorkspaceProvider';

/**
 * Wires the F11 shortcut to Zen Mode for the nearest `WorkspaceProvider`.
 * Mount once per shell (e.g. at the top of `ModernIDEShell` / `ViewportWorkbenchShell`).
 * Consumers read `zenMode` off the store to decide whether to mount their
 * leftBar/rightBar/bottomBar `DockRegion`s at all — `centerCanvas` always stays.
 */
export function useZenMode() {
  const store = useWorkspaceStore();
  const zenMode = store((s) => s.zenMode);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F11') return;
      const target = event.target as HTMLElement | null;
      const isEditable = target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (isEditable) return;
      event.preventDefault();
      store.getState().toggleZenMode();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [store]);

  return zenMode;
}

export default useZenMode;
