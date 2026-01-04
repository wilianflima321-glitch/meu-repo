/**
 * Keybinding System - Professional Keyboard Shortcut Management
 *
 * Sistema de atalhos de teclado profissional inspirado em VS Code, Unreal Engine,
 * DaVinci Resolve e ferramentas de produção profissional. Suporta:
 * - Keybindings contextuais (when clauses)
 * - Sequências de teclas (chords)
 * - Conflito de atalhos inteligente
 * - Importação/exportação de presets
 * - Multi-plataforma (Windows, Mac, Linux)
 * - Personalização por usuário e workspace
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Modifier keys
 */
export declare enum KeyModifier {
    Ctrl = "ctrl",
    Shift = "shift",
    Alt = "alt",
    Meta = "meta",// Cmd on Mac, Win key on Windows
    CtrlCmd = "ctrlcmd"
}
/**
 * Special keys
 */
export declare enum SpecialKey {
    F1 = "f1",
    F2 = "f2",
    F3 = "f3",
    F4 = "f4",
    F5 = "f5",
    F6 = "f6",
    F7 = "f7",
    F8 = "f8",
    F9 = "f9",
    F10 = "f10",
    F11 = "f11",
    F12 = "f12",
    Escape = "escape",
    Tab = "tab",
    CapsLock = "capslock",
    Space = "space",
    Enter = "enter",
    Backspace = "backspace",
    Delete = "delete",
    Insert = "insert",
    Home = "home",
    End = "end",
    PageUp = "pageup",
    PageDown = "pagedown",
    Up = "up",
    Down = "down",
    Left = "left",
    Right = "right",
    NumPad0 = "numpad0",
    NumPad1 = "numpad1",
    NumPad2 = "numpad2",
    NumPad3 = "numpad3",
    NumPad4 = "numpad4",
    NumPad5 = "numpad5",
    NumPad6 = "numpad6",
    NumPad7 = "numpad7",
    NumPad8 = "numpad8",
    NumPad9 = "numpad9",
    NumPadMultiply = "numpad_multiply",
    NumPadAdd = "numpad_add",
    NumPadSubtract = "numpad_subtract",
    NumPadDecimal = "numpad_decimal",
    NumPadDivide = "numpad_divide",
    Semicolon = "semicolon",
    Equal = "equal",
    Comma = "comma",
    Minus = "minus",
    Period = "period",
    Slash = "slash",
    Backquote = "backquote",
    BracketLeft = "bracketleft",
    Backslash = "backslash",
    BracketRight = "bracketright",
    Quote = "quote"
}
/**
 * Key combination
 */
export interface KeyCombination {
    key: string;
    modifiers: KeyModifier[];
}
/**
 * Key chord (sequence of key combinations)
 */
export interface KeyChord {
    parts: KeyCombination[];
}
/**
 * Keybinding definition
 */
export interface Keybinding {
    id: string;
    command: string;
    args?: unknown[];
    key: KeyChord;
    when?: string;
    source: 'default' | 'user' | 'extension' | 'workspace';
    weight?: number;
    description?: string;
    category?: string;
}
/**
 * Keybinding conflict
 */
export interface KeybindingConflict {
    key: string;
    keybindings: Keybinding[];
    resolved?: Keybinding;
}
/**
 * Platform
 */
export type Platform = 'windows' | 'mac' | 'linux';
/**
 * Platform-specific keybinding
 */
export interface PlatformKeybinding {
    windows?: string;
    mac?: string;
    linux?: string;
}
/**
 * Keybinding preset
 */
export interface KeybindingPreset {
    id: string;
    name: string;
    description?: string;
    version: string;
    platform?: Platform;
    keybindings: Keybinding[];
    basePreset?: string;
    metadata?: {
        author?: string;
        url?: string;
        icon?: string;
    };
}
/**
 * Built-in presets
 */
export type BuiltInPreset = 'default' | 'vscode' | 'sublime' | 'vim' | 'emacs' | 'unreal' | 'blender' | 'maya' | 'davinci' | 'premiere';
/**
 * Keybinding changed event
 */
export interface KeybindingChangedEvent {
    keybinding: Keybinding;
    action: 'added' | 'removed' | 'modified';
}
/**
 * Key pressed event
 */
