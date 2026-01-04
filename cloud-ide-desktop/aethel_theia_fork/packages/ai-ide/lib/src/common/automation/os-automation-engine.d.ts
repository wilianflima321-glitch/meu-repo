import { Event } from '@theia/core/lib/common';
/**
 * Supported operating systems
 */
export type OperatingSystem = 'windows' | 'macos' | 'linux';
/**
 * Mouse button types
 */
export type MouseButton = 'left' | 'right' | 'middle';
/**
 * Key modifier types
 */
export type KeyModifier = 'ctrl' | 'alt' | 'shift' | 'meta' | 'command';
/**
 * Screen region
 */
export interface ScreenRegion {
    x: number;
    y: number;
    width: number;
    height: number;
}
/**
 * Point on screen
 */
export interface Point {
    x: number;
    y: number;
}
/**
 * RGB Color
 */
export interface RGBColor {
    r: number;
    g: number;
    b: number;
}
/**
 * Window information
 */
export interface WindowInfo {
    id: string;
    title: string;
    processId: number;
    processName: string;
    bounds: ScreenRegion;
    isVisible: boolean;
    isFocused: boolean;
    isMinimized: boolean;
    isMaximized: boolean;
}
/**
 * Process information
 */
export interface ProcessInfo {
    pid: number;
    name: string;
    path: string;
    cpuUsage: number;
    memoryUsage: number;
    startTime: Date;
    status: 'running' | 'sleeping' | 'stopped' | 'zombie';
}
/**
 * File system entry
 */
export interface FileEntry {
    path: string;
    name: string;
    type: 'file' | 'directory' | 'symlink';
    size: number;
    created: Date;
    modified: Date;
    accessed: Date;
    permissions: string;
    isHidden: boolean;
}
/**
 * Clipboard content
 */
export interface ClipboardContent {
    text?: string;
    html?: string;
    rtf?: string;
    image?: ArrayBuffer;
    files?: string[];
}
/**
 * Screenshot options
 */
export interface ScreenshotOptions {
    region?: ScreenRegion;
    format?: 'png' | 'jpeg' | 'webp';
    quality?: number;
    displayId?: number;
}
/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
    key: string;
    modifiers: KeyModifier[];
}
/**
 * Automation macro step
 */
export interface MacroStep {
    type: 'mouse-click' | 'mouse-move' | 'mouse-drag' | 'key-press' | 'key-type' | 'wait' | 'wait-for-image' | 'wait-for-window' | 'screenshot' | 'run-script';
    parameters: Record<string, unknown>;
    delay?: number;
    condition?: MacroCondition;
}
/**
 * Macro condition
 */
export interface MacroCondition {
    type: 'image-exists' | 'window-exists' | 'pixel-color' | 'expression';
    parameters: Record<string, unknown>;
    negate?: boolean;
}
/**
 * Automation macro
 */
export interface AutomationMacro {
    id: string;
    name: string;
    description?: string;
    steps: MacroStep[];
    variables?: Record<string, unknown>;
    hotkey?: KeyboardShortcut;
    runCount?: number;
    lastRun?: Date;
}
/**
 * Image recognition result
 */
export interface ImageMatch {
    region: ScreenRegion;
    confidence: number;
    center: Point;
}
/**
 * OCR result
 */
