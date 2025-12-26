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

import { injectable, inject, optional } from 'inversify';

// Theia-compatible Emitter implementation
type Event<T> = (listener: (e: T) => void) => { dispose: () => void };

class Emitter<T> {
    private listeners: Array<(e: T) => void> = [];
    
    get event(): Event<T> {
        return (listener: (e: T) => void) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0) this.listeners.splice(idx, 1);
                }
            };
        };
    }
    
    fire(event: T): void {
        this.listeners.forEach(l => l(event));
    }
    
    dispose(): void {
        this.listeners = [];
    }
}

// ==================== Key Types ====================

/**
 * Modifier keys
 */
export enum KeyModifier {
    Ctrl = 'ctrl',
    Shift = 'shift',
    Alt = 'alt',
    Meta = 'meta', // Cmd on Mac, Win key on Windows
    CtrlCmd = 'ctrlcmd' // Ctrl on Win/Linux, Cmd on Mac
}

/**
 * Special keys
 */
export enum SpecialKey {
    // Function keys
    F1 = 'f1', F2 = 'f2', F3 = 'f3', F4 = 'f4', F5 = 'f5',
    F6 = 'f6', F7 = 'f7', F8 = 'f8', F9 = 'f9', F10 = 'f10',
    F11 = 'f11', F12 = 'f12',
    
    // Navigation
    Escape = 'escape',
    Tab = 'tab',
    CapsLock = 'capslock',
    Space = 'space',
    Enter = 'enter',
    Backspace = 'backspace',
    Delete = 'delete',
    Insert = 'insert',
    Home = 'home',
    End = 'end',
    PageUp = 'pageup',
    PageDown = 'pagedown',
    
    // Arrows
    Up = 'up',
    Down = 'down',
    Left = 'left',
    Right = 'right',
    
    // Numpad
    NumPad0 = 'numpad0', NumPad1 = 'numpad1', NumPad2 = 'numpad2',
    NumPad3 = 'numpad3', NumPad4 = 'numpad4', NumPad5 = 'numpad5',
    NumPad6 = 'numpad6', NumPad7 = 'numpad7', NumPad8 = 'numpad8',
    NumPad9 = 'numpad9',
    NumPadMultiply = 'numpad_multiply',
    NumPadAdd = 'numpad_add',
    NumPadSubtract = 'numpad_subtract',
    NumPadDecimal = 'numpad_decimal',
    NumPadDivide = 'numpad_divide',
    
    // Special characters
    Semicolon = 'semicolon',
    Equal = 'equal',
    Comma = 'comma',
    Minus = 'minus',
    Period = 'period',
    Slash = 'slash',
    Backquote = 'backquote',
    BracketLeft = 'bracketleft',
    Backslash = 'backslash',
    BracketRight = 'bracketright',
    Quote = 'quote'
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

// ==================== Platform Types ====================

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

// ==================== Preset Types ====================

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
export type BuiltInPreset = 
    | 'default'
    | 'vscode'
    | 'sublime'
    | 'vim'
    | 'emacs'
    | 'unreal'
    | 'blender'
    | 'maya'
    | 'davinci'
    | 'premiere';

// ==================== Events ====================

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

// ==================== Main Keybinding System ====================

@injectable()
export class KeybindingSystem {
    // Keybinding registry
    private readonly keybindings: Map<string, Keybinding> = new Map();
    private readonly keybindingsByKey: Map<string, Set<string>> = new Map();
    private readonly keybindingsByCommand: Map<string, Set<string>> = new Map();
    
    // Platform
    private platform: Platform = 'windows';
    
    // Chord handling
    private currentChord: KeyCombination[] = [];
    private chordTimeout: ReturnType<typeof setTimeout> | null = null;
    private readonly CHORD_TIMEOUT = 2000;
    
    // Context evaluation
    private contextEvaluator: ((expression: string) => boolean) | null = null;
    
    // Presets
    private readonly presets: Map<string, KeybindingPreset> = new Map();
    private activePreset: string = 'default';
    
    // User customizations
    private readonly userOverrides: Map<string, Keybinding> = new Map();
    private readonly disabledKeybindings: Set<string> = new Set();
    
    // Events
    private readonly onKeybindingChangedEmitter = new Emitter<KeybindingChangedEvent>();
    readonly onKeybindingChanged: Event<KeybindingChangedEvent> = this.onKeybindingChangedEmitter.event;
    
    private readonly onKeyPressedEmitter = new Emitter<KeyPressedEvent>();
    readonly onKeyPressed: Event<KeyPressedEvent> = this.onKeyPressedEmitter.event;
    
    private readonly onChordStartedEmitter = new Emitter<KeyCombination>();
    readonly onChordStarted: Event<KeyCombination> = this.onChordStartedEmitter.event;
    
    private readonly onChordCancelledEmitter = new Emitter<void>();
    readonly onChordCancelled: Event<void> = this.onChordCancelledEmitter.event;

    // Command executor
    private commandExecutor: ((command: string, ...args: unknown[]) => Promise<void>) | null = null;

    constructor() {
        this.detectPlatform();
        this.initializeDefaultPreset();
        this.initializeBuiltInPresets();
    }

    // ==================== Platform Detection ====================

    /**
     * Detect current platform
     */
    private detectPlatform(): void {
        if (typeof navigator !== 'undefined') {
            const platform = navigator.platform.toLowerCase();
            if (platform.includes('mac')) {
                this.platform = 'mac';
            } else if (platform.includes('linux')) {
                this.platform = 'linux';
            } else {
                this.platform = 'windows';
            }
        } else if (typeof process !== 'undefined') {
            switch (process.platform) {
                case 'darwin': this.platform = 'mac'; break;
                case 'linux': this.platform = 'linux'; break;
                default: this.platform = 'windows';
            }
        }
    }

