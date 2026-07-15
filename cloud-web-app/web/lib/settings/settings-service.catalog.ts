import type { SettingCategory, SettingDefinition, SettingsRecord } from './settings-service.types';

export const DEFAULT_SETTINGS: SettingsRecord = {
  // Editor
  'editor.fontSize': 14,
  'editor.fontFamily': "'JetBrains Mono', 'Fira Code', monospace",
  'editor.fontLigatures': true,
  'editor.tabSize': 2,
  'editor.insertSpaces': true,
  'editor.wordWrap': 'off',
  'editor.lineNumbers': 'on',
  'editor.minimap.enabled': true,
  'editor.minimap.maxColumn': 120,
  'editor.renderWhitespace': 'selection',
  'editor.cursorBlinking': 'smooth',
  'editor.cursorStyle': 'line',
  'editor.smoothScrolling': true,
  'editor.formatOnSave': false,
  'editor.formatOnPaste': false,
  'editor.autoSave': 'off',
  'editor.autoSaveDelay': 1000,
  'editor.bracketPairColorization.enabled': true,
  'editor.guides.bracketPairs': true,
  'editor.guides.indentation': true,
  'editor.inlineSuggest.enabled': true,
  'editor.suggest.showKeywords': true,
  'editor.suggest.showSnippets': true,
  'editor.quickSuggestions': true,
  'editor.parameterHints.enabled': true,
  'editor.hover.enabled': true,
  'editor.hover.delay': 300,

  // Workbench
  'workbench.colorTheme': 'Catppuccin Mocha',
  'workbench.iconTheme': 'catppuccin-mocha',
  'workbench.productIconTheme': 'Default',
  'workbench.startupEditor': 'welcomePage',
  'workbench.sideBar.location': 'left',
  'workbench.activityBar.location': 'side',
  'workbench.panel.defaultLocation': 'bottom',
  'workbench.editor.enablePreview': true,
  'workbench.editor.showTabs': 'multiple',
  'workbench.tree.indent': 20,
  'workbench.tree.renderIndentGuides': 'always',

  // Terminal
  'terminal.integrated.fontSize': 14,
  'terminal.integrated.fontFamily': "'JetBrains Mono', monospace",
  'terminal.integrated.cursorBlinking': true,
  'terminal.integrated.cursorStyle': 'block',
  'terminal.integrated.scrollback': 10000,
  'terminal.integrated.copyOnSelection': false,
  'terminal.integrated.defaultProfile.windows': 'PowerShell',
  'terminal.integrated.defaultProfile.linux': 'bash',
  'terminal.integrated.defaultProfile.osx': 'zsh',

  // Files
  'files.autoSave': 'off',
  'files.autoSaveDelay': 1000,
  'files.exclude': {
    '**/.git': true,
    '**/.svn': true,
    '**/.hg': true,
    '**/CVS': true,
    '**/.DS_Store': true,
    '**/Thumbs.db': true,
    '**/node_modules': true,
  },
  'files.watcherExclude': {
    '**/.git/objects/**': true,
    '**/.git/subtree-cache/**': true,
    '**/node_modules/**': true,
    '**/.hg/store/**': true,
  },
  'files.encoding': 'utf8',
  'files.eol': 'auto',
  'files.trimTrailingWhitespace': false,
  'files.insertFinalNewline': false,

  // Search
  'search.exclude': {
    '**/node_modules': true,
    '**/bower_components': true,
    '**/*.code-search': true,
  },
  'search.useIgnoreFiles': true,
  'search.followSymlinks': true,
  'search.smartCase': false,

  // Git
  'git.enabled': true,
  'git.autofetch': false,
  'git.autorefresh': true,
  'git.confirmSync': true,
  'git.enableSmartCommit': false,
  'git.fetchOnPull': false,

  // AI
  'ai.enabled': true,
  'ai.ghostText.enabled': true,
  'ai.ghostText.debounceMs': 300,
  'ai.chat.enabled': true,
  'ai.agentMode.enabled': true,
  'ai.agentMode.requireApproval': true,
  'ai.model': 'google/gemini-3.1-flash-lite-preview',
  'ai.temperature': 0.7,

  // Debug
  'debug.console.fontSize': 14,
  'debug.console.wordWrap': true,
  'debug.inlineValues': 'auto',
  'debug.toolBarLocation': 'floating',
  'debug.openDebug': 'openOnFirstSessionStart',
  'debug.showInStatusBar': 'onFirstSessionStart',

  // Extensions
  'extensions.autoUpdate': true,
  'extensions.autoCheckUpdates': true,
  'extensions.ignoreRecommendations': false,

  // Telemetry
  'telemetry.telemetryLevel': 'error',

  // Window
  'window.zoomLevel': 0,
  'window.newWindowDimensions': 'default',
  'window.restoreWindows': 'all',
  'window.titleBarStyle': 'custom',
};

