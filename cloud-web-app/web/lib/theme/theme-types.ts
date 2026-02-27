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
  panelBackground: string;
  panelBorder: string;
  panelForeground: string;
  buttonBackground: string;
  buttonForeground: string;
  buttonHoverBackground: string;
  buttonSecondaryBackground: string;
  buttonSecondaryForeground: string;
  buttonSecondaryHoverBackground: string;
  inputBackground: string;
  inputForeground: string;
  inputBorder: string;
  inputPlaceholder: string;
  inputActiveBackground: string;
  inputActiveBorder: string;
  listActiveSelectionBackground: string;
  listActiveSelectionForeground: string;
  listHoverBackground: string;
  listHoverForeground: string;
  listInactiveSelectionBackground: string;
  listFocusBackground: string;
  sideBarBackground: string;
  sideBarForeground: string;
  sideBarBorder: string;
  sideBarSectionHeaderBackground: string;
  sideBarSectionHeaderForeground: string;
  activityBarBackground: string;
  activityBarForeground: string;
  activityBarInactiveForeground: string;
  activityBarBorder: string;
  activityBarBadgeBackground: string;
  activityBarBadgeForeground: string;
  statusBarBackground: string;
  statusBarForeground: string;
  statusBarBorder: string;
  statusBarDebuggingBackground: string;
  statusBarNoFolderBackground: string;
  tabActiveBackground: string;
  tabActiveForeground: string;
  tabInactiveBackground: string;
  tabInactiveForeground: string;
  tabBorder: string;
  tabActiveBorder: string;
  tabActiveBorderTop: string;
  titleBarActiveBackground: string;
  titleBarActiveForeground: string;
  titleBarInactiveBackground: string;
  titleBarInactiveForeground: string;
  titleBarBorder: string;
  menuBackground: string;
  menuForeground: string;
  menuBorder: string;
  menuSelectionBackground: string;
  menuSelectionForeground: string;
  menuSeparator: string;
  scrollbarSliderBackground: string;
  scrollbarSliderHoverBackground: string;
  scrollbarSliderActiveBackground: string;
  notificationBackground: string;
  notificationForeground: string;
  notificationBorder: string;
  errorForeground: string;
  errorBackground: string;
  warningForeground: string;
  warningBackground: string;
  infoForeground: string;
  infoBackground: string;
  successForeground: string;
  successBackground: string;
  linkForeground: string;
  linkActiveForeground: string;
  badgeBackground: string;
  badgeForeground: string;
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