export interface OCRResult {
    text: string;
    confidence: number;
    bounds: ScreenRegion;
    words: Array<{
        text: string;
        confidence: number;
        bounds: ScreenRegion;
    }>;
}
export declare class OSAutomationEngine {
    private os;
    private macros;
    private hotkeyListeners;
    private isRecording;
    private recordedSteps;
    private _mousePosition;
    private readonly onMacroStartEmitter;
    private readonly onMacroCompleteEmitter;
    private readonly onMacroStepEmitter;
    private readonly onHotkeyTriggeredEmitter;
    private readonly onRecordingStepEmitter;
    readonly onMacroStart: Event<{
        macroId: string;
    }>;
    readonly onMacroComplete: Event<{
        macroId: string;
        success: boolean;
    }>;
    readonly onMacroStep: Event<{
        macroId: string;
        step: number;
        total: number;
    }>;
    readonly onHotkeyTriggered: Event<{
        shortcut: KeyboardShortcut;
    }>;
    readonly onRecordingStep: Event<{
        step: MacroStep;
    }>;
    constructor();
    /**
     * Detect current operating system
     */
    private detectOS;
    /**
     * Get current OS
     */
    getOS(): OperatingSystem;
    /**
     * Move mouse to position
     */
    mouseMove(x: number, y: number, options?: {
        duration?: number;
        smooth?: boolean;
    }): Promise<void>;
    /**
     * Click mouse button
     */
    mouseClick(button?: MouseButton, options?: {
        x?: number;
        y?: number;
        clicks?: number;
        delay?: number;
    }): Promise<void>;
    /**
     * Double click
     */
    mouseDoubleClick(x?: number, y?: number): Promise<void>;
    /**
     * Right click
     */
    mouseRightClick(x?: number, y?: number): Promise<void>;
    /**
     * Drag mouse from one point to another
     */
    mouseDrag(fromX: number, fromY: number, toX: number, toY: number, options?: {
        button?: MouseButton;
        duration?: number;
    }): Promise<void>;
    /**
     * Scroll mouse wheel
     */
    mouseScroll(amount: number, options?: {
        x?: number;
        y?: number;
        horizontal?: boolean;
    }): Promise<void>;
    /**
     * Get current mouse position
     */
    getMousePosition(): Point;
    /**
     * Type text string
     */
    typeText(text: string, options?: {
        delay?: number;
        interval?: number;
    }): Promise<void>;
    /**
     * Press a key
     */
    keyPress(key: string, modifiers?: KeyModifier[]): Promise<void>;
    /**
     * Press keyboard shortcut
     */
    shortcut(shortcut: KeyboardShortcut): Promise<void>;
    /**
     * Common shortcuts - Copy to clipboard (Ctrl+C / Cmd+C)
     */
    copyToClipboard(): Promise<void>;
    /**
     * Paste from clipboard (Ctrl+V / Cmd+V)
     */
    pasteFromClipboard(): Promise<void>;
    cut(): Promise<void>;
    selectAll(): Promise<void>;
    undo(): Promise<void>;
    redo(): Promise<void>;
    /**
     * Get native modifier key name
     */
    private getModifierKey;
    /**
     * Get all windows
     */
    getWindows(): Promise<WindowInfo[]>;
    /**
     * Get active window
     */
    getActiveWindow(): Promise<WindowInfo | null>;
    /**
     * Find windows by title
     */
    findWindows(titlePattern: string | RegExp): Promise<WindowInfo[]>;
    /**
     * Focus a window
     */
    focusWindow(windowId: string): Promise<void>;
    /**
     * Move a window
     */
    moveWindow(windowId: string, x: number, y: number): Promise<void>;
    /**
     * Resize a window
     */
    resizeWindow(windowId: string, width: number, height: number): Promise<void>;
    /**
     * Minimize a window
     */
    minimizeWindow(windowId: string): Promise<void>;
    /**
     * Maximize a window
     */
    maximizeWindow(windowId: string): Promise<void>;
    /**
     * Close a window
     */
    closeWindow(windowId: string): Promise<void>;
    /**
     * Wait for a window to appear
     */
    waitForWindow(titlePattern: string | RegExp, options?: {
        timeout?: number;
        interval?: number;
    }): Promise<WindowInfo | null>;
    /**
     * Take a screenshot
     */
    screenshot(options?: ScreenshotOptions): Promise<ArrayBuffer>;
    /**
     * Get pixel color at position
     */
    getPixelColor(x: number, y: number): Promise<RGBColor>;
    /**
     * Find image on screen
     */
    findImage(templatePath: string, options?: {
        region?: ScreenRegion;
        threshold?: number;
        multiple?: boolean;
    }): Promise<ImageMatch[]>;
    /**
     * Wait for image to appear on screen
     */
    waitForImage(templatePath: string, options?: {
        timeout?: number;
        interval?: number;
        region?: ScreenRegion;
        threshold?: number;
    }): Promise<ImageMatch | null>;
    /**
     * Click on image when found
     */
    clickImage(templatePath: string, options?: {
        button?: MouseButton;
        timeout?: number;
        offset?: Point;
    }): Promise<boolean>;
    /**
     * Perform OCR on region
     */
    performOCR(options?: {
        region?: ScreenRegion;
        language?: string;
    }): Promise<OCRResult>;
    /**
     * Get clipboard content
     */
    getClipboard(): Promise<ClipboardContent>;
    /**
     * Set clipboard text
     */
    setClipboardText(text: string): Promise<void>;
    /**
     * Set clipboard image
     */
    setClipboardImage(image: ArrayBuffer): Promise<void>;
    /**
     * Clear clipboard
     */
    clearClipboard(): Promise<void>;
    /**
     * Get running processes
     */
    getProcesses(): Promise<ProcessInfo[]>;
    /**
     * Find processes by name
     */
    findProcesses(namePattern: string | RegExp): Promise<ProcessInfo[]>;
    /**
     * Launch an application
     */
    launchApp(path: string, args?: string[]): Promise<ProcessInfo>;
    /**
     * Kill a process
     */
    killProcess(pid: number, force?: boolean): Promise<boolean>;
    /**
     * Wait for process to exit
     */
    waitForProcessExit(pid: number, timeout?: number): Promise<boolean>;
    /**
     * List directory contents
     */
    listDirectory(path: string): Promise<FileEntry[]>;
    /**
     * Read file contents
     */
    readFile(path: string): Promise<string | ArrayBuffer>;
    /**
     * Write file contents
     */
    writeFile(path: string, content: string | ArrayBuffer): Promise<void>;
    /**
     * Delete file or directory
     */
    delete(path: string, recursive?: boolean): Promise<void>;
    /**
     * Copy file or directory
     */
    copy(source: string, destination: string): Promise<void>;
    /**
     * Move file or directory
     */
    move(source: string, destination: string): Promise<void>;
    /**
     * Check if file/directory exists
     */
    exists(path: string): Promise<boolean>;
    /**
     * Create directory
     */
    createDirectory(path: string): Promise<void>;
    /**
     * Watch for file changes
     */
    watchFile(path: string, callback: (event: 'change' | 'rename' | 'delete', filename: string) => void): () => void;
    /**
     * Start recording a macro
     */
    startRecording(): void;
    /**
     * Stop recording and return macro
     */
    stopRecording(name: string, description?: string): AutomationMacro;
    /**
     * Record a step (called internally during recording)
     */
    private recordStep;
    /**
     * Save macro
     */
    saveMacro(macro: AutomationMacro): void;
    /**
     * Get macro by ID
     */
    getMacro(id: string): AutomationMacro | undefined;
    /**
     * Get all macros
     */
    getAllMacros(): AutomationMacro[];
    /**
     * Delete macro
     */
    deleteMacro(id: string): boolean;
    /**
     * Run a macro
     */
    runMacro(macroOrId: string | AutomationMacro, variables?: Record<string, unknown>): Promise<boolean>;
    /**
     * Execute a single macro step
     */
    private executeStep;
    /**
     * Evaluate a condition
     */
    private evaluateCondition;
    /**
     * Resolve variables in parameters
     */
    private resolveVariables;
    /**
     * Register a global hotkey
     */
    registerHotkey(shortcut: KeyboardShortcut, callback: () => void): string;
    /**
     * Unregister a hotkey
     */
    unregisterHotkey(id: string): void;
    /**
     * Assign hotkey to macro
     */
    assignHotkeyToMacro(macroId: string, shortcut: KeyboardShortcut): void;
    private nativeMouseMove;
    private nativeMouseClick;
    private nativeMouseDown;
    private nativeMouseUp;
    private nativeMouseScroll;
    private nativeKeyDown;
    private nativeKeyUp;
    private nativeKeyType;
    private nativeGetWindows;
    private nativeFocusWindow;
    private nativeMoveWindow;
    private nativeResizeWindow;
    private nativeMinimizeWindow;
    private nativeMaximizeWindow;
    private nativeCloseWindow;
    private nativeScreenshot;
    private nativeGetPixelColor;
    private nativeFindImage;
    private nativeOCR;
    private nativeGetClipboard;
    private nativeSetClipboard;
    private nativeGetProcesses;
    private nativeLaunchApp;
    private nativeKillProcess;
    private nativeListDirectory;
    private nativeReadFile;
    private nativeWriteFile;
    private nativeDelete;
    private nativeCopy;
    private nativeMove;
    private nativeExists;
    private nativeCreateDirectory;
    private nativeWatchFile;
    private nativeRegisterHotkey;
    private nativeUnregisterHotkey;
    private sleep;
    private easeInOutQuad;
}
/**
 * Fluent API for building automation workflows
 */
