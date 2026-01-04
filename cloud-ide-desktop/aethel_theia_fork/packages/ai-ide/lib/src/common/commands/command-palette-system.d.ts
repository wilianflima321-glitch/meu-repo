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
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Command argument schema
 */
export interface CommandArgumentSchema {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file' | 'selection';
    description: string;
    required: boolean;
    default?: unknown;
    enum?: unknown[];
    validation?: {
        pattern?: string;
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        custom?: (value: unknown) => boolean | string;
    };
}
/**
 * Command definition
 */
export interface Command {
    id: string;
    title: string;
    category?: string;
    description?: string;
    icon?: string;
    keywords?: string[];
    arguments?: CommandArgumentSchema[];
    returnType?: string;
    when?: string;
    enablement?: string;
    handler: CommandHandler;
    source?: 'core' | 'extension' | 'user' | 'workspace';
}
/**
 * Command handler function
 */
export type CommandHandler = (...args: unknown[]) => unknown | Promise<unknown>;
/**
 * Command execution context
 */
export interface CommandContext {
    workspaceId?: string;
    activeFile?: string;
    selection?: {
        start: {
            line: number;
            column: number;
        };
        end: {
            line: number;
            column: number;
        };
        text?: string;
    };
    activeEditor?: string;
    activeViewport?: string;
    activeTimeline?: string;
    variables: Record<string, unknown>;
    triggeredBy: 'palette' | 'keybinding' | 'menu' | 'api' | 'macro';
}
/**
 * Command execution result
 */
export interface CommandResult {
    commandId: string;
    success: boolean;
    result?: unknown;
    error?: Error;
    duration: number;
    timestamp: number;
}
/**
 * Command execution history entry
 */
export interface CommandHistoryEntry {
    commandId: string;
    args: unknown[];
    context: CommandContext;
    result: CommandResult;
    timestamp: number;
}
/**
 * Quick pick item
 */
export interface QuickPickItem {
    label: string;
    description?: string;
    detail?: string;
    iconPath?: string;
    alwaysShow?: boolean;
    picked?: boolean;
    kind?: 'default' | 'separator';
    buttons?: QuickPickButton[];
    data?: unknown;
}
/**
 * Quick pick button
 */
export interface QuickPickButton {
    iconPath: string;
    tooltip?: string;
    action: string;
}
/**
 * Quick pick options
 */
export interface QuickPickOptions {
    title?: string;
    placeholder?: string;
    canPickMany?: boolean;
    matchOnDescription?: boolean;
    matchOnDetail?: boolean;
    ignoreFocusOut?: boolean;
    step?: number;
    totalSteps?: number;
    buttons?: QuickPickButton[];
}
/**
 * Input box options
 */
export interface InputBoxOptions {
    title?: string;
    placeholder?: string;
    prompt?: string;
    value?: string;
    valueSelection?: [number, number];
    password?: boolean;
    ignoreFocusOut?: boolean;
    validateInput?: (value: string) => string | undefined | Promise<string | undefined>;
    step?: number;
    totalSteps?: number;
}
/**
 * Macro step
 */
export interface MacroStep {
    commandId: string;
    args?: unknown[];
    delay?: number;
    condition?: string;
    repeatCount?: number;
    onError?: 'stop' | 'continue' | 'retry';
}
/**
 * Macro definition
 */
export interface Macro {
    id: string;
    name: string;
    description?: string;
    category?: string;
    steps: MacroStep[];
    variables?: Record<string, unknown>;
    triggers?: string[];
    enabled: boolean;
    recordedAt?: number;
    lastRun?: number;
    runCount: number;
}
/**
 * Context key
 */
export interface ContextKey {
    key: string;
    value: unknown;
    type: 'boolean' | 'string' | 'number' | 'array';
    description?: string;
}
/**
 * Context expression evaluator
 */
export interface ContextExpressionResult {
    expression: string;
    result: boolean;
    usedKeys: string[];
    parseError?: string;
}
/**
 * Command search result
 */
export interface CommandSearchResult {
    command: Command;
    score: number;
    matchedOn: ('title' | 'category' | 'description' | 'keywords')[];
    highlights: {
        title?: number[][];
        category?: number[][];
        description?: number[][];
    };
    recentUsage?: number;
    frequency?: number;
}
/**
 * Search options
 */
export interface CommandSearchOptions {
    query: string;
    limit?: number;
    categories?: string[];
    includeDisabled?: boolean;
    preferRecent?: boolean;
    preferFrequent?: boolean;
    fuzzyThreshold?: number;
}
/**
 * Command registered event
 */
export interface CommandRegisteredEvent {
    command: Command;
    source: string;
}
/**
 * Command executed event
 */
export interface CommandExecutedEvent {
    commandId: string;
    args: unknown[];
    result: CommandResult;
    context: CommandContext;
}
/**
 * Macro recorded event
 */
