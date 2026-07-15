// ============================================================================
// Types
// ============================================================================

export interface ExtensionManifest {
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  description?: string;
  main?: string;
  browser?: string;
  activationEvents?: string[];
  contributes?: ExtensionContributes;
  dependencies?: Record<string, string>;
  engines?: {
    aethel?: string;
    vscode?: string;
  };
  categories?: string[];
  keywords?: string[];
  icon?: string;
  repository?: string;
  license?: string;
}

export interface ExtensionContributes {
  commands?: ContributedCommand[];
  menus?: Record<string, ContributedMenu[]>;
  keybindings?: ContributedKeybinding[];
  configuration?: ContributedConfiguration;
  themes?: ContributedTheme[];
  iconThemes?: ContributedIconTheme[];
  languages?: ContributedLanguage[];
  grammars?: ContributedGrammar[];
  snippets?: ContributedSnippet[];
  views?: Record<string, ContributedView[]>;
  viewsContainers?: {
    activitybar?: ContributedViewContainer[];
    panel?: ContributedViewContainer[];
  };
  taskDefinitions?: ContributedTaskDefinition[];
  debuggers?: ContributedDebugger[];
  breakpoints?: ContributedBreakpoint[];
  customEditors?: ContributedCustomEditor[];
  webviewPanels?: ContributedWebviewPanel[];
}

export interface ContributedCommand {
  command: string;
  title: string;
  category?: string;
  icon?: string | { light: string; dark: string };
  enablement?: string;
}

export interface ContributedMenu {
  command: string;
  when?: string;
  group?: string;
}

export interface ContributedKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
}

