/**
 * Snippet System - Professional Code Snippet Infrastructure
 *
 * Sistema de snippets de código profissional para IDE de produção.
 * Inspirado em VS Code Snippets, JetBrains Live Templates, TextMate.
 * Suporta:
 * - Snippets por linguagem
 * - Tab stops e placeholders
 * - Transformações de variáveis
 * - Nested placeholders
 * - Choice elements
 * - Variables (TM_FILENAME, etc.)
 * - User snippets
 * - Extension snippets
 * - Snippet scopes
 */
type Event<T> = (listener: (e: T) => void) => {
    dispose: () => void;
};
/**
 * Snippet scope
 */
export declare enum SnippetScope {
    Global = "global",
    Workspace = "workspace",
    Language = "language",
    File = "file"
}
/**
 * Snippet source
 */
export declare enum SnippetSource {
    Builtin = "builtin",
    User = "user",
    Workspace = "workspace",
    Extension = "extension"
}
/**
 * Snippet variable
 */
export declare enum SnippetVariable {
    TM_FILENAME = "TM_FILENAME",
    TM_FILENAME_BASE = "TM_FILENAME_BASE",
    TM_DIRECTORY = "TM_DIRECTORY",
    TM_FILEPATH = "TM_FILEPATH",
    RELATIVE_FILEPATH = "RELATIVE_FILEPATH",
    TM_SELECTED_TEXT = "TM_SELECTED_TEXT",
    TM_CURRENT_LINE = "TM_CURRENT_LINE",
    TM_CURRENT_WORD = "TM_CURRENT_WORD",
    TM_LINE_INDEX = "TM_LINE_INDEX",
    TM_LINE_NUMBER = "TM_LINE_NUMBER",
    CURSOR_INDEX = "CURSOR_INDEX",
    CURSOR_NUMBER = "CURSOR_NUMBER",
    CURRENT_YEAR = "CURRENT_YEAR",
    CURRENT_YEAR_SHORT = "CURRENT_YEAR_SHORT",
    CURRENT_MONTH = "CURRENT_MONTH",
    CURRENT_MONTH_NAME = "CURRENT_MONTH_NAME",
    CURRENT_MONTH_NAME_SHORT = "CURRENT_MONTH_NAME_SHORT",
    CURRENT_DATE = "CURRENT_DATE",
    CURRENT_DAY_NAME = "CURRENT_DAY_NAME",
    CURRENT_DAY_NAME_SHORT = "CURRENT_DAY_NAME_SHORT",
    CURRENT_HOUR = "CURRENT_HOUR",
    CURRENT_MINUTE = "CURRENT_MINUTE",
    CURRENT_SECOND = "CURRENT_SECOND",
    CURRENT_SECONDS_UNIX = "CURRENT_SECONDS_UNIX",
    CURRENT_TIMEZONE_OFFSET = "CURRENT_TIMEZONE_OFFSET",
    RANDOM = "RANDOM",
    RANDOM_HEX = "RANDOM_HEX",
    UUID = "UUID",
    BLOCK_COMMENT_START = "BLOCK_COMMENT_START",
    BLOCK_COMMENT_END = "BLOCK_COMMENT_END",
    LINE_COMMENT = "LINE_COMMENT",
    CLIPBOARD = "CLIPBOARD",
    WORKSPACE_NAME = "WORKSPACE_NAME",
    WORKSPACE_FOLDER = "WORKSPACE_FOLDER"
}
/**
 * Tab stop
 */
export interface TabStop {
    index: number;
    placeholder?: string;
    choices?: string[];
    transform?: SnippetTransform;
    nested?: TabStop[];
}
/**
 * Snippet transform
 */
export interface SnippetTransform {
    regex: string;
    replacement: string;
    options?: string;
}
/**
 * Snippet definition
 */
export interface SnippetDefinition {
    id: string;
    name: string;
    prefix: string | string[];
    body: string | string[];
    description?: string;
    scope?: string | string[];
    languages?: string[];
    source: SnippetSource;
    extensionId?: string;
    isFileTemplate?: boolean;
    sortText?: string;
    usageCount?: number;
    lastUsed?: number;
}
/**
 * Parsed snippet
 */
export interface ParsedSnippet {
    definition: SnippetDefinition;
    tabStops: TabStop[];
    variables: Map<string, VariableReference>;
    finalCursorPosition?: number;
    text: string;
}
/**
 * Variable reference
 */
export interface VariableReference {
    name: string;
    default?: string;
    transform?: SnippetTransform;
}
/**
 * Snippet insertion context
 */