// ============================================================================
// SETTING DEFINITIONS
// ============================================================================

export const SETTING_DEFINITIONS: Record<string, SettingDefinition> = {
  'editor.fontSize': {
    key: 'editor.fontSize',
    type: 'number',
    default: 14,
    description: 'Controls the font size in pixels.',
    scope: 'resource',
    minimum: 6,
    maximum: 100,
    tags: ['editor', 'font'],
  },
  'editor.fontFamily': {
    key: 'editor.fontFamily',
    type: 'string',
    default: "'JetBrains Mono', 'Fira Code', monospace",
    description: 'Controls the font family.',
    scope: 'resource',
    tags: ['editor', 'font'],
  },
  'editor.tabSize': {
    key: 'editor.tabSize',
    type: 'number',
    default: 2,
    description: 'The number of spaces a tab is equal to.',
    scope: 'resource',
    minimum: 1,
    maximum: 16,
    tags: ['editor', 'whitespace'],
  },
  'editor.wordWrap': {
    key: 'editor.wordWrap',
    type: 'enum',
    default: 'off',
    description: 'Controls how lines should wrap.',
    scope: 'resource',
    enum: ['off', 'on', 'wordWrapColumn', 'bounded'],
    enumDescriptions: [
      'Lines will never wrap.',
      'Lines will wrap at the viewport width.',
      'Lines will wrap at wordWrapColumn.',
      'Lines will wrap at the minimum of viewport and wordWrapColumn.',
    ],
    tags: ['editor'],
  },
  'workbench.colorTheme': {
    key: 'workbench.colorTheme',
    type: 'string',
    default: 'Catppuccin Mocha',
    description: 'Specifies the color theme.',
    scope: 'user',
    tags: ['workbench', 'theme'],
  },
  'ai.enabled': {
    key: 'ai.enabled',
    type: 'boolean',
    default: true,
    description: 'Enable AI features.',
    scope: 'user',
    tags: ['ai'],
  },
  'ai.ghostText.enabled': {
    key: 'ai.ghostText.enabled',
    type: 'boolean',
    default: true,
    description: 'Enable inline AI completions (ghost text).',
    scope: 'user',
    tags: ['ai', 'editor'],
  },
  'ai.model': {
    key: 'ai.model',
    type: 'enum',
    default: 'google/gemini-3.1-flash-lite-preview',
    description: 'AI model to use for completions and chat.',
    scope: 'user',
    enum: [
      'google/gemini-3.1-flash-lite-preview',
      'openai/gpt-4o-mini',
      'anthropic/claude-3.5-haiku',
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo',
      'claude-3-opus',
      'claude-3-sonnet',
    ],
    tags: ['ai'],
  },
};

// ============================================================================
// SETTING CATEGORIES
// ============================================================================

export const SETTING_CATEGORIES: SettingCategory[] = [
  {
    id: 'editor',
    label: 'Text Editor',
    icon: 'edit',
    order: 1,
    settings: [
      'editor.fontSize',
      'editor.fontFamily',
      'editor.fontLigatures',
      'editor.tabSize',
      'editor.insertSpaces',
      'editor.wordWrap',
      'editor.lineNumbers',
      'editor.minimap.enabled',
      'editor.formatOnSave',
      'editor.autoSave',
    ],
  },
  {
    id: 'workbench',
    label: 'Workbench',
    icon: 'layout',
    order: 2,
    settings: [
      'workbench.colorTheme',
      'workbench.iconTheme',
      'workbench.sideBar.location',
      'workbench.activityBar.location',
    ],
  },
  {
    id: 'terminal',
    label: 'Terminal',
    icon: 'terminal',
    order: 3,
    settings: [
      'terminal.integrated.fontSize',
      'terminal.integrated.fontFamily',
      'terminal.integrated.cursorStyle',
    ],
  },
  {
    id: 'ai',
    label: 'AI Features',
    icon: 'sparkles',
    order: 4,
    settings: [
      'ai.enabled',
      'ai.ghostText.enabled',
      'ai.chat.enabled',
      'ai.agentMode.enabled',
      'ai.model',
    ],
  },
  {
    id: 'git',
    label: 'Source Control',
    icon: 'git-branch',
    order: 5,
    settings: [
      'git.enabled',
      'git.autofetch',
      'git.confirmSync',
    ],
  },
];
