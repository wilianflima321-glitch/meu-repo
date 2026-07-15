/**
 * Extension contracts for the VS Code-compatible extension runtime.
 * Kept separate so adapters and marketplace surfaces can import types without
 * pulling the EventEmitter-backed host implementation into light routes.
 */

// ============================================================================
// EXTENSION MANIFEST (package.json)
// ============================================================================

export interface ExtensionManifest {
  name: string;
  displayName: string;
  description: string;
  version: string;
  publisher: string;
  icon?: string;
  license?: string;
  repository?: { type: string; url: string };
  homepage?: string;
  bugs?: { url: string };
  
  // VS Code compatible fields
  engines: { aethel: string; vscode?: string };
  categories?: ExtensionCategory[];
  keywords?: string[];
  
  // Activation
  activationEvents?: string[];
  main?: string;            // CommonJS entry
  browser?: string;         // Browser entry
  
  // Contribution points
  contributes?: ExtensionContributions;
  
  // Dependencies
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  extensionDependencies?: string[];
  extensionPack?: string[];
  
  // Settings
  enableProposedApi?: boolean;
  preview?: boolean;
}

export type ExtensionCategory = 
  | 'Programming Languages'
  | 'Snippets'
  | 'Linters'
  | 'Themes'
  | 'Debuggers'
  | 'Formatters'
  | 'Keymaps'
  | 'SCM Providers'
  | 'Other'
  | 'Extension Packs'
  | 'Language Packs'
  | 'Data Science'
  | 'Machine Learning'
  | 'Visualization'
  | 'Notebooks'
  | 'Education'
  | 'Testing'
  | 'AI';

export interface ExtensionContributions {
  commands?: ContributedCommand[];
  menus?: ContributedMenus;
  keybindings?: ContributedKeybinding[];
  languages?: ContributedLanguage[];
  grammars?: ContributedGrammar[];
  themes?: ContributedTheme[];
  iconThemes?: ContributedIconTheme[];
  snippets?: ContributedSnippet[];
  configuration?: ContributedConfiguration;
  configurationDefaults?: Record<string, unknown>;
  views?: ContributedViews;
  viewsContainers?: ContributedViewsContainers;
  viewsWelcome?: ContributedViewsWelcome[];
  colors?: ContributedColor[];
  debuggers?: ContributedDebugger[];
  breakpoints?: ContributedBreakpoint[];
  problemMatchers?: ContributedProblemMatcher[];
  problemPatterns?: ContributedProblemPattern[];
  taskDefinitions?: ContributedTaskDefinition[];
  terminal?: ContributedTerminal;
  customEditors?: ContributedCustomEditor[];
  webviewPanels?: ContributedWebviewPanel[];
  walkthroughs?: ContributedWalkthrough[];
}

export interface ContributedCommand {
  command: string;
  title: string;
  shortTitle?: string;
  category?: string;
  icon?: string | { light: string; dark: string };
  enablement?: string;
}

export interface ContributedMenus {
  'editor/title'?: MenuItem[];
  'editor/context'?: MenuItem[];
  'explorer/context'?: MenuItem[];
  'view/title'?: MenuItem[];
  'view/item/context'?: MenuItem[];
  'commandPalette'?: MenuItem[];
  'scm/title'?: MenuItem[];
  'scm/resourceGroup/context'?: MenuItem[];
  'scm/resource/context'?: MenuItem[];
  [key: string]: MenuItem[] | undefined;
}

export interface MenuItem {
  command: string;
  when?: string;
  group?: string;
  alt?: string;
}

export interface ContributedKeybinding {
  command: string;
  key: string;
  mac?: string;
  linux?: string;
  win?: string;
  when?: string;
  args?: unknown;
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

export interface ContributedSnippet {
  language: string;
  path: string;
}

export interface ContributedConfiguration {
  title?: string;
  order?: number;
  properties: Record<string, ConfigurationProperty>;
}

export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | ('string' | 'number' | 'boolean' | 'array' | 'object' | 'null')[];
  default?: unknown;
  description?: string;
  markdownDescription?: string;
  enum?: unknown[];
  enumDescriptions?: string[];
  enumItemLabels?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  patternErrorMessage?: string;
  format?: string;
  items?: ConfigurationProperty;
  properties?: Record<string, ConfigurationProperty>;
  additionalProperties?: boolean | ConfigurationProperty;
  scope?: 'application' | 'machine' | 'window' | 'resource' | 'language-overridable' | 'machine-overridable';
  editPresentation?: 'singlelineText' | 'multilineText';
  order?: number;
  deprecationMessage?: string;
  markdownDeprecationMessage?: string;
}

export interface ContributedViews {
  explorer?: ViewDescriptor[];
  scm?: ViewDescriptor[];
  debug?: ViewDescriptor[];
  test?: ViewDescriptor[];
  [containerId: string]: ViewDescriptor[] | undefined;
}

export interface ViewDescriptor {
  id: string;
  name: string;
  when?: string;
  icon?: string;
  contextualTitle?: string;
  visibility?: 'visible' | 'hidden' | 'collapsed';
  initialSize?: number;
}

export interface ContributedViewsContainers {
  activitybar?: ViewContainerDescriptor[];
  panel?: ViewContainerDescriptor[];
}

export interface ViewContainerDescriptor {
  id: string;
  title: string;
  icon: string;
}

export interface ContributedViewsWelcome {
  view: string;
  contents: string;
  when?: string;
}

export interface ContributedColor {
  id: string;
  description: string;
  defaults: {
    dark: string;
    light: string;
    highContrast?: string;
    highContrastLight?: string;
  };
}

