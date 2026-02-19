/**
 * Shared type contracts for Extension Host runtime and integrations.
 */

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
  default?: any;
  description?: string;
  enum?: any[];
  enumDescriptions?: string[];
  minimum?: number;
  maximum?: number;
  items?: any;
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
  properties?: Record<string, any>;
}

export interface ContributedDebugger {
  type: string;
  label: string;
  program?: string;
  runtime?: string;
  languages?: string[];
  variables?: Record<string, any>;
  configurationAttributes?: any;
  initialConfigurations?: any[];
  configurationSnippets?: any[];
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
  exports?: any;
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
    update(key: string, value: any): Promise<void>;
    keys(): readonly string[];
  };
  workspaceState: {
    get<T>(key: string, defaultValue?: T): T | undefined;
    update(key: string, value: any): Promise<void>;
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
  payload: any;
}
