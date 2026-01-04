/**
 * Aethel Engine - Theme Service
 * Complete theme management system with built-in themes and custom theme support
 */

import { EventEmitter } from 'events';

// ============================================================================
// Type Definitions
// ============================================================================

export type ThemeType = 'light' | 'dark';

export interface SyntaxColors {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  variable: string;
  type: string;
  operator: string;
  punctuation: string;
  constant: string;
  class: string;
  parameter: string;
  property: string;
  tag: string;
  attribute: string;
  regex: string;
  escape: string;
  invalid: string;
}

export interface EditorColors {
  background: string;
  foreground: string;
  lineHighlight: string;
  selection: string;
  selectionHighlight: string;
  cursor: string;
  whitespace: string;
  indentGuide: string;
  activeIndentGuide: string;
  matchingBracket: string;
  gutter: string;
  lineNumberForeground: string;
  lineNumberActiveForeground: string;
  rulerForeground: string;
  findMatch: string;
  findMatchHighlight: string;
  wordHighlight: string;
  wordHighlightStrong: string;
}

export interface UIColors {
  background: string;
  foreground: string;
  border: string;
  focusBorder: string;
  shadow: string;
  
  // Panel
  panelBackground: string;
  panelBorder: string;
  panelForeground: string;
  
  // Button
  buttonBackground: string;
  buttonForeground: string;
  buttonHoverBackground: string;
  buttonSecondaryBackground: string;
  buttonSecondaryForeground: string;
  buttonSecondaryHoverBackground: string;
  
  // Input
  inputBackground: string;
  inputForeground: string;
  inputBorder: string;
  inputPlaceholder: string;
  inputActiveBackground: string;
  inputActiveBorder: string;
  
  // List
  listActiveSelectionBackground: string;
  listActiveSelectionForeground: string;
  listHoverBackground: string;
  listHoverForeground: string;
  listInactiveSelectionBackground: string;
  listFocusBackground: string;
  
  // Sidebar
  sideBarBackground: string;
  sideBarForeground: string;
  sideBarBorder: string;
  sideBarSectionHeaderBackground: string;
  sideBarSectionHeaderForeground: string;
  
  // Activity Bar
  activityBarBackground: string;
  activityBarForeground: string;
  activityBarInactiveForeground: string;
  activityBarBorder: string;
  activityBarBadgeBackground: string;
  activityBarBadgeForeground: string;
  
  // Status Bar
  statusBarBackground: string;
  statusBarForeground: string;
  statusBarBorder: string;
  statusBarDebuggingBackground: string;
  statusBarNoFolderBackground: string;
  
  // Tab
  tabActiveBackground: string;
  tabActiveForeground: string;
  tabInactiveBackground: string;
  tabInactiveForeground: string;
  tabBorder: string;
  tabActiveBorder: string;
  tabActiveBorderTop: string;
  
  // Title Bar
  titleBarActiveBackground: string;
  titleBarActiveForeground: string;
  titleBarInactiveBackground: string;
  titleBarInactiveForeground: string;
  titleBarBorder: string;
  
  // Menu
  menuBackground: string;
  menuForeground: string;
  menuBorder: string;
  menuSelectionBackground: string;
  menuSelectionForeground: string;
  menuSeparator: string;
  
  // Scrollbar
  scrollbarSliderBackground: string;
  scrollbarSliderHoverBackground: string;
  scrollbarSliderActiveBackground: string;
  
  // Notification
  notificationBackground: string;
  notificationForeground: string;
  notificationBorder: string;
  
  // Error/Warning/Info
  errorForeground: string;
  errorBackground: string;
  warningForeground: string;
  warningBackground: string;
  infoForeground: string;
  infoBackground: string;
  successForeground: string;
  successBackground: string;
  
  // Links
  linkForeground: string;
  linkActiveForeground: string;
  
  // Badges
  badgeBackground: string;
  badgeForeground: string;
  
  // Progress
  progressBarBackground: string;
}

export interface IconTheme {
  id: string;
  name: string;
  folder: string;
  folderExpanded: string;
  file: string;
  fileExtensions: Record<string, string>;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  type: ThemeType;
  author?: string;
  description?: string;
  colors: {
    editor: EditorColors;
    syntax: SyntaxColors;
    ui: UIColors;
  };
  iconTheme?: IconTheme;
}

export interface ThemeServiceEvents {
  themeChanged: (theme: ThemeDefinition) => void;
  themeAdded: (theme: ThemeDefinition) => void;
  themeRemoved: (themeId: string) => void;
  iconThemeChanged: (iconTheme: IconTheme | null) => void;
}

// ============================================================================
// Built-in Themes
// ============================================================================

