import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('extensions/vscode-api/window')


/**
 * VS Code Window API Implementation
 * Provides window-related functionality (messages, input, quick pick, etc.)
 */

export enum MessageType {
  Info = 'info',
  Warning = 'warning',
  Error = 'error',
}

export interface MessageItem {
  title: string;
  isCloseAffordance?: boolean;
}

export interface QuickPickItem {
  label: string;
  description?: string;
  detail?: string;
  picked?: boolean;
  alwaysShow?: boolean;
}

export interface QuickPickOptions {
  title?: string;
  placeHolder?: string;
  canPickMany?: boolean;
  ignoreFocusOut?: boolean;
  matchOnDescription?: boolean;
  matchOnDetail?: boolean;
}

export interface InputBoxOptions {
  title?: string;
  value?: string;
  valueSelection?: [number, number];
  prompt?: string;
  placeHolder?: string;
  password?: boolean;
  ignoreFocusOut?: boolean;
  validateInput?: (value: string) => string | undefined | null | Promise<string | undefined | null>;
}

export interface OpenDialogOptions {
  defaultUri?: string;
  openLabel?: string;
  canSelectFiles?: boolean;
  canSelectFolders?: boolean;
  canSelectMany?: boolean;
  filters?: { [name: string]: string[] };
  title?: string;
}

export interface SaveDialogOptions {
  defaultUri?: string;
  saveLabel?: string;
  filters?: { [name: string]: string[] };
  title?: string;
}

export type Disposable = { dispose: () => void };
export type MessageOptions = { modal?: boolean };
export type MessageArg = string | MessageItem | MessageOptions;
export type WindowMessage = {
  type: MessageType;
  message: string;
  options?: MessageOptions;
  items: Array<string | MessageItem>;
};
export type TextEditor = {
  uri?: string;
  document?: { uri: string };
  [key: string]: unknown;
};
export type TextDocumentShowOptions = Record<string, unknown>;
export type OutputChannel = {
  name: string;
  append: (value: string) => void;
  appendLine: (value: string) => void;
  clear: () => void;
  show: (preserveFocus?: boolean) => void;
  hide: () => void;
  dispose: () => void;
};
export type Terminal = {
  name: string;
  processId: Promise<number>;
  sendText: (text: string, addNewLine?: boolean) => void;
  show: (preserveFocus?: boolean) => void;
  hide: () => void;
  dispose: () => void;
};
export type StatusBarItem = {
  text: string;
  tooltip: string;
  color: string | undefined;
  command: string | undefined;
  alignment?: number;
  priority?: number;
  show: () => void;
  hide: () => void;
  dispose: () => void;
};
export type ProgressReporter = {
  report: (value: { message?: string; increment?: number }) => void;
};
export type CancellationToken = {
  isCancellationRequested: boolean;
  onCancellationRequested: () => Disposable;
};

class WindowAPI {
  private _activeTextEditor: TextEditor | null = null;
  private _visibleTextEditors: TextEditor[] = [];
  private _terminals: Terminal[] = [];
  private messageListeners: Array<(message: WindowMessage) => void> = [];

  /**
   * Show information message
   */
  async showInformationMessage<T extends MessageItem>(
    message: string,
    ...items: T[]
  ): Promise<T | undefined>;
  async showInformationMessage(
    message: string,
    options: { modal?: boolean },
    ...items: MessageItem[]
  ): Promise<MessageItem | undefined>;
  async showInformationMessage(
    message: string,
    ...args: MessageArg[]
  ): Promise<MessageItem | undefined> {
    return this.showMessage(MessageType.Info, message, args);
  }

  /**
   * Show warning message
   */
  async showWarningMessage<T extends MessageItem>(
    message: string,
    ...items: T[]
  ): Promise<T | undefined>;
  async showWarningMessage(
    message: string,
    options: { modal?: boolean },
    ...items: MessageItem[]
  ): Promise<MessageItem | undefined>;
  async showWarningMessage(
    message: string,
    ...args: MessageArg[]
  ): Promise<MessageItem | undefined> {
    return this.showMessage(MessageType.Warning, message, args);
  }

  /**
   * Show error message
   */
  async showErrorMessage<T extends MessageItem>(
    message: string,
    ...items: T[]
  ): Promise<T | undefined>;
  async showErrorMessage(
    message: string,
    options: { modal?: boolean },
    ...items: MessageItem[]
  ): Promise<MessageItem | undefined>;
  async showErrorMessage(
    message: string,
    ...args: MessageArg[]
  ): Promise<MessageItem | undefined> {
    return this.showMessage(MessageType.Error, message, args);
  }

  /**
   * Show quick pick
   */
  async showQuickPick<T extends QuickPickItem>(
    items: T[] | Promise<T[]>,
    options?: QuickPickOptions
  ): Promise<T | T[] | undefined> {
    const resolvedItems = await Promise.resolve(items);

    log.info('[Window] Show quick pick:', {
      itemCount: resolvedItems.length,
      options,
    });

    if (resolvedItems.length > 0) {
      if (options?.canPickMany) {
        return resolvedItems.filter(item => item.picked);
      }
      return resolvedItems.find(item => item.picked);
    }

    return undefined;
  }

  /**
   * Show input box
   */
  async showInputBox(options?: InputBoxOptions): Promise<string | undefined> {
    log.info('[Window] Show input box:', options);

    return undefined;
  }

  /**
   * Show open dialog
   */
  async showOpenDialog(options?: OpenDialogOptions): Promise<string[] | undefined> {
    log.info('[Window] Show open dialog:', options);

    return undefined;
  }

  /**
   * Show save dialog
   */
  async showSaveDialog(options?: SaveDialogOptions): Promise<string | undefined> {
    log.info('[Window] Show save dialog:', options);

    return undefined;
  }

