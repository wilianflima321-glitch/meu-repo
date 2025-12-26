import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

// ============================================================================
// AETHEL OS AUTOMATION ENGINE
// System-level automation for desktop control, file operations, app management
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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
  type: 'mouse-click' | 'mouse-move' | 'mouse-drag' | 'key-press' | 'key-type' | 
        'wait' | 'wait-for-image' | 'wait-for-window' | 'screenshot' | 'run-script';
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

// ============================================================================
// OS AUTOMATION ENGINE
// ============================================================================

@injectable()
export class OSAutomationEngine {
  private os: OperatingSystem = 'windows';
  private macros = new Map<string, AutomationMacro>();
  private hotkeyListeners = new Map<string, () => void>();
  private isRecording = false;
  private recordedSteps: MacroStep[] = [];
  private _mousePosition: Point = { x: 0, y: 0 };

  private readonly onMacroStartEmitter = new Emitter<{ macroId: string }>();
  private readonly onMacroCompleteEmitter = new Emitter<{ macroId: string; success: boolean }>();
  private readonly onMacroStepEmitter = new Emitter<{ macroId: string; step: number; total: number }>();
  private readonly onHotkeyTriggeredEmitter = new Emitter<{ shortcut: KeyboardShortcut }>();
  private readonly onRecordingStepEmitter = new Emitter<{ step: MacroStep }>();

  readonly onMacroStart: Event<{ macroId: string }> = this.onMacroStartEmitter.event;
  readonly onMacroComplete: Event<{ macroId: string; success: boolean }> = this.onMacroCompleteEmitter.event;
  readonly onMacroStep: Event<{ macroId: string; step: number; total: number }> = this.onMacroStepEmitter.event;
  readonly onHotkeyTriggered: Event<{ shortcut: KeyboardShortcut }> = this.onHotkeyTriggeredEmitter.event;
  readonly onRecordingStep: Event<{ step: MacroStep }> = this.onRecordingStepEmitter.event;

  constructor() {
    this.detectOS();
  }

  /**
   * Detect current operating system
   */
  private detectOS(): void {
    if (typeof process !== 'undefined') {
      switch (process.platform) {
        case 'win32':
          this.os = 'windows';
          break;
        case 'darwin':
          this.os = 'macos';
          break;
        default:
          this.os = 'linux';
      }
    }
  }

  /**
   * Get current OS
   */
  getOS(): OperatingSystem {
    return this.os;
  }

  // ========================================================================
  // MOUSE CONTROL
  // ========================================================================

  /**
   * Move mouse to position
   */
  async mouseMove(x: number, y: number, options: { duration?: number; smooth?: boolean } = {}): Promise<void> {
    const duration = options.duration || 0;
    const smooth = options.smooth ?? true;

    if (smooth && duration > 0) {
      // Smooth movement with bezier curve
      const startX = this._mousePosition.x;
      const startY = this._mousePosition.y;
      const steps = Math.max(1, Math.floor(duration / 16)); // ~60fps
      
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const eased = this.easeInOutQuad(t);
        const currentX = startX + (x - startX) * eased;
        const currentY = startY + (y - startY) * eased;
        
        await this.nativeMouseMove(Math.round(currentX), Math.round(currentY));
        await this.sleep(16);
      }
    }
    