const catppuccinMocha: ThemeDefinition = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  type: 'dark',
  author: 'Catppuccin',
  description: 'Soothing pastel theme for the high-spirited',
  colors: {
    editor: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      lineHighlight: '#313244',
      selection: '#45475a',
      selectionHighlight: '#45475a80',
      cursor: '#f5e0dc',
      whitespace: '#6c7086',
      indentGuide: '#45475a',
      activeIndentGuide: '#cdd6f4',
      matchingBracket: '#f9e2af40',
      gutter: '#1e1e2e',
      lineNumberForeground: '#6c7086',
      lineNumberActiveForeground: '#cdd6f4',
      rulerForeground: '#45475a',
      findMatch: '#f9e2af40',
      findMatchHighlight: '#f9e2af20',
      wordHighlight: '#cba6f720',
      wordHighlightStrong: '#cba6f740',
    },
    syntax: {
      keyword: '#cba6f7',
      string: '#a6e3a1',
      number: '#fab387',
      comment: '#6c7086',
      function: '#89b4fa',
      variable: '#cdd6f4',
      type: '#f9e2af',
      operator: '#89dceb',
      punctuation: '#9399b2',
      constant: '#fab387',
      class: '#f9e2af',
      parameter: '#eba0ac',
      property: '#89b4fa',
      tag: '#cba6f7',
      attribute: '#f9e2af',
      regex: '#f5c2e7',
      escape: '#f2cdcd',
      invalid: '#f38ba8',
    },
    ui: {
      background: '#1e1e2e',
      foreground: '#cdd6f4',
      border: '#45475a',
      focusBorder: '#89b4fa',
      shadow: '#11111b80',
      panelBackground: '#181825',
      panelBorder: '#45475a',
      panelForeground: '#cdd6f4',
      buttonBackground: '#89b4fa',
      buttonForeground: '#1e1e2e',
      buttonHoverBackground: '#b4befe',
      buttonSecondaryBackground: '#45475a',
      buttonSecondaryForeground: '#cdd6f4',
      buttonSecondaryHoverBackground: '#585b70',
      inputBackground: '#313244',
      inputForeground: '#cdd6f4',
      inputBorder: '#45475a',
      inputPlaceholder: '#6c7086',
      inputActiveBackground: '#45475a',
      inputActiveBorder: '#89b4fa',
      listActiveSelectionBackground: '#45475a',
      listActiveSelectionForeground: '#cdd6f4',
      listHoverBackground: '#313244',
      listHoverForeground: '#cdd6f4',
      listInactiveSelectionBackground: '#313244',
      listFocusBackground: '#45475a',
      sideBarBackground: '#181825',
      sideBarForeground: '#cdd6f4',
      sideBarBorder: '#45475a',
      sideBarSectionHeaderBackground: '#1e1e2e',
      sideBarSectionHeaderForeground: '#cdd6f4',
      activityBarBackground: '#11111b',
      activityBarForeground: '#cdd6f4',
      activityBarInactiveForeground: '#6c7086',
      activityBarBorder: '#45475a',
      activityBarBadgeBackground: '#89b4fa',
      activityBarBadgeForeground: '#1e1e2e',
      statusBarBackground: '#11111b',
      statusBarForeground: '#cdd6f4',
      statusBarBorder: '#45475a',
      statusBarDebuggingBackground: '#fab387',
      statusBarNoFolderBackground: '#181825',
      tabActiveBackground: '#1e1e2e',
      tabActiveForeground: '#cdd6f4',
      tabInactiveBackground: '#181825',
      tabInactiveForeground: '#6c7086',
      tabBorder: '#45475a',
      tabActiveBorder: '#45475a',
      tabActiveBorderTop: '#89b4fa',
      titleBarActiveBackground: '#11111b',
      titleBarActiveForeground: '#cdd6f4',
      titleBarInactiveBackground: '#181825',
      titleBarInactiveForeground: '#6c7086',
      titleBarBorder: '#45475a',
      menuBackground: '#1e1e2e',
      menuForeground: '#cdd6f4',
      menuBorder: '#45475a',
      menuSelectionBackground: '#45475a',
      menuSelectionForeground: '#cdd6f4',
      menuSeparator: '#45475a',
      scrollbarSliderBackground: '#45475a80',
      scrollbarSliderHoverBackground: '#585b70',
      scrollbarSliderActiveBackground: '#6c7086',
      notificationBackground: '#1e1e2e',
      notificationForeground: '#cdd6f4',
      notificationBorder: '#45475a',
      errorForeground: '#f38ba8',
      errorBackground: '#f38ba820',
      warningForeground: '#fab387',
      warningBackground: '#fab38720',
      infoForeground: '#89b4fa',
      infoBackground: '#89b4fa20',
      successForeground: '#a6e3a1',
      successBackground: '#a6e3a120',
      linkForeground: '#89b4fa',
      linkActiveForeground: '#b4befe',
      badgeBackground: '#89b4fa',
      badgeForeground: '#1e1e2e',
      progressBarBackground: '#89b4fa',
    },
  },
};