export interface MacroRecordedEvent {
    macro: Macro;
}
export declare class CommandPaletteSystem {
    private readonly commands;
    private readonly commandsByCategory;
    private readonly contextKeys;
    private readonly macros;
    private isRecordingMacro;
    private currentMacroSteps;
    private recordingMacroId;
    private readonly executionHistory;
    private readonly commandFrequency;
    private readonly lastUsed;
    private readonly MAX_HISTORY;
    private activeQuickPick;
    private activeInputBox;
    private readonly onCommandRegisteredEmitter;
    readonly onCommandRegistered: Event<CommandRegisteredEvent>;
    private readonly onCommandUnregisteredEmitter;
    readonly onCommandUnregistered: Event<string>;
    private readonly onCommandExecutedEmitter;
    readonly onCommandExecuted: Event<CommandExecutedEvent>;
    private readonly onContextChangedEmitter;
    readonly onContextChanged: Event<ContextKey>;
    private readonly onMacroRecordedEmitter;
    readonly onMacroRecorded: Event<MacroRecordedEvent>;
    private readonly onQuickPickShownEmitter;
    readonly onQuickPickShown: Event<QuickPickOptions>;
    constructor();
    /**
     * Register a command
     */
    registerCommand(command: Command): Disposable;
    /**
     * Register multiple commands
     */
    registerCommands(commands: Command[]): Disposable;
    /**
     * Unregister a command
     */
    unregisterCommand(commandId: string): void;
    /**
     * Check if command exists
     */
    hasCommand(commandId: string): boolean;
    /**
     * Get command by ID
     */
    getCommand(commandId: string): Command | undefined;
    /**
     * Get all commands
     */
    getAllCommands(): Command[];
    /**
     * Get commands by category
     */
    getCommandsByCategory(category: string): Command[];
    /**
     * Get all categories
     */
    getCategories(): string[];
    /**
     * Execute a command
     */
    executeCommand<T = unknown>(commandId: string, ...args: unknown[]): Promise<T>;
    /**
     * Execute command with context
     */
    executeCommandWithContext<T = unknown>(commandId: string, context: CommandContext, ...args: unknown[]): Promise<T>;
    /**
     * Validate command arguments
     */
    private validateArguments;
    /**
     * Validate argument type
     */
    private validateArgumentType;
    /**
     * Run validation rules
     */
    private runValidation;
    /**
     * Record command execution
     */
    private recordExecution;
    /**
     * Get execution history
     */
    getHistory(limit?: number): CommandHistoryEntry[];
    /**
     * Get command frequency
     */
    getCommandFrequency(commandId: string): number;
    /**
     * Get recently used commands
     */
    getRecentCommands(limit?: number): Command[];
    /**
     * Get frequently used commands
     */
    getFrequentCommands(limit?: number): Command[];
    /**
     * Search commands with fuzzy matching
     */
    searchCommands(options: CommandSearchOptions): CommandSearchResult[];
    /**
     * Calculate match score for a command
     */
    private calculateMatchScore;
    /**
     * Fuzzy matching algorithm
     */
    private fuzzyMatch;
    /**
     * Levenshtein distance calculation
     */
    private levenshteinDistance;
    /**
     * Find highlight positions
     */
    private findHighlightPositions;
    /**
     * Set context key
     */
    setContext(key: string, value: unknown, type?: ContextKey['type']): void;
    /**
     * Get context value
     */
    getContext(key: string): unknown;
    /**
     * Delete context key
     */
    deleteContext(key: string): void;
    /**
     * Evaluate context expression
     */
    evaluateContextExpression(expression: string): ContextExpressionResult;
    /**
     * Parse and evaluate context expression
     */
    private parseAndEvaluate;
    /**
     * Tokenize expression
     */
    private tokenizeExpression;
    /**
     * Evaluate tokens
     */
    private evaluateTokens;
    /**
     * Apply boolean operator
     */
    private applyOp;
    /**
     * Infer type from value
     */
    private inferType;
    /**
     * Initialize default context
     */
    private initializeDefaultContext;
    /**
     * Start recording macro
     */
    startRecordingMacro(macroId: string): void;
    /**
     * Stop recording macro
     */
    stopRecordingMacro(name: string, description?: string): Macro;
    /**
     * Cancel macro recording
     */
    cancelMacroRecording(): void;
    /**
     * Run macro
     */
    runMacro(macroId: string, context?: Partial<CommandContext>): Promise<void>;
    /**
     * Get macro by ID
     */
    getMacro(macroId: string): Macro | undefined;
    /**
     * Get all macros
     */
    getAllMacros(): Macro[];
    /**
     * Delete macro
     */
    deleteMacro(macroId: string): void;
    /**
     * Show quick pick
     */
    showQuickPick<T extends QuickPickItem>(items: T[] | Promise<T[]>, options?: QuickPickOptions): Promise<T | T[] | undefined>;
    /**
     * Show input box
     */
    showInputBox(options?: InputBoxOptions): Promise<string | undefined>;
    /**
     * Select item in active quick pick (for UI integration)
     */
    selectQuickPickItem(item: QuickPickItem | QuickPickItem[]): void;
    /**
     * Cancel active quick pick
     */
    cancelQuickPick(): void;
    /**
     * Submit input box value (for UI integration)
     */
    submitInputBox(value: string): void;
    /**
     * Cancel input box
     */
    cancelInputBox(): void;
    /**
     * Register core commands
     */
    private registerCoreCommands;
    /**
     * Show command palette
     */
    showCommandPalette(): Promise<void>;
    /**
     * Delay helper
     */
    private delay;
    /**
     * Dispose
     */
    dispose(): void;
}
interface Disposable {
    dispose(): void;
}
export default CommandPaletteSystem;
