import { injectable } from 'inversify';

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

// ============================================================================
// TYPES BASE
// ============================================================================

export type ThemeType = 'light' | 'dark' | 'high-contrast';
export type ColorFormat = 'hex' | 'rgb' | 'hsl' | 'oklch';

// ============================================================================
// COLOR DEFINITIONS
// ============================================================================

export interface ColorToken {
    key: string;
    value: string;
    opacity?: number;
    description?: string;
}

export interface ColorPalette {
    // Base
    background: string;
    foreground: string;
    
    // Primary
    primary: string;
    primaryForeground: string;
    primaryHover: string;
    primaryActive: string;
    
    // Secondary
    secondary: string;
    secondaryForeground: string;
    secondaryHover: string;
    
    // Accent
    accent: string;
    accentForeground: string;
    
    // Muted
    muted: string;
    mutedForeground: string;
    
    // Destructive
    destructive: string;
    destructiveForeground: string;
    
    // Borders
    border: string;
    borderHover: string;
    
    // Input
    input: string;
    inputBorder: string;
    inputFocus: string;
    
    // Card
    card: string;
    cardForeground: string;
    
    // Popover
    popover: string;
    popoverForeground: string;
    
    // Semantic
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
    // Editor
    background: string;
    foreground: string;
    lineHighlight: string;
    selection: string;
    selectionHighlight: string;
    wordHighlight: string;
    
    // Line numbers
    lineNumberForeground: string;
    lineNumberActive: string;
    
    // Gutter
    gutterBackground: string;
    
    // Cursor
    cursor: string;
    cursorLine: string;
    
    // Brackets
    bracketMatch: string;
    
    // Find
    findMatch: string;
    findMatchHighlight: string;
    
    // Minimap
    minimapBackground: string;
    minimapSelection: string;
}

export interface SyntaxColors {
    // Comments
    comment: string;
    
    // Strings
    string: string;
    stringEscape: string;
    
    // Numbers
    number: string;
    
    // Keywords
    keyword: string;
    keywordControl: string;
    keywordOperator: string;
    
    // Types
    type: string;
    typeParameter: string;
    
    // Functions
    function: string;
    functionCall: string;
    
    // Variables
    variable: string;
    variableConstant: string;
    variableParameter: string;
    
    // Properties
    property: string;
    propertyDeclaration: string;
    
    // Classes
    class: string;
    className: string;
    
    // Operators
    operator: string;
    
    // Punctuation
    punctuation: string;
    punctuationBracket: string;
    
    // Tags (HTML/XML)
    tag: string;
    tagAttribute: string;
    
    // CSS
    cssProperty: string;
    cssValue: string;
    cssSelector: string;
    
    // Regex
    regex: string;
    
    // Invalid
    invalid: string;
    deprecated: string;
}

export interface TimelineColors {
    // Background
    background: string;
    trackBackground: string;
    trackAlternate: string;
    
    // Clips
    videoClip: string;
    audioClip: string;
    textClip: string;
    effectClip: string;
    
    // Selection
    clipSelected: string;
    clipHover: string;
    
    // Playhead
    playhead: string;
    playheadLine: string;
    
    // Time ruler
    rulerBackground: string;
    rulerText: string;
    rulerTick: string;
    
    // In/Out
    inPoint: string;
    outPoint: string;
    
    // Waveform
    waveform: string;
    waveformBackground: string;
}

export interface Viewport3DColors {
    // Background
    background: string;
    grid: string;
    gridCenter: string;
    
    // Axes
    axisX: string;
    axisY: string;
    axisZ: string;
    
    // Selection
    selection: string;
    selectionSecondary: string;
    
    // Gizmo
    gizmoX: string;
    gizmoY: string;
    gizmoZ: string;
    gizmoCenter: string;
    
    // Wireframe
    wireframe: string;
    wireframeSelected: string;
    
    // Lights
    lightPoint: string;
    lightSpot: string;
    lightDirectional: string;
    lightArea: string;
    
    // Camera
    camera: string;
    cameraFrustum: string;
}

// ============================================================================
// THEME DEFINITION
// ============================================================================

export interface Theme {
    id: string;
    name: string;
    type: ThemeType;
    
    // Cores
    colors: ColorPalette;
    editorColors: EditorColors;
    syntaxColors: SyntaxColors;
    timelineColors: TimelineColors;
    viewport3DColors: Viewport3DColors;
    
    // Custom tokens
    customTokens: Map<string, ColorToken>;
    