export interface KeyPressedEvent {
    key: KeyCombination;
    chord?: KeyChord;
    timestamp: number;
    handled: boolean;
    matchedKeybindings: Keybinding[];
}
export declare class KeybindingSystem {
    private readonly keybindings;
    private readonly keybindingsByKey;
    private readonly keybindingsByCommand;
    private platform;
    private currentChord;
    private chordTimeout;
    private readonly CHORD_TIMEOUT;
    private contextEvaluator;
    private readonly presets;
    private activePreset;
    private readonly userOverrides;
    private readonly disabledKeybindings;
    private readonly onKeybindingChangedEmitter;
    readonly onKeybindingChanged: Event<KeybindingChangedEvent>;
    private readonly onKeyPressedEmitter;
    readonly onKeyPressed: Event<KeyPressedEvent>;
    private readonly onChordStartedEmitter;
    readonly onChordStarted: Event<KeyCombination>;
    private readonly onChordCancelledEmitter;
    readonly onChordCancelled: Event<void>;
    private commandExecutor;
    constructor();
    /**
     * Detect current platform
     */
    private detectPlatform;
    /**
     * Get current platform
     */
    getPlatform(): Platform;
    /**
     * Set platform (for testing)
     */
    setPlatform(platform: Platform): void;
    /**
     * Register keybinding
     */
    registerKeybinding(keybinding: Keybinding): Disposable;
    /**
     * Register multiple keybindings
     */
    registerKeybindings(keybindings: Keybinding[]): Disposable;
    /**
     * Unregister keybinding
     */
    unregisterKeybinding(keybindingId: string): void;
    /**
     * Get keybinding by ID
     */
    getKeybinding(keybindingId: string): Keybinding | undefined;
    /**
     * Get all keybindings
     */
    getAllKeybindings(): Keybinding[];
    /**
     * Get keybindings for command
     */
    getKeybindingsForCommand(command: string): Keybinding[];
    /**
     * Get keybindings for key
     */
    getKeybindingsForKey(key: KeyChord | string): Keybinding[];
    /**
     * Parse key string to KeyChord
     */
    parseKeyString(keyString: string): KeyChord;
    /**
     * Parse single key combination
     */
    private parseKeyCombination;
    /**
     * Serialize KeyChord to string
     */
    serializeKeyChord(chord: KeyChord): string;
    /**
     * Serialize KeyCombination to string
     */
    private serializeKeyCombination;
    /**
     * Get display string for keybinding
     */
    getDisplayString(keybinding: Keybinding): string;
    /**
     * Get platform-specific display string
     */
    getPlatformDisplayString(keybinding: Keybinding, platform?: Platform): string;
    /**
     * Handle key down event
     */
    handleKeyDown(event: KeyboardEvent): boolean;
    /**
     * Handle key down during chord
     */
    private handleChordKeyDown;
    /**
     * Convert keyboard event to key combination
     */
    private eventToKeyCombination;
    /**
     * Normalize key name
     */
    private normalizeKeyName;
    /**
     * Start chord
     */
    private startChord;
    /**
     * Cancel chord
     */
    private cancelChord;
    /**
     * Find matching keybindings for single key combination
     */
    private findMatchingKeybindings;
    /**
     * Execute keybinding
     */
    private executeKeybinding;
    /**
     * Set command executor
     */
    setCommandExecutor(executor: (command: string, ...args: unknown[]) => Promise<void>): void;
    /**
     * Set context evaluator
     */
    setContextEvaluator(evaluator: (expression: string) => boolean): void;
    /**
     * Evaluate context expression
     */
    private evaluateContext;
    /**
     * Detect keybinding conflicts
     */
    detectConflicts(): KeybindingConflict[];
    /**
     * Find conflicting pairs of keybindings
     */
    private findConflictingPairs;
    /**
     * Check if when clauses could overlap
     */
    private whenClausesCouldOverlap;
    /**
     * Extract context keys from when expression
     */
    private extractContextKeys;
    /**
     * Initialize default preset
     */
    private initializeDefaultPreset;
    /**
     * Initialize built-in presets
     */
    private initializeBuiltInPresets;
    /**
     * Get default keybindings
     */
    private getDefaultKeybindings;
    /**
     * Get VS Code keybindings
     */
    private getVSCodeKeybindings;
    /**
     * Get Unreal Engine keybindings
     */
    private getUnrealKeybindings;
    /**
     * Get DaVinci Resolve keybindings
     */
    private getDaVinciKeybindings;
    /**
     * Get Blender keybindings
     */
    private getBlenderKeybindings;
    /**
     * Load preset
     */
    loadPreset(presetId: string): void;
    /**
     * Get active preset
     */
    getActivePreset(): string;
    /**
     * Get all presets
     */
    getAllPresets(): KeybindingPreset[];
    /**
     * Import preset from JSON
     */
    importPreset(json: string): KeybindingPreset;
    /**
     * Export preset to JSON
     */
    exportPreset(presetId: string): string;
    /**
     * Set user keybinding
     */
    setUserKeybinding(keybinding: Omit<Keybinding, 'source'>): void;
    /**
     * Remove user keybinding
     */
    removeUserKeybinding(keybindingId: string): void;
    /**
     * Disable keybinding
     */
    disableKeybinding(keybindingId: string): void;
    /**
     * Enable keybinding
     */
    enableKeybinding(keybindingId: string): void;
    /**
     * Get user keybindings
     */
    getUserKeybindings(): Keybinding[];
    /**
     * Export user keybindings
     */
    exportUserKeybindings(): string;
    /**
     * Import user keybindings
     */
    importUserKeybindings(json: string): void;
    /**
     * Reset to defaults
     */
    resetToDefaults(): void;
    /**
     * Dispose
     */
    dispose(): void;
}
interface Disposable {
    dispose(): void;
}
export default KeybindingSystem;
