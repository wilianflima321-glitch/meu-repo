'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';

import type { PanelState } from '@/components/ide/modern-shell/types';

type UseWorkbenchPanelCallbacksParams = {
  setModernPanelState: Dispatch<SetStateAction<PanelState>>;
  setPreviewEnabled: Dispatch<SetStateAction<boolean>>;
  handleAIPanel: () => void;
};

export function useWorkbenchPanelCallbacks({
  setModernPanelState,
  setPreviewEnabled,
  handleAIPanel,
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
      handleAIPanel();
    }
    setModernPanelState((prev) => ({
      ...prev,
      [panel]: {
        ...prev[panel],
        open: !prev[panel].open,
      },
    }));
  }, [handleAIPanel, setModernPanelState, setPreviewEnabled]);

  return {
    onResizePanel,
    onToggleSidebar,
    onTogglePanel,
  };
}