    /**
     * Get current platform
     */
    getPlatform(): Platform {
        return this.platform;
    }

    /**
     * Set platform (for testing)
     */
    setPlatform(platform: Platform): void {
        this.platform = platform;
    }

    // ==================== Keybinding Registration ====================

    /**
     * Register keybinding
     */
    registerKeybinding(keybinding: Keybinding): Disposable {
        // Parse key string if needed
        if (typeof keybinding.key === 'string') {
            keybinding.key = this.parseKeyString(keybinding.key as unknown as string);
        }

        // Generate ID if not provided
        if (!keybinding.id) {
            keybinding.id = `kb_${keybinding.command}_${this.serializeKeyChord(keybinding.key)}`;
        }

        this.keybindings.set(keybinding.id, keybinding);

        // Index by key
        const keyString = this.serializeKeyChord(keybinding.key);
        if (!this.keybindingsByKey.has(keyString)) {
            this.keybindingsByKey.set(keyString, new Set());
        }
        this.keybindingsByKey.get(keyString)!.add(keybinding.id);

        // Index by command
        if (!this.keybindingsByCommand.has(keybinding.command)) {
            this.keybindingsByCommand.set(keybinding.command, new Set());
        }
        this.keybindingsByCommand.get(keybinding.command)!.add(keybinding.id);

        this.onKeybindingChangedEmitter.fire({
            keybinding,
            action: 'added'
        });

        return {
            dispose: () => this.unregisterKeybinding(keybinding.id)
        };
    }

    /**
     * Register multiple keybindings
     */
    registerKeybindings(keybindings: Keybinding[]): Disposable {
        const disposables = keybindings.map(kb => this.registerKeybinding(kb));
        return {
            dispose: () => disposables.forEach(d => d.dispose())
        };
    }

    /**
     * Unregister keybinding
     */
    unregisterKeybinding(keybindingId: string): void {
        const keybinding = this.keybindings.get(keybindingId);
        if (!keybinding) return;

        this.keybindings.delete(keybindingId);

        // Remove from key index
        const keyString = this.serializeKeyChord(keybinding.key);
        this.keybindingsByKey.get(keyString)?.delete(keybindingId);

        // Remove from command index
        this.keybindingsByCommand.get(keybinding.command)?.delete(keybindingId);

        this.onKeybindingChangedEmitter.fire({
            keybinding,
            action: 'removed'
        });
    }

    /**
     * Get keybinding by ID
     */
    getKeybinding(keybindingId: string): Keybinding | undefined {
        return this.keybindings.get(keybindingId);
    }

    /**
     * Get all keybindings
     */
    getAllKeybindings(): Keybinding[] {
        return Array.from(this.keybindings.values());
    }

    /**
     * Get keybindings for command
     */
    getKeybindingsForCommand(command: string): Keybinding[] {
        const keybindingIds = this.keybindingsByCommand.get(command);
        if (!keybindingIds) return [];
        return Array.from(keybindingIds)
            .map(id => this.keybindings.get(id))
            .filter((kb): kb is Keybinding => kb !== undefined);
    }

    /**
     * Get keybindings for key
     */
    getKeybindingsForKey(key: KeyChord | string): Keybinding[] {
        const keyString = typeof key === 'string' ? key : this.serializeKeyChord(key);
        const keybindingIds = this.keybindingsByKey.get(keyString);
        if (!keybindingIds) return [];
        return Array.from(keybindingIds)
            .map(id => this.keybindings.get(id))
            .filter((kb): kb is Keybinding => kb !== undefined);
    }

    // ==================== Key Parsing ====================

    /**
     * Parse key string to KeyChord
     */
    parseKeyString(keyString: string): KeyChord {
        const parts = keyString.split(/\s+/);
        return {
            parts: parts.map(part => this.parseKeyCombination(part))
        };
    }

    /**
     * Parse single key combination
     */
    private parseKeyCombination(keyString: string): KeyCombination {
        const parts = keyString.toLowerCase().split('+');
        const modifiers: KeyModifier[] = [];
        let key = '';

        for (const part of parts) {
            switch (part) {
                case 'ctrl':
                case 'control':
                    modifiers.push(KeyModifier.Ctrl);
                    break;
                case 'shift':
                    modifiers.push(KeyModifier.Shift);
                    break;
                case 'alt':
                case 'option':
                    modifiers.push(KeyModifier.Alt);
                    break;
                case 'meta':
                case 'cmd':
                case 'command':
                case 'win':
                case 'windows':
                case 'super':
                    modifiers.push(KeyModifier.Meta);
                    break;
                case 'ctrlcmd':
                case 'mod':
                    modifiers.push(KeyModifier.CtrlCmd);
                    break;
                default:
                    key = part;
            }
        }

        return { key, modifiers };
    }

    /**
     * Serialize KeyChord to string
     */
    serializeKeyChord(chord: KeyChord): string {
        return chord.parts.map(part => this.serializeKeyCombination(part)).join(' ');
    }

    /**
     * Serialize KeyCombination to string
     */
    private serializeKeyCombination(combination: KeyCombination): string {
        const parts: string[] = [];
        
        // Sort modifiers for consistent ordering
        const sortedModifiers = [...combination.modifiers].sort();
        
        for (const modifier of sortedModifiers) {
            switch (modifier) {
                case KeyModifier.Ctrl: parts.push('Ctrl'); break;
                case KeyModifier.Shift: parts.push('Shift'); break;
                case KeyModifier.Alt: parts.push('Alt'); break;
                case KeyModifier.Meta: 
                    parts.push(this.platform === 'mac' ? 'Cmd' : 'Win'); 
                    break;
                case KeyModifier.CtrlCmd:
                    parts.push(this.platform === 'mac' ? 'Cmd' : 'Ctrl');
                    break;
            }
        }
        
        parts.push(combination.key.toUpperCase());
        return parts.join('+');
    }

