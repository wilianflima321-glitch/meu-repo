import { cssVarRef } from '@/lib/design-system/resolveCssColor';

export interface XtermPalette {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

const PALETTE_SLOTS = [
  'background',
  'foreground',
  'cursor',
  'cursor-accent',
  'selection',
  'black',
  'red',
  'green',
  'yellow',
  'blue',
  'magenta',
  'cyan',
  'white',
  'bright-black',
  'bright-red',
  'bright-green',
  'bright-yellow',
  'bright-blue',
  'bright-magenta',
  'bright-cyan',
  'bright-white',
] as const;

type PaletteSlot = (typeof PALETTE_SLOTS)[number];

const SLOT_TO_KEY: Record<PaletteSlot, keyof XtermPalette> = {
  background: 'background',
  foreground: 'foreground',
  cursor: 'cursor',
  'cursor-accent': 'cursorAccent',
  selection: 'selection',
  black: 'black',
  red: 'red',
  green: 'green',
  yellow: 'yellow',
  blue: 'blue',
  magenta: 'magenta',
  cyan: 'cyan',
  white: 'white',
  'bright-black': 'brightBlack',
  'bright-red': 'brightRed',
  'bright-green': 'brightGreen',
  'bright-yellow': 'brightYellow',
  'bright-blue': 'brightBlue',
  'bright-magenta': 'brightMagenta',
  'bright-cyan': 'brightCyan',
  'bright-white': 'brightWhite',
};

function buildPalette(themeId: string, selectionSlot: PaletteSlot = 'selection'): XtermPalette {
  const palette = {} as XtermPalette;
  for (const slot of PALETTE_SLOTS) {
    const cssSlot = slot === 'selection' ? selectionSlot : slot;
    palette[SLOT_TO_KEY[slot]] = cssVarRef(`--aethel-terminal-${themeId}-${cssSlot}`);
  }
  return palette;
}

// Terminal emulator palettes — CSS vars in globals.css are the source of truth.
export const TERMINAL_THEMES: Record<string, XtermPalette> = {
  catppuccinMocha: buildPalette('catppuccin-mocha'),
  dracula: buildPalette('dracula', 'selection-soft'),
  tokyoNight: buildPalette('tokyo-night'),
  vscodeDark: buildPalette('vscode-dark'),
};

const catppuccinMocha = TERMINAL_THEMES.catppuccinMocha;

export const XTERM_CATPPUCCIN_THEME = {
  ...catppuccinMocha,
  selectionBackground: catppuccinMocha.selection,
  selectionForeground: catppuccinMocha.foreground,
};