export interface InsertionContext {
    fileName?: string;
    filePath?: string;
    directory?: string;
    relativePath?: string;
    workspaceName?: string;
    workspaceFolder?: string;
    selectedText?: string;
    currentLine?: string;
    currentWord?: string;
    lineIndex?: number;
    lineNumber?: number;
    cursorIndex?: number;
    cursorNumber?: number;
    clipboard?: string;
    languageId?: string;
    blockCommentStart?: string;
    blockCommentEnd?: string;
    lineComment?: string;
    customVariables?: Record<string, string>;
}
/**
 * Snippet completion
 */
export interface SnippetCompletion {
    snippet: SnippetDefinition;
    prefix: string;
    score: number;
}
/**
 * Active snippet session
 */
export interface SnippetSession {
    id: string;
    snippet: ParsedSnippet;
    startPosition: Position;
    endPosition: Position;
    currentTabStop: number;
    tabStopPositions: TabStopPosition[];
    isActive: boolean;
}
/**
 * Position
 */
export interface Position {
    line: number;
    character: number;
}
/**
 * Tab stop position
 */
export interface TabStopPosition {
    index: number;
    range: Range;
    placeholder?: string;
}
/**
 * Range
 */
export interface Range {
    start: Position;
    end: Position;
}
/**
 * Snippet file
 */
export interface SnippetFile {
    path: string;
    scope: SnippetScope;
    source: SnippetSource;
    languages?: string[];
    snippets: SnippetDefinition[];
    lastModified?: number;
}
export interface SnippetInsertedEvent {
    snippet: SnippetDefinition;
    session: SnippetSession;
}
export interface SnippetSessionEndedEvent {
    session: SnippetSession;
    completed: boolean;
}
export interface SnippetFileChangedEvent {
    file: SnippetFile;
    action: 'added' | 'modified' | 'removed';
}
export declare class SnippetSystem {
    private readonly snippets;
    private readonly snippetsByLanguage;
    private readonly snippetsByPrefix;
    private readonly snippetFiles;
    private readonly activeSessions;
    private sessionIdCounter;
    private userSnippetsPath;
    private workspaceSnippetsPath;
    private readonly onInsertedEmitter;
    readonly onInserted: Event<SnippetInsertedEvent>;
    private readonly onSessionEndedEmitter;
    readonly onSessionEnded: Event<SnippetSessionEndedEvent>;
    private readonly onFileChangedEmitter;
    readonly onFileChanged: Event<SnippetFileChangedEvent>;
    constructor();
    /**
     * Initialize snippet system
     */
    initialize(config: {
        userSnippetsPath: string;
        workspaceSnippetsPath?: string;
    }): Promise<void>;
    /**
     * Register builtin snippets
     */
    private registerBuiltinSnippets;
    /**
     * Register snippets for languages
     */
    private registerSnippetsForLanguage;
    /**
     * Add snippet
     */
    addSnippet(snippet: SnippetDefinition): void;
    /**
     * Remove snippet
     */
    removeSnippet(snippetId: string): boolean;
    /**
     * Get snippet by ID
     */
    getSnippet(snippetId: string): SnippetDefinition | undefined;
    /**
     * Get all snippets
     */
    getAllSnippets(): SnippetDefinition[];
    /**
     * Get snippets for language
     */
    getSnippetsForLanguage(languageId: string): SnippetDefinition[];
    /**
     * Get snippet completions
     */
    getCompletions(prefix: string, languageId: string): SnippetCompletion[];
    /**
     * Calculate completion score
     */
    private calculateScore;
    /**
     * Parse snippet body
     */
    parseSnippet(snippet: SnippetDefinition, context: InsertionContext): ParsedSnippet;
    /**
     * Resolve snippet variables
     */
    private resolveVariables;
    /**
     * Process text transforms
     */
    private processTransforms;
    /**
     * Generate UUID
     */
    private generateUUID;
    /**
     * Create snippet session
     */
    createSession(parsedSnippet: ParsedSnippet, startPosition: Position): SnippetSession;
    /**
     * Get active session
     */
    getActiveSession(): SnippetSession | undefined;
    /**
     * Next tab stop
     */
    nextTabStop(sessionId: string): TabStopPosition | null;
    /**
     * Previous tab stop
     */
    previousTabStop(sessionId: string): TabStopPosition | null;
    /**
     * End snippet session
     */
    endSession(sessionId: string, completed?: boolean): void;
    /**
     * Calculate end position
     */
    private calculateEndPosition;
    /**
     * Load user snippets
     */
    private loadUserSnippets;
    /**
     * Load workspace snippets
     */
    private loadWorkspaceSnippets;
    /**
     * Save user snippet file
     */
    saveUserSnippets(languageId: string, snippets: SnippetDefinition[]): Promise<void>;
    /**
     * Dispose
     */
    dispose(): void;
}
export default SnippetSystem;