    await this.nativeMouseMove(x, y);
    this._mousePosition = { x, y };
  }

  /**
   * Click mouse button
   */
  async mouseClick(
    button: MouseButton = 'left', 
    options: { x?: number; y?: number; clicks?: number; delay?: number } = {}
  ): Promise<void> {
    if (options.x !== undefined && options.y !== undefined) {
      await this.mouseMove(options.x, options.y);
    }

    const clicks = options.clicks || 1;
    const delay = options.delay || 50;

    for (let i = 0; i < clicks; i++) {
      await this.nativeMouseClick(button);
      if (i < clicks - 1) {
        await this.sleep(delay);
      }
    }
  }

  /**
   * Double click
   */
  async mouseDoubleClick(x?: number, y?: number): Promise<void> {
    await this.mouseClick('left', { x, y, clicks: 2, delay: 50 });
  }

  /**
   * Right click
   */
  async mouseRightClick(x?: number, y?: number): Promise<void> {
    await this.mouseClick('right', { x, y });
  }

  /**
   * Drag mouse from one point to another
   */
  async mouseDrag(
    fromX: number, 
    fromY: number, 
    toX: number, 
    toY: number,
    options: { button?: MouseButton; duration?: number } = {}
  ): Promise<void> {
    const button = options.button || 'left';
    
    await this.mouseMove(fromX, fromY);
    await this.nativeMouseDown(button);
    await this.mouseMove(toX, toY, { duration: options.duration, smooth: true });
    await this.nativeMouseUp(button);
  }

  /**
   * Scroll mouse wheel
   */
  async mouseScroll(amount: number, options: { x?: number; y?: number; horizontal?: boolean } = {}): Promise<void> {
    if (options.x !== undefined && options.y !== undefined) {
      await this.mouseMove(options.x, options.y);
    }
    
    await this.nativeMouseScroll(amount, options.horizontal || false);
  }

  /**
   * Get current mouse position
   */
  getMousePosition(): Point {
    return { ...this._mousePosition };
  }

  // ========================================================================
  // KEYBOARD CONTROL
  // ========================================================================

  /**
   * Type text string
   */
  async typeText(text: string, options: { delay?: number; interval?: number } = {}): Promise<void> {
    const delay = options.delay || 0;
    const interval = options.interval || 0;

    if (delay > 0) {
      await this.sleep(delay);
    }

    for (const char of text) {
      await this.nativeKeyType(char);
      if (interval > 0) {
        await this.sleep(interval);
      }
    }
  }

  /**
   * Press a key
   */
  async keyPress(key: string, modifiers: KeyModifier[] = []): Promise<void> {
    // Press modifiers
    for (const mod of modifiers) {
      await this.nativeKeyDown(this.getModifierKey(mod));
    }

    // Press and release key
    await this.nativeKeyDown(key);
    await this.nativeKeyUp(key);

    // Release modifiers in reverse order
    for (const mod of modifiers.reverse()) {
      await this.nativeKeyUp(this.getModifierKey(mod));
    }
  }

  /**
   * Press keyboard shortcut
   */
  async shortcut(shortcut: KeyboardShortcut): Promise<void> {
    await this.keyPress(shortcut.key, shortcut.modifiers);
  }

  /**
   * Common shortcuts - Copy to clipboard (Ctrl+C / Cmd+C)
   */
  async copyToClipboard(): Promise<void> {
    await this.keyPress('c', [this.os === 'macos' ? 'command' : 'ctrl']);
  }

  /**
   * Paste from clipboard (Ctrl+V / Cmd+V)
   */
  async pasteFromClipboard(): Promise<void> {
    await this.keyPress('v', [this.os === 'macos' ? 'command' : 'ctrl']);
  }

  async cut(): Promise<void> {
    await this.keyPress('x', [this.os === 'macos' ? 'command' : 'ctrl']);
  }

  async selectAll(): Promise<void> {
    await this.keyPress('a', [this.os === 'macos' ? 'command' : 'ctrl']);
  }

  async undo(): Promise<void> {
    await this.keyPress('z', [this.os === 'macos' ? 'command' : 'ctrl']);
  }

  async redo(): Promise<void> {
    const mod = this.os === 'macos' ? 'command' : 'ctrl';
    await this.keyPress(this.os === 'macos' ? 'z' : 'y', this.os === 'macos' ? [mod, 'shift'] : [mod]);
  }

  /**
   * Get native modifier key name
   */
  private getModifierKey(mod: KeyModifier): string {
    switch (mod) {
      case 'ctrl': return this.os === 'macos' ? 'Control' : 'Control';
      case 'alt': return this.os === 'macos' ? 'Option' : 'Alt';
      case 'shift': return 'Shift';
      case 'meta':
      case 'command': return this.os === 'macos' ? 'Command' : 'Meta';
      default: return mod;
    }
  }

  // ========================================================================
  // WINDOW MANAGEMENT
  // ========================================================================

  /**
   * Get all windows
   */
  async getWindows(): Promise<WindowInfo[]> {
    return this.nativeGetWindows();
  }

  /**
   * Get active window
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    const windows = await this.getWindows();
    return windows.find(w => w.isFocused) || null;
  }

  /**
   * Find windows by title
   */
  async findWindows(titlePattern: string | RegExp): Promise<WindowInfo[]> {
    const windows = await this.getWindows();
    return windows.filter(w => {
      if (typeof titlePattern === 'string') {
        return w.title.toLowerCase().includes(titlePattern.toLowerCase());
      }
      return titlePattern.test(w.title);
    });
  }

  /**
   * Focus a window
   */
  async focusWindow(windowId: string): Promise<void> {
    await this.nativeFocusWindow(windowId);
  }

  /**
   * Move a window
   */
  async moveWindow(windowId: string, x: number, y: number): Promise<void> {
    await this.nativeMoveWindow(windowId, x, y);
  }

  /**
   * Resize a window
   */
  async resizeWindow(windowId: string, width: number, height: number): Promise<void> {
    await this.nativeResizeWindow(windowId, width, height);
  }

  /**
   * Minimize a window
   */
  async minimizeWindow(windowId: string): Promise<void> {
    await this.nativeMinimizeWindow(windowId);
  }

  /**
   * Maximize a window
   */
  async maximizeWindow(windowId: string): Promise<void> {
    await this.nativeMaximizeWindow(windowId);
  }

  /**
   * Close a window
   */
  async closeWindow(windowId: string): Promise<void> {
    await this.nativeCloseWindow(windowId);
  }

  /**
   * Wait for a window to appear
   */
  async waitForWindow(
    titlePattern: string | RegExp, 
    options: { timeout?: number; interval?: number } = {}
  ): Promise<WindowInfo | null> {
    const timeout = options.timeout || 30000;
    const interval = options.interval || 500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const windows = await this.findWindows(titlePattern);
      if (windows.length > 0) {
        return windows[0];
      }
      await this.sleep(interval);
    }

    return null;
  }

  // ========================================================================
  // SCREEN CAPTURE & IMAGE RECOGNITION
  // ========================================================================

  /**
   * Take a screenshot
   */
  async screenshot(options: ScreenshotOptions = {}): Promise<ArrayBuffer> {
    return this.nativeScreenshot(options);
  }

  /**
   * Get pixel color at position
   */
  async getPixelColor(x: number, y: number): Promise<RGBColor> {
    return this.nativeGetPixelColor(x, y);
  }

  /**
   * Find image on screen
   */
  async findImage(
    templatePath: string, 
    options: { region?: ScreenRegion; threshold?: number; multiple?: boolean } = {}
  ): Promise<ImageMatch[]> {
    const threshold = options.threshold || 0.9;
    const screenshot = await this.screenshot({ region: options.region });
    
    return this.nativeFindImage(screenshot, templatePath, threshold, options.multiple || false);
  }

  /**
   * Wait for image to appear on screen
   */
  async waitForImage(
    templatePath: string,
    options: { timeout?: number; interval?: number; region?: ScreenRegion; threshold?: number } = {}
  ): Promise<ImageMatch | null> {
    const timeout = options.timeout || 30000;
    const interval = options.interval || 500;
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const matches = await this.findImage(templatePath, {
        region: options.region,
        threshold: options.threshold,
        multiple: false,
      });
      
      if (matches.length > 0) {
        return matches[0];
      }
      
      await this.sleep(interval);
    }

    return null;
  }

  /**
   * Click on image when found
   */
  async clickImage(
    templatePath: string,
    options: { button?: MouseButton; timeout?: number; offset?: Point } = {}
  ): Promise<boolean> {
    const match = await this.waitForImage(templatePath, { timeout: options.timeout });
    
    if (match) {
      const x = match.center.x + (options.offset?.x || 0);
      const y = match.center.y + (options.offset?.y || 0);
      await this.mouseClick(options.button || 'left', { x, y });
      return true;
    }
    
    return false;
  }

  /**
   * Perform OCR on region
   */
  async performOCR(options: { region?: ScreenRegion; language?: string } = {}): Promise<OCRResult> {
    const screenshot = await this.screenshot({ region: options.region });
    return this.nativeOCR(screenshot, options.language || 'eng');
  }

  // ========================================================================
  // CLIPBOARD OPERATIONS
  // ========================================================================

  /**
   * Get clipboard content
   */
  async getClipboard(): Promise<ClipboardContent> {
    return this.nativeGetClipboard();
  }

  /**
   * Set clipboard text
   */
  async setClipboardText(text: string): Promise<void> {
    await this.nativeSetClipboard({ text });
  }

  /**
   * Set clipboard image
   */
  async setClipboardImage(image: ArrayBuffer): Promise<void> {
    await this.nativeSetClipboard({ image });
  }

  /**
   * Clear clipboard
   */
  async clearClipboard(): Promise<void> {
    await this.nativeSetClipboard({});
  }

  // ========================================================================
  // PROCESS MANAGEMENT
  // ========================================================================

  /**
   * Get running processes
   */
  async getProcesses(): Promise<ProcessInfo[]> {
    return this.nativeGetProcesses();
  }

  /**
   * Find processes by name
   */
  async findProcesses(namePattern: string | RegExp): Promise<ProcessInfo[]> {
    const processes = await this.getProcesses();
    return processes.filter(p => {
      if (typeof namePattern === 'string') {
        return p.name.toLowerCase().includes(namePattern.toLowerCase());
      }
      return namePattern.test(p.name);
    });
  }

  /**
   * Launch an application
   */
  async launchApp(path: string, args: string[] = []): Promise<ProcessInfo> {
    return this.nativeLaunchApp(path, args);
  }

  /**
   * Kill a process
   */
  async killProcess(pid: number, force = false): Promise<boolean> {
    return this.nativeKillProcess(pid, force);
  }

  /**
   * Wait for process to exit
   */
  async waitForProcessExit(pid: number, timeout = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const processes = await this.getProcesses();
      if (!processes.find(p => p.pid === pid)) {
        return true;
      }
      await this.sleep(500);
    }
    
    return false;
  }

  // ========================================================================
  // FILE SYSTEM OPERATIONS
  // ========================================================================

  /**
   * List directory contents
   */
  async listDirectory(path: string): Promise<FileEntry[]> {
    return this.nativeListDirectory(path);
  }

  /**
   * Read file contents
   */
  async readFile(path: string): Promise<string | ArrayBuffer> {
    return this.nativeReadFile(path);
  }

  /**
   * Write file contents
   */
  async writeFile(path: string, content: string | ArrayBuffer): Promise<void> {
    await this.nativeWriteFile(path, content);
  }

  /**
   * Delete file or directory
   */
  async delete(path: string, recursive = false): Promise<void> {
    await this.nativeDelete(path, recursive);
  }

  /**
   * Copy file or directory
   */
  async copy(source: string, destination: string): Promise<void> {
    await this.nativeCopy(source, destination);
  }

  /**
   * Move file or directory
   */
  async move(source: string, destination: string): Promise<void> {
    await this.nativeMove(source, destination);
  }

  /**
   * Check if file/directory exists
   */
  async exists(path: string): Promise<boolean> {
    return this.nativeExists(path);
  }

  /**
   * Create directory
   */
  async createDirectory(path: string): Promise<void> {
    await this.nativeCreateDirectory(path);
  }

  /**
   * Watch for file changes
   */
  watchFile(path: string, callback: (event: 'change' | 'rename' | 'delete', filename: string) => void): () => void {
    return this.nativeWatchFile(path, callback);
  }

  // ========================================================================
  // MACRO RECORDING & PLAYBACK
  // ========================================================================

  /**
   * Start recording a macro
   */
  startRecording(): void {
    this.isRecording = true;
    this.recordedSteps = [];
  }

  /**
   * Stop recording and return macro
   */
  stopRecording(name: string, description?: string): AutomationMacro {
    this.isRecording = false;
    
    const macro: AutomationMacro = {
      id: generateId(),
      name,
      description,
      steps: [...this.recordedSteps],
      runCount: 0,
    };
    
    this.recordedSteps = [];
    return macro;
  }

  /**
   * Record a step (called internally during recording)
   */
  private recordStep(step: MacroStep): void {
    if (this.isRecording) {
      this.recordedSteps.push(step);
      this.onRecordingStepEmitter.fire({ step });
    }
  }

  /**
   * Save macro
   */
  saveMacro(macro: AutomationMacro): void {
    this.macros.set(macro.id, macro);
  }

  /**
   * Get macro by ID
   */
  getMacro(id: string): AutomationMacro | undefined {
    return this.macros.get(id);
  }

  /**
   * Get all macros
   */
  getAllMacros(): AutomationMacro[] {
    return Array.from(this.macros.values());
  }

  /**
   * Delete macro
   */
  deleteMacro(id: string): boolean {
    return this.macros.delete(id);
  }

  /**
   * Run a macro
   */
  async runMacro(
    macroOrId: string | AutomationMacro,
    variables?: Record<string, unknown>
  ): Promise<boolean> {
    const macro = typeof macroOrId === 'string' 
      ? this.macros.get(macroOrId) 
      : macroOrId;
    
    if (!macro) return false;

    const context = {
      variables: { ...macro.variables, ...variables },
    };

    this.onMacroStartEmitter.fire({ macroId: macro.id });

    try {
      for (let i = 0; i < macro.steps.length; i++) {
        const step = macro.steps[i];
        
        // Check condition if present
        if (step.condition) {
          const conditionMet = await this.evaluateCondition(step.condition, context);
          if (!conditionMet) continue;
        }

        // Apply delay before step
        if (step.delay && step.delay > 0) {
          await this.sleep(step.delay);
        }

        // Execute step
        await this.executeStep(step, context);
        
        this.onMacroStepEmitter.fire({ 
          macroId: macro.id, 
          step: i + 1, 
          total: macro.steps.length 
        });
      }

      macro.runCount = (macro.runCount || 0) + 1;
      macro.lastRun = new Date();
      
      this.onMacroCompleteEmitter.fire({ macroId: macro.id, success: true });
      return true;
    } catch (error) {
      console.error('Macro execution failed:', error);
      this.onMacroCompleteEmitter.fire({ macroId: macro.id, success: false });
      return false;
    }
  }

  /**
   * Execute a single macro step
   */
  private async executeStep(
    step: MacroStep, 
    context: { variables: Record<string, unknown> }
  ): Promise<void> {
    const params = this.resolveVariables(step.parameters, context.variables);

    switch (step.type) {
      case 'mouse-click':
        await this.mouseClick(
          params.button as MouseButton || 'left',
          { x: params.x as number, y: params.y as number, clicks: params.clicks as number }
        );
        break;
        
      case 'mouse-move':
        await this.mouseMove(
          params.x as number, 
          params.y as number,
          { duration: params.duration as number }
        );
        break;
        
      case 'mouse-drag':
        await this.mouseDrag(
          params.fromX as number,
          params.fromY as number,
          params.toX as number,
          params.toY as number,
          { duration: params.duration as number }
        );
        break;
        
      case 'key-press':
        await this.keyPress(
          params.key as string,
          params.modifiers as KeyModifier[] || []
        );
        break;
        
      case 'key-type':
        await this.typeText(
          params.text as string,
          { delay: params.delay as number }
        );
        break;
        
      case 'wait':
        await this.sleep(params.duration as number || 1000);
        break;
        
      case 'wait-for-image':
        await this.waitForImage(
          params.templatePath as string,
          { timeout: params.timeout as number, region: params.region as ScreenRegion }
        );
        break;
        
      case 'wait-for-window':
        await this.waitForWindow(
          params.titlePattern as string,
          { timeout: params.timeout as number }
        );
        break;
        
      case 'screenshot':
        const screenshot = await this.screenshot({
          region: params.region as ScreenRegion,
          format: params.format as 'png' | 'jpeg' | 'webp',
        });
        context.variables['lastScreenshot'] = screenshot;
        break;
        
      case 'run-script':
        // Execute custom script
        const script = params.script as string;
        const fn = new Function('context', 'automation', script);
        await fn(context, this);
        break;
    }
  }

  /**
   * Evaluate a condition
   */
  private async evaluateCondition(
    condition: MacroCondition,
    context: { variables: Record<string, unknown> }
  ): Promise<boolean> {
    const params = this.resolveVariables(condition.parameters, context.variables);
    let result = false;

    switch (condition.type) {
      case 'image-exists':
        const matches = await this.findImage(
          params.templatePath as string,
          { threshold: params.threshold as number }
        );
        result = matches.length > 0;
        break;
        
      case 'window-exists':
        const windows = await this.findWindows(params.titlePattern as string);
        result = windows.length > 0;
        break;
        
      case 'pixel-color':
        const color = await this.getPixelColor(
          params.x as number,
          params.y as number
        );
        const expected = params.color as RGBColor;
        const tolerance = (params.tolerance as number) || 0;
        result = Math.abs(color.r - expected.r) <= tolerance &&
                 Math.abs(color.g - expected.g) <= tolerance &&
                 Math.abs(color.b - expected.b) <= tolerance;
        break;
        
      case 'expression':
        const expr = params.expression as string;
        const fn = new Function('context', `return ${expr}`);
        result = fn(context);
        break;
    }

    return condition.negate ? !result : result;
  }

  /**
   * Resolve variables in parameters
   */
  private resolveVariables(
    params: Record<string, unknown>,
    variables: Record<string, unknown>
  ): Record<string, unknown> {
    const resolved: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
        const varName = value.slice(2, -1);
        resolved[key] = variables[varName];
      } else {
        resolved[key] = value;
      }
    }
    
    return resolved;
  }

  // ========================================================================
  // HOTKEY MANAGEMENT
  // ========================================================================

  /**
   * Register a global hotkey
   */
  registerHotkey(shortcut: KeyboardShortcut, callback: () => void): string {
    const id = generateId();
    this.hotkeyListeners.set(id, callback);
    this.nativeRegisterHotkey(id, shortcut);
    return id;
  }

  /**
   * Unregister a hotkey
   */
  unregisterHotkey(id: string): void {
    this.hotkeyListeners.delete(id);
    this.nativeUnregisterHotkey(id);
  }

  /**
   * Assign hotkey to macro
   */
  assignHotkeyToMacro(macroId: string, shortcut: KeyboardShortcut): void {
    const macro = this.macros.get(macroId);
    if (macro) {
      macro.hotkey = shortcut;
      this.registerHotkey(shortcut, () => this.runMacro(macroId));
    }
  }

  // ========================================================================
  // NATIVE IMPLEMENTATIONS (To be implemented per platform)
  // ========================================================================

  private async nativeMouseMove(x: number, y: number): Promise<void> {
    // Platform-specific implementation
    // Windows: Use user32.dll SetCursorPos
    // macOS: Use CGEventCreateMouseEvent
    // Linux: Use XTest extension
    console.log(`[Native] Mouse move to (${x}, ${y})`);
  }

  private async nativeMouseClick(button: MouseButton): Promise<void> {
    console.log(`[Native] Mouse click ${button}`);
  }

  private async nativeMouseDown(button: MouseButton): Promise<void> {
    console.log(`[Native] Mouse down ${button}`);
  }

  private async nativeMouseUp(button: MouseButton): Promise<void> {
    console.log(`[Native] Mouse up ${button}`);
  }

  private async nativeMouseScroll(amount: number, horizontal: boolean): Promise<void> {
    console.log(`[Native] Mouse scroll ${amount} ${horizontal ? 'horizontal' : 'vertical'}`);
  }

  private async nativeKeyDown(key: string): Promise<void> {
    console.log(`[Native] Key down: ${key}`);
  }

  private async nativeKeyUp(key: string): Promise<void> {
    console.log(`[Native] Key up: ${key}`);
  }

  private async nativeKeyType(char: string): Promise<void> {
    console.log(`[Native] Key type: ${char}`);
  }

  private async nativeGetWindows(): Promise<WindowInfo[]> {
    // Return mock data - implement with native APIs
    return [];
  }

  private async nativeFocusWindow(_windowId: string): Promise<void> {
    console.log(`[Native] Focus window`);
  }

  private async nativeMoveWindow(_windowId: string, _x: number, _y: number): Promise<void> {
    console.log(`[Native] Move window`);
  }

  private async nativeResizeWindow(_windowId: string, _width: number, _height: number): Promise<void> {
    console.log(`[Native] Resize window`);
  }

  private async nativeMinimizeWindow(_windowId: string): Promise<void> {
    console.log(`[Native] Minimize window`);
  }

  private async nativeMaximizeWindow(_windowId: string): Promise<void> {
    console.log(`[Native] Maximize window`);
  }

  private async nativeCloseWindow(_windowId: string): Promise<void> {
    console.log(`[Native] Close window`);
  }

  private async nativeScreenshot(_options: ScreenshotOptions): Promise<ArrayBuffer> {
    return new ArrayBuffer(0);
  }

  private async nativeGetPixelColor(_x: number, _y: number): Promise<RGBColor> {
    return { r: 0, g: 0, b: 0 };
  }

  private async nativeFindImage(
    _screenshot: ArrayBuffer, 
    _templatePath: string, 
    _threshold: number,
    _multiple: boolean
  ): Promise<ImageMatch[]> {
    return [];
  }

  private async nativeOCR(_screenshot: ArrayBuffer, _language: string): Promise<OCRResult> {
    return { text: '', confidence: 0, bounds: { x: 0, y: 0, width: 0, height: 0 }, words: [] };
  }

  private async nativeGetClipboard(): Promise<ClipboardContent> {
    return {};
  }

  private async nativeSetClipboard(_content: ClipboardContent): Promise<void> {
    console.log(`[Native] Set clipboard`);
  }

  private async nativeGetProcesses(): Promise<ProcessInfo[]> {
    return [];
  }

  private async nativeLaunchApp(path: string, _args: string[]): Promise<ProcessInfo> {
    return {
      pid: 0,
      name: path,
      path,
      cpuUsage: 0,
      memoryUsage: 0,
      startTime: new Date(),
      status: 'running',
    };
  }

  private async nativeKillProcess(_pid: number, _force: boolean): Promise<boolean> {
    return true;
  }

  private async nativeListDirectory(_path: string): Promise<FileEntry[]> {
    return [];
  }

  private async nativeReadFile(_path: string): Promise<string | ArrayBuffer> {
    return '';
  }

  private async nativeWriteFile(_path: string, _content: string | ArrayBuffer): Promise<void> {
    console.log(`[Native] Write file`);
  }

  private async nativeDelete(_path: string, _recursive: boolean): Promise<void> {
    console.log(`[Native] Delete`);
  }

  private async nativeCopy(_source: string, _destination: string): Promise<void> {
    console.log(`[Native] Copy`);
  }

  private async nativeMove(_source: string, _destination: string): Promise<void> {
    console.log(`[Native] Move`);
  }

  private async nativeExists(_path: string): Promise<boolean> {
    return false;
  }

  private async nativeCreateDirectory(_path: string): Promise<void> {
    console.log(`[Native] Create directory`);
  }

  private nativeWatchFile(_path: string, _callback: (event: 'change' | 'rename' | 'delete', filename: string) => void): () => void {
    return () => {};
  }

  private nativeRegisterHotkey(_id: string, _shortcut: KeyboardShortcut): void {
    console.log(`[Native] Register hotkey`);
  }

  private nativeUnregisterHotkey(_id: string): void {
    console.log(`[Native] Unregister hotkey`);
  }

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
}

