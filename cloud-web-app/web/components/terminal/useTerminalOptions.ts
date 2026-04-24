'use client';

import { useMemo } from 'react';
import type { ITerminalOptions } from 'xterm';
import type { TerminalTheme } from './terminalModels';

type UseTerminalOptionsParams = {
  fontFamily: string;
  fontSize: number;
  theme: TerminalTheme;
};

export function useTerminalOptions({
  fontFamily,
  fontSize,
  theme,
}: UseTerminalOptionsParams): ITerminalOptions {
  return useMemo(
    () => ({
      fontSize,
      fontFamily,
      cursorBlink: true,
      cursorStyle: 'block',
      cursorWidth: 2,
      scrollback: 10000,
      tabStopWidth: 4,
      allowProposedApi: true,
      allowTransparency: true,
      convertEol: true,
      theme: {
        background: theme.colors.background,
        foreground: theme.colors.foreground,
        cursor: theme.colors.cursor,
        cursorAccent: theme.colors.cursorAccent,
        selectionBackground: theme.colors.selection,
        black: theme.colors.black,
        red: theme.colors.red,
        green: theme.colors.green,
        yellow: theme.colors.yellow,
        blue: theme.colors.blue,
        magenta: theme.colors.magenta,
        cyan: theme.colors.cyan,
        white: theme.colors.white,
        brightBlack: theme.colors.brightBlack,
        brightRed: theme.colors.brightRed,
        brightGreen: theme.colors.brightGreen,
        brightYellow: theme.colors.brightYellow,
        brightBlue: theme.colors.brightBlue,
        brightMagenta: theme.colors.brightMagenta,
        brightCyan: theme.colors.brightCyan,
        brightWhite: theme.colors.brightWhite,
      },
    }),
    [fontFamily, fontSize, theme]
  );
}

export default useTerminalOptions;