const catppuccinLatte: ThemeDefinition = {
  id: 'catppuccin-latte',
  name: 'Catppuccin Latte',
  type: 'light',
  author: 'Catppuccin',
  description: 'Soothing pastel theme - Light variant',
  colors: {
    editor: {
      background: '#eff1f5',
      foreground: '#4c4f69',
      lineHighlight: '#dce0e8',
      selection: '#acb0be',
      selectionHighlight: '#acb0be80',
      cursor: '#dc8a78',
      whitespace: '#9ca0b0',
      indentGuide: '#bcc0cc',
      activeIndentGuide: '#4c4f69',
      matchingBracket: '#df8e1d40',
      gutter: '#eff1f5',
      lineNumberForeground: '#9ca0b0',
      lineNumberActiveForeground: '#4c4f69',
      rulerForeground: '#bcc0cc',
      findMatch: '#df8e1d40',
      findMatchHighlight: '#df8e1d20',
      wordHighlight: '#8839ef20',
      wordHighlightStrong: '#8839ef40',
    },
    syntax: {
      keyword: '#8839ef',
      string: '#40a02b',
      number: '#fe640b',
      comment: '#9ca0b0',
      function: '#1e66f5',
      variable: '#4c4f69',
      type: '#df8e1d',
      operator: '#04a5e5',
      punctuation: '#6c6f85',
      constant: '#fe640b',
      class: '#df8e1d',
      parameter: '#e64553',
      property: '#1e66f5',
      tag: '#8839ef',
      attribute: '#df8e1d',
      regex: '#ea76cb',
      escape: '#dd7878',
      invalid: '#d20f39',
    },
    ui: {
      background: '#eff1f5',
      foreground: '#4c4f69',
      border: '#bcc0cc',
      focusBorder: '#1e66f5',
      shadow: '#9ca0b080',
      panelBackground: '#e6e9ef',
      panelBorder: '#bcc0cc',
      panelForeground: '#4c4f69',
      buttonBackground: '#1e66f5',
      buttonForeground: '#eff1f5',
      buttonHoverBackground: '#7287fd',
      buttonSecondaryBackground: '#bcc0cc',
      buttonSecondaryForeground: '#4c4f69',
      buttonSecondaryHoverBackground: '#acb0be',
      inputBackground: '#dce0e8',
      inputForeground: '#4c4f69',
      inputBorder: '#bcc0cc',
      inputPlaceholder: '#9ca0b0',
      inputActiveBackground: '#ccd0da',
      inputActiveBorder: '#1e66f5',
      listActiveSelectionBackground: '#bcc0cc',
      listActiveSelectionForeground: '#4c4f69',
      listHoverBackground: '#dce0e8',
      listHoverForeground: '#4c4f69',
      listInactiveSelectionBackground: '#dce0e8',
      listFocusBackground: '#bcc0cc',
      sideBarBackground: '#e6e9ef',
      sideBarForeground: '#4c4f69',
      sideBarBorder: '#bcc0cc',
      sideBarSectionHeaderBackground: '#eff1f5',
      sideBarSectionHeaderForeground: '#4c4f69',
      activityBarBackground: '#dce0e8',
      activityBarForeground: '#4c4f69',
      activityBarInactiveForeground: '#9ca0b0',
      activityBarBorder: '#bcc0cc',
      activityBarBadgeBackground: '#1e66f5',
      activityBarBadgeForeground: '#eff1f5',
      statusBarBackground: '#dce0e8',
      statusBarForeground: '#4c4f69',
      statusBarBorder: '#bcc0cc',
      statusBarDebuggingBackground: '#fe640b',
      statusBarNoFolderBackground: '#e6e9ef',
      tabActiveBackground: '#eff1f5',
      tabActiveForeground: '#4c4f69',
      tabInactiveBackground: '#e6e9ef',
      tabInactiveForeground: '#9ca0b0',
      tabBorder: '#bcc0cc',
      tabActiveBorder: '#bcc0cc',
      tabActiveBorderTop: '#1e66f5',
      titleBarActiveBackground: '#dce0e8',
      titleBarActiveForeground: '#4c4f69',
      titleBarInactiveBackground: '#e6e9ef',
      titleBarInactiveForeground: '#9ca0b0',
      titleBarBorder: '#bcc0cc',
      menuBackground: '#eff1f5',
      menuForeground: '#4c4f69',
      menuBorder: '#bcc0cc',
      menuSelectionBackground: '#bcc0cc',
      menuSelectionForeground: '#4c4f69',
      menuSeparator: '#bcc0cc',
      scrollbarSliderBackground: '#bcc0cc80',
      scrollbarSliderHoverBackground: '#acb0be',
      scrollbarSliderActiveBackground: '#9ca0b0',
      notificationBackground: '#eff1f5',
      notificationForeground: '#4c4f69',
      notificationBorder: '#bcc0cc',
      errorForeground: '#d20f39',
      errorBackground: '#d20f3920',
      warningForeground: '#fe640b',
      warningBackground: '#fe640b20',
      infoForeground: '#1e66f5',
      infoBackground: '#1e66f520',
      successForeground: '#40a02b',
      successBackground: '#40a02b20',
      linkForeground: '#1e66f5',
      linkActiveForeground: '#7287fd',
      badgeBackground: '#1e66f5',
      badgeForeground: '#eff1f5',
      progressBarBackground: '#1e66f5',
    },
  },
};