    /**
     * Get display string for keybinding
     */
    getDisplayString(keybinding: Keybinding): string {
        return this.serializeKeyChord(keybinding.key);
    }

    /**
     * Get platform-specific display string
     */
    getPlatformDisplayString(keybinding: Keybinding, platform?: Platform): string {
        const p = platform || this.platform;
        
        return keybinding.key.parts.map(part => {
            const symbols: string[] = [];
            
            for (const modifier of part.modifiers.sort()) {
                if (p === 'mac') {
                    switch (modifier) {
                        case KeyModifier.Ctrl: symbols.push('⌃'); break;
                        case KeyModifier.Shift: symbols.push('⇧'); break;
                        case KeyModifier.Alt: symbols.push('⌥'); break;
                        case KeyModifier.Meta: symbols.push('⌘'); break;
                        case KeyModifier.CtrlCmd: symbols.push('⌘'); break;
                    }
                } else {
                    switch (modifier) {
                        case KeyModifier.Ctrl: symbols.push('Ctrl'); break;
                        case KeyModifier.Shift: symbols.push('Shift'); break;
                        case KeyModifier.Alt: symbols.push('Alt'); break;
                        case KeyModifier.Meta: symbols.push('Win'); break;
                        case KeyModifier.CtrlCmd: symbols.push('Ctrl'); break;
                    }
                }
            }
            
            // Format key
            let keyDisplay = part.key.toUpperCase();
            if (p === 'mac') {
                switch (part.key.toLowerCase()) {
                    case 'enter': keyDisplay = '↵'; break;
                    case 'tab': keyDisplay = '⇥'; break;
                    case 'escape': keyDisplay = '⎋'; break;
                    case 'backspace': keyDisplay = '⌫'; break;
                    case 'delete': keyDisplay = '⌦'; break;
                    case 'up': keyDisplay = '↑'; break;
                    case 'down': keyDisplay = '↓'; break;
                    case 'left': keyDisplay = '←'; break;
                    case 'right': keyDisplay = '→'; break;
                    case 'space': keyDisplay = '␣'; break;
                }
            }
            
            symbols.push(keyDisplay);
            return symbols.join(p === 'mac' ? '' : '+');
        }).join(' ');
    }

    // ==================== Key Event Handling ====================

    /**
     * Handle key down event
     */
    handleKeyDown(event: KeyboardEvent): boolean {
        // Build key combination from event
        const combination = this.eventToKeyCombination(event);
        if (!combination) return false;

        // Check for chord continuation
        if (this.currentChord.length > 0) {
            return this.handleChordKeyDown(combination, event);
        }

        // Find matching keybindings
        const matches = this.findMatchingKeybindings(combination);
        
        // Check if any match is a chord starter
        const chordStarters = matches.filter(kb => kb.key.parts.length > 1);
        if (chordStarters.length > 0) {
            this.startChord(combination);
            event.preventDefault();
            return true;
        }

        // Filter by context
        const contextMatches = matches.filter(kb => this.evaluateContext(kb.when));
        
        // Check for disabled keybindings
        const activeMatches = contextMatches.filter(kb => !this.disabledKeybindings.has(kb.id));
        
        // Sort by weight and source
        activeMatches.sort((a, b) => {
            // User overrides have highest priority
            if (a.source === 'user' && b.source !== 'user') return -1;
            if (b.source === 'user' && a.source !== 'user') return 1;
            
            // Then weight
            return (b.weight || 0) - (a.weight || 0);
        });

        // Fire event
        this.onKeyPressedEmitter.fire({
            key: combination,
            timestamp: Date.now(),
            handled: activeMatches.length > 0,
            matchedKeybindings: activeMatches
        });

        // Execute first match
        if (activeMatches.length > 0) {
            const keybinding = activeMatches[0];
            this.executeKeybinding(keybinding);
            event.preventDefault();
            return true;
        }

        return false;
    }

    /**
     * Handle key down during chord
     */
    private handleChordKeyDown(combination: KeyCombination, event: KeyboardEvent): boolean {
        this.currentChord.push(combination);
        
        // Clear chord timeout
        if (this.chordTimeout) {
            clearTimeout(this.chordTimeout);
            this.chordTimeout = null;
        }

        // Build current chord
        const currentChordObj: KeyChord = { parts: [...this.currentChord] };
        const chordString = this.serializeKeyChord(currentChordObj);

        // Find exact matches
        const matches = this.getKeybindingsForKey(chordString)
            .filter(kb => this.evaluateContext(kb.when))
            .filter(kb => !this.disabledKeybindings.has(kb.id));

        // Fire event
        this.onKeyPressedEmitter.fire({
            key: combination,
            chord: currentChordObj,
            timestamp: Date.now(),
            handled: matches.length > 0,
            matchedKeybindings: matches
        });

        if (matches.length > 0) {
            // Execute first match
            this.cancelChord();
            this.executeKeybinding(matches[0]);
            event.preventDefault();
            return true;
        }

        // Check if any keybinding could still match (partial chord)
        const partialMatches = Array.from(this.keybindings.values())
            .filter(kb => {
                const kbString = this.serializeKeyChord(kb.key);
                return kbString.startsWith(chordString + ' ');
            });

        if (partialMatches.length > 0) {
            // Continue chord
            this.chordTimeout = setTimeout(() => this.cancelChord(), this.CHORD_TIMEOUT);
            event.preventDefault();
            return true;
        }

        // No match possible, cancel chord
        this.cancelChord();
        return false;
    }

