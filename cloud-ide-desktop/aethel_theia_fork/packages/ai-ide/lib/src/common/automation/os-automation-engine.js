"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AutomationWorkflowBuilder = exports.OSAutomationEngine = void 0;
exports.workflow = workflow;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
// ============================================================================
// OS AUTOMATION ENGINE
// ============================================================================
let OSAutomationEngine = class OSAutomationEngine {
    constructor() {
        this.os = 'windows';
        this.macros = new Map();
        this.hotkeyListeners = new Map();
        this.isRecording = false;
        this.recordedSteps = [];
        this._mousePosition = { x: 0, y: 0 };
        this.onMacroStartEmitter = new common_1.Emitter();
        this.onMacroCompleteEmitter = new common_1.Emitter();
        this.onMacroStepEmitter = new common_1.Emitter();
        this.onHotkeyTriggeredEmitter = new common_1.Emitter();
        this.onRecordingStepEmitter = new common_1.Emitter();
        this.onMacroStart = this.onMacroStartEmitter.event;
        this.onMacroComplete = this.onMacroCompleteEmitter.event;
        this.onMacroStep = this.onMacroStepEmitter.event;
        this.onHotkeyTriggered = this.onHotkeyTriggeredEmitter.event;
        this.onRecordingStep = this.onRecordingStepEmitter.event;
        this.detectOS();
    }
    /**
     * Detect current operating system
     */
    detectOS() {
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
    getOS() {
        return this.os;
    }
    // ========================================================================
    // MOUSE CONTROL
    // ========================================================================
    /**
     * Move mouse to position
     */
    async mouseMove(x, y, options = {}) {
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
    async mouseClick(button = 'left', options = {}) {
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
    async mouseDoubleClick(x, y) {
        await this.mouseClick('left', { x, y, clicks: 2, delay: 50 });
    }
    /**
     * Right click
     */
    async mouseRightClick(x, y) {
        await this.mouseClick('right', { x, y });
    }
    /**
     * Drag mouse from one point to another
     */
    async mouseDrag(fromX, fromY, toX, toY, options = {}) {
        const button = options.button || 'left';
        await this.mouseMove(fromX, fromY);
        await this.nativeMouseDown(button);
        await this.mouseMove(toX, toY, { duration: options.duration, smooth: true });
        await this.nativeMouseUp(button);
    }
    /**
     * Scroll mouse wheel
     */
    async mouseScroll(amount, options = {}) {
        if (options.x !== undefined && options.y !== undefined) {
            await this.mouseMove(options.x, options.y);
        }
        await this.nativeMouseScroll(amount, options.horizontal || false);
    }
    /**
     * Get current mouse position
     */
    getMousePosition() {
        return { ...this._mousePosition };
    }
    // ========================================================================
    // KEYBOARD CONTROL
    // ========================================================================
    /**
     * Type text string
     */
    async typeText(text, options = {}) {
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
    async keyPress(key, modifiers = []) {
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
    async shortcut(shortcut) {
        await this.keyPress(shortcut.key, shortcut.modifiers);
    }
    /**
     * Common shortcuts - Copy to clipboard (Ctrl+C / Cmd+C)
     */
    async copyToClipboard() {
        await this.keyPress('c', [this.os === 'macos' ? 'command' : 'ctrl']);
    }
    /**
     * Paste from clipboard (Ctrl+V / Cmd+V)
     */
    async pasteFromClipboard() {
        await this.keyPress('v', [this.os === 'macos' ? 'command' : 'ctrl']);
    }
    async cut() {
        await this.keyPress('x', [this.os === 'macos' ? 'command' : 'ctrl']);
    }
    async selectAll() {
        await this.keyPress('a', [this.os === 'macos' ? 'command' : 'ctrl']);
    }
    async undo() {
        await this.keyPress('z', [this.os === 'macos' ? 'command' : 'ctrl']);
    }
    async redo() {
        const mod = this.os === 'macos' ? 'command' : 'ctrl';
        await this.keyPress(this.os === 'macos' ? 'z' : 'y', this.os === 'macos' ? [mod, 'shift'] : [mod]);
    }
    /**
     * Get native modifier key name
     */
    getModifierKey(mod) {
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
    async getWindows() {
        return this.nativeGetWindows();
    }
    /**
     * Get active window
     */
    async getActiveWindow() {
        const windows = await this.getWindows();
        return windows.find(w => w.isFocused) || null;
    }
    /**
     * Find windows by title
     */
    async findWindows(titlePattern) {
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
    async focusWindow(windowId) {
        await this.nativeFocusWindow(windowId);
    }
    /**
     * Move a window
     */
    async moveWindow(windowId, x, y) {
        await this.nativeMoveWindow(windowId, x, y);
    }
    /**
     * Resize a window
     */
    async resizeWindow(windowId, width, height) {
        await this.nativeResizeWindow(windowId, width, height);
    }
    /**
     * Minimize a window
     */
    async minimizeWindow(windowId) {
        await this.nativeMinimizeWindow(windowId);
    }
    /**
     * Maximize a window
     */
    async maximizeWindow(windowId) {
        await this.nativeMaximizeWindow(windowId);
    }
    /**
     * Close a window
     */
    async closeWindow(windowId) {
        await this.nativeCloseWindow(windowId);
    }
    /**
     * Wait for a window to appear
     */
    async waitForWindow(titlePattern, options = {}) {
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
    async screenshot(options = {}) {
        return this.nativeScreenshot(options);
    }
    /**
     * Get pixel color at position
     */
    async getPixelColor(x, y) {
        return this.nativeGetPixelColor(x, y);
    }
    /**
     * Find image on screen
     */
    async findImage(templatePath, options = {}) {
        const threshold = options.threshold || 0.9;
        const screenshot = await this.screenshot({ region: options.region });
        return this.nativeFindImage(screenshot, templatePath, threshold, options.multiple || false);
    }
    /**
     * Wait for image to appear on screen
     */
    async waitForImage(templatePath, options = {}) {
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
    async clickImage(templatePath, options = {}) {
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
    async performOCR(options = {}) {
        const screenshot = await this.screenshot({ region: options.region });
        return this.nativeOCR(screenshot, options.language || 'eng');
    }
    // ========================================================================
    // CLIPBOARD OPERATIONS
    // ========================================================================
    /**
     * Get clipboard content
     */
    async getClipboard() {
        return this.nativeGetClipboard();
    }
    /**
     * Set clipboard text
     */
    async setClipboardText(text) {
        await this.nativeSetClipboard({ text });
    }
    /**
     * Set clipboard image
     */
    async setClipboardImage(image) {
        await this.nativeSetClipboard({ image });
    }
    /**
     * Clear clipboard
     */
    async clearClipboard() {
        await this.nativeSetClipboard({});
    }
    // ========================================================================
    // PROCESS MANAGEMENT
    // ========================================================================
    /**
     * Get running processes
     */
    async getProcesses() {
        return this.nativeGetProcesses();
    }
    /**
     * Find processes by name
     */
    async findProcesses(namePattern) {
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
    async launchApp(path, args = []) {
        return this.nativeLaunchApp(path, args);
    }
    /**
     * Kill a process
     */
    async killProcess(pid, force = false) {
        return this.nativeKillProcess(pid, force);
    }
    /**
     * Wait for process to exit
     */
    async waitForProcessExit(pid, timeout = 30000) {
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
    async listDirectory(path) {
        return this.nativeListDirectory(path);
    }
    /**
     * Read file contents
     */
    async readFile(path) {
        return this.nativeReadFile(path);
    }
    /**
     * Write file contents
     */
    async writeFile(path, content) {
        await this.nativeWriteFile(path, content);
    }
    /**
     * Delete file or directory
     */
    async delete(path, recursive = false) {
        await this.nativeDelete(path, recursive);
    }
    /**
     * Copy file or directory
     */
    async copy(source, destination) {
        await this.nativeCopy(source, destination);
    }
    /**
     * Move file or directory
     */
    async move(source, destination) {
        await this.nativeMove(source, destination);
    }
    /**
     * Check if file/directory exists
     */
    async exists(path) {
        return this.nativeExists(path);
    }
    /**
     * Create directory
     */
    async createDirectory(path) {
        await this.nativeCreateDirectory(path);
    }
    /**
     * Watch for file changes
     */
    watchFile(path, callback) {
        return this.nativeWatchFile(path, callback);
    }
    // ========================================================================
    // MACRO RECORDING & PLAYBACK
    // ========================================================================
    /**
     * Start recording a macro
     */
    startRecording() {
        this.isRecording = true;
        this.recordedSteps = [];
    }
    /**
     * Stop recording and return macro
     */
    stopRecording(name, description) {
        this.isRecording = false;
        const macro = {
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
    recordStep(step) {
        if (this.isRecording) {
            this.recordedSteps.push(step);
            this.onRecordingStepEmitter.fire({ step });
        }
    }
    /**
     * Save macro
     */
    saveMacro(macro) {
        this.macros.set(macro.id, macro);
    }
    /**
     * Get macro by ID
     */
    getMacro(id) {
        return this.macros.get(id);
    }
    /**
     * Get all macros
     */
    getAllMacros() {
        return Array.from(this.macros.values());
    }
    /**
     * Delete macro
     */
    deleteMacro(id) {
        return this.macros.delete(id);
    }
    /**
     * Run a macro
     */
    async runMacro(macroOrId, variables) {
        const macro = typeof macroOrId === 'string'
            ? this.macros.get(macroOrId)
            : macroOrId;
        if (!macro)
            return false;
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
                    if (!conditionMet)
                        continue;
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
        }
        catch (error) {
            console.error('Macro execution failed:', error);
            this.onMacroCompleteEmitter.fire({ macroId: macro.id, success: false });
            return false;
        }
    }
    /**
     * Execute a single macro step
     */
    async executeStep(step, context) {
        const params = this.resolveVariables(step.parameters, context.variables);
        switch (step.type) {
            case 'mouse-click':
                await this.mouseClick(params.button || 'left', { x: params.x, y: params.y, clicks: params.clicks });
                break;
            case 'mouse-move':
                await this.mouseMove(params.x, params.y, { duration: params.duration });
                break;
            case 'mouse-drag':
                await this.mouseDrag(params.fromX, params.fromY, params.toX, params.toY, { duration: params.duration });
                break;
            case 'key-press':
                await this.keyPress(params.key, params.modifiers || []);
                break;
            case 'key-type':
                await this.typeText(params.text, { delay: params.delay });
                break;
            case 'wait':
                await this.sleep(params.duration || 1000);
                break;
            case 'wait-for-image':
                await this.waitForImage(params.templatePath, { timeout: params.timeout, region: params.region });
                break;
            case 'wait-for-window':
                await this.waitForWindow(params.titlePattern, { timeout: params.timeout });
                break;
            case 'screenshot':
                const screenshot = await this.screenshot({
                    region: params.region,
                    format: params.format,
                });
                context.variables['lastScreenshot'] = screenshot;
                break;
            case 'run-script':
                // Execute custom script
                const script = params.script;
                const fn = new Function('context', 'automation', script);
                await fn(context, this);
                break;
        }
    }
    /**
     * Evaluate a condition
     */
    async evaluateCondition(condition, context) {
        const params = this.resolveVariables(condition.parameters, context.variables);
        let result = false;
        switch (condition.type) {
            case 'image-exists':
                const matches = await this.findImage(params.templatePath, { threshold: params.threshold });
                result = matches.length > 0;
                break;
            case 'window-exists':
                const windows = await this.findWindows(params.titlePattern);
                result = windows.length > 0;
                break;
            case 'pixel-color':
                const color = await this.getPixelColor(params.x, params.y);
                const expected = params.color;
                const tolerance = params.tolerance || 0;
                result = Math.abs(color.r - expected.r) <= tolerance &&
                    Math.abs(color.g - expected.g) <= tolerance &&
                    Math.abs(color.b - expected.b) <= tolerance;
                break;
            case 'expression':
                const expr = params.expression;
                const fn = new Function('context', `return ${expr}`);
                result = fn(context);
                break;
        }
        return condition.negate ? !result : result;
    }
    /**
     * Resolve variables in parameters
     */
    resolveVariables(params, variables) {
        const resolved = {};
        for (const [key, value] of Object.entries(params)) {
            if (typeof value === 'string' && value.startsWith('${') && value.endsWith('}')) {
                const varName = value.slice(2, -1);
                resolved[key] = variables[varName];
            }
            else {
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
    registerHotkey(shortcut, callback) {
        const id = generateId();
        this.hotkeyListeners.set(id, callback);
        this.nativeRegisterHotkey(id, shortcut);
        return id;
    }
    /**
     * Unregister a hotkey
     */
    unregisterHotkey(id) {
        this.hotkeyListeners.delete(id);
        this.nativeUnregisterHotkey(id);
    }
    /**
     * Assign hotkey to macro
     */
    assignHotkeyToMacro(macroId, shortcut) {
        const macro = this.macros.get(macroId);
        if (macro) {
            macro.hotkey = shortcut;
            this.registerHotkey(shortcut, () => this.runMacro(macroId));
        }
    }
    // ========================================================================
    // NATIVE IMPLEMENTATIONS (To be implemented per platform)
    // ========================================================================
    async nativeMouseMove(x, y) {
        // Platform-specific implementation
        // Windows: Use user32.dll SetCursorPos
        // macOS: Use CGEventCreateMouseEvent
        // Linux: Use XTest extension
        console.log(`[Native] Mouse move to (${x}, ${y})`);
    }
    async nativeMouseClick(button) {
        console.log(`[Native] Mouse click ${button}`);
    }
    async nativeMouseDown(button) {
        console.log(`[Native] Mouse down ${button}`);
    }
    async nativeMouseUp(button) {
        console.log(`[Native] Mouse up ${button}`);
    }
    async nativeMouseScroll(amount, horizontal) {
        console.log(`[Native] Mouse scroll ${amount} ${horizontal ? 'horizontal' : 'vertical'}`);
    }
    async nativeKeyDown(key) {
        console.log(`[Native] Key down: ${key}`);
    }
    async nativeKeyUp(key) {
        console.log(`[Native] Key up: ${key}`);
    }
    async nativeKeyType(char) {
        console.log(`[Native] Key type: ${char}`);
    }
    async nativeGetWindows() {
        // Return mock data - implement with native APIs
        return [];
    }
    async nativeFocusWindow(_windowId) {
        console.log(`[Native] Focus window`);
    }
    async nativeMoveWindow(_windowId, _x, _y) {
        console.log(`[Native] Move window`);
    }
    async nativeResizeWindow(_windowId, _width, _height) {
        console.log(`[Native] Resize window`);
    }
    async nativeMinimizeWindow(_windowId) {
        console.log(`[Native] Minimize window`);
    }
    async nativeMaximizeWindow(_windowId) {
        console.log(`[Native] Maximize window`);
    }
    async nativeCloseWindow(_windowId) {
        console.log(`[Native] Close window`);
    }
    async nativeScreenshot(_options) {
        return new ArrayBuffer(0);
    }
    async nativeGetPixelColor(_x, _y) {
        return { r: 0, g: 0, b: 0 };
    }
    async nativeFindImage(_screenshot, _templatePath, _threshold, _multiple) {
        return [];
    }
    async nativeOCR(_screenshot, _language) {
        return { text: '', confidence: 0, bounds: { x: 0, y: 0, width: 0, height: 0 }, words: [] };
    }
    async nativeGetClipboard() {
        return {};
    }
    async nativeSetClipboard(_content) {
        console.log(`[Native] Set clipboard`);
    }
    async nativeGetProcesses() {
        return [];
    }
    async nativeLaunchApp(path, _args) {
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
    async nativeKillProcess(_pid, _force) {
        return true;
    }
    async nativeListDirectory(_path) {
        return [];
    }
    async nativeReadFile(_path) {
        return '';
    }
    async nativeWriteFile(_path, _content) {
        console.log(`[Native] Write file`);
    }
    async nativeDelete(_path, _recursive) {
        console.log(`[Native] Delete`);
    }
    async nativeCopy(_source, _destination) {
        console.log(`[Native] Copy`);
    }
    async nativeMove(_source, _destination) {
        console.log(`[Native] Move`);
    }
    async nativeExists(_path) {
        return false;
    }
    async nativeCreateDirectory(_path) {
        console.log(`[Native] Create directory`);
    }
    nativeWatchFile(_path, _callback) {
        return () => { };
    }
    nativeRegisterHotkey(_id, _shortcut) {
        console.log(`[Native] Register hotkey`);
    }
    nativeUnregisterHotkey(_id) {
        console.log(`[Native] Unregister hotkey`);
    }
    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    }
};
exports.OSAutomationEngine = OSAutomationEngine;
exports.OSAutomationEngine = OSAutomationEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], OSAutomationEngine);
// ============================================================================
// WORKFLOW AUTOMATION DSL
// ============================================================================
/**
 * Fluent API for building automation workflows
 */
class AutomationWorkflowBuilder {
    constructor() {
        this.steps = [];
        this.variables = {};
    }
    /**
     * Move mouse to position
     */
    moveTo(x, y, duration) {
        this.steps.push({
            type: 'mouse-move',
            parameters: { x, y, duration },
        });
        return this;
    }
    /**
     * Click at current or specified position
     */
    click(x, y, button = 'left') {
        this.steps.push({
            type: 'mouse-click',
            parameters: { x, y, button },
        });
        return this;
    }
    /**
     * Double click
     */
    doubleClick(x, y) {
        this.steps.push({
            type: 'mouse-click',
            parameters: { x, y, button: 'left', clicks: 2 },
        });
        return this;
    }
    /**
     * Right click
     */
    rightClick(x, y) {
        this.steps.push({
            type: 'mouse-click',
            parameters: { x, y, button: 'right' },
        });
        return this;
    }
    /**
     * Drag from one position to another
     */
    drag(fromX, fromY, toX, toY, duration) {
        this.steps.push({
            type: 'mouse-drag',
            parameters: { fromX, fromY, toX, toY, duration },
        });
        return this;
    }
    /**
     * Type text
     */
    type(text, delay) {
        this.steps.push({
            type: 'key-type',
            parameters: { text, delay },
        });
        return this;
    }
    /**
     * Press a key with optional modifiers
     */
    press(key, ...modifiers) {
        this.steps.push({
            type: 'key-press',
            parameters: { key, modifiers },
        });
        return this;
    }
    /**
     * Wait for duration
     */
    wait(ms) {
        this.steps.push({
            type: 'wait',
            parameters: { duration: ms },
        });
        return this;
    }
    /**
     * Wait for image to appear
     */
    waitForImage(templatePath, timeout) {
        this.steps.push({
            type: 'wait-for-image',
            parameters: { templatePath, timeout },
        });
        return this;
    }
    /**
     * Wait for window to appear
     */
    waitForWindow(titlePattern, timeout) {
        this.steps.push({
            type: 'wait-for-window',
            parameters: { titlePattern, timeout },
        });
        return this;
    }
    /**
     * Take a screenshot
     */
    screenshot(region) {
        this.steps.push({
            type: 'screenshot',
            parameters: { region },
        });
        return this;
    }
    /**
     * Run custom script
     */
    script(code) {
        this.steps.push({
            type: 'run-script',
            parameters: { script: code },
        });
        return this;
    }
    /**
     * Add a delay before next step
     */
    delay(ms) {
        if (this.steps.length > 0) {
            this.steps[this.steps.length - 1].delay = ms;
        }
        return this;
    }
    /**
     * Set a variable
     */
    setVariable(name, value) {
        this.variables[name] = value;
        return this;
    }
    /**
     * Build the workflow as a macro
     */
    build(name, description) {
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
    async execute(engine) {
        const macro = this.build('temp-workflow');
        return engine.runMacro(macro, this.variables);
    }
}
exports.AutomationWorkflowBuilder = AutomationWorkflowBuilder;
/**
 * Create a new automation workflow builder
 */
function workflow() {
    return new AutomationWorkflowBuilder();
}
// ============================================================================
// UTILITY
// ============================================================================
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}