const oneDarkPro: ThemeDefinition = {
  id: 'one-dark-pro',
  name: 'One Dark Pro',
  type: 'dark',
  author: 'Binaryify',
  description: 'Atom One Dark theme for VS Code',
  colors: {
    editor: {
      background: '#282c34',
      foreground: '#abb2bf',
      lineHighlight: '#2c313c',
      selection: '#3e4451',
      selectionHighlight: '#3e445180',
      cursor: '#528bff',
      whitespace: '#3b4048',
      indentGuide: '#3b4048',
      activeIndentGuide: '#c8c8c859',
      matchingBracket: '#515a6b',
      gutter: '#282c34',
      lineNumberForeground: '#495162',
      lineNumberActiveForeground: '#abb2bf',
      rulerForeground: '#abb2bf26',
      findMatch: '#d19a66',
      findMatchHighlight: '#d19a6633',
      wordHighlight: '#d2e0ff2f',
      wordHighlightStrong: '#d2e0ff4d',
    },
    syntax: {
      keyword: '#c678dd',
      string: '#98c379',
      number: '#d19a66',
      comment: '#5c6370',
      function: '#61afef',
      variable: '#e06c75',
      type: '#e5c07b',
      operator: '#56b6c2',
      punctuation: '#abb2bf',
      constant: '#d19a66',
      class: '#e5c07b',
      parameter: '#e06c75',
      property: '#e06c75',
      tag: '#e06c75',
      attribute: '#d19a66',
      regex: '#56b6c2',
      escape: '#56b6c2',
      invalid: '#f44747',
    },
    ui: {
      background: '#282c34',
      foreground: '#abb2bf',
      border: '#181a1f',
      focusBorder: '#528bff',
      shadow: '#00000080',
      panelBackground: '#21252b',
      panelBorder: '#181a1f',
      panelForeground: '#abb2bf',
      buttonBackground: '#404754',
      buttonForeground: '#abb2bf',
      buttonHoverBackground: '#4d5566',
      buttonSecondaryBackground: '#3a3f4b',
      buttonSecondaryForeground: '#abb2bf',
      buttonSecondaryHoverBackground: '#4d5566',
      inputBackground: '#1d1f23',
      inputForeground: '#abb2bf',
      inputBorder: '#181a1f',
      inputPlaceholder: '#5c6370',
      inputActiveBackground: '#1d1f23',
      inputActiveBorder: '#528bff',
      listActiveSelectionBackground: '#2c313a',
      listActiveSelectionForeground: '#abb2bf',
      listHoverBackground: '#2c313a',
      listHoverForeground: '#abb2bf',
      listInactiveSelectionBackground: '#2c313a',
      listFocusBackground: '#2c313a',
      sideBarBackground: '#21252b',
      sideBarForeground: '#abb2bf',
      sideBarBorder: '#181a1f',
      sideBarSectionHeaderBackground: '#282c34',
      sideBarSectionHeaderForeground: '#abb2bf',
      activityBarBackground: '#282c34',
      activityBarForeground: '#abb2bf',
      activityBarInactiveForeground: '#5c6370',
      activityBarBorder: '#181a1f',
      activityBarBadgeBackground: '#528bff',
      activityBarBadgeForeground: '#ffffff',
      statusBarBackground: '#21252b',
      statusBarForeground: '#9da5b4',
      statusBarBorder: '#181a1f',
      statusBarDebuggingBackground: '#d19a66',
      statusBarNoFolderBackground: '#21252b',
      tabActiveBackground: '#282c34',
      tabActiveForeground: '#abb2bf',
      tabInactiveBackground: '#21252b',
      tabInactiveForeground: '#5c6370',
      tabBorder: '#181a1f',
      tabActiveBorder: '#181a1f',
      tabActiveBorderTop: '#528bff',
      titleBarActiveBackground: '#282c34',
      titleBarActiveForeground: '#9da5b4',
      titleBarInactiveBackground: '#21252b',
      titleBarInactiveForeground: '#5c6370',
      titleBarBorder: '#181a1f',
      menuBackground: '#21252b',
      menuForeground: '#abb2bf',
      menuBorder: '#181a1f',
      menuSelectionBackground: '#2c313a',
      menuSelectionForeground: '#abb2bf',
      menuSeparator: '#343a45',
      scrollbarSliderBackground: '#4e566680',
      scrollbarSliderHoverBackground: '#5a637580',
      scrollbarSliderActiveBackground: '#747d9180',
      notificationBackground: '#21252b',
      notificationForeground: '#abb2bf',
      notificationBorder: '#181a1f',
      errorForeground: '#f44747',
      errorBackground: '#f4474720',
      warningForeground: '#d19a66',
      warningBackground: '#d19a6620',
      infoForeground: '#61afef',
      infoBackground: '#61afef20',
      successForeground: '#98c379',
      successBackground: '#98c37920',
      linkForeground: '#61afef',
      linkActiveForeground: '#528bff',
      badgeBackground: '#528bff',
      badgeForeground: '#ffffff',
      progressBarBackground: '#528bff',
    },
  },
};

const githubDark: ThemeDefinition = {
  id: 'github-dark',
  name: 'GitHub Dark',
  type: 'dark',
  author: 'GitHub',
  description: 'GitHub Dark Theme',
  colors: {
    editor: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      lineHighlight: '#161b22',
      selection: '#3392ff44',
      selectionHighlight: '#3392ff22',
      cursor: '#58a6ff',
      whitespace: '#484f58',
      indentGuide: '#21262d',
      activeIndentGuide: '#c9d1d9',
      matchingBracket: '#58a6ff40',
      gutter: '#0d1117',
      lineNumberForeground: '#484f58',
      lineNumberActiveForeground: '#c9d1d9',
      rulerForeground: '#21262d',
      findMatch: '#9e6a03',
      findMatchHighlight: '#f2cc6050',
      wordHighlight: '#58a6ff30',
      wordHighlightStrong: '#58a6ff50',
    },
    syntax: {
      keyword: '#ff7b72',
      string: '#a5d6ff',
      number: '#79c0ff',
      comment: '#8b949e',
      function: '#d2a8ff',
      variable: '#ffa657',
      type: '#79c0ff',
      operator: '#ff7b72',
      punctuation: '#c9d1d9',
      constant: '#79c0ff',
      class: '#ffa657',
      parameter: '#ffa657',
      property: '#79c0ff',
      tag: '#7ee787',
      attribute: '#79c0ff',
      regex: '#7ee787',
      escape: '#7ee787',
      invalid: '#f85149',
    },
    ui: {
      background: '#0d1117',
      foreground: '#c9d1d9',
      border: '#30363d',
      focusBorder: '#58a6ff',
      shadow: '#010409',
      panelBackground: '#161b22',
      panelBorder: '#30363d',
      panelForeground: '#c9d1d9',
      buttonBackground: '#238636',
      buttonForeground: '#ffffff',
      buttonHoverBackground: '#2ea043',
      buttonSecondaryBackground: '#21262d',
      buttonSecondaryForeground: '#c9d1d9',
      buttonSecondaryHoverBackground: '#30363d',
      inputBackground: '#0d1117',
      inputForeground: '#c9d1d9',
      inputBorder: '#30363d',
      inputPlaceholder: '#484f58',
      inputActiveBackground: '#0d1117',
      inputActiveBorder: '#58a6ff',
      listActiveSelectionBackground: '#6e768166',
      listActiveSelectionForeground: '#c9d1d9',
      listHoverBackground: '#6e768166',
      listHoverForeground: '#c9d1d9',
      listInactiveSelectionBackground: '#6e768166',
      listFocusBackground: '#388bfd26',
      sideBarBackground: '#010409',
      sideBarForeground: '#c9d1d9',
      sideBarBorder: '#30363d',
      sideBarSectionHeaderBackground: '#0d1117',
      sideBarSectionHeaderForeground: '#c9d1d9',
      activityBarBackground: '#0d1117',
      activityBarForeground: '#c9d1d9',
      activityBarInactiveForeground: '#484f58',
      activityBarBorder: '#30363d',
      activityBarBadgeBackground: '#58a6ff',
      activityBarBadgeForeground: '#ffffff',
      statusBarBackground: '#0d1117',
      statusBarForeground: '#8b949e',
      statusBarBorder: '#30363d',
      statusBarDebuggingBackground: '#f0883e',
      statusBarNoFolderBackground: '#0d1117',
      tabActiveBackground: '#0d1117',
      tabActiveForeground: '#c9d1d9',
      tabInactiveBackground: '#010409',
      tabInactiveForeground: '#8b949e',
      tabBorder: '#30363d',
      tabActiveBorder: '#0d1117',
      tabActiveBorderTop: '#f78166',
      titleBarActiveBackground: '#0d1117',
      titleBarActiveForeground: '#c9d1d9',
      titleBarInactiveBackground: '#010409',
      titleBarInactiveForeground: '#8b949e',
      titleBarBorder: '#30363d',
      menuBackground: '#161b22',
      menuForeground: '#c9d1d9',
      menuBorder: '#30363d',
      menuSelectionBackground: '#6e768166',
      menuSelectionForeground: '#c9d1d9',
      menuSeparator: '#30363d',
      scrollbarSliderBackground: '#6e768166',
      scrollbarSliderHoverBackground: '#6e7681',
      scrollbarSliderActiveBackground: '#8b949e',
      notificationBackground: '#161b22',
      notificationForeground: '#c9d1d9',
      notificationBorder: '#30363d',
      errorForeground: '#f85149',
      errorBackground: '#f8514920',
      warningForeground: '#f0883e',
      warningBackground: '#f0883e20',
      infoForeground: '#58a6ff',
      infoBackground: '#58a6ff20',
      successForeground: '#3fb950',
      successBackground: '#3fb95020',
      linkForeground: '#58a6ff',
      linkActiveForeground: '#79c0ff',
      badgeBackground: '#58a6ff',
      badgeForeground: '#ffffff',
      progressBarBackground: '#58a6ff',
    },
  },
};