    /**
     * Convert keyboard event to key combination
     */
    private eventToKeyCombination(event: KeyboardEvent): KeyCombination | null {
        const modifiers: KeyModifier[] = [];
        
        if (event.ctrlKey) modifiers.push(KeyModifier.Ctrl);
        if (event.shiftKey) modifiers.push(KeyModifier.Shift);
        if (event.altKey) modifiers.push(KeyModifier.Alt);
        if (event.metaKey) modifiers.push(KeyModifier.Meta);

        // Get key
        let key = event.key.toLowerCase();
        
        // Normalize key names
        key = this.normalizeKeyName(key, event.code);
        
        // Skip if key is just a modifier
        if (['control', 'shift', 'alt', 'meta', 'os'].includes(key)) {
            return null;
        }

        return { key, modifiers };
    }

    /**
     * Normalize key name
     */
    private normalizeKeyName(key: string, code: string): string {
        // Use code for special keys
        const codeMap: Record<string, string> = {
            'Space': 'space',
            'Tab': 'tab',
            'Enter': 'enter',
            'NumpadEnter': 'enter',
            'Escape': 'escape',
            'Backspace': 'backspace',
            'Delete': 'delete',
            'Insert': 'insert',
            'Home': 'home',
            'End': 'end',
            'PageUp': 'pageup',
            'PageDown': 'pagedown',
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'CapsLock': 'capslock'
        };

        if (codeMap[code]) {
            return codeMap[code];
        }

        // F keys
        if (code.startsWith('F') && /^F\d+$/.test(code)) {
            return code.toLowerCase();
        }

        // Numpad
        if (code.startsWith('Numpad')) {
            return code.toLowerCase().replace('numpad', 'numpad');
        }

        // Letter and digit keys
        if (/^Key[A-Z]$/.test(code)) {
            return code.charAt(3).toLowerCase();
        }
        if (/^Digit\d$/.test(code)) {
            return code.charAt(5);
        }

        // Special characters
        const specialMap: Record<string, string> = {
            'Semicolon': 'semicolon',
            'Equal': 'equal',
            'Comma': 'comma',
            'Minus': 'minus',
            'Period': 'period',
            'Slash': 'slash',
            'Backquote': 'backquote',
            'BracketLeft': 'bracketleft',
            'Backslash': 'backslash',
            'BracketRight': 'bracketright',
            'Quote': 'quote'
        };

        if (specialMap[code]) {
            return specialMap[code];
        }

        return key;
    }

    /**
     * Start chord
     */
    private startChord(firstKey: KeyCombination): void {
        this.currentChord = [firstKey];
        this.chordTimeout = setTimeout(() => this.cancelChord(), this.CHORD_TIMEOUT);
        this.onChordStartedEmitter.fire(firstKey);
    }

    /**
     * Cancel chord
     */
    private cancelChord(): void {
        if (this.chordTimeout) {
            clearTimeout(this.chordTimeout);
            this.chordTimeout = null;
        }
        
        if (this.currentChord.length > 0) {
            this.currentChord = [];
            this.onChordCancelledEmitter.fire();
        }
    }

    /**
     * Find matching keybindings for single key combination
     */
    private findMatchingKeybindings(combination: KeyCombination): Keybinding[] {
        const chord: KeyChord = { parts: [combination] };
        return this.getKeybindingsForKey(this.serializeKeyChord(chord));
    }

    /**
     * Execute keybinding
     */
    private async executeKeybinding(keybinding: Keybinding): Promise<void> {
        if (this.commandExecutor) {
            await this.commandExecutor(keybinding.command, ...(keybinding.args || []));
        }
    }

    /**
     * Set command executor
     */
    setCommandExecutor(executor: (command: string, ...args: unknown[]) => Promise<void>): void {
        this.commandExecutor = executor;
    }

    /**
     * Set context evaluator
     */
    setContextEvaluator(evaluator: (expression: string) => boolean): void {
        this.contextEvaluator = evaluator;
    }

    /**
     * Evaluate context expression
     */
    private evaluateContext(expression?: string): boolean {
        if (!expression) return true;
        if (!this.contextEvaluator) return true;
        return this.contextEvaluator(expression);
    }

    // ==================== Conflict Detection ====================

    /**
     * Detect keybinding conflicts
     */
    detectConflicts(): KeybindingConflict[] {
        const conflicts: KeybindingConflict[] = [];
        const keyGroups = new Map<string, Keybinding[]>();

        for (const keybinding of this.keybindings.values()) {
            const keyString = this.serializeKeyChord(keybinding.key);
            
            if (!keyGroups.has(keyString)) {
                keyGroups.set(keyString, []);
            }
            keyGroups.get(keyString)!.push(keybinding);
        }

        for (const [keyString, keybindings] of keyGroups) {
            if (keybindings.length > 1) {
                // Check for actual conflicts (overlapping when clauses)
                const conflictingPairs = this.findConflictingPairs(keybindings);
                
                if (conflictingPairs.length > 0) {
                    // Sort by priority
                    const sorted = [...keybindings].sort((a, b) => {
                        if (a.source === 'user') return -1;
                        if (b.source === 'user') return 1;
                        return (b.weight || 0) - (a.weight || 0);
                    });

                    conflicts.push({
                        key: keyString,
                        keybindings,
                        resolved: sorted[0]
                    });
                }
            }
        }

        return conflicts;
    }

