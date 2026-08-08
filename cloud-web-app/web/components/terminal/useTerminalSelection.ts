'use client';

import { useCallback, useRef, useState, type MutableRefObject } from 'react';
import type { Terminal as XTermType } from 'xterm';
import type { SearchAddon } from 'xterm-addon-search';
import type { TerminalSocketHandle } from './terminalModels';

import { resolveCssColor } from '@/lib/design-system/resolveCssColor';

const SEARCH_DECORATIONS = {
  decorations: { matchOverviewRuler: resolveCssColor('var(--aethel-editor-search-match)') },
};

type UseTerminalSelectionOptions = {
  terminalRef: MutableRefObject<XTermType | null>;
  websocketRef: MutableRefObject<TerminalSocketHandle | null>;
};

export function useTerminalSelection({
  terminalRef,
  websocketRef,
}: UseTerminalSelectionOptions) {
  const searchAddonRef = useRef<SearchAddon | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  const search = useCallback(
    (term: string) => searchAddonRef.current?.findNext(term, SEARCH_DECORATIONS) || false,
    []
  );
  const searchNext = useCallback(() => searchAddonRef.current?.findNext('') || false, []);
  const searchPrevious = useCallback(
    () => searchAddonRef.current?.findPrevious('') || false,
    []
  );
  const closeSearch = useCallback(() => {
    setShowSearch(false);
  }, []);
  const toggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev);
  }, []);
  const copySelection = useCallback(() => {
    const selection = terminalRef.current?.getSelection();
    if (selection) {
      void navigator.clipboard.writeText(selection);
    }
  }, [terminalRef]);
  const pasteClipboard = useCallback(() => {
    void navigator.clipboard.readText().then((text) => {
      websocketRef.current?.send(text);
    });
  }, [websocketRef]);

  return {
    closeSearch,
    copySelection,
    pasteClipboard,
    search,
    searchAddonRef,
    searchNext,
    searchPrevious,
    showSearch,
    toggleSearch,
  };
}

export default useTerminalSelection;