const dracula: ThemeDefinition = {
  id: 'dracula',
  name: 'Dracula',
  type: 'dark',
  author: 'Dracula Theme',
  description: 'A dark theme for Visual Studio Code',
  colors: {
    editor: {
      background: '#282a36',
      foreground: '#f8f8f2',
      lineHighlight: '#44475a',
      selection: '#44475a',
      selectionHighlight: '#44475a80',
      cursor: '#f8f8f2',
      whitespace: '#6272a4',
      indentGuide: '#44475a',
      activeIndentGuide: '#f8f8f2',
      matchingBracket: '#50fa7b50',
      gutter: '#282a36',
      lineNumberForeground: '#6272a4',
      lineNumberActiveForeground: '#f8f8f2',
      rulerForeground: '#44475a',
      findMatch: '#ffb86c80',
      findMatchHighlight: '#ffb86c40',
      wordHighlight: '#8be9fd30',
      wordHighlightStrong: '#8be9fd50',
    },
    syntax: {
      keyword: '#ff79c6',
      string: '#f1fa8c',
      number: '#bd93f9',
      comment: '#6272a4',
      function: '#50fa7b',
      variable: '#f8f8f2',
      type: '#8be9fd',
      operator: '#ff79c6',
      punctuation: '#f8f8f2',
      constant: '#bd93f9',
      class: '#8be9fd',
      parameter: '#ffb86c',
      property: '#66d9ef',
      tag: '#ff79c6',
      attribute: '#50fa7b',
      regex: '#f1fa8c',
      escape: '#ff79c6',
      invalid: '#ff5555',
    },
    ui: {
      background: '#282a36',
      foreground: '#f8f8f2',
      border: '#44475a',
      focusBorder: '#bd93f9',
      shadow: '#191a21',
      panelBackground: '#21222c',
      panelBorder: '#44475a',
      panelForeground: '#f8f8f2',
      buttonBackground: '#44475a',
      buttonForeground: '#f8f8f2',
      buttonHoverBackground: '#6272a4',
      buttonSecondaryBackground: '#44475a',
      buttonSecondaryForeground: '#f8f8f2',
      buttonSecondaryHoverBackground: '#6272a4',
      inputBackground: '#21222c',
      inputForeground: '#f8f8f2',
      inputBorder: '#44475a',
      inputPlaceholder: '#6272a4',
      inputActiveBackground: '#21222c',
      inputActiveBorder: '#bd93f9',
      listActiveSelectionBackground: '#44475a',
      listActiveSelectionForeground: '#f8f8f2',
      listHoverBackground: '#44475a',
      listHoverForeground: '#f8f8f2',
      listInactiveSelectionBackground: '#44475a',
      listFocusBackground: '#44475a',
      sideBarBackground: '#21222c',
      sideBarForeground: '#f8f8f2',
      sideBarBorder: '#44475a',
      sideBarSectionHeaderBackground: '#282a36',
      sideBarSectionHeaderForeground: '#f8f8f2',
      activityBarBackground: '#282a36',
      activityBarForeground: '#f8f8f2',
      activityBarInactiveForeground: '#6272a4',
      activityBarBorder: '#44475a',
      activityBarBadgeBackground: '#ff79c6',
      activityBarBadgeForeground: '#f8f8f2',
      statusBarBackground: '#191a21',
      statusBarForeground: '#f8f8f2',
      statusBarBorder: '#44475a',
      statusBarDebuggingBackground: '#ffb86c',
      statusBarNoFolderBackground: '#191a21',
      tabActiveBackground: '#282a36',
      tabActiveForeground: '#f8f8f2',
      tabInactiveBackground: '#21222c',
      tabInactiveForeground: '#6272a4',
      tabBorder: '#191a21',
      tabActiveBorder: '#191a21',
      tabActiveBorderTop: '#ff79c6',
      titleBarActiveBackground: '#21222c',
      titleBarActiveForeground: '#f8f8f2',
      titleBarInactiveBackground: '#191a21',
      titleBarInactiveForeground: '#6272a4',
      titleBarBorder: '#191a21',
      menuBackground: '#21222c',
      menuForeground: '#f8f8f2',
      menuBorder: '#44475a',
      menuSelectionBackground: '#44475a',
      menuSelectionForeground: '#f8f8f2',
      menuSeparator: '#44475a',
      scrollbarSliderBackground: '#44475a80',
      scrollbarSliderHoverBackground: '#6272a4',
      scrollbarSliderActiveBackground: '#bd93f9',
      notificationBackground: '#282a36',
      notificationForeground: '#f8f8f2',
      notificationBorder: '#44475a',
      errorForeground: '#ff5555',
      errorBackground: '#ff555520',
      warningForeground: '#ffb86c',
      warningBackground: '#ffb86c20',
      infoForeground: '#8be9fd',
      infoBackground: '#8be9fd20',
      successForeground: '#50fa7b',
      successBackground: '#50fa7b20',
      linkForeground: '#8be9fd',
      linkActiveForeground: '#bd93f9',
      badgeBackground: '#ff79c6',
      badgeForeground: '#f8f8f2',
      progressBarBackground: '#ff79c6',
    },
  },
};