export interface ContributedConfiguration {
  title?: string;
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: string | string[];
  default?: unknown;
  description?: string;
  enum?: unknown[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  items?: unknown;
  scope?: 'application' | 'machine' | 'window' | 'resource' | 'language-overridable';
}

export interface ContributedTheme {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';
  path: string;
}

export interface ContributedIconTheme {
  id: string;
  label: string;
  path: string;
}

export interface ContributedLanguage {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  filenamePatterns?: string[];
  firstLine?: string;
  configuration?: string;
  icon?: { light: string; dark: string };
}

export interface ContributedGrammar {
  language?: string;
  scopeName: string;
  path: string;
  embeddedLanguages?: Record<string, string>;
  tokenTypes?: Record<string, string>;
  injectTo?: string[];
}

export interface ContributedSnippet {
  language: string;
  path: string;
}

export interface ContributedView {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
  visibility?: 'visible' | 'hidden' | 'collapsed';
}

export interface ContributedViewContainer {
  id: string;
  title: string;
  icon: string;
}

export interface ContributedTaskDefinition {
  type: string;
  required?: string[];
  properties?: Record<string, unknown>;
}

export interface ContributedDebugger {
  type: string;
  label: string;
  program?: string;
  runtime?: string;
  languages?: string[];
  variables?: Record<string, unknown>;
  configurationAttributes?: unknown;
  initialConfigurations?: unknown[];
  configurationSnippets?: unknown[];
}

export interface ContributedBreakpoint {
  language: string;
}

export interface ContributedCustomEditor {
  viewType: string;
  displayName: string;
  selector: { filenamePattern: string }[];
  priority?: 'default' | 'option';
}

export interface ContributedWebviewPanel {
  viewType: string;
  displayName: string;
}

export interface Extension {
  id: string;
  manifest: ExtensionManifest;
  extensionPath: string;
  isActive: boolean;
  exports?: unknown;
}

export interface ExtensionContext {
  extensionPath: string;
  extensionUri: string;
  globalStoragePath: string;
  workspaceStoragePath: string;
  logPath: string;
  subscriptions: { dispose: () => void }[];
  globalState: {
    get<T>(key: string, defaultValue?: T): T | undefined;
    update(key: string, value: unknown): Promise<void>;
    keys(): readonly string[];
  };
  workspaceState: {
    get<T>(key: string, defaultValue?: T): T | undefined;
    update(key: string, value: unknown): Promise<void>;
    keys(): readonly string[];
  };
  secrets: {
    get(key: string): Promise<string | undefined>;
    store(key: string, value: string): Promise<void>;
    delete(key: string): Promise<void>;
  };
  asAbsolutePath(relativePath: string): string;
}

export interface ExtensionHostMessage {
  id: string;
  type: string;
  payload: unknown;
}

export type Disposable = { dispose: () => void };
export type ApiNamespace = Record<string, unknown>;
export type NumericEnum = Record<string, number>;
export type ExtensionCallback = (...args: unknown[]) => unknown | Promise<unknown>;
export type EventListener = (...args: unknown[]) => void;
export type ProviderLike = unknown;
export type DocumentSelector = string | readonly string[] | Record<string, unknown>;
export type QuickPickOptions = Record<string, unknown>;
export type InputBoxOptions = Record<string, unknown>;
export type ViewShowOptions = Record<string, unknown>;
export type WebviewPanelOptions = Record<string, unknown>;
export type TerminalOptions = { name?: string } & Record<string, unknown>;
export type ProgressOptions = Record<string, unknown>;
export type ProgressReport = { message?: string; increment?: number };
export type ProgressReporter = { report: (value: ProgressReport) => void };
export type ProgressTask<R> = (progress: ProgressReporter) => R | Promise<R>;
export type WorkspaceFolder = { uri: UriLike; name: string; index: number };
export type WorkspaceEdit = Record<string, unknown>;
export type DebugConfiguration = Record<string, unknown>;
export type DebugSession = Record<string, unknown>;
export type TaskFilter = Record<string, unknown>;
export type TaskLike = Record<string, unknown>;

export type UriLike = {
  scheme: string;
  path: string;
  toString: () => string;
};

export type UriFactory = {
  file: (p: string) => UriLike;
  parse: (value: string) => UriLike;
  joinPath: (base: UriLike, ...pathSegments: string[]) => UriLike;
};

export type OutputChannel = {
  name: string;
  append: (value: string) => void;
  appendLine: (value: string) => void;
  clear: () => void;
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

export type Terminal = {
  name: string;
  processId: Promise<number>;
  sendText: (text: string) => void;
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

export type WebviewPanel = {
  viewType: string;
  title: string;
  webview: {
    html: string;
    onDidReceiveMessage: (listener: EventListener) => Disposable;
    postMessage: (message: unknown) => Promise<boolean>;
    asWebviewUri: (uri: UriLike) => UriLike;
  };
  visible: boolean;
  active: boolean;
  dispose: () => void;
  reveal: () => void;
  onDidChangeViewState: (listener: EventListener) => Disposable;
  onDidDispose: (listener: EventListener) => Disposable;
};

export type StatusBarItem = {
  id: string;
  alignment: number;
  priority: number;
  text: string;
  tooltip: string;
  color: string | undefined;
  backgroundColor: string | undefined;
  command: string | undefined;
  show: () => void;
  hide: () => void;
  dispose: () => void;
};

export type ConfigurationReader = {
  get: (key: string) => unknown;
};

export type DebugConsole = {
  append: (value?: string) => void;
  appendLine: (value?: string) => void;
};

export type TaskExecution = {
  terminate: () => void;
};

export interface PositionLike {
  line: number;
  character: number;
  isEqual(other: PositionLike): boolean;
  isBefore(other: PositionLike): boolean;
  isAfter(other: PositionLike): boolean;
}

export type RangeLike = {
  start: PositionLike;
  end: PositionLike;
};

export class RuntimePosition implements PositionLike {
  constructor(public line: number, public character: number) {}

  isEqual(other: PositionLike): boolean {
    return this.line === other.line && this.character === other.character;
  }

  isBefore(other: PositionLike): boolean {
    return this.line < other.line || (this.line === other.line && this.character < other.character);
  }

  isAfter(other: PositionLike): boolean {
    return this.line > other.line || (this.line === other.line && this.character > other.character);
  }

  translate(lineDelta = 0, characterDelta = 0): RuntimePosition {
    return new RuntimePosition(this.line + lineDelta, this.character + characterDelta);
  }
}

export class RuntimeRange implements RangeLike {
  constructor(public start: PositionLike, public end: PositionLike) {}

  static fromPositions(start: PositionLike, end: PositionLike): RuntimeRange {
    return new RuntimeRange(start, end);
  }

  get isEmpty(): boolean {
    return this.start.isEqual(this.end);
  }

  get isSingleLine(): boolean {
    return this.start.line === this.end.line;
  }

  contains(positionOrRange: PositionLike | RangeLike): boolean {
    if ('start' in positionOrRange) {
      return this.contains(positionOrRange.start) && this.contains(positionOrRange.end);
    }
    return !positionOrRange.isBefore(this.start) && !positionOrRange.isAfter(this.end);
  }
}

export class RuntimeSelection extends RuntimeRange {
  constructor(public anchor: PositionLike, public active: PositionLike) {
    super(anchor, active);
  }

  get isReversed(): boolean {
    return this.anchor.isAfter(this.active);
  }
}