export declare class AutomationWorkflowBuilder {
    private steps;
    private variables;
    /**
     * Move mouse to position
     */
    moveTo(x: number, y: number, duration?: number): this;
    /**
     * Click at current or specified position
     */
    click(x?: number, y?: number, button?: MouseButton): this;
    /**
     * Double click
     */
    doubleClick(x?: number, y?: number): this;
    /**
     * Right click
     */
    rightClick(x?: number, y?: number): this;
    /**
     * Drag from one position to another
     */
    drag(fromX: number, fromY: number, toX: number, toY: number, duration?: number): this;
    /**
     * Type text
     */
    type(text: string, delay?: number): this;
    /**
     * Press a key with optional modifiers
     */
    press(key: string, ...modifiers: KeyModifier[]): this;
    /**
     * Wait for duration
     */
    wait(ms: number): this;
    /**
     * Wait for image to appear
     */
    waitForImage(templatePath: string, timeout?: number): this;
    /**
     * Wait for window to appear
     */
    waitForWindow(titlePattern: string, timeout?: number): this;
    /**
     * Take a screenshot
     */
    screenshot(region?: ScreenRegion): this;
    /**
     * Run custom script
     */
    script(code: string): this;
    /**
     * Add a delay before next step
     */
    delay(ms: number): this;
    /**
     * Set a variable
     */
    setVariable(name: string, value: unknown): this;
    /**
     * Build the workflow as a macro
     */
    build(name: string, description?: string): AutomationMacro;
    /**
     * Execute workflow directly
     */
    execute(engine: OSAutomationEngine): Promise<boolean>;
}
/**
 * Create a new automation workflow builder
 */
export declare function workflow(): AutomationWorkflowBuilder;