// ============================================================================
// Theme Service Implementation
// ============================================================================

const STORAGE_KEY_THEME = 'aethel-engine-theme';
const STORAGE_KEY_ICON_THEME = 'aethel-engine-icon-theme';

export class ThemeService extends EventEmitter {
  private themes: Map<string, ThemeDefinition> = new Map();
  private currentTheme: ThemeDefinition;
  private currentIconTheme: IconTheme | null = null;
  private initialized: boolean = false;

  constructor() {
    super();
    this.registerBuiltInThemes();
    this.currentTheme = this.themes.get('catppuccin-mocha')!;
  }

  /**
   * Initialize the theme service
   */
  public initialize(): void {
    if (this.initialized) return;

    const savedThemeId = this.loadPreference(STORAGE_KEY_THEME);
    if (savedThemeId && this.themes.has(savedThemeId)) {
      this.currentTheme = this.themes.get(savedThemeId)!;
    }

    this.applyTheme(this.currentTheme);
    this.initialized = true;
  }

  /**
   * Register all built-in themes
   */
  private registerBuiltInThemes(): void {
    this.themes.set(catppuccinMocha.id, catppuccinMocha);
    this.themes.set(catppuccinLatte.id, catppuccinLatte);
    this.themes.set(oneDarkPro.id, oneDarkPro);
    this.themes.set(githubDark.id, githubDark);
    this.themes.set(dracula.id, dracula);
  }

  /**
   * Get all available themes
   */
  public getThemes(): ThemeDefinition[] {
    return Array.from(this.themes.values());
  }

  /**
   * Get themes filtered by type
   */
  public getThemesByType(type: ThemeType): ThemeDefinition[] {
    return this.getThemes().filter(theme => theme.type === type);
  }

  /**
   * Get a theme by ID
   */
  public getTheme(id: string): ThemeDefinition | undefined {
    return this.themes.get(id);
  }

  /**
   * Get the current active theme
   */
  public getCurrentTheme(): ThemeDefinition {
    return this.currentTheme;
  }

  /**
   * Set the active theme
   */
  public setTheme(themeId: string): boolean {
    const theme = this.themes.get(themeId);
    if (!theme) {
      console.warn(`Theme "${themeId}" not found`);
      return false;
    }

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.savePreference(STORAGE_KEY_THEME, themeId);
    this.emit('themeChanged', theme);
    return true;
  }

  /**
   * Register a custom theme
   */
  public registerTheme(theme: ThemeDefinition): void {
    if (this.themes.has(theme.id)) {
      console.warn(`Theme "${theme.id}" already exists, overwriting`);
    }
    this.themes.set(theme.id, theme);
    this.emit('themeAdded', theme);
  }

