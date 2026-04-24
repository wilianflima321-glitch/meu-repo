'use client';

import { useEffect } from 'react';

type UseTerminalShortcutsOptions = {
  copySelection: () => void;
  createSession: () => Promise<unknown>;
  pasteClipboard: () => void;
  toggleSearch: () => void;
};

export function useTerminalShortcuts({
  copySelection,
  createSession,
  pasteClipboard,
  toggleSearch,
}: UseTerminalShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey && event.shiftKey)) {
        return;
      }

      switch (event.key) {
        case 'F':
          event.preventDefault();
          toggleSearch();
          break;
        case 'C':
          event.preventDefault();
          copySelection();
          break;
        case 'V':
          event.preventDefault();
          pasteClipboard();
          break;
        case '`':
          event.preventDefault();
          void createSession();
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [copySelection, createSession, pasteClipboard, toggleSearch]);
}

export default useTerminalShortcuts;