    // Metadados
    author?: string;
    version?: string;
    description?: string;
    
    // Flags
    builtin: boolean;
}

// ============================================================================
// ICON THEME
// ============================================================================

export interface IconTheme {
    id: string;
    name: string;
    
    // Definições
    definitions: Map<string, IconDefinition>;
    
    // File icons
    fileIcons: Map<string, string>;           // extensão -> definição
    fileNameIcons: Map<string, string>;       // nome exato -> definição
    
    // Folder icons
    folderIcon: string;
    folderExpandedIcon: string;
    folderIcons: Map<string, string>;         // nome -> definição
    
    // Language icons
    languageIcons: Map<string, string>;       // languageId -> definição
    
    // Default
    defaultFileIcon: string;
    
    // Metadados
    author?: string;
    version?: string;
}

export interface IconDefinition {
    id: string;
    
    // SVG
    svg?: string;
    
    // Ou referência a arquivo
    path?: string;
    
    // Cores
    color?: string;
    colorSecondary?: string;
}

// ============================================================================
// FONT THEME
// ============================================================================

export interface FontTheme {
    id: string;
    name: string;
    
    // Fontes
    fontFamily: FontFamily;
    
    // Tamanhos
    fontSize: FontSizes;
    
    // Line heights
    lineHeight: LineHeights;
    
    // Letter spacing
    letterSpacing: LetterSpacings;
    
    // Font weights
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

// ============================================================================
// SPACING & SIZING
// ============================================================================

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

// ============================================================================
// LAYOUT
// ============================================================================

export interface WorkspaceLayout {
    id: string;
    name: string;
    
    // Panels
    panels: PanelLayout[];
    
    // Sidebars
    primarySidebar: SidebarLayout;
    secondarySidebar?: SidebarLayout;
    
    // Activity bar
    activityBarPosition: 'left' | 'right' | 'top' | 'hidden';
    
    // Status bar
    statusBarVisible: boolean;
    
    // Panel
    panelPosition: 'bottom' | 'left' | 'right';
    panelVisible: boolean;
    
    // Editor
    editorTabsPosition: 'top' | 'none';
    editorTabs: boolean;
}

export interface PanelLayout {
    id: string;
    viewId: string;
    
    // Posição
    position: 'primary' | 'secondary' | 'bottom';
    
    // Tamanho
    size?: number;
    minSize?: number;
    maxSize?: number;
    
    // Estado
    visible: boolean;
    collapsed: boolean;
}

export interface SidebarLayout {
    position: 'left' | 'right';
    width: number;
    minWidth: number;
    maxWidth: number;
    visible: boolean;
    