export interface ContributedDebugger {
  type: string;
  label?: string;
  program?: string;
  args?: string[];
  runtime?: string;
  runtimeArgs?: string[];
  languages?: string[];
  configurationAttributes?: Record<string, unknown>;
  initialConfigurations?: unknown[];
  configurationSnippets?: unknown[];
}

export interface ContributedBreakpoint {
  language: string;
}

export interface ContributedProblemMatcher {
  name: string;
  owner: string;
  fileLocation?: string | string[];
  pattern: string | ContributedProblemPattern;
  severity?: 'error' | 'warning' | 'info';
  source?: string;
}

export interface ContributedProblemPattern {
  name?: string;
  regexp: string;
  kind?: 'file' | 'location';
  file?: number;
  location?: number;
  line?: number;
  column?: number;
  endLine?: number;
  endColumn?: number;
  severity?: number;
  code?: number;
  message?: number;
  loop?: boolean;
}

export interface ContributedTaskDefinition {
  type: string;
  required?: string[];
  properties?: Record<string, ConfigurationProperty>;
  when?: string;
}

export interface ContributedTerminal {
  profiles?: ContributedTerminalProfile[];
}

export interface ContributedTerminalProfile {
  id: string;
  title: string;
  icon?: string;
}

export interface ContributedCustomEditor {
  viewType: string;
  displayName: string;
  selector: { filenamePattern: string }[];
  priority?: 'default' | 'option';
}

export interface ContributedWebviewPanel {
  viewType: string;
  id: string;
  label: string;
}

export interface ContributedWalkthrough {
  id: string;
  title: string;
  description: string;
  steps: WalkthroughStep[];
  featuredFor?: string[];
  when?: string;
}

export interface WalkthroughStep {
  id: string;
  title: string;
  description: string;
  media?: { image?: string; markdown?: string; altText?: string };
  completionEvents?: string[];
  when?: string;
}

// ============================================================================
// EXTENSION CONTEXT
// ============================================================================

export interface ExtensionContext {
  // Unique ID
  readonly extensionId: string;
  readonly extensionUri: string;
  readonly extensionPath: string;
  
  // Storage paths
  readonly globalStoragePath: string;
  readonly storagePath: string;
  readonly logPath: string;
  
  // State storage
  readonly globalState: Memento;
  readonly workspaceState: Memento;
  
  // Secrets
  readonly secrets: SecretStorage;
  
  // Subscriptions for cleanup
  readonly subscriptions: { dispose(): void }[];
  
  // Extension mode
  readonly extensionMode: ExtensionMode;
  
  // Environment
  readonly environmentVariableCollection: EnvironmentVariableCollection;
  
  // Extension
  readonly extension: Extension;
  
  // Storage URI
  readonly globalStorageUri: { fsPath: string; path: string };
  readonly storageUri: { fsPath: string; path: string } | undefined;
  readonly logUri: { fsPath: string; path: string };
}

export interface Memento {
  keys(): readonly string[];
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Promise<void>;
  setKeysForSync(keys: readonly string[]): void;
}

export interface SecretStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  onDidChange: (listener: (e: { key: string }) => void) => { dispose(): void };
}

export enum ExtensionMode {
  Production = 1,
  Development = 2,
  Test = 3,
}

export interface EnvironmentVariableCollection {
  persistent: boolean;
  description: string | { value: string; isMarkdown: boolean } | undefined;
  replace(variable: string, value: string, options?: { applyAtProcessCreation?: boolean; applyAtShellIntegration?: boolean }): void;
  append(variable: string, value: string, options?: { applyAtProcessCreation?: boolean; applyAtShellIntegration?: boolean }): void;
  prepend(variable: string, value: string, options?: { applyAtProcessCreation?: boolean; applyAtShellIntegration?: boolean }): void;
  get(variable: string): EnvironmentVariableMutator | undefined;
  forEach(callback: (variable: string, mutator: EnvironmentVariableMutator, collection: Map<string, EnvironmentVariableMutator>) => void): void;
  delete(variable: string): void;
  clear(): void;
}

type EnvironmentVariableOptions = { applyAtProcessCreation?: boolean; applyAtShellIntegration?: boolean } | undefined;

export interface EnvironmentVariableMutator {
  value: string;
  type: number;
  options: EnvironmentVariableOptions;
}

// ============================================================================
// EXTENSION
// ============================================================================

export interface Extension {
  readonly id: string;
  readonly extensionUri: string;
  readonly extensionPath: string;
  readonly isActive: boolean;
  readonly packageJSON: ExtensionManifest;
  readonly extensionKind: ExtensionKind;
  readonly exports: unknown;
  activate(): Promise<unknown>;
}

export enum ExtensionKind {
  UI = 1,
  Workspace = 2,
}

// ============================================================================
// EXTENSION HOST
// ============================================================================

export interface ExtensionAPI {
  activate(context: ExtensionContext): Promise<unknown> | unknown;
  deactivate?(): Promise<void> | void;
}

export interface LoadedExtension {
  manifest: ExtensionManifest;
  context: ExtensionContext;
  api: ExtensionAPI | null;
  status: 'inactive' | 'activating' | 'active' | 'error';
  error?: Error;
  activationTime?: number;
}


// ============================================================================
// EXTENSION MARKETPLACE CONTRACTS
// ============================================================================

export interface MarketplaceExtension {
  id: string;
  name: string;
  displayName: string;
  publisher: string;
  publisherDisplayName: string;
  version: string;
  description: string;
  icon?: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  lastUpdated: string;
  categories: string[];
  tags: string[];
  verified: boolean;
}

export interface SearchResult {
  extensions: MarketplaceExtension[];
  totalCount: number;
  pageSize: number;
  pageNumber: number;
}