// ============================================================================
// WORKFLOW AUTOMATION DSL
// ============================================================================

/**
 * Fluent API for building automation workflows
 */
export class AutomationWorkflowBuilder {
  private steps: MacroStep[] = [];
  private variables: Record<string, unknown> = {};

  /**
   * Move mouse to position
   */
  moveTo(x: number, y: number, duration?: number): this {
    this.steps.push({
      type: 'mouse-move',
      parameters: { x, y, duration },
    });
    return this;
  }

  /**
   * Click at current or specified position
   */
  click(x?: number, y?: number, button: MouseButton = 'left'): this {
    this.steps.push({
      type: 'mouse-click',
      parameters: { x, y, button },
    });
    return this;
  }

  /**
   * Double click
   */
  doubleClick(x?: number, y?: number): this {
    this.steps.push({
      type: 'mouse-click',
      parameters: { x, y, button: 'left', clicks: 2 },
    });
    return this;
  }

  /**
   * Right click
   */
  rightClick(x?: number, y?: number): this {
    this.steps.push({
      type: 'mouse-click',
      parameters: { x, y, button: 'right' },
    });
    return this;
  }

  /**
   * Drag from one position to another
   */
  drag(fromX: number, fromY: number, toX: number, toY: number, duration?: number): this {
    this.steps.push({
      type: 'mouse-drag',
      parameters: { fromX, fromY, toX, toY, duration },
    });
    return this;
  }