    // Views
    views: SidebarView[];
}

export interface SidebarView {
    id: string;
    viewId: string;
    order: number;
    visible: boolean;
    collapsed: boolean;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export interface UserPreferences {
    // Aparência
    theme: string;
    iconTheme: string;
    fontTheme: string;
    
    // Layout
    layout: string;
    
    // Editor
    editor: EditorPreferences;
    
    // Timeline
    timeline: TimelinePreferences;
    
    // 3D Viewport
    viewport3D: Viewport3DPreferences;
    
    // Performance
    performance: PerformancePreferences;
    
    // Accessibility
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

// ============================================================================
// THEME SYSTEM
// ============================================================================

@injectable()
export class ThemeSystem {
    // Themes
    private themes: Map<string, Theme> = new Map();
    private iconThemes: Map<string, IconTheme> = new Map();
    private fontThemes: Map<string, FontTheme> = new Map();
    
    // Layouts
    private layouts: Map<string, WorkspaceLayout> = new Map();
    
    // Current
    private currentTheme?: Theme;
    private currentIconTheme?: IconTheme;
    private currentFontTheme?: FontTheme;
    private currentLayout?: WorkspaceLayout;
    
    // Preferences
    private preferences: UserPreferences;
    
    // CSS Variables
    private cssRoot?: HTMLElement;
    
    // Listeners
    private listeners: Map<string, Set<(data: unknown) => void>> = new Map();

    constructor() {
        this.preferences = this.getDefaultPreferences();
        this.initializeBuiltins();
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    private getDefaultPreferences(): UserPreferences {
        return {
            theme: 'dark',
            iconTheme: 'default',
            fontTheme: 'default',
            layout: 'default',
            editor: {
                fontSize: 14,
                fontFamily: 'JetBrains Mono, Consolas, monospace',
                lineHeight: 1.5,
                tabSize: 4,
                insertSpaces: true,
                wordWrap: 'on',
                wordWrapColumn: 80,
                minimap: true,
                minimapWidth: 100,
                lineNumbers: 'on',
                renderWhitespace: 'selection',
                cursorStyle: 'line',
                cursorBlinking: 'smooth',
                scrollBeyondLastLine: true,
                smoothScrolling: true,
                bracketPairColorization: true,
            },
            timeline: {
                trackHeight: 60,
                thumbnailHeight: 40,
                showWaveforms: true,
                showThumbnails: true,
                snapToGrid: true,
                gridSize: 10,
                autoScroll: true,
                scrollSpeed: 1,
            },
            viewport3D: {
                gridVisible: true,
                gridSize: 1,
                axesVisible: true,
                cameraSpeed: 1,
                orbitSensitivity: 1,
                defaultShading: 'solid',
                antialiasing: true,
                shadows: true,
            },
            performance: {
                gpuAcceleration: true,
                maxFrameBufferSize: 30,
                previewQuality: 'preview',
                renderThreads: 4,
                enableHardwareEncoding: true,
            },
            accessibility: {
                reducedMotion: false,
                highContrast: false,
                screenReaderAnnouncements: true,
                keyboardNavigation: true,
                focusIndicators: true,
                fontSize: 'default',
            },
        };
    }

    private initializeBuiltins(): void {
        // Dark theme
        this.registerTheme(this.createDarkTheme());
        
        // Light theme
        this.registerTheme(this.createLightTheme());
        
        // High contrast
        this.registerTheme(this.createHighContrastTheme());
        
        // Default icon theme
        this.registerIconTheme(this.createDefaultIconTheme());
        
        // Default font theme
        this.registerFontTheme(this.createDefaultFontTheme());
        
        // Default layout
        this.registerLayout(this.createDefaultLayout());
        
        // Set defaults
        this.setTheme('dark');
        this.setIconTheme('default');
        this.setFontTheme('default');
        this.setLayout('default');
    }

    private createDarkTheme(): Theme {
        return {
            id: 'dark',
            name: 'Dark',
            type: 'dark',
            colors: {
                background: '#1a1a2e',
                foreground: '#eaeaea',
                primary: '#6366f1',
                primaryForeground: '#ffffff',
                primaryHover: '#5558e3',
                primaryActive: '#4749d1',
                secondary: '#27293d',
                secondaryForeground: '#a1a1aa',
                secondaryHover: '#32344a',
                accent: '#8b5cf6',
                accentForeground: '#ffffff',
                muted: '#27293d',
                mutedForeground: '#71717a',
                destructive: '#ef4444',
                destructiveForeground: '#ffffff',
                border: '#3f3f5a',
                borderHover: '#525270',
                input: '#27293d',
                inputBorder: '#3f3f5a',
                inputFocus: '#6366f1',
                card: '#1e1e32',
                cardForeground: '#eaeaea',
                popover: '#1e1e32',
                popoverForeground: '#eaeaea',
                success: '#22c55e',
                successForeground: '#ffffff',
                warning: '#f59e0b',
                warningForeground: '#000000',
                error: '#ef4444',
                errorForeground: '#ffffff',
                info: '#3b82f6',
                infoForeground: '#ffffff',
            },
            editorColors: {
                background: '#1a1a2e',
                foreground: '#e0e0e0',
                lineHighlight: '#27293d',
                selection: '#6366f140',
                selectionHighlight: '#6366f130',
                wordHighlight: '#6366f125',
                lineNumberForeground: '#525270',
                lineNumberActive: '#a1a1aa',
                gutterBackground: '#1a1a2e',
                cursor: '#6366f1',
                cursorLine: '#27293d50',
                bracketMatch: '#6366f150',
                findMatch: '#f59e0b40',
                findMatchHighlight: '#f59e0b25',
                minimapBackground: '#1a1a2e',
                minimapSelection: '#6366f180',
            },
            syntaxColors: {
                comment: '#6b7280',
                string: '#22c55e',
                stringEscape: '#34d399',
                number: '#f59e0b',
                keyword: '#8b5cf6',
                keywordControl: '#c084fc',
                keywordOperator: '#a78bfa',
                type: '#38bdf8',
                typeParameter: '#7dd3fc',
                function: '#3b82f6',
                functionCall: '#60a5fa',
                variable: '#e0e0e0',
                variableConstant: '#f59e0b',
                variableParameter: '#fbbf24',
                property: '#93c5fd',
                propertyDeclaration: '#60a5fa',
                class: '#38bdf8',
                className: '#7dd3fc',
                operator: '#a1a1aa',
                punctuation: '#71717a',
                punctuationBracket: '#a1a1aa',
                tag: '#f472b6',
                tagAttribute: '#fbbf24',
                cssProperty: '#93c5fd',
                cssValue: '#34d399',
                cssSelector: '#f472b6',
                regex: '#f59e0b',
                invalid: '#ef4444',
                deprecated: '#fbbf24',
            },
            timelineColors: {
                background: '#1a1a2e',
                trackBackground: '#1e1e32',
                trackAlternate: '#222238',
                videoClip: '#3b82f6',
                audioClip: '#22c55e',
                textClip: '#f59e0b',
                effectClip: '#8b5cf6',
                clipSelected: '#6366f1',
                clipHover: '#5558e3',
                playhead: '#ef4444',
                playheadLine: '#ef4444',
                rulerBackground: '#27293d',
                rulerText: '#a1a1aa',
                rulerTick: '#525270',
                inPoint: '#22c55e',
                outPoint: '#ef4444',
                waveform: '#22c55e80',
                waveformBackground: '#22c55e20',
            },
            viewport3DColors: {
                background: '#1a1a2e',
                grid: '#3f3f5a40',
                gridCenter: '#525270',
                axisX: '#ef4444',
                axisY: '#22c55e',
                axisZ: '#3b82f6',
                selection: '#f59e0b',
                selectionSecondary: '#fbbf2480',
                gizmoX: '#ef4444',
                gizmoY: '#22c55e',
                gizmoZ: '#3b82f6',
                gizmoCenter: '#ffffff',
                wireframe: '#525270',
                wireframeSelected: '#f59e0b',
                lightPoint: '#fbbf24',
                lightSpot: '#fbbf24',
                lightDirectional: '#fef08a',
                lightArea: '#fef9c3',
                camera: '#3b82f6',
                cameraFrustum: '#3b82f680',
            },
            customTokens: new Map(),
            builtin: true,
        };
    }

    private createLightTheme(): Theme {
        return {
            id: 'light',
            name: 'Light',
            type: 'light',
            colors: {
                background: '#ffffff',
                foreground: '#171717',
                primary: '#6366f1',
                primaryForeground: '#ffffff',
                primaryHover: '#5558e3',
                primaryActive: '#4749d1',
                secondary: '#f4f4f5',
                secondaryForeground: '#52525b',
                secondaryHover: '#e4e4e7',
                accent: '#8b5cf6',
                accentForeground: '#ffffff',
                muted: '#f4f4f5',
                mutedForeground: '#71717a',
                destructive: '#ef4444',
                destructiveForeground: '#ffffff',
                border: '#e4e4e7',
                borderHover: '#d4d4d8',
                input: '#ffffff',
                inputBorder: '#e4e4e7',
                inputFocus: '#6366f1',
                card: '#ffffff',
                cardForeground: '#171717',
                popover: '#ffffff',
                popoverForeground: '#171717',
                success: '#22c55e',
                successForeground: '#ffffff',
                warning: '#f59e0b',
                warningForeground: '#000000',
                error: '#ef4444',
                errorForeground: '#ffffff',
                info: '#3b82f6',
                infoForeground: '#ffffff',
            },
            editorColors: {
                background: '#ffffff',
                foreground: '#171717',
                lineHighlight: '#f4f4f5',
                selection: '#6366f130',
                selectionHighlight: '#6366f120',
                wordHighlight: '#6366f115',
                lineNumberForeground: '#a1a1aa',
                lineNumberActive: '#52525b',
                gutterBackground: '#ffffff',
                cursor: '#6366f1',
                cursorLine: '#f4f4f580',
                bracketMatch: '#6366f140',
                findMatch: '#f59e0b30',
                findMatchHighlight: '#f59e0b20',
                minimapBackground: '#fafafa',
                minimapSelection: '#6366f160',
            },
            syntaxColors: {
                comment: '#71717a',
                string: '#16a34a',
                stringEscape: '#15803d',
                number: '#d97706',
                keyword: '#7c3aed',
                keywordControl: '#9333ea',
                keywordOperator: '#8b5cf6',
                type: '#0284c7',
                typeParameter: '#0369a1',
                function: '#2563eb',
                functionCall: '#3b82f6',
                variable: '#171717',
                variableConstant: '#d97706',
                variableParameter: '#b45309',
                property: '#0369a1',
                propertyDeclaration: '#0284c7',
                class: '#0284c7',
                className: '#0369a1',
                operator: '#52525b',
                punctuation: '#71717a',
                punctuationBracket: '#52525b',
                tag: '#db2777',
                tagAttribute: '#d97706',
                cssProperty: '#0369a1',
                cssValue: '#16a34a',
                cssSelector: '#db2777',
                regex: '#d97706',
                invalid: '#dc2626',
                deprecated: '#d97706',
            },
            timelineColors: {
                background: '#fafafa',
                trackBackground: '#ffffff',
                trackAlternate: '#f4f4f5',
                videoClip: '#3b82f6',
                audioClip: '#22c55e',
                textClip: '#f59e0b',
                effectClip: '#8b5cf6',
                clipSelected: '#6366f1',
                clipHover: '#5558e3',
                playhead: '#ef4444',
                playheadLine: '#ef4444',
                rulerBackground: '#e4e4e7',
                rulerText: '#52525b',
                rulerTick: '#a1a1aa',
                inPoint: '#22c55e',
                outPoint: '#ef4444',
                waveform: '#22c55e80',
                waveformBackground: '#22c55e10',
            },
            viewport3DColors: {
                background: '#f4f4f5',
                grid: '#d4d4d830',
                gridCenter: '#a1a1aa',
                axisX: '#ef4444',
                axisY: '#22c55e',
                axisZ: '#3b82f6',
                selection: '#f59e0b',
                selectionSecondary: '#fbbf2460',
                gizmoX: '#ef4444',
                gizmoY: '#22c55e',
                gizmoZ: '#3b82f6',
                gizmoCenter: '#171717',
                wireframe: '#a1a1aa',
                wireframeSelected: '#f59e0b',
                lightPoint: '#fbbf24',
                lightSpot: '#fbbf24',
                lightDirectional: '#fef08a',
                lightArea: '#fef9c3',
                camera: '#3b82f6',
                cameraFrustum: '#3b82f660',
            },
            customTokens: new Map(),
            builtin: true,
        };
    }

    private createHighContrastTheme(): Theme {
        const dark = this.createDarkTheme();
        return {
            ...dark,
            id: 'high-contrast',
            name: 'High Contrast',
            type: 'high-contrast',
            colors: {
                ...dark.colors,
                background: '#000000',
                foreground: '#ffffff',
                border: '#ffffff',
                primary: '#00ff00',
                primaryForeground: '#000000',
            },
            builtin: true,
        };
    }

    private createDefaultIconTheme(): IconTheme {
        return {
            id: 'default',
            name: 'Default Icons',
            definitions: new Map([
                ['file', { id: 'file', color: '#a1a1aa' }],
                ['folder', { id: 'folder', color: '#fbbf24' }],
                ['folder-open', { id: 'folder-open', color: '#fbbf24' }],
                ['javascript', { id: 'javascript', color: '#fbbf24' }],
                ['typescript', { id: 'typescript', color: '#3b82f6' }],
                ['react', { id: 'react', color: '#60a5fa' }],
                ['vue', { id: 'vue', color: '#22c55e' }],
                ['python', { id: 'python', color: '#3b82f6' }],
                ['rust', { id: 'rust', color: '#f59e0b' }],
                ['go', { id: 'go', color: '#00add8' }],
                ['html', { id: 'html', color: '#ef4444' }],
                ['css', { id: 'css', color: '#3b82f6' }],
                ['json', { id: 'json', color: '#fbbf24' }],
                ['markdown', { id: 'markdown', color: '#3b82f6' }],
                ['image', { id: 'image', color: '#8b5cf6' }],
                ['video', { id: 'video', color: '#ef4444' }],
                ['audio', { id: 'audio', color: '#22c55e' }],
            ]),
            fileIcons: new Map([
                ['js', 'javascript'],
                ['jsx', 'react'],
                ['ts', 'typescript'],
                ['tsx', 'react'],
                ['vue', 'vue'],
                ['py', 'python'],
                ['rs', 'rust'],
                ['go', 'go'],
                ['html', 'html'],
                ['css', 'css'],
                ['scss', 'css'],
                ['json', 'json'],
                ['md', 'markdown'],
                ['png', 'image'],
                ['jpg', 'image'],
                ['jpeg', 'image'],
                ['gif', 'image'],
                ['svg', 'image'],
                ['webp', 'image'],
                ['mp4', 'video'],
                ['mov', 'video'],
                ['webm', 'video'],
                ['mp3', 'audio'],
                ['wav', 'audio'],
                ['flac', 'audio'],
            ]),
            fileNameIcons: new Map([
                ['package.json', 'json'],
                ['tsconfig.json', 'typescript'],
                ['README.md', 'markdown'],
                ['.gitignore', 'file'],
            ]),
            folderIcon: 'folder',
            folderExpandedIcon: 'folder-open',
            folderIcons: new Map([
                ['src', 'folder'],
                ['lib', 'folder'],
                ['dist', 'folder'],
                ['node_modules', 'folder'],
                ['public', 'folder'],
                ['assets', 'folder'],
            ]),
            languageIcons: new Map([
                ['javascript', 'javascript'],
                ['typescript', 'typescript'],
                ['python', 'python'],
                ['rust', 'rust'],
                ['go', 'go'],
            ]),
            defaultFileIcon: 'file',
        };
    }

    private createDefaultFontTheme(): FontTheme {
        return {
            id: 'default',
            name: 'Default Fonts',
            fontFamily: {
                ui: 'Inter, system-ui, sans-serif',
                editor: 'JetBrains Mono, Consolas, Courier New, monospace',
                monospace: 'JetBrains Mono, Consolas, Courier New, monospace',
                heading: 'Inter, system-ui, sans-serif',
            },
            fontSize: {
                xs: '0.75rem',
                sm: '0.875rem',
                base: '1rem',
                lg: '1.125rem',
                xl: '1.25rem',
                '2xl': '1.5rem',
                '3xl': '1.875rem',
                '4xl': '2.25rem',
            },
            lineHeight: {
                tight: 1.25,
                normal: 1.5,
                relaxed: 1.625,
                loose: 2,
            },
            letterSpacing: {
                tighter: '-0.05em',
                tight: '-0.025em',
                normal: '0em',
                wide: '0.025em',
                wider: '0.05em',
            },
            fontWeights: {
                thin: 100,
                light: 300,
                normal: 400,
                medium: 500,
                semibold: 600,
                bold: 700,
                extrabold: 800,
            },
        };
    }

    private createDefaultLayout(): WorkspaceLayout {
        return {
            id: 'default',
            name: 'Default Layout',
            panels: [],
            primarySidebar: {
                position: 'left',
                width: 300,
                minWidth: 200,
                maxWidth: 600,
                visible: true,
                views: [
                    { id: 'explorer', viewId: 'explorer', order: 1, visible: true, collapsed: false },
                    { id: 'search', viewId: 'search', order: 2, visible: true, collapsed: true },
                ],
            },
            activityBarPosition: 'left',
            statusBarVisible: true,
            panelPosition: 'bottom',
            panelVisible: true,
            editorTabsPosition: 'top',
            editorTabs: true,
        };
    }

    // ========================================================================
    // THEME MANAGEMENT
    // ========================================================================

    /**
     * Registra tema
     */
    registerTheme(theme: Theme): void {
        this.themes.set(theme.id, theme);
        this.emit('themeRegistered', theme);
    }

    /**
     * Define tema atual
     */
    setTheme(themeId: string): void {
        const theme = this.themes.get(themeId);
        if (!theme) {
            throw new Error(`Theme not found: ${themeId}`);
        }

        this.currentTheme = theme;
        this.preferences.theme = themeId;
        
        this.applyCSSVariables(theme);
        this.emit('themeChanged', theme);
    }

    /**
     * Obtém tema atual
     */
    getCurrentTheme(): Theme | undefined {
        return this.currentTheme;
    }

    /**
     * Lista temas disponíveis
     */
    getThemes(): Theme[] {
        return Array.from(this.themes.values());
    }

    // ========================================================================
    // ICON THEME
    // ========================================================================

    registerIconTheme(iconTheme: IconTheme): void {
        this.iconThemes.set(iconTheme.id, iconTheme);
        this.emit('iconThemeRegistered', iconTheme);
    }

    setIconTheme(themeId: string): void {
        const theme = this.iconThemes.get(themeId);
        if (!theme) {
            throw new Error(`Icon theme not found: ${themeId}`);
        }

        this.currentIconTheme = theme;
        this.preferences.iconTheme = themeId;
        this.emit('iconThemeChanged', theme);
    }

    getIconForFile(filename: string): IconDefinition | undefined {
        if (!this.currentIconTheme) return undefined;

        // Tentar nome exato primeiro
        const exactMatch = this.currentIconTheme.fileNameIcons.get(filename);
        if (exactMatch) {
            return this.currentIconTheme.definitions.get(exactMatch);
        }

        // Tentar extensão
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext) {
            const extMatch = this.currentIconTheme.fileIcons.get(ext);
            if (extMatch) {
                return this.currentIconTheme.definitions.get(extMatch);
            }
        }

        // Default
        return this.currentIconTheme.definitions.get(
            this.currentIconTheme.defaultFileIcon
        );
    }

    getIconForFolder(foldername: string, expanded: boolean = false): IconDefinition | undefined {
        if (!this.currentIconTheme) return undefined;

        const folderMatch = this.currentIconTheme.folderIcons.get(foldername);
        if (folderMatch) {
            return this.currentIconTheme.definitions.get(folderMatch);
        }

        const defaultIcon = expanded
            ? this.currentIconTheme.folderExpandedIcon
            : this.currentIconTheme.folderIcon;

        return this.currentIconTheme.definitions.get(defaultIcon);
    }

    // ========================================================================
    // FONT THEME
    // ========================================================================

    registerFontTheme(fontTheme: FontTheme): void {
        this.fontThemes.set(fontTheme.id, fontTheme);
        this.emit('fontThemeRegistered', fontTheme);
    }

    setFontTheme(themeId: string): void {
        const theme = this.fontThemes.get(themeId);
        if (!theme) {
            throw new Error(`Font theme not found: ${themeId}`);
        }

        this.currentFontTheme = theme;
        this.preferences.fontTheme = themeId;
        
        this.applyFontVariables(theme);
        this.emit('fontThemeChanged', theme);
    }

    // ========================================================================
    // LAYOUT
    // ========================================================================

    registerLayout(layout: WorkspaceLayout): void {
        this.layouts.set(layout.id, layout);
        this.emit('layoutRegistered', layout);
    }

    setLayout(layoutId: string): void {
        const layout = this.layouts.get(layoutId);
        if (!layout) {
            throw new Error(`Layout not found: ${layoutId}`);
        }

        this.currentLayout = layout;
        this.preferences.layout = layoutId;
        this.emit('layoutChanged', layout);
    }

    getCurrentLayout(): WorkspaceLayout | undefined {
        return this.currentLayout;
    }

    // ========================================================================
    // PREFERENCES
    // ========================================================================

    /**
     * Obtém preferências
     */
    getPreferences(): UserPreferences {
        return { ...this.preferences };
    }

    /**
     * Atualiza preferências
     */
    updatePreferences(updates: Partial<UserPreferences>): void {
        this.preferences = {
            ...this.preferences,
            ...updates,
            editor: { ...this.preferences.editor, ...updates.editor },
            timeline: { ...this.preferences.timeline, ...updates.timeline },
            viewport3D: { ...this.preferences.viewport3D, ...updates.viewport3D },
            performance: { ...this.preferences.performance, ...updates.performance },
            accessibility: { ...this.preferences.accessibility, ...updates.accessibility },
        };

        this.emit('preferencesChanged', this.preferences);
    }

    /**
     * Reseta preferências
     */
    resetPreferences(): void {
        this.preferences = this.getDefaultPreferences();
        this.emit('preferencesReset', this.preferences);
    }

    // ========================================================================
    // CSS VARIABLES
    // ========================================================================

    /**
     * Define root element para CSS
     */
    setCSSRoot(element: HTMLElement): void {
        this.cssRoot = element;
        
        if (this.currentTheme) {
            this.applyCSSVariables(this.currentTheme);
        }
        if (this.currentFontTheme) {
            this.applyFontVariables(this.currentFontTheme);
        }
    }

    private applyCSSVariables(theme: Theme): void {
        if (!this.cssRoot) return;

        const style = this.cssRoot.style;

        // Colors
        for (const [key, value] of Object.entries(theme.colors)) {
            style.setProperty(`--color-${this.kebabCase(key)}`, value);
        }

        // Editor colors
        for (const [key, value] of Object.entries(theme.editorColors)) {
            style.setProperty(`--editor-${this.kebabCase(key)}`, value);
        }

        // Syntax colors
        for (const [key, value] of Object.entries(theme.syntaxColors)) {
            style.setProperty(`--syntax-${this.kebabCase(key)}`, value);
        }

        // Timeline colors
        for (const [key, value] of Object.entries(theme.timelineColors)) {
            style.setProperty(`--timeline-${this.kebabCase(key)}`, value);
        }

        // 3D viewport colors
        for (const [key, value] of Object.entries(theme.viewport3DColors)) {
            style.setProperty(`--viewport3d-${this.kebabCase(key)}`, value);
        }

        // Custom tokens
        for (const [key, token] of theme.customTokens) {
            style.setProperty(`--${key}`, token.value);
        }

        // Theme type
        this.cssRoot.setAttribute('data-theme', theme.type);
    }

    private applyFontVariables(theme: FontTheme): void {
        if (!this.cssRoot) return;

        const style = this.cssRoot.style;

        // Font families
        for (const [key, value] of Object.entries(theme.fontFamily)) {
            style.setProperty(`--font-${key}`, value);
        }

        // Font sizes
        for (const [key, value] of Object.entries(theme.fontSize)) {
            style.setProperty(`--text-${key}`, value);
        }

        // Line heights
        for (const [key, value] of Object.entries(theme.lineHeight)) {
            style.setProperty(`--leading-${key}`, String(value));
        }
    }

    private kebabCase(str: string): string {
        return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
    }

    // ========================================================================
    // COLOR UTILITIES
    // ========================================================================

    /**
     * Converte cor para formato especificado
     */
    convertColor(color: string, format: ColorFormat): string {
        const rgb = this.parseColor(color);
        if (!rgb) return color;

        switch (format) {
            case 'hex':
                return this.rgbToHex(rgb);
            case 'rgb':
                return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
            case 'hsl':
                const hsl = this.rgbToHsl(rgb);
                return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
            case 'oklch':
                // Simplificado
                return color;
            default:
                return color;
        }
    }

    private parseColor(color: string): { r: number; g: number; b: number } | null {
        // Hex
        const hexMatch = color.match(/^#([a-f0-9]{6}|[a-f0-9]{3})$/i);
        if (hexMatch) {
            let hex = hexMatch[1];
            if (hex.length === 3) {
                hex = hex.split('').map(c => c + c).join('');
            }
            return {
                r: parseInt(hex.substr(0, 2), 16),
                g: parseInt(hex.substr(2, 2), 16),
                b: parseInt(hex.substr(4, 2), 16),
            };
        }

        // RGB
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
        if (rgbMatch) {
            return {
                r: parseInt(rgbMatch[1]),
                g: parseInt(rgbMatch[2]),
                b: parseInt(rgbMatch[3]),
            };
        }

        return null;
    }

    private rgbToHex(rgb: { r: number; g: number; b: number }): string {
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    }

    private rgbToHsl(rgb: { r: number; g: number; b: number }): { h: number; s: number; l: number } {
        const r = rgb.r / 255;
        const g = rgb.g / 255;
        const b = rgb.b / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r:
                    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                    break;
                case g:
                    h = ((b - r) / d + 2) / 6;
                    break;
                case b:
                    h = ((r - g) / d + 4) / 6;
                    break;
            }
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100),
        };
    }

