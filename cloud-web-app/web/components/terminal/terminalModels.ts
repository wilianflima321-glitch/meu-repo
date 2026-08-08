import type { ReactNode } from 'react';

/** L.4 lane split — human host PTY vs Forge sandbox (agents never host PTY). */
export type TerminalExecutionLane = 'human-host-pty' | 'forge-sandbox';

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

export const TERMINAL_THEMES: Record<string, TerminalTheme> = {
  'dark-plus': {
    name: 'Dark+',
    colors: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: 'rgba(255, 255, 255, 0.3)',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#ffffff',
    },
  },
  monokai: {
    name: 'Monokai',
    colors: {
      background: '#272822',
      foreground: '#f8f8f2',
      cursor: '#f8f8f0',
      cursorAccent: '#272822',
      selection: 'rgba(73, 72, 62, 0.75)',
      black: '#272822',
      red: '#f92672',
      green: '#a6e22e',
      yellow: '#f4bf75',
      blue: '#66d9ef',
      magenta: '#ae81ff',
      cyan: '#a1efe4',
      white: '#f8f8f2',
      brightBlack: '#75715e',
      brightRed: '#f92672',
      brightGreen: '#a6e22e',
      brightYellow: '#f4bf75',
      brightBlue: '#66d9ef',
      brightMagenta: '#ae81ff',
      brightCyan: '#a1efe4',
      brightWhite: '#f9f8f5',
    },
  },
  dracula: {
    name: 'Dracula',
    colors: {
      background: '#282a36',
      foreground: '#f8f8f2',
      cursor: '#f8f8f2',
      cursorAccent: '#282a36',
      selection: 'rgba(68, 71, 90, 0.75)',
      black: '#21222c',
      red: '#ff5555',
      green: '#50fa7b',
      yellow: '#f1fa8c',
      blue: '#bd93f9',
      magenta: '#ff79c6',
      cyan: '#8be9fd',
      white: '#f8f8f2',
      brightBlack: '#6272a4',
      brightRed: '#ff6e6e',
      brightGreen: '#69ff94',
      brightYellow: '#ffffa5',
      brightBlue: '#d6acff',
      brightMagenta: '#ff92df',
      brightCyan: '#a4ffff',
      brightWhite: '#ffffff',
    },
  },
  nord: {
    name: 'Nord',
    colors: {
      background: '#2e3440',
      foreground: '#d8dee9',
      cursor: '#d8dee9',
      cursorAccent: '#2e3440',
      selection: 'rgba(67, 76, 94, 0.75)',
      black: '#3b4252',
      red: '#bf616a',
      green: '#a3be8c',
      yellow: '#ebcb8b',
      blue: '#81a1c1',
      magenta: '#b48ead',
      cyan: '#88c0d0',
      white: '#e5e9f0',
      brightBlack: '#4c566a',
      brightRed: '#bf616a',
      brightGreen: '#a3be8c',
      brightYellow: '#ebcb8b',
      brightBlue: '#81a1c1',
      brightMagenta: '#b48ead',
      brightCyan: '#8fbcbb',
      brightWhite: '#eceff4',
    },
  },
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
