'use client';

import { useEffect } from 'react';

import type { Dispatch, SetStateAction } from 'react';
import type { PanelState as ModernPanelState } from '@/components/ide/ModernIDEShell';
import type { PreviewMode, SidebarTab } from '@/components/ide/fullscreen/types';

type UseWorkbenchChromeParams = {
  lastProjectIdStorageKey: string;
  previewEnabledStorageKey: string;
  panelStateStorageKey: string;
  projectId: string;
  previewEnabled: boolean;
  modernPanelState: ModernPanelState;
  setModernPanelState: Dispatch<SetStateAction<ModernPanelState>>;
  setShowDiagnostics: Dispatch<SetStateAction<boolean>>;
  setHasToken: Dispatch<SetStateAction<boolean>>;
  setIsCompactViewport: Dispatch<SetStateAction<boolean>>;
  handleSelectPreviewMode: (mode: PreviewMode) => void;
  handleSelectSidebarTab: (tab: SidebarTab) => void;
  openCommandPalette: (mode?: 'commands' | 'files') => void;
  emitLayoutEvent: (eventName: string) => void;
  handleEditorUndo: () => void;
  handleEditorRedo: () => void;
  handleEditorFind: () => void;
  handleEditorReplace: () => void;
  handleAIInline: () => void;
  handleAIPanel: () => void;
};

export function useWorkbenchChrome({
  lastProjectIdStorageKey,
  previewEnabledStorageKey,
  panelStateStorageKey,
  projectId,
  previewEnabled,
  modernPanelState,
  setModernPanelState,
  setShowDiagnostics,
  setHasToken,
  setIsCompactViewport,
  handleSelectPreviewMode,
  handleSelectSidebarTab,
  openCommandPalette,
  emitLayoutEvent,
  handleEditorUndo,
  handleEditorRedo,
  handleEditorFind,
  handleEditorReplace,
  handleAIInline,
  handleAIPanel,
}: UseWorkbenchChromeParams) {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (projectId && projectId !== 'default') {
      localStorage.setItem(lastProjectIdStorageKey, projectId);
    }
  }, [lastProjectIdStorageKey, projectId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const onToggleSidebar = () => {
      setModernPanelState((prev) => ({
        ...prev,
        sidebar: {
          ...prev.sidebar,
          open: !prev.sidebar.open,
        },
      }));
    };

    const onOpenAI = () => {
      setModernPanelState((prev) => ({
        ...prev,
        chat: {
          ...prev.chat,
          open: true,
        },
      }));
    };

    const onToggleTerminal = () => {
      handleSelectPreviewMode('console');
    };

    const onOpenSidebarTab = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: SidebarTab }>).detail;
      if (detail?.tab === 'explorer' || detail?.tab === 'git') {
        handleSelectSidebarTab(detail.tab);
      }
    };

    const onOpenBottomTab = (event: Event) => {
      const detail = (event as CustomEvent<{ tab?: string }>).detail;
      if (detail?.tab === 'terminal') {
        handleSelectPreviewMode('console');
        return;
      }
      if (detail?.tab === 'debug') {
        setShowDiagnostics(true);
      }
    };

    window.addEventListener('aethel.layout.toggleSidebar', onToggleSidebar);
    window.addEventListener('aethel.layout.openAI', onOpenAI);
    window.addEventListener('aethel.layout.toggleTerminal', onToggleTerminal);
    window.addEventListener('aethel.layout.openSidebarTab', onOpenSidebarTab as EventListener);
    window.addEventListener('aethel.layout.openBottomTab', onOpenBottomTab as EventListener);

    return () => {
      window.removeEventListener('aethel.layout.toggleSidebar', onToggleSidebar);
      window.removeEventListener('aethel.layout.openAI', onOpenAI);
      window.removeEventListener('aethel.layout.toggleTerminal', onToggleTerminal);
      window.removeEventListener('aethel.layout.openSidebarTab', onOpenSidebarTab as EventListener);
      window.removeEventListener('aethel.layout.openBottomTab', onOpenBottomTab as EventListener);
    };
  }, [handleSelectPreviewMode, handleSelectSidebarTab, setModernPanelState, setShowDiagnostics]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasToken(Boolean(window.localStorage.getItem('token')));
  }, [setHasToken]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onCommand = (event: Event) => {
      const detail = (event as CustomEvent<{ command?: string }>).detail;
      const command = detail?.command;
      if (!command) return;

      switch (command) {
        case 'workbench.action.quickOpen':
          openCommandPalette('files');
          return;
        case 'workbench.action.showCommands':
          openCommandPalette('commands');
          return;
        case 'workbench.action.toggleSidebarVisibility':
          emitLayoutEvent('aethel.layout.toggleSidebar');
          return;
        case 'workbench.action.terminal.toggleTerminal':
          emitLayoutEvent('aethel.layout.toggleTerminal');
          return;
        case 'undo':
          handleEditorUndo();
          return;
        case 'redo':
          handleEditorRedo();
          return;
        case 'actions.find':
          handleEditorFind();
          return;
        case 'editor.action.startFindReplaceAction':
          handleEditorReplace();
          return;
        case 'aethel.ai.inlineChat':
          handleAIInline();
          return;
        case 'aethel.ai.openChat':
          handleAIPanel();
          return;
        default:
          return;
      }
    };

    window.addEventListener('aethel:command', onCommand as EventListener);
    return () => window.removeEventListener('aethel:command', onCommand as EventListener);
  }, [
    emitLayoutEvent,
    handleAIInline,
    handleAIPanel,
    handleEditorFind,
    handleEditorRedo,
    handleEditorReplace,
    handleEditorUndo,
    openCommandPalette,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(previewEnabledStorageKey, previewEnabled ? '1' : '0');
  }, [previewEnabled, previewEnabledStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(panelStateStorageKey, JSON.stringify(modernPanelState));
  }, [modernPanelState, panelStateStorageKey]);

  useEffect(() => {
    setModernPanelState((prev) => ({
      ...prev,
      preview: {
        ...prev.preview,
        open: previewEnabled,
      },
    }));
  }, [previewEnabled, setModernPanelState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const update = () => {
      setIsCompactViewport(window.innerWidth < 1024);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [setIsCompactViewport]);
}

export default useWorkbenchChrome;