    /**
     * Find conflicting pairs of keybindings
     */
    private findConflictingPairs(keybindings: Keybinding[]): [Keybinding, Keybinding][] {
        const pairs: [Keybinding, Keybinding][] = [];
        
        for (let i = 0; i < keybindings.length; i++) {
            for (let j = i + 1; j < keybindings.length; j++) {
                const a = keybindings[i];
                const b = keybindings[j];
                
                // If both have no when clause, they conflict
                if (!a.when && !b.when) {
                    pairs.push([a, b]);
                    continue;
                }
                
                // If one has no when clause, it might conflict
                if (!a.when || !b.when) {
                    pairs.push([a, b]);
                    continue;
                }
                
                // Check if when clauses could overlap
                // This is a simplified check - in reality you'd need proper expression analysis
                if (this.whenClausesCouldOverlap(a.when, b.when)) {
                    pairs.push([a, b]);
                }
            }
        }
        
        return pairs;
    }

    /**
     * Check if when clauses could overlap
     */
    private whenClausesCouldOverlap(when1: string, when2: string): boolean {
        // Simplified check: if clauses reference different contexts, they don't overlap
        const contexts1 = this.extractContextKeys(when1);
        const contexts2 = this.extractContextKeys(when2);
        
        // If completely different contexts, no overlap
        const shared = contexts1.filter(c => contexts2.includes(c));
        if (shared.length === 0 && contexts1.length > 0 && contexts2.length > 0) {
            return false;
        }
        
        // Potentially overlapping
        return true;
    }

    /**
     * Extract context keys from when expression
     */
    private extractContextKeys(expression: string): string[] {
        const regex = /[a-zA-Z_][a-zA-Z0-9_.-]*/g;
        const matches = expression.match(regex) || [];
        return matches.filter(m => 
            !['true', 'false', 'and', 'or', 'not', 'in', 'notin'].includes(m.toLowerCase())
        );
    }

    // ==================== Presets ====================

    /**
     * Initialize default preset
     */
    private initializeDefaultPreset(): void {
        const defaultPreset: KeybindingPreset = {
            id: 'default',
            name: 'Default',
            description: 'Default keybindings for Aethel Engine IDE',
            version: '1.0.0',
            keybindings: this.getDefaultKeybindings()
        };

        this.presets.set('default', defaultPreset);
        this.loadPreset('default');
    }

    /**
     * Initialize built-in presets
     */
    private initializeBuiltInPresets(): void {
        // VS Code preset
        this.presets.set('vscode', {
            id: 'vscode',
            name: 'Visual Studio Code',
            description: 'Keybindings similar to VS Code',
            version: '1.0.0',
            basePreset: 'default',
            keybindings: this.getVSCodeKeybindings()
        });

        // Unreal preset
        this.presets.set('unreal', {
            id: 'unreal',
            name: 'Unreal Engine',
            description: 'Keybindings similar to Unreal Engine',
            version: '1.0.0',
            basePreset: 'default',
            keybindings: this.getUnrealKeybindings()
        });

        // DaVinci Resolve preset
        this.presets.set('davinci', {
            id: 'davinci',
            name: 'DaVinci Resolve',
            description: 'Keybindings similar to DaVinci Resolve',
            version: '1.0.0',
            basePreset: 'default',
            keybindings: this.getDaVinciKeybindings()
        });

        // Blender preset
        this.presets.set('blender', {
            id: 'blender',
            name: 'Blender',
            description: 'Keybindings similar to Blender',
            version: '1.0.0',
            basePreset: 'default',
            keybindings: this.getBlenderKeybindings()
        });
    }

