'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PanelState } from './types';

interface UseModernIDEPanelsArgs {
  sidebarOpen: boolean;
  controlledPanelState?: PanelState;
  controlledTogglePanel?: (panel: keyof PanelState) => void;
  controlledResizePanel?: (panel: keyof PanelState, size: number) => void;
}

export function useModernIDEPanels({
  sidebarOpen,
  controlledPanelState,
  controlledTogglePanel,
  controlledResizePanel,
}: UseModernIDEPanelsArgs) {
  const [internalPanelState, setInternalPanelState] = useState<PanelState>({
    sidebar: { open: sidebarOpen, size: 18 },
    editor: { open: true, size: 46 },
    preview: { open: true, size: 36 },
    chat: { open: false, size: 22 },
  });
  const [isCompact, setIsCompact] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const mainAreaRef = useRef<HTMLDivElement>(null);
  const contentRowRef = useRef<HTMLDivElement>(null);
  const editorColumnRef = useRef<HTMLDivElement>(null);

  const panelState = controlledPanelState ?? internalPanelState;

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsCompact(entry.contentRect.width < 960);
      }
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const clampPanelSize = useCallback((panel: keyof PanelState, size: number) => {
    if (panel === 'sidebar') return Math.min(30, Math.max(16, size));
    if (panel === 'preview') return Math.min(55, Math.max(25, size));
    if (panel === 'chat') return Math.min(40, Math.max(18, size));
    return Math.min(60, Math.max(25, size));
  }, []);

  const setPanelSize = useCallback((panel: keyof PanelState, size: number) => {
    const nextSize = clampPanelSize(panel, size);

    if (controlledResizePanel) {
      controlledResizePanel(panel, nextSize);
      return;
    }

    setInternalPanelState((prev) => ({
      ...prev,
      [panel]: {
        ...prev[panel],
        size: nextSize,
      },
    }));
  }, [clampPanelSize, controlledResizePanel]);

  const togglePanel = useCallback((panel: keyof PanelState) => {
    if (controlledTogglePanel) {
      controlledTogglePanel(panel);
      return;
    }

    setInternalPanelState((prev) => ({
      ...prev,
      [panel]: {
        ...prev[panel],
        open: !prev[panel].open,
      },
    }));
  }, [controlledTogglePanel]);

  const startHorizontalResize = useCallback((panel: 'sidebar' | 'preview', event: React.MouseEvent<HTMLDivElement>) => {
    if (isCompact) return;
    event.preventDefault();

    const targetRef = panel === 'sidebar' ? mainAreaRef : contentRowRef;
    const element = targetRef.current;
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    if (bounds.width <= 0) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const relativeX = moveEvent.clientX - bounds.left;
      const widthPercent = (relativeX / bounds.width) * 100;
      const nextSize = panel === 'sidebar' ? widthPercent : 100 - widthPercent;
      setPanelSize(panel, nextSize);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isCompact, setPanelSize]);

  const startVerticalResize = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (isCompact) return;
    event.preventDefault();

    const element = editorColumnRef.current;
    if (!element) return;

    const bounds = element.getBoundingClientRect();
    if (bounds.height <= 0) return;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const relativeY = moveEvent.clientY - bounds.top;
      const heightPercent = ((bounds.height - relativeY) / bounds.height) * 100;
      setPanelSize('chat', heightPercent);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, [isCompact, setPanelSize]);

  return {
    panelState,
    isCompact,
    containerRef,
    mainAreaRef,
    contentRowRef,
    editorColumnRef,
    setPanelSize,
    togglePanel,
    startHorizontalResize,
    startVerticalResize,
  };
}
