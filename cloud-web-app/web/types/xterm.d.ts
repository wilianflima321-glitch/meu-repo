// Type declarations for xterm packages without bundled types

declare module 'xterm' {
  export interface ITerminalOptions {
    fontFamily?: string;
    fontSize?: number;
    lineHeight?: number;
    cursorBlink?: boolean;
    cursorStyle?: 'block' | 'underline' | 'bar';
    theme?: ITheme;
    scrollback?: number;
    tabStopWidth?: number;
    allowProposedApi?: boolean;
    convertEol?: boolean;
    disableStdin?: boolean;
    [key: string]: any;
  }

  export interface ITheme {
    background?: string;
    foreground?: string;
    cursor?: string;
    cursorAccent?: string;
    selection?: string;
    black?: string;
    red?: string;
    green?: string;
    yellow?: string;
    blue?: string;
    magenta?: string;
    cyan?: string;
    white?: string;
    brightBlack?: string;
    brightRed?: string;
    brightGreen?: string;
    brightYellow?: string;
    brightBlue?: string;
    brightMagenta?: string;
    brightCyan?: string;
    brightWhite?: string;
  }

  export interface IDisposable {
    dispose(): void;
  }

  export interface ITerminalAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
  }

  export class Terminal {
    constructor(options?: ITerminalOptions);
    element: HTMLElement | undefined;
    textarea: HTMLTextAreaElement | undefined;
    rows: number;
    cols: number;
    
    onData(handler: (data: string) => void): IDisposable;
    onKey(handler: (event: { key: string; domEvent: KeyboardEvent }) => void): IDisposable;
    onResize(handler: (data: { cols: number; rows: number }) => void): IDisposable;
    onTitleChange(handler: (title: string) => void): IDisposable;
    
    open(parent: HTMLElement): void;
    write(data: string): void;
    writeln(data: string): void;
    clear(): void;
    reset(): void;
    focus(): void;
    blur(): void;
    dispose(): void;
    
    loadAddon(addon: ITerminalAddon): void;
    scrollToBottom(): void;
    scrollLines(amount: number): void;
    scrollPages(pageCount: number): void;
    scrollToLine(line: number): void;
    paste(data: string): void;
    select(column: number, row: number, length: number): void;
    selectAll(): void;
    selectLines(start: number, end: number): void;
    getSelection(): string;
    hasSelection(): boolean;
    clearSelection(): void;
  }
}

declare module 'xterm-addon-fit' {
  import { Terminal, ITerminalAddon } from 'xterm';
  
  export interface IFitAddon extends ITerminalAddon {
    fit(): void;
    proposeDimensions(): { cols: number; rows: number } | undefined;
  }
  
  export class FitAddon implements IFitAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
    fit(): void;
    proposeDimensions(): { cols: number; rows: number } | undefined;
  }
}

declare module 'xterm-addon-web-links' {
  import { Terminal, ITerminalAddon } from 'xterm';
  
  export interface ILinkHandlerOptions {
    hover?(event: MouseEvent, uri: string): void;
    leave?(event: MouseEvent, uri: string): void;
    urlRegex?: RegExp;
    leaveCallback?(): void;
    tooltipCallback?(event: MouseEvent, uri: string, location: { start: { x: number; y: number }; end: { x: number; y: number } }): boolean | void;
  }

  export class WebLinksAddon implements ITerminalAddon {
    constructor(handler?: (event: MouseEvent, uri: string) => void, options?: ILinkHandlerOptions);
    activate(terminal: Terminal): void;
    dispose(): void;
  }
}

declare module 'xterm-addon-search' {
  import { Terminal, ITerminalAddon, IDisposable } from 'xterm';
  
  export interface ISearchOptions {
    regex?: boolean;
    wholeWord?: boolean;
    caseSensitive?: boolean;
    incremental?: boolean;
    decorations?: ISearchDecorationOptions;
  }

  export interface ISearchDecorationOptions {
    matchBackground?: string;
    matchBorder?: string;
    matchOverviewRuler?: string;
    activeMatchBackground?: string;
    activeMatchBorder?: string;
    activeMatchColorOverviewRuler?: string;
  }

  export interface ISearchResult {
    resultIndex: number;
    resultCount: number;
  }

  export class SearchAddon implements ITerminalAddon {
    activate(terminal: Terminal): void;
    dispose(): void;
    findNext(term: string, searchOptions?: ISearchOptions): boolean;
    findPrevious(term: string, searchOptions?: ISearchOptions): boolean;
    clearDecorations(): void;
    onDidChangeResults(listener: (results: ISearchResult) => void): IDisposable;
  }
}

// CSS module declaration
declare module 'xterm/css/xterm.css' {
  const content: string;
  export default content;
}