  /**
   * Type text
   */
  type(text: string, delay?: number): this {
    this.steps.push({
      type: 'key-type',
      parameters: { text, delay },
    });
    return this;
  }

  /**
   * Press a key with optional modifiers
   */
  press(key: string, ...modifiers: KeyModifier[]): this {
    this.steps.push({
      type: 'key-press',
      parameters: { key, modifiers },
    });
    return this;
  }

  /**
   * Wait for duration
   */
  wait(ms: number): this {
    this.steps.push({
      type: 'wait',
      parameters: { duration: ms },
    });
    return this;
  }

  /**
   * Wait for image to appear
   */
  waitForImage(templatePath: string, timeout?: number): this {
    this.steps.push({
      type: 'wait-for-image',
      parameters: { templatePath, timeout },
    });
    return this;
  }

  /**
   * Wait for window to appear
   */
  waitForWindow(titlePattern: string, timeout?: number): this {
    this.steps.push({
      type: 'wait-for-window',
      parameters: { titlePattern, timeout },
    });
    return this;
  }

  /**
   * Take a screenshot
   */
  screenshot(region?: ScreenRegion): this {
    this.steps.push({
      type: 'screenshot',
      parameters: { region },
    });
    return this;
  }

  /**
   * Run custom script
   */
  script(code: string): this {
    this.steps.push({
      type: 'run-script',
      parameters: { script: code },
    });
    return this;
  }

  /**
   * Add a delay before next step
   */
  delay(ms: number): this {
    if (this.steps.length > 0) {
      this.steps[this.steps.length - 1].delay = ms;
    }
    return this;
  }

  /**
   * Set a variable
   */
  setVariable(name: string, value: unknown): this {
    this.variables[name] = value;
    return this;
  }

  /**
   * Build the workflow as a macro
   */
  build(name: string, description?: string): AutomationMacro {
    return {
      id: generateId(),
      name,
      description,
      steps: [...this.steps],
      variables: { ...this.variables },
      runCount: 0,
    };
  }

  /**
   * Execute workflow directly
   */
  async execute(engine: OSAutomationEngine): Promise<boolean> {
    const macro = this.build('temp-workflow');
    return engine.runMacro(macro, this.variables);
  }
}

/**
 * Create a new automation workflow builder
 */
export function workflow(): AutomationWorkflowBuilder {
  return new AutomationWorkflowBuilder();
}

// ============================================================================
// UTILITY
// ============================================================================

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

