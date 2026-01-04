/**
 * THEME SYSTEM - Sistema de Temas e Customização
 *
 * Sistema completo para:
 * - Temas de cores
 * - Customização de UI
 * - Icon themes
 * - Font themes
 * - Workspace layouts
 * - User preferences
 */
export type ThemeType = 'light' | 'dark' | 'high-contrast';
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';
export interface ColorToken {
    key: string;
    value: string;
    opacity?: number;
    description?: string;
}
export interface ColorPalette {
    background: string;
    foreground: string;
    primary: string;
    primaryForeground: string;
    primaryHover: string;
    primaryActive: string;
    secondary: string;
    secondaryForeground: string;
    secondaryHover: string;
    accent: string;
    accentForeground: string;
    muted: string;
    mutedForeground: string;
    destructive: string;
    destructiveForeground: string;
    border: string;
    borderHover: string;
    input: string;
    inputBorder: string;
    inputFocus: string;
    card: string;
    cardForeground: string;
    popover: string;
    popoverForeground: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    error: string;
    errorForeground: string;
    info: string;
    infoForeground: string;
}
export interface EditorColors {
    background: string;
    foreground: string;
    lineHighlight: string;
    selection: string;
    selectionHighlight: string;
    wordHighlight: string;
    lineNumberForeground: string;
    lineNumberActive: string;
    gutterBackground: string;
    cursor: string;
    cursorLine: string;
    bracketMatch: string;
    findMatch: string;
    findMatchHighlight: string;
    minimapBackground: string;
    minimapSelection: string;
}
export interface SyntaxColors {
    comment: string;
    string: string;
    stringEscape: string;
    number: string;
    keyword: string;
    keywordControl: string;
    keywordOperator: string;
    type: string;
    typeParameter: string;
    function: string;
    functionCall: string;
    variable: string;
    variableConstant: string;
    variableParameter: string;
    property: string;
    propertyDeclaration: string;
    class: string;
    className: string;
    operator: string;
    punctuation: string;
    punctuationBracket: string;
    tag: string;
    tagAttribute: string;
    cssProperty: string;
    cssValue: string;
    cssSelector: string;
    regex: string;
    invalid: string;
    deprecated: string;
}
export interface TimelineColors {
    background: string;
    trackBackground: string;
    trackAlternate: string;
    videoClip: string;
    audioClip: string;
    textClip: string;
    effectClip: string;
    clipSelected: string;
    clipHover: string;
    playhead: string;
    playheadLine: string;
    rulerBackground: string;
    rulerText: string;
    rulerTick: string;
    inPoint: string;
    outPoint: string;
    waveform: string;
    waveformBackground: string;
}
export interface Viewport3DColors {
    background: string;
    grid: string;
    gridCenter: string;
    axisX: string;
    axisY: string;
    axisZ: string;
    selection: string;
    selectionSecondary: string;
    gizmoX: string;
    gizmoY: string;
    gizmoZ: string;
    gizmoCenter: string;
    wireframe: string;
    wireframeSelected: string;
    lightPoint: string;
    lightSpot: string;
    lightDirectional: string;
    lightArea: string;
    camera: string;
    cameraFrustum: string;
}
export interface Theme {
    id: string;
    name: string;
    type: ThemeType;
    colors: ColorPalette;
    editorColors: EditorColors;
    syntaxColors: SyntaxColors;
    timelineColors: TimelineColors;
    viewport3DColors: Viewport3DColors;
    customTokens: Map<string, ColorToken>;
    author?: string;
    version?: string;
    description?: string;
    builtin: boolean;
}
export interface IconTheme {
    id: string;
    name: string;
    definitions: Map<string, IconDefinition>;
    fileIcons: Map<string, string>;
    fileNameIcons: Map<string, string>;
    folderIcon: string;
    folderExpandedIcon: string;
    folderIcons: Map<string, string>;
    languageIcons: Map<string, string>;
    defaultFileIcon: string;
    author?: string;
    version?: string;
}
export interface IconDefinition {
    id: string;
    svg?: string;
    path?: string;
    color?: string;
    colorSecondary?: string;
}
export interface FontTheme {
    id: string;
    name: string;
    fontFamily: FontFamily;
    fontSize: FontSizes;
    lineHeight: LineHeights;
    letterSpacing: LetterSpacings;
    fontWeights: FontWeights;
}
export interface FontFamily {
    ui: string;
    editor: string;
    monospace: string;
    heading: string;
}
export interface FontSizes {
    xs: string;
    sm: string;
    base: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
}
export interface LineHeights {
    tight: number;
    normal: number;
    relaxed: number;
    loose: number;
}
export interface LetterSpacings {
    tighter: string;
    tight: string;
    normal: string;
    wide: string;
    wider: string;
}
export interface FontWeights {
    thin: number;
    light: number;
    normal: number;
    medium: number;
    semibold: number;
    bold: number;
    extrabold: number;
}
export interface SpacingScale {
    0: string;
    px: string;
    0.5: string;
    1: string;
    1.5: string;
    2: string;
    2.5: string;
    3: string;
    3.5: string;
    4: string;
    5: string;
    6: string;
    7: string;
    8: string;
    9: string;
    10: string;
    11: string;
    12: string;
    14: string;
    16: string;
    20: string;
    24: string;
    28: string;
    32: string;
    36: string;
    40: string;
    44: string;
    48: string;
    52: string;
    56: string;
    60: string;
    64: string;
    72: string;
    80: string;
    96: string;
}
export interface RadiusScale {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    full: string;
}
export interface ShadowScale {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    inner: string;
}
export interface WorkspaceLayout {
    id: string;
    name: string;
    panels: PanelLayout[];
    primarySidebar: SidebarLayout;
    secondarySidebar?: SidebarLayout;
    activityBarPosition: 'left' | 'right' | 'top' | 'hidden';
    statusBarVisible: boolean;
    panelPosition: 'bottom' | 'left' | 'right';
    panelVisible: boolean;
    editorTabsPosition: 'top' | 'none';
    editorTabs: boolean;
}
export interface PanelLayout {
    id: string;
    viewId: string;
    position: 'primary' | 'secondary' | 'bottom';
    size?: number;
    minSize?: number;
    maxSize?: number;
    visible: boolean;
    collapsed: boolean;
}
export interface SidebarLayout {
    position: 'left' | 'right';
    width: number;
    minWidth: number;
    maxWidth: number;
    visible: boolean;
    views: SidebarView[];
}
export interface SidebarView {
    id: string;
    viewId: string;
    order: number;
    visible: boolean;
    collapsed: boolean;
}
export interface UserPreferences {
    theme: string;
    iconTheme: string;
    fontTheme: string;
    layout: string;
    editor: EditorPreferences;
    timeline: TimelinePreferences;
    viewport3D: Viewport3DPreferences;
    performance: PerformancePreferences;
    accessibility: AccessibilityPreferences;
}
export interface EditorPreferences {
    fontSize: number;
    fontFamily: string;
    lineHeight: number;
    tabSize: number;
    insertSpaces: boolean;
    wordWrap: 'on' | 'off' | 'wordWrapColumn' | 'bounded';
    wordWrapColumn: number;
    minimap: boolean;
    minimapWidth: number;
    lineNumbers: 'on' | 'off' | 'relative';
    renderWhitespace: 'none' | 'boundary' | 'selection' | 'trailing' | 'all';
    cursorStyle: 'line' | 'block' | 'underline';
    cursorBlinking: 'blink' | 'smooth' | 'phase' | 'expand' | 'solid';
    scrollBeyondLastLine: boolean;
    smoothScrolling: boolean;
    bracketPairColorization: boolean;
}
export interface TimelinePreferences {
    trackHeight: number;
    thumbnailHeight: number;
    showWaveforms: boolean;
    showThumbnails: boolean;
    snapToGrid: boolean;
    gridSize: number;
    autoScroll: boolean;
    scrollSpeed: number;
}
export interface Viewport3DPreferences {
    gridVisible: boolean;
    gridSize: number;
    axesVisible: boolean;
    cameraSpeed: number;
    orbitSensitivity: number;
    defaultShading: 'solid' | 'wireframe' | 'textured';
    antialiasing: boolean;
    shadows: boolean;
}
export interface PerformancePreferences {
    gpuAcceleration: boolean;
    maxFrameBufferSize: number;
    previewQuality: 'draft' | 'preview' | 'full';
    renderThreads: number;
    enableHardwareEncoding: boolean;
}
export interface AccessibilityPreferences {
    reducedMotion: boolean;
    highContrast: boolean;
    screenReaderAnnouncements: boolean;
    keyboardNavigation: boolean;
    focusIndicators: boolean;
    fontSize: 'default' | 'large' | 'extra-large';
}
export declare class ThemeSystem {
    private themes;
    private iconThemes;
    private fontThemes;
    private layouts;
    private currentTheme?;
    private currentIconTheme?;
    private currentFontTheme?;
    private currentLayout?;
    private preferences;
    private cssRoot?;
    private listeners;
    constructor();
    private getDefaultPreferences;
    private initializeBuiltins;
    private createDarkTheme;
    private createLightTheme;
    private createHighContrastTheme;
    private createDefaultIconTheme;
    private createDefaultFontTheme;
    private createDefaultLayout;
    /**
     * Registra tema
     */
    registerTheme(theme: Theme): void;
    /**
     * Define tema atual
     */
    setTheme(themeId: string): void;
    /**
     * Obtém tema atual
     */
    getCurrentTheme(): Theme | undefined;
    /**
     * Lista temas disponíveis
     */
    getThemes(): Theme[];
    registerIconTheme(iconTheme: IconTheme): void;
    setIconTheme(themeId: string): void;
    getIconForFile(filename: string): IconDefinition | undefined;
    getIconForFolder(foldername: string, expanded?: boolean): IconDefinition | undefined;
    registerFontTheme(fontTheme: FontTheme): void;
    setFontTheme(themeId: string): void;
    registerLayout(layout: WorkspaceLayout): void;
    setLayout(layoutId: string): void;
    getCurrentLayout(): WorkspaceLayout | undefined;
    /**
     * Obtém preferências
     */
    getPreferences(): UserPreferences;
    /**
     * Atualiza preferências
     */
    updatePreferences(updates: Partial<UserPreferences>): void;
    /**
     * Reseta preferências
     */
    resetPreferences(): void;
    /**
     * Define root element para CSS
     */
    setCSSRoot(element: HTMLElement): void;
    private applyCSSVariables;
    private applyFontVariables;
    private kebabCase;
    /**
     * Converte cor para formato especificado
     */
    convertColor(color: string, format: ColorFormat): string;
    private parseColor;
    private rgbToHex;
    private rgbToHsl;
    /**
     * Gera cor com alpha
     */
    withAlpha(color: string, alpha: number): string;
    /**
     * Clareia cor
     */
    lighten(color: string, amount: number): string;
    /**
     * Escurece cor
     */
    darken(color: string, amount: number): string;
    on(event: string, callback: (data: unknown) => void): void;
    off(event: string, callback: (data: unknown) => void): void;
    private emit;
    private generateId;
}