    /**
     * Gera cor com alpha
     */
    withAlpha(color: string, alpha: number): string {
        const rgb = this.parseColor(color);
        if (!rgb) return color;
        return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }

    /**
     * Clareia cor
     */
    lighten(color: string, amount: number): string {
        const rgb = this.parseColor(color);
        if (!rgb) return color;

        const factor = 1 + amount;
        return this.rgbToHex({
            r: Math.min(255, Math.round(rgb.r * factor)),
            g: Math.min(255, Math.round(rgb.g * factor)),
            b: Math.min(255, Math.round(rgb.b * factor)),
        });
    }

    /**
     * Escurece cor
     */
    darken(color: string, amount: number): string {
        const rgb = this.parseColor(color);
        if (!rgb) return color;

        const factor = 1 - amount;
        return this.rgbToHex({
            r: Math.max(0, Math.round(rgb.r * factor)),
            g: Math.max(0, Math.round(rgb.g * factor)),
            b: Math.max(0, Math.round(rgb.b * factor)),
        });
    }

    // ========================================================================
    // EVENTS
    // ========================================================================

    on(event: string, callback: (data: unknown) => void): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    off(event: string, callback: (data: unknown) => void): void {
        this.listeners.get(event)?.delete(callback);
    }

    private emit(event: string, data: unknown): void {
        this.listeners.get(event)?.forEach(cb => cb(data));
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================

    private generateId(): string {
        return `theme_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