  /**
   * Show text document
   */
  async showTextDocument(uri: string, options?: TextDocumentShowOptions): Promise<TextEditor> {
    log.info('[Window] Show text document:', uri, options);

    const editor = {
      uri,
      document: { uri },
    };
    this._activeTextEditor = editor;
    this._visibleTextEditors = [editor];
    return editor;
  }

  /**
   * Create output channel
   */
  createOutputChannel(name: string): OutputChannel {
    log.info('[Window] Create output channel:', name);

    return {
      name,
      append: (value: string) => log.info(`[Output:${name}]`, value),
      appendLine: (value: string) => log.info(`[Output:${name}]`, value),
      clear: () => log.info(`[Output:${name}] Cleared`),
      show: (preserveFocus?: boolean) => log.info(`[Output:${name}] Shown`),
      hide: () => log.info(`[Output:${name}] Hidden`),
      dispose: () => log.info(`[Output:${name}] Disposed`),
    };
  }

  /**
   * Create terminal
   */
  createTerminal(name?: string, shellPath?: string, shellArgs?: string[]): Terminal {
    const terminal = {
      name: name || `Terminal ${this._terminals.length + 1}`,
      processId: Promise.resolve(Math.floor(Math.random() * 10000)),
      sendText: (text: string, addNewLine?: boolean) => {
        log.info(`[Terminal:${terminal.name}] Send text:`, text);
      },
      show: (preserveFocus?: boolean) => {
        log.info(`[Terminal:${terminal.name}] Shown`);
      },
      hide: () => {
        log.info(`[Terminal:${terminal.name}] Hidden`);
      },
      dispose: () => {
        const index = this._terminals.indexOf(terminal);
        if (index > -1) {
          this._terminals.splice(index, 1);
        }
        log.info(`[Terminal:${terminal.name}] Disposed`);
      },
    };

    this._terminals.push(terminal);
    log.info('[Window] Created terminal:', terminal.name);

    return terminal;
  }

  /**
   * Set status bar message
   */
  setStatusBarMessage(text: string, hideAfterTimeout?: number): { dispose: () => void };
  setStatusBarMessage(text: string, hideWhenDone: Promise<unknown>): { dispose: () => void };
  setStatusBarMessage(text: string, arg?: number | Promise<unknown>): { dispose: () => void } {
    log.info('[Window] Status bar message:', text);

    if (typeof arg === 'number') {
      setTimeout(() => {
        log.info('[Window] Status bar message cleared after timeout');
      }, arg);
    } else if (arg instanceof Promise) {
      arg.then(() => {
        log.info('[Window] Status bar message cleared after promise');
      });
    }

    return {
      dispose: () => {
        log.info('[Window] Status bar message disposed');
      },
    };
  }

  /**
   * Create status bar item
   */
  createStatusBarItem(alignment?: number, priority?: number): StatusBarItem {
    return {
      text: '',
      tooltip: '',
      color: undefined,
      command: undefined,
      alignment,
      priority,
      show: () => log.info('[Window] Status bar item shown'),
      hide: () => log.info('[Window] Status bar item hidden'),
      dispose: () => log.info('[Window] Status bar item disposed'),
    };
  }

  /**
   * With progress
   */
  async withProgress<R>(
    options: {
      location: number;
      title?: string;
      cancellable?: boolean;
    },
    task: (progress: ProgressReporter, token: CancellationToken) => Promise<R>
  ): Promise<R> {
    log.info('[Window] With progress:', options);

    const progress = {
      report: (value: { message?: string; increment?: number }) => {
        log.info('[Window] Progress report:', value);
      },
    };

    const token = {
      isCancellationRequested: false,
      onCancellationRequested: () => ({ dispose: () => {} }),
    };

    return await task(progress, token);
  }

  /**
   * Get active text editor
   */
  get activeTextEditor(): TextEditor | null {
    return this._activeTextEditor;
  }

  /**
   * Set active text editor
   */
  setActiveTextEditor(editor: TextEditor | null): void {
    this._activeTextEditor = editor;
  }

  /**
   * Get visible text editors
   */
  get visibleTextEditors(): TextEditor[] {
    return this._visibleTextEditors;
  }

  /**
   * Get terminals
   */
  get terminals(): Terminal[] {
    return this._terminals;
  }

  /**
   * Get active terminal
   */
  get activeTerminal(): Terminal | undefined {
    return this._terminals[this._terminals.length - 1];
  }

  /**
   * Show message (internal)
   */
  private async showMessage(
    type: MessageType,
    message: string,
    args: MessageArg[]
  ): Promise<MessageItem | undefined> {
    const options = args.find((arg): arg is MessageOptions => typeof arg === 'object' && arg !== null && 'modal' in arg);
    const items = args.filter((arg): arg is string | MessageItem => typeof arg === 'string' || (typeof arg === 'object' && arg !== null && 'title' in arg));

    log.info(`[Window] Show ${type} message:`, message, { options, items });

    // Notify listeners
    this.messageListeners.forEach(listener => {
      listener({ type, message, options, items });
    });

    return undefined;
  }

  /**
   * Add message listener
   */
  onDidShowMessage(listener: (message: WindowMessage) => void): { dispose: () => void } {
    this.messageListeners.push(listener);

    return {
      dispose: () => {
        const index = this.messageListeners.indexOf(listener);
        if (index > -1) {
          this.messageListeners.splice(index, 1);
        }
      },
    };
  }
}

// Singleton instance
let windowInstance: WindowAPI | null = null;

export function getWindowAPI(): WindowAPI {
  if (!windowInstance) {
    windowInstance = new WindowAPI();
  }
  return windowInstance;
}

export const window = getWindowAPI();