  /**
   * Remove a custom theme
   */
  public removeTheme(themeId: string): boolean {
    const builtInIds = ['catppuccin-mocha', 'catppuccin-latte', 'one-dark-pro', 'github-dark', 'dracula'];
    if (builtInIds.includes(themeId)) {
      console.warn('Cannot remove built-in themes');
      return false;
    }

    if (this.themes.delete(themeId)) {
      if (this.currentTheme.id === themeId) {
        this.setTheme('catppuccin-mocha');
      }
      this.emit('themeRemoved', themeId);
      return true;
    }
    return false;
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: ThemeDefinition): void {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    const { editor, syntax, ui } = theme.colors;

    // Apply editor colors
    root.style.setProperty('--editor-background', editor.background);
    root.style.setProperty('--editor-foreground', editor.foreground);
    root.style.setProperty('--editor-line-highlight', editor.lineHighlight);
    root.style.setProperty('--editor-selection', editor.selection);
    root.style.setProperty('--editor-selection-highlight', editor.selectionHighlight);
    root.style.setProperty('--editor-cursor', editor.cursor);
    root.style.setProperty('--editor-whitespace', editor.whitespace);
    root.style.setProperty('--editor-indent-guide', editor.indentGuide);
    root.style.setProperty('--editor-active-indent-guide', editor.activeIndentGuide);
    root.style.setProperty('--editor-matching-bracket', editor.matchingBracket);
    root.style.setProperty('--editor-gutter', editor.gutter);
    root.style.setProperty('--editor-line-number-foreground', editor.lineNumberForeground);
    root.style.setProperty('--editor-line-number-active-foreground', editor.lineNumberActiveForeground);
    root.style.setProperty('--editor-ruler-foreground', editor.rulerForeground);
    root.style.setProperty('--editor-find-match', editor.findMatch);
    root.style.setProperty('--editor-find-match-highlight', editor.findMatchHighlight);
    root.style.setProperty('--editor-word-highlight', editor.wordHighlight);
    root.style.setProperty('--editor-word-highlight-strong', editor.wordHighlightStrong);

    // Apply syntax colors
    root.style.setProperty('--syntax-keyword', syntax.keyword);
    root.style.setProperty('--syntax-string', syntax.string);
    root.style.setProperty('--syntax-number', syntax.number);
    root.style.setProperty('--syntax-comment', syntax.comment);
    root.style.setProperty('--syntax-function', syntax.function);
    root.style.setProperty('--syntax-variable', syntax.variable);
    root.style.setProperty('--syntax-type', syntax.type);
    root.style.setProperty('--syntax-operator', syntax.operator);
    root.style.setProperty('--syntax-punctuation', syntax.punctuation);
    root.style.setProperty('--syntax-constant', syntax.constant);
    root.style.setProperty('--syntax-class', syntax.class);
    root.style.setProperty('--syntax-parameter', syntax.parameter);
    root.style.setProperty('--syntax-property', syntax.property);
    root.style.setProperty('--syntax-tag', syntax.tag);
    root.style.setProperty('--syntax-attribute', syntax.attribute);
    root.style.setProperty('--syntax-regex', syntax.regex);
    root.style.setProperty('--syntax-escape', syntax.escape);
    root.style.setProperty('--syntax-invalid', syntax.invalid);

    // Apply UI colors
    root.style.setProperty('--ui-background', ui.background);
    root.style.setProperty('--ui-foreground', ui.foreground);
    root.style.setProperty('--ui-border', ui.border);
    root.style.setProperty('--ui-focus-border', ui.focusBorder);
    root.style.setProperty('--ui-shadow', ui.shadow);

    // Panel
    root.style.setProperty('--panel-background', ui.panelBackground);
    root.style.setProperty('--panel-border', ui.panelBorder);
    root.style.setProperty('--panel-foreground', ui.panelForeground);

    // Button
    root.style.setProperty('--button-background', ui.buttonBackground);
    root.style.setProperty('--button-foreground', ui.buttonForeground);
    root.style.setProperty('--button-hover-background', ui.buttonHoverBackground);
    root.style.setProperty('--button-secondary-background', ui.buttonSecondaryBackground);
    root.style.setProperty('--button-secondary-foreground', ui.buttonSecondaryForeground);
    root.style.setProperty('--button-secondary-hover-background', ui.buttonSecondaryHoverBackground);

    // Input
    root.style.setProperty('--input-background', ui.inputBackground);
    root.style.setProperty('--input-foreground', ui.inputForeground);
    root.style.setProperty('--input-border', ui.inputBorder);
    root.style.setProperty('--input-placeholder', ui.inputPlaceholder);
    root.style.setProperty('--input-active-background', ui.inputActiveBackground);
    root.style.setProperty('--input-active-border', ui.inputActiveBorder);

    // List
    root.style.setProperty('--list-active-selection-background', ui.listActiveSelectionBackground);
    root.style.setProperty('--list-active-selection-foreground', ui.listActiveSelectionForeground);
    root.style.setProperty('--list-hover-background', ui.listHoverBackground);
    root.style.setProperty('--list-hover-foreground', ui.listHoverForeground);
    root.style.setProperty('--list-inactive-selection-background', ui.listInactiveSelectionBackground);
    root.style.setProperty('--list-focus-background', ui.listFocusBackground);

    // Sidebar
    root.style.setProperty('--sidebar-background', ui.sideBarBackground);
    root.style.setProperty('--sidebar-foreground', ui.sideBarForeground);
    root.style.setProperty('--sidebar-border', ui.sideBarBorder);
    root.style.setProperty('--sidebar-section-header-background', ui.sideBarSectionHeaderBackground);
    root.style.setProperty('--sidebar-section-header-foreground', ui.sideBarSectionHeaderForeground);

    // Activity Bar
    root.style.setProperty('--activity-bar-background', ui.activityBarBackground);
    root.style.setProperty('--activity-bar-foreground', ui.activityBarForeground);
    root.style.setProperty('--activity-bar-inactive-foreground', ui.activityBarInactiveForeground);
    root.style.setProperty('--activity-bar-border', ui.activityBarBorder);
    root.style.setProperty('--activity-bar-badge-background', ui.activityBarBadgeBackground);
    root.style.setProperty('--activity-bar-badge-foreground', ui.activityBarBadgeForeground);

    // Status Bar
    root.style.setProperty('--status-bar-background', ui.statusBarBackground);
    root.style.setProperty('--status-bar-foreground', ui.statusBarForeground);
    root.style.setProperty('--status-bar-border', ui.statusBarBorder);
    root.style.setProperty('--status-bar-debugging-background', ui.statusBarDebuggingBackground);
    root.style.setProperty('--status-bar-no-folder-background', ui.statusBarNoFolderBackground);

    // Tab
    root.style.setProperty('--tab-active-background', ui.tabActiveBackground);
    root.style.setProperty('--tab-active-foreground', ui.tabActiveForeground);
    root.style.setProperty('--tab-inactive-background', ui.tabInactiveBackground);
    root.style.setProperty('--tab-inactive-foreground', ui.tabInactiveForeground);
    root.style.setProperty('--tab-border', ui.tabBorder);
    root.style.setProperty('--tab-active-border', ui.tabActiveBorder);
    root.style.setProperty('--tab-active-border-top', ui.tabActiveBorderTop);

    // Title Bar
    root.style.setProperty('--title-bar-active-background', ui.titleBarActiveBackground);
    root.style.setProperty('--title-bar-active-foreground', ui.titleBarActiveForeground);
    root.style.setProperty('--title-bar-inactive-background', ui.titleBarInactiveBackground);
    root.style.setProperty('--title-bar-inactive-foreground', ui.titleBarInactiveForeground);
    root.style.setProperty('--title-bar-border', ui.titleBarBorder);

    // Menu
    root.style.setProperty('--menu-background', ui.menuBackground);
    root.style.setProperty('--menu-foreground', ui.menuForeground);
    root.style.setProperty('--menu-border', ui.menuBorder);
    root.style.setProperty('--menu-selection-background', ui.menuSelectionBackground);
    root.style.setProperty('--menu-selection-foreground', ui.menuSelectionForeground);
    root.style.setProperty('--menu-separator', ui.menuSeparator);

    // Scrollbar
    root.style.setProperty('--scrollbar-slider-background', ui.scrollbarSliderBackground);
    root.style.setProperty('--scrollbar-slider-hover-background', ui.scrollbarSliderHoverBackground);
    root.style.setProperty('--scrollbar-slider-active-background', ui.scrollbarSliderActiveBackground);

    // Notification
    root.style.setProperty('--notification-background', ui.notificationBackground);
    root.style.setProperty('--notification-foreground', ui.notificationForeground);
    root.style.setProperty('--notification-border', ui.notificationBorder);

    // Semantic colors
    root.style.setProperty('--error-foreground', ui.errorForeground);
    root.style.setProperty('--error-background', ui.errorBackground);
    root.style.setProperty('--warning-foreground', ui.warningForeground);
    root.style.setProperty('--warning-background', ui.warningBackground);
    root.style.setProperty('--info-foreground', ui.infoForeground);
    root.style.setProperty('--info-background', ui.infoBackground);
    root.style.setProperty('--success-foreground', ui.successForeground);
    root.style.setProperty('--success-background', ui.successBackground);

    // Links
    root.style.setProperty('--link-foreground', ui.linkForeground);
    root.style.setProperty('--link-active-foreground', ui.linkActiveForeground);

    // Badge
    root.style.setProperty('--badge-background', ui.badgeBackground);
    root.style.setProperty('--badge-foreground', ui.badgeForeground);

    // Progress
    root.style.setProperty('--progress-bar-background', ui.progressBarBackground);

    // Set theme type attribute
    root.setAttribute('data-theme', theme.id);
    root.setAttribute('data-theme-type', theme.type);
  }

