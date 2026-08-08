import type { ReactNode } from 'react';
import { cssVarRef } from '@/lib/design-system/resolveCssColor';

/** L.4 lane split — human host PTY vs Forge sandbox (agents never host PTY). */
export type TerminalExecutionLane = 'human-host-pty' | 'forge-sandbox';

/**
 * Shared xterm transport surface — host/Tauri WebSocket or Forge sandbox duplex.
 * Implementations must not claim connected until a live stream is ready.
 */
export interface TerminalSocketHandle {
  send(data: string): void
  resize(cols: number, rows: number): void
  disconnect(): void
  connect(sessionId: string): void
  onData: ((data: string) => void) | null
  onConnect: (() => void) | null
  onDisconnect: (() => void) | null
  onError: ((error: Event | string) => void) | null
  readonly connected: boolean
}

export interface TerminalSession {
  id: string;
  name: string;
  shell: string;
  cwd: string;
  createdAt: Date;
  isActive: boolean;
  /** Default human-host-pty; forge-sandbox sessions stream via /api/terminal/forge. */
  executionLane?: TerminalExecutionLane;
  /** L.1 sandbox session id when executionLane === forge-sandbox. */
  forgeSessionId?: string;
  provider?: string;
}

export interface TerminalTheme {
  name: string;
  colors: {
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
  };
}

export interface XTerminalProps {
  sessionId?: string;
  initialCwd?: string;
  initialShell?: string;
  /** L.4 — enables Forge sandbox terminal button when project is bound. */
  forgeProjectId?: string;
  existingSandboxSessionId?: string;
  theme?: TerminalTheme;
  fontSize?: number;
  fontFamily?: string;
  onClose?: () => void;
  onData?: (data: string) => void;
  onTitleChange?: (title: string) => void;
  className?: string;
}

export interface XTerminalRef {
  write: (data: string) => void;
  writeln: (data: string) => void;
  clear: () => void;
  focus: () => void;
  fit: () => void;
  search: (term: string) => boolean;
  searchNext: () => boolean;
  searchPrevious: () => boolean;
  getSelection: () => string;
  dispose: () => void;
}

export interface ShellOption {
  id: string;
  name: string;
  path: string;
  icon?: ReactNode;
}

const TERMINAL_COLOR_SLOTS = [
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

type TerminalColorSlot = (typeof TERMINAL_COLOR_SLOTS)[number];

const TERMINAL_SLOT_TO_KEY: Record<TerminalColorSlot, keyof TerminalTheme['colors']> = {
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

function buildTerminalTheme(id: string, name: string): TerminalTheme {
  const colors = {} as TerminalTheme['colors'];
  for (const slot of TERMINAL_COLOR_SLOTS) {
    colors[TERMINAL_SLOT_TO_KEY[slot]] = cssVarRef(`--aethel-terminal-${id}-${slot}`);
  }
  return { name, colors };
}

/** ANSI palettes — concrete hex lives in globals.css `--aethel-terminal-*`. */
export const TERMINAL_THEMES: Record<string, TerminalTheme> = {
  'dark-plus': buildTerminalTheme('dark-plus', 'Dark+'),
  monokai: buildTerminalTheme('monokai', 'Monokai'),
  dracula: buildTerminalTheme('dracula', 'Dracula'),
  nord: buildTerminalTheme('nord', 'Nord'),
};

export const SHELL_OPTIONS: ShellOption[] = [
  { id: 'bash', name: 'Bash', path: '/bin/bash' },
  { id: 'zsh', name: 'Zsh', path: '/bin/zsh' },
  { id: 'fish', name: 'Fish', path: '/usr/bin/fish' },
  { id: 'pwsh', name: 'PowerShell', path: 'pwsh' },
  { id: 'cmd', name: 'Command Prompt', path: 'cmd.exe' },
  { id: 'node', name: 'Node.js', path: 'node' },
  { id: 'python', name: 'Python', path: 'python3' },
];
