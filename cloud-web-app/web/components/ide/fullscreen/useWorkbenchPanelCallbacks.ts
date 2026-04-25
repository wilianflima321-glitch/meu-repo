'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { BottomPanelMode, PanelState } from '@/components/ide/modern-shell/types';

type UseWorkbenchPanelCallbacksParams = {
  setModernPanelState: Dispatch<SetStateAction<PanelState>>;
  setActiveBottomPanel: Dispatch<SetStateAction<BottomPanelMode>>;
  setPreviewEnabled: Dispatch<SetStateAction<boolean>>;
};

export function useWorkbenchPanelCallbacks({
  setModernPanelState,
  setActiveBottomPanel,
  setPreviewEnabled,
}: UseWorkbenchPanelCallbacksParams) {
  const onResizePanel = useCallback((panel: keyof PanelState, size: number) => {
    setModernPanelState((prev) => ({
      ...prev,
      [panel]: {
        ...prev[panel],
        size,
      },
    }));
  }, [setModernPanelState]);

  const onToggleSidebar = useCallback(() => {
    setModernPanelState((prev) => ({
      ...prev,
      sidebar: {
        ...prev.sidebar,
        open: !prev.sidebar.open,
      },
    }));
  }, [setModernPanelState]);

  const onTogglePanel = useCallback((panel: keyof PanelState) => {
    if (panel === 'preview') {
      setPreviewEnabled((prev) => !prev);
      return;
    }
    if (panel === 'chat') {
      setActiveBottomPanel('chat');
    }
    setModernPanelState((prev) => ({
      ...prev,
      [panel]: {
        ...prev[panel],
        open: !prev[panel].open,
      },
    }));
  }, [setActiveBottomPanel, setModernPanelState, setPreviewEnabled]);

  return {
    onResizePanel,
    onToggleSidebar,
    onTogglePanel,
  };
}