    /**
     * Get default keybindings
     */
    private getDefaultKeybindings(): Keybinding[] {
        return [
            // File operations
            { id: 'kb.newFile', command: 'file.new', key: this.parseKeyString('ctrlcmd+n'), source: 'default', category: 'File' },
            { id: 'kb.openFile', command: 'file.open', key: this.parseKeyString('ctrlcmd+o'), source: 'default', category: 'File' },
            { id: 'kb.save', command: 'file.save', key: this.parseKeyString('ctrlcmd+s'), source: 'default', category: 'File' },
            { id: 'kb.saveAs', command: 'file.saveAs', key: this.parseKeyString('ctrlcmd+shift+s'), source: 'default', category: 'File' },
            { id: 'kb.saveAll', command: 'file.saveAll', key: this.parseKeyString('ctrlcmd+alt+s'), source: 'default', category: 'File' },
            { id: 'kb.close', command: 'file.close', key: this.parseKeyString('ctrlcmd+w'), source: 'default', category: 'File' },
            
            // Edit operations
            { id: 'kb.undo', command: 'edit.undo', key: this.parseKeyString('ctrlcmd+z'), source: 'default', category: 'Edit' },
            { id: 'kb.redo', command: 'edit.redo', key: this.parseKeyString('ctrlcmd+shift+z'), source: 'default', category: 'Edit' },
            { id: 'kb.cut', command: 'edit.cut', key: this.parseKeyString('ctrlcmd+x'), source: 'default', category: 'Edit' },
            { id: 'kb.copy', command: 'edit.copy', key: this.parseKeyString('ctrlcmd+c'), source: 'default', category: 'Edit' },
            { id: 'kb.paste', command: 'edit.paste', key: this.parseKeyString('ctrlcmd+v'), source: 'default', category: 'Edit' },
            { id: 'kb.selectAll', command: 'edit.selectAll', key: this.parseKeyString('ctrlcmd+a'), source: 'default', category: 'Edit' },
            { id: 'kb.find', command: 'edit.find', key: this.parseKeyString('ctrlcmd+f'), source: 'default', category: 'Edit' },
            { id: 'kb.replace', command: 'edit.replace', key: this.parseKeyString('ctrlcmd+h'), source: 'default', category: 'Edit' },
            { id: 'kb.duplicate', command: 'edit.duplicate', key: this.parseKeyString('ctrlcmd+d'), source: 'default', category: 'Edit' },
            { id: 'kb.delete', command: 'edit.delete', key: this.parseKeyString('delete'), source: 'default', category: 'Edit' },
            
            // View operations
            { id: 'kb.commandPalette', command: 'workbench.action.showCommands', key: this.parseKeyString('ctrlcmd+shift+p'), source: 'default', category: 'View' },
            { id: 'kb.quickOpen', command: 'workbench.action.quickOpen', key: this.parseKeyString('ctrlcmd+p'), source: 'default', category: 'View' },
            { id: 'kb.goToLine', command: 'editor.action.goToLine', key: this.parseKeyString('ctrlcmd+g'), source: 'default', category: 'View' },
            { id: 'kb.zoomIn', command: 'view.zoomIn', key: this.parseKeyString('ctrlcmd+equal'), source: 'default', category: 'View' },
            { id: 'kb.zoomOut', command: 'view.zoomOut', key: this.parseKeyString('ctrlcmd+minus'), source: 'default', category: 'View' },
            { id: 'kb.zoomReset', command: 'view.zoomReset', key: this.parseKeyString('ctrlcmd+0'), source: 'default', category: 'View' },
            { id: 'kb.toggleSidebar', command: 'view.toggleSidebar', key: this.parseKeyString('ctrlcmd+b'), source: 'default', category: 'View' },
            { id: 'kb.togglePanel', command: 'view.togglePanel', key: this.parseKeyString('ctrlcmd+j'), source: 'default', category: 'View' },
            { id: 'kb.fullscreen', command: 'view.fullscreen', key: this.parseKeyString('f11'), source: 'default', category: 'View' },
            
            // Navigation
            { id: 'kb.goToDefinition', command: 'editor.action.goToDefinition', key: this.parseKeyString('f12'), source: 'default', when: 'editorFocus', category: 'Navigation' },
            { id: 'kb.peekDefinition', command: 'editor.action.peekDefinition', key: this.parseKeyString('alt+f12'), source: 'default', when: 'editorFocus', category: 'Navigation' },
            { id: 'kb.goBack', command: 'navigation.back', key: this.parseKeyString('alt+left'), source: 'default', category: 'Navigation' },
            { id: 'kb.goForward', command: 'navigation.forward', key: this.parseKeyString('alt+right'), source: 'default', category: 'Navigation' },
            
            // Terminal
            { id: 'kb.toggleTerminal', command: 'terminal.toggle', key: this.parseKeyString('ctrlcmd+backtick'), source: 'default', category: 'Terminal' },
            { id: 'kb.newTerminal', command: 'terminal.new', key: this.parseKeyString('ctrlcmd+shift+backtick'), source: 'default', category: 'Terminal' },
            
            // Debug
            { id: 'kb.startDebug', command: 'debug.start', key: this.parseKeyString('f5'), source: 'default', category: 'Debug' },
            { id: 'kb.stopDebug', command: 'debug.stop', key: this.parseKeyString('shift+f5'), source: 'default', category: 'Debug' },
            { id: 'kb.stepOver', command: 'debug.stepOver', key: this.parseKeyString('f10'), source: 'default', when: 'debugMode', category: 'Debug' },
            { id: 'kb.stepInto', command: 'debug.stepInto', key: this.parseKeyString('f11'), source: 'default', when: 'debugMode', category: 'Debug' },
            { id: 'kb.stepOut', command: 'debug.stepOut', key: this.parseKeyString('shift+f11'), source: 'default', when: 'debugMode', category: 'Debug' },
            { id: 'kb.toggleBreakpoint', command: 'debug.toggleBreakpoint', key: this.parseKeyString('f9'), source: 'default', when: 'editorFocus', category: 'Debug' },
            
            // 3D Viewport
            { id: 'kb.viewport.translate', command: 'viewport.translate', key: this.parseKeyString('w'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            { id: 'kb.viewport.rotate', command: 'viewport.rotate', key: this.parseKeyString('e'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            { id: 'kb.viewport.scale', command: 'viewport.scale', key: this.parseKeyString('r'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            { id: 'kb.viewport.frame', command: 'viewport.frameSelected', key: this.parseKeyString('f'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            { id: 'kb.viewport.focus', command: 'viewport.focusSelected', key: this.parseKeyString('numpad_period'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            { id: 'kb.viewport.perspective', command: 'viewport.perspective', key: this.parseKeyString('numpad5'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            { id: 'kb.viewport.top', command: 'viewport.viewTop', key: this.parseKeyString('numpad7'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            { id: 'kb.viewport.front', command: 'viewport.viewFront', key: this.parseKeyString('numpad1'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            { id: 'kb.viewport.right', command: 'viewport.viewRight', key: this.parseKeyString('numpad3'), source: 'default', when: 'viewportFocus', category: '3D Viewport' },
            
            // Timeline
            { id: 'kb.timeline.play', command: 'timeline.playPause', key: this.parseKeyString('space'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'kb.timeline.stop', command: 'timeline.stop', key: this.parseKeyString('escape'), source: 'default', when: 'timelineFocus && playing', category: 'Timeline' },
            { id: 'kb.timeline.nextFrame', command: 'timeline.nextFrame', key: this.parseKeyString('right'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'kb.timeline.prevFrame', command: 'timeline.prevFrame', key: this.parseKeyString('left'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'kb.timeline.start', command: 'timeline.goToStart', key: this.parseKeyString('home'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'kb.timeline.end', command: 'timeline.goToEnd', key: this.parseKeyString('end'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'kb.timeline.cut', command: 'timeline.razorCut', key: this.parseKeyString('c'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'kb.timeline.ripple', command: 'timeline.rippleDelete', key: this.parseKeyString('shift+delete'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'kb.timeline.mark.in', command: 'timeline.markIn', key: this.parseKeyString('i'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'kb.timeline.mark.out', command: 'timeline.markOut', key: this.parseKeyString('o'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            
            // Selection
            { id: 'kb.selectNext', command: 'selection.next', key: this.parseKeyString('tab'), source: 'default', when: 'viewportFocus || timelineFocus', category: 'Selection' },
            { id: 'kb.selectPrev', command: 'selection.prev', key: this.parseKeyString('shift+tab'), source: 'default', when: 'viewportFocus || timelineFocus', category: 'Selection' },
            { id: 'kb.selectParent', command: 'selection.parent', key: this.parseKeyString('p'), source: 'default', when: 'viewportFocus', category: 'Selection' },
            { id: 'kb.selectChildren', command: 'selection.children', key: this.parseKeyString('shift+p'), source: 'default', when: 'viewportFocus', category: 'Selection' },
            
            // Layers
            { id: 'kb.layer.new', command: 'layer.new', key: this.parseKeyString('ctrlcmd+shift+n'), source: 'default', category: 'Layer' },
            { id: 'kb.layer.group', command: 'layer.group', key: this.parseKeyString('ctrlcmd+g'), source: 'default', when: 'hasSelection', category: 'Layer' },
            { id: 'kb.layer.ungroup', command: 'layer.ungroup', key: this.parseKeyString('ctrlcmd+shift+g'), source: 'default', when: 'hasSelection', category: 'Layer' },
            { id: 'kb.layer.lock', command: 'layer.lock', key: this.parseKeyString('ctrlcmd+l'), source: 'default', when: 'hasSelection', category: 'Layer' },
            { id: 'kb.layer.hide', command: 'layer.hide', key: this.parseKeyString('h'), source: 'default', when: 'hasSelection', category: 'Layer' },
            
            // Rendering
            { id: 'kb.render', command: 'render.start', key: this.parseKeyString('ctrlcmd+shift+r'), source: 'default', category: 'Render' },
            { id: 'kb.renderPreview', command: 'render.preview', key: this.parseKeyString('f6'), source: 'default', category: 'Render' },
            
            // Tools
            { id: 'kb.tool.select', command: 'tool.select', key: this.parseKeyString('v'), source: 'default', category: 'Tools' },
            { id: 'kb.tool.move', command: 'tool.move', key: this.parseKeyString('m'), source: 'default', category: 'Tools' },
            { id: 'kb.tool.pen', command: 'tool.pen', key: this.parseKeyString('p'), source: 'default', when: '!viewportFocus', category: 'Tools' },
            { id: 'kb.tool.brush', command: 'tool.brush', key: this.parseKeyString('b'), source: 'default', category: 'Tools' },
            { id: 'kb.tool.text', command: 'tool.text', key: this.parseKeyString('t'), source: 'default', category: 'Tools' },
            { id: 'kb.tool.shape', command: 'tool.shape', key: this.parseKeyString('u'), source: 'default', category: 'Tools' }
        ];
    }

    /**
     * Get VS Code keybindings
     */
    private getVSCodeKeybindings(): Keybinding[] {
        return [
            { id: 'vsc.kb.openRecent', command: 'workbench.action.openRecent', key: this.parseKeyString('ctrlcmd+r'), source: 'default', category: 'File' },
            { id: 'vsc.kb.splitEditor', command: 'view.splitEditor', key: this.parseKeyString('ctrlcmd+backslash'), source: 'default', category: 'View' },
            { id: 'vsc.kb.closeOther', command: 'workbench.action.closeOtherEditors', key: this.parseKeyString('ctrlcmd+k w'), source: 'default', category: 'View' }
        ];
    }

    /**
     * Get Unreal Engine keybindings
     */
    private getUnrealKeybindings(): Keybinding[] {
        return [
            { id: 'ue.kb.translate', command: 'viewport.translate', key: this.parseKeyString('w'), source: 'default', when: 'viewportFocus', category: '3D' },
            { id: 'ue.kb.rotate', command: 'viewport.rotate', key: this.parseKeyString('e'), source: 'default', when: 'viewportFocus', category: '3D' },
            { id: 'ue.kb.scale', command: 'viewport.scale', key: this.parseKeyString('r'), source: 'default', when: 'viewportFocus', category: '3D' },
            { id: 'ue.kb.play', command: 'play.inEditor', key: this.parseKeyString('alt+p'), source: 'default', category: 'Play' },
            { id: 'ue.kb.simulate', command: 'play.simulate', key: this.parseKeyString('alt+s'), source: 'default', category: 'Play' },
            { id: 'ue.kb.buildLighting', command: 'build.lighting', key: this.parseKeyString('ctrlcmd+shift+semicolon'), source: 'default', category: 'Build' }
        ];
    }

    /**
     * Get DaVinci Resolve keybindings
     */
    private getDaVinciKeybindings(): Keybinding[] {
        return [
            { id: 'dv.kb.cut', command: 'timeline.razorCut', key: this.parseKeyString('ctrlcmd+b'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'dv.kb.ripple', command: 'timeline.rippleDelete', key: this.parseKeyString('ctrlcmd+shift+x'), source: 'default', when: 'timelineFocus', category: 'Timeline' },
            { id: 'dv.kb.blade', command: 'tool.blade', key: this.parseKeyString('b'), source: 'default', when: 'timelineFocus', category: 'Tools' },
            { id: 'dv.kb.render', command: 'deliver.addToQueue', key: this.parseKeyString('ctrlcmd+shift+q'), source: 'default', category: 'Deliver' }
        ];
    }

    /**
     * Get Blender keybindings
     */
    private getBlenderKeybindings(): Keybinding[] {
        return [
            { id: 'bl.kb.grab', command: 'viewport.translate', key: this.parseKeyString('g'), source: 'default', when: 'viewportFocus', category: '3D' },
            { id: 'bl.kb.rotate', command: 'viewport.rotate', key: this.parseKeyString('r'), source: 'default', when: 'viewportFocus', category: '3D' },
            { id: 'bl.kb.scale', command: 'viewport.scale', key: this.parseKeyString('s'), source: 'default', when: 'viewportFocus', category: '3D' },
            { id: 'bl.kb.extrude', command: 'mesh.extrude', key: this.parseKeyString('e'), source: 'default', when: 'viewportFocus && editMode', category: '3D' },
            { id: 'bl.kb.render', command: 'render.render', key: this.parseKeyString('f12'), source: 'default', category: 'Render' }
        ];
    }

    /**
     * Load preset
     */
    loadPreset(presetId: string): void {
        const preset = this.presets.get(presetId);
        if (!preset) {
            throw new Error(`Preset '${presetId}' not found`);
        }

        // Clear current keybindings (except user overrides)
        for (const kb of this.keybindings.values()) {
            if (kb.source !== 'user') {
                this.unregisterKeybinding(kb.id);
            }
        }

        // Load base preset first
        if (preset.basePreset && preset.basePreset !== presetId) {
            const basePreset = this.presets.get(preset.basePreset);
            if (basePreset) {
                for (const kb of basePreset.keybindings) {
                    this.registerKeybinding(kb);
                }
            }
        }

        // Load preset keybindings
        for (const kb of preset.keybindings) {
            this.registerKeybinding(kb);
        }

        // Re-apply user overrides
        for (const kb of this.userOverrides.values()) {
            this.registerKeybinding(kb);
        }

        this.activePreset = presetId;
    }

    /**
     * Get active preset
     */
    getActivePreset(): string {
        return this.activePreset;
    }

    /**
     * Get all presets
     */
    getAllPresets(): KeybindingPreset[] {
        return Array.from(this.presets.values());
    }

    /**
     * Import preset from JSON
     */
    importPreset(json: string): KeybindingPreset {
        const preset = JSON.parse(json) as KeybindingPreset;
        
        // Parse key strings
        for (const kb of preset.keybindings) {
            if (typeof kb.key === 'string') {
                kb.key = this.parseKeyString(kb.key as unknown as string);
            }
        }
        
        this.presets.set(preset.id, preset);
        return preset;
    }

    /**
     * Export preset to JSON
     */
    exportPreset(presetId: string): string {
        const preset = this.presets.get(presetId);
        if (!preset) {
            throw new Error(`Preset '${presetId}' not found`);
        }
        
        // Serialize keys
        const exportPreset = {
            ...preset,
            keybindings: preset.keybindings.map(kb => ({
                ...kb,
                key: this.serializeKeyChord(kb.key)
            }))
        };
        
        return JSON.stringify(exportPreset, null, 2);
    }

    // ==================== User Customization ====================

    /**
     * Set user keybinding
     */
    setUserKeybinding(keybinding: Omit<Keybinding, 'source'>): void {
        const userKb: Keybinding = {
            ...keybinding,
            source: 'user',
            key: typeof keybinding.key === 'string' 
                ? this.parseKeyString(keybinding.key as unknown as string)
                : keybinding.key
        };
        
        this.userOverrides.set(userKb.id, userKb);
        this.registerKeybinding(userKb);
    }

    /**
     * Remove user keybinding
     */
    removeUserKeybinding(keybindingId: string): void {
        this.userOverrides.delete(keybindingId);
        this.unregisterKeybinding(keybindingId);
    }

    /**
     * Disable keybinding
     */
    disableKeybinding(keybindingId: string): void {
        this.disabledKeybindings.add(keybindingId);
    }

    /**
     * Enable keybinding
     */
    enableKeybinding(keybindingId: string): void {
        this.disabledKeybindings.delete(keybindingId);
    }

    /**
     * Get user keybindings
     */
    getUserKeybindings(): Keybinding[] {
        return Array.from(this.userOverrides.values());
    }

    /**
     * Export user keybindings
     */
    exportUserKeybindings(): string {
        const keybindings = this.getUserKeybindings().map(kb => ({
            ...kb,
            key: this.serializeKeyChord(kb.key)
        }));
        
        return JSON.stringify(keybindings, null, 2);
    }

    /**
     * Import user keybindings
     */
    importUserKeybindings(json: string): void {
        const keybindings = JSON.parse(json) as Keybinding[];
        
        for (const kb of keybindings) {
            this.setUserKeybinding(kb);
        }
    }

    /**
     * Reset to defaults
     */
    resetToDefaults(): void {
        this.userOverrides.clear();
        this.disabledKeybindings.clear();
        this.loadPreset(this.activePreset);
    }

    // ==================== Utilities ====================

    /**
     * Dispose
     */
    dispose(): void {
        this.cancelChord();
        this.onKeybindingChangedEmitter.dispose();
        this.onKeyPressedEmitter.dispose();
        this.onChordStartedEmitter.dispose();
        this.onChordCancelledEmitter.dispose();
    }
}

// ==================== Disposable ====================

interface Disposable {
    dispose(): void;
}

// ==================== Export ====================

export default KeybindingSystem;
