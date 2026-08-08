'use client';

import { useImperativeHandle, type ForwardedRef, type MutableRefObject } from 'react';
import type { Terminal as XTermType } from 'xterm';
import type { FitAddon } from 'xterm-addon-fit';
import type { TerminalSocketHandle, XTerminalRef } from './terminalModels';

type UseTerminalImperativeHandleOptions = {
  fitAddonRef: MutableRefObject<FitAddon | null>;
  focusTerminal: () => void;
  ref: ForwardedRef<XTerminalRef>;
  search: (term: string) => boolean;
  searchNext: () => boolean;
  searchPrevious: () => boolean;
  terminalRef: MutableRefObject<XTermType | null>;
  websocketRef: MutableRefObject<TerminalSocketHandle | null>;
};

export function useTerminalImperativeHandle({
  fitAddonRef,
  focusTerminal,
  ref,
  search,
  searchNext,
  searchPrevious,
  terminalRef,
  websocketRef,
}: UseTerminalImperativeHandleOptions) {
  useImperativeHandle(
    ref,
    () => ({
      write: (data: string) => terminalRef.current?.write(data),
      writeln: (data: string) => terminalRef.current?.writeln(data),
      clear: () => terminalRef.current?.clear(),
      focus: focusTerminal,
      fit: () => fitAddonRef.current?.fit(),
      search,
      searchNext,
      searchPrevious,
      getSelection: () => terminalRef.current?.getSelection() || '',
      dispose: () => {
        websocketRef.current?.disconnect();
        terminalRef.current?.dispose();
      },
    }),
    [fitAddonRef, focusTerminal, search, searchNext, searchPrevious, terminalRef, websocketRef]
  );
}

export default useTerminalImperativeHandle;
