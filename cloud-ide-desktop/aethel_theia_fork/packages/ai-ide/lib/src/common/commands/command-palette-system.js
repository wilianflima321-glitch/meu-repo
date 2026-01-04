"use strict";
/**
 * Command Palette System - Professional Command Execution Infrastructure
 *
 * Sistema de comandos profissional inspirado em VS Code, Unreal Engine e
 * ferramentas de produção de vídeo. Suporta:
 * - Comandos registráveis com argumentos tipados
 * - Fuzzy search e ranking inteligente
 * - Histórico de comandos e frequência de uso
 * - Contextos de execução dinâmicos
 * - Comandos compostos e macros
 * - Integração com keybindings
 * - Quick picks e inputs customizados
 */
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
exports.CommandPaletteSystem = void 0;
const inversify_1 = require("inversify");
class Emitter {
    constructor() {
        this.listeners = [];
    }
    get event() {
        return (listener) => {
            this.listeners.push(listener);
            return {
                dispose: () => {
                    const idx = this.listeners.indexOf(listener);
                    if (idx >= 0)
                        this.listeners.splice(idx, 1);
                }
            };
        };
    }
    fire(event) {
        this.listeners.forEach(l => l(event));
    }
    dispose() {
        this.listeners = [];
    }
}
// ==================== Main Command Palette System ====================
let CommandPaletteSystem = class CommandPaletteSystem {
    constructor() {
        // Command registry
        this.commands = new Map();
        this.commandsByCategory = new Map();
        // Context keys
        this.contextKeys = new Map();
        // Macros
        this.macros = new Map();
        this.isRecordingMacro = false;
        this.currentMacroSteps = [];
        this.recordingMacroId = null;
        // History and analytics
        this.executionHistory = [];
        this.commandFrequency = new Map();
        this.lastUsed = new Map();
        this.MAX_HISTORY = 1000;
        // Quick pick state
        this.activeQuickPick = null;
        this.activeInputBox = null;
        // Events
        this.onCommandRegisteredEmitter = new Emitter();
        this.onCommandRegistered = this.onCommandRegisteredEmitter.event;
        this.onCommandUnregisteredEmitter = new Emitter();
        this.onCommandUnregistered = this.onCommandUnregisteredEmitter.event;
        this.onCommandExecutedEmitter = new Emitter();
        this.onCommandExecuted = this.onCommandExecutedEmitter.event;
        this.onContextChangedEmitter = new Emitter();
        this.onContextChanged = this.onContextChangedEmitter.event;
        this.onMacroRecordedEmitter = new Emitter();
        this.onMacroRecorded = this.onMacroRecordedEmitter.event;
        this.onQuickPickShownEmitter = new Emitter();
        this.onQuickPickShown = this.onQuickPickShownEmitter.event;
        this.registerCoreCommands();
        this.initializeDefaultContext();
    }
    // ==================== Command Registration ====================
    /**
     * Register a command
     */
    registerCommand(command) {
        if (this.commands.has(command.id)) {
            throw new Error(`Command '${command.id}' is already registered`);
        }
        this.commands.set(command.id, command);
        // Index by category
        if (command.category) {
            if (!this.commandsByCategory.has(command.category)) {
                this.commandsByCategory.set(command.category, new Set());
            }
            this.commandsByCategory.get(command.category).add(command.id);
        }
        this.onCommandRegisteredEmitter.fire({
            command,
            source: command.source || 'core'
        });
        return {
            dispose: () => this.unregisterCommand(command.id)
        };
    }
    /**
     * Register multiple commands
     */
    registerCommands(commands) {
        const disposables = commands.map(cmd => this.registerCommand(cmd));
        return {
            dispose: () => disposables.forEach(d => d.dispose())
        };
    }
    /**
     * Unregister a command
     */
    unregisterCommand(commandId) {
        const command = this.commands.get(commandId);
        if (!command)
            return;
        this.commands.delete(commandId);
        // Remove from category index
        if (command.category) {
            this.commandsByCategory.get(command.category)?.delete(commandId);
        }
        this.onCommandUnregisteredEmitter.fire(commandId);
    }
    /**
     * Check if command exists
     */
    hasCommand(commandId) {
        return this.commands.has(commandId);
    }
    /**
     * Get command by ID
     */
    getCommand(commandId) {
        return this.commands.get(commandId);
    }
    /**
     * Get all commands
     */
    getAllCommands() {
        return Array.from(this.commands.values());
    }
    /**
     * Get commands by category
     */
    getCommandsByCategory(category) {
        const commandIds = this.commandsByCategory.get(category);
        if (!commandIds)
            return [];
        return Array.from(commandIds)
            .map(id => this.commands.get(id))
            .filter((cmd) => cmd !== undefined);
    }
    /**
     * Get all categories
     */
    getCategories() {
        return Array.from(this.commandsByCategory.keys()).sort();
    }
    // ==================== Command Execution ====================
    /**
     * Execute a command
     */
    async executeCommand(commandId, ...args) {
        return this.executeCommandWithContext(commandId, {
            variables: {},
            triggeredBy: 'api'
        }, ...args);
    }
    /**
     * Execute command with context
     */
    async executeCommandWithContext(commandId, context, ...args) {
        const command = this.commands.get(commandId);
        if (!command) {
            throw new Error(`Command '${commandId}' not found`);
        }
        // Check 'when' condition
        if (command.when && !this.evaluateContextExpression(command.when).result) {
            throw new Error(`Command '${commandId}' is not available in current context`);
        }
        // Check enablement
        if (command.enablement && !this.evaluateContextExpression(command.enablement).result) {
            throw new Error(`Command '${commandId}' is not enabled`);
        }
        // Validate arguments
        if (command.arguments) {
            this.validateArguments(command, args);
        }
        const startTime = Date.now();
        let result;
        try {
            const returnValue = await Promise.resolve(command.handler(...args));
            result = {
                commandId,
                success: true,
                result: returnValue,
                duration: Date.now() - startTime,
                timestamp: Date.now()
            };
        }
        catch (error) {
            result = {
                commandId,
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                duration: Date.now() - startTime,
                timestamp: Date.now()
            };
        }
        // Record in history
        this.recordExecution(commandId, args, context, result);
        // Record for macro if recording
        if (this.isRecordingMacro) {
            this.currentMacroSteps.push({
                commandId,
                args: args.length > 0 ? args : undefined
            });
        }
        // Fire event
        this.onCommandExecutedEmitter.fire({
            commandId,
            args,
            result,
            context
        });
        if (!result.success) {
            throw result.error;
        }
        return result.result;
    }
    /**
     * Validate command arguments
     */
    validateArguments(command, args) {
        if (!command.arguments)
            return;
        for (let i = 0; i < command.arguments.length; i++) {
            const schema = command.arguments[i];
            const value = args[i];
            // Check required
            if (schema.required && value === undefined) {
                throw new Error(`Missing required argument '${schema.name}' for command '${command.id}'`);
            }
            // Skip validation if optional and not provided
            if (value === undefined)
                continue;
            // Type validation
            if (!this.validateArgumentType(value, schema)) {
                throw new Error(`Invalid type for argument '${schema.name}': expected ${schema.type}, got ${typeof value}`);
            }
            // Custom validation
            if (schema.validation) {
                const validationResult = this.runValidation(value, schema.validation);
                if (validationResult !== true) {
                    throw new Error(`Validation failed for argument '${schema.name}': ${validationResult}`);
                }
            }
        }
    }
    /**
     * Validate argument type
     */
    validateArgumentType(value, schema) {
        switch (schema.type) {
            case 'string': return typeof value === 'string';
            case 'number': return typeof value === 'number';
            case 'boolean': return typeof value === 'boolean';
            case 'array': return Array.isArray(value);
            case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
            case 'file': return typeof value === 'string' || value instanceof File;
            case 'selection': return typeof value === 'object' && value !== null;
            default: return true;
        }
    }
    /**
     * Run validation rules
     */
    runValidation(value, validation) {
        if (validation.pattern && typeof value === 'string') {
            if (!new RegExp(validation.pattern).test(value)) {
                return `Value does not match pattern: ${validation.pattern}`;
            }
        }
        if (typeof value === 'number') {
            if (validation.min !== undefined && value < validation.min) {
                return `Value must be >= ${validation.min}`;
            }
            if (validation.max !== undefined && value > validation.max) {
                return `Value must be <= ${validation.max}`;
            }
        }
        if (typeof value === 'string') {
            if (validation.minLength !== undefined && value.length < validation.minLength) {
                return `Value must be at least ${validation.minLength} characters`;
            }
            if (validation.maxLength !== undefined && value.length > validation.maxLength) {
                return `Value must be at most ${validation.maxLength} characters`;
            }
        }
        if (validation.custom) {
            return validation.custom(value);
        }
        return true;
    }
    // ==================== History & Analytics ====================
    /**
     * Record command execution
     */
    recordExecution(commandId, args, context, result) {
        const entry = {
            commandId,
            args,
            context,
            result,
            timestamp: Date.now()
        };
        this.executionHistory.push(entry);
        if (this.executionHistory.length > this.MAX_HISTORY) {
            this.executionHistory.shift();
        }
        // Update frequency
        this.commandFrequency.set(commandId, (this.commandFrequency.get(commandId) || 0) + 1);
        // Update last used
        this.lastUsed.set(commandId, Date.now());
    }
    /**
     * Get execution history
     */
    getHistory(limit) {
        const history = [...this.executionHistory].reverse();
        return limit ? history.slice(0, limit) : history;
    }
    /**
     * Get command frequency
     */
    getCommandFrequency(commandId) {
        return this.commandFrequency.get(commandId) || 0;
    }
    /**
     * Get recently used commands
     */
    getRecentCommands(limit = 10) {
        return Array.from(this.lastUsed.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => this.commands.get(id))
            .filter((cmd) => cmd !== undefined);
    }
    /**
     * Get frequently used commands
     */
    getFrequentCommands(limit = 10) {
        return Array.from(this.commandFrequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([id]) => this.commands.get(id))
            .filter((cmd) => cmd !== undefined);
    }
    // ==================== Command Search ====================
    /**
     * Search commands with fuzzy matching
     */
    searchCommands(options) {
        const { query, limit = 50, categories, includeDisabled, preferRecent, preferFrequent, fuzzyThreshold = 0.3 } = options;
        const results = [];
        const queryLower = query.toLowerCase();
        const queryTokens = queryLower.split(/\s+/);
        for (const command of this.commands.values()) {
            // Filter by category
            if (categories && command.category && !categories.includes(command.category)) {
                continue;
            }
            // Check availability (when condition)
            if (!includeDisabled && command.when) {
                if (!this.evaluateContextExpression(command.when).result) {
                    continue;
                }
            }
            // Calculate match score
            const matchResult = this.calculateMatchScore(command, queryTokens, fuzzyThreshold);
            if (matchResult.score > 0) {
                // Apply recency boost
                let finalScore = matchResult.score;
                if (preferRecent) {
                    const lastUsedTime = this.lastUsed.get(command.id);
                    if (lastUsedTime) {
                        const recencyBoost = Math.max(0, 1 - (Date.now() - lastUsedTime) / (24 * 60 * 60 * 1000));
                        finalScore *= (1 + recencyBoost * 0.3);
                    }
                }
                // Apply frequency boost
                if (preferFrequent) {
                    const frequency = this.commandFrequency.get(command.id) || 0;
                    const frequencyBoost = Math.min(0.3, frequency * 0.01);
                    finalScore *= (1 + frequencyBoost);
                }
                results.push({
                    command,
                    score: finalScore,
                    matchedOn: matchResult.matchedOn,
                    highlights: matchResult.highlights,
                    recentUsage: this.lastUsed.get(command.id),
                    frequency: this.commandFrequency.get(command.id)
                });
            }
        }
        // Sort by score descending
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, limit);
    }
    /**
     * Calculate match score for a command
     */
    calculateMatchScore(command, queryTokens, fuzzyThreshold) {
        let totalScore = 0;
        const matchedOn = [];
        const highlights = {};
        // Title matching (highest weight)
        const titleScore = this.fuzzyMatch(command.title.toLowerCase(), queryTokens, fuzzyThreshold);
        if (titleScore > 0) {
            totalScore += titleScore * 10;
            matchedOn.push('title');
            highlights.title = this.findHighlightPositions(command.title, queryTokens);
        }
        // Category matching
        if (command.category) {
            const categoryScore = this.fuzzyMatch(command.category.toLowerCase(), queryTokens, fuzzyThreshold);
            if (categoryScore > 0) {
                totalScore += categoryScore * 5;
                matchedOn.push('category');
                highlights.category = this.findHighlightPositions(command.category, queryTokens);
            }
        }
        // Description matching
        if (command.description) {
            const descScore = this.fuzzyMatch(command.description.toLowerCase(), queryTokens, fuzzyThreshold);
            if (descScore > 0) {
                totalScore += descScore * 3;
                matchedOn.push('description');
                highlights.description = this.findHighlightPositions(command.description, queryTokens);
            }
        }
        // Keyword matching
        if (command.keywords) {
            for (const keyword of command.keywords) {
                const keywordScore = this.fuzzyMatch(keyword.toLowerCase(), queryTokens, fuzzyThreshold);
                if (keywordScore > 0) {
                    totalScore += keywordScore * 7;
                    if (!matchedOn.includes('keywords')) {
                        matchedOn.push('keywords');
                    }
                }
            }
        }
        return { score: totalScore, matchedOn, highlights };
    }
    /**
     * Fuzzy matching algorithm
     */
    fuzzyMatch(text, tokens, threshold) {
        let totalScore = 0;
        for (const token of tokens) {
            // Exact match
            if (text.includes(token)) {
                totalScore += 1;
                continue;
            }
            // Prefix match
            const words = text.split(/\s+/);
            if (words.some(w => w.startsWith(token))) {
                totalScore += 0.8;
                continue;
            }
            // Fuzzy match using Levenshtein distance
            for (const word of words) {
                const distance = this.levenshteinDistance(token, word);
                const maxLen = Math.max(token.length, word.length);
                const similarity = 1 - distance / maxLen;
                if (similarity >= (1 - threshold)) {
                    totalScore += similarity * 0.5;
                    break;
                }
            }
        }
        return totalScore / tokens.length;
    }
    /**
     * Levenshtein distance calculation
     */
    levenshteinDistance(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= a.length; j++) {
            matrix[0][j] = j;
        }
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                }
                else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
                }
            }
        }
        return matrix[b.length][a.length];
    }
    /**
     * Find highlight positions
     */
    findHighlightPositions(text, tokens) {
        const positions = [];
        const textLower = text.toLowerCase();
        for (const token of tokens) {
            let index = 0;
            while ((index = textLower.indexOf(token, index)) !== -1) {
                positions.push([index, index + token.length]);
                index++;
            }
        }
        return positions.sort((a, b) => a[0] - b[0]);
    }
    // ==================== Context System ====================
    /**
     * Set context key
     */
    setContext(key, value, type) {
        const contextKey = {
            key,
            value,
            type: type || this.inferType(value)
        };
        this.contextKeys.set(key, contextKey);
        this.onContextChangedEmitter.fire(contextKey);
    }
    /**
     * Get context value
     */
    getContext(key) {
        return this.contextKeys.get(key)?.value;
    }
    /**
     * Delete context key
     */
    deleteContext(key) {
        this.contextKeys.delete(key);
    }
    /**
     * Evaluate context expression
     */
    evaluateContextExpression(expression) {
        const usedKeys = [];
        try {
            // Parse and evaluate the expression
            const result = this.parseAndEvaluate(expression, usedKeys);
            return {
                expression,
                result,
                usedKeys
            };
        }
        catch (error) {
            return {
                expression,
                result: false,
                usedKeys,
                parseError: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Parse and evaluate context expression
     */
    parseAndEvaluate(expression, usedKeys) {
        // Simple expression parser supporting: &&, ||, !, ==, !=, key
        const tokens = this.tokenizeExpression(expression);
        return this.evaluateTokens(tokens, usedKeys);
    }
    /**
     * Tokenize expression
     */
    tokenizeExpression(expression) {
        const regex = /(\|\||&&|!|==|!=|\(|\)|[a-zA-Z_][a-zA-Z0-9_.-]*|'[^']*'|"[^"]*"|\d+)/g;
        return expression.match(regex) || [];
    }
    /**
     * Evaluate tokens
     */
    evaluateTokens(tokens, usedKeys) {
        let result = true;
        let currentOp = '&&';
        let negate = false;
        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i];
            if (token === '!') {
                negate = !negate;
                i++;
                continue;
            }
            if (token === '&&' || token === '||') {
                currentOp = token;
                i++;
                continue;
            }
            if (token === '(') {
                // Find matching closing paren
                let depth = 1;
                let j = i + 1;
                while (j < tokens.length && depth > 0) {
                    if (tokens[j] === '(')
                        depth++;
                    if (tokens[j] === ')')
                        depth--;
                    j++;
                }
                const subTokens = tokens.slice(i + 1, j - 1);
                let subResult = this.evaluateTokens(subTokens, usedKeys);
                if (negate) {
                    subResult = !subResult;
                    negate = false;
                }
                result = this.applyOp(result, subResult, currentOp);
                i = j;
                continue;
            }
            // Check for comparison operators
            if (i + 2 < tokens.length && (tokens[i + 1] === '==' || tokens[i + 1] === '!=')) {
                const key = token;
                const op = tokens[i + 1];
                let compareValue = tokens[i + 2];
                // Parse string literals
                if (typeof compareValue === 'string') {
                    if ((compareValue.startsWith("'") && compareValue.endsWith("'")) ||
                        (compareValue.startsWith('"') && compareValue.endsWith('"'))) {
                        compareValue = compareValue.slice(1, -1);
                    }
                    else if (compareValue === 'true') {
                        compareValue = true;
                    }
                    else if (compareValue === 'false') {
                        compareValue = false;
                    }
                    else if (!isNaN(Number(compareValue))) {
                        compareValue = Number(compareValue);
                    }
                }
                usedKeys.push(key);
                const contextValue = this.getContext(key);
                let compResult = op === '==' ? contextValue === compareValue : contextValue !== compareValue;
                if (negate) {
                    compResult = !compResult;
                    negate = false;
                }
                result = this.applyOp(result, compResult, currentOp);
                i += 3;
                continue;
            }
            // Simple context key check (truthy)
            usedKeys.push(token);
            let keyResult = !!this.getContext(token);
            if (negate) {
                keyResult = !keyResult;
                negate = false;
            }
            result = this.applyOp(result, keyResult, currentOp);
            i++;
        }
        return result;
    }
    /**
     * Apply boolean operator
     */
    applyOp(a, b, op) {
        if (op === '&&')
            return a && b;
        if (op === '||')
            return a || b;
        return b;
    }
    /**
     * Infer type from value
     */
    inferType(value) {
        if (typeof value === 'boolean')
            return 'boolean';
        if (typeof value === 'number')
            return 'number';
        if (Array.isArray(value))
            return 'array';
        return 'string';
    }
    /**
     * Initialize default context
     */
    initializeDefaultContext() {
        // Platform
        this.setContext('platform', typeof process !== 'undefined' ? process.platform : 'browser');
        this.setContext('isWindows', typeof process !== 'undefined' && process.platform === 'win32');
        this.setContext('isMac', typeof process !== 'undefined' && process.platform === 'darwin');
        this.setContext('isLinux', typeof process !== 'undefined' && process.platform === 'linux');
        this.setContext('isBrowser', typeof window !== 'undefined');
        // Editor context (defaults)
        this.setContext('editorFocus', false);
        this.setContext('textInputFocus', false);
        this.setContext('editorHasSelection', false);
        this.setContext('editorHasMultipleSelections', false);
        this.setContext('editorReadonly', false);
        this.setContext('editorLangId', '');
        // Panel context
        this.setContext('panelFocus', false);
        this.setContext('terminalFocus', false);
        this.setContext('sideBarFocus', false);
        // File context
        this.setContext('resourceScheme', '');
        this.setContext('resourceFilename', '');
        this.setContext('resourceExtname', '');
        this.setContext('resourceDirname', '');
        // Workspace context
        this.setContext('workspaceFolderCount', 0);
        this.setContext('hasWorkspace', false);
        // View context
        this.setContext('view', '');
        this.setContext('viewportFocus', false);
        this.setContext('timelineFocus', false);
    }
    // ==================== Macro System ====================
    /**
     * Start recording macro
     */
    startRecordingMacro(macroId) {
        if (this.isRecordingMacro) {
            throw new Error('Already recording a macro');
        }
        this.isRecordingMacro = true;
        this.recordingMacroId = macroId;
        this.currentMacroSteps = [];
        this.setContext('recordingMacro', true);
        this.setContext('currentMacroId', macroId);
    }
    /**
     * Stop recording macro
     */
    stopRecordingMacro(name, description) {
        if (!this.isRecordingMacro || !this.recordingMacroId) {
            throw new Error('Not recording a macro');
        }
        const macro = {
            id: this.recordingMacroId,
            name,
            description,
            steps: [...this.currentMacroSteps],
            enabled: true,
            recordedAt: Date.now(),
            runCount: 0
        };
        this.macros.set(macro.id, macro);
        this.isRecordingMacro = false;
        this.recordingMacroId = null;
        this.currentMacroSteps = [];
        this.setContext('recordingMacro', false);
        this.deleteContext('currentMacroId');
        this.onMacroRecordedEmitter.fire({ macro });
        return macro;
    }
    /**
     * Cancel macro recording
     */
    cancelMacroRecording() {
        this.isRecordingMacro = false;
        this.recordingMacroId = null;
        this.currentMacroSteps = [];
        this.setContext('recordingMacro', false);
        this.deleteContext('currentMacroId');
    }
    /**
     * Run macro
     */
    async runMacro(macroId, context) {
        const macro = this.macros.get(macroId);
        if (!macro) {
            throw new Error(`Macro '${macroId}' not found`);
        }
        if (!macro.enabled) {
            throw new Error(`Macro '${macroId}' is disabled`);
        }
        const fullContext = {
            variables: { ...macro.variables, ...context?.variables },
            triggeredBy: 'macro',
            ...context
        };
        for (const step of macro.steps) {
            // Check condition
            if (step.condition && !this.evaluateContextExpression(step.condition).result) {
                continue;
            }
            // Repeat count
            const repeatCount = step.repeatCount || 1;
            for (let i = 0; i < repeatCount; i++) {
                try {
                    // Delay
                    if (step.delay) {
                        await this.delay(step.delay);
                    }
                    await this.executeCommandWithContext(step.commandId, fullContext, ...(step.args || []));
                }
                catch (error) {
                    if (step.onError === 'stop') {
                        throw error;
                    }
                    else if (step.onError === 'retry') {
                        // Simple retry once
                        try {
                            await this.executeCommandWithContext(step.commandId, fullContext, ...(step.args || []));
                        }
                        catch {
                            // Ignore retry error
                        }
                    }
                    // 'continue' - just continue
                }
            }
        }
        // Update macro stats
        macro.lastRun = Date.now();
        macro.runCount++;
    }
    /**
     * Get macro by ID
     */
    getMacro(macroId) {
        return this.macros.get(macroId);
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
    deleteMacro(macroId) {
        this.macros.delete(macroId);
    }
    // ==================== Quick Pick System ====================
    /**
     * Show quick pick
     */
    async showQuickPick(items, options = {}) {
        const resolvedItems = await Promise.resolve(items);
        return new Promise((resolve) => {
            this.activeQuickPick = {
                items: resolvedItems,
                options,
                resolve: (selected) => {
                    this.activeQuickPick = null;
                    resolve(selected);
                }
            };
            this.onQuickPickShownEmitter.fire(options);
        });
    }
    /**
     * Show input box
     */
    async showInputBox(options = {}) {
        return new Promise((resolve) => {
            this.activeInputBox = {
                options,
                resolve: (value) => {
                    this.activeInputBox = null;
                    resolve(value);
                }
            };
        });
    }
    /**
     * Select item in active quick pick (for UI integration)
     */
    selectQuickPickItem(item) {
        if (this.activeQuickPick) {
            this.activeQuickPick.resolve(item);
        }
    }
    /**
     * Cancel active quick pick
     */
    cancelQuickPick() {
        if (this.activeQuickPick) {
            this.activeQuickPick.resolve(undefined);
        }
    }
    /**
     * Submit input box value (for UI integration)
     */
    submitInputBox(value) {
        if (this.activeInputBox) {
            this.activeInputBox.resolve(value);
        }
    }
    /**
     * Cancel input box
     */
    cancelInputBox() {
        if (this.activeInputBox) {
            this.activeInputBox.resolve(undefined);
        }
    }
    // ==================== Core Commands ====================
    /**
     * Register core commands
     */
    registerCoreCommands() {
        // Command palette
        this.registerCommand({
            id: 'workbench.action.showCommands',
            title: 'Show All Commands',
            category: 'View',
            keywords: ['command', 'palette', 'quick', 'open'],
            handler: () => this.showCommandPalette()
        });
        // Macro commands
        this.registerCommand({
            id: 'macro.startRecording',
            title: 'Start Recording Macro',
            category: 'Macro',
            when: '!recordingMacro',
            handler: () => {
                const macroId = `macro_${Date.now()}`;
                this.startRecordingMacro(macroId);
            }
        });
        this.registerCommand({
            id: 'macro.stopRecording',
            title: 'Stop Recording Macro',
            category: 'Macro',
            when: 'recordingMacro',
            arguments: [
                { name: 'name', type: 'string', required: true, description: 'Macro name' }
            ],
            handler: (...args) => this.stopRecordingMacro(args[0])
        });
        this.registerCommand({
            id: 'macro.playLast',
            title: 'Play Last Macro',
            category: 'Macro',
            handler: async () => {
                const macros = this.getAllMacros();
                if (macros.length > 0) {
                    const lastMacro = macros.sort((a, b) => (b.recordedAt || 0) - (a.recordedAt || 0))[0];
                    await this.runMacro(lastMacro.id);
                }
            }
        });
        // Repeat last command
        this.registerCommand({
            id: 'workbench.action.repeatLastCommand',
            title: 'Repeat Last Command',
            category: 'View',
            handler: async () => {
                const history = this.getHistory(1);
                if (history.length > 0) {
                    const last = history[0];
                    await this.executeCommand(last.commandId, ...last.args);
                }
            }
        });
        // Clear history
        this.registerCommand({
            id: 'workbench.action.clearCommandHistory',
            title: 'Clear Command History',
            category: 'View',
            handler: () => {
                this.executionHistory.length = 0;
                this.commandFrequency.clear();
            }
        });
    }
    /**
     * Show command palette
     */
    async showCommandPalette() {
        const commands = this.getAllCommands()
            .filter(cmd => {
            if (cmd.when) {
                return this.evaluateContextExpression(cmd.when).result;
            }
            return true;
        })
            .sort((a, b) => {
            // Sort by recent usage, then by frequency, then alphabetically
            const aRecent = this.lastUsed.get(a.id) || 0;
            const bRecent = this.lastUsed.get(b.id) || 0;
            if (aRecent !== bRecent)
                return bRecent - aRecent;
            const aFreq = this.commandFrequency.get(a.id) || 0;
            const bFreq = this.commandFrequency.get(b.id) || 0;
            if (aFreq !== bFreq)
                return bFreq - aFreq;
            return a.title.localeCompare(b.title);
        });
        const items = commands.map(cmd => ({
            label: cmd.title,
            description: cmd.category,
            detail: cmd.description,
            iconPath: cmd.icon,
            data: cmd.id
        }));
        const selected = await this.showQuickPick(items, {
            placeholder: 'Type to search for commands...',
            matchOnDescription: true,
            matchOnDetail: true
        });
        if (selected && !Array.isArray(selected) && selected.data) {
            await this.executeCommand(selected.data);
        }
    }
    // ==================== Utilities ====================
    /**
     * Delay helper
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Dispose
     */
    dispose() {
        this.onCommandRegisteredEmitter.dispose();
        this.onCommandUnregisteredEmitter.dispose();
        this.onCommandExecutedEmitter.dispose();
        this.onContextChangedEmitter.dispose();
        this.onMacroRecordedEmitter.dispose();
        this.onQuickPickShownEmitter.dispose();
    }
};
exports.CommandPaletteSystem = CommandPaletteSystem;
exports.CommandPaletteSystem = CommandPaletteSystem = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], CommandPaletteSystem);
// ==================== Export ====================
exports.default = CommandPaletteSystem;
