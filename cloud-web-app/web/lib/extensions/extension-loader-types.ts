export interface ExtensionStateStore {
  get: (key: string) => unknown;
  update: (key: string, value: unknown) => void;
}

export interface ExtensionContext {
  subscriptions: unknown[];
  extensionPath: string;
  extensionUri: string;
  globalState: ExtensionStateStore;
  workspaceState: ExtensionStateStore;
  asAbsolutePath: (relativePath: string) => string;
}

export interface ExtensionModule {
  activate?: (context: ExtensionContext) => unknown | Promise<unknown>;
  deactivate?: () => unknown | Promise<unknown>;
  [key: string]: unknown;
}

export interface ExtensionManifest {
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  description: string;
  main?: string;
  browser?: string;
  contributes?: ExtensionContributions;
  activationEvents?: string[];
  engines: {
    vscode: string;
  };
  categories?: string[];
  keywords?: string[];
  icon?: string;
  repository?: {
    type: string;
    url: string;
  };
  license?: string;
}

export interface ExtensionContributions {
  commands?: CommandContribution[];
  languages?: LanguageContribution[];
  grammars?: GrammarContribution[];
  themes?: ThemeContribution[];
  keybindings?: KeybindingContribution[];
  menus?: MenuContribution[];
  views?: ViewContribution[];
  viewsContainers?: ViewsContainerContribution[];
  configuration?: ConfigurationContribution;
  debuggers?: DebuggerContribution[];
  taskDefinitions?: TaskDefinitionContribution[];
}

export interface CommandContribution {
  command: string;
  title: string;
  category?: string;
  icon?: string;
}

export interface LanguageContribution {
  id: string;
  aliases?: string[];
  extensions?: string[];
  filenames?: string[];
  configuration?: string;
}

export interface GrammarContribution {
  language: string;
  scopeName: string;
  path: string;
}

export interface ThemeContribution {
  label: string;
  uiTheme: 'vs' | 'vs-dark' | 'hc-black';
  path: string;
}

export interface KeybindingContribution {
  command: string;
  key: string;
  when?: string;
  mac?: string;
  linux?: string;
  win?: string;
}

export interface MenuContribution {
  [key: string]: Array<{
    command: string;
    when?: string;
    group?: string;
  }>;
}

export interface ViewContribution {
  [key: string]: Array<{
    id: string;
    name: string;
    when?: string;
  }>;
}

export interface ViewsContainerContribution {
  [key: string]: Array<{
    id: string;
    title: string;
    icon: string;
  }>;
}

export interface ConfigurationContribution {
  title?: string;
  properties: {
    [key: string]: {
      type: string;
      default?: unknown;
      description?: string;
      enum?: unknown[];
      enumDescriptions?: string[];
    };
  };
}

export interface DebuggerContribution {
  type: string;
  label: string;
  program?: string;
  runtime?: string;
  configurationAttributes?: unknown;
}

export interface TaskDefinitionContribution {
  type: string;
  required?: string[];
  properties?: {
    [key: string]: {
      type: string;
      description?: string;
    };
  };
}

export interface LoadedExtension {
  id: string;
  manifest: ExtensionManifest;
  extensionPath: string;
  isActive: boolean;
  exports?: unknown;
  module?: ExtensionModule;
  activationPromise?: Promise<void>;
}