  /**
   * Set icon theme
   */
  public setIconTheme(iconTheme: IconTheme | null): void {
    this.currentIconTheme = iconTheme;
    if (iconTheme) {
      this.savePreference(STORAGE_KEY_ICON_THEME, iconTheme.id);
    } else {
      this.removePreference(STORAGE_KEY_ICON_THEME);
    }
    this.emit('iconThemeChanged', iconTheme);
  }

  /**
   * Get current icon theme
   */
  public getIconTheme(): IconTheme | null {
    return this.currentIconTheme;
  }

  /**
   * Get color value from current theme
   */
  public getColor(path: string): string | undefined {
    const parts = path.split('.');
    let value: unknown = this.currentTheme.colors;

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Check if current theme is dark
   */
  public isDarkTheme(): boolean {
    return this.currentTheme.type === 'dark';
  }

  /**
   * Toggle between light and dark theme
   */
  public toggleThemeType(): void {
    const currentType = this.currentTheme.type;
    const targetType: ThemeType = currentType === 'dark' ? 'light' : 'dark';
    const themesOfType = this.getThemesByType(targetType);

    if (themesOfType.length > 0) {
      this.setTheme(themesOfType[0].id);
    }
  }

  /**
   * Export theme as JSON
   */
  public exportTheme(themeId: string): string | null {
    const theme = this.themes.get(themeId);
    if (!theme) return null;
    return JSON.stringify(theme, null, 2);
  }

  /**
   * Import theme from JSON
   */
  public importTheme(json: string): ThemeDefinition | null {
    try {
      const theme = JSON.parse(json) as ThemeDefinition;
      if (!this.validateTheme(theme)) {
        console.error('Invalid theme format');
        return null;
      }
      this.registerTheme(theme);
      return theme;
    } catch (error) {
      console.error('Failed to parse theme JSON:', error);
      return null;
    }
  }

  /**
   * Validate theme structure
   */
  private validateTheme(theme: unknown): theme is ThemeDefinition {
    if (!theme || typeof theme !== 'object') return false;
    const t = theme as Record<string, unknown>;
    
    return (
      typeof t.id === 'string' &&
      typeof t.name === 'string' &&
      (t.type === 'light' || t.type === 'dark') &&
      typeof t.colors === 'object' &&
      t.colors !== null
    );
  }

  /**
   * Save preference to localStorage
   */
  private savePreference(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        console.warn('Failed to save preference:', error);
      }
    }
  }

  /**
   * Load preference from localStorage
   */
  private loadPreference(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.warn('Failed to load preference:', error);
      }
    }
    return null;
  }

  /**
   * Remove preference from localStorage
   */
  private removePreference(key: string): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn('Failed to remove preference:', error);
      }
    }
  }

  /**
   * Dispose the service
   */
  public dispose(): void {
    this.removeAllListeners();
    this.themes.clear();
    this.initialized = false;
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const themeService = new ThemeService();

export default themeService;
