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

class WindowAPI {
  private _activeTextEditor: any = null;
  private _visibleTextEditors: any[] = [];
  private _terminals: any[] = [];
  private messageListeners: Array<(message: any) => void> = [];

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
    ...args: any[]
  ): Promise<any> {
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
    ...args: any[]
  ): Promise<any> {
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
    ...args: any[]
  ): Promise<any> {
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

    // Mock implementation - return first item
    if (resolvedItems.length > 0) {
      if (options?.canPickMany) {
        return resolvedItems.filter(item => item.picked);
      }
      return resolvedItems[0];
    }

    return undefined;
  }

  /**
   * Show input box
   */
  async showInputBox(options?: InputBoxOptions): Promise<string | undefined> {
    log.info('[Window] Show input box:', options);

    // Mock implementation - return default value or empty string
    return options?.value || '';
  }

  /**
   * Show open dialog
   */
  async showOpenDialog(options?: OpenDialogOptions): Promise<string[] | undefined> {
    log.info('[Window] Show open dialog:', options);

    // Mock implementation
    return undefined;
  }

  /**
   * Show save dialog
   */
  async showSaveDialog(options?: SaveDialogOptions): Promise<string | undefined> {
    log.info('[Window] Show save dialog:', options);

    // Mock implementation
    return undefined;
  }

  /**
   * Show text document
   */
  async showTextDocument(uri: string, options?: any): Promise<any> {
    log.info('[Window] Show text document:', uri, options);

    // Mock implementation
    return {
      uri,
      document: { uri },
    };
  }

  /**
   * Create output channel
   */
  createOutputChannel(name: string): any {
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
  createTerminal(name?: string, shellPath?: string, shellArgs?: string[]): any {
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
  setStatusBarMessage(text: string, hideWhenDone: Promise<any>): { dispose: () => void };
  setStatusBarMessage(text: string, arg?: any): { dispose: () => void } {
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
  createStatusBarItem(alignment?: number, priority?: number): any {
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
    task: (progress: any, token: any) => Promise<R>
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
  get activeTextEditor(): any {
    return this._activeTextEditor;
  }

  /**
   * Set active text editor
   */
  setActiveTextEditor(editor: any): void {
    this._activeTextEditor = editor;
  }

  /**
   * Get visible text editors
   */
  get visibleTextEditors(): any[] {
    return this._visibleTextEditors;
  }

  /**
   * Get terminals
   */
  get terminals(): any[] {
    return this._terminals;
  }

  /**
   * Get active terminal
   */
  get activeTerminal(): any | undefined {
    return this._terminals[this._terminals.length - 1];
  }

  /**
   * Show message (internal)
   */
  private async showMessage(
    type: MessageType,
    message: string,
    args: any[]
  ): Promise<any> {
    const options = args.find(arg => typeof arg === 'object' && 'modal' in arg);
    const items = args.filter(arg => typeof arg === 'string' || (typeof arg === 'object' && 'title' in arg));

    log.info(`[Window] Show ${type} message:`, message, { options, items });

    // Notify listeners
    this.messageListeners.forEach(listener => {
      listener({ type, message, options, items });
    });

    // Mock implementation - return first item if available
    if (items.length > 0) {
      return typeof items[0] === 'string' ? { title: items[0] } : items[0];
    }

    return undefined;
  }

  /**
   * Add message listener
   */
  onDidShowMessage(listener: (message: any) => void): { dispose: () => void } {
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
