'use client';

import { useMemo } from 'react';
import type { ITerminalOptions } from 'xterm';
import { resolveCssColor } from '@/lib/design-system/resolveCssColor';
import type { TerminalTheme } from './terminalModels';

type UseTerminalOptionsParams = {
  fontFamily: string;
  fontSize: number;
  theme: TerminalTheme;
};

function paint(color: string): string {
  return resolveCssColor(color);
}

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
        background: paint(theme.colors.background),
        foreground: paint(theme.colors.foreground),
        cursor: paint(theme.colors.cursor),
        cursorAccent: paint(theme.colors.cursorAccent),
        selectionBackground: paint(theme.colors.selection),
        black: paint(theme.colors.black),
        red: paint(theme.colors.red),
        green: paint(theme.colors.green),
        yellow: paint(theme.colors.yellow),
        blue: paint(theme.colors.blue),
        magenta: paint(theme.colors.magenta),
        cyan: paint(theme.colors.cyan),
        white: paint(theme.colors.white),
        brightBlack: paint(theme.colors.brightBlack),
        brightRed: paint(theme.colors.brightRed),
        brightGreen: paint(theme.colors.brightGreen),
        brightYellow: paint(theme.colors.brightYellow),
        brightBlue: paint(theme.colors.brightBlue),
        brightMagenta: paint(theme.colors.brightMagenta),
        brightCyan: paint(theme.colors.brightCyan),
        brightWhite: paint(theme.colors.brightWhite),
      },
    }),
    [fontFamily, fontSize, theme]
  );
}

export default useTerminalOptions;
